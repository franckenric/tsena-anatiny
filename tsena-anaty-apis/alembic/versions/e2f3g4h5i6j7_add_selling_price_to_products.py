"""add_selling_price_to_products

Revision ID: e2f3g4h5i6j7
Revises: d1e2f3a4b5c6
Create Date: 2026-06-13 19:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "e2f3g4h5i6j7"
down_revision = "d1e2f3a4b5c6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("products") as batch_op:
        batch_op.add_column(sa.Column("selling_price", sa.Float(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("products") as batch_op:
        batch_op.drop_column("selling_price")
