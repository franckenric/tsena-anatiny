"""add lot_id to stock_movements

Revision ID: b3d4e5f6a7b8
Revises: a1b2c3d4e5f6
Create Date: 2026-06-08

"""
from alembic import op
import sqlalchemy as sa

revision = "b3d4e5f6a7b8"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = [c["name"] for c in inspector.get_columns("stock_movements")]

    if "lot_id" not in cols:
        with op.batch_alter_table("stock_movements") as batch_op:
            batch_op.add_column(sa.Column("lot_id", sa.Integer(), nullable=True))
            batch_op.create_index("ix_stock_movements_lot_id", ["lot_id"])


def downgrade():
    with op.batch_alter_table("stock_movements") as batch_op:
        batch_op.drop_index("ix_stock_movements_lot_id")
        batch_op.drop_column("lot_id")
