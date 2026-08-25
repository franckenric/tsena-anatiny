"""add_icon_to_users

Revision ID: c2d3e4f5a6b7
Revises: b5c6d7e8f901
Create Date: 2026-08-21 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'c2d3e4f5a6b7'
down_revision = 'b5c6d7e8f901'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('icon', sa.String(1024), nullable=True))


def downgrade():
    op.drop_column('users', 'icon')
