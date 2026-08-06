"""link_out_stock_to_orders_and_remove_order_line_fields

Revision ID: c9f8e7d6b5a4
Revises: 39e506f727c9
Create Date: 2026-06-13 15:35:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c9f8e7d6b5a4"
down_revision = "39e506f727c9"
branch_labels = None
depends_on = None


def _drop_fk_if_exists(table_name: str, constrained_columns: list[str]) -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    for fk in inspector.get_foreign_keys(table_name):
        cols = fk.get("constrained_columns") or []
        fk_name = fk.get("name")
        if fk_name and cols == constrained_columns:
            op.drop_constraint(fk_name, table_name, type_="foreignkey")
            break


def upgrade() -> None:
    with op.batch_alter_table("stock_movements") as batch_op:
        batch_op.add_column(sa.Column("commande_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_stock_movements_commande_id_orders",
            "orders",
            ["commande_id"],
            ["id"],
        )

    # Backfill commande_id from legacy ORDER#<id> reference.
    bind = op.get_bind()
    rows = bind.execute(
        sa.text(
            """
            SELECT id, reference
            FROM stock_movements
            WHERE type = 'out_stock'
              AND commande_id IS NULL
              AND reference IS NOT NULL
              AND reference LIKE 'ORDER#%'
            """
        )
    ).fetchall()

    for row in rows:
        reference = row.reference or ""
        prefix = reference.split(" ", 1)[0]
        order_id_str = prefix.replace("ORDER#", "", 1)
        try:
            order_id = int(order_id_str)
        except (TypeError, ValueError):
            continue

        bind.execute(
            sa.text(
                """
                UPDATE stock_movements
                SET commande_id = :order_id
                WHERE id = :movement_id
                """
            ),
            {"order_id": order_id, "movement_id": row.id},
        )

    # Remove duplicated line-level fields from orders.
    _drop_fk_if_exists("orders", ["product_id"])
    with op.batch_alter_table("orders") as batch_op:
        batch_op.drop_column("product_id")
        batch_op.drop_column("quantity")
        batch_op.drop_column("unit_cost")
        batch_op.drop_column("another_price")


def downgrade() -> None:
    with op.batch_alter_table("orders") as batch_op:
        batch_op.add_column(sa.Column("product_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("quantity", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("unit_cost", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("another_price", sa.Float(), nullable=True))
        batch_op.create_foreign_key(
            "fk_orders_product_id_products",
            "products",
            ["product_id"],
            ["id"],
        )

    # Best-effort backfill of downgraded fields from linked out_stock movements.
    bind = op.get_bind()
    order_rows = bind.execute(sa.text("SELECT id FROM orders")).fetchall()
    for order_row in order_rows:
        movement_rows = bind.execute(
            sa.text(
                """
                SELECT product_id, quantity, unit_cost, another_price
                FROM stock_movements
                WHERE commande_id = :order_id
                  AND type = 'out_stock'
                ORDER BY id ASC
                """
            ),
            {"order_id": order_row.id},
        ).fetchall()
        if not movement_rows:
            continue

        first = movement_rows[0]
        total_quantity = sum(int(m.quantity or 0) for m in movement_rows)
        total_cost = sum(float(m.quantity or 0) * float(m.unit_cost or 0) for m in movement_rows)
        avg_unit_cost = (total_cost / total_quantity) if total_quantity > 0 else None
        total_another_price = sum(float(m.another_price or 0) for m in movement_rows)

        bind.execute(
            sa.text(
                """
                UPDATE orders
                SET product_id = :product_id,
                    quantity = :quantity,
                    unit_cost = :unit_cost,
                    another_price = :another_price
                WHERE id = :order_id
                """
            ),
            {
                "order_id": order_row.id,
                "product_id": first.product_id,
                "quantity": total_quantity,
                "unit_cost": avg_unit_cost,
                "another_price": total_another_price,
            },
        )

    _drop_fk_if_exists("stock_movements", ["commande_id"])
    with op.batch_alter_table("stock_movements") as batch_op:
        batch_op.drop_column("commande_id")
