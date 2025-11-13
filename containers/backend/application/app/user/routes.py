from flask import jsonify, request
from flask_login import current_user, login_required
from app.user import bp
from app.logger_config import logger
from app import db
from app.models import User, Portfolio
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
            'category': user.category,
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
        if 'category' in data:
            user.category = data['category']
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
                'category': user.category,
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
            'category': user.category,
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
        # Obtener parámetro de filtro por categoría
        category_filter = request.args.get('category', None)

        # Base query: Solo usuarios con ubicación definida
        query = User.query.filter(
            User.is_enabled == True,
            User.deletedAt.is_(None),
            User.latitude.isnot(None),
            User.longitude.isnot(None)
        )

        # Aplicar filtro de categoría si existe
        if category_filter:
            query = query.filter(User.category == category_filter)

        users = query.all()

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
                'skills': user.skills or [],
                'category': user.category
            })

        return jsonify({
            'users': users_data,
            'total': len(users_data)
        }), 200
    except Exception as e:
        logger.getChild('user').error(f"Error obteniendo usuarios para mapa: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/categories', methods=['GET'])
def get_categories():
    """Obtener lista de categorías de talento disponibles"""
    try:
        categories = [
            {'value': 'musician', 'label': 'Músico'},
            {'value': 'artist', 'label': 'Artista'},
            {'value': 'developer', 'label': 'Desarrollador'},
            {'value': 'designer', 'label': 'Diseñador'},
            {'value': 'photographer', 'label': 'Fotógrafo'},
            {'value': 'writer', 'label': 'Escritor'},
            {'value': 'chef', 'label': 'Chef'},
            {'value': 'athlete', 'label': 'Atleta'},
            {'value': 'teacher', 'label': 'Profesor'},
            {'value': 'other', 'label': 'Otro'}
        ]
        return jsonify({'categories': categories}), 200
    except Exception as e:
        logger.getChild('user').error(f"Error obteniendo categorías: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


# === PORTFOLIO ENDPOINTS ===

@bp.route('/api/v1/portfolio', methods=['GET'])
@login_required
def get_my_portfolio():
    """Obtener portfolio del usuario autenticado"""
    try:
        items = Portfolio.query.filter_by(
            user_id=current_user.id,
            deletedAt=None
        ).order_by(Portfolio.order, Portfolio.createdAt.desc()).all()

        items_data = []
        for item in items:
            items_data.append({
                'id': item.id,
                'title': item.title,
                'description': item.description,
                'media_type': item.media_type,
                'media_url': item.media_url,
                'thumbnail_url': item.thumbnail_url,
                'order': item.order,
                'created_at': item.createdAt.isoformat() if item.createdAt else None
            })

        return jsonify({'items': items_data}), 200
    except Exception as e:
        logger.getChild('user').error(f"Error obteniendo portfolio: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/portfolio/<username>', methods=['GET'])
def get_user_portfolio(username):
    """Obtener portfolio público de un usuario"""
    try:
        user = User.query.filter(
            User.email.like(f"{username}@%"),
            User.is_enabled == True,
            User.deletedAt.is_(None)
        ).first()

        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404

        items = Portfolio.query.filter_by(
            user_id=user.id,
            deletedAt=None
        ).order_by(Portfolio.order, Portfolio.createdAt.desc()).all()

        items_data = []
        for item in items:
            items_data.append({
                'id': item.id,
                'title': item.title,
                'description': item.description,
                'media_type': item.media_type,
                'media_url': item.media_url,
                'thumbnail_url': item.thumbnail_url,
                'order': item.order,
                'created_at': item.createdAt.isoformat() if item.createdAt else None
            })

        return jsonify({'items': items_data}), 200
    except Exception as e:
        logger.getChild('user').error(f"Error obteniendo portfolio público: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/portfolio', methods=['POST'])
@login_required
def create_portfolio_item():
    """Crear nuevo item de portfolio"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No se proporcionó ningún archivo'}), 400

        file = request.files['file']
        title = request.form.get('title', '')
        description = request.form.get('description', '')
        order = request.form.get('order', 0)

        if file.filename == '':
            return jsonify({'error': 'No se seleccionó ningún archivo'}), 400

        if not title:
            return jsonify({'error': 'El título es obligatorio'}), 400

        # Validar tipo de archivo
        allowed_image_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        allowed_video_extensions = {'mp4', 'webm', 'mov', 'avi'}
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''

        media_type = None
        if file_ext in allowed_image_extensions:
            media_type = 'image'
        elif file_ext in allowed_video_extensions:
            media_type = 'video'
        else:
            return jsonify({'error': 'Tipo de archivo no permitido'}), 400

        # Crear nombre de archivo seguro
        filename = secure_filename(f"portfolio_{current_user.id}_{int(os.urandom(4).hex(), 16)}.{file_ext}")

        # Directorio de uploads
        upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'static', 'uploads', 'portfolio')
        os.makedirs(upload_dir, exist_ok=True)

        file_path = os.path.join(upload_dir, filename)
        file.save(file_path)

        # Crear registro en BD
        portfolio_item = Portfolio(
            user_id=current_user.id,
            title=title,
            description=description,
            media_type=media_type,
            media_url=f'/static/uploads/portfolio/{filename}',
            order=int(order)
        )

        db.session.add(portfolio_item)
        db.session.commit()

        return jsonify({
            'message': 'Item creado correctamente',
            'item': {
                'id': portfolio_item.id,
                'title': portfolio_item.title,
                'description': portfolio_item.description,
                'media_type': portfolio_item.media_type,
                'media_url': portfolio_item.media_url,
                'order': portfolio_item.order
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.getChild('user').error(f"Error creando item de portfolio: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error al crear item'}), 500


@bp.route('/api/v1/portfolio/<int:item_id>', methods=['PUT'])
@login_required
def update_portfolio_item(item_id):
    """Actualizar item de portfolio"""
    try:
        item = Portfolio.query.filter_by(
            id=item_id,
            user_id=current_user.id,
            deletedAt=None
        ).first()

        if not item:
            return jsonify({'error': 'Item no encontrado'}), 404

        data = request.get_json()

        if 'title' in data:
            item.title = data['title']
        if 'description' in data:
            item.description = data['description']
        if 'order' in data:
            item.order = int(data['order'])

        db.session.commit()

        return jsonify({
            'message': 'Item actualizado correctamente',
            'item': {
                'id': item.id,
                'title': item.title,
                'description': item.description,
                'media_type': item.media_type,
                'media_url': item.media_url,
                'order': item.order
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.getChild('user').error(f"Error actualizando item: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error al actualizar item'}), 500


@bp.route('/api/v1/portfolio/<int:item_id>', methods=['DELETE'])
@login_required
def delete_portfolio_item(item_id):
    """Eliminar item de portfolio (soft delete)"""
    try:
        from datetime import datetime, timezone
        item = Portfolio.query.filter_by(
            id=item_id,
            user_id=current_user.id,
            deletedAt=None
        ).first()

        if not item:
            return jsonify({'error': 'Item no encontrado'}), 404

        # Soft delete
        item.deletedAt = datetime.now(timezone.utc)
        db.session.commit()

        return jsonify({'message': 'Item eliminado correctamente'}), 200
    except Exception as e:
        db.session.rollback()
        logger.getChild('user').error(f"Error eliminando item: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error al eliminar item'}), 500
