"""add selling_price to product_variants

Revision ID: 5f6a7b8c9d0e
Revises: 4703de108bc9
Create Date: 2026-08-08 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5f6a7b8c9d0e'
down_revision = '4703de108bc9'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('product_variants', sa.Column('selling_price', sa.Float(), nullable=True))


def downgrade():
    op.drop_column('product_variants', 'selling_price')
