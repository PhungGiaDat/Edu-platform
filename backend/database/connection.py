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
from database.mongodb import init_mongodb, close_mongodb, get_client, get_database as get_mongodb_database, test_connection
from models.flashcard import Flashcard
from models.user_mongo import UserDocument, LearningProgressDocument, QuizAttemptDocument
from models.pet import PetDocument
from models.pronunciation import PronunciationAttemptDocument
from models.learning_path import LearningPathDocument
from models.session_log import SessionLogDocument
from models.feedback_template import FeedbackTemplateDocument
# NEW: Import optimized schema models
from models.course_lesson import CourseLesson
from models.user_session import UserSession
from models.cache_session import RedisCache
from models.profile import ProfileContentDocument

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
        """Connection is initialized during FastAPI startup."""
        pass
    
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
            self._client = get_client()
            self._db = get_mongodb_database()
        return self._db
    
    def get_collection(self, collection_name: str) -> motor.motor_asyncio.AsyncIOMotorCollection:
        """
        Get a collection from the database
        
        Args:
            collection_name: Name of the MongoDB collection
            
        Returns:
            AsyncIOMotorCollection instance
        """
        return self.database[collection_name]
    
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
        PetDocument,
        PronunciationAttemptDocument,
        LearningPathDocument,
        SessionLogDocument,
        FeedbackTemplateDocument,
        # NEW: Optimized schema models
        CourseLesson,
        UserSession,
        RedisCache,
        ProfileContentDocument,
    ]
    
    try:
        await init_mongodb(
            mongo_url=settings.MONGO_URL,
            database_name=settings.MONGO_DB,
            document_models=document_models
        )
        db_manager._client = get_client()
        db_manager._db = get_mongodb_database()
        logger.info("✅ [MongoDB] Beanie ODM initialized successfully")
    except Exception as e:
        logger.error(f"❌ [MongoDB] Initialization failed: {e}")
        raise

async def close_database_connection():
    """Call this on FastAPI shutdown"""
    logger.info("🔄 [MongoDB] Closing database connection...")
    await db_manager.close()

