"""create lot expenses table

Revision ID: f1a2b3c4d5e6
Revises: b7e2c9f3a1d4
Create Date: 2026-06-09

"""
from alembic import op
import sqlalchemy as sa


revision = "f1a2b3c4d5e6"
down_revision = "b7e2c9f3a1d4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "lot_expenses",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("lot_id", sa.Integer(), sa.ForeignKey("lots.id"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("amount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=True, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_lot_expenses_lot_id", "lot_expenses", ["lot_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_lot_expenses_lot_id", table_name="lot_expenses")
    op.drop_table("lot_expenses")
