"""Asyncpg boundary for migrated PostgreSQL core repositories."""

from __future__ import annotations

import logging
from typing import Optional

import asyncpg

from settings import settings
from database.orm_session import close_orm, connect_orm

logger = logging.getLogger(__name__)
_pool: Optional[asyncpg.Pool] = None


def postgres_core_enabled() -> bool:
    return bool(settings.POSTGRES_CORE_ENABLED and settings.DATABASE_URL)


async def connect_postgres() -> None:
    global _pool
    if not postgres_core_enabled() or _pool is not None:
        return
    await connect_orm()
    _pool = await asyncpg.create_pool(
        str(settings.DATABASE_URL.get_secret_value()),
        min_size=1,
        max_size=5,
        # Supabase transaction pooling cannot safely cache prepared statements.
        statement_cache_size=0,
    )
    async with _pool.acquire() as connection:
        await connection.execute("SELECT 1")
    logger.info("PostgreSQL core repository pool connected")


async def close_postgres() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
    await close_orm()


def postgres_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("PostgreSQL pool is not initialized")
    return _pool
