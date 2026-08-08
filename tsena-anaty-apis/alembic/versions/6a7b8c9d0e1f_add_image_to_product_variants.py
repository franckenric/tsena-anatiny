"""add image to product_variants

Revision ID: 6a7b8c9d0e1f
Revises: 5f6a7b8c9d0e
Create Date: 2026-08-08 19:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '6a7b8c9d0e1f'
down_revision = '5f6a7b8c9d0e'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('product_variants', sa.Column('image', sa.String(length=255), nullable=True))


def downgrade():
    op.drop_column('product_variants', 'image')
