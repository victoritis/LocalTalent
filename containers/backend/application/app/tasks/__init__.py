import logging
from datetime import datetime, timezone
import time

import requests
from app import db, create_app
from logging.handlers import RotatingFileHandler
import os
from app.logger_config import logger
from celery.schedules import crontab  # Importación añadida para crontab

# Es importante contar con el contexto de la aplicación de Flask
app = create_app() # Al estar en proceso separado, se debe crear la app
app.app_context().push() # Al no ser petición HTTP, se debe hacer push al contexto manualmente

# Configurar zona horaria para las tareas programadas
app.config.timezone = 'UTC'
app.config.enable_utc = True

logger.getChild('celery').info("Inicializando tareas programadas de Celery")

# Después de la creación de app para evitar problemas de contexto
# from app.tasks.tokens import remove_expired_tokens
# from app.tasks.cve import cve_incremental_update
# from app.tasks.cpe import cpe_incremental_update
# from app.tasks.match import match_incremental_update

@app.celery.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    """
    Configura las tareas periódicas que se ejecutarán con Celery Beat.
    """
    logger.getChild('celery').info("Configurando tareas periódicas en Celery Beat")

    # # Tarea original sin cambios (30 segundos)
    # logger.getChild('celery').info("Programando tarea de limpieza de tokens expirados cada 200 segundos")
    # sender.add_periodic_task(
    #     200.0,
    #     remove_expired_tokens.s(),
    #     name='remove expired tokens every 200 seconds',
    # )

    # # Nueva configuración para CVEs cada hora impar
    # logger.getChild('celery').info("Programando tarea de actualización de CVEs cada hora impar")
    # sender.add_periodic_task(
    #     crontab(minute=0, hour='1-23/2'),
    #     cve_incremental_update.s(),
    #     name='update CVEs every odd hour',
    #     options={"misfire_grace_time": 0}, #Esto hace que no se actualicen tareas pendientes
    # )

    # # Nueva configuración para CPEs cada hora par
    # logger.getChild('celery').info("Programando tarea de actualización de CPEs cada hora par")
    # sender.add_periodic_task(
    #     crontab(minute=0, hour='*/2'),  # Ejecutar cada hora par
    #     cpe_incremental_update.s(),
    #     name='update CPEs every pair hour', # Corregido nombre de tarea
    #     options={"misfire_grace_time": 0}, #Esto hace que no se actualicen tareas pendientes
    # )

    # # Nueva configuración para Matchs cada hora par
    # logger.getChild('celery').info("Programando tarea de actualización de Match cada hora par")
    # sender.add_periodic_task(
    #     crontab(minute=30, hour='2-23/2'),  # Ejecutar cada hora par a partir de las 2:30 (2:30, 4:30, 6:30, etc.)
    #     match_incremental_update.s(),
    #     name='update Match every pair hour at 30 minutes past',
    #     options={"misfire_grace_time": 0},
    # )



    logger.getChild('celery').info("Configuración de tareas periódicas completada")

# import app.tasks.cve
# import app.tasks.cpe
# import app.tasks.match
# import app.tasks.alerts
# import app.tasks.tokens
