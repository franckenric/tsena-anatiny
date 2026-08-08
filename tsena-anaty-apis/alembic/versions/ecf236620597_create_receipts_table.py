"""create receipts table

Revision ID: ecf236620597
Revises: cae3d130b40e
Create Date: 2026-08-08 13:15:02.000115

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ecf236620597'
down_revision = 'cae3d130b40e'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('receipts',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('receipt_number', sa.String(length=255), nullable=False),
    sa.Column('file_name', sa.String(length=255), nullable=True),
    sa.Column('seller', sa.String(length=255), nullable=True),
    sa.Column('currency', sa.String(length=10), nullable=True),
    sa.Column('items_count', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.Column('deleted_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('id')
    )
    op.create_index(op.f('ix_receipts_receipt_number'), 'receipts', ['receipt_number'], unique=True)


def downgrade():
    op.drop_index(op.f('ix_receipts_receipt_number'), table_name='receipts')
    op.drop_table('receipts')
