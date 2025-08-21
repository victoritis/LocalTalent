import base64
from datetime import datetime, timedelta, timezone
import os
from flask import jsonify, request, Blueprint
from flask_login import login_required, current_user
from app import db
from app.models import Organization, OrgUser, Alert, Product, CVE, Match, CPE
from app.organization import bp
from app.organization.services import (
    get_chart_data, get_recent_products,
    obtener_organizaciones_usuario, my_organizations, calculate_security_score,
    get_organization_by_name_and_verify_access
)
from app.logger_config import logger
from sqlalchemy.exc import SQLAlchemyError
from flask import current_app
from sqlalchemy import func, desc, join, and_

#DEVUELVE TODAS LAS ORGANIZACIONES A LAS QUE PERTENECE EL USUARIO
#Usada para comprobar si se accede a una organizacion a la que no se tiene acceso /auth/$organizationName
@bp.route('/api/v1/user/organizations', methods=['GET'])
@login_required
def get_user_organizations():
    """
    - Obtiene todas las organizaciones a las que pertenece el usuario actual.
    - Requiere que el usuario esté autenticado.
    - Retorna la lista de organizaciones o error si no se encuentran.
    """
    try:
        logger.getChild('organization').info(f"Solicitud de organizaciones para usuario: {current_user.email}")
        
        # Obtener las organizaciones del usuario actual
        org_data = obtener_organizaciones_usuario()
        
        # Verificar si se encontraron organizaciones
        if not org_data:
            logger.getChild('organization').warning(f"No se encontraron organizaciones para el usuario: {current_user.email}")
            return jsonify({"error": "No se encontraron organizaciones"}), 404
        
        logger.getChild('organization').info(f"Se encontraron {len(org_data)} organizaciones para el usuario: {current_user.email}")
        return jsonify({"organizations": org_data})
    except Exception as e:
        logger.getChild('organization').error(f"Error al obtener organizaciones del usuario {current_user.email}: {str(e)}", exc_info=True)
        return jsonify({"error": "Error interno del servidor"}), 500


#Vista my-organizations
@bp.route('/api/v1/my-organizations', methods=['GET'])
@login_required
def get_organizations():
    return my_organizations()



@bp.route('/api/v1/organizations/<string:name>/overview', methods=['GET'])
@login_required
def get_organization_overview(name):
    """
    Obtiene la información general de una organización, calculando métricas
    directamente desde la base de datos.
    """
    try:
        logger.getChild('organization').info(f"Solicitud de resumen para organización '{name}' por usuario: {current_user.email}")

        # Obtener organización y verificar acceso usando el servicio
        org, error_response = get_organization_by_name_and_verify_access(name)
        if error_response:
            return error_response

        now = datetime.now(timezone.utc)
        thirty_days_ago = now - timedelta(days=30)
        threat_score = calculate_security_score(org.id)
        chart_data = get_chart_data(org, now, thirty_days_ago)
        recent_products_list = get_recent_products(org, thirty_days_ago)

        # --- Calcular Métricas con Consultas Directas ---

        # Alertas Activas
        active_alerts_count = db.session.query(func.count(Alert.cve)).filter(
            Alert.org == org.id,
            Alert.active == True
        ).scalar() or 0

        # Alertas Activas CRÍTICAS (CVSS >= 9.0)
        active_critical_alerts_count = db.session.query(func.count(Alert.cve)).join(CVE).filter(
            Alert.org == org.id,
            Alert.active == True,
            CVE.cvss_score >= 9.0
        ).scalar() or 0

        # Alertas Totales (incluyendo inactivas y soft-deleted)
        total_alerts_count_query = db.session.query(func.count(Alert.cve)).execution_options(include_soft_deleted=True).filter(
            Alert.org == org.id
        )
        total_alerts_count = total_alerts_count_query.scalar() or 0

        # CPEs Registrados (activos, no soft-deleted)
        registered_cpes_count = db.session.query(func.count(Product.cpe)).filter(
            Product.org == org.id
        ).scalar() or 0

        # --- Fin Cálculo Métricas ---

        # Obtener alertas recientes
        recent_alerts = [
            {
            "cve": alert.cve_info.id,
            "cpe": alert.cpe_info.id,
            "active": alert.active,
            "date": alert.createdAt.replace(tzinfo=timezone.utc).isoformat(),
            "cvss_score": alert.cve_info.cvss_score if alert.cve_info else None,
            "cvss_version": alert.cve_info.cvss_version if alert.cve_info else None
            }
            for alert in Alert.query.options(
            db.joinedload(Alert.cve_info),
            db.joinedload(Alert.cpe_info)
            ).filter(
            Alert.org == org.id,
            Alert.active == True
            ).order_by(Alert.createdAt.desc()).limit(50).all()
        ]

        logger.getChild('organization').info(f"Resumen generado exitosamente para organización: {name} (ID: {org.id}) con métricas calculadas.")
        return jsonify({
            "organization": {
                "id": org.id,
                "name": org.name,
                "createdAt": org.createdAt.isoformat(),
            },
            "security_score": threat_score,
            "metrics": [
                {
                    "title": "Alertas Activas",
                    "value": str(active_alerts_count),
                    "critical_value": str(active_critical_alerts_count)
                },
                {
                    "title": "Alertas Totales",
                    "value": str(total_alerts_count)
                },
                {
                    "title": "CPEs Registrados",
                    "value": str(registered_cpes_count)
                }
            ],
            "recent_alerts": recent_alerts,
            "recent_inventory": recent_products_list,
            "chart_data": chart_data
        })
    except Exception as e:
        logger.getChild('organization').error(f"Error al obtener resumen de organización '{name}' para usuario {current_user.email}: {str(e)}", exc_info=True)
        return jsonify({"error": "Error interno del servidor"}), 500


@bp.route('/api/v1/organizations/<string:name>/hover-info', methods=['GET'])
@login_required
def get_organization_hover_info(name):
    """
    Obtiene información básica para HoverCard, calculando métricas
    directamente desde la base de datos.
    Incluye: Nombre, security_score, Alertas Activas, CPEs Registrados,
             Número de Usuarios y Número de Alertas Críticas Activas.
    """
    try:
        logger.getChild('organization').info(f"Solicitud de datos para HoverCard de organización '{name}' por usuario: {current_user.email}")

        # Obtener organización y verificar acceso usando el servicio existente
        org, error_response = get_organization_by_name_and_verify_access(name)
        if error_response:
            return error_response

        threat_score = calculate_security_score(org.id)

        # --- Calcular Métricas con Consultas Directas ---

        # Alertas Activas
        active_alerts_count = db.session.query(func.count(Alert.cve)).filter(
            Alert.org == org.id,
            Alert.active == True
        ).scalar() or 0

        # CPEs Registrados (activos, no soft-deleted)
        registered_cpes_count = db.session.query(func.count(Product.cpe)).filter(
            Product.org == org.id
        ).scalar() or 0
        
        # Contar usuarios en la organización
        user_count = db.session.query(func.count(OrgUser.user_id)).filter(
            OrgUser.organization_id == org.id,
            # Opcional: si quieres contar solo usuarios activos en la tabla User
            # OrgUser.user.has(is_enabled=True) 
        ).scalar() or 0

        # Contar alertas críticas activas
        critical_alerts_count = db.session.query(func.count(Alert.cve)).join(Alert.cve_info).filter(
            Alert.org == org.id,
            Alert.active == True,
            CVE.cvss_score >= 9.0  # Asumiendo que CRITICAL es >= 9.0
        ).scalar() or 0
        

        # --- Fin Cálculo Métricas ---

        logger.getChild('organization').info(f"Datos de HoverCard generados para organización: {name} (ID: {org.id}) con métricas calculadas.")

        return jsonify({
            "organization": {
                "id": org.id,
                "name": org.name,
            },
            "security_score": threat_score, 
            "metrics": [
                {
                    "title": "Alertas Activas",
                    "value": str(active_alerts_count)
                },
                {
                    "title": "CPEs Registrados",
                    "value": str(registered_cpes_count)
                },
                {
                    "title": "Usuarios", 
                    "value": str(user_count)
                },
                {
                    "title": "Alertas Críticas",
                    "value": str(critical_alerts_count)
                }
            ]
        })

    except Exception as e:
        logger.getChild('organization').error(f"Error al obtener datos de HoverCard para '{name}': {str(e)}", exc_info=True)
        return jsonify({"error": "Error interno del servidor"}), 500
