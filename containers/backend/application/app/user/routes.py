from flask import jsonify
from flask_login import current_user, login_required
from app.user import bp
from app.logger_config import logger

# Minimal user blueprint: only session info retained

@bp.route('/api/v1/auth/session', methods=['GET'])
@login_required
def session_info():
    try:
        user = current_user
        username = user.email.split('@')[0] if user and user.email else None
        return jsonify({
            'user_id': user.id,
            'email': user.email,
            'username': username,
            'roles': user.special_roles or []
        }), 200
    except Exception as e:
        logger.getChild('user').error(f"Error obteniendo sesión: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500

