from flask import render_template, current_app
from app.email.email import send_email
from app.logger_config import logger

def send_password_reset_email(user):
    token = user.get_reset_password_token()
    frontend_base_url = current_app.config.get('FRONTEND_BASE_URL')
    reset_url = f"{frontend_base_url}/login/reset-password?token={token}"

    subject = '[App Starter] Restablece tu contraseña'
    sender = current_app.config['MAIL_DEFAULT_SENDER']
    recipients = [user.email]

    text_body = render_template('email/reset_password.txt', user=user, reset_url=reset_url)
    html_body = render_template('email/reset_password.html', user=user, reset_url=reset_url)

    send_email(subject, sender=sender, recipients=recipients, text_body=text_body, html_body=html_body)


def send_create_account_email(user):
    token = user.get_verification_token()
    frontend_base_url = current_app.config.get('FRONTEND_BASE_URL')
    reset_url = f"{frontend_base_url}/register/create-account?token={token}"

    subject = '[App Starter] Crea tu cuenta'
    sender = current_app.config['MAIL_DEFAULT_SENDER']
    recipients = [user.email]

    text_body = render_template('email/create_account.txt', user=user, reset_url=reset_url)
    html_body = render_template('email/create_account.html', user=user, reset_url=reset_url)

    send_email(subject, sender=sender, recipients=recipients, text_body=text_body, html_body=html_body)


def send_delete_account_email(user):
    token = user.get_delete_account_token()
    frontend_base_url = current_app.config.get('FRONTEND_BASE_URL')
    # Ajustar la URL según la ruta del frontend para confirmar eliminación
    delete_url = f"{frontend_base_url}/profile/delete-account?token={token}"

    subject = '[LocalTalent] Confirmar eliminación de cuenta'
    sender = current_app.config['MAIL_DEFAULT_SENDER']
    recipients = [user.email]

    text_body = render_template('email/delete_account.txt', user=user, delete_url=delete_url)
    html_body = render_template('email/delete_account.html', user=user, delete_url=delete_url)

    send_email(subject, sender=sender, recipients=recipients, text_body=text_body, html_body=html_body)
