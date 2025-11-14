# Nuevas Funcionalidades - LocalTalent

## Sistema de Valoraciones y Reviews

### Backend

#### Modelo de Datos
- **Tabla `review`**: Almacena las valoraciones de usuarios
  - `reviewer_id`: ID del usuario que hace la valoración
  - `reviewee_id`: ID del usuario que recibe la valoración
  - `rating`: Puntuación de 1 a 5 estrellas
  - `comment`: Comentario opcional (máx 500 caracteres)
  - Constraints:
    - Un usuario solo puede valorar a otro usuario una vez
    - No se puede auto-valorar
    - Rating debe estar entre 1 y 5

#### Endpoints de Reviews

1. **POST `/api/v1/reviews`** - Crear nueva review
   - Requiere autenticación
   - Validación: Solo se puede valorar tras tener una conversación
   - Body: `{ reviewee_id, rating, comment? }`

2. **GET `/api/v1/reviews/<username>`** - Obtener reviews de un usuario
   - Endpoint público
   - Retorna: lista de reviews + promedio de rating

3. **GET `/api/v1/reviews/user/<username>/average`** - Promedio de valoraciones
   - Endpoint público
   - Retorna: average_rating y review_count

4. **PUT `/api/v1/reviews/<review_id>`** - Editar review
   - Solo el creador puede editar
   - Body: `{ rating?, comment? }`

5. **DELETE `/api/v1/reviews/<review_id>`** - Eliminar review (soft delete)
   - Solo el creador puede eliminar

6. **GET `/api/v1/reviews/can-review/<username>`** - Verificar si puede hacer review
   - Requiere autenticación
   - Valida: no auto-review, no duplicados, tiene conversación previa

7. **GET `/api/v1/reviews/my-reviews`** - Mis reviews creadas
   - Requiere autenticación
   - Lista de reviews que el usuario ha creado

### Frontend

#### Componentes de Reviews

1. **`StarRating.tsx`**
   - Componente de estrellas interactivo y de solo lectura
   - Props: `rating`, `maxRating`, `size`, `interactive`, `onRatingChange`
   - Variante `StarRatingDisplay`: muestra rating + cantidad de reviews

2. **`ReviewList.tsx`**
   - Lista de reviews de un usuario
   - Muestra promedio de valoraciones
   - Props: `username`, `showAverage`

3. **`CreateReview.tsx`**
   - Modal para crear/editar reviews
   - Validación automática de permisos
   - Props: `username`, `revieweeId`, `onReviewCreated`, `trigger`

#### Integración
Para integrar reviews en un perfil:

```tsx
import { ReviewList } from '@/components/reviews/ReviewList'
import { CreateReview } from '@/components/reviews/CreateReview'
import { StarRatingDisplay } from '@/components/reviews/StarRating'

// En el perfil público
<ReviewList username={username} />

// Botón para crear review
<CreateReview username={username} revieweeId={userId} onReviewCreated={refetch} />

// Mostrar rating promedio
<StarRatingDisplay rating={avgRating} reviewCount={count} />
```

---

## Sistema de Búsqueda Avanzada

### Backend

#### Modelo de Datos
- **Tabla `saved_search`**: Búsquedas guardadas por el usuario
  - `user_id`: ID del usuario
  - `name`: Nombre de la búsqueda guardada
  - `search_params`: JSON con parámetros de búsqueda

#### Endpoints de Búsqueda

1. **GET `/api/v1/users/search`** - Búsqueda avanzada con filtros
   - Parámetros disponibles:
     - `query`: Búsqueda por nombre/username
     - `radius`: Radio de distancia en km
     - `latitude` y `longitude`: Coordenadas del punto de búsqueda
     - `skills`: Habilidades (separadas por coma)
     - `category`: Categoría de talento
     - `sort_by`: `distance`, `rating`, o `created_at`
     - `page` y `per_page`: Paginación

   - Retorna:
     - Lista de usuarios con distancia calculada
     - Average rating de cada usuario
     - Información de paginación

2. **Fórmula de Haversine**
   - Función `haversine_distance(lat1, lon1, lat2, lon2)`
   - Calcula distancia entre dos puntos en km
   - Usado para filtrar por radio y ordenar por cercanía

#### Endpoints de Búsquedas Guardadas

1. **GET `/api/v1/saved-searches`** - Listar búsquedas guardadas
   - Requiere autenticación

2. **POST `/api/v1/saved-searches`** - Crear búsqueda guardada
   - Body: `{ name, search_params }`

3. **PUT `/api/v1/saved-searches/<search_id>`** - Actualizar búsqueda
   - Body: `{ name?, search_params? }`

4. **DELETE `/api/v1/saved-searches/<search_id>`** - Eliminar búsqueda

### Frontend

#### Componente de Búsqueda

**`AdvancedSearch.tsx`**
- Buscador completo con filtros avanzados
- Panel lateral con todos los filtros
- Resultados con paginación
- Geolocalización automática
- Guardar búsquedas favoritas

Props:
- `onResultsChange`: Callback con resultados
- `initialFilters`: Filtros iniciales opcionales

Características:
- ✅ Búsqueda por texto (nombre/username)
- ✅ Filtro por categoría
- ✅ Filtro por habilidades múltiples
- ✅ Radio de distancia con geolocalización
- ✅ Ordenar por: distancia, rating, reciente
- ✅ Paginación de resultados
- ✅ Guardar búsquedas

#### Uso del Componente

```tsx
import { AdvancedSearch } from '@/components/search/AdvancedSearch'

// Búsqueda básica
<AdvancedSearch onResultsChange={(results) => console.log(results)} />

// Con filtros iniciales
<AdvancedSearch
  initialFilters={{
    category: 'musician',
    radius: 50,
    sort_by: 'rating'
  }}
/>
```

---

## Migración de Base de Datos

Archivo: `/containers/backend/application/migrations/versions/7_add_reviews_and_search.py`

Para ejecutar la migración:
```bash
# Dentro del contenedor backend
flask db upgrade
```

La migración crea:
- Tabla `review` con constraints de validación
- Tabla `saved_search` con campo JSONB
- Foreign keys a tabla `user`
- Índices para optimizar consultas

---

## Estructura de Archivos

### Backend
```
app/
├── models.py                    # Modelos Review y SavedSearch
├── reviews/
│   ├── __init__.py
│   └── routes.py               # Endpoints de reviews
└── user/
    └── routes.py               # Endpoints de búsqueda (añadidos)
```

### Frontend
```
components/
├── reviews/
│   ├── StarRating.tsx          # Componente de estrellas
│   ├── ReviewList.tsx          # Lista de reviews
│   └── CreateReview.tsx        # Crear/editar review
└── search/
    └── AdvancedSearch.tsx      # Búsqueda avanzada
```

---

## Características de Seguridad

1. **Validación de Reviews**
   - Solo valorar tras interacción (conversación)
   - No auto-valoraciones
   - Una review por par de usuarios
   - Rating limitado a 1-5

2. **Soft Deletes**
   - Todas las eliminaciones son soft deletes
   - Datos preservados para auditoría

3. **Autenticación**
   - Endpoints protegidos con `@login_required`
   - Validación de propiedad en edición/eliminación

4. **Sanitización**
   - Comentarios limitados a 500 caracteres
   - Validación de tipos en todos los inputs
   - Protección contra SQL injection (SQLAlchemy ORM)

---

## Performance

1. **Optimizaciones de Búsqueda**
   - Filtros aplicados en base de datos
   - Cálculo de distancia solo para resultados filtrados
   - Paginación para limitar resultados

2. **Caching Potencial**
   - Average rating se puede cachear con Redis
   - Búsquedas frecuentes se pueden cachear

3. **Índices Recomendados**
```sql
CREATE INDEX idx_review_reviewee ON review(reviewee_id) WHERE deletedAt IS NULL;
CREATE INDEX idx_review_rating ON review(rating) WHERE deletedAt IS NULL;
CREATE INDEX idx_user_category ON user(category) WHERE deletedAt IS NULL;
CREATE INDEX idx_user_location ON user(latitude, longitude) WHERE deletedAt IS NULL;
```

---

## Testing

### Endpoints a Testear

1. **Reviews**
   - ✅ Crear review con datos válidos
   - ✅ Rechazar auto-review
   - ✅ Rechazar review duplicada
   - ✅ Rechazar review sin conversación previa
   - ✅ Editar solo reviews propias
   - ✅ Eliminar solo reviews propias

2. **Búsqueda**
   - ✅ Búsqueda sin filtros
   - ✅ Búsqueda con radio de distancia
   - ✅ Búsqueda por categoría
   - ✅ Búsqueda por habilidades
   - ✅ Ordenar por distancia/rating
   - ✅ Paginación correcta

3. **Búsquedas Guardadas**
   - ✅ Crear, listar, editar, eliminar
   - ✅ Solo acceder a búsquedas propias

---

## Próximas Mejoras

1. **Reviews**
   - [ ] Respuestas a reviews
   - [ ] Reportar reviews inapropiadas
   - [ ] Moderación de reviews
   - [ ] Fotos en reviews

2. **Búsqueda**
   - [ ] Búsqueda por rango de precios
   - [ ] Filtro por disponibilidad
   - [ ] Búsqueda por proyectos anteriores
   - [ ] Mapas interactivos en resultados

3. **Performance**
   - [ ] Implementar caching de ratings
   - [ ] Optimizar consultas N+1
   - [ ] Añadir índices full-text
   - [ ] WebSocket para updates en tiempo real
