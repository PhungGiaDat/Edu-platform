# backend/database/connection.py
"""
Database Connection Manager
Supports MongoDB (primary) and PostgreSQL/Supabase (secondary)
"""
import motor.motor_asyncio
from pymongo import MongoClient
import certifi
from settings import settings
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Import PostgreSQL functions (new architecture)
from database.postgres import (
    init_postgres,
    close_postgres,
    get_session as get_pg_session_impl,
    test_connection as test_postgres_connection,
)


class DatabaseManager:
    """
    Singleton MongoDB Connection Manager
    Handles async Motor client for FastAPI
    """
    
    _instance = None
    _client: motor.motor_asyncio.AsyncIOMotorClient = None
    _db: motor.motor_asyncio.AsyncIOMotorDatabase = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize connection only once"""
        if self._client is None:
            self._connect()
    
    def _connect(self):
        """Establish MongoDB connection"""
        try:
            self._client = motor.motor_asyncio.AsyncIOMotorClient(
                settings.MONGO_URL,
                tls=True,
                tlsCAFile=certifi.where(),
                serverSelectionTimeoutMS=5000  # 5 second timeout
            )
            self._db = self._client[settings.MONGO_DB]
            logger.info(f"✅ [MongoDB] Connected to database: {settings.MONGO_DB}")
        except Exception as e:
            logger.error(f"❌ [MongoDB] Connection failed: {e}")
            raise
    
    @property
    def database(self) -> motor.motor_asyncio.AsyncIOMotorDatabase:
        """Get database instance"""
        if self._db is None:
            self._connect()
        return self._db
    
    def get_collection(self, collection_name: str):
        """Get a collection from database"""
        return self.database[collection_name]
    
    async def close(self):
        """Close MongoDB connection"""
        if self._client:
            self._client.close()
            self._client = None
            self._db = None
            logger.info("🔌 [MongoDB] Connection closed")
    
    async def ping(self) -> bool:
        """Test database connection"""
        try:
            await self._client.admin.command('ping')
            return True
        except Exception as e:
            logger.error(f"❌ [MongoDB] Ping failed: {e}")
            return False


# ========== Singleton Instance ==========
db_manager = DatabaseManager()

# ========== PostgreSQL Status Flag ==========
_postgres_initialized = False


# ========== Dependency for FastAPI ==========
def get_database() -> motor.motor_asyncio.AsyncIOMotorDatabase:
    """
    FastAPI Dependency for MongoDB
    Usage: 
        @app.get("/")
        async def endpoint(db = Depends(get_database)):
            ...
    """
    return db_manager.database


async def get_pg_session():
    """
    FastAPI Dependency for PostgreSQL/Supabase
    Usage:
        @app.get("/users")
        async def get_users(db: AsyncSession = Depends(get_pg_session)):
            ...
    """
    global _postgres_initialized
    if not _postgres_initialized:
        raise RuntimeError("PostgreSQL not initialized. Set DATABASE_URL and ensure connect_to_database() was called.")
    async for session in get_pg_session_impl():
        yield session


# ========== Startup/Shutdown Events ==========
async def connect_to_database():
    """Call this on FastAPI startup"""
    global _postgres_initialized
    
    # MongoDB
    logger.info("🚀 [MongoDB] Initializing database connection...")
    if await db_manager.ping():
        logger.info("✅ [MongoDB] Database ready")
    else:
        raise RuntimeError("Failed to connect to MongoDB")
    
    # PostgreSQL (if configured)
    if settings.DATABASE_URL:
        logger.info("🚀 [PostgreSQL] Initializing Supabase connection...")
        await init_postgres(settings.DATABASE_URL)
        if await test_postgres_connection():
            _postgres_initialized = True
            logger.info("✅ [PostgreSQL] Supabase ready")
        else:
            logger.warning("⚠️ [PostgreSQL] Supabase connection failed - continuing with MongoDB only")


async def close_database_connection():
    """Call this on FastAPI shutdown"""
    global _postgres_initialized
    
    # MongoDB
    logger.info("🔄 [MongoDB] Closing database connection...")
    await db_manager.close()
    
    # PostgreSQL
    if _postgres_initialized:
        logger.info("🔄 [PostgreSQL] Closing Supabase connection...")
        await close_postgres()
        _postgres_initialized = False
