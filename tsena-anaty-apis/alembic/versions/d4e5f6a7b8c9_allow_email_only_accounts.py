"""allow email only accounts and key otp by email

- users.phone_numer becomes nullable (clients register with an email)
- customers.phone becomes nullable (the phone is only collected at order time)
- otp_codes.phone is renamed to otp_codes.email

Revision ID: d4e5f6a7b8c9
Revises: h9i0j1k2l3m4
Create Date: 2026-09-30

"""
from alembic import op
import sqlalchemy as sa


revision = "d4e5f6a7b8c9"
down_revision = "h9i0j1k2l3m4"
branch_labels = None
depends_on = None


def _rename_otp_phone_to_email(inspector) -> None:
    indexes = [i["name"] for i in inspector.get_indexes("otp_codes")]
    if "ix_otp_codes_phone" in indexes:
        op.drop_index("ix_otp_codes_phone", table_name="otp_codes")

    with op.batch_alter_table("otp_codes") as batch_op:
        batch_op.alter_column(
            "phone",
            new_column_name="email",
            existing_type=sa.String(length=255),
            nullable=False,
        )

    op.create_index("ix_otp_codes_email", "otp_codes", ["email"], unique=False)


def _rename_otp_email_to_phone(inspector) -> None:
    indexes = [i["name"] for i in inspector.get_indexes("otp_codes")]
    if "ix_otp_codes_email" in indexes:
        op.drop_index("ix_otp_codes_email", table_name="otp_codes")

    with op.batch_alter_table("otp_codes") as batch_op:
        batch_op.alter_column(
            "email",
            new_column_name="phone",
            existing_type=sa.String(length=255),
            nullable=False,
        )

    op.create_index("ix_otp_codes_phone", "otp_codes", ["phone"], unique=False)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column(
            "phone_numer",
            existing_type=sa.String(length=255),
            nullable=True,
        )

    with op.batch_alter_table("customers") as batch_op:
        batch_op.alter_column(
            "phone",
            existing_type=sa.String(length=255),
            nullable=True,
        )

    otp_columns = [c["name"] for c in inspector.get_columns("otp_codes")]
    if "phone" in otp_columns and "email" not in otp_columns:
        _rename_otp_phone_to_email(inspector)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    otp_columns = [c["name"] for c in inspector.get_columns("otp_codes")]
    if "email" in otp_columns and "phone" not in otp_columns:
        _rename_otp_email_to_phone(inspector)

    # Accounts without a phone must get a placeholder before the columns can
    # be made NOT NULL again.
    bind.execute(
        sa.text(
            "UPDATE users SET phone_numer = CONCAT('user-', id, '@tsena.local') "
            "WHERE phone_numer IS NULL"
        )
    )
    bind.execute(
        sa.text(
            "UPDATE customers SET phone = CONCAT('client-', id, '@tsena.local') "
            "WHERE phone IS NULL"
        )
    )

    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column(
            "phone_numer",
            existing_type=sa.String(length=255),
            nullable=False,
        )

    with op.batch_alter_table("customers") as batch_op:
        batch_op.alter_column(
            "phone",
            existing_type=sa.String(length=255),
            nullable=False,
        )
