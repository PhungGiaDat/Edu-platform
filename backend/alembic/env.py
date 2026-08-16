"""Alembic environment; historical SQL migrations remain immutable."""

import asyncio

from alembic import context
from sqlalchemy.ext.asyncio import async_engine_from_config
from database.orm_base import Base
import database.orm_models  # noqa: F401
from database.orm_migration import include_name, include_object
from database.orm_session import _sqlalchemy_database_url

config = context.config
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        include_name=include_name,
        include_object=include_object,
        literal_binds=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = _sqlalchemy_database_url()
    asyncio.run(_run_async_migrations(configuration))


async def _run_async_migrations(configuration) -> None:
    engine = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        pool_pre_ping=True,
        pool_recycle=1800,
        connect_args={
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
        },
    )
    async with engine.connect() as connection:
        await connection.run_sync(_configure_context)
    await engine.dispose()


def _configure_context(connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        include_name=include_name,
        include_object=include_object,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
