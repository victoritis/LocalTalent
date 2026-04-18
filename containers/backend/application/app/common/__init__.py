"""Helpers compartidos entre blueprints (serialización, paginación, geodistancia).

Ubicamos aquí código que aparecía duplicado en `events/routes.py`,
`projects/routes.py` y `user/routes.py`. El objetivo es que cada ruta se
quede con su lógica de negocio, y los detalles mecánicos vivan en un sitio.

Decisión de diseño (issue #4):

Se valoró introducir una clase abstracta `BaseListingResource` al estilo
Flask-RESTful, pero eso implicaría migrar todos los blueprints a una
arquitectura distinta y romper el estilo actual basado en funciones de
Flask puras. En su lugar optamos por **composición de helpers**:
`paginated_response`, `haversine_km_sql`, `serialize_user_summary` y el
`SoftDeleteQueryMixin`. Es menos magia, encaja con el resto del código y
cubre el 100% de la duplicación objetivo sin tocar las firmas públicas.
"""

from app.common.serializers import serialize_user_summary
from app.common.pagination import paginated_response
from app.common.geo import haversine_km_sql, haversine_filter
from app.common.soft_delete import SoftDeleteQueryMixin, active_filter

__all__ = [
    "serialize_user_summary",
    "paginated_response",
    "haversine_km_sql",
    "haversine_filter",
    "SoftDeleteQueryMixin",
    "active_filter",
]
