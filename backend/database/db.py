# database/db.py
"""
Database Connections Manager
Supports both MongoDB and PostgreSQL (Supabase)

This module provides a unified interface for database connections.
- MongoDB: FlashCards, AR assets, Courses, etc.
- PostgreSQL/Supabase: Users, Auth, Analytics, etc.
"""
from database.mongodb import MongoDBConnector
from database.postgres import (
    init_postgres,
    close_postgres,
    get_session,
    test_connection as test_postgres_connection,
)
from settings import settings
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# ========== MongoDB Connector (for flashcards, AR assets, etc.) ==========
mongo_connector = MongoDBConnector()

# ========== PostgreSQL Status Flag ==========
_postgres_initialized = False


# ========== Dependency Injection Helpers ==========
async def get_pg_session():
    """FastAPI dependency for PostgreSQL sessions"""
    global _postgres_initialized
    if not _postgres_initialized:
        raise RuntimeError("PostgreSQL not initialized. Ensure init_databases() was called.")
    async for session in get_session():
        yield session


async def get_mongo_collection(collection_name: str):
    """Get a MongoDB collection"""
    return mongo_connector.get_collection(collection_name)


# ========== Lifecycle Functions ==========
async def init_databases():
    """Initialize all database connections on startup"""
    global _postgres_initialized
    
    # PostgreSQL (if configured)
    if settings.DATABASE_URL:
        logger.info("🚀 [PostgreSQL] Initializing Supabase connection...")
        await init_postgres(settings.DATABASE_URL)
        if await test_postgres_connection():
            _postgres_initialized = True
            logger.info("✅ [PostgreSQL] Supabase ready")
        else:
            logger.warning("⚠️ [PostgreSQL] Supabase connection failed")
    else:
        logger.info("[CONFIG] PostgreSQL not configured (DATABASE_URL not set)")


async def close_databases():
    """Close all database connections on shutdown"""
    global _postgres_initialized
    
    # MongoDB
    await mongo_connector.close_connection()
    
    # PostgreSQL
    if _postgres_initialized:
        await close_postgres()
        _postgres_initialized = False


# ========== Exports ==========
__all__ = [
    "mongo_connector",
    "get_mongo_collection",
    "get_pg_session",
    "init_databases",
    "close_databases",
]