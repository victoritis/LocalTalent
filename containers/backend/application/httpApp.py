import os
from flask import request
from app import create_app, db
from datetime import datetime, timezone 
import click # Importar click para comandos CLI

app = create_app()      


with app.app_context():
    from app.models import setup_audit , setup_base, User # 
    setup_audit()
    setup_base()

def create_or_update_default_admin(flask_app):
    flask_app.logger.info("[ADMIN_SETUP] Iniciando proceso de verificación/creación de admin por defecto")
    with flask_app.app_context():
        admin_email = flask_app.config.get('ADMIN_EMAIL')
        admin_password = flask_app.config.get('ADMIN_PASSWORD')
        admin_first_name = flask_app.config.get('ADMIN_FIRST_NAME')
        admin_last_name = flask_app.config.get('ADMIN_LAST_NAME')
        admin_otp_secret = flask_app.config.get('ADMIN_OTP_SECRET') # Opcional

        if not all([admin_email, admin_password, admin_first_name, admin_last_name]):
            flask_app.logger.error(
                "Variables de entorno para el administrador por defecto (ADMIN_EMAIL, ADMIN_PASSWORD, "
                "ADMIN_FIRST_NAME, ADMIN_LAST_NAME) no están completamente configuradas. "
                "No se creará/verificará el administrador."
            )
            flask_app.logger.debug(f"[ADMIN_SETUP] Valores leídos -> ADMIN_EMAIL={admin_email}, ADMIN_PASSWORD={'SET' if admin_password else 'MISSING'}, FIRST={admin_first_name}, LAST={admin_last_name}")
            return

        existing_user = User.query.filter_by(email=admin_email).first()
        super_admin_role = "ROLE_SUPERADMIN"

        if existing_user:
            flask_app.logger.info(f"[ADMIN_SETUP] Usuario admin existente encontrado: {admin_email} (ID={existing_user.id}) - actualizando datos")
            # El usuario administrador ya existe, actualizar datos
            try:
                existing_user.first_name = admin_first_name
                existing_user.last_name = admin_last_name
                existing_user.set_password(admin_password)
                existing_user.is_enabled = True
                
                if admin_otp_secret:
                    existing_user.otp_secret = admin_otp_secret
                
                current_roles = list(existing_user.special_roles) 
                if super_admin_role not in current_roles:
                    current_roles.append(super_admin_role)
                    existing_user.special_roles = current_roles
                
                db.session.commit()
                log_message = f"Datos del administrador '{admin_email}' actualizados: " \
                              f"nombre='{admin_first_name} {admin_last_name}', contraseña actualizada, habilitado."
                if admin_otp_secret:
                    log_message += " Secreto TOTP configurado/actualizado."
                if super_admin_role in existing_user.special_roles:
                    log_message += f" Rol {super_admin_role} asegurado."
                flask_app.logger.info(log_message)
            except Exception as e:
                db.session.rollback()
                flask_app.logger.error(f"Error al actualizar datos del administrador '{admin_email}': {e}")
            
        else:
            # El usuario administrador no existe, crearlo
            try:
                new_admin = User(
                    email=admin_email,
                    first_name=admin_first_name,
                    last_name=admin_last_name,
                    is_enabled=True,
                    otp_secret=admin_otp_secret, 
                    special_roles=[super_admin_role] 
                )
                new_admin.set_password(admin_password)
                db.session.add(new_admin)
                db.session.commit()
                log_message = f"Usuario administrador por defecto '{admin_email}' con nombre " \
                              f"'{admin_first_name} {admin_last_name}' creado exitosamente, habilitado y " \
                              f"con rol {super_admin_role}."
                if admin_otp_secret:
                    log_message += " Secreto TOTP configurado."
                flask_app.logger.info(log_message)
            except Exception as e:
                db.session.rollback()
                flask_app.logger.error(f"Error al crear el usuario administrador por defecto '{admin_email}': {e}")
                flask_app.logger.exception("[ADMIN_SETUP] Stacktrace al crear admin")


# Llamada automática al iniciar el módulo (solo si variable de entorno no lo desactiva)
AUTO_CREATE_ADMIN = os.environ.get("AUTO_CREATE_ADMIN", "true").lower() == "true"
if AUTO_CREATE_ADMIN:
    try:
        app.logger.info("[ADMIN_SETUP] AUTO_CREATE_ADMIN activo: ejecutando create_or_update_default_admin() al inicio")
        create_or_update_default_admin(app)
    except Exception as e:
        app.logger.error(f"[ADMIN_SETUP] Error inesperado al ejecutar create_or_update_default_admin al inicio: {e}")
else:
    app.logger.info("[ADMIN_SETUP] AUTO_CREATE_ADMIN=false: se omite creación automática de admin")



@app.cli.command("create-admin")
def create_admin_command():
    """Crea o actualiza el usuario administrador por defecto."""
    print("Ejecutando comando para crear/actualizar administrador por defecto...")
    create_or_update_default_admin(app)
    print("Comando para crear/actualizar administrador por defecto finalizado.")

#Para que funcione el CORS y no haga siempre preflight haciendo un OPTIONS
#No se si es el mejor sitio para ponerlo, lo dudo
@app.after_request
def add_cors_headers(response):                             #Seguramente haya que quitar esto
    allowed_origins = ["https://localtalent.es", "http://localhost:5174"] #Este segundo era para los test con Cypress
    origin = request.headers.get("Origin")
    if origin in allowed_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    # Incluir DELETE (y PUT) en los métodos permitidos
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cache-Control"
    response.headers["Access-Control-Max-Age"] = "86400"  # Cache por 24 horas
    return response

if __name__ == "__main__":
    basedir = os.path.abspath(os.path.dirname(__file__))
    app.run(host="0.0.0.0", port=5000)

