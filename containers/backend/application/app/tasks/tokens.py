import logging
from datetime import datetime, timezone
import time

import requests
from app import db
from app.models import CVE, JWTToken
from logging.handlers import RotatingFileHandler
import os
from app.logger_config import logger
from flask import current_app as app

@app.celery.task
def remove_expired_tokens():
    """
    Tarea que elimina los tokens expirados en la tabla JWTToken.
    Se supone que se ejecuta periódicamente a través de celery beat.
    """
    logger.getChild('celery').info("Iniciando tarea de limpieza de tokens JWT expirados")
    
    try:
        now = datetime.now(timezone.utc)
        logger.getChild('celery').debug(f"Buscando tokens expirados antes de: {now.isoformat()}")
        
        # Consultar tokens expirados
        expired_tokens = JWTToken.query.filter(JWTToken.expires_on < now).all()
        
        if expired_tokens:
            logger.getChild('celery').info(f"Se encontraron {len(expired_tokens)} tokens expirados para eliminar")
            
            # Eliminar cada token expirado
            for token in expired_tokens:
                logger.getChild('celery').debug(f"Eliminando token ID: {token.id}, expirado en: {token.expires_on.isoformat()}")
                db.session.delete(token)
                
            # Confirmar los cambios en la base de datos
            db.session.commit()
            logger.getChild('celery').info(f"Se han eliminado {len(expired_tokens)} tokens expirados correctamente")

        else:
            logger.getChild('celery').info(f"No se encontraron tokens expirados a las {now.isoformat()}")
            
        logger.getChild('celery').info("Tarea de limpieza de tokens JWT completada exitosamente")

        return f"Eliminados {len(expired_tokens) if expired_tokens else 0} tokens expirados"
    
    except Exception as e:
        logger.getChild('celery').error(f"Error durante la limpieza de tokens expirados: {str(e)}", exc_info=True)
        db.session.rollback()
        return f"Error en la tarea: {str(e)}"
    
