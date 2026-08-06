"""rename selling_price to another_price

Revision ID: a9b8c7d6e5f4
Revises: f1a2b3c4d5e6
Create Date: 2026-06-09

"""
from alembic import op
import sqlalchemy as sa


revision = "a9b8c7d6e5f4"
down_revision = "f1a2b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = [c["name"] for c in inspector.get_columns("products")]

    if "selling_price" in cols and "another_price" not in cols:
        with op.batch_alter_table("products") as batch_op:
            batch_op.alter_column("selling_price", new_column_name="another_price")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = [c["name"] for c in inspector.get_columns("products")]

    if "another_price" in cols and "selling_price" not in cols:
        with op.batch_alter_table("products") as batch_op:
            batch_op.alter_column("another_price", new_column_name="selling_price")
