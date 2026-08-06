"""add unit_cost and another_price to orders

Revision ID: f4a5b6c7d8e9
Revises: e8f9a0b1c2d3
Create Date: 2026-06-13

"""
from alembic import op
import sqlalchemy as sa


revision = "f4a5b6c7d8e9"
down_revision = "e8f9a0b1c2d3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    orders_cols = [c["name"] for c in inspector.get_columns("orders")]

    with op.batch_alter_table("orders") as batch_op:
        if "unit_cost" not in orders_cols:
            batch_op.add_column(sa.Column("unit_cost", sa.Float(), nullable=True))
        if "another_price" not in orders_cols:
            batch_op.add_column(sa.Column("another_price", sa.Float(), nullable=True, server_default="0"))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    orders_cols = [c["name"] for c in inspector.get_columns("orders")]

    with op.batch_alter_table("orders") as batch_op:
        if "another_price" in orders_cols:
            batch_op.drop_column("another_price")
        if "unit_cost" in orders_cols:
            batch_op.drop_column("unit_cost")
