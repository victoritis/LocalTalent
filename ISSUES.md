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

**Estado:** `pending`
**Severidad:** Crítica (performance)

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

**Estado:** `pending`
**Severidad:** Alta

### Tareas

- [ ] Crear módulo `app/schemas/` con Pydantic v2 y esquemas para: create/update event, create/update project, create review, send message, update profile, RSVP, project member role.
- [ ] Envolver todos los endpoints POST/PUT con un decorador `@validate_body(Schema)` que inyecte el objeto validado.
- [ ] Activar `flask-limiter` (ya está en `requirements.txt`):
    - `/auth/login` → 5/minute por IP
    - `/auth/register` → 3/hour por IP
    - Endpoints públicos de búsqueda → 60/minute por IP
    - Endpoints autenticados generales → 200/minute por user
- [ ] Configurar CORS explícito en `app/__init__.py`: orígenes desde env var `ALLOWED_ORIGINS` separados por coma. Rechazar `*` en producción.
- [ ] Headers de seguridad en Caddy (`caddy/Caddyfile` o similar): CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- [ ] Revisar que TODAS las rutas con `@login_required` verifican ownership cuando modifican recursos (algunos casos en `projects/routes.py` y `events/routes.py` no lo hacen bien).

### Criterio de aceptación
- Payloads malformados devuelven 400 con detalle claro, no 500.
- `curl` repetido al login es bloqueado tras 5 intentos.

---

## Issue #4 — Refactor de rutas duplicadas (events + projects)

**Estado:** `pending`
**Severidad:** Media-Alta (mantenibilidad)

### Tareas

- [ ] Extraer funciones helper en `app/common/`:
    - `serialize_user_summary(user)` con id, name, username, image
    - `haversine_filter(query, lat, lon, radius)` (o mover a PostGIS si se hizo #2)
    - `paginated_response(query, page, per_page)`
- [ ] Crear un mixin `SoftDeleteQueryMixin` que añada `.active()` y `.deleted()` filtros encadenables.
- [ ] Revisar si conviene una clase abstracta `BaseListingResource` o si la extracción de helpers es suficiente (depende del equipo — documentar la decisión).
- [ ] Eliminar el cálculo Haversine inline de `events/routes.py` y `user/routes.py`.

### Criterio de aceptación
- `events/routes.py` y `projects/routes.py` pierden >30% de líneas duplicadas.
- Sin cambios funcionales visibles.

---

## Issue #5 — Completar features a medias (profile views, digest, username)

**Estado:** `pending`
**Severidad:** Media (features rotas)

### Tareas

- [ ] Nuevo modelo `ProfileView(Base)` con `viewer_id`, `viewed_id`, `viewed_at`, índice en `(viewed_id, viewed_at)`. Migración.
- [ ] Endpoint `POST /api/v1/users/<id>/view` que registre la visita con deduplicación (máximo una vista por viewer/viewed cada 24h).
- [ ] Hook en frontend: cuando se carga `/profile/<username>` llamar al endpoint.
- [ ] En `email_tasks.send_weekly_digests`, sustituir `profile_views: 0` por el conteo real de la última semana.
- [ ] Notificación realtime cuando alguien ve tu perfil (opt-in en settings — respetar `email_notifications` y añadir nuevo flag `notify_profile_views`).
- [ ] Endpoint `PUT /api/v1/users/me/username` con validación de unicidad y formato (`^[a-z0-9_-]{3,30}$`). Sólo editable 1 vez cada 30 días.
- [ ] Página en frontend para cambiar username con feedback de disponibilidad en tiempo real.

### Criterio de aceptación
- El email de digest muestra views reales.
- Usuario puede cambiar username desde la UI.

---

## Issue #6 — UI: estados de carga/error, accesibilidad e i18n

**Estado:** `pending`
**Severidad:** Media (UX)

### Tareas

- [ ] Crear componentes reutilizables `<Skeleton />`, `<EmptyState icon title description action />`, `<ErrorState onRetry />`.
- [ ] Añadir estos estados en: búsqueda avanzada, `InteractiveMap`, `PortfolioGallery`, listado de conversaciones, listado de eventos, listado de proyectos, notificaciones.
- [ ] Envolver rutas top-level con `<ErrorBoundary>`.
- [ ] Accesibilidad:
    - `aria-label` en `StarRating`, botones de icono sin texto, toggles
    - `alt` real en imágenes de portfolio/eventos (no solo `""`)
    - Foco visible (no `outline: none` sin reemplazo)
    - Navegación con Tab completa en todos los modales
- [ ] Responsive: revisar alturas fijas (`h-[600px]` en `PortfolioGallery`), usar aspect-ratio en lugar.
- [ ] Integrar `react-i18next`:
    - `src/i18n/es.json` y `src/i18n/en.json`
    - Selector de idioma en el header
    - Fechas con `date-fns` respetando locale
    - Persistir idioma en localStorage
- [ ] Sentry (o alternativa) para capturar errores no atrapados en frontend.

### Criterio de aceptación
- La app se puede usar completa en inglés sin strings hardcoded.
- Lighthouse accessibility score ≥ 90.

---

## Issue #7 — Mejoras del módulo de mapa

**Estado:** `pending`
**Severidad:** Media

### Tareas

- [ ] Try/catch en la carga de Leaflet con fallback a lista plana.
- [ ] Manejar denegación de geolocalización con CTA para introducir ciudad manualmente.
- [ ] Clustering con `react-leaflet-cluster` o `supercluster` cuando hay >50 markers.
- [ ] Persistir último center/zoom en localStorage por usuario.
- [ ] Botón "Buscar en esta área" que refetchea cuando el usuario mueve el mapa.
- [ ] Ruta desde ubicación del usuario al evento/talento (abrir Google Maps o usar OSRM embebido).

### Criterio de aceptación
- Mapa nunca se cuelga si falla la carga.
- Con 500 eventos en pantalla el mapa sigue siendo fluido.

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
