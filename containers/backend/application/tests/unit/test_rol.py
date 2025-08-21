#!/usr/bin/env python
import os
import unittest
import json
import sys

# Añadir el directorio raíz al path para que se puedan importar todos los módulos correctamente
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from tests.unit.test_auth import AuthBaseTestCase
from app.models import User, Organization, OrgUser
from app import create_app, db
import pyotp

class RolTestCase(AuthBaseTestCase):
    """
    Clase de prueba para verificar la ruta '/api/v1/get-roles'.
    
    Se prueban los siguientes escenarios:
    - Solicitud sin autenticación.
    - Usuario superadmin.
    - Usuario admin de organización.
    - Usuario normal.
    - Simulación de error en la consulta a la base de datos.
    """

    def setUp(self):
        super().setUp()
        # Crear usuarios con diferentes roles
        self.superadmin_user = User(
            email='superadmin@example.com',
            first_name='Super',
            last_name='Admin',
            is_enabled=True,
            special_roles=['ROLE_SUPERADMIN']
        )
        self.superadmin_user.set_password('password')
        self.superadmin_user.generate_otp_secret()

        self.org_admin_user = User(
            email='orgadmin@example.com',
            first_name='Org',
            last_name='Admin',
            is_enabled=True,
            special_roles=[]
        )
        self.org_admin_user.set_password('password')
        self.org_admin_user.generate_otp_secret()

        self.regular_user = User(
            email='regular@example.com',
            first_name='Regular',
            last_name='User',
            is_enabled=True,
            special_roles=[]
        )
        self.regular_user.set_password('password')
        self.regular_user.generate_otp_secret()

        self.organization = Organization(name='Test Org ROL')
        
        db.session.add_all([self.superadmin_user, self.org_admin_user, self.regular_user, self.organization])
        db.session.commit()

        # Asignar org_admin_user como admin de la organización
        org_user_link = OrgUser(
            user_id=self.org_admin_user.id,
            organization_id=self.organization.id,
            roles=['ROLE_ORG_ADMIN']
        )
        db.session.add(org_user_link)
        db.session.commit()

        self.superadmin_otp = pyotp.TOTP(self.superadmin_user.otp_secret).now()
        self.org_admin_otp = pyotp.TOTP(self.org_admin_user.otp_secret).now()
        self.regular_user_otp = pyotp.TOTP(self.regular_user.otp_secret).now()

    def tearDown(self):
        super().tearDown()

    def test_get_roles_unauthenticated(self):
        """
        Propósito: Verificar que la ruta rechace solicitudes sin autenticación.
        Comportamiento: Al no haber usuario autenticado, se espera una redirección (código 302)
        o respuesta 401.
        """
        response = self.client.get('/api/v1/get-roles')
        self.assertEqual(response.status_code, 401) # Esperamos 401 por @login_required
        print("✅ test_get_roles_unauthenticated")

    def test_get_roles_regular_user(self):
        """
        Propósito: Verificar que para un usuario regular se devuelvan únicamente los roles básicos.
        Comportamiento esperado:
          - ROLE_SUPERADMIN: False
          - ROLE_ORG_ADMIN: False
          - ROLE_USER: True
        """
        self._login_user(self.regular_user.email, 'password', self.regular_user_otp)
        response = self.client.get('/api/v1/get-roles')
        self.assertEqual(response.status_code, 200)
        roles = response.json
        self.assertTrue(roles['ROLE_USER'])
        self.assertFalse(roles['ROLE_ORG_ADMIN'])
        self.assertFalse(roles['ROLE_SUPERADMIN'])
        print("✅ test_get_roles_regular_user")

    def test_get_roles_org_admin(self):
        """
        Propósito: Verificar que para un usuario admin de organización se devuelvan los roles correctos.
        Comportamiento esperado: 
          - ROLE_SUPERADMIN: False
          - ROLE_ORG_ADMIN: True
          - ROLE_USER: True
        """
        self._login_user(self.org_admin_user.email, 'password', self.org_admin_otp)
        response = self.client.get('/api/v1/get-roles')
        self.assertEqual(response.status_code, 200)
        roles = response.json
        self.assertTrue(roles['ROLE_USER'])
        self.assertTrue(roles['ROLE_ORG_ADMIN'])
        self.assertFalse(roles['ROLE_SUPERADMIN'])
        print("✅ test_get_roles_org_admin")

    def test_get_roles_superadmin(self):
        """
        Propósito: Verificar que para un usuario superadmin se devuelvan los roles correctos.
        Comportamiento esperado: 
          - ROLE_SUPERADMIN: True
          - ROLE_ORG_ADMIN: False
          - ROLE_USER: True
        """
        self._login_user(self.superadmin_user.email, 'password', self.superadmin_otp)
        response = self.client.get('/api/v1/get-roles')
        self.assertEqual(response.status_code, 200)
        roles = response.json
        self.assertTrue(roles['ROLE_USER'])
        # Un superadmin puede o no ser org_admin explícitamente, pero su rol de superadmin le da todos los accesos.
        # La lógica actual de la ruta /api/v1/get-roles verifica explícitamente si es admin de alguna org.
        # Si el superadmin no está asignado a una org como admin, ROLE_ORG_ADMIN será False.
        # Para este test, el superadmin no está asignado a ninguna org como admin.
        self.assertFalse(roles['ROLE_ORG_ADMIN']) 
        self.assertTrue(roles['ROLE_SUPERADMIN'])
        print("✅ test_get_roles_superadmin")

if __name__ == '__main__':
    unittest.main(verbosity=2)
