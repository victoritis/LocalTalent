from flask import jsonify, request
from flask_login import current_user, login_required
from app.user import bp
from app.logger_config import logger
from app import db
from app.models import User
import os
from werkzeug.utils import secure_filename

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


# === PROFILE ENDPOINTS ===

@bp.route('/api/v1/profile/me', methods=['GET'])
@login_required
def get_my_profile():
    """Obtener el perfil completo del usuario autenticado (vista privada)"""
    try:
        user = current_user
        username = user.email.split('@')[0] if user.email else None

        return jsonify({
            'id': user.id,
            'email': user.email,
            'username': username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'profile_image': user.profile_image,
            'bio': user.bio,
            'skills': user.skills or [],
            'address': user.address,
            'city': user.city,
            'country': user.country,
            'latitude': user.latitude,
            'longitude': user.longitude,
            'roles': user.special_roles or [],
            'created_at': user.createdAt.isoformat() if user.createdAt else None
        }), 200
    except Exception as e:
        logger.getChild('user').error(f"Error obteniendo perfil: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/profile/me', methods=['PUT'])
@login_required
def update_my_profile():
    """Actualizar el perfil del usuario autenticado"""
    try:
        user = current_user
        data = request.get_json()

        # Campos que se pueden actualizar
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'bio' in data:
            user.bio = data['bio']
        if 'skills' in data:
            user.skills = data['skills'] if isinstance(data['skills'], list) else []
        if 'address' in data:
            user.address = data['address']
        if 'city' in data:
            user.city = data['city']
        if 'country' in data:
            user.country = data['country']
        if 'latitude' in data:
            user.latitude = float(data['latitude']) if data['latitude'] else None
        if 'longitude' in data:
            user.longitude = float(data['longitude']) if data['longitude'] else None

        db.session.commit()

        username = user.email.split('@')[0] if user.email else None

        return jsonify({
            'message': 'Perfil actualizado correctamente',
            'profile': {
                'id': user.id,
                'email': user.email,
                'username': username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'profile_image': user.profile_image,
                'bio': user.bio,
                'skills': user.skills or [],
                'address': user.address,
                'city': user.city,
                'country': user.country,
                'latitude': user.latitude,
                'longitude': user.longitude
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.getChild('user').error(f"Error actualizando perfil: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error al actualizar el perfil'}), 500


@bp.route('/api/v1/profile/<username>', methods=['GET'])
def get_public_profile(username):
    """Obtener el perfil público de un usuario por su username (vista pública)"""
    try:
        # Buscar usuario por email que comience con el username
        user = User.query.filter(
            User.email.like(f"{username}@%"),
            User.is_enabled == True,
            User.deletedAt.is_(None)
        ).first()

        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404

        # Solo devolver información pública
        return jsonify({
            'username': username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'profile_image': user.profile_image,
            'bio': user.bio,
            'skills': user.skills or [],
            'city': user.city,
            'country': user.country,
            'created_at': user.createdAt.isoformat() if user.createdAt else None
        }), 200
    except Exception as e:
        logger.getChild('user').error(f"Error obteniendo perfil público: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/profile/upload-image', methods=['POST'])
@login_required
def upload_profile_image():
    """Subir imagen de perfil"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No se proporcionó ninguna imagen'}), 400

        file = request.files['image']

        if file.filename == '':
            return jsonify({'error': 'No se seleccionó ningún archivo'}), 400

        # Validar extensión
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''

        if file_ext not in allowed_extensions:
            return jsonify({'error': 'Tipo de archivo no permitido. Use PNG, JPG, JPEG, GIF o WEBP'}), 400

        # Crear nombre de archivo seguro
        filename = secure_filename(f"user_{current_user.id}_{int(os.urandom(4).hex(), 16)}.{file_ext}")

        # Directorio de uploads (ajustar según tu configuración)
        upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'static', 'uploads', 'profiles')
        os.makedirs(upload_dir, exist_ok=True)

        file_path = os.path.join(upload_dir, filename)
        file.save(file_path)

        # Actualizar usuario con la ruta relativa
        current_user.profile_image = f'/static/uploads/profiles/{filename}'
        db.session.commit()

        return jsonify({
            'message': 'Imagen subida correctamente',
            'profile_image': current_user.profile_image
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.getChild('user').error(f"Error subiendo imagen: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error al subir la imagen'}), 500


@bp.route('/api/v1/users/map', methods=['GET'])
def get_users_for_map():
    """Obtener todos los usuarios con ubicación para el mapa global"""
    try:
        # Solo usuarios con ubicación definida
        users = User.query.filter(
            User.is_enabled == True,
            User.deletedAt.is_(None),
            User.latitude.isnot(None),
            User.longitude.isnot(None)
        ).all()

        users_data = []
        for user in users:
            username = user.email.split('@')[0] if user.email else None
            users_data.append({
                'id': user.id,
                'username': username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'profile_image': user.profile_image,
                'city': user.city,
                'country': user.country,
                'latitude': user.latitude,
                'longitude': user.longitude,
                'skills': user.skills or []
            })

        return jsonify({
            'users': users_data,
            'total': len(users_data)
        }), 200
    except Exception as e:
        logger.getChild('user').error(f"Error obteniendo usuarios para mapa: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500
