"""add_discount_price_to_products_and_variants

Revision ID: 168716aa2de4
Revises: 1383af1a5e26
Create Date: 2026-08-17 05:20:42.472599

"""
from alembic import op
import sqlalchemy as sa

revision = '168716aa2de4'
down_revision = '1383af1a5e26'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('products', sa.Column('discount_price', sa.Float(), nullable=True))
    op.add_column('product_variants', sa.Column('discount_price', sa.Float(), nullable=True))


def downgrade():
    op.drop_column('product_variants', 'discount_price')
    op.drop_column('products', 'discount_price')
