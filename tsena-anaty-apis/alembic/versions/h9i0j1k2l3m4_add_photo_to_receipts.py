"""add photo to receipts

Revision ID: h9i0j1k2l3m4
Revises: h2b3c4d5e6f7
Create Date: 2026-09-02 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'h9i0j1k2l3m4'
down_revision = 'h2b3c4d5e6f7'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('receipts', sa.Column('photo', sa.String(length=500), nullable=True))


def downgrade():
    op.drop_column('receipts', 'photo')