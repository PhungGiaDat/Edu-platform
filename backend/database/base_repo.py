from database.db import mongo_connector
from typing import Dict, Any, List, Optional


class BaseRepository:
    """Base repository with common MongoDB operations"""
    
    def __init__(self, collection_name: str):
        self.collection = mongo_connector.get_collection(collection_name)
    
    async def find_one(self, filter: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Find a single document"""
        return await self.collection.find_one(filter)
    
    async def find_many(
        self, 
        filter: Dict[str, Any] = None, 
        limit: int = 100,
        skip: int = 0,
        sort: List[tuple] = None
    ) -> List[Dict[str, Any]]:
        """Find multiple documents with pagination and sorting"""
        cursor = self.collection.find(filter or {})
        
        if sort:
            cursor = cursor.sort(sort)
        
        cursor = cursor.skip(skip).limit(limit)
        return await cursor.to_list(length=limit)
    
    async def insert_one(self, document: Dict[str, Any]) -> str:
        """Insert a single document, return inserted ID"""
        result = await self.collection.insert_one(document)
        return str(result.inserted_id)
    
    async def insert_many(self, documents: List[Dict[str, Any]]) -> List[str]:
        """Insert multiple documents, return inserted IDs"""
        result = await self.collection.insert_many(documents)
        return [str(id) for id in result.inserted_ids]
    
    async def update_one(
        self, 
        filter: Dict[str, Any], 
        update: Dict[str, Any],
        upsert: bool = False
    ) -> bool:
        """Update a single document"""
        result = await self.collection.update_one(filter, update, upsert=upsert)
        return result.modified_count > 0 or result.upserted_id is not None
    
    async def delete_one(self, filter: Dict[str, Any]) -> bool:
        """Delete a single document"""
        result = await self.collection.delete_one(filter)
        return result.deleted_count > 0
    
    async def count(self, filter: Dict[str, Any] = None) -> int:
        """Count documents matching filter"""
        return await self.collection.count_documents(filter or {})