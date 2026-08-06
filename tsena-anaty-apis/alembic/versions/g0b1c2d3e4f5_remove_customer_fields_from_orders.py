"""Remove customer_name, customer_phone, delivery_address from orders table.

Revision ID: g0b1c2d3e4f5
Revises: f9a1b2c3d4e5
Create Date: 2026-06-13 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'g0b1c2d3e4f5'
down_revision = 'f9a1b2c3d4e5'
branch_labels = None
depends_on = None


def upgrade():
    # Drop the columns that are now redundant with customer relation
    op.drop_column('orders', 'customer_name')
    op.drop_column('orders', 'customer_phone')
    op.drop_column('orders', 'delivery_address')


def downgrade():
    # Add back the columns if rolling back
    op.add_column('orders', sa.Column('customer_name', sa.String(255), nullable=False, server_default=''))
    op.add_column('orders', sa.Column('customer_phone', sa.String(255), nullable=True))
    op.add_column('orders', sa.Column('delivery_address', sa.Text(), nullable=True))
