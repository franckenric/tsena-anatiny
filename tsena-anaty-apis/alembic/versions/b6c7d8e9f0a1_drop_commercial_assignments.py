"""drop commercial_assignments

Les commerciaux ont ete retires de l'application : il ne reste que les roles
`super_admin` et `client`. La table d'affectation d'un commercial a un produit
n'a plus aucun endpoint, ni model, ni reference en base (aucune autre table ne
pointe vers elle), on la supprime.

Revision ID: b6c7d8e9f0a1
Revises: f7a8b9c0d1e2
Create Date: 2026-10-06

"""
from alembic import op
import sqlalchemy as sa


revision = "b6c7d8e9f0a1"
down_revision = "f7a8b9c0d1e2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_table("commercial_assignments")


def downgrade() -> None:
    op.create_table(
        "commercial_assignments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("product_id", sa.Integer(), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("id"),
    )
