"""create visits table

Comptage des visites du front-office, une ligne par visiteur et par jour.
La contrainte unique (visitor_key, visit_date) rend l'enregistrement
idempotent : recharger la page ou ouvrir un deuxieme onglet le meme jour ne
cree pas de doublon.

Revision ID: f7a8b9c0d1e2
Revises: d4e5f6a7b8c9
Create Date: 2026-10-04

"""
from alembic import op
import sqlalchemy as sa


revision = "f7a8b9c0d1e2"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "visits",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("visitor_key", sa.String(length=64), nullable=False),
        sa.Column("visit_date", sa.Date(), nullable=False),
        sa.Column("path", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("id"),
        sa.UniqueConstraint(
            "visitor_key", "visit_date", name="uq_visits_visitor_date"
        ),
    )
    op.create_index("ix_visits_visitor_key", "visits", ["visitor_key"], unique=False)
    op.create_index("ix_visits_visit_date", "visits", ["visit_date"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_visits_visit_date", table_name="visits")
    op.drop_index("ix_visits_visitor_key", table_name="visits")
    op.drop_table("visits")