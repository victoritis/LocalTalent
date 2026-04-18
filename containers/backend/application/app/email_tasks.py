"""
Tareas de Celery para envío de emails y notificaciones periódicas
"""
from app import create_app, db
from app.models import User, Notification, Message, Conversation, Event, EventRSVP, ProfileView
from app.email_service import (
    send_new_users_in_city_email,
    send_event_reminder_email,
    send_weekly_digest_email
)
from datetime import datetime, timedelta
from sqlalchemy import and_, func, or_
import logging

logger = logging.getLogger(__name__)

# Crear contexto de la app para las tareas
app = create_app()
celery = app.celery


@celery.task(name='email_tasks.send_new_users_alerts')
def send_new_users_alerts():
    """
    Tarea periódica: Enviar alertas de nuevos usuarios en la ciudad
    Se ejecuta diariamente
    """
    with app.app_context():
        try:
            users = User.query.filter(
                User.deletedAt.is_(None),
                User.email_notifications == True,
                User.city.isnot(None)
            ).all()

            for user in users:
                city = user.city
                if not city:
                    continue

                yesterday = datetime.utcnow() - timedelta(days=1)
                new_users = User.query.filter(
                    User.deletedAt.is_(None),
                    User.id != user.id,
                    User.city.ilike(f'%{city}%'),
                    User.createdAt >= yesterday
                ).count()

                if new_users > 0:
                    frontend_url = app.config.get('FRONTEND_BASE_URL', 'https://localtalent.es')
                    search_url = f"{frontend_url}/search?city={city}"

                    send_new_users_in_city_email(
                        user_email=user.email,
                        user_name=f"{user.first_name} {user.last_name}",
                        city=city,
                        new_users_count=new_users,
                        search_url=search_url
                    )

                    logger.info(f'Email de nuevos usuarios enviado a {user.email}')

            return 'Alertas enviadas a usuarios activos'

        except Exception as e:
            logger.error(f'Error en send_new_users_alerts: {str(e)}')
            return f'Error: {str(e)}'


@celery.task(name='email_tasks.send_event_reminders')
def send_event_reminders():
    """
    Tarea periódica: Enviar recordatorios de eventos próximos (24 horas antes)
    Se ejecuta cada hora
    """
    with app.app_context():
        try:
            tomorrow = datetime.utcnow() + timedelta(hours=24)
            time_window_start = tomorrow - timedelta(hours=1)
            time_window_end = tomorrow + timedelta(hours=1)

            upcoming_events = Event.query.filter(
                Event.deletedAt.is_(None),
                Event.start_date >= time_window_start,
                Event.start_date <= time_window_end
            ).all()

            for event in upcoming_events:
                confirmed_rsvps = EventRSVP.query.filter(
                    EventRSVP.event_id == event.id,
                    EventRSVP.status == 'confirmed',
                    EventRSVP.deletedAt.is_(None)
                ).all()

                for rsvp in confirmed_rsvps:
                    user = User.query.get(rsvp.user_id)
                    if not user or not user.email_notifications:
                        continue

                    event_date = event.start_date.strftime('%d/%m/%Y %H:%M')
                    if event.is_online:
                        event_location = 'Online'
                    else:
                        event_location = event.address or event.city or 'Por definir'

                    frontend_url = app.config.get('FRONTEND_BASE_URL', 'https://localtalent.es')
                    event_url = f"{frontend_url}/events/{event.id}"

                    send_event_reminder_email(
                        user_email=user.email,
                        user_name=f"{user.first_name} {user.last_name}",
                        event_title=event.title,
                        event_date=event_date,
                        event_location=event_location,
                        event_url=event_url
                    )

                    logger.info(f'Recordatorio de evento enviado a {user.email}')

            return f'Recordatorios enviados para {len(upcoming_events)} eventos'

        except Exception as e:
            logger.error(f'Error en send_event_reminders: {str(e)}')
            return f'Error: {str(e)}'


@celery.task(name='email_tasks.send_weekly_digests')
def send_weekly_digests():
    """
    Tarea periódica: Enviar resumen semanal de actividad
    Se ejecuta cada lunes a las 9:00 AM
    """
    with app.app_context():
        try:
            users = User.query.filter(
                User.deletedAt.is_(None),
                User.email_notifications == True
            ).all()

            week_ago = datetime.utcnow() - timedelta(days=7)

            for user in users:
                # Mensajes no leídos recibidos en la semana
                new_messages = db.session.query(func.count(Message.id)).join(
                    Conversation, Message.conversation_id == Conversation.id
                ).filter(
                    or_(
                        Conversation.participant1_id == user.id,
                        Conversation.participant2_id == user.id
                    ),
                    Message.sender_id != user.id,
                    Message.is_read == False,
                    Message.createdAt >= week_ago,
                    Message.deletedAt.is_(None),
                    Conversation.deletedAt.is_(None)
                ).scalar() or 0

                # Eventos nuevos en la ciudad del usuario
                new_events = 0
                if user.city:
                    new_events = Event.query.filter(
                        Event.deletedAt.is_(None),
                        Event.is_public == True,
                        Event.city.ilike(f'%{user.city}%'),
                        Event.createdAt >= week_ago
                    ).count()

                # Nuevos usuarios en la misma ciudad
                new_users_in_city = 0
                if user.city:
                    new_users_in_city = User.query.filter(
                        User.deletedAt.is_(None),
                        User.is_enabled == True,
                        User.id != user.id,
                        User.city.ilike(f'%{user.city}%'),
                        User.createdAt >= week_ago
                    ).count()

                # Vistas de perfil recibidas en la última semana (únicas por viewer)
                profile_views = db.session.query(
                    func.count(func.distinct(ProfileView.viewer_id))
                ).filter(
                    ProfileView.viewed_id == user.id,
                    ProfileView.viewed_at >= week_ago,
                    ProfileView.deletedAt.is_(None),
                ).scalar() or 0

                stats = {
                    'profile_views': int(profile_views),
                    'new_messages': new_messages,
                    'new_events': new_events,
                    'new_users_in_city': new_users_in_city
                }

                if any(stats.values()):
                    send_weekly_digest_email(
                        user_email=user.email,
                        user_name=f"{user.first_name} {user.last_name}",
                        stats=stats
                    )

                    logger.info(f'Digest semanal enviado a {user.email}')

            return 'Digests semanales enviados'

        except Exception as e:
            logger.error(f'Error en send_weekly_digests: {str(e)}')
            return f'Error: {str(e)}'


# Configurar tareas periódicas en Celery Beat
# Agregar esto a config.py en la clase Config:
"""
beat_schedule = {
    'send-new-users-alerts-daily': {
        'task': 'email_tasks.send_new_users_alerts',
        'schedule': timedelta(days=1),  # Cada día
    },
    'send-event-reminders-hourly': {
        'task': 'email_tasks.send_event_reminders',
        'schedule': timedelta(hours=1),  # Cada hora
    },
    'send-weekly-digests': {
        'task': 'email_tasks.send_weekly_digests',
        'schedule': crontab(day_of_week=1, hour=9, minute=0),  # Lunes a las 9:00 AM
    },
}
"""
