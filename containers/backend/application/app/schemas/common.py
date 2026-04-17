"""
Helpers de validación de entrada basados en Pydantic v2.

Provee un decorador `@validate_body(Schema)` que:
- Parsea JSON de la request.
- Valida contra el esquema pydantic.
- En caso de error, devuelve 400 con un detalle claro.
- Si la validación pasa, inyecta la instancia validada como kwarg `payload`.
"""
from functools import wraps
from flask import request, jsonify
from pydantic import BaseModel, ValidationError as PydanticValidationError


class ValidationError(Exception):
    """Error de validación de esquema con detalle legible."""

    def __init__(self, errors):
        self.errors = errors
        super().__init__("Datos inválidos")


def _format_errors(exc: PydanticValidationError):
    """Devuelve una lista compacta [{field, message, type}]."""
    out = []
    for err in exc.errors():
        loc = ".".join(str(x) for x in err.get('loc', ()))
        out.append({
            'field': loc or '<root>',
            'message': err.get('msg'),
            'type': err.get('type'),
        })
    return out


def validate_body(schema: type[BaseModel]):
    """Decorador: valida request.json contra `schema` y lo inyecta como `payload`."""

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            raw = request.get_json(silent=True)
            if raw is None:
                return jsonify({
                    'error': 'Body JSON requerido',
                    'details': [{'field': '<root>', 'message': 'Se esperaba JSON'}],
                }), 400
            try:
                payload = schema.model_validate(raw)
            except PydanticValidationError as exc:
                return jsonify({
                    'error': 'Datos inválidos',
                    'details': _format_errors(exc),
                }), 400
            return fn(*args, payload=payload, **kwargs)

        return wrapper

    return decorator
