from datetime import datetime, timezone, timedelta
from flask import jsonify
from sqlalchemy import func, desc, or_, text
from app import db
from app.models import Product, Alert, CPE, Organization, OrgUser, User, delete
from app.logger_config import logger
from sqlalchemy.exc import SQLAlchemyError

def add_product_service(org, current_user, data, current_app):
    """
    Lógica para agregar un producto (CPE) a una organización.
    Realiza validaciones, verificación de roles y lanza la tarea Celery.
    Si el producto ya existe pero fue soft-deleted, se restablece y se lanza escaneo
    (la tarea se encargará de restaurar/crear alertas).
    Si el producto ya existe y está activo, devuelve un mensaje informativo.
    """
    try:
        is_superadmin = "ROLE_SUPERADMIN" in current_user.special_roles
        is_org_admin = False
        if not is_superadmin:
            org_user = OrgUser.query.filter_by(user_id=current_user.id, organization_id=org.id).first()
            if org_user and "ROLE_ORG_ADMIN" in org_user.roles:
                is_org_admin = True
        if not is_superadmin and not is_org_admin:
            logger.getChild('products').warning(f"Usuario {current_user.id} ({current_user.email}) sin rol ADMIN intentó añadir producto a Org {org.id} ('{org.name}')")
            return jsonify({"error": "Permiso denegado: Se requiere rol de Administrador de Organización o Superadministrador", "code": "permission_denied"}), 403

        if not data or 'cpe_name' not in data:
            logger.getChild('products').error(f"Solicitud inválida para Org {org.id} ('{org.name}'): falta cpe_name")
            return jsonify({"error": "Falta el campo 'cpe_name' en la solicitud JSON", "code": "bad_request"}), 400

        cpe_name = data['cpe_name'].strip()
        if not cpe_name:
            logger.getChild('products').error(f"Solicitud inválida para Org {org.id} ('{org.name}'): cpe_name vacío")
            return jsonify({"error": "'cpe_name' no puede estar vacío", "code": "bad_request"}), 400

        logger.getChild('products').info(f"Usuario {current_user.id} ({current_user.email}) intentando añadir/restaurar producto CPE '{cpe_name}' a Org {org.id} ('{org.name}')")

        # Buscar el producto, incluyendo los soft-deleted usando la opción de ejecución
        product = db.session.query(Product).execution_options(include_soft_deleted=True).filter_by(
            org=org.id,
            cpe=cpe_name
        ).first()

        if product:
            if product.deletedAt is not None:
                # --- 1. Restauración del Producto ---
                logger.getChild('products').info(f"Producto {cpe_name} encontrado con soft delete en Org {org.id}. Restaurando...")
                now = datetime.now(timezone.utc)
                product.deletedAt = None
                product.updatedAt = now
                product.send_email = True # Asegurar que el envío de email esté activo al restaurar
                try:
                    # No es necesario añadir 'org' explícitamente si no se modificó
                    db.session.commit() # Commit restauración del producto
                    logger.getChild('products').info(f"Producto {cpe_name} restaurado y send_email activado. Commit realizado.")
                except SQLAlchemyError as e_prod:
                    db.session.rollback()
                    logger.getChild('products').error(f"Error de BD al restaurar producto {cpe_name} en Org {org.id}: {str(e_prod)}", exc_info=True)
                    return jsonify({"error": "Error de base de datos al restaurar el producto", "code": "database_error"}), 500

                logger.getChild('products').info(f"Producto {cpe_name} restaurado. El escaneo en segundo plano gestionará las alertas.")

                # --- 3. Lanzar Tarea Celery ---
                # La tarea scan_from_added_product se encargará de crear/restaurar las alertas
                task = current_app.celery.send_task("app.tasks.alerts.scan_from_added_product", args=[org.id, cpe_name], queue="match_load")
                logger.getChild('products').info(f"Tarea Celery scan_from_added_product lanzada con ID: {task.id} para Org {org.id}, CPE '{cpe_name}' (tras restauración)")

                return jsonify({
                    "message": f"Producto '{cpe_name}' restaurado. El escaneo en segundo plano restaurará o creará las alertas necesarias.",
                    "task_id": task.id,
                    "cpe": cpe_name,
                    "status": "restored"
                }), 200
            else:
                # Producto ya existe y está activo -> Informar (No hacer nada más)
                logger.getChild('products').info(f"Producto {cpe_name} ya existente y activo en Org {org.id}. No se requiere acción.")
                return jsonify({
                    "message": f"El producto '{cpe_name}' ya existe en esta organización.",
                    "cpe": cpe_name,
                    "status": "already_exists"
                }), 200
        else:
            # --- Producto no existe -> Añadir nuevo ---
            logger.getChild('products').info(f"Producto {cpe_name} no encontrado en Org {org.id}. Creando nuevo...")
            product = Product(org=org.id, cpe=cpe_name)
            db.session.add(product)
            db.session.commit()
            logger.getChild('products').info(f"Producto {cpe_name} añadido exitosamente a Org {org.id}.")

            # Lanzar tarea Celery para escanear el nuevo producto
            # La tarea scan_from_added_product se encargará de crear las alertas
            task = current_app.celery.send_task("app.tasks.alerts.scan_from_added_product", args=[org.id, cpe_name], queue="match_load")
            logger.getChild('products').info(f"Tarea Celery scan_from_added_product lanzada con ID: {task.id} para Org {org.id}, CPE '{cpe_name}' (nuevo producto)")
            return jsonify({
                "message": "Solicitud de añadir producto recibida. El escaneo se realizará en segundo plano.",
                "task_id": task.id,
                "cpe": cpe_name,
                "status": "added" # Status para nuevo producto
            }), 202 # 202 Accepted porque la tarea se ejecuta en segundo plano

    except SQLAlchemyError as e:
        db.session.rollback()
        org_id_for_log = org.id if org else 'desconocida'
        # Definir cpe_name_for_log de forma segura
        cpe_name_for_log = data.get('cpe_name', 'desconocido').strip() if isinstance(data, dict) else 'desconocido'
        logger.getChild('products').error(f"Error de BD al añadir/restaurar producto '{cpe_name_for_log}' a Org {org_id_for_log}: {str(e)}", exc_info=True)
        return jsonify({"error": "Error de base de datos al procesar la solicitud", "code": "database_error"}), 500
    except Exception as e:
        db.session.rollback() # Asegurar rollback en cualquier excepción
        org_id_for_log = org.id if org else f"'{org.name if org else 'desconocida'}'"
        # Definir cpe_name_for_log de forma segura
        cpe_name_for_log = data.get('cpe_name', 'desconocido').strip() if isinstance(data, dict) else 'desconocido'
        logger.getChild('products').error(f"Error inesperado al añadir producto '{cpe_name_for_log}' a Org {org_id_for_log}: {str(e)}", exc_info=True)
        return jsonify({"error": "Error interno del servidor al procesar la solicitud", "code": "internal_server_error"}), 500

def get_products_service(org, page, per_page, recent_filter, search_term=None):
    """
    Lógica para obtener los productos (CPEs) registrados de una organización,
    aplicando paginación, filtro por fecha y búsqueda por término si es solicitado.
    Solo retorna aquellos productos que no hayan sido soft-deleted (deletedAt is None).
    Incluye el estado de 'send_email'.
    Devuelve 'created_at' y 'updated_at'.
    Ordena siempre por updatedAt descendente.
    """
    try:
        query = Product.query.filter(Product.org == org.id, Product.deletedAt.is_(None))

        # Siempre ordenar por fecha de actualización descendente
        order_by_column = desc(Product.updatedAt)

        if recent_filter:
            thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
            # Filtrar por fecha de actualización para "recientes"
            query = query.filter(Product.updatedAt >= thirty_days_ago)
            logger.getChild('products').debug(f"Aplicando filtro de fecha de ACTUALIZACIÓN >= {thirty_days_ago.isoformat()} para Org {org.id}")
            # La ordenación ya está definida como updatedAt DESC

        if search_term:
            search_pattern = f'%{search_term}%'
            # Buscar en el campo 'cpe' de la tabla Product usando ilike para case-insensitive
            query = query.filter(Product.cpe.ilike(search_pattern))
            logger.getChild('products').debug(f"Aplicando filtro de búsqueda ILIKE '{search_pattern}' en Product.cpe para Org {org.id}")

        # Ordenar y paginar usando la columna determinada (siempre updatedAt)
        pagination = query.order_by(order_by_column).paginate(
            page=page, per_page=per_page, error_out=False
        )
        products = pagination.items

        # Comprobar si no se encontraron resultados con la búsqueda
        if not products and search_term:
             logger.getChild('products').warning(f"No se encontraron productos para Org {org.id} con búsqueda '{search_term}' en página {page}")
             # Devolver respuesta vacía pero exitosa
             return {
                 "products": [],
                 "page": page,
                 "total_pages": 0,
                 "total_items": 0,
                 "per_page": per_page
             }

        # Modificar la creación de product_list para incluir send_email, created_at y updated_at
        product_list = []
        for p in products:
            product_data = {
                "cpe": p.cpe,
                "send_email": p.send_email, # Incluir el campo send_email
                # Añadir createdAt
                "created_at": p.createdAt.replace(tzinfo=timezone.utc).isoformat(),
                "updated_at": p.updatedAt.replace(tzinfo=timezone.utc).isoformat() # Siempre usar updatedAt
            }
            product_list.append(product_data)

        # Actualizar log de ordenación
        order_log = "updatedAt DESC"
        logger.getChild('products').info(f"Entrega exitosa de {len(product_list)} productos para Org {org.id} (Página {page}, Recientes: {recent_filter}, Búsqueda: '{search_term or 'N/A'}', Orden: {order_log})")

        # Construir el diccionario de respuesta
        response_data = {
            "products": product_list,
            "page": pagination.page,
            "total_pages": pagination.pages,
            "total_items": pagination.total,
            "per_page": pagination.per_page
        }
        logger.getChild('products').debug(f"Datos a devolver por get_products_service para Org {org.id}: {response_data}")
        return response_data
    except Exception as e:
        logger.getChild('products').error(f"Error al obtener productos para Org {org.id} (Búsqueda: '{search_term or 'N/A'}'): {str(e)}", exc_info=True)
        # DEVOLVER SOLO JSON DE ERROR
        error_data = {
            "error": "Error interno del servidor al procesar la solicitud",
            "code": "internal_server_error"
        }
        # Log ANTES de devolver error
        logger.getChild('products').debug(f"Error a devolver por get_products_service para Org {org.id}: {error_data}")
        return error_data

def search_cpes_service(search_term, offset, limit):
    """
    Lógica para buscar CPEs en la base de datos, considerando búsqueda case-insensitive.
    """
    logger.getChild('products').info(f"Solicitud de búsqueda de CPEs con término: '{search_term}', límite: {limit}, offset: {offset}")
    if len(search_term) < 3:
        logger.getChild('products').debug("Término de búsqueda demasiado corto, devolviendo lista vacía.")
        return jsonify({"results": [], "has_more": False})
    try:
        search_pattern = f'%{search_term}%'
        logger.getChild('products').debug(f"Ejecutando consulta CPE con patrón ILIKE: '{search_pattern}', offset: {offset}, limit: {limit + 1}")
        cpes_query = db.session.query(CPE.id).filter(
            CPE.id.ilike(search_pattern)
        ).offset(offset).limit(limit + 1).all()
        has_more = len(cpes_query) > limit
        results = [cpe.id for cpe in cpes_query[:limit]]
        logger.getChild('products').info(f"Búsqueda CPE para '{search_term}' devolvió {len(results)} resultados. ¿Hay más?: {has_more}")
        return jsonify({"results": results, "has_more": has_more})
    except Exception as e:
        logger.getChild('products').error(f"Error en búsqueda de CPEs para '{search_term}': {str(e)}", exc_info=True)
        return jsonify({"error": "Error interno del servidor", "code": "internal_error"}), 500

def delete_product_and_deactivate_alerts(org_id, cpe_name):
    """
    Realiza un soft delete de un producto de una organización y desactiva las alertas asociadas.

    Retorna:
        (bool, str): Tupla indicando éxito (True/False) y un mensaje.
    """
    try:
        # Buscar el producto (solo activos, ya que no se puede eliminar uno ya eliminado)
        product = db.session.query(Product).filter_by(org=org_id, cpe=cpe_name, deletedAt=None).first()

        if not product:
            logger.getChild('products').warning(f"Intento de eliminar producto no existente o ya eliminado: Org {org_id}, CPE {cpe_name}")
            return False, "Producto no encontrado o ya eliminado en esta organización."

        # Desactivar alertas activas asociadas a este producto en esta organización
        alerts_to_deactivate = db.session.query(Alert).filter_by(
            org=org_id,
            cpe=cpe_name,
            active=True,
            deletedAt=None # Asegurarse de no tocar alertas ya soft-deleted
        ).all()

        deactivated_count = 0
        now = datetime.now(timezone.utc)
        for alert in alerts_to_deactivate:
            alert.active = False
            alert.updatedAt = now # Actualizar timestamp

            deactivated_count += 1

        logger.getChild('products').info(f"Desactivando {deactivated_count} alertas para Org {org_id}, CPE {cpe_name}")

        db.session.commit()  # Commit de desactivación de alerts

        # Soft delete del producto usando la función genérica
        delete(product)

        return True, f"Producto '{cpe_name}' eliminado (soft delete) y {deactivated_count} alertas activas desactivadas."
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.getChild('products').error(f"Error de BD al eliminar (soft delete) producto {cpe_name} de Org {org_id}: {str(e)}", exc_info=True)
        return False, "Error de base de datos al eliminar el producto."
    except Exception as e:
        db.session.rollback()
        logger.getChild('products').error(f"Error inesperado al eliminar (soft delete) producto {cpe_name} de Org {org_id}: {str(e)}", exc_info=True)
        return False, "Error interno del servidor."

def update_product_settings_service(org: Organization, current_user: User, cpe_name: str, settings_data: dict):
    """
    Actualiza la configuración 'send_email' de un producto específico SIN modificar su timestamp updatedAt,
    utilizando SQL directo.
    Verifica que el usuario tenga permisos de administrador en la organización.
    Devuelve el estado actualizado.
    """
    logger.getChild('products').info(f"Usuario {current_user.id} intentando actualizar settings para CPE '{cpe_name}' en Org {org.id} via direct SQL")

    # 1. Verificar permisos (Org Admin o Superadmin)
    is_superadmin = "ROLE_SUPERADMIN" in current_user.special_roles
    is_org_admin = any(role == "ROLE_ORG_ADMIN" for role in current_user.get_roles_for_organization(org.id))

    if not (is_superadmin or is_org_admin):
        logger.getChild('products').warning(f"Usuario {current_user.id} sin permisos de admin intentó actualizar settings de producto '{cpe_name}' de Org {org.id}")
        return {"error": "No tienes permisos para modificar la configuración de productos en esta organización", "code": "permission_denied"}, 403

    # 2. Validar datos de entrada
    if 'send_email' not in settings_data or not isinstance(settings_data['send_email'], bool):
        logger.getChild('products').error(f"Datos inválidos para actualizar settings de '{cpe_name}' en Org {org.id}: {settings_data}")
        return {"error": "El campo 'send_email' es requerido y debe ser booleano (true/false)", "code": "bad_request"}, 400

    send_email_value = settings_data['send_email']

    # 3. Buscar el producto para verificar existencia (opcional, la consulta SQL lo hará)
    #    y guardar el CPE para la respuesta.
    try:
        # Verificar si el producto existe y está activo (opcional pero bueno para log/respuesta temprana)
        product_exists = db.session.query(Product.cpe).filter_by(
            org=org.id,
            cpe=cpe_name,
            deletedAt=None # Solo productos activos
        ).first()

        if not product_exists:
            logger.getChild('products').warning(f"Intento de actualizar settings de producto no existente o eliminado: Org {org.id}, CPE {cpe_name}")
            return {"error": "Producto no encontrado o no está activo en esta organización.", "code": "not_found"}, 404

        product_cpe = product_exists.cpe # Guardar CPE para la respuesta

        # 4. Ejecutar actualización SQL directa usando la clave compuesta
        update_stmt = text("""
            UPDATE product
            SET send_email = :send_email
            WHERE org = :org_id AND cpe = :cpe_name AND "deletedAt" IS NULL
        """)
        result = db.session.execute(update_stmt, {
            'send_email': send_email_value,
            'org_id': org.id, # Usar org.id
            'cpe_name': cpe_name # Usar cpe_name
        })

        # Verificar si alguna fila fue afectada (seguridad adicional)
        if result.rowcount == 0:
             # Esto podría ocurrir si el producto fue eliminado entre la consulta inicial y la ejecución del update.
             db.session.rollback()
             logger.getChild('products').warning(f"Update settings via SQL falló para '{cpe_name}' en Org {org.id}, producto no encontrado o modificado concurrentemente.")
             # Usar 409 Conflict podría ser más apropiado que 404 aquí.
             return {"error": "Producto no encontrado o modificado concurrentemente durante la actualización.", "code": "conflict"}, 409

        # 5. Commit de la transacción SQL
        db.session.commit()
        logger.getChild('products').info(f"Configuración 'send_email' actualizada a {send_email_value} para producto '{cpe_name}' en Org {org.id} por Usuario {current_user.id} via direct SQL. Timestamp updatedAt preservado.")

        # 6. Devolver respuesta simplificada
        return {
            "message": f"Configuración del producto '{cpe_name}' actualizada correctamente.",
            "product": {
                "cpe": product_cpe,
                "send_email": send_email_value # El valor que acabamos de establecer
                # No se devuelven timestamps aquí ya que no se modificaron explícitamente
            }
        }, 200

    except SQLAlchemyError as e:
        db.session.rollback()
        logger.getChild('products').error(f"Error de BD al actualizar settings (SQL directo) de producto '{cpe_name}' de Org {org.id}: {str(e)}", exc_info=True)
        return {"error": "Error de base de datos al actualizar la configuración del producto.", "code": "database_error"}, 500
    except Exception as e:
        db.session.rollback()
        logger.getChild('products').error(f"Error inesperado al actualizar settings (SQL directo) de producto '{cpe_name}' de Org {org.id}: {str(e)}", exc_info=True)
        return {"error": "Error interno del servidor.", "code": "internal_server_error"}, 500
