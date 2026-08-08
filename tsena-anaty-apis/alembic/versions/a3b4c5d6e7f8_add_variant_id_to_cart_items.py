"""add variant_id to cart_items

Revision ID: a3b4c5d6e7f8
Revises: 6a7b8c9d0e1f
Create Date: 2026-08-08 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a3b4c5d6e7f8'
down_revision = '6a7b8c9d0e1f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('cart_items', schema=None) as batch_op:
        batch_op.add_column(sa.Column('variant_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_cart_items_variant_id', 'product_variants', ['variant_id'], ['id']
        )
        batch_op.create_index('ix_cart_items_variant_id', ['variant_id'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('cart_items', schema=None) as batch_op:
        batch_op.drop_index('ix_cart_items_variant_id')
        batch_op.drop_constraint('fk_cart_items_variant_id', type_='foreignkey')
        batch_op.drop_column('variant_id')
