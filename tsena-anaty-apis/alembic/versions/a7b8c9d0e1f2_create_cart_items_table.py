"""create_cart_items_table

Revision ID: a7b8c9d0e1f2
Revises: f9a1b2c3d4e5
Create Date: 2026-06-13 23:55:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a7b8c9d0e1f2'
down_revision = 'f9a1b2c3d4e5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'cart_items',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('customer_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('unit_cost', sa.Float(), nullable=True),
        sa.Column('another_price', sa.Float(), nullable=True),
        sa.Column('other_price_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id']),
        sa.ForeignKeyConstraint(['product_id'], ['products.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('id'),
    )
    op.create_index('ix_cart_items_customer_id', 'cart_items', ['customer_id'])
    op.create_index('ix_cart_items_product_id', 'cart_items', ['product_id'])


def downgrade() -> None:
    op.drop_index('ix_cart_items_product_id', table_name='cart_items')
    op.drop_index('ix_cart_items_customer_id', table_name='cart_items')
    op.drop_table('cart_items')
