"""add profile views, notify_profile_views flag and username_changed_at (Issue #5)

Revision ID: 13_profile_views_username
Revises: 12_add_performance_indexes
Create Date: 2026-04-18 00:00:00.000000

- Nueva tabla `profile_view` para registrar visitas a perfiles
  (con deduplicación por ventana horaria a nivel de aplicación).
- Nuevo flag `notify_profile_views` en `user` para el opt-in de
  notificaciones cuando alguien ve tu perfil.
- Nuevo campo `username_changed_at` en `user` para limitar cambios
  de username a 1 cada 30 días.
"""
from alembic import op
import sqlalchemy as sa


revision = '13_profile_views_username'
down_revision = '12_add_performance_indexes'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'user',
        sa.Column('notify_profile_views', sa.Boolean(), nullable=False, server_default='false'),
    )
    op.add_column(
        'user',
        sa.Column('username_changed_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'profile_view',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('viewer_id', sa.Integer(), nullable=False),
        sa.Column('viewed_id', sa.Integer(), nullable=False),
        sa.Column('viewed_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('createdAt', sa.DateTime(), nullable=True),
        sa.Column('updatedAt', sa.DateTime(), nullable=True),
        sa.Column('deletedAt', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['viewer_id'], ['user.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['viewed_id'], ['user.id'], ondelete='CASCADE'),
        sa.CheckConstraint('viewer_id != viewed_id', name='no_self_profile_view'),
    )
    op.create_index(
        'idx_profile_view_viewed_viewed_at',
        'profile_view',
        ['viewed_id', 'viewed_at'],
    )
    op.create_index(
        'idx_profile_view_viewer_viewed_viewed_at',
        'profile_view',
        ['viewer_id', 'viewed_id', 'viewed_at'],
    )


def downgrade():
    op.drop_index('idx_profile_view_viewer_viewed_viewed_at', table_name='profile_view')
    op.drop_index('idx_profile_view_viewed_viewed_at', table_name='profile_view')
    op.drop_table('profile_view')
    op.drop_column('user', 'username_changed_at')
    op.drop_column('user', 'notify_profile_views')
