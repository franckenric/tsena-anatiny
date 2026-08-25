"""create promo codes table and add discount to orders

Revision ID: h2b3c4d5e6f7
Revises: ecf236620597
Create Date: 2026-08-23

"""
from alembic import op
import sqlalchemy as sa


revision = "h2b3c4d5e6f7"
down_revision = ("c2d3e4f5a6b7", "ecf236620597")
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "promo_codes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "discount_type",
            sa.Enum("percent", "fixed", name="discounttypeenum"),
            nullable=False,
            server_default="percent",
        ),
        sa.Column("discount_value", sa.Float(), nullable=False, server_default="0"),
        sa.Column("min_order_amount", sa.Float(), nullable=True),
        sa.Column("max_uses", sa.Integer(), nullable=True),
        sa.Column("used_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("starts_at", sa.DateTime(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("active", "inactive", name="statusenum"),
            nullable=False,
            server_default="active",
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=True, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_promo_codes_code", "promo_codes", ["code"], unique=True)

    op.add_column("orders", sa.Column("promo_code_id", sa.Integer(), nullable=True))
    op.add_column("orders", sa.Column("promo_code", sa.String(length=64), nullable=True))
    op.add_column(
        "orders",
        sa.Column("discount", sa.Float(), nullable=False, server_default="0"),
    )
    op.create_foreign_key(
        "fk_orders_promo_code_id_promo_codes",
        "orders",
        "promo_codes",
        ["promo_code_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_orders_promo_code_id_promo_codes", "orders", type_="foreignkey"
    )
    op.drop_column("orders", "discount")
    op.drop_column("orders", "promo_code")
    op.drop_column("orders", "promo_code_id")
    op.drop_index("ix_promo_codes_code", table_name="promo_codes")
    op.drop_table("promo_codes")
