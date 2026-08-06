"""merge migration branches

Revision ID: e8f9a0b1c2d3
Revises: c4e5f6a7b8c9, df2a7e2c6f5b
Create Date: 2026-06-09

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = "e8f9a0b1c2d3"
down_revision = ("c4e5f6a7b8c9", "df2a7e2c6f5b")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
