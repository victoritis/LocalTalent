"""Helpers para trabajar con el soft-delete (`deletedAt`) de forma consistente."""

from typing import Any


def active_filter(model: Any):
    """Devuelve la cláusula `Model.deletedAt IS NULL` de forma portable."""
    return model.deletedAt.is_(None)


class SoftDeleteQueryMixin:
    """Mixin para añadir `.active()` / `.deleted()` a Querys derivadas.

    Se puede usar configurando `query_class` en el modelo (ver docs de
    Flask-SQLAlchemy) o aplicándolo manualmente a una subclase de
    `flask_sqlalchemy.query.Query`. El objetivo es que una ruta pueda
    escribir `Event.query.active()` en lugar de repetir
    `filter_by(deletedAt=None)` en cada blueprint.
    """

    def active(self):
        model = self._mapper_zero().class_
        return self.filter(model.deletedAt.is_(None))

    def deleted(self):
        model = self._mapper_zero().class_
        return self.filter(model.deletedAt.isnot(None))
