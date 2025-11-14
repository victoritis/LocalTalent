"""
Servicio de Web Push Notifications para LocalTalent
Permite enviar notificaciones push a navegadores
"""
from pywebpush import webpush, WebPushException
from flask import current_app
import json
import logging
import os

logger = logging.getLogger(__name__)

# Claves VAPID (Voluntary Application Server Identification)
# Estas deben generarse una vez y almacenarse en variables de entorno
# Para generar: python -c "from py_vapid import Vapid; vapid = Vapid(); vapid.generate_keys(); print('PUBLIC:', vapid.public_key.decode()); print('PRIVATE:', vapid.private_key.decode())"

VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY')
VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY')
VAPID_CLAIMS = {
    "sub": "mailto:notifications@localtalent.es"
}


def send_push_notification(subscription_info, notification_data):
    """
    Enviar notificación push a un suscriptor

    Args:
        subscription_info: Objeto de suscripción con endpoint, keys, etc.
        notification_data: Datos de la notificación (title, body, icon, data)

    Returns:
        bool: True si se envió correctamente, False en caso contrario
    """
    if not VAPID_PUBLIC_KEY or not VAPID_PRIVATE_KEY:
        logger.error('VAPID keys not configured')
        return False

    if not subscription_info:
        logger.warning('No subscription info provided')
        return False

    try:
        # Preparar el payload de la notificación
        payload = json.dumps(notification_data)

        # Enviar notificación push
        response = webpush(
            subscription_info=subscription_info,
            data=payload,
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims=VAPID_CLAIMS
        )

        logger.info(f'Push notification sent successfully: {response.status_code}')
        return True

    except WebPushException as e:
        logger.error(f'WebPushException: {e}')

        # Si la suscripción expiró (410 Gone), debería eliminarse de la BD
        if e.response and e.response.status_code == 410:
            logger.warning('Subscription expired, should be removed from database')

        return False

    except Exception as e:
        logger.error(f'Error sending push notification: {str(e)}')
        return False


def send_push_to_user(user, notification_data):
    """
    Enviar notificación push a un usuario específico

    Args:
        user: Objeto User con push_subscription
        notification_data: Datos de la notificación

    Returns:
        bool: True si se envió correctamente
    """
    if not user.push_subscription:
        logger.debug(f'User {user.id} has no push subscription')
        return False

    return send_push_notification(user.push_subscription, notification_data)


# ========================================
# FUNCIONES DE NOTIFICACIÓN ESPECÍFICAS
# ========================================

def send_new_message_push(user, sender_name, message_preview):
    """
    Enviar push de nuevo mensaje

    Args:
        user: Usuario destinatario
        sender_name: Nombre del remitente
        message_preview: Vista previa del mensaje
    """
    notification_data = {
        'title': f'Nuevo mensaje de {sender_name}',
        'body': message_preview[:100],
        'icon': '/static/icons/message-icon.png',
        'badge': '/static/icons/badge-icon.png',
        'data': {
            'type': 'new_message',
            'url': f'{current_app.config.get("FRONTEND_BASE_URL", "https://localtalent.es")}/messages'
        },
        'actions': [
            {
                'action': 'view',
                'title': 'Ver mensaje'
            }
        ]
    }

    return send_push_to_user(user, notification_data)


def send_profile_viewed_push(user, viewer_name):
    """
    Enviar push cuando alguien ve tu perfil

    Args:
        user: Usuario cuyo perfil fue visto
        viewer_name: Nombre de quien vio el perfil
    """
    notification_data = {
        'title': '¡Alguien vio tu perfil! 👀',
        'body': f'{viewer_name} ha visto tu perfil',
        'icon': '/static/icons/profile-icon.png',
        'badge': '/static/icons/badge-icon.png',
        'data': {
            'type': 'profile_viewed',
            'url': f'{current_app.config.get("FRONTEND_BASE_URL", "https://localtalent.es")}/profile'
        }
    }

    return send_push_to_user(user, notification_data)


def send_event_invitation_push(user, event_title, inviter_name):
    """
    Enviar push de invitación a evento

    Args:
        user: Usuario invitado
        event_title: Título del evento
        inviter_name: Nombre de quien invita
    """
    notification_data = {
        'title': f'Invitación a evento: {event_title}',
        'body': f'{inviter_name} te ha invitado a un evento',
        'icon': '/static/icons/event-icon.png',
        'badge': '/static/icons/badge-icon.png',
        'data': {
            'type': 'event_invitation',
            'url': f'{current_app.config.get("FRONTEND_BASE_URL", "https://localtalent.es")}/events'
        },
        'actions': [
            {
                'action': 'view',
                'title': 'Ver evento'
            }
        ]
    }

    return send_push_to_user(user, notification_data)


def send_project_invitation_push(user, project_title, inviter_name):
    """
    Enviar push de invitación a proyecto

    Args:
        user: Usuario invitado
        project_title: Título del proyecto
        inviter_name: Nombre de quien invita
    """
    notification_data = {
        'title': f'Invitación a proyecto: {project_title}',
        'body': f'{inviter_name} te ha invitado a colaborar',
        'icon': '/static/icons/project-icon.png',
        'badge': '/static/icons/badge-icon.png',
        'data': {
            'type': 'project_invitation',
            'url': f'{current_app.config.get("FRONTEND_BASE_URL", "https://localtalent.es")}/projects'
        }
    }

    return send_push_to_user(user, notification_data)


def send_new_review_push(user, reviewer_name, rating):
    """
    Enviar push de nueva valoración

    Args:
        user: Usuario valorado
        reviewer_name: Nombre de quien hizo la review
        rating: Puntuación (1-5)
    """
    stars = '⭐' * rating

    notification_data = {
        'title': f'Nueva valoración {stars}',
        'body': f'{reviewer_name} te ha valorado con {rating} estrellas',
        'icon': '/static/icons/star-icon.png',
        'badge': '/static/icons/badge-icon.png',
        'data': {
            'type': 'new_review',
            'url': f'{current_app.config.get("FRONTEND_BASE_URL", "https://localtalent.es")}/profile'
        }
    }

    return send_push_to_user(user, notification_data)


def send_event_reminder_push(user, event_title, hours_until_event):
    """
    Enviar push de recordatorio de evento

    Args:
        user: Usuario asistente
        event_title: Título del evento
        hours_until_event: Horas hasta el evento
    """
    notification_data = {
        'title': f'Recordatorio: {event_title}',
        'body': f'El evento comienza en {hours_until_event} horas',
        'icon': '/static/icons/reminder-icon.png',
        'badge': '/static/icons/badge-icon.png',
        'data': {
            'type': 'event_reminder',
            'url': f'{current_app.config.get("FRONTEND_BASE_URL", "https://localtalent.es")}/events'
        },
        'requireInteraction': True
    }

    return send_push_to_user(user, notification_data)


def send_new_users_in_city_push(user, city, count):
    """
    Enviar push de nuevos usuarios en la ciudad

    Args:
        user: Usuario a notificar
        city: Ciudad
        count: Cantidad de nuevos usuarios
    """
    notification_data = {
        'title': f'Nuevos talentos en {city} 🎉',
        'body': f'{count} nuevo(s) usuario(s) se han unido en tu ciudad',
        'icon': '/static/icons/community-icon.png',
        'badge': '/static/icons/badge-icon.png',
        'data': {
            'type': 'new_users_in_city',
            'url': f'{current_app.config.get("FRONTEND_BASE_URL", "https://localtalent.es")}/search?city={city}'
        }
    }

    return send_push_to_user(user, notification_data)
