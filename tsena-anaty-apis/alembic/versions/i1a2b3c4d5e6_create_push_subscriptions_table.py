"""create push_subscriptions table

Revision ID: i1a2b3c4d5e6
Revises: d7e8f9a0b1c2
Create Date: 2026-10-18
"""
from alembic import op
import sqlalchemy as sa


revision = "i1a2b3c4d5e6"
down_revision = "d7e8f9a0b1c2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "push_subscriptions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("endpoint", sa.Text(), nullable=False),
        sa.Column("p256dh", sa.String(length=255), nullable=False),
        sa.Column("auth", sa.String(length=255), nullable=False),
        sa.Column("user_agent", sa.String(length=255), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=True, server_default=sa.func.now()),
    )
    op.create_index("ix_push_subscriptions_user_id", "push_subscriptions", ["user_id"], unique=False)
    # Pas d'index sur `endpoint` : c'est une colonne TEXT, et MySQL refuse
    # d'indexer un TEXT sans longueur de prefixe (erreur 1170). La table ne
    # contient qu'une ligne par appareil connecte, le scan est sans cout, et
    # le modele ORM n'en declare pas non plus.


def downgrade() -> None:
    op.drop_index("ix_push_subscriptions_user_id", table_name="push_subscriptions")
    op.drop_table("push_subscriptions")
