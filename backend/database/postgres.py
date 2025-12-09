# database/postgres.py
"""
PostgreSQL/Supabase Database Connection using SQLModel + SQLAlchemy Async

Architecture: Hybrid Database (SQLModel for Supabase)
- Uses SQLModel for ORM with type safety
- Async sessions with SQLAlchemy async engine
- Compatible with Pydantic v2
"""
from sqlmodel import SQLModel
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
from typing import AsyncGenerator
import logging

logger = logging.getLogger(__name__)


# ========== Global Engine & Session Factory ==========
# Will be initialized via init_postgres()
_engine = None
_async_session_factory = None


def _normalize_database_url(database_url: str) -> str:
    """
    Convert database URL to asyncpg compatible format
    """
    # Convert postgresql:// or postgres:// to postgresql+asyncpg://
    if database_url.startswith("postgresql://"):
        async_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif database_url.startswith("postgres://"):
        async_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)
    else:
        async_url = database_url
    
    # Remove pgbouncer parameter (not compatible with asyncpg)
    if "pgbouncer=true" in async_url.lower():
        async_url = async_url.replace("?pgbouncer=true", "").replace("&pgbouncer=true", "")
    
    return async_url


async def init_postgres(database_url: str) -> None:
    """
    Initialize PostgreSQL async engine and session factory
    
    Call this during FastAPI lifespan startup:
        await init_postgres(settings.DATABASE_URL)
    """
    global _engine, _async_session_factory
    
    if not database_url:
        logger.warning("[PostgreSQL] No DATABASE_URL provided, skipping initialization")
        return
    
    async_url = _normalize_database_url(database_url)
    
    _engine = create_async_engine(
        async_url,
        echo=False,  # Set to True for SQL debugging
        pool_pre_ping=True,  # Verify connections before use
        pool_size=5,
        max_overflow=10,
    )
    
    _async_session_factory = async_sessionmaker(
        bind=_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
        autocommit=False,
    )
    
    logger.info("[PostgreSQL] Async engine initialized with SQLModel")


async def close_postgres() -> None:
    """
    Close PostgreSQL connection
    
    Call this during FastAPI lifespan shutdown
    """
    global _engine, _async_session_factory
    
    if _engine:
        await _engine.dispose()
        _engine = None
        _async_session_factory = None
        logger.info("[PostgreSQL] Connection closed")


async def create_tables() -> None:
    """
    Create all SQLModel tables in database
    
    Note: Import all models before calling this function
    to ensure they are registered with SQLModel.metadata
    """
    if not _engine:
        raise RuntimeError("[PostgreSQL] Engine not initialized. Call init_postgres() first.")
    
    async with _engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        logger.info("[PostgreSQL] SQLModel tables created")


async def drop_tables() -> None:
    """Drop all tables (USE WITH CAUTION - for testing only)"""
    if not _engine:
        raise RuntimeError("[PostgreSQL] Engine not initialized")
    
    async with _engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
        logger.warning("[PostgreSQL] All tables dropped!")


async def test_connection() -> bool:
    """Test if the database connection is working"""
    if not _engine:
        return False
    
    try:
        async with _engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            logger.info("[PostgreSQL] Connection test successful")
            return True
    except Exception as e:
        logger.error(f"[PostgreSQL] Connection test failed: {e}")
        return False


# ========== FastAPI Dependency ==========
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency for getting async database sessions
    
    Usage in router:
        @router.get("/users")
        async def get_users(session: AsyncSession = Depends(get_session)):
            result = await session.execute(select(User))
            return result.scalars().all()
    """
    if not _async_session_factory:
        raise RuntimeError(
            "[PostgreSQL] Session factory not initialized. "
            "Check DATABASE_URL and ensure init_postgres() was called."
        )
    
    async with _async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
