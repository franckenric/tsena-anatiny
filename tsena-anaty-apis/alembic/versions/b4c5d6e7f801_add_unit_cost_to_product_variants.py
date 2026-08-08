"""add unit_cost to product_variants

Revision ID: b4c5d6e7f801
Revises: a3b4c5d6e7f8
Create Date: 2026-08-08 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b4c5d6e7f801'
down_revision = 'a3b4c5d6e7f8'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('product_variants', sa.Column('unit_cost', sa.Float(), nullable=True))


def downgrade():
    op.drop_column('product_variants', 'unit_cost')
