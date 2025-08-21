# import unittest
# import json
# import os
# import sys
# from datetime import datetime, timezone

# # Añadir el directorio raíz al path
# sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# from tests.unit.test_auth import AuthBaseTestCase # Heredar de AuthBaseTestCase
# from app.models import User, Organization, OrgUser, Alert, CVE, CPE
# from app import db
# import pyotp

# class AlertsTestCase(AuthBaseTestCase):
#     def setUp(self):
#         super().setUp()
#         # Usuarios
#         self.org_admin = User(email='orgadmin_alerts@example.com', first_name='AlertAdmin', last_name='Test', is_enabled=True)
#         self.org_admin.set_password('password')
#         self.org_admin.generate_otp_secret()

#         self.regular_user = User(email='regular_alerts@example.com', first_name='AlertUser', last_name='Test', is_enabled=True)
#         self.regular_user.set_password('password')
#         self.regular_user.generate_otp_secret()
        
#         self.other_user = User(email='other_alerts@example.com', first_name='OtherAlertUser', last_name='Test', is_enabled=True)
#         self.other_user.set_password('password')
#         self.other_user.generate_otp_secret()

#         # Organización
#         self.org = Organization(name='AlertTestOrg')
#         self.other_org = Organization(name='OtherAlertOrg')

#         db.session.add_all([self.org_admin, self.regular_user, self.other_user, self.org, self.other_org])
#         db.session.commit()

#         # Vínculos OrgUser
#         OrgUser.query.delete() # Limpiar OrgUser para evitar conflictos de tests anteriores
#         db.session.commit()
        
#         link1 = OrgUser(user_id=self.org_admin.id, organization_id=self.org.id, roles=['ROLE_ORG_ADMIN'])
#         link2 = OrgUser(user_id=self.regular_user.id, organization_id=self.org.id, roles=['ROLE_ORG_USER'])
#         # other_user no está en self.org

#         db.session.add_all([link1, link2])
#         db.session.commit()
        
#         # CVEs y CPEs
#         self.cve1 = CVE(id='CVE-2023-0001', data={'description': 'Test CVE 1'}, cvss_score=9.8, cvss_version='3.1') # Critical
#         self.cve2 = CVE(id='CVE-2023-0002', data={'description': 'Test CVE 2'}, cvss_score=8.0, cvss_version='3.1') # High
#         self.cve3 = CVE(id='CVE-2023-0003', data={'description': 'Test CVE 3'}, cvss_score=5.5, cvss_version='3.1') # Medium
#         self.cve4 = CVE(id='CVE-2023-0004', data={'description': 'Test CVE 4'}, cvss_score=3.0, cvss_version='3.1') # Low
#         self.cve5 = CVE(id='CVE-2023-0005', data={'description': 'Test CVE 5'}, cvss_score=None) # Unknown

#         self.cpe1 = CPE(id='cpe:/a:vendor:product1:1.0', data={'name': 'Vendor Product 1 v1.0'})
#         self.cpe2 = CPE(id='cpe:/a:vendor:product2:2.0', data={'name': 'Vendor Product 2 v2.0'})
#         self.cpe3 = CPE(id='cpe:/a:another:product3:3.0', data={'name': 'Another Product 3 v3.0'})

#         db.session.add_all([self.cve1, self.cve2, self.cve3, self.cve4, self.cve5, self.cpe1, self.cpe2, self.cpe3])
#         db.session.commit()

#         # Alertas
#         self.alert1_org1_cve1_cpe1 = Alert(org=self.org.id, cve=self.cve1.id, cpe=self.cpe1.id, active=True, updatedAt=datetime.now(timezone.utc) - timedelta(days=1))
#         self.alert2_org1_cve2_cpe1 = Alert(org=self.org.id, cve=self.cve2.id, cpe=self.cpe1.id, active=True, updatedAt=datetime.now(timezone.utc) - timedelta(days=2))
#         self.alert3_org1_cve3_cpe2 = Alert(org=self.org.id, cve=self.cve3.id, cpe=self.cpe2.id, active=False, updatedAt=datetime.now(timezone.utc) - timedelta(days=3)) # Inactiva
#         self.alert4_org1_cve4_cpe2 = Alert(org=self.org.id, cve=self.cve4.id, cpe=self.cpe2.id, active=True, updatedAt=datetime.now(timezone.utc) - timedelta(days=4))
#         self.alert5_org1_cve5_cpe3 = Alert(org=self.org.id, cve=self.cve5.id, cpe=self.cpe3.id, active=True, updatedAt=datetime.now(timezone.utc) - timedelta(days=5))


#         self.alert_other_org = Alert(org=self.other_org.id, cve=self.cve1.id, cpe=self.cpe1.id, active=True)

#         db.session.add_all([
#             self.alert1_org1_cve1_cpe1, self.alert2_org1_cve1_cpe1, self.alert3_org1_cve3_cpe2, 
#             self.alert4_org1_cve4_cpe2, self.alert5_org1_cve5_cpe3, self.alert_other_org
#         ])
#         db.session.commit()

#         # OTPs
#         self.org_admin_otp = pyotp.TOTP(self.org_admin.otp_secret).now()
#         self.regular_user_otp = pyotp.TOTP(self.regular_user.otp_secret).now()
#         self.other_user_otp = pyotp.TOTP(self.other_user.otp_secret).now()


#     def tearDown(self):
#         super().tearDown()

#     # Tests para /api/v1/organizations/<name>/alerts
#     def test_get_organization_alerts_as_org_admin(self):
#         self._login_user(self.org_admin.email, 'password', self.org_admin_otp)
#         response = self.client.get(f'/api/v1/organizations/{self.org.name}/alerts')
#         self.assertEqual(response.status_code, 200)
#         data = response.json
#         self.assertEqual(data['total_items'], 5) # 5 alertas en self.org
#         print("✅ test_get_organization_alerts_as_org_admin")

#     def test_get_organization_alerts_unauthorized(self):
#         self._login_user(self.other_user.email, 'password', self.other_user_otp) # other_user no tiene acceso a self.org
#         response = self.client.get(f'/api/v1/organizations/{self.org.name}/alerts')
#         self.assertEqual(response.status_code, 403)
#         print("✅ test_get_organization_alerts_unauthorized")

#     def test_get_organization_alerts_filter_severity_critical(self):
#         self._login_user(self.org_admin.email, 'password', self.org_admin_otp)
#         response = self.client.get(f'/api/v1/organizations/{self.org.name}/alerts?severity=CRITICAL')
#         self.assertEqual(response.status_code, 200)
#         data = response.json
#         self.assertEqual(data['total_items'], 1)
#         self.assertEqual(data['alerts'][0]['cve_id'], self.cve1.id)
#         print("✅ test_get_organization_alerts_filter_severity_critical")

#     def test_get_organization_alerts_filter_status_inactive(self):
#         self._login_user(self.org_admin.email, 'password', self.org_admin_otp)
#         response = self.client.get(f'/api/v1/organizations/{self.org.name}/alerts?status=INACTIVE')
#         self.assertEqual(response.status_code, 200)
#         data = response.json
#         self.assertEqual(data['total_items'], 1)
#         self.assertEqual(data['alerts'][0]['cve_id'], self.cve3.id)
#         print("✅ test_get_organization_alerts_filter_status_inactive")

#     def test_get_organization_alerts_search(self):
#         self._login_user(self.org_admin.email, 'password', self.org_admin_otp)
#         response = self.client.get(f'/api/v1/organizations/{self.org.name}/alerts?search={self.cpe1.id}')
#         self.assertEqual(response.status_code, 200)
#         data = response.json
#         self.assertEqual(data['total_items'], 2) # alert1 y alert2 usan cpe1
#         cve_ids_in_response = {a['cve_id'] for a in data['alerts']}
#         self.assertIn(self.cve1.id, cve_ids_in_response)
#         self.assertIn(self.cve2.id, cve_ids_in_response)
#         print("✅ test_get_organization_alerts_search")
        
#     def test_get_organization_alerts_sort_order_asc(self):
#         self._login_user(self.org_admin.email, 'password', self.org_admin_otp)
#         response = self.client.get(f'/api/v1/organizations/{self.org.name}/alerts?sort_order=ASC')
#         self.assertEqual(response.status_code, 200)
#         data = response.json
#         self.assertTrue(len(data['alerts']) >= 2)
#         # Comprobar que la primera alerta es más antigua que la segunda (o igual si son del mismo día)
#         # La alerta5 es la más antigua en este set de datos
#         self.assertEqual(data['alerts'][0]['cve_id'], self.alert5_org1_cve5_cpe3.cve)
#         print("✅ test_get_organization_alerts_sort_order_asc")

#     # Tests para /api/v1/organizations/<name>/alerts/deactivate-all-filtered
#     def test_deactivate_all_filtered_alerts(self):
#         self._login_user(self.org_admin.email, 'password', self.org_admin_otp)
#         # Antes de desactivar, hay 4 alertas activas en self.org
#         active_alerts_before = Alert.query.filter_by(org=self.org.id, active=True, deletedAt=None).count()
#         self.assertEqual(active_alerts_before, 4)

#         response = self.client.patch(
#             f'/api/v1/organizations/{self.org.name}/alerts/deactivate-all-filtered',
#             json={'severity': 'ALL', 'search': ''} # Desactivar todas las activas
#         )
#         self.assertEqual(response.status_code, 200)
#         self.assertEqual(response.json['alerts_deactivated'], 4)
        
#         active_alerts_after = Alert.query.filter_by(org=self.org.id, active=True, deletedAt=None).count()
#         self.assertEqual(active_alerts_after, 0)
#         print("✅ test_deactivate_all_filtered_alerts")

#     # Tests para /api/v1/organizations/<name>/alerts/activate-all-filtered
#     def test_activate_all_filtered_alerts(self):
#         self._login_user(self.org_admin.email, 'password', self.org_admin_otp)
#         # Antes de activar, hay 1 alerta inactiva en self.org (alert3)
#         inactive_alerts_before = Alert.query.filter_by(org=self.org.id, active=False, deletedAt=None).count()
#         self.assertEqual(inactive_alerts_before, 1)

#         response = self.client.patch(
#             f'/api/v1/organizations/{self.org.name}/alerts/activate-all-filtered',
#             json={'severity': 'MEDIUM', 'search': self.cpe2.id} # Debería activar alert3
#         )
#         self.assertEqual(response.status_code, 200)
#         self.assertEqual(response.json['alerts_activated'], 1)
        
#         alert3_after = db.session.get(Alert, (self.org.id, self.cve3.id, self.cpe2.id))
#         self.assertTrue(alert3_after.active)
#         print("✅ test_activate_all_filtered_alerts")

#     # Tests para /api/v1/organizations/<name>/alerts/critical-active-count
#     def test_get_critical_active_alerts_count(self):
#         self._login_user(self.org_admin.email, 'password', self.org_admin_otp)
#         response = self.client.get(f'/api/v1/organizations/{self.org.name}/alerts/critical-active-count')
#         self.assertEqual(response.status_code, 200)
#         # Solo alert1 es crítica (CVSS 9.8) y está activa
#         self.assertEqual(response.json['critical_active_alerts_count'], 1)
#         print("✅ test_get_critical_active_alerts_count")

#     # Tests para /api/v1/organizations/<name>/alerts/<cve_id>/<cpe_id>/toggle
#     def test_toggle_alert_status_activate(self):
#         self._login_user(self.org_admin.email, 'password', self.org_admin_otp)
#         # alert3 está inactiva
#         self.assertFalse(self.alert3_org1_cve3_cpe2.active)
#         response = self.client.patch(
#             f'/api/v1/organizations/{self.org.name}/alerts/{self.cve3.id}/{self.cpe2.id}/toggle',
#             json={'is_active': True}
#         )
#         self.assertEqual(response.status_code, 200)
#         updated_alert = db.session.get(Alert, (self.org.id, self.cve3.id, self.cpe2.id))
#         self.assertTrue(updated_alert.active)
#         print("✅ test_toggle_alert_status_activate")

#     def test_toggle_alert_status_deactivate(self):
#         self._login_user(self.org_admin.email, 'password', self.org_admin_otp)
#         # alert1 está activa
#         self.assertTrue(self.alert1_org1_cve1_cpe1.active)
#         response = self.client.patch(
#             f'/api/v1/organizations/{self.org.name}/alerts/{self.cve1.id}/{self.cpe1.id}/toggle',
#             json={'is_active': False}
#         )
#         self.assertEqual(response.status_code, 200)
#         updated_alert = db.session.get(Alert, (self.org.id, self.cve1.id, self.cpe1.id))
#         self.assertFalse(updated_alert.active)
#         print("✅ test_toggle_alert_status_deactivate")

#     # Tests para /api/v1/organizations/<name>/alerts/<cve_id>/<cpe_id> (DELETE)
#     def test_delete_alert(self):
#         self._login_user(self.org_admin.email, 'password', self.org_admin_otp)
#         alert_to_delete = self.alert4_org1_cve4_cpe2
#         response = self.client.delete(
#             f'/api/v1/organizations/{self.org.name}/alerts/{alert_to_delete.cve}/{alert_to_delete.cpe}'
#         )
#         self.assertEqual(response.status_code, 200)
#         deleted_alert = db.session.get(Alert, (alert_to_delete.org, alert_to_delete.cve, alert_to_delete.cpe))
#         self.assertIsNotNone(deleted_alert.deletedAt) # Soft delete
#         print("✅ test_delete_alert")

# if __name__ == '__main__':
#     unittest.main(verbosity=2)
