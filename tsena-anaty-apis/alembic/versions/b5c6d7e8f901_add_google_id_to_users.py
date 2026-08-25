"""add_google_id_to_users

Revision ID: b5c6d7e8f901
Revises: a1b2c3d4e5f7
Create Date: 2026-08-20 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'b5c6d7e8f901'
down_revision = 'a1b2c3d4e5f7'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('google_id', sa.String(255), nullable=True))
    op.create_index('ix_users_google_id', 'users', ['google_id'], unique=True)


def downgrade():
    op.drop_index('ix_users_google_id', table_name='users')
    op.drop_column('users', 'google_id')
