"""
Tareas de Celery para envío de emails y notificaciones periódicas
"""
from app import create_app, db
from app.models import User, Notification
from app.email_service import (
    send_new_users_in_city_email,
    send_event_reminder_email,
    send_weekly_digest_email
)
from datetime import datetime, timedelta
from sqlalchemy import and_, func
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
            # Obtener todos los usuarios activos con email_notifications habilitado
            users = User.query.filter(
                User.is_deleted == False,
                User.email_notifications == True
            ).all()

            for user in users:
                if not user.location or not user.location.get('city'):
                    continue

                city = user.location.get('city')

                # Buscar nuevos usuarios en la misma ciudad (últimas 24 horas)
                yesterday = datetime.utcnow() - timedelta(days=1)
                new_users = User.query.filter(
                    and_(
                        User.is_deleted == False,
                        User.id != user.id,
                        User.created_at >= yesterday,
                        func.json_extract(User.location, '$.city') == city
                    )
                ).count()

                if new_users > 0:
                    # Enviar email
                    frontend_url = app.config.get('FRONTEND_BASE_URL', 'https://localtalent.es')
                    search_url = f"{frontend_url}/search?city={city}"

                    send_new_users_in_city_email(
                        user_email=user.email,
                        user_name=user.name,
                        city=city,
                        new_users_count=new_users,
                        search_url=search_url
                    )

                    logger.info(f'Email de nuevos usuarios enviado a {user.email}')

            return f'Alertas enviadas a usuarios activos'

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
            from app.models import Event, EventRSVP

            # Buscar eventos que empiezan en 24 horas (±1 hora de margen)
            tomorrow = datetime.utcnow() + timedelta(hours=24)
            time_window_start = tomorrow - timedelta(hours=1)
            time_window_end = tomorrow + timedelta(hours=1)

            upcoming_events = Event.query.filter(
                and_(
                    Event.is_deleted == False,
                    Event.start_date >= time_window_start,
                    Event.start_date <= time_window_end
                )
            ).all()

            for event in upcoming_events:
                # Obtener asistentes confirmados
                confirmed_rsvps = EventRSVP.query.filter(
                    and_(
                        EventRSVP.event_id == event.id,
                        EventRSVP.status == 'confirmed',
                        EventRSVP.is_deleted == False
                    )
                ).all()

                for rsvp in confirmed_rsvps:
                    user = User.query.get(rsvp.user_id)
                    if user and user.email_notifications:
                        # Preparar datos del evento
                        event_date = event.start_date.strftime('%d/%m/%Y %H:%M')
                        event_location = 'Online' if event.is_online else event.location.get('address', event.location.get('city', 'Por definir'))

                        frontend_url = app.config.get('FRONTEND_BASE_URL', 'https://localtalent.es')
                        event_url = f"{frontend_url}/events/{event.id}"

                        # Enviar recordatorio
                        send_event_reminder_email(
                            user_email=user.email,
                            user_name=user.name,
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
            # Obtener todos los usuarios activos con email_notifications habilitado
            users = User.query.filter(
                User.is_deleted == False,
                User.email_notifications == True
            ).all()

            week_ago = datetime.utcnow() - timedelta(days=7)

            for user in users:
                # Calcular estadísticas de la semana
                stats = {
                    'profile_views': 0,  # TODO: Implementar tracking de visitas al perfil
                    'new_messages': db.session.query(func.count(
                        db.session.query(1)
                        .select_from(db.table('message'))
                        .filter(
                            and_(
                                db.column('receiver_id') == user.id,
                                db.column('created_at') >= week_ago,
                                db.column('is_deleted') == False
                            )
                        )
                    )).scalar() or 0,
                    'new_events': 0,  # TODO: Contar eventos nuevos en la ciudad del usuario
                    'new_users_in_city': 0  # TODO: Contar nuevos usuarios en la ciudad
                }

                # Si hay actividad, enviar digest
                if any(stats.values()):
                    send_weekly_digest_email(
                        user_email=user.email,
                        user_name=user.name,
                        stats=stats
                    )

                    logger.info(f'Digest semanal enviado a {user.email}')

            return f'Digests semanales enviados'

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
