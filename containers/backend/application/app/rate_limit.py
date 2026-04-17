"""
Rate limiter (flask-limiter) configurado para LocalTalent.

- Usa Redis como storage si hay `REDIS_URL`; memoria en tests.
- Clave por defecto: `user.id` si hay sesión, IP en caso contrario.
- Límite global moderado para endpoints autenticados.
"""
from flask_limiter import Limiter
from flask_login import current_user


def _resolve_key():
    """Identificar al cliente para contar peticiones.

    Usuarios autenticados → `user:<id>` (evita que usuarios compartiendo IP
    se bloqueen entre ellos). Resto → IP remota (a través de get_remote_address).
    """
    try:
        if current_user.is_authenticated:
            return f"user:{current_user.id}"
    except Exception:
        pass
    # Fallback a IP
    from flask_limiter.util import get_remote_address
    return get_remote_address()


# Se creará `limiter` sin app y se enlazará en `create_app`.
limiter = Limiter(
    key_func=_resolve_key,
    default_limits=["200/minute"],
    headers_enabled=True,
)
