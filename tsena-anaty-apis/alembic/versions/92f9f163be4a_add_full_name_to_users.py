"""add full_name to users

Revision ID: 92f9f163be4a
Revises: 3d4a66ae792b
Create Date: 2026-06-08

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '92f9f163be4a'
down_revision = '3d4a66ae792b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('full_name', sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'full_name')
