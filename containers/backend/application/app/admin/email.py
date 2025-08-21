from flask import render_template, current_app
from app.email.email import send_email
from app.logger_config import logger

def send_organization_invitation_email(user, inviter, organization, org_id, role):
    """
    Envía correo con token JWT para que el usuario acepte la invitación.
    """
    try:
        invitation_token = user.get_organization_invitation_token(org_id, role)
        frontend = current_app.config['FRONTEND_BASE_URL']
        url = f"{frontend}/accept-organization-invitation?token={invitation_token}"
        subject = f"Invitación a organización '{organization.name}'"
        sender = current_app.config['MAIL_DEFAULT_SENDER']
        logger.getChild('email').info(f"Invitación org '{organization.name}' para {user.email}")
        send_email(
            subject,
            sender=sender,
            recipients=[user.email],
            text_body=render_template(
                'email/organization_invitation.txt',
                user=user,
                inviting_user_email=inviter.email,
                organization_name=organization.name,
                accept_invitation_url=url
            ),
            html_body=render_template(
                'email/organization_invitation.html',
                user=user,
                inviting_user_email=inviter.email,
                organization_name=organization.name,
                accept_invitation_url=url
            )
        )
    except Exception as e:
        logger.getChild('email').error(f"Error invitación org: {e}", exc_info=True)
