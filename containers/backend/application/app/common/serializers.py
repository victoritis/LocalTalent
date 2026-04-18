"""Serializadores compartidos de entidades frecuentes."""

from typing import Any, Optional


def serialize_user_summary(user: Optional[Any]) -> Optional[dict]:
    """Resumen estándar de un usuario: id, name, username, image.

    Usado en creator/sender/inviter/member en listings y detalles. Devuelve
    `None` si el usuario es `None` para que los callers puedan encadenar
    sin comprobar el caso. `display_username` cae a `username` si la
    property no existe.
    """
    if user is None:
        return None

    username = getattr(user, "display_username", None) or getattr(user, "username", None)
    first = getattr(user, "first_name", "") or ""
    last = getattr(user, "last_name", "") or ""
    name = f"{first} {last}".strip() or None

    return {
        "id": user.id,
        "name": name,
        "username": username,
        "image": getattr(user, "profile_image", None),
    }
