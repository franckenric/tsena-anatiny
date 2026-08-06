"""add unit cost fields to stock movements

Revision ID: b7e2c9f3a1d4
Revises: e8f9a0b1c2d3
Create Date: 2026-06-09

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b7e2c9f3a1d4"
down_revision = "e8f9a0b1c2d3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("stock_movements", sa.Column("unit_cost", sa.Float(), nullable=True))
    op.add_column("stock_movements", sa.Column("total_cost", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("stock_movements", "total_cost")
    op.drop_column("stock_movements", "unit_cost")
