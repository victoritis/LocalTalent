# api_routes.py
from flask import jsonify, current_app
from flask_login import current_user, login_required
from app.rol import bp
from app.models import OrgUser
from sqlalchemy.exc import SQLAlchemyError
from app.logger_config import logger

#Usada para verificar los roles del usuario
@bp.route('/api/v1/get-roles')
@login_required
def get_user_roles():
    """
    - Devuelve los roles del usuario autenticado.
    - Verifica si el usuario es superadmin o admin de alguna organización.
    - Requiere que el usuario esté autenticado.
    - Retorna un objeto con los roles asignados al usuario.
    """
    try:
        logger.getChild('roles').info(f"Usuario {current_user.id} solicitando sus roles en /api/v1/get-roles")
        
        # Verificar si el usuario tiene el rol de superadmin
        is_superadmin = 'ROLE_SUPERADMIN' in current_user.special_roles
        is_adminorg = False
        
        logger.getChild('roles').debug(f"Usuario {current_user.id} es superadmin: {is_superadmin}")

        # Si no es superadmin, verificar si es admin de alguna organización
        if not is_superadmin:
            logger.getChild('roles').debug(f"Verificando roles de organización para usuario {current_user.id}")
            try:
                # Consulta mejorada usando el modelo OrgUser
                admin_orgs = OrgUser.query.filter(
                    OrgUser.user_id == current_user.id,
                    OrgUser.roles.any('ROLE_ORG_ADMIN')
                ).all()
                
                is_adminorg = len(admin_orgs) > 0
                
                if is_adminorg:
                    logger.getChild('roles').debug(f"Usuario {current_user.id} es admin")
                else:
                    logger.getChild('roles').debug(f"Usuario {current_user.id} no es admin en ninguna organización")
                
            except SQLAlchemyError as e:
                logger.getChild('roles').error(f"Error en consulta de roles de organización para usuario {current_user.id}: {str(e)}", exc_info=True)
                return jsonify({
                    "error": "Error interno al recuperar roles",
                    "code": "database_error"
                }), 500

        # Construir el objeto de roles
        roles = {
            'ROLE_SUPERADMIN': is_superadmin,
            'ROLE_ORG_ADMIN': is_adminorg,  
            'ROLE_USER': True  # Todos los usuarios autenticados tienen este rol
        }
        
        logger.getChild('roles').info(f"Roles del usuario {current_user.id} obtenidos exitosamente")
        return jsonify(roles), 200

    except Exception as e:
        logger.getChild('roles').critical(f"Error no manejado al obtener roles para usuario {current_user.id}: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Error interno del servidor",
            "code": "internal_server_error"
        }), 500
