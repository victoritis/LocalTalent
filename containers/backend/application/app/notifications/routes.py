from flask import jsonify, request
from flask_login import current_user, login_required
from app.notifications import bp
from app.logger_config import logger
from app import db
from app.models import Notification, User
from datetime import datetime, timezone
import os


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


# ========================================
# WEB PUSH NOTIFICATIONS
# ========================================

@bp.route('/api/v1/notifications/push/public-key', methods=['GET'])
def get_vapid_public_key():
    """Obtener clave pública VAPID para suscripción a push notifications"""
    try:
        public_key = os.environ.get('VAPID_PUBLIC_KEY')

        if not public_key:
            logger.getChild('notifications').error("VAPID_PUBLIC_KEY no configurada")
            return jsonify({'error': 'Push notifications no disponibles'}), 503

        return jsonify({'public_key': public_key}), 200
    except Exception as e:
        logger.getChild('notifications').error(f"Error obteniendo VAPID key: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/notifications/push/subscribe', methods=['POST'])
@login_required
def subscribe_to_push():
    """Suscribirse a web push notifications"""
    try:
        data = request.get_json()

        if not data or 'subscription' not in data:
            return jsonify({'error': 'Datos de suscripción requeridos'}), 400

        subscription = data['subscription']

        # Validar estructura de la suscripción
        if not all(key in subscription for key in ['endpoint', 'keys']):
            return jsonify({'error': 'Suscripción inválida'}), 400

        # Guardar suscripción en el usuario
        current_user.push_subscription = subscription
        db.session.commit()

        logger.getChild('notifications').info(f"Usuario {current_user.id} suscrito a push notifications")

        return jsonify({'message': 'Suscrito correctamente a notificaciones push'}), 200
    except Exception as e:
        db.session.rollback()
        logger.getChild('notifications').error(f"Error suscribiendo a push: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/notifications/push/unsubscribe', methods=['POST'])
@login_required
def unsubscribe_from_push():
    """Cancelar suscripción a web push notifications"""
    try:
        current_user.push_subscription = None
        db.session.commit()

        logger.getChild('notifications').info(f"Usuario {current_user.id} canceló suscripción a push notifications")

        return jsonify({'message': 'Suscripción cancelada'}), 200
    except Exception as e:
        db.session.rollback()
        logger.getChild('notifications').error(f"Error cancelando suscripción: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/notifications/push/status', methods=['GET'])
@login_required
def get_push_subscription_status():
    """Obtener estado de suscripción a push notifications"""
    try:
        is_subscribed = current_user.push_subscription is not None

        return jsonify({
            'is_subscribed': is_subscribed,
            'subscription': current_user.push_subscription if is_subscribed else None
        }), 200
    except Exception as e:
        logger.getChild('notifications').error(f"Error obteniendo estado de push: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


# ========================================
# PREFERENCIAS DE NOTIFICACIONES
# ========================================

@bp.route('/api/v1/notifications/preferences', methods=['GET'])
@login_required
def get_notification_preferences():
    """Obtener preferencias de notificaciones del usuario"""
    try:
        return jsonify({
            'email_notifications': current_user.email_notifications,
            'push_notifications': current_user.push_subscription is not None
        }), 200
    except Exception as e:
        logger.getChild('notifications').error(f"Error obteniendo preferencias: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/notifications/preferences', methods=['PUT'])
@login_required
def update_notification_preferences():
    """Actualizar preferencias de notificaciones"""
    try:
        data = request.get_json()

        if 'email_notifications' in data:
            current_user.email_notifications = bool(data['email_notifications'])

        db.session.commit()

        return jsonify({
            'message': 'Preferencias actualizadas',
            'email_notifications': current_user.email_notifications
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.getChild('notifications').error(f"Error actualizando preferencias: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


# ========================================
# FUNCIÓN AUXILIAR
# ========================================

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
