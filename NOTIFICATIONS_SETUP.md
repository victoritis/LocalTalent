# 🔔 Sistema de Notificaciones - Guía de Configuración

## 📋 Índice

1. [Resumen del Sistema](#resumen-del-sistema)
2. [Configuración del Backend](#configuración-del-backend)
3. [Configuración del Frontend](#configuración-del-frontend)
4. [Cómo Usar](#cómo-usar)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

---

## Resumen del Sistema

LocalTalent ahora cuenta con un sistema completo de notificaciones que incluye:

- ✅ **Notificaciones por Email** (SMTP)
- ✅ **Web Push Notifications** (navegador)
- ✅ **Notificaciones en Tiempo Real** (Socket.IO)
- ✅ **Tareas Periódicas** (Celery Beat)
- ✅ **Panel de Preferencias** (frontend)

### Tipos de Notificaciones Implementadas:

- 📧 Email cuando alguien ve tu perfil
- 📧 Alertas de nuevos usuarios en tu ciudad (diarias)
- 📧 Nuevos mensajes
- 📧 Invitaciones a eventos
- 📧 Invitaciones a proyectos
- 📧 Nuevas valoraciones recibidas
- 📧 Recordatorios de eventos (24h antes)
- 📧 Digest semanal (lunes 9:00 AM)

---

## Configuración del Backend

### 1. Variables de Entorno

Agrega estas variables al archivo `.env`:

```bash
# ========================================
# SMTP Configuration (Email Notifications)
# ========================================
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=true
MAIL_USE_SSL=false
MAIL_USERNAME=tu-email@gmail.com
MAIL_PASSWORD=tu-password-app
MAIL_DEFAULT_SENDER=noreply@localtalent.es
MAIL_DEBUG=false

# ========================================
# VAPID Keys (Web Push Notifications)
# ========================================
# Genera las claves con este comando:
# python -c "from py_vapid import Vapid; vapid = Vapid(); vapid.generate_keys(); print('PUBLIC:', vapid.public_key.decode()); print('PRIVATE:', vapid.private_key.decode())"

VAPID_PUBLIC_KEY=tu-clave-publica-base64-aqui
VAPID_PRIVATE_KEY=tu-clave-privada-base64-aqui

# ========================================
# URLs
# ========================================
FRONTEND_BASE_URL=https://localtalent.es
```

### 2. Generar VAPID Keys

Ejecuta este comando para generar las claves VAPID:

```bash
cd containers/backend/application
python3 << EOF
from py_vapid import Vapid

vapid = Vapid()
vapid.generate_keys()

print("\n========================================")
print("VAPID KEYS GENERADAS")
print("========================================")
print("\nCopia estas claves a tu archivo .env:\n")
print(f"VAPID_PUBLIC_KEY={vapid.public_key.decode()}")
print(f"VAPID_PRIVATE_KEY={vapid.private_key.decode()}")
print("\n========================================\n")
EOF
```

### 3. Configurar Gmail para SMTP

Si usas Gmail, necesitas crear una "Contraseña de Aplicación":

1. Ve a https://myaccount.google.com/security
2. Activa la verificación en dos pasos
3. Ve a "Contraseñas de aplicaciones"
4. Genera una nueva contraseña para "Mail"
5. Usa esa contraseña en `MAIL_PASSWORD`

### 4. Ejecutar Migraciones

```bash
cd containers/backend/application
flask db upgrade
```

### 5. Instalar Dependencias

```bash
cd containers/backend
pip install -r requirements.txt
```

### 6. Iniciar Celery Beat (Tareas Periódicas)

En una terminal aparte:

```bash
cd containers/backend/application
celery -A app.celery beat --loglevel=info
```

### 7. Iniciar Celery Worker (Ejecutor de Tareas)

En otra terminal:

```bash
cd containers/backend/application
celery -A app.celery worker --loglevel=info
```

---

## Configuración del Frontend

### 1. Verificar Service Worker

El archivo `public/sw.js` debe estar accesible en `/sw.js` en producción.

En **Nginx** o tu servidor web, asegúrate de que se sirva con el Content-Type correcto:

```nginx
location /sw.js {
    add_header Content-Type application/javascript;
    add_header Service-Worker-Allowed /;
}
```

### 2. Configurar Variables de Entorno

En `.env` del frontend:

```bash
VITE_API_URL=https://api.localtalent.es
```

### 3. Build del Frontend

```bash
cd containers/frontend
npm install
npm run build
```

---

## Cómo Usar

### 1. Activar Notificaciones por Email (Usuario)

Los usuarios pueden activar/desactivar emails desde:

**Ruta**: `/settings/notifications` (o donde implementes el componente)

**Componente**: `<NotificationSettings />`

```tsx
import { NotificationSettings } from '@/components/notifications'

function SettingsPage() {
  return <NotificationSettings />
}
```

### 2. Activar Web Push Notifications (Usuario)

El mismo componente `<NotificationSettings />` permite activar push.

Al activar, el navegador pedirá permisos.

### 3. Usar el Bell Icon (Notificaciones en tiempo real)

```tsx
import { NotificationBell } from '@/components/notifications'

function Navbar() {
  return (
    <nav>
      {/* ... otros elementos ... */}
      <NotificationBell />
    </nav>
  )
}
```

### 4. Enviar Notificaciones desde el Código

#### Email

```python
from app.email_service import (
    send_profile_viewed_email,
    send_new_message_email,
    send_event_invitation_email,
    # ... etc
)

# Ejemplo: notificar que alguien vio tu perfil
send_profile_viewed_email(
    user_email=user.email,
    user_name=user.name,
    viewer_name=viewer.name,
    viewer_username=viewer.username,
    viewer_profile_url=f"{frontend_url}/profile/{viewer.username}"
)
```

#### Push Notification

```python
from app.push_service import (
    send_new_message_push,
    send_profile_viewed_push,
    send_event_invitation_push,
    # ... etc
)
from app.models import User

user = User.query.get(user_id)

# Ejemplo: notificar nuevo mensaje
send_new_message_push(
    user=user,
    sender_name=sender.name,
    message_preview=message.content[:100]
)
```

#### Notificación en BD (para el Bell Icon)

```python
from app.notifications.routes import create_notification

# Crear notificación en BD
create_notification(
    user_id=user.id,
    notification_type='new_message',
    title=f'Nuevo mensaje de {sender.name}',
    message=message_preview,
    link=f'/messages/{conversation_id}',
    data={'sender_id': sender.id}
)
```

---

## Testing

### 1. Test de Email (desarrollo)

En desarrollo, puedes usar **Mailtrap** o **MailHog**:

#### Mailtrap (online)

```bash
MAIL_SERVER=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=tu-mailtrap-username
MAIL_PASSWORD=tu-mailtrap-password
```

#### MailHog (local)

```bash
# Instalar MailHog
brew install mailhog  # Mac
# o descargar de https://github.com/mailhog/MailHog

# Iniciar
mailhog

# Configurar
MAIL_SERVER=localhost
MAIL_PORT=1025
```

Web UI: http://localhost:8025

### 2. Test de Push Notifications

1. Abre el frontend en **Chrome** o **Firefox** (no funciona en Safari)
2. Ve a `/settings/notifications`
3. Activa "Notificaciones Push"
4. Acepta los permisos del navegador
5. Haz clic en "Enviar notificación de prueba"
6. Deberías ver una notificación en tu sistema

### 3. Test de Celery Beat

```bash
# Ver tareas programadas
celery -A app.celery inspect scheduled

# Ejecutar tarea manualmente (testing)
celery -A app.celery call app.email_tasks.send_new_users_alerts
```

---

## Troubleshooting

### ❌ Error: "VAPID_PUBLIC_KEY no configurada"

**Solución**: Verifica que las variables `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY` estén en el `.env` y reinicia el servidor.

### ❌ Push Notifications no funcionan

**Posibles causas**:

1. **Navegador no soportado**: Usa Chrome, Firefox o Edge (no Safari)
2. **HTTPS requerido**: Push solo funciona en HTTPS (o localhost)
3. **Service Worker no registrado**: Verifica en DevTools → Application → Service Workers
4. **Permisos denegados**: El usuario debe aceptar permisos

**Debug**:

```javascript
// En la consola del navegador
navigator.serviceWorker.getRegistration().then(console.log)
Notification.permission  // debe ser 'granted'
```

### ❌ Emails no se envían

**Posibles causas**:

1. **Credenciales incorrectas**: Verifica `MAIL_USERNAME` y `MAIL_PASSWORD`
2. **Gmail bloquea acceso**: Usa "Contraseña de Aplicación" (ver arriba)
3. **Celery no está corriendo**: Inicia el worker con `celery -A app.celery worker`
4. **Usuario desactivó emails**: Verifica `user.email_notifications == True`

**Debug**:

```bash
# Ver logs de Celery
celery -A app.celery worker --loglevel=debug

# Test manual de email
python
>>> from app.email_service import send_email
>>> send_email('Test', 'tu@email.com', '<h1>Test</h1>')
```

### ❌ Celery Beat no ejecuta tareas

**Posibles causas**:

1. **Beat no está corriendo**: Inicia con `celery -A app.celery beat`
2. **Timezone incorrecta**: Verifica `timezone` en `config.py`
3. **Schedule mal configurado**: Revisa `beat_schedule` en `config.py`

**Debug**:

```bash
# Ver tareas programadas
celery -A app.celery inspect scheduled

# Ver log de Beat
celery -A app.celery beat --loglevel=debug
```

### ❌ Error: "No module named 'pywebpush'"

**Solución**:

```bash
cd containers/backend
pip install -r requirements.txt
```

### ❌ Notificaciones se duplican

**Posible causa**: Múltiples workers/beats corriendo

**Solución**: Asegúrate de tener solo 1 instancia de Celery Beat corriendo.

---

## 📊 Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                         USUARIO                                 │
└─────────────────────────────────────────────────────────────────┘
           │                    │                     │
           ▼                    ▼                     ▼
    ┌───────────┐         ┌──────────┐        ┌────────────┐
    │  Browser  │         │  Email   │        │  Mobile    │
    │   Push    │         │  Client  │        │ (futuro)   │
    └───────────┘         └──────────┘        └────────────┘
           │                    │                     │
           └────────────────────┴─────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Service Worker  │
                    │     (sw.js)      │
                    └──────────────────┘
                              │
                              ▼
           ┌──────────────────────────────────┐
           │         BACKEND API              │
           │  /api/v1/notifications/...       │
           └──────────────────────────────────┘
                      │          │
        ┌─────────────┴──────┐   │
        ▼                    ▼   ▼
  ┌──────────┐        ┌────────────────┐
  │PostgreSQL│        │  Push Service  │
  │  (BD)    │        │  (pywebpush)   │
  └──────────┘        └────────────────┘
        │                      │
        ▼                      ▼
  ┌──────────────────────────────────┐
  │       CELERY TASKS               │
  │  - Email Service                 │
  │  - Push Service                  │
  │  - Periodic Tasks (Beat)         │
  └──────────────────────────────────┘
                │
                ▼
        ┌──────────────┐
        │    SMTP      │
        │  (Gmail)     │
        └──────────────┘
```

---

## 🚀 Próximos Pasos (Mejoras Futuras)

- [ ] Notificaciones móviles (Firebase Cloud Messaging)
- [ ] Digest personalizable (frecuencia, horario)
- [ ] Notificaciones por categorías (poder desactivar solo algunas)
- [ ] Notificaciones agrupadas ("5 nuevos eventos")
- [ ] Sistema de prioridades (urgente, normal, bajo)
- [ ] Integración con calendario (iCal, Google Calendar)
- [ ] Webhooks para integraciones externas
- [ ] Analytics de notificaciones (tasa de apertura, clicks)

---

## 📚 Referencias

- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Celery Beat](https://docs.celeryproject.org/en/stable/userguide/periodic-tasks.html)
- [Flask-Mail](https://pythonhosted.org/Flask-Mail/)
- [py-vapid](https://github.com/web-push-libs/vapid)

---

## 🤝 Soporte

Si tienes problemas o preguntas:

1. Revisa la sección de [Troubleshooting](#troubleshooting)
2. Verifica los logs de Celery y del backend
3. Abre un issue en GitHub con los detalles del error

---

**¡El sistema de notificaciones está listo para usar! 🎉**
