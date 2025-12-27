# backend/database/connection.py
"""
Database Connection Manager - Exclusive MongoDB (Beanie ODM)
"""
import motor.motor_asyncio
import certifi
import logging
from settings import settings
from typing import Optional

# Import Beanie initialization and Documents
from database.mongodb import init_mongodb, close_mongodb, test_connection
from models.flashcard import Flashcard
from models.user_mongo import UserDocument, LearningProgressDocument, QuizAttemptDocument
# Note: Add other models as they are converted to Beanie

logger = logging.getLogger(__name__)

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
                serverSelectionTimeoutMS=5000
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
    
    async def close(self):
        """Close MongoDB connection"""
        await close_mongodb()
        if self._client:
            self._client.close()
            self._client = None
            self._db = None
            logger.info("🔌 [MongoDB] Connection closed")
    
    async def ping(self) -> bool:
        """Test database connection"""
        return await test_connection()

# ========== Singleton Instance ==========
db_manager = DatabaseManager()

# ========== Dependency for FastAPI ==========
def get_database() -> motor.motor_asyncio.AsyncIOMotorDatabase:
    """FastAPI Dependency for MongoDB"""
    return db_manager.database

# ========== Startup/Shutdown Events ==========
async def connect_to_database():
    """Call this on FastAPI startup"""
    logger.info("🚀 [MongoDB] Initializing Beanie ODM and connections...")
    
    # Define models to register with Beanie
    document_models = [
        UserDocument,
        Flashcard,
        LearningProgressDocument,
        QuizAttemptDocument,
        # Add other Beanie Documents here (ARObject, Quiz, etc.)
    ]
    
    try:
        await init_mongodb(
            mongo_url=settings.MONGO_URL,
            database_name=settings.MONGO_DB,
            document_models=document_models
        )
        logger.info("✅ [MongoDB] Beanie ODM initialized successfully")
    except Exception as e:
        logger.error(f"❌ [MongoDB] Initialization failed: {e}")
        raise

async def close_database_connection():
    """Call this on FastAPI shutdown"""
    logger.info("🔄 [MongoDB] Closing database connection...")
    await db_manager.close()

