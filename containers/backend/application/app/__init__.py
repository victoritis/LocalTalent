from flask import Flask
from config import Config
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import os
import logging
from logging.handlers import RotatingFileHandler
from flask_login import LoginManager
from flask_cors import CORS
from flask_mail import Mail
from flask_socketio import SocketIO
from app.celery_utils import init_celery
from redis import Redis
from app.cache import cache
from app.rate_limit import limiter
from app.logger_config import logger

# Orígenes CORS por defecto si ALLOWED_ORIGINS no está configurado.
# En producción conviene sobreescribir vía variable de entorno.
DEFAULT_ALLOWED_ORIGINS = [
    "https://localtalent.es",
    "https://api.localtalent.es",
    # Development origins
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]


def _parse_origins(value: str | None) -> list[str]:
    if not value:
        return list(DEFAULT_ALLOWED_ORIGINS)
    raw = [x.strip() for x in value.split(',')]
    return [x for x in raw if x and x != '*']


# Extensiones
db = SQLAlchemy()
migrate = Migrate()
login = LoginManager()
login.login_message = "Por favor, inicia sesión para acceder a esta página."
mail = Mail()
socketio = SocketIO(cors_allowed_origins=_parse_origins(os.environ.get('ALLOWED_ORIGINS')))

# Declaramos la variable celery a nivel de módulo
celery = None

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Inicializar extensiones
    db.init_app(app)
    migrate.init_app(app, db)
    login.init_app(app)
    mail.init_app(app)
    socketio.init_app(app)

    # --- Importar el módulo de listeners para que se registren ---
    # La simple importación ejecuta el código del decorador @event.listens_for
    from app.db_listeners import _soft_delete_criteria
    # --- Fin registro listeners ---

    app.redis = Redis.from_url(app.config['REDIS_URL'])
    app.celery = init_celery(app)

    # Cache con backend Redis (flask-caching). Usa la misma URL que celery/redis.
    cache.init_app(app, config={
        'CACHE_TYPE': 'RedisCache',
        'CACHE_REDIS_URL': app.config['REDIS_URL'],
        'CACHE_DEFAULT_TIMEOUT': 300,
        'CACHE_KEY_PREFIX': 'lt:',
    })

    # Configurar CORS explícito desde env var ALLOWED_ORIGINS (separado por comas).
    # Rechazamos cualquier '*' — orígenes concretos únicamente. En prod conviene
    # definir ALLOWED_ORIGINS para no depender de los defaults.
    allowed_origins = _parse_origins(os.environ.get('ALLOWED_ORIGINS'))
    if not allowed_origins:
        logger.getChild('cors').warning(
            "ALLOWED_ORIGINS vacío tras filtrar — el backend rechazará todo CORS"
        )
    CORS(
        app,
        supports_credentials=True,
        resources={r"/*": {"origins": allowed_origins}},
    )

    # Rate limiter: si hay Redis disponible, usarlo como storage para que los
    # límites sean consistentes entre procesos/gunicorn workers.
    if app.config.get('REDIS_URL'):
        app.config.setdefault('RATELIMIT_STORAGE_URI', app.config['REDIS_URL'])
        app.config.setdefault('RATELIMIT_STRATEGY', 'fixed-window')
    # En tests el limiter puede interferir; permitir desactivarlo desde config.
    if app.config.get('TESTING'):
        app.config.setdefault('RATELIMIT_ENABLED', False)
    limiter.init_app(app)

    # Registrar blueprints
    from app.auth import bp as auth_bp
    app.register_blueprint(auth_bp)

    from app.main import bp as main_bp
    app.register_blueprint(main_bp)

    from app.user import bp as user_bp
    app.register_blueprint(user_bp)

    from app.messaging import bp as messaging_bp
    app.register_blueprint(messaging_bp)

    from app.notifications import bp as notifications_bp
    app.register_blueprint(notifications_bp)

    from app.reviews import bp as reviews_bp
    app.register_blueprint(reviews_bp)

    from app.events import bp as events_bp
    app.register_blueprint(events_bp)

    from app.projects import bp as projects_bp
    app.register_blueprint(projects_bp)

    from app.security import bp as security_bp
    app.register_blueprint(security_bp)

    from app.error import bp as error_bp
    app.register_blueprint(error_bp)

    # Registrar handlers de Socket.IO
    from app.messaging import socket_handlers

    logger.getChild('main').info('Application startup')

    return app

from app import models
