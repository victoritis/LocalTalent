"""add ON DELETE cascades to foreign keys

Revision ID: 11_add_fk_cascades
Revises: 10_add_username_field
Create Date: 2026-04-17 12:00:00.000000

Reemplaza las FKs sin cascade por FKs con ON DELETE CASCADE o SET NULL
según corresponda, para evitar registros huérfanos al eliminar usuarios,
eventos o proyectos.

Los nombres de constraint siguen la convención por defecto de PostgreSQL:
    <tabla>_<columna>_fkey
"""
from alembic import op


# revision identifiers, used by Alembic.
revision = '11_add_fk_cascades'
down_revision = '10_add_username_field'
branch_labels = None
depends_on = None


# (tabla, columna, tabla_referenciada, columna_referenciada, ondelete)
CASCADE_FKS = [
    ('portfolio', 'user_id', 'user', 'id', 'CASCADE'),
    ('conversation', 'participant1_id', 'user', 'id', 'CASCADE'),
    ('conversation', 'participant2_id', 'user', 'id', 'CASCADE'),
    ('message', 'conversation_id', 'conversation', 'id', 'CASCADE'),
    ('message', 'sender_id', 'user', 'id', 'CASCADE'),
    ('notification', 'user_id', 'user', 'id', 'CASCADE'),
    ('review', 'reviewer_id', 'user', 'id', 'CASCADE'),
    ('review', 'reviewee_id', 'user', 'id', 'CASCADE'),
    ('saved_search', 'user_id', 'user', 'id', 'CASCADE'),
    ('event', 'creator_id', 'user', 'id', 'CASCADE'),
    ('project', 'creator_id', 'user', 'id', 'CASCADE'),
    ('event_rsvp', 'event_id', 'event', 'id', 'CASCADE'),
    ('event_rsvp', 'user_id', 'user', 'id', 'CASCADE'),
    ('project_member', 'project_id', 'project', 'id', 'CASCADE'),
    ('project_member', 'user_id', 'user', 'id', 'CASCADE'),
    ('event_invitation', 'event_id', 'event', 'id', 'CASCADE'),
    ('event_invitation', 'inviter_id', 'user', 'id', 'CASCADE'),
    ('event_invitation', 'invitee_id', 'user', 'id', 'CASCADE'),
    ('event_message', 'event_id', 'event', 'id', 'CASCADE'),
    ('event_message', 'sender_id', 'user', 'id', 'CASCADE'),
    ('blocked_user', 'blocker_id', 'user', 'id', 'CASCADE'),
    ('blocked_user', 'blocked_id', 'user', 'id', 'CASCADE'),
    ('report', 'reporter_id', 'user', 'id', 'CASCADE'),
    ('report', 'reported_id', 'user', 'id', 'CASCADE'),
    ('report', 'reviewed_by', 'user', 'id', 'SET NULL'),
    ('verification_request', 'user_id', 'user', 'id', 'CASCADE'),
    ('verification_request', 'reviewed_by', 'user', 'id', 'SET NULL'),
]


def _fk_name(table, column):
    return f'{table}_{column}_fkey'


def upgrade():
    for table, column, ref_table, ref_column, ondelete in CASCADE_FKS:
        name = _fk_name(table, column)
        op.drop_constraint(name, table, type_='foreignkey')
        op.create_foreign_key(
            name,
            table,
            ref_table,
            [column],
            [ref_column],
            ondelete=ondelete,
        )


def downgrade():
    for table, column, ref_table, ref_column, _ondelete in CASCADE_FKS:
        name = _fk_name(table, column)
        op.drop_constraint(name, table, type_='foreignkey')
        op.create_foreign_key(
            name,
            table,
            ref_table,
            [column],
            [ref_column],
        )
