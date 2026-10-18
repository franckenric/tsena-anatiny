"""add delivery zones, free shipping promo type and promo usage tracking

Revision ID: d7e8f9a0b1c2
Revises: c3d4e5f6a7b8
Create Date: 2026-10-17

"""
from alembic import op
import sqlalchemy as sa


revision = "d7e8f9a0b1c2"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "delivery_zones",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("fee", sa.Float(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=True, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_delivery_zones_name", "delivery_zones", ["name"], unique=True)

    op.create_table(
        "promo_code_delivery_zones",
        sa.Column(
            "promo_code_id",
            sa.Integer(),
            sa.ForeignKey("promo_codes.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "delivery_zone_id",
            sa.Integer(),
            sa.ForeignKey("delivery_zones.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )

    # Etend l'enum existant. MODIFY (et non CHANGE) conserve les valeurs deja
    # presentes : on ne fait qu'ajouter 'free_shipping'.
    op.execute(
        "ALTER TABLE promo_codes "
        "MODIFY COLUMN discount_type "
        "ENUM('percent','fixed','free_shipping') NOT NULL DEFAULT 'percent'"
    )

    op.add_column(
        "orders", sa.Column("delivery_zone_id", sa.Integer(), nullable=True)
    )
    op.add_column(
        "orders",
        sa.Column("delivery_fee", sa.Float(), nullable=False, server_default="0"),
    )
    op.add_column(
        "orders", sa.Column("promo_counted_code_id", sa.Integer(), nullable=True)
    )
    op.create_foreign_key(
        "fk_orders_delivery_zone_id_delivery_zones",
        "orders",
        "delivery_zones",
        ["delivery_zone_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_orders_promo_counted_code_id_promo_codes",
        "orders",
        "promo_codes",
        ["promo_counted_code_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_orders_promo_counted_code_id_promo_codes", "orders", type_="foreignkey"
    )
    op.drop_constraint(
        "fk_orders_delivery_zone_id_delivery_zones", "orders", type_="foreignkey"
    )
    op.drop_column("orders", "promo_counted_code_id")
    op.drop_column("orders", "delivery_fee")
    op.drop_column("orders", "delivery_zone_id")
    op.execute(
        "ALTER TABLE promo_codes "
        "MODIFY COLUMN discount_type "
        "ENUM('percent','fixed') NOT NULL DEFAULT 'percent'"
    )
    op.drop_table("promo_code_delivery_zones")
    op.drop_index("ix_delivery_zones_name", table_name="delivery_zones")
    op.drop_table("delivery_zones")
