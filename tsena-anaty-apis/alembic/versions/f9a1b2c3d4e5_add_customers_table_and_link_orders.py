"""add_customers_table_and_link_orders

Revision ID: f9a1b2c3d4e5
Revises: e2f3g4h5i6j7
Create Date: 2026-06-13 22:10:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f9a1b2c3d4e5'
down_revision = 'e2f3g4h5i6j7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'customers',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=255), nullable=False),
        sa.Column('delivery_address', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('id'),
        sa.UniqueConstraint('phone'),
    )

    with op.batch_alter_table('orders') as batch_op:
        batch_op.add_column(sa.Column('customer_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_orders_customer_id_customers',
            'customers',
            ['customer_id'],
            ['id'],
        )


def downgrade() -> None:
    with op.batch_alter_table('orders') as batch_op:
        batch_op.drop_constraint('fk_orders_customer_id_customers', type_='foreignkey')
        batch_op.drop_column('customer_id')

    op.drop_table('customers')
