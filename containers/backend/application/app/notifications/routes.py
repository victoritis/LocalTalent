from flask import jsonify, request
from flask_login import current_user, login_required
from app.notifications import bp
from app.logger_config import logger
from app import db
from app.models import Notification, User
from datetime import datetime, timezone


@bp.route('/api/v1/notifications', methods=['GET'])
@login_required
def get_notifications():
    """Obtener notificaciones del usuario autenticado"""
    try:
        # Parámetros de paginación
        limit = request.args.get('limit', 20, type=int)
        offset = request.args.get('offset', 0, type=int)
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'

        # Query base
        query = Notification.query.filter_by(
            user_id=current_user.id,
            deletedAt=None
        )

        # Filtrar solo no leídas si se solicita
        if unread_only:
            query = query.filter_by(is_read=False)

        # Ordenar por fecha de creación (más recientes primero)
        query = query.order_by(Notification.createdAt.desc())

        # Paginación
        total = query.count()
        notifications = query.limit(limit).offset(offset).all()

        notifications_data = []
        for notif in notifications:
            notifications_data.append({
                'id': notif.id,
                'type': notif.type,
                'title': notif.title,
                'message': notif.message,
                'link': notif.link,
                'is_read': notif.is_read,
                'read_at': notif.read_at.isoformat() if notif.read_at else None,
                'data': notif.data,
                'created_at': notif.createdAt.isoformat() if notif.createdAt else None
            })

        return jsonify({
            'notifications': notifications_data,
            'total': total,
            'unread_count': Notification.query.filter_by(
                user_id=current_user.id,
                is_read=False,
                deletedAt=None
            ).count()
        }), 200
    except Exception as e:
        logger.getChild('notifications').error(f"Error obteniendo notificaciones: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/notifications/unread-count', methods=['GET'])
@login_required
def get_unread_count():
    """Obtener contador de notificaciones no leídas"""
    try:
        count = Notification.query.filter_by(
            user_id=current_user.id,
            is_read=False,
            deletedAt=None
        ).count()

        return jsonify({'unread_count': count}), 200
    except Exception as e:
        logger.getChild('notifications').error(f"Error obteniendo contador: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/notifications/<int:notification_id>/mark-read', methods=['POST'])
@login_required
def mark_notification_as_read(notification_id):
    """Marcar una notificación como leída"""
    try:
        notification = Notification.query.filter_by(
            id=notification_id,
            user_id=current_user.id,
            deletedAt=None
        ).first()

        if not notification:
            return jsonify({'error': 'Notificación no encontrada'}), 404

        notification.is_read = True
        notification.read_at = datetime.now(timezone.utc)
        db.session.commit()

        return jsonify({'message': 'Notificación marcada como leída'}), 200
    except Exception as e:
        db.session.rollback()
        logger.getChild('notifications').error(f"Error marcando notificación: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/notifications/mark-all-read', methods=['POST'])
@login_required
def mark_all_as_read():
    """Marcar todas las notificaciones como leídas"""
    try:
        Notification.query.filter_by(
            user_id=current_user.id,
            is_read=False,
            deletedAt=None
        ).update({
            'is_read': True,
            'read_at': datetime.now(timezone.utc)
        })

        db.session.commit()

        return jsonify({'message': 'Todas las notificaciones marcadas como leídas'}), 200
    except Exception as e:
        db.session.rollback()
        logger.getChild('notifications').error(f"Error marcando todas: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/notifications/<int:notification_id>', methods=['DELETE'])
@login_required
def delete_notification(notification_id):
    """Eliminar una notificación (soft delete)"""
    try:
        notification = Notification.query.filter_by(
            id=notification_id,
            user_id=current_user.id,
            deletedAt=None
        ).first()

        if not notification:
            return jsonify({'error': 'Notificación no encontrada'}), 404

        notification.deletedAt = datetime.now(timezone.utc)
        db.session.commit()

        return jsonify({'message': 'Notificación eliminada'}), 200
    except Exception as e:
        db.session.rollback()
        logger.getChild('notifications').error(f"Error eliminando notificación: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


# Función auxiliar para crear notificaciones (usar en otras partes del código)
def create_notification(user_id, notification_type, title, message=None, link=None, data=None):
    """
    Crear una nueva notificación para un usuario

    Args:
        user_id: ID del usuario que recibirá la notificación
        notification_type: Tipo de notificación ('message', 'profile_view', 'new_user', etc.)
        title: Título de la notificación
        message: Mensaje descriptivo (opcional)
        link: URL para navegar al contenido (opcional)
        data: Datos adicionales en formato dict (opcional)
    """
    try:
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            link=link,
            data=data,
            is_read=False
        )

        db.session.add(notification)
        db.session.commit()

        logger.getChild('notifications').info(f"Notificación creada para usuario {user_id}: {title}")
        return notification
    except Exception as e:
        db.session.rollback()
        logger.getChild('notifications').error(f"Error creando notificación: {str(e)}", exc_info=True)
        return None
