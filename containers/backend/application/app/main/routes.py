from flask import jsonify, request, current_app
from flask_login import login_required
from app.models import User, Organization, CPE, CVE, Match, Feedback # Añadir Feedback
from app.main import bp
from app import db
from sqlalchemy import text  
from datetime import datetime
from flask import jsonify, request
from sqlalchemy.sql import text
from app.models import User, Audit
from flask import Flask
from flask_login import login_required, current_user
from app.models import CPE 
from app.logger_config import logger 
from app.models import CPE
from app.logger_config import logger 


#############################################
# Rutas de prueba para el módulo de auditoría y crear usuario
#############################################
#Eliminar en un futuro

def serialize_datetime(obj):
    """Función auxiliar para convertir datetime a string"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


@bp.route('/healthcheck', methods=['GET'])
def healthcheck():
    """
    Endpoint de verificación de salud del servicio.
    """
    return jsonify({"status": "OK"}), 200


@bp.route('/api/v1/cpe-explorer/detail/<path:cpe_id>', methods=['GET'])
@login_required 
def get_cpe_details(cpe_id):
    """
    Obtiene los detalles completos de un CPE específico por su ID (nombre CPE).
    El ID puede contener slashes, por eso se usa <path:cpe_id>.
    """
    try:
        
        logger.getChild('main').info(f"Solicitud de detalles para CPE ID: {cpe_id}")

        cpe_data = CPE.query.filter_by(id=cpe_id).first()

        if not cpe_data:
            logger.getChild('main').warning(f"CPE ID: {cpe_id} no encontrado.")
            return jsonify({"error": "CPE no encontrado", "code": "not_found"}), 404

        response_data = {
            "id": cpe_data.id,
            "data": cpe_data.data,
        }
        
        logger.getChild('main').info(f"Detalles de CPE ID: {cpe_id} recuperados exitosamente.")
        return jsonify(response_data), 200

    except Exception as e:
        logger.getChild('main').error(f"Error al obtener detalles para CPE ID {cpe_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Error interno del servidor", "code": "internal_server_error"}), 500


@bp.route('/api/v1/cve-explorer/search', methods=['GET'])
@login_required
def search_cves_explorer():
    """
    Busca CVEs por su ID (o un término de búsqueda).
    Devuelve una lista de IDs de CVE.
    """
    search_term = request.args.get('q', '')
    limit = request.args.get('limit', 15, type=int)
    offset = request.args.get('offset', 0, type=int)

    logger.getChild('main').info(f"Solicitud de búsqueda de CVEs con término: '{search_term}', límite: {limit}, offset: {offset}")

    if not search_term or len(search_term) < 3:
        logger.getChild('main').debug("Término de búsqueda demasiado corto o vacío para CVEs, devolviendo lista vacía.")
        return jsonify({"results": [], "has_more": False})

    try:
        search_pattern = f'%{search_term}%'
        
        cves_query = CVE.query.filter(CVE.id.ilike(search_pattern)).order_by(CVE.id)
        
        total_matching_cves = cves_query.count()
        
        cves_page = cves_query.offset(offset).limit(limit).all()
        
        results = [cve.id for cve in cves_page]
        has_more = (offset + len(results)) < total_matching_cves

        logger.getChild('main').info(f"Búsqueda CVE para '{search_term}' devolvió {len(results)} resultados. ¿Hay más?: {has_more}")
        return jsonify({"results": results, "has_more": has_more})
    except Exception as e:
        logger.getChild('main').error(f"Error en búsqueda de CVEs para '{search_term}': {str(e)}", exc_info=True)
        return jsonify({"error": "Error interno del servidor al buscar CVEs", "code": "internal_error"}), 500


@bp.route('/api/v1/cve-explorer/detail/<path:cve_id>', methods=['GET'])
@login_required
def get_cve_details_explorer(cve_id):
    """
    Obtiene los detalles completos de una CVE específica por su ID.
    El ID puede contener slashes, por eso se usa <path:cve_id>.
    """
    try:
        logger.getChild('main').info(f"Solicitud de detalles para CVE ID: {cve_id}")

        cve_data_model = CVE.query.filter_by(id=cve_id).first()

        if not cve_data_model:
            logger.getChild('main').warning(f"CVE ID: {cve_id} no encontrado.")
            return jsonify({"error": "CVE no encontrado", "code": "not_found"}), 404

        response_data = {
            "id": cve_data_model.id,
            "data": { 
                "cve": cve_data_model.data 
            }
        }
        
        logger.getChild('main').info(f"Detalles de CVE ID: {cve_id} recuperados exitosamente.")
        return jsonify(response_data), 200
    except Exception as e:
        logger.getChild('main').error(f"Error al obtener detalles para CVE ID {cve_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Error interno del servidor", "code": "internal_server_error"}), 500

@bp.route('/api/v1/match-explorer/search', methods=['GET'])
@login_required
def search_matches_explorer():
    """
    Busca Matches por su ID (matchCriteriaId).
    Devuelve una lista de matchCriteriaIds.
    """
    search_term = request.args.get('q', '')
    limit = request.args.get('limit', 15, type=int)
    offset = request.args.get('offset', 0, type=int)
    match_logger = logger.getChild('main')

    match_logger.info(f"Solicitud de búsqueda de Matches con término: '{search_term}', límite: {limit}, offset: {offset}")

    if not search_term or len(search_term) < 3:
        match_logger.debug("Término de búsqueda demasiado corto o vacío para Matches, devolviendo lista vacía.")
        return jsonify({"results": [], "has_more": False})

    try:
        search_pattern = f'%{search_term}%'
        

        matches_query = Match.query.filter(
            Match.matchCriteriaId.ilike(search_pattern)
        ).order_by(Match.matchCriteriaId)
        
        total_matching_matches = matches_query.count()
        
        matches_page = matches_query.offset(offset).limit(limit).all()
        
        results = [match.matchCriteriaId for match in matches_page]
        has_more = (offset + len(results)) < total_matching_matches

        match_logger.info(f"Búsqueda de Match para '{search_term}' devolvió {len(results)} resultados. ¿Hay más?: {has_more}")
        return jsonify({"results": results, "has_more": has_more})
    except Exception as e:
        match_logger.error(f"Error en búsqueda de Matches para '{search_term}': {str(e)}", exc_info=True)
        return jsonify({"error": "Error interno del servidor al buscar Matches", "code": "internal_error"}), 500

@bp.route('/api/v1/match-explorer/detail/<path:match_criteria_id_param>', methods=['GET'])
@login_required
def get_match_details_explorer(match_criteria_id_param):
    """
    Obtiene los detalles completos de un Match específico por su matchCriteriaId.
    """
    match_logger = logger.getChild('main')
    try:
        match_logger.info(f"Solicitud de detalles para Match ID: {match_criteria_id_param}")

        match_data_model = Match.query.filter_by(matchCriteriaId=match_criteria_id_param).first()

        if not match_data_model:
            match_logger.warning(f"Match ID: {match_criteria_id_param} no encontrado.")
            return jsonify({"error": "Match no encontrado", "code": "not_found"}), 404

        response_data = {
            "id": match_data_model.matchCriteriaId, 
            "data": match_data_model.data, 
        }
        
        match_logger.info(f"Detalles de Match ID: {match_criteria_id_param} recuperados exitosamente.")
        return jsonify(response_data), 200
    except Exception as e:
        match_logger.error(f"Error al obtener detalles para Match ID {match_criteria_id_param}: {str(e)}", exc_info=True)
        return jsonify({"error": "Error interno del servidor", "code": "internal_server_error"}), 500

@bp.route('/api/v1/submit-feedback', methods=['POST'])
@login_required
def submit_feedback():
    """
    Recibe y guarda el feedback enviado por los usuarios.
    """
    if "ROLE_SUPERADMIN" not in current_user.special_roles:
        feedback_logger.warning(f"Intento no autorizado de modificar feedback por usuario {current_user.id} ({current_user.email}).")
        return jsonify({"error": "Acceso denegado. Se requiere rol de superadministrador."}), 403

    data = request.get_json()
    feedback_text = data.get('feedback_text')
    feedback_logger = logger.getChild('main.feedback')

    if not feedback_text or not feedback_text.strip():
        feedback_logger.warning("Intento de enviar feedback vacío.")
        return jsonify({"error": "El mensaje de feedback no puede estar vacío."}), 400

    try:
        new_feedback = Feedback(
            message=feedback_text
        )
        db.session.add(new_feedback)
        db.session.commit()
        
        feedback_logger.info(f"Feedback guardado con ID: {new_feedback.id}")
        return jsonify({"message": "Feedback recibido y guardado exitosamente."}), 201

    except Exception as e:
        db.session.rollback()
        feedback_logger.error(f"Error al guardar feedback: {str(e)}", exc_info=True)
        return jsonify({"error": "Error interno al procesar el feedback."}), 500

