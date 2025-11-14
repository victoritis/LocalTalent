import os
from dotenv import load_dotenv
from kombu import Queue

basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, '.env.local'))

class Config:
    
    ############################################################################################################
    # Configuración de la aplicación
    ############################################################################################################
    
    basedir = os.path.abspath(os.path.dirname(__file__))
    SECRET_KEY = os.environ.get('SECRET_KEY')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'
    ORGS_PER_PAGE = 9
    FRONTEND_BASE_URL = os.environ.get('FRONTEND_BASE_URL')

    ############################################################################################################
    # Configuración de Flask-Mail
    ############################################################################################################
    
    MAIL_SERVER = os.environ.get('MAIL_SERVER')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 25))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'False').lower() == 'true'
    MAIL_USE_SSL = os.environ.get('MAIL_USE_SSL', 'False').lower() == 'true'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEBUG = os.environ.get('MAIL_DEBUG', 'False').lower() == 'true'
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER')
    
    ######################################################################################################################
    # Configuración de SuperAdmin
    ######################################################################################################################
    ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL')
    ADMIN_FIRST_NAME = os.environ.get('ADMIN_FIRST_NAME', 'Super')
    ADMIN_LAST_NAME = os.environ.get('ADMIN_LAST_NAME', 'Admin')
    ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'superadmin123')
    ADMIN_OTP_SECRET = os.environ.get('ADMIN_OTP_SECRET')  # Secreto TOTP para el superadmin  

    ############################################################################################################
    # Configuración de Flask-Login
    ############################################################################################################
    
    SESSION_COOKIE_HTTPONLY = os.environ.get('SESSION_COOKIE_HTTPONLY', 'True').lower() == 'true'
    
    ############################################################################################################
    # Configuración de Celery
    ############################################################################################################

    REDIS_URL = os.environ.get('REDIS_URL')

    ############################################################################################################
    # Configuración de Celery
    ############################################################################################################
    broker_url = REDIS_URL
    result_backend = REDIS_URL

    #Deberia ir task_queues pero parece no funcionar
    #Declaracion de colas
    task_queues = ()
    #Deberia ir task_route en vez de CELERY_ROUTES pero parece no funcionar
    #Para indicar en tareas periódicas a qué cola ir
    CELERY_ROUTES = {}

    # Tareas periódicas de Celery Beat
    from datetime import timedelta
    from celery.schedules import crontab

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
    
    ############################################################################################################
    # Configuración de API NVD
    ############################################################################################################

    NIST_API_KEY = os.environ.get('NIST_API_KEY')
    NVD_URL_CVE = os.environ.get('NVD_URL_CVE')
    NVD_URL_CPE = os.environ.get('NVD_URL_CPE')
    NVD_URL_MATCH = os.environ.get('NVD_URL_MATCH')

    ############################################################################################################
    # Configuración de Cookies de Sesión
    ############################################################################################################
    # True: la cookie solo se envía con HTTPS. Necesario para SameSite='None' y buena práctica.
    SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'True').lower() == 'true'
    # True: JavaScript no puede acceder a la cookie. Más seguro.
    SESSION_COOKIE_HTTPONLY = os.environ.get('SESSION_COOKIE_HTTPONLY', 'True').lower() == 'true'
    # 'Lax' (predeterminado), 'Strict', o 'None'. Para cross-site.
    # Si es 'None', SESSION_COOKIE_SECURE debe ser True.
    SESSION_COOKIE_SAMESITE = os.environ.get('SESSION_COOKIE_SAMESITE', 'Lax')
    # Dominio para la cookie. Necesario para subdominios. Ej: '.example.com'
    SESSION_COOKIE_DOMAIN = os.environ.get('SESSION_COOKIE_DOMAIN') or None



############################################################################################################
# Configuración de tests
############################################################################################################

class TestConfig(Config):  # Hereda de Config
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('SQLALCHEMY_DATABASE_URI_TEST')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'test-secret-key'
    TESTS = True
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True
    }
    SQLALCHEMY_SESSION_OPTIONS = {
        "expire_on_commit": False
    }