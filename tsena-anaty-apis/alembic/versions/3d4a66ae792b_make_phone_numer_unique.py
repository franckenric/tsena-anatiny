"""make phone_numer unique

Revision ID: 3d4a66ae792b
Revises: 67191cb418f1
Create Date: 2026-06-07

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = '3d4a66ae792b'
down_revision = '67191cb418f1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index('ix_users_phone_numer', 'users', ['phone_numer'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_users_phone_numer', table_name='users')
