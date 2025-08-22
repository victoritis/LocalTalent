from flask import current_app, render_template
from app import db
from app.models import User  # Organización y productos eliminados
from app.email.email import send_email
from app.logger_config import logger
from urllib.parse import quote
from datetime import datetime, timezone
import os

def send_new_alerts_notification(org_id, product_cpe, new_alert_cves, critical_alerts_count=0, context='cve_update'):
    """
    Envía un correo electrónico a los administradores (TO) y al resto de usuarios (CC)
    de una organización cuando se detectan nuevas alertas para un producto.

    Args:
        org_id (int): ID de la organización.
        product_cpe (str): Nombre CPE del producto afectado.
        new_alert_cves (list): Lista de IDs de CVEs nuevas/restauradas.
        critical_alerts_count (int): Número de alertas críticas entre new_alert_cves.
        context (str): 'new_product' o 'cve_update', para personalizar el mensaje.
    """
    try:
        org = db.session.query(Organization).get(org_id)
        if not org:
            logger.getChild('email').error(f"No se pudo enviar correo de nuevas alertas: Organización {org_id} no encontrada.")
            return

        # Verificar si el producto existe y tiene send_email=True (doble chequeo)
        product = db.session.query(Product).filter_by(org=org_id, cpe=product_cpe).first()
        if not product:
             logger.getChild('email').error(f"No se pudo enviar correo: Producto {product_cpe} no encontrado en Org {org_id}.")
             return
        if not product.send_email:
             logger.getChild('email').info(f"Correo omitido para Org {org_id}, CPE {product_cpe} (send_email=False en función de envío).")
             return

        # Seleccionar todos los usuarios de la org



        # Personalizar asunto según el contexto
        if context == 'new_product':
            subject = f"Producto Añadido y Nuevas Alertas Detectadas para {product_cpe} en {org.name}"
        else: # 'cve_update' o por defecto
            subject = f"Nuevas Alertas Detectadas para {product_cpe} en {org.name} (Actualización CVEs)"

        sender = current_app.config['MAIL_DEFAULT_SENDER']
        alerts_count = len(new_alert_cves)

        # Codificar el nombre de la organización para usarlo en la URL
        
        current_time_for_template = datetime.now(timezone.utc)
        # Obtener la URL base del frontend desde la configuración de la app
        frontend_base_url = current_app.config.get('FRONTEND_BASE_URL')

        # Renderizar plantillas
        text_body = render_template('email/new_product_alerts.txt',
                                        org_name='N/A',  # Organización eliminada
                                    org_name_url_safe=org_name_url_safe, 
                                    product_cpe=product_cpe,
                                    new_alert_cves=new_alert_cves,
                                    new_alerts_count=alerts_count,
                                    critical_alerts_count=critical_alerts_count,
                                    context=context, 
                                    now=current_time_for_template,
                                    frontend_base_url=frontend_base_url) 
        html_body = render_template('email/new_product_alerts.html',
                                        org_name='N/A',  # Organización eliminada
                                    org_name_url_safe=org_name_url_safe, 
                                    product_cpe=product_cpe,
                                    new_alert_cves=new_alert_cves,
                                    new_alerts_count=alerts_count,
                                    critical_alerts_count=critical_alerts_count,
                                    context=context, 
                                    now=current_time_for_template,
                                    frontend_base_url=frontend_base_url)

        # Enviar correo: TO = admins, CC = resto de usuarios activos
            return []  # Lógica de organizaciones eliminada: retornar lista vacía

        logger.getChild('email').info(
            f"Correo de nuevas alertas ({context}) enviado para Org {org_id}, CPE {product_cpe}. "
            f"Alertas: {alerts_count}. To: {recipients}, Cc: {cc_recipients}"
        )

    except Exception as e:
        logger.getChild('email').error(
            f"Error al preparar o enviar correo de nuevas alertas ({context}) para Org {org_id}, "
            f"CPE {product_cpe}: {e}", exc_info=True
        )

