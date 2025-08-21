import base64
import os
import uuid
from app.admin import bp
from flask import jsonify, request, current_app
from flask_login import login_required, current_user
from app.models import User, Organization, OrgUser, CPE, Product, Alert, CVE, Match, JWTToken, TasksInfo, Feedback # Añadir Feedback
from app import db
from app.auth.email import  send_create_account_email
from app.admin.email import send_organization_invitation_email
import random
import string
from app.admin.services import generate_random_password, get_user_profile_image, get_organization_logo
from sqlalchemy.exc import SQLAlchemyError
from app.logger_config import logger
from app.models import delete as soft_delete_record
from celery import chain
from datetime import datetime, timezone, timedelta # Asegurarse de que timezone y timedelta están importados
      
        


# Vista manage-organizations, todas las org ya que es SUPERADMIN
@bp.route('/api/v1/get-superadmin-organizations', methods=['GET'])
@login_required
def get_superadmin_organizations():
    """
    Devuelve todas las organizaciones para usuarios superadministradores.
    """
    try:
        logger.getChild('admin').info(f"Usuario {current_user.id} solicitando organizaciones para /api/v1/get-superadmin-organizations")
                
        if "ROLE_SUPERADMIN" not in current_user.special_roles:
            logger.getChild('admin').warning(f"Intento de acceso no autorizado por usuario {current_user.id}")
            return jsonify({"error": "Acceso denegado. Usuario no es superadministrador."}), 403

        page = request.args.get('page', 1, type=int)
        per_page = current_app.config['ORGS_PER_PAGE']
        logger.getChild('admin').debug(f"Parámetros de paginación - page: {page}, per_page: {per_page}")

        # Paginamos la consulta directamente
        try:
            pagination = Organization.query.paginate(
                page=page, 
                per_page=per_page, 
                error_out=False
            )
        except SQLAlchemyError as e:
            logger.getChild('admin').error(f"Error en consulta de organizaciones: {str(e)}", exc_info=True)
            return jsonify({
                "error": "Error interno al recuperar organizaciones",
                "code": "database_error"
            }), 500

        if not pagination.items:
            logger.getChild('admin').warning(f"No se encontraron organizaciones en la página {page}")
            
        organizations = pagination.items

        data = []
        for org in organizations:
            try:
                # Usar la función auxiliar para obtener el logo
                logo_data = get_organization_logo(org)

                org_data = {
                    "id": org.id,
                    "name": org.name,
                    "logo_path": org.logo_path,
                    "logo_data": logo_data,  # Nuevo campo con datos base64
                    "users": []
                }

                for orguser in org.users:
                    try:
                        user = orguser.user
                        current_role = orguser.roles[0] if orguser.roles else ""
                        
                        # Usar la función auxiliar para obtener la imagen de perfil
                        profile_image_data = get_user_profile_image(user)
                        
                        org_data["users"].append({
                            "id": user.id,
                            "email": user.email,
                            "currentRole": current_role,
                            "profile_image": profile_image_data  # Añadimos la imagen de perfil
                        })
                    except Exception as e:
                        logger.getChild('admin').debug(f"Error procesando usuario {user.id}: {str(e)}", exc_info=True)
                        continue

                data.append(org_data)
            except Exception as e:
                logger.error(f"Error serializando organización {org.id}: {str(e)}", exc_info=True)
                continue

        logger.getChild('admin').info(f"Entrega exitosa de {len(data)} organizaciones")
        
        return jsonify({
            "organizations": data,
            "page": pagination.page,
            "total_pages": pagination.pages,
            "total_items": pagination.total
        }), 200

    except Exception as e:
        logger.getChild('admin').critical(f"Error no manejado: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Error interno del servidor",
            "code": "internal_server_error"
        }), 500

# Vista manage-organizations, orgs del admin actual de la org
@bp.route('/api/v1/get-org-admin-organizations', methods=['GET'])
@login_required
def get_org_admin_organizations():
    """
    Devuelve las organizaciones en las que el usuario actual es administrador.
    """
    try:
        logger.getChild('admin').info(f"Usuario {current_user.id} solicitando organizaciones para /api/v1/get-org-admin-organizations")
        
        page = request.args.get('page', 1, type=int)
        per_page = current_app.config['ORGS_PER_PAGE']
        logger.getChild('admin').debug(f"Parámetros de paginación - page: {page}, per_page: {per_page}")

        try:
            # Consulta para organizaciones donde el usuario es ADMIN, con paginación aplicada
            admin_orgs_query = Organization.query.join(OrgUser).filter(
                OrgUser.user_id == current_user.id,
                OrgUser.roles.any("ROLE_ORG_ADMIN")
            ).paginate(page=page, per_page=per_page, error_out=False)
        except SQLAlchemyError as e:
            logger.getChild('admin').error(f"Error en consulta de organizaciones: {str(e)}", exc_info=True)
            return jsonify({
                "error": "Error interno al recuperar organizaciones",
                "code": "database_error"
            }), 500

        organizations = admin_orgs_query.items
        if not organizations:
            logger.getChild('admin').warning(f"No se encontraron organizaciones en la página {page}")

        data = []
        for org in organizations:
            try:
                # Usar la función auxiliar para obtener el logo
                logo_data = get_organization_logo(org)

                org_data = {
                    "id": org.id,
                    "name": org.name,
                    "logo_path": org.logo_path,
                    "logo_data": logo_data,  # Imagen en base64
                    "users": []
                }

                for orguser in org.users:
                    try:
                        user = orguser.user
                        current_role = orguser.roles[0] if orguser.roles else ""
                        
                        # Usar la función auxiliar para obtener la imagen de perfil
                        profile_image_data = get_user_profile_image(user)

                        org_data["users"].append({
                            "id": user.id,
                            "email": user.email,
                            "currentRole": current_role,
                            "profile_image": profile_image_data  # Imagen en base64
                        })
                    except Exception as e:
                        logger.getChild('admin').debug(f"Error procesando usuario {user.id}: {str(e)}", exc_info=True)
                        continue

                data.append(org_data)
            except Exception as e:
                logger.getChild('admin').error(f"Error serializando organización {org.id}: {str(e)}", exc_info=True)
                continue

        logger.getChild('admin').info(f"Entrega exitosa de {len(data)} organizaciones")
        
        return jsonify({
            "organizations": data,
            "page": admin_orgs_query.page,
            "total_pages": admin_orgs_query.pages,
            "total_items": admin_orgs_query.total
        }), 200

    except Exception as e:
        logger.getChild('admin').critical(f"Error no manejado: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Error interno del servidor",
            "code": "internal_server_error"
        }), 500



@bp.route('/api/v1/organizations/<int:org_id>/users/<int:user_id>/role', methods=['PUT'])
@login_required
def update_user_role_in_organization(org_id, user_id):
    """
    Actualiza el rol de un usuario dentro de una organización específica.
    Permitido para SUPERADMINs o ORG_ADMINs de la organización.
    """
    data = request.get_json()
    new_role = data.get('role')

    logger.getChild('admin').info(f"Usuario {current_user.id} intentando cambiar rol del usuario {user_id} en org {org_id} a {new_role}")

    if not new_role or new_role not in ["ROLE_USER", "ROLE_ORG_ADMIN"]:
        logger.getChild('admin').warning(f"Rol inválido proporcionado: {new_role}")
        return jsonify({"error": "Rol inválido proporcionado. Roles permitidos: ROLE_USER, ROLE_ORG_ADMIN"}), 400

    try:
        organization = db.session.get(Organization, org_id)
        if not organization:
            logger.getChild('admin').warning(f"Organización {org_id} no encontrada.")
            return jsonify({"error": "Organización no encontrada"}), 404

        user_to_update = db.session.get(User, user_id)
        if not user_to_update:
            logger.getChild('admin').warning(f"Usuario {user_id} a actualizar no encontrado.")
            return jsonify({"error": "Usuario a actualizar no encontrado"}), 404

        org_user_link = OrgUser.query.filter_by(user_id=user_id, organization_id=org_id).first()
        if not org_user_link:
            logger.getChild('admin').warning(f"Usuario {user_id} no es miembro de la organización {org_id}.")
            return jsonify({"error": "El usuario no es miembro de esta organización"}), 404

        # Lógica de permisos
        is_superadmin = "ROLE_SUPERADMIN" in current_user.special_roles
        current_user_org_roles = current_user.get_roles_for_organization(org_id)
        is_org_admin = "ROLE_ORG_ADMIN" in current_user_org_roles

        if not is_superadmin and not is_org_admin:
            logger.getChild('admin').warning(f"Usuario {current_user.id} no autorizado para cambiar roles en org {org_id}.")
            return jsonify({"error": "No autorizado para realizar esta acción"}), 403

        # Un ORG_ADMIN no puede cambiar su propio rol si es el único ORG_ADMIN
        if is_org_admin and not is_superadmin and current_user.id == user_id and new_role == "ROLE_USER":
            # Contar cuántos ORG_ADMINs hay en esta organización
            org_admins_count = db.session.query(OrgUser).filter(
                OrgUser.organization_id == org_id,
                OrgUser.roles.any("ROLE_ORG_ADMIN")
            ).count()
            if org_admins_count <= 1 and "ROLE_ORG_ADMIN" in org_user_link.roles:
                logger.getChild('admin').warning(f"Usuario {current_user.id} intentó degradarse como único ORG_ADMIN de org {org_id}.")
                return jsonify({"error": "No se puede cambiar el rol del único administrador de la organización"}), 400
        
        # Actualizar rol
        org_user_link.roles = [new_role]
        db.session.commit()
        
        # Obtener la imagen de perfil actualizada para la respuesta
        profile_image_data = get_user_profile_image(user_to_update)

        logger.getChild('admin').info(f"Rol del usuario {user_id} en org {org_id} cambiado a {new_role} por usuario {current_user.id}")
        return jsonify({
            "message": "Rol actualizado exitosamente",
            "user": {
                "id": user_to_update.id,
                "email": user_to_update.email,
                "currentRole": new_role, # Devolver el nuevo rol
                "profile_image": profile_image_data
            }
        }), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        logger.getChild('admin').error(f"Error de base de datos al actualizar rol: {str(e)}", exc_info=True)
        return jsonify({"error": "Error interno del servidor al actualizar el rol"}), 500
    except Exception as e:
        db.session.rollback()
        logger.getChild('admin').critical(f"Error inesperado al actualizar rol: {str(e)}", exc_info=True)
        return jsonify({"error": "Error inesperado en el servidor"}), 500


@bp.route('/api/v1/organizations/<int:org_id>/users/<int:user_id>', methods=['DELETE'])
@login_required
def remove_user_from_organization(org_id, user_id):
    """
    Elimina (soft delete) a un usuario de una organización específica.
    Permitido para SUPERADMINs o ORG_ADMINs de la organización.
    Un ORG_ADMIN no puede eliminarse a sí mismo si es el único ORG_ADMIN.
    """
    logger.getChild('admin').info(f"Usuario {current_user.id} ({current_user.email}) intentando eliminar al usuario {user_id} de la organización {org_id}")

    try:
        organization = db.session.get(Organization, org_id)
        if not organization:
            logger.getChild('admin').warning(f"Organización {org_id} no encontrada.")
            return jsonify({"error": "Organización no encontrada", "code": "not_found"}), 404

        user_to_remove = db.session.get(User, user_id)
        if not user_to_remove:
            logger.getChild('admin').warning(f"Usuario {user_id} a eliminar no encontrado.")
            return jsonify({"error": "Usuario a eliminar no encontrado", "code": "not_found"}), 404

        org_user_link = OrgUser.query.filter_by(
            user_id=user_id,
            organization_id=org_id,
            deletedAt=None  # Asegurarse de que el enlace no esté ya soft-deleted
        ).first()

        if not org_user_link:
            logger.getChild('admin').warning(f"Usuario {user_id} no es miembro activo de la organización {org_id} o ya fue eliminado.")
            return jsonify({"error": "El usuario no es un miembro activo de esta organización o ya fue eliminado.", "code": "not_member_or_already_deleted"}), 404

        # Lógica de permisos
        is_superadmin = "ROLE_SUPERADMIN" in current_user.special_roles
        current_user_org_roles = current_user.get_roles_for_organization(org_id)
        is_org_admin_of_this_org = "ROLE_ORG_ADMIN" in current_user_org_roles

        if not is_superadmin and not is_org_admin_of_this_org:
            logger.getChild('admin').warning(f"Usuario {current_user.id} no autorizado para eliminar usuarios en org {org_id}.")
            return jsonify({"error": "No autorizado para realizar esta acción en esta organización.", "code": "permission_denied"}), 403

        # Un ORG_ADMIN no puede eliminarse a sí mismo si es el único ORG_ADMIN
        if is_org_admin_of_this_org and not is_superadmin and current_user.id == user_id:
            # Contar cuántos ORG_ADMINs activos hay en esta organización
            active_org_admins_count = db.session.query(OrgUser).filter(
                OrgUser.organization_id == org_id,
                OrgUser.roles.any("ROLE_ORG_ADMIN"),
                OrgUser.deletedAt.is_(None) # Contar solo los activos
            ).count()

            if active_org_admins_count <= 1 and "ROLE_ORG_ADMIN" in org_user_link.roles:
                logger.getChild('admin').warning(f"Usuario {current_user.id} intentó eliminarse como único ORG_ADMIN de org {org_id}.")
                return jsonify({"error": "No se puede eliminar al único administrador de la organización. Asigne el rol a otro usuario primero.", "code": "last_admin_error"}), 400
        
        # Realizar soft delete usando la función importada
        soft_delete_record(org_user_link)
        # db.session.commit() ya está dentro de soft_delete_record

        logger.getChild('admin').info(f"Usuario {user_id} eliminado (soft delete) de la organización {org_id} por el usuario {current_user.id}.")
        return jsonify({"message": f"Usuario {user_to_remove.email} eliminado de la organización {organization.name}."}), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        logger.getChild('admin').error(f"Error de base de datos al eliminar usuario de organización: {str(e)}", exc_info=True)
        return jsonify({"error": "Error interno del servidor al procesar la solicitud.", "code": "database_error"}), 500
    except Exception as e:
        db.session.rollback()
        logger.getChild('admin').critical(f"Error inesperado al eliminar usuario de organización: {str(e)}", exc_info=True)
        return jsonify({"error": "Error inesperado en el servidor.", "code": "internal_server_error"}), 500


@bp.route('/api/v1/organizations/<int:org_id>/invite-user', methods=['POST'])
@login_required
def invite_user_to_organization(org_id):
    data = request.get_json()
    email = (data.get('email') or "").lower().strip()
    role_to_assign = data.get('role', 'ROLE_USER')  # Obtener el rol de la petición, default a ROLE_USER

    if role_to_assign not in ["ROLE_USER", "ROLE_ORG_ADMIN"]:
        return jsonify({"error": "Rol inválido proporcionado. Roles permitidos: ROLE_USER, ROLE_ORG_ADMIN"}), 400

    # Validar formato de email
    if "@" not in email:
        return jsonify({"error": "Email inválido", "code": "invalid_email"}), 400

    org = db.session.get(Organization, org_id)
    if not org:
        return jsonify({"error": "Organización no encontrada", "code": "not_found"}), 404

    # Permiso
    current_user_roles_in_org = current_user.get_roles_for_organization(org_id)
    if "ROLE_SUPERADMIN" not in current_user.special_roles and "ROLE_ORG_ADMIN" not in current_user_roles_in_org:
        logger.getChild('admin').warning(f"Usuario {current_user.id} sin permisos intentó invitar a la org {org_id}.")
        return jsonify({"error": "No autorizado para invitar usuarios a esta organización.", "code": "permission_denied"}), 403

    user_was_created = False
    user_was_reactivated = False

    try:
        # Buscar usuario, incluyendo los eliminados lógicamente
        user = db.session.query(User).execution_options(include_soft_deleted=True).filter_by(email=email).first()

        if user:
            if user.deletedAt is not None:
                # Usuario existía pero estaba soft-deleted, reactivarlo
                user.deletedAt = None
                user.is_enabled = False # Asegurar que deba verificar email/resetear contraseña
                # Considerar resetear contraseña si es una política de seguridad
                temp_pw = generate_random_password()
                user.set_password(temp_pw)
                db.session.add(user) # Añadir a la sesión para que los cambios se guarden
                send_create_account_email(user) # Enviar email como si fuera nuevo o uno específico de reactivación
                user_was_reactivated = True
                logger.getChild('admin').info(f"Usuario {email} reactivado (era soft-deleted) por {current_user.email} para org {org.name}.")
            elif not user.is_enabled:
                # Usuario existe, no está soft-deleted, pero is_enabled es False.
                # Enviar correo de invitación a la aplicación.
                send_create_account_email(user)
                logger.getChild('admin').info(f"Usuario {email} existe pero no está habilitado. Se enviará correo de activación de cuenta.")
        else:
            # Usuario no existe, crearlo
            temp_pw = generate_random_password()
            user = User(email=email, first_name="Invitado", last_name="Org", is_enabled=False)
            user.set_password(temp_pw)
            db.session.add(user)
            user.generate_otp_secret() # Esto hace commit internamente
            send_create_account_email(user)
            user_was_created = True
            logger.getChild('admin').info(f"Usuario {email} creado por {current_user.email} para invitar a org {org.name}.")

        # Verificar membresía en la organización, incluyendo las eliminadas lógicamente
        org_user_link = db.session.query(OrgUser).execution_options(include_soft_deleted=True).filter_by(user_id=user.id, organization_id=org_id).first()

        if org_user_link:
            if org_user_link.deletedAt is not None:
                # Membresía existía pero estaba soft-deleted, reactivarla
                org_user_link.deletedAt = None
                org_user_link.roles = [role_to_assign]  # Asignar rol de la invitación
                db.session.add(org_user_link)
                logger.getChild('admin').info(f"Membresía de {email} en {org.name} reactivada con rol {role_to_assign}.")
                # No enviar token de invitación si se reactiva directamente la membresía
            else:
                # Ya es miembro activo, no hacer nada más que informar
                logger.getChild('admin').info(f"Usuario {email} ya es miembro activo de {org.name}.")
                return jsonify({"message": f"El usuario {email} ya es miembro de '{org.name}'.", "code": "already_member"}), 200
        else:
            # Nueva membresía o usuario recién creado/reactivado necesita la invitación formal
            # Si no se creó/reactivó el usuario aquí, y no tenía membresía, se envía invitación
            # Si se creó/reactivó el usuario aquí, también se envía invitación para el proceso formal de aceptación
            pass # La lógica de enviar token de invitación se maneja más abajo

        db.session.commit() # Guardar cambios de usuario y/o org_user_link

        # Siempre generar token y enviar email de invitación para que el usuario acepte explícitamente
        send_organization_invitation_email(user, current_user, org, org_id, role=role_to_assign)  # Pasar el rol correcto

        if user_was_created:
            message = f"Usuario {email} creado e invitado a '{org.name}' con rol {role_to_assign}."
            status_code = 201
        elif user_was_reactivated:
            message = f"Usuario {email} reactivado e invitado a '{org.name}' con rol {role_to_assign}."
            status_code = 200 # O 201 si se considera una "nueva" invitación
        else: # Usuario ya existía y estaba activo, solo se envía invitación a la org
            message = f"Invitación enviada a {email} para unirse a '{org.name}' con rol {role_to_assign}."
            status_code = 200
        
        logger.getChild('admin').info(message)
        return jsonify({"message": message}), status_code

    except SQLAlchemyError as e:
        db.session.rollback()
        logger.getChild('admin').error(f"Error de BD al invitar usuario {email} a org {org_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Error interno del servidor al procesar la invitación.", "code": "database_error"}), 500
    except Exception as e:
        db.session.rollback()
        logger.getChild('admin').critical(f"Error inesperado al invitar usuario {email} a org {org_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Error inesperado en el servidor.", "code": "internal_server_error"}), 500

@bp.route('/api/v1/accept-organization-invitation', methods=['POST'])
def accept_organization_invitation():
    data = request.get_json()
    token = data.get('token')

    if not token:
        return jsonify({"error": "Token de invitación es requerido", "code": "token_missing"}), 400

    try:
        # Verificar si el token ya está en la tabla de tokens expirados
        if JWTToken.find(token):
            return jsonify({"error": "Token inválido.", "code": "token_already_used"}), 400

        # Decodificar y verificar el token
        decoded_token = User.verify_organization_invitation_token(token)

        if decoded_token is None:
            return jsonify({"error": "Token de invitación inválido o expirado.", "code": "invalid_or_expired_token"}), 401

        # Extraer datos del token
        user_id = decoded_token.get('invite_user_id')
        org_id = decoded_token.get('organization_id')
        role_to_assign = decoded_token.get('role', 'ROLE_USER')  # Default a ROLE_USER si no está en el token

        if not user_id or not org_id:
            logger.getChild('admin').error(f"Token decodificado pero faltan invite_user_id o organization_id. Payload: {decoded_token}")
            return jsonify({"error": "Token de invitación con formato incorrecto.", "code": "token_payload_error"}), 400

        user = db.session.get(User, user_id)
        organization = db.session.get(Organization, org_id)

        if not user or not organization:
            logger.getChild('admin').warning(f"Intento de aceptar invitación con usuario ({user_id}) u organización ({org_id}) no existente.")
            return jsonify({"error": "Usuario u organización no encontrada", "code": "not_found"}), 404

        # Verificar si el usuario ha completado el registro
        if not user.is_enabled:
            logger.getChild('admin').warning(f"Usuario {user.email} intentó aceptar invitación sin completar el registro.")
            return jsonify({
                "error": "Debe completar el registro antes de aceptar la invitación.",
                "code": "registration_incomplete"
            }), 403

        # Buscar enlace OrgUser, incluyendo los eliminados lógicamente
        org_user_link = db.session.query(OrgUser).execution_options(include_soft_deleted=True).filter_by(
            user_id=user.id,
            organization_id=organization.id
        ).first()

        if org_user_link:
            if org_user_link.deletedAt is None:  # Usuario ya es miembro activo
                if org_user_link.roles != [role_to_assign]:
                    org_user_link.roles = [role_to_assign]
                    logger.getChild('admin').info(f"Rol de {user.email} en '{organization.name}' actualizado a {role_to_assign} al aceptar invitación (ya era miembro).")
                else:
                    logger.getChild('admin').info(f"Usuario {user.email} ya es miembro activo de '{organization.name}' con el rol {role_to_assign}.")
            else:  # Membresía existía pero estaba soft-deleted, reactivarla
                org_user_link.deletedAt = None
                org_user_link.roles = [role_to_assign]
                logger.getChild('admin').info(f"Membresía de {user.email} en '{organization.name}' reactivada con rol {role_to_assign}.")
        else:  # No existe enlace. Crear uno nuevo.
            org_user_link = OrgUser(user_id=user.id, organization_id=organization.id, roles=[role_to_assign])
            db.session.add(org_user_link)
            logger.getChild('admin').info(f"Usuario {user.email} añadido a la organización '{organization.name}' con rol {role_to_assign}.")

        # Añadir el token a la tabla de tokens expirados
        JWTToken.add(token)

        db.session.commit()

        return jsonify({
            "message": f"¡Bienvenido a la organización '{organization.name}'!",
            "organization_name": organization.name,
            "code": "invitation_accepted"
        }), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        logger.getChild('admin').error(f"Error de base de datos (SQLAlchemyError) al aceptar invitación para usuario ID {user_id if 'user_id' in locals() else 'desconocido'} a org ID {org_id if 'org_id' in locals() else 'desconocida'}: {str(e)}", exc_info=True)
        return jsonify({"error": "Error interno del servidor al procesar la invitación.", "code": "database_error"}), 500
    except Exception as e:
        db.session.rollback()
        logger.getChild('admin').critical(f"Error inesperado al aceptar invitación: {str(e)}", exc_info=True)
        return jsonify({"error": "Error inesperado en el servidor.", "code": "internal_server_error"}), 500

@bp.route('/api/v1/admin/create-organization', methods=['POST'])
@login_required
def create_organization_admin():
    if "ROLE_SUPERADMIN" not in current_user.special_roles:
        return jsonify({"error": "Acceso denegado. Se requiere rol de superadministrador."}), 403

    name = request.form.get('name', '').strip()
    logo = request.files.get('logo')
    if not name or not logo:
        return jsonify({"error": "Se requieren 'name' y archivo 'logo'"}), 400

    try:
        upload_dir = os.path.join(current_app.root_path, 'public', 'organizations_logos')
        os.makedirs(upload_dir, exist_ok=True)

        uid = uuid.uuid4().hex[:8]
        tmp_name = f"org_tmp_{uid}.png"
        tmp_path = os.path.join(upload_dir, tmp_name)
        logo.save(tmp_path)

        org = Organization(name=name, logo_path=f"/organizations_logos/{tmp_name}")
        db.session.add(org)
        db.session.commit()

        final_name = f"organization_{org.id}_assets_{uid}_img.png"
        final_path = os.path.join(upload_dir, final_name)
        os.rename(tmp_path, final_path)

        org.logo_path = f"/organizations_logos/{final_name}"
        db.session.commit()

        return jsonify({
            "message": "Organización creada exitosamente",
            "organization": {
                "id": org.id,
                "name": org.name,
                "logo_path": org.logo_path
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.getChild('admin').error(f"Error al crear organización: {e}", exc_info=True)
        return jsonify({"error": "Error interno al crear organización"}), 500


@bp.route('/ejecutar-sincronizacion', methods=['GET'])
@login_required
def ejecutar_sincronizacion():
    """
    Endpoint que dispara la sincronización de CVEs, luego CPEs y finalmente Matches.
    Devuelve inmediatamente 200 y ejecuta las tareas en cadena.
    Requiere rol de SUPERADMIN.
    """
    logger.getChild('admin').info(f"Usuario {current_user.id} ({current_user.email}) solicitando ejecutar sincronización completa.")
    
    if "ROLE_SUPERADMIN" not in current_user.special_roles:
        logger.getChild('admin').warning(f"Intento no autorizado de ejecutar sincronización por usuario {current_user.id} ({current_user.email}).")
        return jsonify({"error": "Acceso denegado. Se requiere rol de superadministrador."}), 403

    try:
        # Encadenar las tareas: cve_load -> cpe_load -> match_load
        task_chain = chain(
            current_app.celery.signature('app.tasks.cve.cve_load', queue='cve_load'),
            current_app.celery.signature('app.tasks.cpe.cpe_load', queue='cpe_load'),
            current_app.celery.signature('app.tasks.match.match_load', queue='match_load')
        )
        result = task_chain.apply_async()
        
        logger.getChild('admin').info(f"Cadena de sincronización iniciada con ID: {result.id} por usuario {current_user.id} ({current_user.email}).")
        
        # Respuesta inmediata con código 200
        return jsonify({
            "status": "Sincronización iniciada",
            "task_chain_id": result.id
        }), 200
        
    except Exception as e:
        logger.getChild('admin').error(f"Error al iniciar la cadena de sincronización para el usuario {current_user.id} ({current_user.email}): {str(e)}", exc_info=True)
        return jsonify({
            "error": "Error al iniciar sincronización",
            "detalle": str(e)
        }), 500

@bp.route('/api/v1/superadmin/synchronization-status', methods=['GET'])
@login_required
def get_synchronization_status():
    """
    Verifica si hay alguna tarea de carga de datos (CVE, CPE, Match) en progreso.
    Una tarea se considera en progreso si su registro principal existe y su 'load_percentage' 
    es mayor a 0 pero menor que 100.
    Requiere rol de SUPERADMIN.
    """
    logger.getChild('admin').info(f"Usuario {current_user.id} ({current_user.email}) solicitando estado de sincronización.")

    if "ROLE_SUPERADMIN" not in current_user.special_roles:
        logger.getChild('admin').warning(f"Intento no autorizado de acceder al estado de sincronización por usuario {current_user.id} ({current_user.email}).")
        return jsonify({"error": "Acceso denegado. Se requiere rol de superadministrador."}), 403

    try:
        main_task_names = ["cve_load", "cpe_load", "match_load"]
        
        # Buscar tareas principales que están en progreso (load_percentage > 0 y < 100)
        active_tasks_count = db.session.query(TasksInfo).filter(
            TasksInfo.name.in_(main_task_names),
            TasksInfo.load_percentage > 0,
            TasksInfo.load_percentage < 100
        ).count()
            
        is_synchronizing = active_tasks_count > 0

        logger.getChild('admin').info(f"Estado de sincronización: {'En curso' if is_synchronizing else 'Inactiva'}. Tareas activas: {active_tasks_count}.")
        return jsonify({"is_synchronizing": is_synchronizing}), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        logger.getChild('admin').error(f"Error de base de datos al obtener estado de sincronización: {str(e)}", exc_info=True)
        return jsonify({"error": "Error interno del servidor al obtener el estado de sincronización.", "code": "database_error"}), 500
    except Exception as e:
        db.session.rollback()
        logger.getChild('admin').critical(f"Error inesperado al obtener estado de sincronización: {str(e)}", exc_info=True)
        return jsonify({"error": "Error inesperado en el servidor.", "code": "internal_server_error"}), 500


@bp.route('/api/v1/superadmin/summary', methods=['GET']) # Ruta actualizada
@login_required
def get_superadmin_summary(): # Nombre de función actualizado
    """
    Devuelve un resumen completo del estado del sistema para superadministradores.
    Incluye contadores de entidades principales, estado de carga inicial y última actualización.
    Requiere rol de SUPERADMIN.
    """
    logger.getChild('admin').info(f"Usuario {current_user.id} ({current_user.email}) solicitando resumen del sistema.")

    if "ROLE_SUPERADMIN" not in current_user.special_roles:
        logger.getChild('admin').warning(f"Intento no autorizado de acceder al resumen del sistema por usuario {current_user.id} ({current_user.email}).")
        return jsonify({"error": "Acceso denegado. Se requiere rol de superadministrador."}), 403

    try:
        cve_count = db.session.query(CVE.id).count()
        cpe_count = db.session.query(CPE.id).count()
        match_count = db.session.query(Match.matchCriteriaId).count() # Usar matchCriteriaId para el conteo
        user_count = db.session.query(User.id).count()
        organization_count = db.session.query(Organization.id).count()
        product_count = db.session.query(Product).count()
        alert_count = db.session.query(Alert).count()

        task_names_for_initial_load = ["cve_load", "cpe_load", "match_load"]
        tasks = TasksInfo.query.filter(TasksInfo.name.in_(task_names_for_initial_load)).all()
        
        initial_load_completed = False # Default to False
        if len(tasks) == len(task_names_for_initial_load): # Check if all task records exist
            all_tasks_at_100_percent = True
            for task in tasks:
                if task.load_percentage != 100:
                    all_tasks_at_100_percent = False
                    break
            if all_tasks_at_100_percent:
                initial_load_completed = True

        def get_last_update_for_task(task_name: str) -> str | None:
            task_info = TasksInfo.query.filter_by(name=task_name).order_by(TasksInfo.last_update.desc()).first()
            if task_info and task_info.last_update:
                # Asegurarse de que la fecha esté en UTC y en formato ISO
                if task_info.last_update.tzinfo is None:
                    return task_info.last_update.replace(tzinfo=timezone.utc).isoformat()
                else:
                    return task_info.last_update.astimezone(timezone.utc).isoformat()
            return None

        last_cve_update = get_last_update_for_task("cve_load")
        last_cpe_update = get_last_update_for_task("cpe_load")
        last_match_update = get_last_update_for_task("match_load")
        
        summary_data = {
            "cve_count": cve_count,
            "cpe_count": cpe_count,
            "match_count": match_count,
            "user_count": user_count,
            "organization_count": organization_count,
            "product_count": product_count,
            "alert_count": alert_count,
            "initial_load_completed": initial_load_completed,
            "last_cve_update": last_cve_update,
            "last_cpe_update": last_cpe_update,
            "last_match_update": last_match_update,
        }

        logger.getChild('admin').info(f"Resumen del sistema obtenido: {summary_data}.")
        return jsonify(summary_data), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        logger.getChild('admin').error(f"Error de base de datos al obtener resumen del sistema: {str(e)}", exc_info=True)
        return jsonify({"error": "Error interno del servidor al obtener el resumen.", "code": "database_error"}), 500
    except Exception as e:
        db.session.rollback()
        logger.getChild('admin').critical(f"Error inesperado al obtener resumen del sistema: {str(e)}", exc_info=True)
        return jsonify({"error": "Error inesperado en el servidor.", "code": "internal_server_error"}), 500

@bp.route('/api/v1/superadmin/load-progress', methods=['GET'])
@login_required
def get_load_progress():
    """
    Devuelve el progreso de las tareas de carga inicial (CVE, CPE, Match).
    Requiere rol de SUPERADMIN.
    """
    logger.getChild('admin').info(f"Usuario {current_user.id} ({current_user.email}) solicitando progreso de carga.")

    if "ROLE_SUPERADMIN" not in current_user.special_roles:
        logger.getChild('admin').warning(f"Intento no autorizado de acceder al progreso de carga por usuario {current_user.id} ({current_user.email}).")
        return jsonify({"error": "Acceso denegado. Se requiere rol de superadministrador."}), 403

    # Mantener las mismas claves para compatibilidad con frontend
    progress_data = {
        "cve_load_progress": 0,
        "cpe_load_progress": 0,
        "match_load_progress": 0,
    }
    
    # Mapeo de claves de respuesta a nombres de tareas principales
    main_tasks = {
        "cve_load_progress": "cve_load", 
        "cpe_load_progress": "cpe_load",
        "match_load_progress": "match_load"
    }

    try:
        # Leer directamente de los registros TasksInfo principales
        for output_key, task_name in main_tasks.items():
            task_info = db.session.get(TasksInfo, task_name)
            if task_info:
                progress_data[output_key] = task_info.load_percentage
        
        logger.getChild('admin').debug(f"Progreso de carga obtenido: {progress_data}")
        return jsonify(progress_data), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.getChild('admin').error(f"Error de base de datos al obtener progreso de carga: {str(e)}", exc_info=True)
        return jsonify({"error": "Error interno del servidor al obtener el progreso de carga.", "code": "database_error"}), 500
    except Exception as e:
        db.session.rollback()
        logger.getChild('admin').critical(f"Error inesperado al obtener progreso de carga: {str(e)}", exc_info=True)
        return jsonify({"error": "Error inesperado en el servidor.", "code": "internal_server_error"}), 500


@bp.route('/api/v1/superadmin/feedbacks', methods=['GET'])
@login_required
def get_all_feedbacks():
    """
    Devuelve todos los feedbacks para superadministradores, ordenados por fecha de creación descendente.
    Requiere rol de SUPERADMIN.
    """
    feedback_logger = logger.getChild('admin.feedback')
    feedback_logger.info(f"Usuario {current_user.id} ({current_user.email}) solicitando todos los feedbacks.")

    if "ROLE_SUPERADMIN" not in current_user.special_roles:
        feedback_logger.warning(f"Intento no autorizado de acceder a feedbacks por usuario {current_user.id} ({current_user.email}).")
        return jsonify({"error": "Acceso denegado. Se requiere rol de superadministrador."}), 403

    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int) # Permitir per_page configurable

        feedbacks_query = Feedback.query.order_by(Feedback.createdAt.desc())
        
        pagination = feedbacks_query.paginate(page=page, per_page=per_page, error_out=False)
        feedbacks = pagination.items

        feedbacks_data = [
            {
                "id": fb.id,
                "message": fb.message,
                "is_archived": fb.is_archived,
                "createdAt": fb.createdAt.isoformat() if fb.createdAt else None
            }
            for fb in feedbacks
        ]
        
        feedback_logger.info(f"Devueltos {len(feedbacks_data)} feedbacks en la página {page}.")
        return jsonify({
            "feedbacks": feedbacks_data,
            "page": pagination.page,
            "total_pages": pagination.pages,
            "total_items": pagination.total,
            "per_page": pagination.per_page
        }), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        feedback_logger.error(f"Error de base de datos al obtener feedbacks: {str(e)}", exc_info=True)
        return jsonify({"error": "Error interno del servidor al obtener feedbacks.", "code": "database_error"}), 500
    except Exception as e:
        db.session.rollback()
        feedback_logger.critical(f"Error inesperado al obtener feedbacks: {str(e)}", exc_info=True)
        return jsonify({"error": "Error inesperado en el servidor.", "code": "internal_server_error"}), 500


@bp.route('/api/v1/superadmin/feedbacks/<int:feedback_id>/toggle-archive', methods=['PATCH'])
@login_required
def toggle_feedback_archive_status(feedback_id):
    """
    Cambia el estado 'is_archived' de un feedback específico.
    Requiere rol de SUPERADMIN.
    """
    feedback_logger = logger.getChild('admin.feedback')
    feedback_logger.info(f"Usuario {current_user.id} ({current_user.email}) solicitando cambiar estado de archivo del feedback ID: {feedback_id}.")

    if "ROLE_SUPERADMIN" not in current_user.special_roles:
        feedback_logger.warning(f"Intento no autorizado de modificar feedback por usuario {current_user.id} ({current_user.email}).")
        return jsonify({"error": "Acceso denegado. Se requiere rol de superadministrador."}), 403

    try:
        feedback_item = db.session.get(Feedback, feedback_id)

        if not feedback_item:
            feedback_logger.warning(f"Feedback ID: {feedback_id} no encontrado para modificar.")
            return jsonify({"error": "Feedback no encontrado.", "code": "not_found"}), 404

        feedback_item.is_archived = not feedback_item.is_archived
        db.session.commit()
        
        feedback_logger.info(f"Estado de archivo del feedback ID: {feedback_id} cambiado a {feedback_item.is_archived}.")
        return jsonify({
            "message": "Estado del feedback actualizado exitosamente.",
            "feedback": {
                "id": feedback_item.id,
                "message": feedback_item.message,
                "is_archived": feedback_item.is_archived,
                "createdAt": feedback_item.createdAt.isoformat() if feedback_item.createdAt else None
            }
        }), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        feedback_logger.error(f"Error de base de datos al modificar feedback ID {feedback_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Error interno del servidor al modificar el feedback.", "code": "database_error"}), 500
    except Exception as e:
        db.session.rollback()
        feedback_logger.critical(f"Error inesperado al modificar feedback ID {feedback_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Error inesperado en el servidor.", "code": "internal_server_error"}), 500

