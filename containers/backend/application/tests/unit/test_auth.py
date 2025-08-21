#!/usr/bin/env python
import os
import sys
import unittest
import json
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy_utils import database_exists, create_database
import pyotp
from unittest.mock import patch

# Establecer variable de entorno para tests
os.environ['UNIT_TESTS'] = 'True'

# Añadir el directorio raíz al path para que se puedan importar todos los módulos correctamente
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app import create_app, db
from app.models import User, JWTToken
from werkzeug.security import generate_password_hash



from config import TestConfig

def setup_test_database():
    engine = create_engine(TestConfig.SQLALCHEMY_DATABASE_URI)
    if not database_exists(engine.url):
        create_database(engine.url)
    return engine

# Llamar a setup_test_database una vez al inicio del módulo
setup_test_database()

from app.auth.email import send_password_reset_email, send_create_account_email

class DummyUser:
    email = "dummy@example.com"
    def get_reset_password_token(self):
        return "dummy-reset-token"
    def get_verification_token(self):
        return "dummy-verification-token"

class EmailTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig) # Necesario para el contexto de config
        self.app_context = self.app.app_context()
        self.app_context.push()
        self.user = DummyUser()

    def tearDown(self):
        self.app_context.pop()



class AuthBaseTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.app_context = self.app.app_context()
        self.app_context.push()
        # Limpiar completamente la BD antes de cada test
        db.drop_all()
        db.create_all()
        self.client = self.app.test_client()

    def tearDown(self):
        db.session.remove()
        # Eliminar los datos de las tablas pero no las tablas en sí
        for table in reversed(db.metadata.sorted_tables):
            db.session.execute(table.delete())
        db.session.commit()
        self.app_context.pop()

    def _login_user(self, email, password, otp_code):
        return self.client.post(
            '/api/v1/verify-otp',
            data=json.dumps({
                'username': email,
                'password': password,
                'otp_code': otp_code
            }),
            content_type='application/json'
        )

class AuthLoginTestCase(AuthBaseTestCase):
    """
    Clase de prueba para las funcionalidades de autenticación.
    Prueba los endpoints:
    - /api/v1/check-credentials
    - /api/v1/verify-otp
    - /api/v1/is-loged
    - /api/v1/logout
    """

    def setUp(self):
        """
        Configura el entorno de prueba creando un usuario de prueba con todos los campos necesarios,
        incluyendo el secreto OTP para autenticación de dos factores.
        """
        super().setUp()
        
        # Crear usuario de prueba para los tests de autenticación
        self.test_user = User(
            email='login_test@example.com',
            first_name='Login',
            last_name='Test',
            is_enabled=True,
            special_roles=[]
        )
        
        self.test_user.set_password('test_password')
        # Generar el secreto OTP
        self.test_user.generate_otp_secret()
        
        # Crear un usuario deshabilitado para pruebas
        self.disabled_user = User(
            email='disabled@example.com',
            first_name='Disabled',
            last_name='User',
            is_enabled=False,
            special_roles=[]
        )
        self.disabled_user.set_password('test_password')
        self.disabled_user.generate_otp_secret()
        
        db.session.add(self.test_user)
        db.session.add(self.disabled_user)
        db.session.commit()
        
        # Generar un código OTP válido para pruebas
        self.valid_otp = pyotp.TOTP(self.test_user.otp_secret).now()
        
        # self.client ya está en AuthBaseTestCase.setUp()

    def tearDown(self):
        super().tearDown()

    def test_check_credentials_missing_fields(self):
        """
        Propósito: Verificar que el sistema rechace solicitudes sin username o password.
        Comportamiento esperado: Código 400 y mensaje indicando que se requieren ambos campos.
        """
        # Prueba sin username
        response = self.client.post(
            '/api/v1/check-credentials',
            data=json.dumps({'password': 'test_password'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('requieren', response.json['msg'])
        
        # Prueba sin password
        response = self.client.post(
            '/api/v1/check-credentials',
            data=json.dumps({'username': 'login_test@example.com'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('requieren', response.json['msg'])
        
        # Prueba sin ningún campo
        response = self.client.post(
            '/api/v1/check-credentials',
            data=json.dumps({}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('requieren', response.json['msg'])
        print("✅ test_check_credentials_missing_fields")

    def test_check_credentials_nonexistent_user(self):
        """
        Propósito: Verificar que el sistema rechace credenciales con un usuario inexistente.
        Comportamiento esperado: Código 401 y mensaje de credenciales inválidas.
        """
        response = self.client.post(
            '/api/v1/check-credentials',
            data=json.dumps({
                'username': 'nonexistent@example.com',
                'password': 'test_password'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 401)
        self.assertIn('inválidas', response.json['msg'])
        print("✅ test_check_credentials_nonexistent_user")

    def test_check_credentials_wrong_password(self):
        """
        Propósito: Verificar que el sistema rechace credenciales con contraseña incorrecta.
        Comportamiento esperado: Código 401 y mensaje de credenciales inválidas.
        """
        response = self.client.post(
            '/api/v1/check-credentials',
            data=json.dumps({
                'username': 'login_test@example.com',
                'password': 'wrong_password'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 401)
        self.assertIn('inválidas', response.json['msg'])
        print("✅ test_check_credentials_wrong_password")

    def test_check_credentials_disabled_account(self):
        """
        Propósito: Verificar que el sistema rechace credenciales de una cuenta deshabilitada.
        Comportamiento esperado: Código 403 y mensaje indicando que la cuenta está inactiva.
        """
        response = self.client.post(
            '/api/v1/check-credentials',
            data=json.dumps({
                'username': 'disabled@example.com',
                'password': 'test_password'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 403)
        self.assertIn('inactiva', response.json['msg'])
        print("✅ test_check_credentials_disabled_account")

    def test_check_credentials_valid(self):
        """
        Propósito: Verificar que el sistema acepte credenciales válidas.
        Comportamiento esperado: Código 200 y mensaje de credenciales válidas.
        """
        response = self.client.post(
            '/api/v1/check-credentials',
            data=json.dumps({
                'username': 'login_test@example.com',
                'password': 'test_password'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn('válidas', response.json['msg'])
        print("✅ test_check_credentials_valid")

    def test_verify_otp_missing_fields(self):
        """
        Propósito: Verificar que el sistema rechace solicitudes sin los campos requeridos.
        Comportamiento esperado: Código 400 y mensaje indicando que faltan parámetros.
        """
        # Sin username
        response = self.client.post(
            '/api/v1/verify-otp',
            data=json.dumps({
                'password': 'test_password',
                'otp_code': self.valid_otp
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('Faltan parámetros', response.json['msg'])
        
        # Sin password
        response = self.client.post(
            '/api/v1/verify-otp',
            data=json.dumps({
                'username': 'login_test@example.com',
                'otp_code': self.valid_otp
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('Faltan parámetros', response.json['msg'])
        
        # Sin otp_code
        response = self.client.post(
            '/api/v1/verify-otp',
            data=json.dumps({
                'username': 'login_test@example.com',
                'password': 'test_password'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('Faltan parámetros', response.json['msg'])
        print("✅ test_verify_otp_missing_fields")

    def test_verify_otp_nonexistent_user(self):
        """
        Propósito: Verificar que el sistema rechace verificación OTP para usuario inexistente.
        Comportamiento esperado: Código 404 y mensaje indicando que el usuario no existe.
        """
        response = self.client.post(
            '/api/v1/verify-otp',
            data=json.dumps({
                'username': 'nonexistent@example.com',
                'password': 'test_password',
                'otp_code': '123456'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 404)
        self.assertIn('no encontrado', response.json['msg'])
        print("✅ test_verify_otp_nonexistent_user")

    def test_verify_otp_wrong_password(self):
        """
        Propósito: Verificar que el sistema rechace verificación OTP con contraseña incorrecta.
        Comportamiento esperado: Código 401 y mensaje indicando contraseña incorrecta.
        """
        response = self.client.post(
            '/api/v1/verify-otp',
            data=json.dumps({
                'username': 'login_test@example.com',
                'password': 'wrong_password',
                'otp_code': self.valid_otp
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 401)
        self.assertIn('incorrecta', response.json['msg'])
        print("✅ test_verify_otp_wrong_password")

    def test_verify_otp_disabled_account(self):
        """
        Propósito: Verificar que el sistema rechace verificación OTP para cuenta deshabilitada.
        Comportamiento esperado: Código 403 y mensaje indicando cuenta inactiva.
        """
        response = self.client.post(
            '/api/v1/verify-otp',
            data=json.dumps({
                'username': 'disabled@example.com',
                'password': 'test_password',
                'otp_code': '123456'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 403)
        self.assertIn('inactiva', response.json['msg'])
        print("✅ test_verify_otp_disabled_account")

    def test_verify_otp_invalid_code(self):
        """
        Propósito: Verificar que el sistema rechace verificación con código OTP inválido.
        Comportamiento esperado: Código 401 y mensaje indicando OTP inválido.
        """
        response = self.client.post(
            '/api/v1/verify-otp',
            data=json.dumps({
                'username': 'login_test@example.com',
                'password': 'test_password',
                'otp_code': '000000'  # Código inválido
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 401)
        self.assertIn('inválido', response.json['msg'])
        print("✅ test_verify_otp_invalid_code")

    def test_verify_otp_valid(self):
        """
        Propósito: Verificar que el sistema acepte verificación OTP con datos válidos.
        Comportamiento esperado: Código 200 y mensaje de inicio de sesión exitoso.
        """
        response = self.client.post(
            '/api/v1/verify-otp',
            data=json.dumps({
                'username': self.test_user.email, # Usar el email del usuario de prueba
                'password': 'test_password',
                'otp_code': self.valid_otp # Usar el OTP generado en setUp
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn('exitoso', response.json['msg'])
        print("✅ test_verify_otp_valid")

    def test_is_logged_not_authenticated(self):
        """
        Verifica que el sistema detecte correctamente cuando NO hay sesión activa.
        """
        # Limpiar toda la sesión del cliente principal
        with self.client.session_transaction() as session:
            session.clear()
        
        # Crear nuevo cliente temporal
        with self.app.test_client() as temp_client:
            response = temp_client.post('/api/v1/is-loged')
            
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json['logged_in'], False)
        print("✅ test_is_logged_not_authenticated")

    def test_is_logged_authenticated(self):
        """
        Verifica que el sistema detecte correctamente cuando hay sesión activa.
        """
        # Login primero
        login_response = self._login_user(self.test_user.email, 'test_password', self.valid_otp)
        self.assertEqual(login_response.status_code, 200)
        
        response = self.client.post('/api/v1/is-loged')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json['logged_in'])
        self.assertEqual(response.json['username'], self.test_user.email)
        print("✅ test_is_logged_authenticated")

    def test_logout_not_authenticated(self):
        """
        Propósito: Verificar que el sistema maneje correctamente el cierre de sesión sin usuario autenticado.
        Comportamiento esperado: Código 200 y mensaje de sesión cerrada exitosamente.
        """
        response = self.client.post('/api/v1/logout')
        self.assertEqual(response.status_code, 200)
        self.assertIn('exitosamente', response.json['msg'])
        print("✅ test_logout_not_authenticated")

    def test_logout_authenticated(self):
        """
        Propósito: Verificar el cierre de sesión de un usuario autenticado.
        Comportamiento esperado: Código 200, mensaje de sesión cerrada y sesión invalidada.
        """
        # Login primero
        login_response = self._login_user(self.test_user.email, 'test_password', self.valid_otp)
        self.assertEqual(login_response.status_code, 200)

        # Verificar que está logueado
        check_response = self.client.post('/api/v1/is-loged')
        self.assertTrue(check_response.json['logged_in'])

        # Logout
        logout_response = self.client.post('/api/v1/logout')
        self.assertEqual(logout_response.status_code, 200)
        self.assertIn('exitosamente', logout_response.json['msg'])

        # Verificar que ya no está logueado
        final_check_response = self.client.post('/api/v1/is-loged')
        self.assertEqual(final_check_response.status_code, 200)
        self.assertFalse(final_check_response.json['logged_in'])
        print("✅ test_logout_authenticated")


class UserRegistrationTestCase(AuthBaseTestCase):
    def setUp(self):
        super().setUp()
        
        # Crear usuario temporal con datos básicos
        self.temp_email = "register_temp@example.com"
        self.temp_password = "TempPass123!"
        
        # Eliminar usuario si ya existe
        User.query.filter_by(email=self.temp_email).delete()
        
        # Crear usuario temporal deshabilitado
        self.temp_user = User(
            email=self.temp_email,
            first_name="temp",
            last_name="user",
            is_enabled=False
        )
        self.temp_user.set_password(self.temp_password)
        self.temp_user.generate_otp_secret()
        
        db.session.add(self.temp_user)
        db.session.commit()
        
        # Generar token de verificación para el usuario temporal
        self.verification_token = self.temp_user.get_verification_token()
        
        # Crear usuario adicional para pruebas de autenticación
        self.new_email = "nuevo_usuario@example.com"
        User.query.filter_by(email=self.new_email).delete()
        
        self.new_user = User(
            email=self.new_email,
            first_name="Nuevo",
            last_name="Usuario",
            is_enabled=True
        )
        self.new_user.set_password('nueva_contraseña')
        self.new_user.generate_otp_secret()
        db.session.add(self.new_user)
        db.session.commit()
        
        # self.client ya está en AuthBaseTestCase.setUp()

    def tearDown(self):
        super().tearDown()

    def test_register_step1(self):
        """Test para el primer paso del registro con token válido"""
        # Datos de prueba actualizados
        new_user_data = {
            "first_name": "NuevoNombre",
            "last_name": "NuevoApellido",
            "password": "NuevaPass123!",
            "confirmPassword": "NuevaPass123!"
        }

        # Realizar petición POST con el token en la URL
        response = self.client.post(
            f'/api/v1/register-step1/{self.verification_token}',
            data=json.dumps(new_user_data),
            content_type='application/json'
        )

        # Verificaciones
        self.assertEqual(response.status_code, 200)
        
        # Verificar actualización de datos del usuario
        updated_user = User.query.filter_by(email=self.temp_email).first()
        self.assertEqual(updated_user.first_name, "NuevoNombre")
        self.assertEqual(updated_user.last_name, "NuevoApellido")
        self.assertTrue(updated_user.check_password("NuevaPass123!"))
        
        # Autenticar con OTP real para el nuevo usuario
        totp = pyotp.TOTP(self.new_user.otp_secret)
        current_otp = totp.now()
        
        login_response = self.client.post(
            '/api/v1/verify-otp',
            data=json.dumps({
                'username': self.new_email,
                'password': 'nueva_contraseña',
                'otp_code': current_otp
            }),
            content_type='application/json'
        )
        self.assertEqual(login_response.status_code, 200)
        
        # Verificar sesión activa
        check_session = self.client.post('/api/v1/is-loged')
        self.assertTrue(check_session.json['logged_in'])
        self.assertEqual(check_session.json['username'], self.new_email)
        
        # Cerrar sesión
        logout_response = self.client.post('/api/v1/logout')
        self.assertEqual(logout_response.status_code, 200)
        self.assertIn('exitosamente', logout_response.json['msg'])
        
        # Verificar sesión cerrada
        post_logout_check = self.client.post('/api/v1/is-loged')
        self.assertFalse(post_logout_check.json['logged_in'])
        
        print("✅ test_register_step1")
        

    def test_otp_qr_generation(self):
        """Test para la generación del QR OTP"""
        # Obtener el QR URI
        response = self.client.get(
            f'/api/v1/otp-qr/{self.verification_token}',
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn('qr_uri', response.json)
        
        # Obtener el usuario temporal
        user = User.query.filter_by(email=self.temp_email).first()
        
        # Parsear el URI del QR para obtener el objeto TOTP
        totp_obj = pyotp.parse_uri(response.json['qr_uri'])
        
        # Generar el código OTP actual
        current_otp = totp_obj.now()
        
        # Verificar que el código generado sea válido para el usuario
        self.assertTrue(user.verify_otp(current_otp), "El código OTP generado no es válido")
        
        print("✅ test_otp_qr_generation")
        
        # No devolver valores para evitar advertencias de deprecación
        self.verification_token = response.json.get('token', self.verification_token)
                
    def test_register_step2(self):
        """Test para el segundo paso del registro (activación con OTP)"""
        
        # Obtener el token de verificación
        verification_token = self.verification_token
        
        # Obtener el usuario temporal
        user = User.query.filter_by(email=self.temp_email).first()
        
        # Generar un código OTP real usando el secreto del usuario
        totp = pyotp.TOTP(user.otp_secret)
        current_otp = totp.now()
        
        # Opcionalmente, puedes usar un mock si prefieres no depender del tiempo real
        # original_verify_otp = User.verify_otp
        # User.verify_otp = lambda self, code: True
        
        try:
            response = self.client.post(
                f'/api/v1/register-step2/{verification_token}',
                data=json.dumps({'otp_code': current_otp}),  # Usar el OTP real generado
                content_type='application/json'
            )
            self.assertEqual(response.status_code, 200)
            self.assertIn('exitoso', response.json['msg'])
            
            # Verificar que el usuario está activado
            updated_user = User.query.filter_by(email=self.temp_email).first()
            self.assertIsNotNone(updated_user)
            self.assertTrue(updated_user.is_enabled)
            
            # Verificar que el token ha sido revocado
            revoked_token = JWTToken.find(verification_token)
            self.assertIsNotNone(revoked_token)
            
            print("✅ test_register_step2")
        finally:
            # Si usaste un mock, restaura la función original
            # User.verify_otp = original_verify_otp
            pass


class AuthResetPasswordTestCase(AuthBaseTestCase):
    """
    Clase de prueba para las funcionalidades de recuperación y restablecimiento de contraseña.
    Prueba los endpoints:
    - /api/v1/recover-password
    - /api/v1/reset-password-token/<token>
    """
    
    def setUp(self):
        super().setUp()
        
        # Crear usuario
        self.test_user = User(
            email='reset_test@example.com',
            first_name='Test',
            last_name='User',
            is_enabled=True
        )
        self.test_user.set_password('original_password')
        self.test_user.generate_otp_secret() # Asegurar que tiene OTP secret
        db.session.add(self.test_user)
        db.session.commit()
        
        self.test_user_otp = pyotp.TOTP(self.test_user.otp_secret).now()
        # self.client ya está en AuthBaseTestCase.setUp()
    
    def tearDown(self):
        super().tearDown()
    
    def test_recover_password_missing_email(self):
        """
        Propósito: Verificar que el sistema rechace solicitudes de recuperación de contraseña
        que no incluyen el campo 'email'.
        
        Comportamiento esperado: Código 400 y mensaje indicando que el email es obligatorio.
        """
        response = self.client.post(
            '/api/v1/recover-password',
            data=json.dumps({}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('obligatorio', response.json['message'])
        print("✅ test_recover_password_missing_email")
    
    def test_recover_password_non_existent_email(self):
        """
        Propósito: Verificar que el sistema responda correctamente cuando se solicita
        recuperar la contraseña para un email que no existe en la base de datos.
        
        Comportamiento esperado: Código 200 y mensaje de éxito (por seguridad, no revela 
        si el email existe o no).
        """
        response = self.client.post(
            '/api/v1/recover-password',
            data=json.dumps({'email': 'nonexistent@example.com'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn('exitosa', response.json['message'])
        print("✅ test_recover_password_non_existent_email")
    
    def test_recover_password_valid_email(self):
        """
        Propósito: Verificar que el sistema procese correctamente una solicitud de 
        recuperación de contraseña para un email válido y registrado.
        
        Comportamiento esperado: Código 200 y mensaje de éxito, indicando que se ha 
        enviado un correo de recuperación.
        """
        response = self.client.post(
            '/api/v1/recover-password',
            data=json.dumps({'email': 'reset_test@example.com'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn('exitosa', response.json['message'])
        print("✅ test_recover_password_valid_email")
   
    def test_reset_password_invalid_token(self):
        """
        Propósito: Verificar que el sistema rechace intentos de restablecer contraseña 
        con un token inválido o mal formado.
        
        Comportamiento esperado: Código 400 y mensaje indicando que el token es inválido.
        """
        response = self.client.post(
            '/api/v1/reset-password-token/invalid_token',
            data=json.dumps({
                'password': 'new_password',
                'confirmPassword': 'new_password'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('inválido', response.json['message'])
        print("✅ test_reset_password_invalid_token")
    
    def test_reset_password_revoked_token(self):
        """
        Propósito: Verificar que el sistema rechace intentos de restablecer contraseña 
        con un token que ya ha sido utilizado o revocado.
        
        Comportamiento esperado: Código 400 y mensaje indicando que el token ya ha sido utilizado.
        """
        # Generar y revocar token primero
        # Necesitamos el usuario de la base de datos para generar el token
        user_for_token = User.query.filter_by(email=self.test_user.email).first()
        token = user_for_token.get_reset_password_token()
        JWTToken.add(token)
        db.session.commit() # Asegurar que el token revocado se guarde
        
        response = self.client.post(
            f'/api/v1/reset-password-token/{token}',
            data=json.dumps({
                'password': 'new_password',
                'confirmPassword': 'new_password'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('revocado', response.json['message'])
        print("✅ test_reset_password_revoked_token")
    
    def test_reset_password_missing_fields(self):
        """
        Propósito: Verificar que el sistema rechace solicitudes de restablecimiento de contraseña 
        que no incluyen los campos requeridos (password y confirmPassword).
        
        Comportamiento esperado: Código 400 y mensaje indicando que faltan campos requeridos.
        """
        # Necesitamos el usuario de la base de datos para generar el token
        user_for_token = User.query.filter_by(email=self.test_user.email).first()
        token = user_for_token.get_reset_password_token()
        response = self.client.post(
            f'/api/v1/reset-password-token/{token}',
            data=json.dumps({}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('requieren', response.json['message'])
        print("✅ test_reset_password_missing_fields")
    
    def test_change_password_wrong_current_password_logged_in(self):
        """
        Propósito: Verificar que el sistema rechace intentos de cambio de contraseña
        cuando la contraseña actual proporcionada es incorrecta, estando logueado.
        Comportamiento esperado: Código 401 y mensaje de error.
        """
        # Login user
        login_resp = self._login_user(self.test_user.email, 'original_password', self.test_user_otp)
        self.assertEqual(login_resp.status_code, 200)

        response = self.client.post(
            '/api/v1/reset-password',
            data=json.dumps({
                'current_password': 'wrong_password',
                'new_password': 'new_secure_password123',
                'confirm_password': 'new_secure_password123'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 401)
        self.assertIn('actual es incorrecta', response.json['msg'])
        print("✅ test_change_password_wrong_current_password_logged_in")
    
    def test_reset_password_mismatched_passwords(self):
        """
        Propósito: Verificar que el sistema rechace solicitudes donde la contraseña 
        y su confirmación no coinciden.
        
        Comportamiento esperado: Código 400 y mensaje indicando que las contraseñas no coinciden.
        """
        # Necesitamos el usuario de la base de datos para generar el token
        user_for_token = User.query.filter_by(email=self.test_user.email).first()
        token = user_for_token.get_reset_password_token()
        response = self.client.post(
            f'/api/v1/reset-password-token/{token}',
            data=json.dumps({
                'password': 'new_password',
                'confirmPassword': 'different_password'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('coinciden', response.json['message'])
        print("✅ test_reset_password_mismatched_passwords")
        
    def test_reset_password_token_short_password(self):
        """
        Verifica que el sistema rechace contraseñas cortas (<6 caracteres)
        al usar el flujo de reseteo por token.
        """
        user_for_token = User.query.filter_by(email=self.test_user.email).first()
        token = user_for_token.get_reset_password_token()
        
        response = self.client.post(
            f'/api/v1/reset-password-token/{token}',
            data=json.dumps({
                'password': 'short',
                'confirmPassword': 'short'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('al menos 6 caracteres', response.json['message'])
        print("✅ test_reset_password_token_short_password")

    def test_change_password_short_new_password_logged_in(self):
        """
        Verifica que el sistema rechace contraseñas cortas (<6 caracteres)
        usando el flujo de cambio de contraseña estando logueado.
        """
        # Login user
        login_resp = self._login_user(self.test_user.email, 'original_password', self.test_user_otp)
        self.assertEqual(login_resp.status_code, 200)
        
        response = self.client.post(
            '/api/v1/reset-password',
            data=json.dumps({
                'current_password': 'original_password',
                'new_password': 'short',
                'confirm_password': 'short'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('al menos 6 caracteres', response.json['msg'])
        
        # Limpieza en la sesión para evitar contaminación con otros tests
        with self.client.session_transaction() as session:
            session.clear()
        print("✅ test_change_password_short_new_password_logged_in")

    def test_change_password_missing_fields_logged_in(self):
        login_resp = self._login_user(self.test_user.email, 'original_password', self.test_user_otp)
        self.assertEqual(login_resp.status_code, 200)
        response = self.client.post(
            '/api/v1/reset-password',
            data=json.dumps({'current_password': 'original_password'}), 
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('Todos los campos son requeridos', response.json['msg'])
        print("✅ test_change_password_missing_fields_logged_in")

    def test_change_password_mismatched_new_passwords_logged_in(self):
        login_resp = self._login_user(self.test_user.email, 'original_password', self.test_user_otp)
        self.assertEqual(login_resp.status_code, 200)
        response = self.client.post(
            '/api/v1/reset-password',
            data=json.dumps({
                'current_password': 'original_password',
                'new_password': 'new_secure_password123',
                'confirm_password': 'another_new_secure_password123'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('Las contraseñas no coinciden', response.json['msg'])
        print("✅ test_change_password_mismatched_new_passwords_logged_in")

    def test_change_password_success_logged_in(self):
        login_resp = self._login_user(self.test_user.email, 'original_password', self.test_user_otp)
        self.assertEqual(login_resp.status_code, 200)
        
        new_password = 'new_changed_password123'
        response = self.client.post(
            '/api/v1/reset-password',
            data=json.dumps({
                'current_password': 'original_password',
                'new_password': new_password,
                'confirm_password': new_password
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn('Contraseña cambiada exitosamente', response.json['msg'])

        db.session.refresh(self.test_user)
        self.assertTrue(self.test_user.check_password(new_password))
        self.assertFalse(self.test_user.check_password('original_password'))
        print("✅ test_change_password_success_logged_in")
    
    def test_reset_password_success(self):
        """
        Propósito: Verificar que el sistema procese correctamente una solicitud válida
        de restablecimiento de contraseña.
        
        Comportamiento esperado: Código 200, mensaje de éxito y contraseña actualizada.
        """
        # Use an existing test user
        test_user = User.query.filter_by(email='reset_test@example.com').first()
        if not test_user:
            self.fail("Test user 'reset_test@example.com' not found. Ensure it exists in the database.")

        # Store the original password hash
        old_password_hash = test_user.password_hash

        # Log out any existing session (importante si este test corre después de otros que loguean)
        self.client.post('/api/v1/logout')

        # Verify user is logged out
        session_check = self.client.post('/api/v1/is-loged')
        self.assertFalse(session_check.json['logged_in'])

        # Generate reset password token
        token = test_user.get_reset_password_token()

        # Attempt to reset the password
        response = self.client.post(
            f'/api/v1/reset-password-token/{token}',
            data=json.dumps({
                'password': 'new_secure_password123',
                'confirmPassword': 'new_secure_password123'
            }),
            content_type='application/json'
        )

        # Verify response
        self.assertEqual(response.status_code, 200, f"Unexpected response: {response.data}")
        self.assertIn('exitosa', response.json['message'])

        # Refresh user and verify password change
        db.session.refresh(test_user)
        self.assertNotEqual(old_password_hash, test_user.password_hash)

        # Verify token is revoked
        revoked_token = JWTToken.find(token)
        self.assertIsNotNone(revoked_token)

        # Reset the password back to the original for future tests
        # Esto es importante si otros tests dependen del estado original
        test_user.set_password('original_password')
        db.session.commit()
        print("✅ test_reset_password_success")


if __name__ == '__main__':
    # Importar CustomTestRunner del módulo de utils si se va a usar
    # from tests.unit.test_utils import CustomTestRunner
    # runner = CustomTestRunner(verbosity=2)
    # unittest.main(testRunner=runner)
    unittest.main(verbosity=2)

