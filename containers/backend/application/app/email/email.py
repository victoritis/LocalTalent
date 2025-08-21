import logging
from threading import Thread
from flask import url_for, current_app
from flask_mail import Message
from app import mail
from app.logger_config import logger

# Crear logger específico para email
email_logger = logger.getChild('email')

def send_async_email(app, msg, sync):
    with app.app_context():
        email_logger.info(f"Iniciando envío de correo asíncrono (sync={sync})")
        try:
            mail.send(msg)
            email_logger.info("✅ Correo asíncrono enviado exitosamente")
        except Exception as e:
            email_logger.error(f"❌ Error asíncrono al enviar correo: {e}")
            raise

def send_email(subject, sender, recipients, text_body, html_body=None,
               cc=None, bcc=None, reply_to=None, attachments=None,
               sync=False):
    """
    Envía un correo electrónico con logging detallado
    """
    msg = Message(subject, sender=sender, recipients=recipients)
    msg.body = text_body
    if html_body:
        msg.html = html_body
    if cc:
        msg.cc = cc
    if bcc:
        msg.bcc = bcc
    if reply_to:
        msg.reply_to = reply_to
    if attachments:
        for attachment in attachments:
            msg.attach(*attachment)

    # Logs antes del envío
    email_logger.info("=== ENVÍO DE CORREO ===")
    email_logger.info(f"Asunto: {subject}")
    email_logger.info(f"Remitente: {sender}")
    email_logger.info(f"Destinatarios: {recipients}")
    if cc:
        email_logger.info(f"Copia a: {cc}")
    if bcc:
        email_logger.info(f"BCC: {bcc}")
    if reply_to:
        email_logger.info(f"Reply-To: {reply_to}")
    if attachments:
        email_logger.info(f"Archivos adjuntos: {[a[0] for a in attachments]}")
    email_logger.info(f"Servidor SMTP: {current_app.config.get('MAIL_SERVER')}")
    email_logger.info(f"Puerto SMTP: {current_app.config.get('MAIL_PORT')}")
    email_logger.info(f"TLS activo: {current_app.config.get('MAIL_USE_TLS')}")
    email_logger.info(f"SSL activo: {current_app.config.get('MAIL_USE_SSL')}")
    email_logger.info(f"Usuario SMTP: {current_app.config.get('MAIL_USERNAME')}")
    email_logger.info(f"Debug SMTP: {current_app.config.get('MAIL_DEBUG')}")
    email_logger.info(f"Envío síncrono: {sync}")

    # Preparar logger SMTP
    smtp_logger = logging.getLogger('smtplib')
    original_level = smtp_logger.level
    smtp_handler = logging.StreamHandler()
    smtp_handler.setLevel(logging.DEBUG)
    smtp_handler.setFormatter(logging.Formatter('SMTP-DEBUG: %(message)s'))

    try:
        smtp_logger.setLevel(logging.DEBUG)
        smtp_logger.addHandler(smtp_handler)

        email_logger.info("Iniciando envío de correo...")
        if sync:
            mail.send(msg)
            email_logger.info("✅ Correo enviado exitosamente (sync)")
        else:
            Thread(
                target=send_async_email,
                args=(current_app._get_current_object(), msg, sync)
            ).start()

    except Exception as e:
        email_logger.error(f"❌ Error al enviar correo: {e}")
        email_logger.error(f"Tipo de error: {type(e).__name__}")
        if hasattr(e, 'smtp_code'):
            email_logger.error(f"Código SMTP: {e.smtp_code}")
        if hasattr(e, 'smtp_error'):
            email_logger.error(f"Error SMTP: {e.smtp_error}")
        raise

    finally:
        smtp_logger.removeHandler(smtp_handler)
        smtp_logger.setLevel(original_level)
        email_logger.info("=== FIN ENVÍO DE CORREO ===")
