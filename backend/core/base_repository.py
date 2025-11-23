# backend/core/base_repository.py
"""
Abstract Base Repository Pattern
All repositories should inherit from this class
"""
from abc import ABC
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorCollection
from bson import ObjectId
from database.connection import db_manager
import logging

logger = logging.getLogger(__name__)


class BaseRepository(ABC):
    """
    Generic Repository Pattern for MongoDB operations
    Provides common CRUD operations that all repositories can use
    """
    
    def __init__(self, collection_name: str):
        """
        Initialize repository with collection name
        
        Args:
            collection_name: MongoDB collection name
        """
        self.collection_name = collection_name
        self.collection: AsyncIOMotorCollection = db_manager.get_collection(collection_name)
        logger.debug(f"📦 [Repository] Initialized: {collection_name}")
    
    # ========== CREATE ==========
    
    async def create(self, document: Dict[str, Any]) -> Dict[str, Any]:
        """Insert a new document"""
        result = await self.collection.insert_one(document)
        document["_id"] = str(result.inserted_id)
        logger.info(f"✅ [CREATE] {self.collection_name}: {result.inserted_id}")
        return document
    
    async def create_many(self, documents: List[Dict[str, Any]]) -> List[str]:
        """Insert multiple documents"""
        result = await self.collection.insert_many(documents)
        ids = [str(id) for id in result.inserted_ids]
        logger.info(f"✅ [CREATE_MANY] {self.collection_name}: {len(ids)} documents")
        return ids
    
    # ========== READ ==========
    
    async def find_by_id(self, id: str) -> Optional[Dict[str, Any]]:
        """Find document by _id"""
        try:
            result = await self.collection.find_one({"_id": ObjectId(id)})
            if result:
                result["_id"] = str(result["_id"])
            return result
        except Exception as e:
            logger.error(f"❌ [FIND_BY_ID] {self.collection_name}: {e}")
            return None
    
    async def find_one(self, filter: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Find single document by filter"""
        result = await self.collection.find_one(filter)
        if result and "_id" in result:
            result["_id"] = str(result["_id"])
        return result
    
    async def find_many(
        self, 
        filter: Dict[str, Any] = None,
        skip: int = 0,
        limit: int = 100,
        sort: List[tuple] = None
    ) -> List[Dict[str, Any]]:
        """Find multiple documents with pagination"""
        query = self.collection.find(filter or {})
        
        if sort:
            query = query.sort(sort)
        
        query = query.skip(skip).limit(limit)
        
        results = await query.to_list(length=limit)
        
        # Convert ObjectId to string
        for doc in results:
            if "_id" in doc:
                doc["_id"] = str(doc["_id"])
        
        return results
    
    async def find_all(self) -> List[Dict[str, Any]]:
        """Find all documents (use with caution)"""
        return await self.find_many()
    
    async def count(self, filter: Dict[str, Any] = None) -> int:
        """Count documents matching filter"""
        return await self.collection.count_documents(filter or {})
    
    # ========== UPDATE ==========
    
    async def update_one(
        self, 
        filter: Dict[str, Any],
        update: Dict[str, Any]
    ) -> bool:
        """Update single document"""
        result = await self.collection.update_one(filter, {"$set": update})
        logger.info(f"📝 [UPDATE] {self.collection_name}: matched={result.matched_count}, modified={result.modified_count}")
        return result.modified_count > 0
    
    async def update_by_id(self, id: str, update: Dict[str, Any]) -> bool:
        """Update document by _id"""
        try:
            return await self.update_one({"_id": ObjectId(id)}, update)
        except Exception as e:
            logger.error(f"❌ [UPDATE_BY_ID] {self.collection_name}: {e}")
            return False
    
    async def update_many(
        self,
        filter: Dict[str, Any],
        update: Dict[str, Any]
    ) -> int:
        """Update multiple documents"""
        result = await self.collection.update_many(filter, {"$set": update})
        logger.info(f"📝 [UPDATE_MANY] {self.collection_name}: modified={result.modified_count}")
        return result.modified_count
    
    # ========== DELETE ==========
    
    async def delete_one(self, filter: Dict[str, Any]) -> bool:
        """Delete single document"""
        result = await self.collection.delete_one(filter)
        logger.info(f"🗑️ [DELETE] {self.collection_name}: deleted={result.deleted_count}")
        return result.deleted_count > 0
    
    async def delete_by_id(self, id: str) -> bool:
        """Delete document by _id"""
        try:
            return await self.delete_one({"_id": ObjectId(id)})
        except Exception as e:
            logger.error(f"❌ [DELETE_BY_ID] {self.collection_name}: {e}")
            return False
    
    async def delete_many(self, filter: Dict[str, Any]) -> int:
        """Delete multiple documents"""
        result = await self.collection.delete_many(filter)
        logger.info(f"🗑️ [DELETE_MANY] {self.collection_name}: deleted={result.deleted_count}")
        return result.deleted_count
    
    # ========== UTILITY ==========
    
    async def exists(self, filter: Dict[str, Any]) -> bool:
        """Check if document exists"""
        count = await self.collection.count_documents(filter, limit=1)
        return count > 0
    
    async def aggregate(self, pipeline: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Execute aggregation pipeline"""
        cursor = self.collection.aggregate(pipeline)
        results = await cursor.to_list(length=None)
        
        # Convert ObjectId to string
        for doc in results:
            if "_id" in doc:
                doc["_id"] = str(doc["_id"])
        
        return results
