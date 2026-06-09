"""create lots table and add lot_id to stock_lots

Revision ID: a1b2c3d4e5f6
Revises: 8c1c2f6f4f2d
Create Date: 2026-06-08

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = '8c1c2f6f4f2d'
branch_labels = None
depends_on = None


def upgrade():
    # Create lots table (safe if already exists due to partial previous run)
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    if 'lots' not in existing_tables:
        op.create_table(
            'lots',
            sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
            sa.Column('reference', sa.String(255), nullable=True),
            sa.Column('total_expense', sa.Float(), nullable=False, server_default='0'),
            sa.Column('received_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.Column('deleted_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('id'),
        )

    # Add lot_id column to stock_lots if not already present
    stock_lots_cols = [c['name'] for c in inspector.get_columns('stock_lots')]
    if 'lot_id' not in stock_lots_cols:
        with op.batch_alter_table('stock_lots') as batch_op:
            batch_op.add_column(sa.Column('lot_id', sa.Integer(), nullable=True))
            batch_op.create_index('ix_stock_lots_lot_id', ['lot_id'])


def downgrade():
    with op.batch_alter_table('stock_lots') as batch_op:
        batch_op.drop_index('ix_stock_lots_lot_id')
        batch_op.drop_column('lot_id')
    op.drop_table('lots')
