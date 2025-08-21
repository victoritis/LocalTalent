## test_auth.py
import os
import sys
# Añadir el directorio raíz al path para imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
import unittest
import json
from tests.integration.test_base import BaseTestCase
from app.models import User, JWTToken
from datetime import datetime, timezone
import pyotp
from app import db

class AuthTestCase(BaseTestCase):

    class AuthLoginTestCase(BaseTestCase):
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

        def test_logout_authenticated(self):
            """
            Verifica el cierre de sesión de un usuario autenticado con OTP real
            """
            # Crear nuevo usuario con todos los campos requeridos
            new_user = User(
                email='nuevo_usuario@example.com',
                first_name='Nombre',
                last_name='Apellido',
                is_enabled=True,
                special_roles=[]
            )
            new_user.set_password('nueva_contraseña')
            new_user.generate_otp_secret()  # Generar secreto OTP
            db.session.add(new_user)
            db.session.commit()

            # 1. Obtener código OTP actual usando el secreto del usuario
            totp = pyotp.TOTP(new_user.otp_secret)
            current_otp = totp.now()

            # 2. Autenticar con OTP real
            login_response = self.client.post(
                '/api/v1/verify-otp',
                data=json.dumps({
                    'username': 'nuevo_usuario@example.com',
                    'password': 'nueva_contraseña',
                    'otp_code': current_otp
                }),
                content_type='application/json'
            )
            self.assertEqual(login_response.status_code, 200)

            # 3. Verificar sesión activa
            check_session = self.client.post('/api/v1/is-loged')
            self.assertTrue(check_session.json['logged_in'])
            self.assertEqual(check_session.json['username'], 'nuevo_usuario@example.com')

            # 4. Cerrar sesión
            logout_response = self.client.post('/api/v1/logout')
            self.assertEqual(logout_response.status_code, 200)
            self.assertIn('exitosamente', logout_response.json['msg'])

            # 5. Verificar sesión cerrada
            post_logout_check = self.client.post('/api/v1/is-loged')
            self.assertFalse(post_logout_check.json['logged_in'])

# Registrar la clase para que unittest la encuentre
globals()['AuthLoginTestCase'] = AuthTestCase.AuthLoginTestCase

if __name__ == '__main__':
    # Cargar los casos de prueba
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(AuthTestCase.AuthLoginTestCase)

    # Ejecutar los casos de prueba
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Mostrar resumen personalizado de tests fallidos
    print("\nResumen de tests fallidos:")
    
    if not result.failures and not result.errors:
        print("✅ Todos los tests han pasado correctamente.")
    else:
        # Procesar fallos
        for test, traceback in result.failures + result.errors:
            # Extraer solo el nombre del método de test sin la ruta completa
            test_name = test.id().split('.')[-1]
            # Imprimir en rojo usando códigos ANSI
            print(f"\033[91m❌ Test Fallido: {test_name}\033[0m")
            print(traceback)
