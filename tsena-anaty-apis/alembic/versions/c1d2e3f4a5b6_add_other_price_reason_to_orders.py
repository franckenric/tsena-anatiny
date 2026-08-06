"""add other_price_reason to orders

Revision ID: c1d2e3f4a5b6
Revises: a7b8c9d0e1f2
Create Date: 2026-06-13

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c1d2e3f4a5b6"
down_revision = "a7b8c9d0e1f2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    orders_cols = [c["name"] for c in inspector.get_columns("orders")]

    with op.batch_alter_table("orders") as batch_op:
        if "another_price" not in orders_cols:
            batch_op.add_column(
                sa.Column("another_price", sa.Float(), nullable=True, server_default="0")
            )
        if "other_price_reason" not in orders_cols:
            batch_op.add_column(sa.Column("other_price_reason", sa.Text(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    orders_cols = [c["name"] for c in inspector.get_columns("orders")]

    with op.batch_alter_table("orders") as batch_op:
        if "other_price_reason" in orders_cols:
            batch_op.drop_column("other_price_reason")
