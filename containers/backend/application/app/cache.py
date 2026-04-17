"""Cache centralizado de la aplicación.

Envuelve `flask-caching` con backend Redis. Se inicializa en `create_app`
leyendo `REDIS_URL` de la configuración. Expone helpers específicos de
dominio para invalidaciones puntuales (ratings por usuario, contadores de
RSVP por evento) que son los hotspots identificados en el Issue #2.
"""
from flask_caching import Cache

cache = Cache()


def _rating_key(user_id: int) -> str:
    return f"user:{user_id}:rating"


def get_user_rating_cached(user_id: int):
    """Devuelve (avg, count) cacheado para el usuario o None si no hay entrada."""
    return cache.get(_rating_key(user_id))


def set_user_rating_cached(user_id: int, avg: float, count: int, timeout: int = 3600):
    cache.set(_rating_key(user_id), (avg, count), timeout=timeout)


def invalidate_user_rating(user_id: int):
    cache.delete(_rating_key(user_id))


def _event_attendee_key(event_id: int) -> str:
    return f"event:{event_id}:confirmed_count"


def get_event_confirmed_count_cached(event_id: int):
    return cache.get(_event_attendee_key(event_id))


def set_event_confirmed_count_cached(event_id: int, count: int, timeout: int = 300):
    cache.set(_event_attendee_key(event_id), count, timeout=timeout)


def invalidate_event_confirmed_count(event_id: int):
    cache.delete(_event_attendee_key(event_id))
