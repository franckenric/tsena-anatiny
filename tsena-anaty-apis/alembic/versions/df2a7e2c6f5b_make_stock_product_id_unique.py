"""make stock product_id unique

Revision ID: df2a7e2c6f5b
Revises: 92f9f163be4a
Create Date: 2026-06-08

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = 'df2a7e2c6f5b'
down_revision = '92f9f163be4a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index('ix_stock_product_id', 'stock', ['product_id'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_stock_product_id', table_name='stock')
