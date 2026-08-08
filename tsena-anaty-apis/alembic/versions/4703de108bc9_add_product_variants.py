"""add product variants

Revision ID: 4703de108bc9
Revises: ecf236620597
Create Date: 2026-08-08 16:55:06.002174

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4703de108bc9'
down_revision = 'ecf236620597'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('product_variants',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('product_id', sa.Integer(), nullable=False),
    sa.Column('parent_id', sa.Integer(), nullable=True),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('sku', sa.String(length=255), nullable=True),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.Column('deleted_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['parent_id'], ['product_variants.id'], ),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('id')
    )
    op.create_index(op.f('ix_product_variants_parent_id'), 'product_variants', ['parent_id'], unique=False)
    op.create_index(op.f('ix_product_variants_product_id'), 'product_variants', ['product_id'], unique=False)
    op.add_column('stock_movements', sa.Column('variant_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_stock_movements_variant_id'), 'stock_movements', ['variant_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_stock_movements_variant_id'), table_name='stock_movements')
    op.drop_column('stock_movements', 'variant_id')
    op.drop_index(op.f('ix_product_variants_product_id'), table_name='product_variants')
    op.drop_index(op.f('ix_product_variants_parent_id'), table_name='product_variants')
    op.drop_table('product_variants')