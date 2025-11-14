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
from app.logger_config import logger

# Extensiones
db = SQLAlchemy()
migrate = Migrate()
login = LoginManager()
login.login_message = "Por favor, inicia sesión para acceder a esta página."
mail = Mail()
socketio = SocketIO(cors_allowed_origins=["https://localtalent.es", "https://api.localtalent.es"])

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

    # Configurar CORS
    # Cambio mínimo: actualizar dominios permitidos para reflejar el despliegue actual
    # Si necesitas añadir más, puedes convertirlo en variable de entorno y dividir por comas.
    CORS(
        app,
        supports_credentials=True,
        resources={r"/*": {"origins": [
            "https://localtalent.es",
            "https://api.localtalent.es"
        ]}}
    )

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

    from app.error import bp as error_bp
    app.register_blueprint(error_bp)

    # Registrar handlers de Socket.IO
    from app.messaging import socket_handlers

    logger.getChild('main').info('Application startup')

    return app

from app import models
