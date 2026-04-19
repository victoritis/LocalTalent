# 📋 Backlog de Issues — LocalTalent

Este archivo es la fuente de verdad del trabajo pendiente en el proyecto.
El agente autónomo debe leer este archivo, elegir los issues con estado
`pending` en orden de prioridad, implementarlos, y marcarlos como `done`
cuando los termine (reemplazando `pending` por `done` y añadiendo el SHA
del commit).

## Convenciones

- **Estado**: `pending` | `in_progress` | `done`
- **Límite por ejecución**: 3 issues como máximo por run
- **Rama**: todo se hace sobre `claude/analyze-app-improvements-6GK8m`
- **Commits**: uno por issue, con mensaje descriptivo que referencie el número de issue
- Si un issue es demasiado grande para una sola ejecución, partirlo en sub-issues aquí mismo
- Al marcar `done`, añadir al final del issue: `**Completado en:** <sha> — <fecha>`

---

## Issue #1 — Refactor del modelo de datos y eliminación de inconsistencias

**Estado:** `done`
**Severidad:** Crítica
**Completado en:** `156ad54` — 2026-04-17

Arreglados `is_deleted` vs `deletedAt`, `display_username` property, `ondelete` en FKs, migración `11_add_fk_cascades.py`, dobles commits y bare excepts.

---

## Issue #2 — Eliminar N+1 queries y migrar búsqueda a PostGIS

**Estado:** `done`
**Severidad:** Crítica (performance)
**Completado en:** `62164ad` — 2026-04-17

### Tareas

- [ ] `messaging/routes.py` líneas 25-66 (`get_conversations`): el bucle hace 3 queries por conversación. Usar `selectinload(Conversation.participant1)`, `selectinload(Conversation.participant2)` y un solo JOIN agregado para último mensaje y contador no-leído.
- [ ] `events/routes.py` líneas 74-110 (`get_events`): el bucle cuenta asistentes por evento con una query adicional. Usar subquery agregada o `func.count` con `GROUP BY`.
- [ ] `events/routes.py` líneas 942-983 (`get_my_events`): mismo patrón.
- [ ] `projects/routes.py` líneas 48-77 y 667-706: mismo patrón contando miembros activos.
- [ ] `user/routes.py` `advanced_search` (líneas ~688-689): hoy trae TODOS los usuarios en memoria y filtra con Haversine en Python. Migrar a PostgreSQL usando:
    - Fórmula Haversine en SQL (sin PostGIS): `ST_Distance` usando `earthdistance` / `cube` extensions, o una expresión `acos(sin(lat1)*sin(lat2) + cos(lat1)*cos(lat2)*cos(lon2-lon1)) * 6371`.
    - Filtrar en la query con `WHERE distancia <= radio`.
- [ ] Añadir índices en `models.py` + migración:
    - `(category, is_profile_public)` compuesto
    - Índice funcional o B-tree en `LOWER(first_name || ' ' || last_name)` para búsqueda por nombre
    - Índice GIN de full-text en `bio` si se usa búsqueda de texto
- [ ] Implementar cache Redis con `flask-caching` para:
    - Ratings medios por usuario (`GET /api/v1/users/<id>/rating`) con TTL 1 hora, invalidar al crear/editar review
    - Contadores de asistentes por evento

### Criterio de aceptación
- `get_conversations` con 20 conversaciones pasa de 60+ queries a <5.
- Búsqueda avanzada funciona con 10k usuarios sin cargar todo en memoria.

---

## Issue #3 — Hardening de seguridad y validación de entrada

**Estado:** `done`
**Severidad:** Alta
**Completado en:** `85b00d9` — 2026-04-17

Añadido módulo `app/schemas/` con Pydantic v2 y decorador `@validate_body` en todos los POST/PUT críticos (events, projects, reviews, messaging, profile). Activado `flask-limiter` (login 5/min, register/recover 3/h, búsqueda 60/min, default 200/min). CORS ahora se lee de `ALLOWED_ORIGINS` env var, rechazando `*`. Headers de seguridad (CSP, HSTS, X-Frame-Options, Permissions-Policy, Referrer-Policy, COOP/CORP) aplicados en `Caddyfile`. Auditado ownership en `update_member_role`/`remove_member` (faltaba verificar `project` antes de dereferenciar).

---

## Issue #4 — Refactor de rutas duplicadas (events + projects)

**Estado:** `done`
**Severidad:** Media-Alta (mantenibilidad)
**Completado en:** `d9363bb` — 2026-04-18

Extraídos helpers a `app/common/`: `serialize_user_summary`, `paginated_response`, `haversine_km_sql` / `haversine_filter`, y `SoftDeleteQueryMixin`. Removidas las funciones Python muertas `calculate_distance` y `haversine_distance`. Decisión documentada: composición de helpers en vez de `BaseListingResource` para no migrar toda la app a Flask-RESTful sólo por la deduplicación.

---

## Issue #5 — Completar features a medias (profile views, digest, username)

**Estado:** `done`
**Severidad:** Media (features rotas)
**Completado en:** `ae50bda` — 2026-04-18

Añadido modelo `ProfileView` + migración `13_profile_views_username` con índices `(viewed_id, viewed_at)` y `(viewer_id, viewed_id, viewed_at)`. Nuevo endpoint `POST /api/v1/users/<id>/view` con dedup 24h. Hook de registro en la carga de `/auth/user/<username>`. `email_tasks.send_weekly_digests` muestra `profile_views` reales (únicos por viewer/última semana). Nuevo flag `notify_profile_views` en `User` con toggle en `/api/v1/notifications/preferences` y en la UI de `NotificationSettings`; notifica in-app al `viewed` cuando está activo. Endpoint `PUT /api/v1/users/me/username` con validación de formato/unicidad y cooldown de 30 días, y `GET /api/v1/users/me/username/availability`. Componente `UsernameSettings` con feedback de disponibilidad en tiempo real embebido en la página de perfil.

---

## Issue #6 — UI: estados de carga/error, accesibilidad e i18n

**Estado:** `done`
**Severidad:** Media (UX)
**Completado en:** `05b9694` — 2026-04-19

Creados los componentes reutilizables `EmptyState`, `ErrorState`, `ErrorBoundary` y presets de `Skeleton` (`CardListSkeleton`, `GridCardSkeleton`, `ListRowSkeleton`, `MapSkeleton`) aplicados en `AdvancedSearch`, `PortfolioGallery`, `EventsList`, `ProjectsList`. `ErrorBoundary` envuelve la app y el `__root` route de TanStack. Accesibilidad: `StarRating` expuesto como `radiogroup`/`img` con `aria-label`, `alt` reales en imágenes de portfolio/eventos/proyectos, imágenes con `loading="lazy"`, `aria-hidden` en iconos decorativos y foco visible global en `index.css` sin romper la experiencia de ratón. Infraestructura `react-i18next` montada con detección+persistencia en `localStorage`, locales `es.json`/`en.json`, hook de `useTranslation` disponible y selector de idioma integrado en el dropdown de `NavUser`. Los sub-issues #6.1 (traducción exhaustiva de strings y migración de fechas con `date-fns` locale), #6.2 (a11y + responsive sweep de componentes restantes) y #6.3 (Sentry) quedan abajo.

---

## Issue #6.1 — i18n: traducción exhaustiva de strings y locales de fecha

**Estado:** `pending`
**Severidad:** Media (UX)

### Tareas

- [ ] Migrar todos los strings literales a `t(...)` en: `events/*`, `projects/*`, `messaging/*`, `notifications/*`, `search/*`, `portfolio/*`, `reviews/*`, `security/*`, `support/*`, `user/*`, `profile/*`, `login`, `register`.
- [ ] Completar las claves en `src/i18n/es.json` y `src/i18n/en.json` a medida que se traduce (agrupar por dominio: `events.*`, `projects.*`, etc.).
- [ ] Sustituir `toLocaleDateString('es-ES', ...)` por `date-fns format(..., { locale })` respetando `i18n.resolvedLanguage` (helper `@/lib/date.ts` con `getLocale()`).
- [ ] Validar que no queden strings hardcoded: script `grep -RE ">[A-Z][a-z]+" src/` de checklist manual o test Cypress con locale `en`.

### Criterio de aceptación
- La app se puede usar completa en inglés sin strings hardcoded.
- Cambiar idioma desde el selector afecta inmediatamente a todas las vistas cargadas.

---

## Issue #6.2 — A11y y responsive en componentes restantes

**Estado:** `pending`
**Severidad:** Media (UX)

### Tareas

- [ ] `aria-label` en todos los botones sólo-icono restantes (`containers/frontend/src/components/**`), revisión con `grep -RE "<Button.*size=\"icon\"" src/` para confirmar.
- [ ] Aplicar `EmptyState`/`ErrorState`/`Skeleton` a: `ChatList`, `MessagingApp`, `NotificationBell` listings, `MyEvents`, `MyProjects`, `ReviewList`, `BlockedUsers`.
- [ ] Asegurar `aria-labelledby`/`aria-describedby` en todos los `<Dialog>` y foco correcto al abrir.
- [ ] Revisar contraste de colores custom (badges, shimmer) con Lighthouse contrast check.
- [ ] Revisar alturas fijas (`h-[400px]`, `min-h-*`) y reemplazar por `aspect-ratio` cuando sea posible.
- [ ] Añadir test Cypress de navegación por teclado que recorre el flujo de login → search → profile sin ratón.

### Criterio de aceptación
- Lighthouse accessibility score ≥ 90 en las rutas principales.
- No hay botones sólo-icono sin `aria-label`.

---

## Issue #6.3 — Observabilidad frontend (Sentry/alternativa)

**Estado:** `pending`
**Severidad:** Baja (calidad)

### Tareas

- [ ] Integrar `@sentry/react` con `init()` condicional a env var `VITE_SENTRY_DSN`.
- [ ] Conectar `ErrorBoundary` (`src/components/error/ErrorBoundary.tsx`) via `onError` a `Sentry.captureException`.
- [ ] Instrumentar `window.addEventListener('error' | 'unhandledrejection')` en `main.tsx` sin duplicar el envío.
- [ ] Adjuntar `release` y `environment` a partir de Vite env vars.
- [ ] Documentar en `NOTIFICATIONS_SETUP.md` (o nuevo `OBSERVABILITY.md`) cómo provisionar el DSN por entorno.

### Criterio de aceptación
- Un error lanzado manualmente en dev llega a Sentry (o se registra localmente si DSN no está seteado).

---

## Issue #7 — Mejoras del módulo de mapa

**Estado:** `done`
**Severidad:** Media

`InteractiveMap` reescrito: ahora se envuelve con `ErrorBoundary` que, ante un fallo de Leaflet, muestra `ErrorState` + `FallbackList` de hasta 100 usuarios con enlaces directos a perfil. Persistencia de `center`/`zoom` en `localStorage` (`localtalent.map.view`) con `MapStateSync` (listener de `moveend`/`zoomend`), y `AutoFitBounds` que sólo auto-ajusta la primera vez para no pisar pans manuales. `MarkerClusterGroup` ya estaba pero ahora el contenedor usa `aspect-ratio` en lugar de `h-[600px]`, y tiene `role="application"` con `aria-label`. Nuevo botón "Buscar en esta área" (sólo aparece cuando `onSearchArea` está conectado y el usuario ha movido el mapa); en `/auth/user/map` refetchea pasando `north/south/east/west` al endpoint. Backend `GET /api/v1/users/map` ahora acepta `north|south|east|west` (con soporte para cajas que cruzan el antimeridiano) y limita a 500 resultados cuando se pasan bounds. Nuevo hook `useGeolocation` con estados `granted|denied|unavailable|timeout` y callback `onDenied`. `AdvancedSearch.handleUseCurrentLocation` usa el hook; si la respuesta es denegación, aparece un CTA `role="alert"` con input de ciudad que resuelve a coords vía Nominatim. Cada `Popup` incluye un enlace `Cómo llegar` que abre Google Maps con la ruta al talento.

---

## Issue #8 — Rediseño del sistema de notificaciones

**Estado:** `pending`
**Severidad:** Media

### Tareas

- [ ] Redesign de `Notification` model: añadir `category` (message/event/review/system), `priority`, `archived_at`.
- [ ] Centro de notificaciones en header con dropdown, badge de no-leídas, tabs por categoría.
- [ ] Migrar creación de notificaciones a un `NotificationService.send(user, type, **kwargs)` que abstraiga in-app + email + push.
- [ ] Página `/settings/notifications` con toggles granulares por categoría y canal (email/push/in-app).
- [ ] Aprovechar Flask-SocketIO para push live de nuevas notificaciones sin reload.
- [ ] Implementar bien push notifications web (ya existe el campo `push_subscription` en User pero el service no está integrado): endpoint suscripción, service worker, VAPID keys en env.

### Criterio de aceptación
- Usuario puede silenciar un tipo de notificación por canal sin perder los otros.
- Nueva notificación aparece en el header sin recargar.

---

## Issue #9 — Auth: OAuth2, 2FA real y gestión de sesiones

**Estado:** `pending`
**Severidad:** Media

### Tareas

- [ ] Integrar `Authlib` o `flask-dance` para OAuth2 con Google y GitHub (registro + login).
- [ ] Implementar 2FA opcional con TOTP completo (el modelo ya tiene `otp_secret` pero no hay endpoint para activar/verificar). Añadir códigos de recuperación.
- [ ] Endpoint `GET /api/v1/auth/sessions` que liste sesiones activas (IP, user-agent, último uso).
- [ ] Endpoint `DELETE /api/v1/auth/sessions/<id>` para revocar.
- [ ] Refresh tokens separados del access token (hoy todo es access token largo).
- [ ] Rate limiting específico en login — ya pedido en #3 pero asegurar que se aplique.

### Criterio de aceptación
- Un usuario puede loguearse con Google y luego ver en "mis sesiones" que hay 2 activas y cerrar una.

---

## Issue #10 — Testing, CI/CD y observabilidad

**Estado:** `pending`
**Severidad:** Media (calidad)

### Tareas

- [ ] Tests de integración con pytest + fixtures para: registro, crear evento, RSVP, enviar mensaje, crear review, búsqueda avanzada.
- [ ] Tests de componentes críticos frontend con Vitest + Testing Library: `StarRating`, `AdvancedSearch`, `InteractiveMap` (mocked), `ConversationList`.
- [ ] `.github/workflows/ci.yml`:
    - Lint: `ruff` (backend) + `eslint` (frontend)
    - Test: pytest con coverage + vitest
    - Build: `docker compose build`
    - Security: `bandit`, `trivy`, `npm audit`
- [ ] Logging JSON estructurado en backend (`python-json-logger`). Incluir `request_id` en cada log.
- [ ] Healthchecks reales en `compose.yml` para backend (`/api/v1/health`), database (`pg_isready`), redis (`redis-cli ping`).
- [ ] Hardening Docker en producción: `no-new-privileges`, `read_only` con volúmenes específicos, usuarios no-root en Dockerfiles.

### Criterio de aceptación
- Cada push corre CI.
- Backend coverage ≥ 60%, frontend ≥ 40% en componentes críticos.
