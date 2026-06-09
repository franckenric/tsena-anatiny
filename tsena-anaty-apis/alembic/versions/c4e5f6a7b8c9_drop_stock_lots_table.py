"""drop stock_lots table

Revision ID: c4e5f6a7b8c9
Revises: b3d4e5f6a7b8
Create Date: 2026-06-08

"""
from alembic import op
import sqlalchemy as sa

revision = "c4e5f6a7b8c9"
down_revision = "b3d4e5f6a7b8"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_table("stock_lots")


def downgrade():
    # In downgrade, recreate the table (if needed for rollback)
    op.create_table(
        "stock_lots",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("product_id", sa.Integer(), nullable=True),
        sa.Column("lot_id", sa.Integer(), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("remaining_quantity", sa.Integer(), nullable=False),
        sa.Column("total_expense", sa.Float(), nullable=True),
        sa.Column("reference", sa.String(255), nullable=True),
        sa.Column("received_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("id"),
    )
