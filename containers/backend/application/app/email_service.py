"""
Servicio de notificaciones por email para LocalTalent
Incluye templates y funciones para enviar diferentes tipos de emails
"""
from flask import current_app, render_template_string
from flask_mail import Message
from app import mail
from threading import Thread
import logging

logger = logging.getLogger(__name__)


def send_async_email(app, msg):
    """Enviar email de forma asíncrona"""
    with app.app_context():
        try:
            mail.send(msg)
            logger.info(f'Email enviado a {msg.recipients[0]}')
        except Exception as e:
            logger.error(f'Error al enviar email: {str(e)}')


def send_email(subject, recipient, html_body, text_body=None):
    """
    Enviar email genérico

    Args:
        subject: Asunto del email
        recipient: Email del destinatario
        html_body: Contenido HTML del email
        text_body: Contenido de texto plano (opcional)
    """
    try:
        msg = Message(
            subject=subject,
            recipients=[recipient],
            html=html_body,
            body=text_body or ''
        )

        # Enviar de forma asíncrona en un thread
        Thread(target=send_async_email, args=(current_app._get_current_object(), msg)).start()
        return True
    except Exception as e:
        logger.error(f'Error al preparar email: {str(e)}')
        return False


# ========================================
# TEMPLATES DE EMAIL
# ========================================

EMAIL_BASE_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }
        .content {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 0 0 10px 10px;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            padding: 20px;
            color: #888;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🌟 LocalTalent</h1>
    </div>
    <div class="content">
        {{ content }}
    </div>
    <div class="footer">
        <p>Este es un email automático de LocalTalent</p>
        <p>Si no deseas recibir estos emails, puedes desactivarlos en tu configuración</p>
    </div>
</body>
</html>
"""


def send_profile_viewed_email(user_email, user_name, viewer_name, viewer_username, viewer_profile_url):
    """
    Notificar cuando alguien ve tu perfil

    Args:
        user_email: Email del usuario cuyo perfil fue visto
        user_name: Nombre del usuario
        viewer_name: Nombre de quien vio el perfil
        viewer_username: Username de quien vio el perfil
        viewer_profile_url: URL al perfil del viewer
    """
    content = f"""
        <h2>¡Hola {user_name}! 👋</h2>
        <p><strong>{viewer_name}</strong> (@{viewer_username}) ha visto tu perfil.</p>
        <p>Esta podría ser una buena oportunidad para conectar y ver si tienen intereses en común.</p>
        <a href="{viewer_profile_url}" class="button">Ver perfil de {viewer_name}</a>
    """

    html_body = render_template_string(EMAIL_BASE_TEMPLATE, content=content)

    return send_email(
        subject=f'{viewer_name} ha visto tu perfil en LocalTalent',
        recipient=user_email,
        html_body=html_body,
        text_body=f'{viewer_name} (@{viewer_username}) ha visto tu perfil en LocalTalent. Visita {viewer_profile_url}'
    )


def send_new_users_in_city_email(user_email, user_name, city, new_users_count, search_url):
    """
    Alertar sobre nuevos usuarios en la ciudad

    Args:
        user_email: Email del usuario
        user_name: Nombre del usuario
        city: Ciudad
        new_users_count: Cantidad de nuevos usuarios
        search_url: URL de búsqueda con filtro de ciudad
    """
    content = f"""
        <h2>¡Nuevos talentos en {city}! 🎉</h2>
        <p>Hola {user_name},</p>
        <p>Hay <strong>{new_users_count} nuevo(s) usuario(s)</strong> en {city} que acaban de unirse a LocalTalent.</p>
        <p>Explora sus perfiles y descubre nuevas oportunidades de colaboración cerca de ti.</p>
        <a href="{search_url}" class="button">Ver nuevos usuarios</a>
    """

    html_body = render_template_string(EMAIL_BASE_TEMPLATE, content=content)

    return send_email(
        subject=f'Nuevos talentos en {city} - LocalTalent',
        recipient=user_email,
        html_body=html_body,
        text_body=f'Hay {new_users_count} nuevo(s) usuario(s) en {city}. Visita {search_url}'
    )


def send_new_message_email(user_email, user_name, sender_name, sender_username, message_preview, conversation_url):
    """
    Notificar sobre nuevo mensaje

    Args:
        user_email: Email del destinatario
        user_name: Nombre del destinatario
        sender_name: Nombre del remitente
        sender_username: Username del remitente
        message_preview: Vista previa del mensaje (primeros 100 caracteres)
        conversation_url: URL a la conversación
    """
    content = f"""
        <h2>Nuevo mensaje de {sender_name} 💬</h2>
        <p>Hola {user_name},</p>
        <p><strong>{sender_name}</strong> (@{sender_username}) te ha enviado un mensaje:</p>
        <blockquote style="border-left: 4px solid #667eea; padding-left: 15px; color: #555;">
            "{message_preview}..."
        </blockquote>
        <a href="{conversation_url}" class="button">Ver conversación</a>
    """

    html_body = render_template_string(EMAIL_BASE_TEMPLATE, content=content)

    return send_email(
        subject=f'Nuevo mensaje de {sender_name} - LocalTalent',
        recipient=user_email,
        html_body=html_body,
        text_body=f'{sender_name} te ha enviado un mensaje: "{message_preview}..." Visita {conversation_url}'
    )


def send_event_invitation_email(user_email, user_name, event_title, inviter_name, event_date, event_url):
    """
    Notificar sobre invitación a evento

    Args:
        user_email: Email del invitado
        user_name: Nombre del invitado
        event_title: Título del evento
        inviter_name: Nombre de quien invita
        event_date: Fecha del evento
        event_url: URL al evento
    """
    content = f"""
        <h2>Invitación a evento 🎊</h2>
        <p>Hola {user_name},</p>
        <p><strong>{inviter_name}</strong> te ha invitado al evento:</p>
        <h3 style="color: #667eea;">{event_title}</h3>
        <p>📅 <strong>Fecha:</strong> {event_date}</p>
        <a href="{event_url}" class="button">Ver detalles del evento</a>
    """

    html_body = render_template_string(EMAIL_BASE_TEMPLATE, content=content)

    return send_email(
        subject=f'Invitación a {event_title} - LocalTalent',
        recipient=user_email,
        html_body=html_body,
        text_body=f'{inviter_name} te ha invitado al evento "{event_title}" el {event_date}. Visita {event_url}'
    )


def send_project_invitation_email(user_email, user_name, project_title, inviter_name, project_description, project_url):
    """
    Notificar sobre invitación a proyecto

    Args:
        user_email: Email del invitado
        user_name: Nombre del invitado
        project_title: Título del proyecto
        inviter_name: Nombre de quien invita
        project_description: Descripción del proyecto
        project_url: URL al proyecto
    """
    content = f"""
        <h2>Invitación a proyecto colaborativo 🚀</h2>
        <p>Hola {user_name},</p>
        <p><strong>{inviter_name}</strong> te ha invitado a unirte al proyecto:</p>
        <h3 style="color: #667eea;">{project_title}</h3>
        <p>{project_description}</p>
        <a href="{project_url}" class="button">Ver detalles del proyecto</a>
    """

    html_body = render_template_string(EMAIL_BASE_TEMPLATE, content=content)

    return send_email(
        subject=f'Invitación al proyecto {project_title} - LocalTalent',
        recipient=user_email,
        html_body=html_body,
        text_body=f'{inviter_name} te ha invitado al proyecto "{project_title}". {project_description}. Visita {project_url}'
    )


def send_new_review_email(user_email, user_name, reviewer_name, rating, comment, profile_url):
    """
    Notificar sobre nueva valoración recibida

    Args:
        user_email: Email del usuario valorado
        user_name: Nombre del usuario valorado
        reviewer_name: Nombre de quien hizo la review
        rating: Puntuación (1-5)
        comment: Comentario de la review
        profile_url: URL al perfil del usuario
    """
    stars = '⭐' * rating

    content = f"""
        <h2>Nueva valoración recibida {stars}</h2>
        <p>Hola {user_name},</p>
        <p><strong>{reviewer_name}</strong> te ha dejado una valoración:</p>
        <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p style="font-size: 24px; margin: 0;">{stars}</p>
            <p style="color: #555; margin-top: 10px;">"{comment}"</p>
        </div>
        <a href="{profile_url}" class="button">Ver tu perfil</a>
    """

    html_body = render_template_string(EMAIL_BASE_TEMPLATE, content=content)

    return send_email(
        subject=f'{reviewer_name} te ha valorado con {rating} estrellas - LocalTalent',
        recipient=user_email,
        html_body=html_body,
        text_body=f'{reviewer_name} te ha valorado con {rating} estrellas: "{comment}". Visita {profile_url}'
    )


def send_event_reminder_email(user_email, user_name, event_title, event_date, event_location, event_url):
    """
    Recordatorio de evento próximo

    Args:
        user_email: Email del asistente
        user_name: Nombre del asistente
        event_title: Título del evento
        event_date: Fecha del evento
        event_location: Ubicación del evento
        event_url: URL al evento
    """
    content = f"""
        <h2>Recordatorio de evento ⏰</h2>
        <p>Hola {user_name},</p>
        <p>Te recordamos que tienes un evento próximo:</p>
        <h3 style="color: #667eea;">{event_title}</h3>
        <p>📅 <strong>Fecha:</strong> {event_date}</p>
        <p>📍 <strong>Ubicación:</strong> {event_location}</p>
        <a href="{event_url}" class="button">Ver detalles</a>
    """

    html_body = render_template_string(EMAIL_BASE_TEMPLATE, content=content)

    return send_email(
        subject=f'Recordatorio: {event_title} - LocalTalent',
        recipient=user_email,
        html_body=html_body,
        text_body=f'Recordatorio: "{event_title}" el {event_date} en {event_location}. Visita {event_url}'
    )


def send_weekly_digest_email(user_email, user_name, stats):
    """
    Digest semanal con actividad del usuario

    Args:
        user_email: Email del usuario
        user_name: Nombre del usuario
        stats: Diccionario con estadísticas (profile_views, new_messages, new_events, new_users_in_city)
    """
    content = f"""
        <h2>Tu resumen semanal en LocalTalent 📊</h2>
        <p>Hola {user_name},</p>
        <p>Aquí está tu actividad de la semana:</p>
        <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p>👁️ <strong>{stats.get('profile_views', 0)}</strong> visitas a tu perfil</p>
            <p>💬 <strong>{stats.get('new_messages', 0)}</strong> nuevos mensajes</p>
            <p>🎉 <strong>{stats.get('new_events', 0)}</strong> nuevos eventos en tu área</p>
            <p>👥 <strong>{stats.get('new_users_in_city', 0)}</strong> nuevos usuarios en tu ciudad</p>
        </div>
        <a href="{current_app.config.get('FRONTEND_BASE_URL', 'https://localtalent.es')}" class="button">Ir a LocalTalent</a>
    """

    html_body = render_template_string(EMAIL_BASE_TEMPLATE, content=content)

    return send_email(
        subject='Tu resumen semanal en LocalTalent',
        recipient=user_email,
        html_body=html_body,
        text_body=f'Tu resumen semanal: {stats.get("profile_views", 0)} visitas, {stats.get("new_messages", 0)} mensajes, {stats.get("new_events", 0)} eventos, {stats.get("new_users_in_city", 0)} nuevos usuarios.'
    )
