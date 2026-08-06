"""move prices from products to stock_movements

Revision ID: b2c3d4e5f6a7
Revises: a9b8c7d6e5f4
Create Date: 2026-06-09

"""
from alembic import op
import sqlalchemy as sa


revision = "b2c3d4e5f6a7"
down_revision = "a9b8c7d6e5f4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    product_cols = [c["name"] for c in inspector.get_columns("products")]
    with op.batch_alter_table("products") as batch_op:
        if "cost_price" in product_cols:
            batch_op.drop_column("cost_price")
        if "another_price" in product_cols:
            batch_op.drop_column("another_price")
        if "selling_price" in product_cols:
            batch_op.drop_column("selling_price")

    movement_cols = [c["name"] for c in inspector.get_columns("stock_movements")]
    if "another_price" not in movement_cols:
        with op.batch_alter_table("stock_movements") as batch_op:
            batch_op.add_column(sa.Column("another_price", sa.Float(), nullable=True, server_default="0"))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    product_cols = [c["name"] for c in inspector.get_columns("products")]
    with op.batch_alter_table("products") as batch_op:
        if "cost_price" not in product_cols:
            batch_op.add_column(sa.Column("cost_price", sa.Float(), nullable=True))
        if "another_price" not in product_cols:
            batch_op.add_column(sa.Column("another_price", sa.Float(), nullable=True))

    movement_cols = [c["name"] for c in inspector.get_columns("stock_movements")]
    if "another_price" in movement_cols:
        with op.batch_alter_table("stock_movements") as batch_op:
            batch_op.drop_column("another_price")
