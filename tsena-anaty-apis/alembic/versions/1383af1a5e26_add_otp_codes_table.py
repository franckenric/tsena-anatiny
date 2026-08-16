"""add_otp_codes_table

Revision ID: 1383af1a5e26
Revises: 5a9f2c1e8b4d
Create Date: 2026-08-16 17:06:47.949073

"""
from alembic import op
import sqlalchemy as sa

revision = '1383af1a5e26'
down_revision = '5a9f2c1e8b4d'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('otp_codes',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('phone', sa.String(length=255), nullable=False),
    sa.Column('code_hash', sa.String(length=255), nullable=False),
    sa.Column('attempts', sa.Integer(), nullable=False),
    sa.Column('is_used', sa.Boolean(), nullable=False),
    sa.Column('expires_at', sa.DateTime(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('id')
    )
    op.create_index(op.f('ix_otp_codes_phone'), 'otp_codes', ['phone'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_otp_codes_phone'), table_name='otp_codes')
    op.drop_table('otp_codes')
