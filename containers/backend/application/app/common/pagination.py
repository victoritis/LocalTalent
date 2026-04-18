"""Paginación uniforme para endpoints de listado."""

from typing import Any, Callable, Iterable


def paginated_response(
    query: Any,
    page: int,
    per_page: int,
    serializer: Callable[[Any], dict],
    *,
    items_key: str = "items",
    error_out: bool = False,
    extra_items_kwargs: dict | None = None,
    decorate_items: Callable[[Iterable[Any], list[dict]], None] | None = None,
) -> dict:
    """Ejecuta `.paginate(...)` y devuelve un dict con el formato estándar.

    - `query`: un `flask_sqlalchemy` Query ya con filtros y ordenado.
    - `page`, `per_page`: saneados por el caller (ints, con límites si aplica).
    - `serializer`: función `(item) -> dict` que serializa cada item.
    - `items_key`: nombre de la lista en el dict de respuesta (p.ej. "events").
    - `decorate_items`: hook opcional para decorar con datos agregados
      (contadores, distancias, etc.) en una sola pasada tras serializar.
    """
    pagination = query.paginate(page=page, per_page=per_page, error_out=error_out)
    items = pagination.items
    serialized = [serializer(item) for item in items]
    if decorate_items is not None:
        decorate_items(items, serialized)

    response = {
        items_key: serialized,
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": page,
        "per_page": per_page,
    }
    if extra_items_kwargs:
        response.update(extra_items_kwargs)
    return response
