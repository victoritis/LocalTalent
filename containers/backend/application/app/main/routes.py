from flask import jsonify, request
from flask_login import login_required, current_user

from app.main import bp
from app import db
from app.models import Feedback
from app.logger_config import logger


@bp.route('/healthcheck', methods=['GET'])
def healthcheck():
    """Endpoint de verificación de salud del servicio."""
    return jsonify({"status": "OK"}), 200


@bp.route('/api/v1/submit-feedback', methods=['POST'])
@login_required
def submit_feedback():
    """Recibe y guarda el feedback enviado por los usuarios."""
    if "ROLE_SUPERADMIN" not in current_user.special_roles:
        logger.getChild('main.feedback').warning(
            f"Intento no autorizado de modificar feedback por usuario {current_user.id} ({current_user.email})."
        )
        return jsonify({"error": "Acceso denegado. Se requiere rol de superadministrador."}), 403

    data = request.get_json() or {}
    feedback_text = data.get('feedback_text')

    feedback_logger = logger.getChild('main.feedback')

    if not feedback_text or not feedback_text.strip():
        feedback_logger.warning("Intento de enviar feedback vacío.")
        return jsonify({"error": "El mensaje de feedback no puede estar vacío."}), 400

    try:
        new_feedback = Feedback(message=feedback_text)
        db.session.add(new_feedback)
        db.session.commit()
        feedback_logger.info(f"Feedback guardado con ID: {new_feedback.id}")
        return jsonify({"message": "Feedback recibido y guardado exitosamente."}), 201
    except Exception as e:
        db.session.rollback()
        feedback_logger.error(f"Error al guardar feedback: {str(e)}", exc_info=True)
        return jsonify({"error": "Error interno al procesar el feedback."}), 500

