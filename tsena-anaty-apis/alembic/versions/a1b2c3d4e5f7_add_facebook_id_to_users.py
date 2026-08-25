"""add_facebook_id_to_users

Revision ID: a1b2c3d4e5f7
Revises: 168716aa2de4
Create Date: 2026-08-18 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f7'
down_revision = '168716aa2de4'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('facebook_id', sa.String(255), nullable=True))
    op.create_index('ix_users_facebook_id', 'users', ['facebook_id'], unique=True)


def downgrade():
    op.drop_index('ix_users_facebook_id', table_name='users')
    op.drop_column('users', 'facebook_id')
