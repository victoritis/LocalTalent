from flask import request, jsonify
from flask_login import login_required
from app.alerts import bp
from app.models import Alert, CVE, delete
from app import db
from app.organization.services import get_organization_by_name_and_verify_access
from app.logger_config import logger
from datetime import datetime, timezone
from sqlalchemy import desc, asc, text, tuple_, func
from app.alerts.services import get_severity_from_cvss, filter_alerts_by_severity

@bp.route('/api/v1/organizations/<name>/alerts', methods=['GET'])
@login_required
def get_organization_alerts(name):
    """
    Obtiene alertas para una organización específica con soporte para filtrado y paginación.
    """
    # Verificar acceso a la organización
    org, error_response = get_organization_by_name_and_verify_access(name)
    if error_response:
        return error_response

    # Parámetros de paginación y filtrado
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    severity = request.args.get('severity', 'ALL')
    status = request.args.get('status', 'ALL')
    search = request.args.get('search', '')
    # Nuevo parámetro para ordenación temporal
    sort_order = request.args.get('sort_order', 'DESC')  # DESC por defecto (más reciente primero)

    try:
        # Consulta base con joins para obtener información relacionada
        query = Alert.query.options(
            db.joinedload(Alert.cve_info),
            db.joinedload(Alert.cpe_info)
        ).filter(
            Alert.org == org.id,
            Alert.deletedAt == None  # Solo alertas no eliminadas (soft delete)
        )
        
        # Filtro por severidad usando el nuevo servicio
        query = filter_alerts_by_severity(query, severity)
        
        # Filtro por estado (activa/inactiva)
        if status == 'ACTIVE':
            query = query.filter(Alert.active == True)
        elif status == 'INACTIVE':
            query = query.filter(Alert.active == False)
        
        # Filtro por búsqueda (en CVE ID o CPE ID)
        if search:
            search_term = f"%{search}%"
            query = query.filter(db.or_(
                Alert.cve.ilike(search_term),
                Alert.cpe.ilike(search_term)
            ))
        
        # Ordenar por fecha de actualización según el parámetro sort_order
        if sort_order.upper() == 'ASC':
            query = query.order_by(asc(Alert.updatedAt))
        else:
            query = query.order_by(desc(Alert.updatedAt))
        
        # Paginar los resultados
        pagination = query.paginate(
            page=page, per_page=per_page, error_out=False)
        
        alerts = pagination.items
        
        # Formatear las alertas para la respuesta
        alerts_list = []
        for alert in alerts:
            severity_value = get_severity_from_cvss(alert.cve_info.cvss_score) if alert.cve_info and alert.cve_info.cvss_score else "UNKNOWN"
            
            alert_info = {
                'org_id': alert.org,
                'cve_id': alert.cve,
                'cpe_id': alert.cpe,
                'is_active': alert.active,
                'created_at': alert.createdAt.isoformat() if alert.createdAt else None,
                'updated_at': alert.updatedAt.isoformat() if alert.updatedAt else None,
                'cvss_score': alert.cve_info.cvss_score if alert.cve_info else None,
                'cvss_version': alert.cve_info.cvss_version if alert.cve_info else None,
                'severity': severity_value,
                'cve_data': alert.cve_info.data if alert.cve_info else None,
                'cpe_data': alert.cpe_info.data if alert.cpe_info else None
            }
            alerts_list.append(alert_info)
        
        logger.getChild('alerts').info(f"Alertas recuperadas correctamente para org '{name}': {len(alerts_list)} items, página {page}/{pagination.pages}")
        
        return jsonify({
            'alerts': alerts_list,
            'page': pagination.page,
            'total_pages': pagination.pages,
            'total_items': pagination.total
        })
    
    except Exception as e:
        logger.getChild('alerts').error(f"Error al obtener alertas para org '{name}': {str(e)}", exc_info=True)
        return jsonify({"error": "Error al obtener alertas", "details": str(e)}), 500

@bp.route('/api/v1/organizations/<name>/alerts/deactivate-all-filtered', methods=['PATCH'])
@login_required
def deactivate_all_filtered_alerts(name):
    """
    Desactiva todas las alertas ACTIVAS que coincidan con los filtros
    de severidad y búsqueda para una organización.
    """
    org, error_response = get_organization_by_name_and_verify_access(name)
    if error_response:
        return error_response

    data = request.get_json()
    if not data:
        return jsonify({"error": "Cuerpo de la solicitud JSON vacío o inválido"}), 400
        
    severity = data.get('severity', 'ALL')
    search = data.get('search', '')

    try:
        query = Alert.query.join(Alert.cve_info, isouter=True).filter(
            Alert.org == org.id,
            Alert.active == True, # Solo desactivar las que están activas
            Alert.deletedAt == None
        )

        # Aplicar filtro de severidad
        query = filter_alerts_by_severity(query, severity)
        
        # Aplicar filtro de búsqueda
        if search:
            search_term = f"%{search}%"
            query = query.filter(db.or_(
                Alert.cve.ilike(search_term),
                Alert.cpe.ilike(search_term)
            ))
        
        # Obtener las claves primarias compuestas de las alertas a actualizar
        alerts_to_update_keys = query.with_entities(Alert.org, Alert.cve, Alert.cpe).all()
        count = len(alerts_to_update_keys)

        if count == 0:
            logger.getChild('alerts').info(f"No hay alertas activas que coincidan con los filtros para desactivar en org '{name}'. Filtros: severity='{severity}', search='{search}'")
            return jsonify({"message": "No hay alertas activas que coincidan con los filtros para desactivar.", "alerts_deactivated": 0}), 200

        # Construir la condición para la actualización masiva
        # Usamos tuple_ para filtrar por la clave primaria compuesta (org, cve, cpe)
        alert_keys_tuples = [(key.org, key.cve, key.cpe) for key in alerts_to_update_keys]

        update_values = {
            'active': False,
            'updatedAt': datetime.now(timezone.utc)
        }
        
        # Realizar la actualización masiva sobre una consulta simple filtrada por las claves
        updated_rows = db.session.query(Alert).filter(
            tuple_(Alert.org, Alert.cve, Alert.cpe).in_(alert_keys_tuples)
        ).update(update_values, synchronize_session=False)
        
        db.session.commit()

        logger.getChild('alerts').info(f"{updated_rows} alertas activas desactivadas masivamente para org '{name}'. Filtros: severity='{severity}', search='{search}'")
        
        return jsonify({
            "message": f"{updated_rows} alertas han sido desactivadas.",
            "alerts_deactivated": updated_rows
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.getChild('alerts').error(f"Error en desactivación masiva de alertas para org '{name}': {str(e)}", exc_info=True)
        return jsonify({"error": "Error durante la desactivación masiva de alertas", "details": str(e)}), 500


@bp.route('/api/v1/organizations/<name>/alerts/activate-all-filtered', methods=['PATCH'])
@login_required
def activate_all_filtered_alerts(name):
    """
    Activa todas las alertas INACTIVAS que coincidan con los filtros
    de severidad y búsqueda para una organización.
    """
    org, error_response = get_organization_by_name_and_verify_access(name)
    if error_response:
        return error_response

    data = request.get_json()
    if not data:
        return jsonify({"error": "Cuerpo de la solicitud JSON vacío o inválido"}), 400
        
    severity = data.get('severity', 'ALL')
    search = data.get('search', '')

    try:
        query = Alert.query.join(Alert.cve_info, isouter=True).filter(
            Alert.org == org.id,
            Alert.active == False, # Solo activar las que están inactivas
            Alert.deletedAt == None
        )

        query = filter_alerts_by_severity(query, severity)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(db.or_(
                Alert.cve.ilike(search_term),
                Alert.cpe.ilike(search_term)
            ))
        
        # Obtener las claves primarias compuestas de las alertas a actualizar
        alerts_to_update_keys = query.with_entities(Alert.org, Alert.cve, Alert.cpe).all()
        count = len(alerts_to_update_keys)

        if count == 0:
            logger.getChild('alerts').info(f"No hay alertas inactivas que coincidan con los filtros para activar en org '{name}'. Filtros: severity='{severity}', search='{search}'")
            return jsonify({"message": "No hay alertas inactivas que coincidan con los filtros para activar.", "alerts_activated": 0}), 200

        # Construir la condición para la actualización masiva
        alert_keys_tuples = [(key.org, key.cve, key.cpe) for key in alerts_to_update_keys]

        update_values = {
            'active': True,
            'updatedAt': datetime.now(timezone.utc)
        }
        
        # Realizar la actualización masiva sobre una consulta simple filtrada por las claves
        updated_rows = db.session.query(Alert).filter(
            tuple_(Alert.org, Alert.cve, Alert.cpe).in_(alert_keys_tuples)
        ).update(update_values, synchronize_session=False)
        
        db.session.commit()

        logger.getChild('alerts').info(f"{updated_rows} alertas inactivas activadas masivamente para org '{name}'. Filtros: severity='{severity}', search='{search}'")
        
        return jsonify({
            "message": f"{updated_rows} alertas han sido activadas.",
            "alerts_activated": updated_rows
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.getChild('alerts').error(f"Error en activación masiva de alertas para org '{name}': {str(e)}", exc_info=True)
        return jsonify({"error": "Error durante la activación masiva de alertas", "details": str(e)}), 500


@bp.route('/api/v1/organizations/<name>/alerts/critical-active-count', methods=['GET'])
@login_required
def get_critical_active_alerts_count(name):
    """
    Obtiene el número de alertas críticas activas para una organización específica.
    Una alerta se considera crítica si su CVSS score es >= 9.0.
    """
    org, error_response = get_organization_by_name_and_verify_access(name)
    if error_response:
        return error_response

    try:
        critical_alerts_count = db.session.query(func.count(Alert.cve)).join(Alert.cve_info).filter(
            Alert.org == org.id,
            Alert.active == True,
            Alert.deletedAt == None,  # Solo alertas no eliminadas (soft delete)
            CVE.cvss_score >= 9.0  # Definición de criticidad
        ).scalar() or 0
        
        logger.getChild('alerts').info(f"Recuento de alertas críticas activas para org '{name}': {critical_alerts_count}")
        
        return jsonify({
            "organization_name": name,
            "critical_active_alerts_count": critical_alerts_count
        })
    
    except Exception as e:
        logger.getChild('alerts').error(f"Error al obtener recuento de alertas críticas activas para org '{name}': {str(e)}", exc_info=True)
        return jsonify({"error": "Error al obtener recuento de alertas críticas activas", "details": str(e)}), 500


@bp.route('/api/v1/organizations/<name>/alerts/<cve_id>/<cpe_id>/toggle', methods=['PATCH'])
@login_required
def toggle_alert_status(name, cve_id, cpe_id):
    """
    Activa o desactiva una alerta específica.
    Usa SQL directo para no modificar el campo updatedAt.
    """
    # Verificar acceso a la organización
    org, error_response = get_organization_by_name_and_verify_access(name)
    if error_response:
        return error_response
    
    # Obtener datos del cuerpo de la petición
    data = request.get_json()
    is_active = data.get('is_active', True)
    
    try:
        # Verificar primero que la alerta existe
        alert = Alert.query.filter_by(
            org=org.id, 
            cve=cve_id, 
            cpe=cpe_id,
            deletedAt=None  # Solo alertas no eliminadas
        ).first()
        
        if not alert:
            logger.getChild('alerts').warning(f"Intento de modificar alerta no encontrada: org='{name}', cve={cve_id}, cpe={cpe_id}")
            return jsonify({"error": "Alerta no encontrada"}), 404
        
        # Ejecutar actualización SQL directa para no modificar updatedAt
        update_stmt = text("""
            UPDATE alert
            SET active = :is_active
            WHERE org = :org_id AND cve = :cve_id AND cpe = :cpe_id AND "deletedAt" IS NULL
        """)
        
        result = db.session.execute(update_stmt, {
            'is_active': is_active,
            'org_id': org.id,
            'cve_id': cve_id,
            'cpe_id': cpe_id
        })
        
        # Verificar si alguna fila fue afectada
        if result.rowcount == 0:
            # Esto podría ocurrir si la alerta fue eliminada entre la consulta inicial y la ejecución del update
            db.session.rollback()
            logger.getChild('alerts').warning(f"Update status via SQL falló para alerta: org='{name}', cve={cve_id}, cpe={cpe_id}")
            return jsonify({"error": "Alerta no encontrada o modificada concurrentemente durante la actualización"}), 409
        
        db.session.commit()
        
        logger.getChild('alerts').info(f"Estado de alerta actualizado sin cambiar updatedAt: org='{name}', cve={cve_id}, cpe={cpe_id}, active={is_active}")
        
        return jsonify({
            "message": f"Alerta {cve_id} {cpe_id} {'activada' if is_active else 'desactivada'} correctamente",
            "is_active": is_active
        })
        
    except Exception as e:
        db.session.rollback()
        logger.getChild('alerts').error(f"Error al actualizar estado de alerta: {str(e)}", exc_info=True)
        return jsonify({"error": "Error al actualizar estado de alerta", "details": str(e)}), 500

@bp.route('/api/v1/organizations/<name>/alerts/<cve_id>/<cpe_id>', methods=['DELETE'])
@login_required
def delete_alert(name, cve_id, cpe_id):
    """
    Realiza un soft delete de una alerta específica.
    """
    # Verificar acceso a la organización
    org, error_response = get_organization_by_name_and_verify_access(name)
    if error_response:
        return error_response
    
    try:
        # Buscar la alerta específica
        alert = Alert.query.filter_by(
            org=org.id, 
            cve=cve_id, 
            cpe=cpe_id,
            deletedAt=None  # Solo alertas no eliminadas
        ).first()
        
        if not alert:
            logger.getChild('alerts').warning(f"Intento de eliminar alerta no encontrada: org='{name}', cve={cve_id}, cpe={cpe_id}")
            return jsonify({"error": "Alerta no encontrada"}), 404
        
        # Realizar soft delete y auditoría
        delete(alert)
        logger.getChild('alerts').info(f"Alerta eliminada (soft delete): org='{name}', cve={cve_id}, cpe={cpe_id}")
        return jsonify({"message": f"Alerta {cve_id} para {cpe_id} eliminada correctamente"}), 200
    except Exception as e:
        db.session.rollback()
        logger.getChild('alerts').error(f"Error al eliminar alerta: {str(e)}", exc_info=True)
        return jsonify({"error": "Error al eliminar la alerta", "details": str(e)}), 500
