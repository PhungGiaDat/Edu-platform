# backend/core/base_mongo_repository.py
"""
Base Repository for MongoDB using Beanie ODM
Provides type-safe operations with Document validation
"""
from typing import Type, TypeVar, List, Optional, Generic, Dict, Any
from beanie import Document, PydanticObjectId
import logging

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=Document)


class BaseMongoRepository(Generic[T]):
    """
    Generic Repository Pattern for MongoDB operations using Beanie
    Provides common CRUD operations that all MongoDB repositories can use
    
    Usage:
        class FlashcardRepository(BaseMongoRepository[Flashcard]):
            def __init__(self):
                super().__init__(Flashcard)
    """
    
    def __init__(self, model: Type[T]):
        self.model = model
        logger.debug(f"📦 [MongoRepository] Initialized: {model.__name__}")
    
    # ========== CREATE ==========
    
    async def create(self, obj: T) -> T:
        """Insert a new document"""
        await obj.insert()
        logger.info(f"✅ [CREATE] {self.model.__name__}: {obj.id}")
        return obj
    
    async def create_from_dict(self, data: Dict[str, Any]) -> T:
        """Create document from dictionary"""
        obj = self.model(**data)
        return await self.create(obj)
    
    async def create_many(self, objects: List[T]) -> List[T]:
        """Insert multiple documents"""
        await self.model.insert_many(objects)
        logger.info(f"✅ [CREATE_MANY] {self.model.__name__}: {len(objects)} documents")
        return objects
    
    # ========== READ ==========
    
    async def get_by_id(self, id: str | PydanticObjectId) -> Optional[T]:
        """Find document by _id"""
        if isinstance(id, str):
            id = PydanticObjectId(id)
        return await self.model.get(id)
    
    async def get_all(self, skip: int = 0, limit: int = 100) -> List[T]:
        """Get all documents with pagination"""
        return await self.model.find_all().skip(skip).limit(limit).to_list()
    
    async def find_one(self, **filters) -> Optional[T]:
        """Find single document by filters"""
        return await self.model.find_one(filters)
    
    async def find_many(
        self, 
        filters: Dict[str, Any] = None,
        skip: int = 0, 
        limit: int = 100
    ) -> List[T]:
        """Find multiple documents by filters"""
        query = self.model.find(filters or {})
        return await query.skip(skip).limit(limit).to_list()
    
    async def count(self, filters: Dict[str, Any] = None) -> int:
        """Count documents matching filters"""
        return await self.model.find(filters or {}).count()
    
    # ========== UPDATE ==========
    
    async def update(self, obj: T, update_data: Dict[str, Any]) -> T:
        """Update a document"""
        await obj.update({"$set": update_data})
        logger.info(f"📝 [UPDATE] {self.model.__name__}: {obj.id}")
        return obj
    
    async def update_by_id(self, id: str, update_data: Dict[str, Any]) -> Optional[T]:
        """Update document by ID"""
        obj = await self.get_by_id(id)
        if obj:
            return await self.update(obj, update_data)
        return None
    
    async def update_many(self, filters: Dict[str, Any], update_data: Dict[str, Any]) -> int:
        """Update multiple documents"""
        result = await self.model.find(filters).update_many({"$set": update_data})
        logger.info(f"📝 [UPDATE_MANY] {self.model.__name__}: {result.modified_count} documents")
        return result.modified_count
    
    # ========== DELETE ==========
    
    async def delete(self, obj: T) -> bool:
        """Delete a document"""
        await obj.delete()
        logger.info(f"🗑️ [DELETE] {self.model.__name__}: {obj.id}")
        return True
    
    async def delete_by_id(self, id: str) -> bool:
        """Delete document by ID"""
        obj = await self.get_by_id(id)
        if obj:
            return await self.delete(obj)
        return False
    
    async def delete_many(self, filters: Dict[str, Any]) -> int:
        """Delete multiple documents"""
        result = await self.model.find(filters).delete()
        logger.info(f"🗑️ [DELETE_MANY] {self.model.__name__}: {result.deleted_count} documents")
        return result.deleted_count
    
    # ========== UTILITY ==========
    
    async def exists(self, **filters) -> bool:
        """Check if document exists"""
        count = await self.count(filters)
        return count > 0
    
    async def aggregate(self, pipeline: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Execute aggregation pipeline"""
        return await self.model.aggregate(pipeline).to_list()
