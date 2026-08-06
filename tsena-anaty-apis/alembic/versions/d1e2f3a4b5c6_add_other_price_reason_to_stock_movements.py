"""add_other_price_reason_to_stock_movements

Revision ID: d1e2f3a4b5c6
Revises: c9f8e7d6b5a4
Create Date: 2026-06-13 18:30:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "d1e2f3a4b5c6"
down_revision = "c9f8e7d6b5a4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("stock_movements") as batch_op:
        batch_op.add_column(sa.Column("other_price_reason", sa.String(length=255), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("stock_movements") as batch_op:
        batch_op.drop_column("other_price_reason")
