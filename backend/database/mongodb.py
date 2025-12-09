# database/mongodb.py
"""
MongoDB Connection using Beanie ODM

Architecture: Hybrid Database (Beanie for MongoDB)
- Uses Beanie ODM with Pydantic v2 for Document models
- Motor async driver under the hood
- Type-safe document operations
"""
import motor.motor_asyncio
from beanie import init_beanie, Document
from typing import List, Type, Optional
import certifi
import logging

logger = logging.getLogger(__name__)


# ========== Global Client & Database ==========
_client: Optional[motor.motor_asyncio.AsyncIOMotorClient] = None
_database: Optional[motor.motor_asyncio.AsyncIOMotorDatabase] = None


async def init_mongodb(
    mongo_url: str,
    database_name: str,
    document_models: List[Type[Document]]
) -> None:
    """
    Initialize MongoDB with Beanie ODM
    
    Args:
        mongo_url: MongoDB connection string (Atlas or local)
        database_name: Name of the database to use
        document_models: List of Beanie Document classes to register
        
    Usage during FastAPI lifespan:
        from backend.models.flashcard_model import Flashcard
        from backend.models.ar_model import ARObject
        
        await init_mongodb(
            mongo_url=settings.MONGO_URL,
            database_name=settings.MONGO_DB,
            document_models=[Flashcard, ARObject, ...]
        )
    """
    global _client, _database
    
    if not mongo_url:
        logger.warning("[MongoDB] No MONGO_URL provided, skipping initialization")
        return
    
    # Create Motor client with TLS for Atlas
    _client = motor.motor_asyncio.AsyncIOMotorClient(
        mongo_url,
        tls=True,
        tlsCAFile=certifi.where(),
    )
    
    _database = _client[database_name]
    
    # Initialize Beanie with document models
    await init_beanie(
        database=_database,
        document_models=document_models
    )
    
    logger.info(f"[MongoDB] Beanie ODM initialized with database: {database_name}")
    logger.info(f"[MongoDB] Registered {len(document_models)} document models")


async def close_mongodb() -> None:
    """
    Close MongoDB connection
    
    Call this during FastAPI lifespan shutdown
    """
    global _client, _database
    
    if _client:
        _client.close()
        _client = None
        _database = None
        logger.info("[MongoDB] Connection closed")


def get_database() -> motor.motor_asyncio.AsyncIOMotorDatabase:
    """
    Get the MongoDB database instance
    
    For direct collection access when needed
    """
    if not _database:
        raise RuntimeError("[MongoDB] Database not initialized. Call init_mongodb() first.")
    return _database


def get_collection(collection_name: str):
    """
    Get a raw MongoDB collection (for non-Beanie operations)
    
    Most operations should use Beanie Documents directly,
    but this is available for advanced queries.
    """
    db = get_database()
    return db[collection_name]


async def test_connection() -> bool:
    """Test if the MongoDB connection is working"""
    if not _client:
        return False
    
    try:
        # Ping the database
        await _client.admin.command("ping")
        logger.info("[MongoDB] Connection test successful")
        return True
    except Exception as e:
        logger.error(f"[MongoDB] Connection test failed: {e}")
        return False


# ========== Legacy Compatibility ==========
# For gradual migration from raw Motor to Beanie
class MongoDBConnector:
    """
    DEPRECATED: Use init_mongodb() and Beanie Documents instead.
    
    This class is kept for backward compatibility during migration.
    """
    
    def __init__(self):
        logger.warning(
            "[MongoDB] MongoDBConnector is deprecated. "
            "Use init_mongodb() and Beanie Documents instead."
        )
        # For legacy code, provide access to the initialized database
        if _database is not None:
            self.db = _database
            self.client = _client
        else:
            # Fallback: import from config and create connection
            from .mongo_config import MONGO_URL, MONGO_DB
            self.client = motor.motor_asyncio.AsyncIOMotorClient(
                MONGO_URL,
                tls=True,
                tlsCAFile=certifi.where(),
            )
            self.db = self.client[MONGO_DB]
            logger.info("[MongoDB] Legacy connector initialized")

    def get_collection(self, collection_name: str):
        """Get a collection by name"""
        return self.db[collection_name]
    
    async def close_connection(self):
        """Close the connection"""
        if self.client:
            self.client.close()
            self.client = None
            self.db = None

