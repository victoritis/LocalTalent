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

@bp.route('/api/v1/get-roles', methods=['GET', 'OPTIONS'])
def get_roles():
    try:
        is_auth = getattr(current_user, 'is_authenticated', False)
        roles = []
        if is_auth and hasattr(current_user, 'special_roles') and current_user.special_roles:
            roles = list(current_user.special_roles or [])

        is_super = 'ROLE_SUPERADMIN' in roles
        # Fallback: si está autenticado y no es superadmin, considerar ROLE_USER True
        is_user = ('ROLE_USER' in roles) or (is_auth and not is_super)

        return jsonify({
            'ROLE_SUPERADMIN': bool(is_super),
            'ROLE_USER': bool(is_user),
        }), 200
    except Exception as e:
        logger.getChild('user').error(f"Error get-roles: {e}", exc_info=True)
        # Responder 200 con flags en false para no bloquear el frontend
        return jsonify({'ROLE_SUPERADMIN': False, 'ROLE_USER': False}), 200
