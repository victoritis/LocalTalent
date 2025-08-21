import os
import sys
import unittest
import json
import base64
from io import BytesIO
from sqlalchemy.exc import SQLAlchemyError
from unittest.mock import patch, MagicMock

# Añadir el directorio raíz al path para que se puedan importar todos los módulos correctamente
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from tests.unit.test_auth import AuthBaseTestCase
from app.models import User, Organization, OrgUser, Alert, CVE, CPE # Importar CPE
from app import db, create_app
import pyotp
from werkzeug.utils import secure_filename

class UserProfileTestCase(AuthBaseTestCase):
    def setUp(self):
        super().setUp()
        # Crear usuarios y organizaciones de prueba
        self.user1 = User(
            email='user1@example.com',
            first_name='User',
            last_name='One',
            is_enabled=True,
            special_roles=[]
        )
        self.user1.set_password('password')
        self.user1.generate_otp_secret()

        self.superadmin = User(
            email='superadmin_user@example.com',
            first_name='Super',
            last_name='AdminUser',
            is_enabled=True,
            special_roles=['ROLE_SUPERADMIN']
        )
        self.superadmin.set_password('superpassword')
        self.superadmin.generate_otp_secret()

        self.org1 = Organization(name='Org One User')
        db.session.add_all([self.user1, self.superadmin, self.org1])
        db.session.commit()

        org_user_link = OrgUser(user_id=self.user1.id, organization_id=self.org1.id, roles=['ROLE_ORG_USER'])
        
        # Crear CVE y CPE antes de la Alerta
        self.cve1 = CVE(id='CVE-2023-0001', data={}, cvss_score=7.5, cvss_version='3.1')
        self.cpe_for_alert1 = CPE(id='cpe:/a:vendor:product:1.0', data={'name': 'vendor product 1.0'}) # Corregido: id en lugar de cpe, y data para otros campos
        self.alert1 = Alert(org=self.org1.id, cpe=self.cpe_for_alert1.id, cve='CVE-2023-0001', active=True) # Usar self.cpe_for_alert1.id

        db.session.add_all([org_user_link, self.cve1, self.cpe_for_alert1, self.alert1]) # Añadir el CPE a la sesión
        db.session.commit()

        self.user1_otp = pyotp.TOTP(self.user1.otp_secret).now()
        self.superadmin_otp = pyotp.TOTP(self.superadmin.otp_secret).now()

        # Crear directorio para imágenes de perfil si no existe
        self.upload_folder = os.path.join(self.app.root_path, 'public', 'user_profile')
        os.makedirs(self.upload_folder, exist_ok=True)
        
        # Crear imagen de perfil por defecto para tests
        self.default_image_path = os.path.join(self.app.root_path, 'public', 'static', 'default_profile.png')
        os.makedirs(os.path.dirname(self.default_image_path), exist_ok=True)
        try:
            with open(self.default_image_path, 'wb') as f:
                f.write(base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=")) # 1x1 pixel png
        except IOError:
            pass # Si no se puede crear, los tests que dependen de ella podrían fallar o necesitar mocks

        # Obtener el cliente de pruebas
        self.client = self.app.test_client()

    def tearDown(self):
        # Eliminar archivos de imagen creados durante los tests
        test_image_path = os.path.join(self.upload_folder, f"user_{self.user1.id}_test_image.png")
        if os.path.exists(test_image_path):
            os.remove(test_image_path)
        
        # Eliminar imagen de perfil por defecto si se creó
        # if os.path.exists(self.default_image_path):
        #     os.remove(self.default_image_path) # Comentado para no eliminar entre ejecuciones de test suites

        # Elimina la base de datos y cierra el contexto de la aplicación.
        db.session.remove()
        db.drop_all()
        self.app_context.pop()





    def test_profile_info_unauthenticated(self):
        response = self.client.get('/api/v1/user/profile-info')
        self.assertEqual(response.status_code, 401)
        print("✅ test_profile_info_unauthenticated")

    def test_profile_info_regular_user(self):
        self._login_user(self.user1.email, 'password', self.user1_otp)
        response = self.client.get('/api/v1/user/profile-info')
        self.assertEqual(response.status_code, 200)
        data = response.json
        self.assertEqual(data['email'], self.user1.email)
        self.assertEqual(data['first_name'], self.user1.first_name)
        self.assertTrue(len(data['organizations']) > 0)
        self.assertEqual(data['organizations'][0]['name'], self.org1.name)
        self.assertTrue(len(data['alerts']) > 0)
        self.assertEqual(data['alerts'][0]['cve'], self.cve1.id)
        # Verifica que la imagen por defecto se cargue si no hay imagen de perfil
        if not self.user1.profile_image and os.path.exists(self.default_image_path):
             self.assertIsNotNone(data['profile_image'])
        print("✅ test_profile_info_regular_user")

    def test_get_profile_picture_unauthenticated(self):
        response = self.client.get('/api/v1/user/get-profile-picture')
        self.assertEqual(response.status_code, 401)
        print("✅ test_get_profile_picture_unauthenticated")

    def test_get_profile_picture_no_image(self):
        self._login_user(self.user1.email, 'password', self.user1_otp)
        self.user1.profile_image = None # Asegurar que no hay imagen
        db.session.commit()
        response = self.client.get('/api/v1/user/get-profile-picture')
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json['profile_image'])
        print("✅ test_get_profile_picture_no_image")

    def test_update_profile_unauthenticated(self):
        response = self.client.post('/api/v1/user/update-profile', data={'firstName': 'New'})
        self.assertEqual(response.status_code, 401)
        print("✅ test_update_profile_unauthenticated")

    def test_update_profile_basic_info(self):
        self._login_user(self.user1.email, 'password', self.user1_otp)
        new_first_name = "UpdatedFirst"
        new_last_name = "UpdatedLast"
        response = self.client.post('/api/v1/user/update-profile', data={
            'firstName': new_first_name,
            'lastName': new_last_name
        }, content_type='multipart/form-data')
        self.assertEqual(response.status_code, 200)
        updated_user = db.session.get(User, self.user1.id)
        self.assertEqual(updated_user.first_name, new_first_name)
        self.assertEqual(updated_user.last_name, new_last_name)
        print("✅ test_update_profile_basic_info")

    def test_update_profile_with_image(self):
        self._login_user(self.user1.email, 'password', self.user1_otp)
        
        image_content = b"fakeimagedata"
        image_file = (BytesIO(image_content), "test_image.png")
        
        response = self.client.post('/api/v1/user/update-profile', data={
            'profileImage': image_file
        }, content_type='multipart/form-data')
        
        self.assertEqual(response.status_code, 200)
        updated_user = db.session.get(User, self.user1.id)
        self.assertIsNotNone(updated_user.profile_image)
        self.assertTrue(f"user_{self.user1.id}_test_image.png" in updated_user.profile_image)
        
        # Verificar que el archivo existe
        expected_image_path = os.path.join(self.upload_folder, f"user_{self.user1.id}_test_image.png")
        self.assertTrue(os.path.exists(expected_image_path))
        with open(expected_image_path, 'rb') as f:
            self.assertEqual(f.read(), image_content)
        print("✅ test_update_profile_with_image")

    def test_get_profile_picture_with_image(self):
        self._login_user(self.user1.email, 'password', self.user1_otp)
        
        # Simular subida de imagen primero
        image_content = b"anotherfakeimagedata"
        image_filename = f"user_{self.user1.id}_test_image.png" # Nombre de archivo consistente
        image_path_relative = f"/user_profile/{image_filename}"
        
        # Guardar la imagen simulada
        full_image_path = os.path.join(self.upload_folder, image_filename)
        with open(full_image_path, 'wb') as f:
            f.write(image_content)
        
        self.user1.profile_image = image_path_relative
        db.session.commit()

        response = self.client.get('/api/v1/user/get-profile-picture')
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(response.json['profile_image'])
        
        # Decodificar y verificar el contenido (opcional, pero bueno para asegurar)
        decoded_image_data = base64.b64decode(response.json['profile_image'])
        self.assertEqual(decoded_image_data, image_content)
        print("✅ test_get_profile_picture_with_image")


if __name__ == '__main__':
    unittest.main(verbosity=2)