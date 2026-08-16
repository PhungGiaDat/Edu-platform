"""Canonical async SQLAlchemy session lifecycle for PostgreSQL domains."""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Optional

from sqlalchemy import text
from sqlalchemy.engine import URL, make_url
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from settings import settings

_engine: Optional[AsyncEngine] = None
_session_factory: Optional[async_sessionmaker[AsyncSession]] = None


def _sqlalchemy_database_url() -> str:
    """Adapt the existing DATABASE_URL without duplicating deployment secrets."""
    if not settings.DATABASE_URL:
        raise RuntimeError("DATABASE_URL is required for PostgreSQL persistence")
    url: URL = make_url(settings.DATABASE_URL.get_secret_value())
    if url.drivername in {"postgresql", "postgres"}:
        url = url.set(drivername="postgresql+asyncpg")
    return url.render_as_string(hide_password=False)


async def connect_orm() -> None:
    """Create the one engine/session factory used by ORM repositories."""
    global _engine, _session_factory
    if _engine is not None:
        return
    _engine = create_async_engine(
        _sqlalchemy_database_url(),
        pool_size=5,
        max_overflow=0,
        pool_pre_ping=True,
        pool_recycle=1800,
        # Disable both driver and dialect caches for Supabase transaction poolers.
        connect_args={"statement_cache_size": 0, "prepared_statement_cache_size": 0},
    )
    _session_factory = async_sessionmaker(_engine, expire_on_commit=False)
    async with _engine.connect() as connection:
        await connection.execute(text("SELECT 1"))


async def close_orm() -> None:
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
    _engine = None
    _session_factory = None


def session_factory() -> async_sessionmaker[AsyncSession]:
    if _session_factory is None:
        raise RuntimeError("SQLAlchemy ORM session factory is not initialized")
    return _session_factory


async def get_db_session() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency; routes receive services, not direct persistence access."""
    async with session_factory()() as session:
        yield session
