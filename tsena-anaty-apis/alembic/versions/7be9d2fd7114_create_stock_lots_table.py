"""create stock lots table

Revision ID: 7be9d2fd7114
Revises: df2a7e2c6f5b
Create Date: 2026-06-08

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7be9d2fd7114'
down_revision = 'df2a7e2c6f5b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'stock_lots',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('remaining_quantity', sa.Integer(), nullable=False),
        sa.Column('reference', sa.String(length=255), nullable=True),
        sa.Column('received_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['product_id'], ['products.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('id'),
    )
    op.create_index('ix_stock_lots_product_id', 'stock_lots', ['product_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_stock_lots_product_id', table_name='stock_lots')
    op.drop_table('stock_lots')
