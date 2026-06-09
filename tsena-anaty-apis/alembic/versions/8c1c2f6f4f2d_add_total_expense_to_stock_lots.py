"""add total_expense to stock_lots

Revision ID: 8c1c2f6f4f2d
Revises: 7be9d2fd7114
Create Date: 2026-06-08

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8c1c2f6f4f2d'
down_revision = '7be9d2fd7114'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('stock_lots', sa.Column('total_expense', sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column('stock_lots', 'total_expense')
