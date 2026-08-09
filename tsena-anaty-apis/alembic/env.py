from __future__ import with_statement
import sys
import os
from dotenv import load_dotenv


def load_root_env() -> None:
    root_env_path = os.getenv("ROOT_ENV_PATH")
    if root_env_path and os.path.exists(root_env_path):
        load_dotenv(root_env_path, override=True)
    else:
        load_dotenv()


load_root_env()

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

config = context.config
fileConfig(config.config_file_name)

from app.db.base import Base  # noqa

target_metadata = Base.metadata


def get_url():
    from app.core.config import settings
    return settings.SQLALCHEMY_DATABASE_URI


def include_object(object, name, type_, reflected, compare_to):
    if type_ == "table" and reflected and name not in target_metadata.tables:
        return False
    return True


def run_migrations_offline():
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = get_url()
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
