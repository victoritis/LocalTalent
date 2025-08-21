#!/usr/bin/env python
from datetime import datetime, timezone, timedelta
import unittest
import json
import os
import sys
import base64
from io import BytesIO

# Añadir el directorio raíz al path para que se puedan importar todos los módulos correctamente
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from tests.unit.test_auth import AuthBaseTestCase
from app.models import User, Organization, OrgUser, Alert, Product, CVE, CPE # Importar CPE
from app import db
import pyotp


class OrganizationTestCase(AuthBaseTestCase):
    """
    Clase de prueba para las funcionalidades relacionadas con organizaciones.
    Prueba los endpoints:
    - /api/v1/user/organizations
    - /api/v1/organizations/{org_name}/overview
    
    Verifica:
    1. La correcta obtención de organizaciones asociadas al usuario
    2. El control de acceso a vistas de organización no autorizadas
    3. La integridad de los datos en el overview de organizaciones autorizadas
    """
    
    def setUp(self):
        super().setUp()
        self.user_regular = User(email='orgtestuser@example.com', first_name='Org', last_name='User', is_enabled=True)
        self.user_regular.set_password('password')
        self.user_regular.generate_otp_secret()

        self.superadmin = User(email='orgtestsuperadmin@example.com', first_name='OrgSuper', last_name='Admin', is_enabled=True, special_roles=['ROLE_SUPERADMIN'])
        self.superadmin.set_password('superpassword')
        self.superadmin.generate_otp_secret()

        self.org1 = Organization(name='TestCorp')
        self.org2 = Organization(name='AnotherOrg')
        
        # Crear directorio para logos si no existe
        self.logo_upload_folder = os.path.join(self.app.root_path, 'public', 'organizations_logo')
        os.makedirs(self.logo_upload_folder, exist_ok=True)

        # Simular un logo para org1
        self.org1_logo_content = b"org1_logo_data"
        self.org1_logo_filename = f"organization_{self.org1.id}_logo.png" # Asumimos que el ID se asigna antes de esto
        self.org1_logo_path_relative = f"/organizations_logo/{self.org1_logo_filename}"
        # El guardado real del archivo y la asignación de org1.logo_path se haría en un test de creación/actualización de org
        # Aquí solo preparamos los datos para los tests de lectura.
        # Para que `my_organizations` funcione con el logo, el path debe estar en la BD.
        # Y el archivo debe existir en la ruta esperada.
        
        db.session.add_all([self.user_regular, self.superadmin, self.org1, self.org2])
        db.session.commit() # Commit para obtener IDs

        # Actualizar nombre de archivo de logo con ID real y guardar
        self.org1_logo_filename = f"organization_{self.org1.id}_logo.png"
        self.org1_logo_path_relative = f"/organizations_logo/{self.org1_logo_filename}"
        self.org1.logo_path = self.org1_logo_path_relative # Guardar path en BD
        full_logo_path = os.path.join(self.logo_upload_folder, self.org1_logo_filename)
        with open(full_logo_path, 'wb') as f:
            f.write(self.org1_logo_content)
        
        db.session.add(self.org1) # Añadir de nuevo para actualizar logo_path
        db.session.commit()


        # Vincular user_regular a org1
        org_user_link1 = OrgUser(user_id=self.user_regular.id, organization_id=self.org1.id, roles=['ROLE_ORG_USER'])
        db.session.add(org_user_link1)
        db.session.commit()

        self.user_regular_otp = pyotp.TOTP(self.user_regular.otp_secret).now()
        self.superadmin_otp = pyotp.TOTP(self.superadmin.otp_secret).now()

    def tearDown(self):
        # Eliminar logos creados
        if hasattr(self, 'org1_logo_filename'):
            full_logo_path = os.path.join(self.logo_upload_folder, self.org1_logo_filename)
            if os.path.exists(full_logo_path):
                os.remove(full_logo_path)
        super().tearDown()

    def test_get_user_organizations_unauthenticated(self):
        response = self.client.get('/api/v1/user/organizations')
        self.assertEqual(response.status_code, 401)
        print("✅ test_get_user_organizations_unauthenticated")

    def test_get_user_organizations_regular_user(self):
        self._login_user(self.user_regular.email, 'password', self.user_regular_otp)
        response = self.client.get('/api/v1/user/organizations')
        self.assertEqual(response.status_code, 200)
        data = response.json
        self.assertEqual(len(data['organizations']), 1)
        self.assertEqual(data['organizations'][0]['name'], self.org1.name)
        print("✅ test_get_user_organizations_regular_user")

    def test_get_user_organizations_superadmin(self):
        self._login_user(self.superadmin.email, 'superpassword', self.superadmin_otp)
        response = self.client.get('/api/v1/user/organizations')
        self.assertEqual(response.status_code, 200)
        data = response.json
        self.assertEqual(len(data['organizations']), 2) # org1 y org2
        org_names = [org['name'] for org in data['organizations']]
        self.assertIn(self.org1.name, org_names)
        self.assertIn(self.org2.name, org_names)
        print("✅ test_get_user_organizations_superadmin")

    def test_my_organizations_regular_user(self):
        self._login_user(self.user_regular.email, 'password', self.user_regular_otp)
        response = self.client.get('/api/v1/my-organizations')
        self.assertEqual(response.status_code, 200)
        data = response.json
        self.assertEqual(len(data['organizations']), 1)
        self.assertEqual(data['organizations'][0]['name'], self.org1.name)
        self.assertIsNotNone(data['organizations'][0]['logo_data']) # Verifica que el logo se cargue
        self.assertEqual(data['organizations'][0]['roles_in_org'], 'ROLE_ORG_USER')
        print("✅ test_my_organizations_regular_user")

    def test_my_organizations_superadmin(self):
        self._login_user(self.superadmin.email, 'superpassword', self.superadmin_otp)
        response = self.client.get('/api/v1/my-organizations')
        self.assertEqual(response.status_code, 200)
        data = response.json
        self.assertEqual(len(data['organizations']), 2)
        self.assertEqual(data['total_items'], 2)
        # Verificar que el logo de org1 está y el de org2 (sin logo) es None
        org1_data = next(o for o in data['organizations'] if o['name'] == self.org1.name)
        org2_data = next(o for o in data['organizations'] if o['name'] == self.org2.name)
        self.assertIsNotNone(org1_data['logo_data'])
        self.assertIsNone(org2_data['logo_data'])
        self.assertEqual(org1_data['roles_in_org'], 'ROLE_SUPERADMIN')
        print("✅ test_my_organizations_superadmin")

    def test_get_organization_overview_no_access(self):
        # user_regular no tiene acceso a org2
        self._login_user(self.user_regular.email, 'password', self.user_regular_otp)
        response = self.client.get(f'/api/v1/organizations/{self.org2.name}/overview')
        self.assertEqual(response.status_code, 403)
        print("✅ test_get_organization_overview_no_access")



if __name__ == '__main__':
    unittest.main(verbosity=2)
