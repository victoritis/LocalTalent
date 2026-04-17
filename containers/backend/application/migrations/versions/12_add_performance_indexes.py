"""add performance indexes for Issue #2

Revision ID: 12_add_performance_indexes
Revises: 11_add_fk_cascades
Create Date: 2026-04-17 13:00:00.000000

Añade índices para eliminar sequencial scans en los endpoints de listado
(messaging, events, projects, reviews, user search) y para permitir
Haversine en SQL sin cargar toda la tabla a memoria.
"""
from alembic import op
import sqlalchemy as sa


revision = '12_add_performance_indexes'
down_revision = '11_add_fk_cascades'
branch_labels = None
depends_on = None


# (nombre, tabla, columnas/expresiones, using, kwargs)
SIMPLE_INDEXES = [
    ('idx_user_category_public', 'user', ['category', 'is_profile_public'], None),
    ('idx_event_public_start', 'event', ['is_public', 'start_date'], None),
    ('idx_event_creator', 'event', ['creator_id'], None),
    ('idx_event_location', 'event', ['latitude', 'longitude'], None),
    ('idx_project_public_status', 'project', ['is_public', 'status'], None),
    ('idx_project_creator', 'project', ['creator_id'], None),
    ('idx_project_required_skills', 'project', ['required_skills'], 'gin'),
    ('idx_message_conv_created', 'message', ['conversation_id', '"createdAt"'], None),
    ('idx_message_conv_unread', 'message', ['conversation_id', 'is_read', 'sender_id'], None),
    ('idx_rsvp_event_status', 'event_rsvp', ['event_id', 'status'], None),
    ('idx_project_member_project_status', 'project_member', ['project_id', 'status'], None),
    ('idx_review_reviewee', 'review', ['reviewee_id'], None),
]


def upgrade():
    bind = op.get_bind()

    for name, table, columns, using in SIMPLE_INDEXES:
        cols = ', '.join(columns)
        using_sql = f' USING {using}' if using else ''
        bind.execute(sa.text(
            f'CREATE INDEX IF NOT EXISTS {name} ON "{table}"{using_sql} ({cols})'
        ))

    # Índice funcional en LOWER(first_name || ' ' || last_name) para búsqueda
    # por nombre case-insensitive.
    bind.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS idx_user_full_name_lower "
        "ON \"user\" (LOWER(first_name || ' ' || last_name))"
    ))

    # Índice GIN de full-text sobre bio (permite búsqueda textual eficiente).
    bind.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS idx_user_bio_fts "
        "ON \"user\" USING gin (to_tsvector('english', coalesce(bio, '')))"
    ))


def downgrade():
    bind = op.get_bind()
    index_names = [name for name, *_ in SIMPLE_INDEXES] + [
        'idx_user_full_name_lower',
        'idx_user_bio_fts',
    ]
    for name in index_names:
        bind.execute(sa.text(f'DROP INDEX IF EXISTS {name}'))
