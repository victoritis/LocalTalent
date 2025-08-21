from sqlalchemy import event
from sqlalchemy.orm import Session, with_loader_criteria
from app.models import Base

@event.listens_for(Session, "do_orm_execute")
def _soft_delete_criteria(execute_state):
    """
    Aplica soft-delete automático (deletedAt IS NULL)
    a todas las entidades que hereden de Base, a menos que
    la opción 'include_soft_deleted' esté presente y sea True.
    """
    # Comprobar si la opción para incluir soft-deleted está presente y activada
    if execute_state.execution_options.get("include_soft_deleted", False):
        # Si la opción es True, no aplicamos el filtro automático
        return

    # Aplicar el filtro solo en SELECTs y si la opción no está activada
    if execute_state.is_select and not execute_state.is_column_load and not execute_state.is_relationship_load:
        execute_state.statement = execute_state.statement.options(
            with_loader_criteria(
                Base,
                lambda cls: cls.deletedAt.is_(None),
                include_aliases=True
            )
        )
