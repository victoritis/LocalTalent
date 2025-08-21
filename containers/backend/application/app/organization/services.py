# Helper functions
import base64
from datetime import timedelta, datetime, timezone
import os
from flask import current_app, request, jsonify
from flask_login import current_user
from sqlalchemy import func
from app.models import Organization, OrgUser, Alert, Product, CVE, Match, CPE
from app import db
from app.logger_config import logger
from sqlalchemy.exc import SQLAlchemyError

def get_recent_alerts(org, thirty_days_ago):
    """Obtiene alertas recientes de los últimos 30 días con información de CVE y CPE"""
    alerts = Alert.query.options(
        db.joinedload(Alert.cve_info),
        db.joinedload(Alert.cpe_info)
    ).filter(
        Alert.org == org.id,
        Alert.createdAt >= thirty_days_ago
    ).order_by(Alert.createdAt.desc()).limit(50).all()

    return [{
        "cve": alert.cve_info.id,
        "cpe": alert.cpe_info.id,
        "active": alert.active,
        "date": alert.createdAt.replace(tzinfo=timezone.utc).isoformat()
    } for alert in alerts]

def get_recent_products(org, thirty_days_ago):
    """Obtiene productos recientemente actualizados en los últimos 30 días"""
    products = Product.query.options(
        db.joinedload(Product.cpe_info)
    ).filter(
        Product.org == org.id,
        Product.updatedAt >= thirty_days_ago      
    ).order_by(Product.updatedAt.desc()).limit(50).all() 

    return [{
        "cpe": product.cpe_info.id,
        "date": product.updatedAt.replace(tzinfo=timezone.utc).isoformat() 
    } for product in products]

def get_chart_data(org, now, thirty_days_ago):
    """Genera datos para gráficos temporales de alertas y productos"""
    # Datos para alertas
    alerts_data = db.session.query(
        func.date(Alert.createdAt).label('date'),
        func.count(Alert.cve).label('count')
    ).filter(
        Alert.org == org.id,
        Alert.createdAt >= thirty_days_ago
    ).group_by('date').all()

    # Datos para productos usando updatedAt
    products_data = db.session.query(
        func.date(Product.updatedAt).label('date'),  
        func.count(Product.cpe).label('count')
    ).filter(
        Product.org == org.id,
        Product.updatedAt >= thirty_days_ago        
    ).group_by('date').all()

    # Convertir a diccionarios para fácil procesamiento
    alerts_dict = {str(row.date): row.count for row in alerts_data}
    products_dict = {str(row.date): row.count for row in products_data}

    # Generar rango completo de fechas
    date_labels = []
    current_date = thirty_days_ago.date()
    while current_date <= now.date():
        date_labels.append(current_date.isoformat())
        current_date += timedelta(days=1)

    # Construir series de datos completas
    alerts_series = [alerts_dict.get(date, 0) for date in date_labels]
    products_series = [products_dict.get(date, 0) for date in date_labels]

    return {
        "labels": date_labels,
        "datasets": [
            {
                "label": "Alertas por día",
                "data": alerts_series,
                "borderColor": "#ff6384",
                "fill": False
            },
            {
                "label": "Productos actualizados por día",  # <--- renombrado
                "data": products_series,
                "borderColor": "#36a2eb",
                "fill": False
            }
        ]
    }

def calculate_security_score(org_id):
    """
    Calcula una puntuación de amenaza (0-100) para una organización, considerando
    la severidad individual de alertas activas (con mayor peso en las altas),
    la densidad de alertas sobre productos y la proporción de alertas activas sobre el total.
    Un valor de 0 significa máxima seguridad, 100 significa máximo riesgo.
    """
    try:
        # --- Obtener Datos Base ---
        total_products = db.session.query(Product).filter_by(org=org_id).count()

        if total_products == 0:
            logger.getChild('organization').debug(f"Cálculo nivel de amenaza para Org {org_id}: No hay productos. Nivel=0")
            return 0  # Sin productos = sin amenazas

        active_alerts = db.session.query(Alert).options(
            db.joinedload(Alert.cve_info)
        ).filter_by(org=org_id, active=True).all()
        active_alerts_count = len(active_alerts)

        total_alerts_count = db.session.query(Alert).filter_by(org=org_id).count()

        # Si no hay alertas activas, la amenaza es cero
        if active_alerts_count == 0:
            logger.getChild('organization').debug(f"Cálculo nivel de amenaza para Org {org_id}: No hay alertas activas. Nivel=0")
            return 0

        # --- Calcular el nivel de amenaza directamente (no como inversión de seguridad) ---
        threat_score = 0.0
        
        # 1. Contribución por Severidad (basada en TODAS las alertas activas)
        severity_exponent = 3.0
        weight_severity = 8.0 
        unknown_severity_penalty = 0.3 * weight_severity 

        for alert in active_alerts:
            score = alert.cve_info.cvss_score if alert.cve_info else None

            if score is None:
                threat_score += unknown_severity_penalty
            else:
                normalized_score = min(score, 10.0)
                # Calculamos directamente la contribución al nivel de amenaza
                threat_score += ((normalized_score / 10.0) ** severity_exponent) * weight_severity

        # 2. Contribución por Densidad (Alertas Activas / Productos Totales)
        weight_density = 25.0 
        max_density_contribution = 30.0 
        
        if total_products > 0:
            density_ratio = active_alerts_count / total_products
            threat_score += min(density_ratio * weight_density, max_density_contribution)

        # 3. Contribución por Ratio (Alertas Activas / Alertas Totales)
        weight_ratio = 5.0 
        
        if total_alerts_count > 0:
            active_ratio = active_alerts_count / total_alerts_count
            threat_score += active_ratio * weight_ratio

        # --- Normalizar el resultado final ---
        # Asegurar que el valor esté en el rango 0-100, donde 100 es máxima amenaza
        final_threat_score = min(100.0, threat_score)

        logger.getChild('organization').debug(
            f"Cálculo nivel de amenaza Org {org_id}: Productos={total_products}, "
            f"AlertasActivas={active_alerts_count}, AlertasTotales={total_alerts_count}, "
            f"ContribuciónSeveridad={severity_exponent:.2f}, "
            f"ContribuciónDensidad={density_ratio:.2f} (Peso={weight_density}), "
            f"ContribuciónRatio={active_ratio:.2f} (Peso={weight_ratio}), "
            f"NivelAmenazaFinal={final_threat_score:.2f}"
        )

        return round(final_threat_score)

    except Exception as e:
        logger.getChild('organization').error(f"Error calculando nivel de amenaza para Org {org_id}: {str(e)}", exc_info=True)
        return 0  # Devolver 0 en caso de error (asumimos seguridad por defecto)

#Obetenerr las organizaciones a las que pertenece el usuario y si es superadmin todas las organizaciones
def obtener_organizaciones_usuario():
    if 'ROLE_SUPERADMIN' in current_user.special_roles:
        # Si el usuario es superadmin, retorna todas las organizaciones
        orgs = db.session.query(Organization.id, Organization.name).all()
    else:
        # Para usuarios regulares, solo las organizaciones a las que pertenece
        orgs = db.session.query(Organization.id, Organization.name) \
            .join(OrgUser) \
            .filter(OrgUser.user_id == current_user.id).all()
    return [{"id": org.id, "name": org.name} for org in orgs]


#Verifica que el usuario pertenexca a la organizacion de la url
def get_organization_by_name_and_verify_access(name):
    """
    Busca una organización por nombre y verifica si el usuario actual tiene acceso.
    Retorna (Organization, None) si tiene éxito, o (None, error_response) si falla.
    """
    logger.getChild('organization').debug(f"Verificando acceso para Org '{name}' por Usuario {current_user.id}")

    # Obtener las organizaciones a las que el usuario tiene acceso
    user_orgs_data = obtener_organizaciones_usuario()
    user_org_names = [org['name'] for org in user_orgs_data]

    # Verificar si el usuario tiene acceso (directo o por ser superadmin)
    if name not in user_org_names:
        logger.getChild('organization').warning(f"Usuario {current_user.id} ({current_user.email}) intentó acceder a Org '{name}' sin permisos generales.")
        return None, (jsonify({"error": "No tienes acceso a esta organización", "code": "forbidden"}), 403)

    # Buscar la organización en la base de datos
    org = db.session.query(Organization).filter(func.lower(Organization.name) == func.lower(name)).first()
    if not org:
        logger.getChild('organization').warning(f"Organización '{name}' solicitada por Usuario {current_user.id} no encontrada en la BD.")
        return None, (jsonify({"error": "Organización no encontrada", "code": "org_not_found"}), 404)

    logger.getChild('organization').debug(f"Acceso verificado para Org ID {org.id} ('{name}') por Usuario {current_user.id}")
    return org, None # Retorna la organización y None para el error

def my_organizations():
    """
    Lógica para devolver todas las organizaciones para superadmins o las organizaciones del usuario para usuarios regulares.
    """
    try:
        logger.getChild('user').info(f"Usuario {current_user.id} solicitando organizaciones")

        page = request.args.get('page', 1, type=int)
        per_page = current_app.config['ORGS_PER_PAGE']
        logger.getChild('user').debug(f"Parámetros de paginación - page: {page}, per_page: {per_page}")

        is_superadmin = "ROLE_SUPERADMIN" in current_user.special_roles

        try:
            if is_superadmin:
                query = Organization.query
            else:
                query = Organization.query.join(OrgUser).filter(OrgUser.user_id == current_user.id)

            pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        except SQLAlchemyError as e:
            logger.getChild('user').error(f"Error en consulta de organizaciones: {str(e)}", exc_info=True)
            return {
                "error": "Error interno al recuperar organizaciones",
                "code": "database_error"
            }, 500

        organizations = pagination.items
        if not organizations:
            logger.getChild('user').warning(f"No se encontraron organizaciones en la página {page}")

        data = []
        for org in organizations:
            try:
                # Cargar y codificar la imagen del logo
                logo_data = None
                if org.logo_path:
                    try:
                        logo_path = os.path.join(current_app.root_path, 'public', org.logo_path.lstrip('/'))
                        logger.getChild('user').debug(f"Intentando cargar logo desde: {logo_path}")
                        
                        if os.path.exists(logo_path):
                            with open(logo_path, 'rb') as f:
                                logo_data = base64.b64encode(f.read()).decode('utf-8')
                        else:
                            logger.getChild('user').warning(f"Logo no encontrado en: {logo_path}")
                    except Exception as e:
                        logger.getChild('user').error(f"Error al cargar logo para organización {org.id}: {str(e)}", exc_info=True)

                org_data = {
                    "id": org.id,
                    "name": org.name,
                    "logo_path": org.logo_path,
                    "logo_data": logo_data,  # En la bbdd debe guardarse como "/organizations_logo/organization_123_logo.png"
                    
                    "users": []
                }

                # Agregar el campo user_role como un string único.
                if is_superadmin:
                    org_data["roles_in_org"] = "ROLE_SUPERADMIN"
                else:
                    current_orguser = OrgUser.query.filter_by(organization_id=org.id, user_id=current_user.id).first()
                    org_data["roles_in_org"] = current_orguser.roles[0] if current_orguser and current_orguser.roles else ""

                if is_superadmin:
                    for orguser in org.users:
                        user = orguser.user
                        current_role = orguser.roles[0] if orguser.roles else ""
                        org_data["users"].append({
                            "id": user.id,
                            "email": user.email,
                            "currentRole": current_role
                        })
                else:
                    if current_orguser:
                        org_data["users"].append({
                            "id": current_user.id,
                            "email": current_user.email,
                            "currentRole": current_orguser.roles[0] if current_orguser.roles else "",
                            "roles_in_org": current_orguser.roles  # Devuelve todas las roles de la organización para el usuario
                        })

                data.append(org_data)
            except Exception as e:
                logger.getChild('user').error(f"Error serializando organización {org.id}: {str(e)}", exc_info=True)
                continue

        logger.getChild('user').info(f"Entrega exitosa de {len(data)} organizaciones")
        
        return {
            "organizations": data,
            "page": pagination.page,
            "total_pages": pagination.pages,
            "total_items": pagination.total
        }, 200

    except Exception as e:
        logger.getChild('user').error(f"Error general en my_organizations: {str(e)}", exc_info=True)
        return {
            "error": "Error interno del servidor",
            "code": "internal_server_error"
        }, 500

