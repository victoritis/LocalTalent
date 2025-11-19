from app.auth import bp
from flask import jsonify, request, current_app
from flask_login import login_user, logout_user, login_required, current_user
from app.models import User, JWTToken 
from app import db
from app.auth.email import send_password_reset_email, send_create_account_email
import random, string
import pyotp
from datetime import datetime, timezone
from sqlalchemy.exc import SQLAlchemyError
from app.logger_config import logger


@bp.route('/api/v1/check-credentials', methods=['POST'])
def check_credentials():
    """
    Verifica únicamente si el email y contraseña son correctos.
    NO inicia la sesión todavía.
    """
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        
        logger.getChild('auth').info(f"Intento de verificación de credenciales para el usuario: {username} - Paso 1 Login")
        
        if not username or not password:
            logger.getChild('auth').warning(f"Intento de verificación con parámetros incompletos: username={bool(username)}, password={bool(password)} - Paso 1 Login")
            return jsonify({"msg": "Se requieren usuario y contraseña"}), 400

        # Buscar el usuario
        user = db.session.query(User).filter_by(email=username).first()
        if user is None:
            logger.getChild('auth').warning(f"Intento de verificación para usuario inexistente: {username} - Paso 1 Login")
            return jsonify({"msg": "Credenciales inválidas"}), 401
            
        if not user.check_password(password):
            logger.getChild('auth').warning(f"Contraseña incorrecta para el usuario: {username} - Paso 1 Login")
            return jsonify({"msg": "Credenciales inválidas"}), 401
        
        # Verificar si el usuario está habilitado
        if not user.is_enabled:
            logger.getChild('auth').warning(f"Intento de acceso a cuenta inactiva: {username} - Paso 1 Login")
            return jsonify({"msg": "Cuenta inactiva. Por favor, verifica tu correo o contacta con soporte."}), 403
        
        # Si llega aquí, credenciales correctas
        logger.getChild('auth').info(f"Verificación de credenciales exitosa para: {username} - Paso 1 Login")
        return jsonify({"msg": "Credenciales válidas"}), 200
    except Exception as e:
        logger.getChild('auth').error(f"Error en verificación de credenciales: {str(e)} - Paso 1 Login", exc_info=True)
        return jsonify({"msg": "Error interno del servidor", "code": "internal_server_error"}), 500


@bp.route('/api/v1/verify-otp', methods=['POST'])
def verify_otp():
    """
    Verifica el código OTP y la contraseña antes de iniciar sesión.
    """
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        otp_code = data.get('otp_code')

        logger.getChild('auth').info(f"Intento de verificación OTP para el usuario: {username} - Paso 2 Login")

        if not username or not password or not otp_code:
            logger.getChild('auth').warning(f"Verificación OTP con parámetros incompletos: username={bool(username)}, password={bool(password)}, otp_code={bool(otp_code)} - Paso 2 Login")
            return jsonify({"msg": "Faltan parámetros (username, password, otp_code)"}), 400

        # Buscar el usuario en la base de datos
        user = db.session.query(User).filter_by(email=username).first()
        if not user:
            logger.getChild('auth').warning(f"Verificación OTP para usuario inexistente: {username} - Paso 2 Login")
            return jsonify({"msg": "Usuario no encontrado"}), 404

        # Verificar la contraseña nuevamente
        if not user.check_password(password):
            logger.getChild('auth').warning(f"Contraseña incorrecta en verificación OTP para: {username} - Paso 2 Login")
            return jsonify({"msg": "Contraseña incorrecta"}), 401

        # Verificar si el usuario está habilitado
        if not user.is_enabled:
            logger.getChild('auth').warning(f"Intento de verificación OTP en cuenta inactiva: {username} - Paso 2 Login")
            return jsonify({"msg": "Cuenta inactiva. Por favor, verifica tu correo o contacta con soporte."}), 403

        # Verificar el código OTP
        if not user.verify_otp(otp_code):
            logger.getChild('auth').warning(f"Código OTP inválido para usuario: {username} - Paso 2 Login")
            return jsonify({"msg": "OTP inválido"}), 401

        # Si todo es válido, iniciamos sesión
        login_user(user)
        logger.getChild('auth').info(f"Inicio de sesión exitoso para usuario: {username} - Paso 2 Login")
        return jsonify({"msg": "Inicio de sesión exitoso"}), 200
    except Exception as e:
        logger.getChild('auth').error(f"Error en verificación OTP: {str(e)} - Paso 2 Login", exc_info=True)
        return jsonify({"msg": "Error interno del servidor", "code": "internal_server_error"}), 500


#Verificar si el usuario esta autenticado (Se suele ejecutar en todas las rutas)
@bp.route('/api/v1/is-loged', methods=['POST'])
def is_logged():
    """
    - Verifica si hay un usuario con sesión activa.
    - Retorna el estado de autenticación y, si está autenticado, el email del usuario.
    - Esta función se utiliza para validar el estado de la sesión en el cliente.
    """
    try:
        # Comprobar si hay un usuario autenticado en la sesión actual
        if current_user.is_authenticated:
            # Usuario autenticado, devolver información básica
            logger.getChild('auth').info(f"Verificación de sesión: Usuario {current_user.email} autenticado")
            return jsonify({"logged_in": True, "username": current_user.email}), 200
        else:
            # No hay usuario autenticado
            logger.getChild('auth').info("Verificación de sesión: Usuario no autenticado")
            return jsonify({"logged_in": False}), 200
    except Exception as e:
        # Manejar cualquier error inesperado
        logger.getChild('auth').error(f"Error en verificación de sesión: {str(e)}")
        return jsonify({"msg": "Error interno del servidor", "code": "internal_server_error"}), 500


@bp.route('/api/v1/logout', methods=['POST'])
def logout():
    """
    - Cierra la sesión del usuario actualmente autenticado.
    - Registra la acción en los logs del sistema.
    - Funciona incluso si no hay usuario autenticado (devuelve éxito igualmente).
    """
    try:
        # Verificar si hay un usuario con sesión activa
        if current_user.is_authenticated:
            # Guardar el email antes de cerrar sesión para el registro de logs
            user_email = current_user.email
            
            # Cerrar sesión del usuario actual
            logout_user()
            
            # Registrar el cierre de sesión exitoso
            logger.getChild('auth').info(f"Cierre de sesión exitoso para usuario: {user_email}")
        else:
            # Registrar intento de cierre sin sesión activa
            logger.getChild('auth').warning("Intento de cierre de sesión sin usuario autenticado")
        
        # Siempre devolver éxito, independientemente de si había sesión o no
        return jsonify({"msg": "Sesión cerrada exitosamente"}), 200
    except Exception as e:
        # Manejar cualquier error inesperado
        logger.getChild('auth').error(f"Error en cierre de sesión: {str(e)}", exc_info=True)
        return jsonify({"msg": "Error interno del servidor", "code": "internal_server_error"}), 500



# @bp.route('/api/v1/user', methods=['GET'])
# @login_required
# def get_user_id():
#     """
#     Ruta protegida que devuelve la información del usuario autenticado.
#     Flask-Login garantiza que solo los usuarios autenticados puedan acceder a esta ruta.
#     """
#     try:
#         logger.getChild('auth').info(f"Solicitud de información de usuario para: {current_user.email}")
#         return jsonify({"user_id": current_user.id, "email": current_user.email}), 200
#     except Exception as e:
#         logger.getChild('auth').error(f"Error al obtener información del usuario: {str(e)}", exc_info=True)
#         return jsonify({"msg": "Error al obtener el usuario", "error": str(e)}), 500

    
#Para actualizar la contraseña del usuario
@bp.route('/api/v1/reset-password', methods=['POST'])
@login_required
def change_password():
    """
    - Permite al usuario cambiar su contraseña.
    - Valida que la contraseña actual sea correcta.
    - Verifica que la nueva contraseña y su confirmación coincidan.
    - Requiere que el usuario esté autenticado.
    - Actualiza la contraseña en la base de datos.
    """
    try:
        logger.getChild('auth').info(f"Usuario {current_user.id} solicitando cambio de contraseña")
        
        # Obtener datos de la solicitud
        data = request.json
        current_password = data.get("current_password")
        new_password = data.get("new_password")
        confirm_password = data.get("confirm_password")

        # Validar que todos los campos necesarios estén presentes
        if not all([current_password, new_password, confirm_password]):
            logger.getChild('auth').warning(f"Usuario {current_user.id}: Faltan campos requeridos para cambio de contraseña")
            return jsonify({"msg": "Todos los campos son requeridos"}), 400

        # Validar que las nuevas contraseñas coincidan
        if new_password != confirm_password:
            logger.getChild('auth').warning(f"Usuario {current_user.id}: Las contraseñas nuevas no coinciden")
            return jsonify({"msg": "Las contraseñas no coinciden"}), 400

        # Verificar contraseña actual
        if not current_user.check_password(current_password):
            logger.getChild('auth').warning(f"Usuario {current_user.id}: Contraseña actual incorrecta en intento de cambio")
            return jsonify({"msg": "La contraseña actual es incorrecta"}), 401

        # Validar longitud mínima de la nueva contraseña
        if len(new_password) < 6:
            logger.getChild('auth').warning(f"Usuario {current_user.id}: Contraseña nueva demasiado corta")
            return jsonify({"msg": "La nueva contraseña debe tener al menos 6 caracteres"}), 400

        # Actualizar la contraseña
        current_user.set_password(new_password)
        db.session.commit()
        
        logger.getChild('auth').info(f"Contraseña cambiada exitosamente para usuario {current_user.id}")
        return jsonify({"msg": "Contraseña cambiada exitosamente"}), 200
    
    except Exception as e:
        logger.getChild('auth').error(f"Error al cambiar contraseña para usuario {current_user.id}: {str(e)}", exc_info=True)
        db.session.rollback()
        return jsonify({"msg": "Error interno del servidor"}), 500


#Para actualizar la contraseña del usuario a través de un token
@bp.route('/api/v1/reset-password-token/<token>', methods=['POST'])
def reset_password(token):
    """
    - Verifica que el usuario no esté ya autenticado.
    - Comprueba si el token ya ha sido revocado.
    - Verifica el token JWT y obtiene al usuario asociado.
    - Valida que las contraseñas coincidan y cumplan con los requisitos.
    - Actualiza la contraseña del usuario y revoca el token.
    - Retorna OK o error.
    """
    try:
        logger.getChild('auth').info(f"Intento de restablecimiento de contraseña con token")
        
        # Verifica que el usuario no esté ya autenticado
        if current_user.is_authenticated:
            logger.getChild('auth').warning(f"Intento de restablecimiento de contraseña por usuario ya autenticado: {current_user.email}")
            return jsonify({"message": "Usuario ya autenticado"}), 400
        
        # Verificar si el token ya está revocado en la base de datos
        if JWTToken.find(token) is not None:
            logger.getChild('auth').warning(f"Intento de uso de token ya revocado para restablecimiento de contraseña")
            return jsonify({"message": "El token ya ha sido utilizado o revocado"}), 400

        # Verificar el token y obtener el usuario
        user = User.verify_reset_password_token(token)
        if not user:
            logger.getChild('auth').warning(f"Token inválido o expirado para restablecimiento de contraseña")
            return jsonify({"message": "Token inválido o expirado"}), 400

        # Obtener los datos de la solicitud
        data = request.get_json()
        if not data or 'password' not in data or 'confirmPassword' not in data:
            logger.getChild('auth').warning(f"Datos incompletos en solicitud de restablecimiento de contraseña")
            return jsonify({"message": "Se requieren ambos campos: 'password' y 'confirmPassword'"}), 400
        
        password = data['password']
        confirm_password = data['confirmPassword']

        # Validar que ambas contraseñas coincidan
        if password != confirm_password:
            logger.getChild('auth').warning(f"Las contraseñas no coinciden en restablecimiento para usuario: {user.email}")
            return jsonify({"message": "Las contraseñas no coinciden"}), 400

        # Validar longitud de la contraseña
        if len(password) < 6:
            logger.getChild('auth').warning(f"Contraseña demasiado corta en restablecimiento para usuario: {user.email}")
            return jsonify({"message": "La contraseña debe tener al menos 6 caracteres"}), 400

        # Actualizar la contraseña
        user.set_password(password)

        # Agregar el token a la tabla de tokens revocados (o utilizados)
        JWTToken.add(token)

        # Confirmar los cambios en la base de datos
        logger.getChild('auth').info(f"Contraseña restablecida exitosamente para usuario: {user.email}")
        return jsonify({"message": "Contraseña actualizada exitosamente"}), 200
    except Exception as e:
        # Manejar cualquier error inesperado
        logger.getChild('auth').error(f"Error en restablecimiento de contraseña: {str(e)}", exc_info=True)
        return jsonify({"message": "Error interno del servidor", "code": "internal_server_error"}), 500


@bp.route('/api/v1/recover-password', methods=['POST'])
def recover_password():
    """
    - Recibe una solicitud para recuperar contraseña con el email del usuario.
    - Verifica que el email corresponda a un usuario registrado.
    - Envía un correo con instrucciones para restablecer la contraseña.
    - Retorna OK o error.
    """
    try:
        logger.getChild('auth').info(f"Solicitud de recuperación de contraseña recibida")
        
        # Obtener y validar los datos de la solicitud
        data = request.get_json()
        if not data or 'email' not in data:
            logger.getChild('auth').warning(f"Solicitud de recuperación sin email")
            return jsonify({"message": "El campo 'email' es obligatorio"}), 400

        email = data['email']
        
        # Buscar al usuario por su email (excluir eliminados)
        user = User.query.filter_by(email=email, deletedAt=None).first()

        if not user:
            # No se encontró un usuario con ese email
            logger.getChild('auth').warning(f"Intento de recuperación para email inexistente: {email}")
            return jsonify({"message": "Correo de recuperación enviado exitosamente"}), 200

        # Ejecutar la función para enviar el correo de recuperación
        send_password_reset_email(user)
        logger.getChild('auth').info(f"Correo de recuperación enviado a: {email}")
        return jsonify({"message": "Correo de recuperación enviado exitosamente"}), 200
    except Exception as e:
        # Manejar cualquier error inesperado
        logger.getChild('auth').error(f"Error en recuperación de contraseña: {str(e)}", exc_info=True)
        return jsonify({"message": "Error interno del servidor", "code": "internal_server_error"}), 500


@bp.route('/api/v1/register', methods=['POST'])
def register():
    """Permite solicitar un enlace de registro sin necesitar un token previo."""
    try:
        data = request.get_json() or {}
        email = data.get('email', '').strip().lower()

        if not email:
            logger.getChild('auth').warning("Solicitud de registro sin email válido")
            return jsonify({"msg": "El campo 'email' es obligatorio"}), 400

        user = User.query.filter_by(email=email, deletedAt=None).first()

        if user:
            if user.is_enabled:
                logger.getChild('auth').info(f"Intento de registro con email ya activo: {email}")
                return jsonify({"msg": "Este email ya tiene una cuenta activa. Inicia sesión o recupera tu contraseña."}), 400

            logger.getChild('auth').info(f"Reenvío de enlace de registro para usuario pendiente: {email}")

            if not user.otp_secret:
                user.otp_secret = pyotp.random_base32()

            if not user.password_hash:
                random_password = ''.join(random.choices(string.ascii_letters + string.digits, k=16))
                user.set_password(random_password)

            db.session.commit()
            send_create_account_email(user)
            return jsonify({"msg": "Ya existe un registro pendiente. Revisa tu correo para continuar."}), 200

        random_password = ''.join(random.choices(string.ascii_letters + string.digits, k=16))
        new_user = User(
            email=email,
            first_name="",
            last_name="",
            is_enabled=False,
        )
        new_user.set_password(random_password)
        new_user.otp_secret = pyotp.random_base32()

        db.session.add(new_user)
        db.session.commit()

        send_create_account_email(new_user)
        logger.getChild('auth').info(f"Usuario pendiente creado y correo enviado: {email}")
        return jsonify({"msg": "Registro iniciado. Revisa tu correo para continuar con la activación."}), 201

    except SQLAlchemyError as e:
        logger.getChild('auth').error(f"Error de base de datos en registro: {str(e)}", exc_info=True)
        db.session.rollback()
        return jsonify({"msg": "Error al crear la cuenta. Inténtalo nuevamente."}), 500
    except Exception as e:
        logger.getChild('auth').error(f"Error inesperado en registro: {str(e)}", exc_info=True)
        db.session.rollback()
        return jsonify({"msg": "Error interno del servidor"}), 500


@bp.route('/api/v1/register-step1/<token>', methods=['POST'])
def register_step1(token):
    """
    - Verifica que password y confirmPassword coincidan.
    - Verifica el token JWT y obtiene al usuario asociado.
    - Actualiza first_name, last_name y password del usuario.
    - Retorna OK o error.
    """
    try:
        logger.getChild('auth').info(f"Intento de registro paso 1 con token")

        # Verificar si el token ya está revocado en la base de datos
        if JWTToken.find(token) is not None:
            logger.getChild('auth').warning(f"Intento de uso de token ya revocado para registro paso 1")
            return jsonify({"msg": "El token ya ha sido utilizado o revocado"}), 400
        
        data = request.json
        first_name = data.get('first_name')
        last_name = data.get('last_name')
        password = data.get('password')
        confirm_password = data.get('confirmPassword')

        # Verifica que todos los campos obligatorios estén presentes
        if not all([token, first_name, last_name, password, confirm_password]):
            logger.getChild('auth').warning(f"Datos incompletos en solicitud de registro paso 1")
            return jsonify({"msg": "Faltan campos requeridos"}), 400

        # Verifica que las contraseñas coincidan
        if password != confirm_password:
            logger.getChild('auth').warning(f"Las contraseñas no coinciden en registro paso 1")
            return jsonify({"msg": "Las contraseñas no coinciden"}), 400

        # Verifica el token y obtiene el usuario
        user = User.verify_verification_token(token)
        if not user:
            logger.getChild('auth').warning(f"Token inválido o expirado para registro paso 1")
            return jsonify({"msg": "Token de registro inválido o expirado"}), 400

        # Actualiza los datos del usuario
        user.first_name = first_name
        user.last_name = last_name
        user.set_password(password)

        # Generar username único si no tiene uno
        if not user.username:
            base_username = user.email.split('@')[0]
            username = base_username
            counter = 1
            # Asegurar que el username sea único (excluir usuarios eliminados)
            while User.query.filter_by(username=username, deletedAt=None).first():
                username = f"{base_username}{counter}"
                counter += 1
            user.username = username

        db.session.commit()

        logger.getChild('auth').info(f"Registro paso 1 completado exitosamente para usuario: {user.email}")
        return jsonify({"msg": "OK"}), 200
    except Exception as e:
        logger.getChild('auth').error(f"Error en registro paso 1: {str(e)}", exc_info=True)
        db.session.rollback()
        return jsonify({"msg": "Error interno del servidor", "code": "internal_server_error"}), 500


@bp.route('/api/v1/otp-qr/<token>', methods=['GET'])
def get_otp_qr(token):
    """
    Dado un <token>, obtenemos al usuario correspondiente y devolvemos 
    el provisioning URI (que se usará para generar el QR).
    """
    try:
        logger.getChild('auth').info(f"Solicitud de QR para OTP con token")
        
        # Verificar si el token ya está revocado en la base de datos
        if JWTToken.find(token) is not None:
            logger.getChild('auth').warning(f"Intento de uso de token ya revocado para obtener QR OTP")
            return jsonify({"message": "El token ya ha sido utilizado o revocado"}), 400
        
        # user.verify_verification_token(token) => Obtiene el user o None si el token es inválido
        user = User.verify_verification_token(token)
        if not user:
            logger.getChild('auth').warning(f"Token inválido o expirado para obtener QR OTP")
            return jsonify({"msg": "Token de registro inválido o expirado"}), 400

        # Obtener la URI de aprovisionamiento
        provisioning_uri = user.get_otp_uri()
        
        logger.getChild('auth').info(f"QR para OTP generado exitosamente para usuario: {user.email}")
        return jsonify({"qr_uri": provisioning_uri}), 200
    except Exception as e:
        logger.getChild('auth').error(f"Error al generar QR para OTP: {str(e)}", exc_info=True)
        return jsonify({"message": "Error interno del servidor", "code": "internal_server_error"}), 500


@bp.route('/api/v1/register-step2/<token>', methods=['POST'])
def register_step2(token):
    """
    Verifica el código OTP de un usuario usando el token para identificarlo.
    Si es correcto, puede iniciar sesión (login_user) o continuar el proceso.
    """
    try:
        logger.getChild('auth').info(f"Intento de registro paso 2 con token")
        
        data = request.json
        otp_code = data.get('otp_code')
        
        # Verificar si el token ya está revocado en la base de datos
        if JWTToken.find(token) is not None:
            logger.getChild('auth').warning(f"Intento de uso de token ya revocado para registro paso 2")
            return jsonify({"message": "El token ya ha sido utilizado o revocado"}), 400

        if not token or not otp_code:
            logger.getChild('auth').warning(f"Datos incompletos en solicitud de registro paso 2")
            return jsonify({"msg": "Faltan parámetros (token, otp_code)"}), 400

        # Obtener el usuario asociado al token
        user = User.verify_verification_token(token)
        if not user:
            logger.getChild('auth').warning(f"Token inválido o expirado para registro paso 2")
            return jsonify({"msg": "Token inválido o expirado"}), 400

        # Verificar el código OTP
        if user.verify_otp(otp_code):
            # Invalidar el token (añadir a la lista de revocación)
            user.is_enabled = True
            JWTToken.add(token)
            logger.getChild('auth').info(f"Registro paso 2 completado exitosamente para usuario: {user.email}")
            return jsonify({"msg": "OTP válido, inicio de sesión exitoso"}), 200
        else:
            logger.getChild('auth').warning(f"OTP inválido en registro paso 2 para usuario: {user.email}")
            return jsonify({"msg": "OTP inválido"}), 401
    except Exception as e:
        logger.getChild('auth').error(f"Error en registro paso 2: {str(e)}", exc_info=True)
        return jsonify({"message": "Error interno del servidor", "code": "internal_server_error"}), 500

