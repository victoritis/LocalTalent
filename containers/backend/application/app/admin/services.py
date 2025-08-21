

import base64
import os
import random
import string
from flask import current_app
from app.logger_config import logger

def generate_random_password(length=12):
    chars = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(random.choice(chars) for _ in range(length)) 


# Funciones auxiliares para cargar imágenes
def get_user_profile_image(user):
    """
    Obtiene la imagen de perfil para un usuario específico.
    """
    image_data = None
    
    if user.profile_image:
        try:
            image_path = os.path.join(current_app.root_path, 'public', user.profile_image.lstrip('/'))
            logger.getChild('user').debug(f"Intentando cargar imagen de perfil desde: {image_path}")
            
            if os.path.exists(image_path):
                with open(image_path, 'rb') as f:
                    image_data = base64.b64encode(f.read()).decode('utf-8')
            else:
                logger.getChild('user').warning(f"Archivo de imagen de perfil no encontrado: {image_path}")
        except Exception as e:
            logger.getChild('user').error(f"Error al cargar imagen de perfil para usuario {user.id}: {str(e)}", exc_info=True)
    
    return image_data

def get_organization_logo(org):
    """
    Obtiene el logo para una organización específica.
    """
    logo_data = None
    
    if org.logo_path:
        try:
            logo_path = os.path.join(current_app.root_path, 'public', org.logo_path.lstrip('/'))
            logger.getChild('admin').debug(f"Intentando cargar logo desde: {logo_path}")
            
            if os.path.exists(logo_path):
                with open(logo_path, 'rb') as f:
                    logo_data = base64.b64encode(f.read()).decode('utf-8')
            else:
                logger.getChild('admin').warning(f"Logo no encontrado en: {logo_path}")
        except Exception as e:
            logger.getChild('admin').error(f"Error al cargar logo para organización {org.id}: {str(e)}", exc_info=True)
    
    return logo_data