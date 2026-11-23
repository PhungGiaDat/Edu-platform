# backend/database/connection.py
"""
Hybrid connection manager — PostgreSQL core + archive-only MongoDB.

All runtime data now lives in PostgreSQL (Supabase).  MongoDB (Beanie) is
retained only as a read-only archive for data that has not yet been migrated.
When POSTGRES_CORE_ENABLED=true the application boots without any MongoDB
dependency at all.
"""
import logging
from settings import settings
from database.postgres_connection import connect_postgres, close_postgres, postgres_core_enabled

logger = logging.getLogger(__name__)


# ========== Startup/Shutdown Events ==========

async def connect_to_database():
    """Call this on FastAPI startup."""
    await connect_postgres()
    if postgres_core_enabled():
        logger.info("PostgreSQL core cutover enabled; MongoDB is archive-only and is not initialized")
        return
    logger.info("PostgreSQL core disabled — falling back to MongoDB/Beanie")
    await _connect_mongodb()


async def close_database_connection():
    """Call this on FastAPI shutdown."""
    await close_postgres()
    if postgres_core_enabled():
        return
    await _close_mongodb()


# ========== MongoDB (archive-only fallback) ==========

_mongo_client = None
_mongo_db = None


async def _connect_mongodb():
    global _mongo_client, _mongo_db
    import motor.motor_asyncio
    import certifi
    _mongo_client = motor.motor_asyncio.AsyncIOMotorClient(
        settings.MONGO_URL,
        tls=True,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=5000,
    )
    _mongo_db = _mongo_client[settings.MONGO_DB]
    logger.info(f"[MongoDB] Archive-mode connection: {settings.MONGO_DB}")


async def _close_mongodb():
    global _mongo_client, _mongo_db
    if _mongo_client is not None:
        _mongo_client.close()
        _mongo_client = None
        _mongo_db = None
        logger.info("[MongoDB] Connection closed")


def get_database():
    """Return MongoDB database for archive-only access (legacy callers)."""
    if _mongo_db is None:
        raise RuntimeError("MongoDB not connected (postgres_core_enabled=True)")
    return _mongo_db


# ========== Legacy db_manager stub (Phase 1: MongoDB→PostgreSQL migration) ==========
# agentic_rag_service.py and base_repository.py still reference this.
# Phase 2 will replace those callers; this stub prevents import errors for now.
# Usage: from database.connection import db_manager


class _StubDatabaseManager:
    """
    Thin compatibility shim for code that still expects db_manager.database
    and db_manager.get_collection().
    """

    @property
    def database(self):
        return get_database()

    def get_collection(self, name: str):
        return get_database()[name]

    async def close(self):
        pass


db_manager: _StubDatabaseManager = _StubDatabaseManager()
"""Singleton stub — replace with real MongoDB access in Phase 2."""
