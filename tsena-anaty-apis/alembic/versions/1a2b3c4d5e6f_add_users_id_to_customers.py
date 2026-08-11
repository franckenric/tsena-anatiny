"""add users_id relation to customers

Revision ID: 1a2b3c4d5e6f
Revises: 9e1f2a3b4c5d
Create Date: 2026-08-11 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1a2b3c4d5e6f'
down_revision = '9e1f2a3b4c5d'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('customers', sa.Column('users_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_customers_users_id', 'customers', 'users', ['users_id'], ['id']
    )
    op.create_index(
        op.f('ix_customers_users_id'), 'customers', ['users_id'], unique=False
    )


def downgrade():
    op.drop_index(op.f('ix_customers_users_id'), table_name='customers')
    op.drop_constraint('fk_customers_users_id', 'customers', type_='foreignkey')
    op.drop_column('customers', 'users_id')
