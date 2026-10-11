"""add_cost_price_to_products

Revision ID: c3d4e5f6a7b8
Revises: d8e9f0a1b2c3
Create Date: 2026-06-13 19:30:00.000000

La migration b2c3d4e5f6a7 (move_prices_from_products_to_stock_movements) a
supprime `cost_price` de la table `products` au profit de
`stock_movements.unit_cost`. Le modele et les schemas exposent de nouveau
`cost_price` (prix d'achat de reference du produit, utilise notamment pour
pre-remplir l'import de recus et l'affichage du back-office). Cette migration
re-cree la colonne, de facon idempotente.
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c3d4e5f6a7b8"
down_revision = "d8e9f0a1b2c3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    product_cols = [c["name"] for c in inspector.get_columns("products")]
    if "cost_price" not in product_cols:
        with op.batch_alter_table("products") as batch_op:
            batch_op.add_column(sa.Column("cost_price", sa.Float(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    product_cols = [c["name"] for c in inspector.get_columns("products")]
    if "cost_price" in product_cols:
        with op.batch_alter_table("products") as batch_op:
            batch_op.drop_column("cost_price")
