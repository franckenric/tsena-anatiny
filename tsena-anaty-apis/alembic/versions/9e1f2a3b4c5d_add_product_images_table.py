"""add product_images table

Revision ID: 9e1f2a3b4c5d
Revises: b4c5d6e7f801
Create Date: 2026-08-10 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9e1f2a3b4c5d'
down_revision = 'b4c5d6e7f801'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('product_images',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('product_id', sa.Integer(), nullable=False),
    sa.Column('image', sa.String(length=255), nullable=False),
    sa.Column('position', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.Column('deleted_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('id')
    )
    op.create_index(op.f('ix_product_images_product_id'), 'product_images', ['product_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_product_images_product_id'), table_name='product_images')
    op.drop_table('product_images')
