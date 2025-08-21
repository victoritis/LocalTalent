import base64
from flask import jsonify, request
from flask_login import current_user, login_required
from app.user import bp
from app import db
from app.logger_config import logger
from flask import current_app
from app.models import Organization, OrgUser, Alert, User # Asegúrate que User esté importado
from app import login # Asegúrate que login manager esté importado
from werkzeug.utils import secure_filename
import os
import json
from app.organization.services import my_organizations

#Para la pagina de la vista del perfil
@bp.route('/api/v1/user/profile-info', methods=['GET'])
@login_required
def profile_info():
    """
    - Devuelve la información del usuario autenticado.
    - Incluye datos personales, organizaciones y las últimas 50 alertas.
    - Si el usuario es SUPERADMIN, incluye todas las organizaciones.
    - Requiere que el usuario esté autenticado.
    - Retorna un objeto con toda la información del perfil.
    """
    try:
        logger.getChild('user').info(f"Usuario {current_user.id} solicitando información de perfil")

        user = current_user
        if not user:
            return jsonify({'error': 'No user is currently logged in'}), 401

        # Obtener organizaciones del usuario usando my_organizations
        organizations_data = []
        try:
            logger.getChild('user').debug("Obteniendo organizaciones mediante my_organizations")
            # my_organizations devuelve un tuple (data, status_code)
            orgs_response, status_code = my_organizations()
            
            if status_code == 200:
                # Extraer solo el campo "organizations" del diccionario de respuesta
                organizations_data = orgs_response.get("organizations", [])
                logger.getChild('user').debug(f"Obtenidas {len(organizations_data)} organizaciones")
            else:
                logger.getChild('user').error(f"Error al llamar a my_organizations: status {status_code}")
                # Continuamos con organizations_data vacío
        except Exception as e:
            logger.getChild('user').error(f"Error al obtener organizaciones: {str(e)}", exc_info=True)
            # No retornamos error, continuamos con una lista vacía

        # Obtener las últimas 50 alertas de las organizaciones a las que pertenece el usuario
        alerts_data = []
        try:
            logger.getChild('user').debug("Iniciando obtención de alertas activas usando IDs de organizaciones")
            if organizations_data:
                org_ids = [org["id"] for org in organizations_data]  # Extraer los IDs
                alerts_query = Alert.query.filter(
                    Alert.org.in_(org_ids),
                    Alert.active == True
                ).order_by(
                    Alert.createdAt.desc()  # Ordenar de forma descendente por fecha de creación
                ).limit(50).all()
            else:
                alerts_query = []
            # Construir un diccionario para mapear ID de organización a su nombre
            org_lookup = {org["id"]: org["name"] for org in organizations_data}
            alerts_data = [
                {
                    "org_name": org_lookup.get(alert.org, "Unknown"),
                    "created_at": alert.createdAt,
                    "cpe": alert.cpe,
                    "cve": alert.cve,
                    "is_active": alert.active,
                    "cvss_score": alert.cve_info.cvss_score if alert.cve_info else None,
                    "cvss_version": alert.cve_info.cvss_version if alert.cve_info else None
                } for alert in alerts_query
            ]
            logger.getChild('user').debug(f"Obtenidas {len(alerts_data)} alertas")
        except Exception as e:
            logger.getChild('user').error(f"Error al obtener alertas: {str(e)}", exc_info=True)

        # Procesar imagen de perfil
        image_data = None
        try:
            logger.getChild('user').debug("Iniciando procesamiento de imagen de perfil")
            if user.profile_image:
                image_path = os.path.join(current_app.root_path, 'public', user.profile_image.lstrip('/'))
                logger.getChild('user').debug(f"Ruta de imagen: {image_path}")
                
                if os.path.exists(image_path):
                    with open(image_path, 'rb') as f:
                        image_data = base64.b64encode(f.read()).decode('utf-8')
                else:
                    logger.getChild('user').warning(f"Imagen no encontrada en: {image_path}")
                    # Intentar imagen por defecto
                    default_image_path = os.path.join(current_app.root_path, 'public', 'static', 'default_profile.png')
                    if os.path.exists(default_image_path):
                        with open(default_image_path, 'rb') as f:
                            image_data = base64.b64encode(f.read()).decode('utf-8')
        except Exception as e:
            logger.getChild('user').error(f"Error procesando imagen: {str(e)}", exc_info=True)
            # No retornamos error, continuamos con image_data = None

        # Construir respuesta
        data = {
            "user_id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "special_roles": user.special_roles,
            "is_enabled": user.is_enabled,
            "organizations": organizations_data,
            "profile_image": image_data,
            "alerts": alerts_data
        }

        logger.getChild('user').info(f"Información de perfil para usuario {user.id} procesada correctamente")
        return jsonify(data), 200

    except Exception as e:
        logger.getChild('user').error(f"Error crítico en profile_info: {str(e)}", exc_info=True)
        return jsonify({"error": "Error interno del servidor al procesar el perfil"}), 500

@bp.route('/api/v1/user/sidebar-info', methods=['GET'])
@login_required
def sidebar_info():
    """
    Devuelve información básica del usuario para la barra lateral.
    Incluye nombre, email e imagen de perfil en base64.
    """
    try:
        user = current_user
        if not user:
            logger.getChild('user').warning("sidebar_info: Usuario no autenticado intentando acceder.")
            return jsonify({'error': 'No user is currently logged in'}), 401

        logger.getChild('user').info(f"Usuario {user.id} solicitando información para sidebar.")

        user_name = f"{user.first_name} {user.last_name}".strip()
        if not user_name: # En caso de que first_name y last_name sean None o vacíos
            user_name = user.email.split('@')[0] # Usar parte del email como fallback

        image_data_base64 = None
        try:
            profile_image_path = user.profile_image
            if profile_image_path:
                # Construir la ruta absoluta al archivo de imagen
                # user.profile_image puede ser '/static/default_profile.png' o '/user_profile/...'
                if profile_image_path.startswith('/static/'):
                    # Ruta para imágenes estáticas generales como el default
                    image_full_path = os.path.join(current_app.root_path, 'public', profile_image_path.lstrip('/'))
                elif profile_image_path.startswith('/user_profile/'):
                    # Ruta para imágenes subidas por el usuario
                    image_full_path = os.path.join(current_app.root_path, 'public', profile_image_path.lstrip('/'))
                else:
                    # Fallback por si la ruta no tiene el formato esperado, intentar con default
                    logger.getChild('user').warning(f"Formato de ruta de imagen no reconocido: {profile_image_path}. Usando default.")
                    image_full_path = os.path.join(current_app.root_path, 'public', 'static', 'default_profile.png')

                logger.getChild('user').debug(f"Intentando cargar imagen de perfil desde: {image_full_path}")
                if os.path.exists(image_full_path):
                    with open(image_full_path, 'rb') as f:
                        image_data_base64 = base64.b64encode(f.read()).decode('utf-8')
                else:
                    logger.getChild('user').warning(f"Imagen de perfil no encontrada en {image_full_path}. Usando default.")
                    # Intentar cargar la imagen por defecto explícitamente si la ruta anterior falla
                    default_image_path = os.path.join(current_app.root_path, 'public', 'static', 'default_profile.png')
                    if os.path.exists(default_image_path):
                        with open(default_image_path, 'rb') as f:
                            image_data_base64 = base64.b64encode(f.read()).decode('utf-8')
                    else:
                        logger.getChild('user').error(f"Imagen de perfil por defecto no encontrada en {default_image_path}.")
            else:
                logger.getChild('user').info("Usuario no tiene profile_image configurado, usando default.")
                # Cargar imagen por defecto si user.profile_image es None o vacío
                default_image_path = os.path.join(current_app.root_path, 'public', 'static', 'default_profile.png')
                if os.path.exists(default_image_path):
                    with open(default_image_path, 'rb') as f:
                        image_data_base64 = base64.b64encode(f.read()).decode('utf-8')
                else:
                    logger.getChild('user').error(f"Imagen de perfil por defecto no encontrada en {default_image_path} (ruta explícita).")

        except Exception as e:
            logger.getChild('user').error(f"Error procesando imagen de perfil para sidebar: {str(e)}", exc_info=True)
            # No fallar la solicitud completa, continuar sin imagen o con la de por defecto si ya se cargó

        data = {
            "email": user.email,
            "name": user_name,
            "avatar": f"data:image/png;base64,{image_data_base64}" if image_data_base64 else None,
        }
        logger.getChild('user').info(f"Información de sidebar para usuario {user.id} procesada.")
        return jsonify(data), 200

    except Exception as e:
        logger.getChild('user').error(f"Error crítico en sidebar_info: {str(e)}", exc_info=True)
        return jsonify({"error": "Error interno del servidor al obtener información del usuario"}), 500

@bp.route('/api/v1/user/get-profile-picture', methods=['GET'])
@login_required
def get_profile_picture():
    """
    Devuelve la imagen de perfil del usuario autenticado.
    """
    try:
        user = current_user
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
                logger.getChild('user').error(f"Error al cargar imagen de perfil: {str(e)}", exc_info=True)
                image_data = None
                
        return jsonify({
            "profile_image": image_data
        }), 200
        
    except Exception as e:
        logger.getChild('user').error(f"Error al obtener imagen de perfil: {str(e)}", exc_info=True)
        return jsonify({"error": "Error interno del servidor"}), 500
    
@bp.route('/api/v1/user/update-profile', methods=['POST'])
@login_required
def update_profile():
    try:
        user = current_user
        if not user:
            return jsonify({'error': 'Usuario no autenticado'}), 401
        
        # Actualizar campos básicos
        user.first_name = request.form.get('firstName', user.first_name)
        user.last_name = request.form.get('lastName', user.last_name)
        
        # Manejar la imagen
        if 'profileImage' in request.files:
            file = request.files['profileImage']
            if file.filename != '':
                # Generar nombre único
                filename = f"user_{user.id}_{secure_filename(file.filename)}"
                upload_folder = os.path.join(current_app.root_path, 'public', 'user_profile')
                
                # Crear directorio si no existe
                os.makedirs(upload_folder, exist_ok=True)
                
                # Guardar archivo
                file_path = os.path.join(upload_folder, filename)
                file.save(file_path)
                
                # Guardar ruta relativa en la base de datos
                user.profile_image = f"/user_profile/{filename}"
        
        db.session.commit()
        return jsonify({
            'message': 'Perfil actualizado',
            'profile_image': user.profile_image
        }), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Error actualizando perfil: {str(e)}")
        return jsonify({'error': 'Error en base de datos'}), 500
    except Exception as e:
        logger.error(f"Error general actualizando perfil: {str(e)}")
        return jsonify({'error': 'Error del servidor'}), 500