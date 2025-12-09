# backend/repositories/flashcard_repository.py
"""
Flashcard Repository - Data Access Layer
"""
from typing import Optional, List, Dict, Any
from database.base_repo import BaseRepository
import logging

logger = logging.getLogger(__name__)


class FlashcardRepository(BaseRepository):
    """
    Repository for flashcards collection
    Handles all database operations related to flashcards
    """
    
    def __init__(self):
        super().__init__("flashcards")
    
    async def get_by_qr_id(self, qr_id: str) -> Optional[Dict[str, Any]]:
        """
        Find flashcard by QR ID
        
        Args:
            qr_id: QR code identifier (e.g., 'ele123')
            
        Returns:
            Flashcard document or None
        """
        logger.debug(f"🔍 [SEARCH] Flashcard by qr_id: {qr_id}")
        result = await self.collection.find_one({"qr_id": qr_id})
        if result and "_id" in result:
            result["_id"] = str(result["_id"])
        return result
    
    async def get_by_ar_tag(self, ar_tag: str) -> Optional[Dict[str, Any]]:
        """
        Find flashcard by AR tag
        
        Args:
            ar_tag: AR tracking tag
            
        Returns:
            Flashcard document or None
        """
        return await self.find_one({"ar_tag": ar_tag})
    
    async def get_by_category(self, category: str) -> List[Dict[str, Any]]:
        """
        Get flashcards by category
        
        Args:
            category: Category name
            
        Returns:
            List of flashcard documents
        """
        cursor = self.collection.find({"category": category})
        results = await cursor.to_list(length=100)
        for result in results:
            if "_id" in result:
                result["_id"] = str(result["_id"])
        return results
    
    async def search_by_word(self, word: str) -> List[Dict[str, Any]]:
        """
        Search flashcards by word (case-insensitive)
        
        Args:
            word: Word to search
            
        Returns:
            List of flashcard documents
        """
        cursor = self.collection.find({"word": {"$regex": word, "$options": "i"}})
        results = await cursor.to_list(length=100)
        for result in results:
            if "_id" in result:
                result["_id"] = str(result["_id"])
        return results
    
    async def get_by_qr_id_and_ar_tag(
        self, 
        qr_id: str, 
        ar_tag: str
    ) -> Optional[Dict[str, Any]]:
        """
        Find flashcard by both QR ID and AR tag
        
        Args:
            qr_id: QR code identifier
            ar_tag: AR tracking tag
            
        Returns:
            Flashcard document or None
        """
        return await self.find_one({"qr_id": qr_id, "ar_tag": ar_tag})
    
    async def get_by_category(
        self, 
        category: str,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get flashcards by category with pagination
        
        Args:
            category: Category name (e.g., 'animals', 'fruits')
            skip: Number of documents to skip
            limit: Maximum number of documents to return
            
        Returns:
            List of flashcard documents
        """
        return await self.find_many(
            filter={"category": category},
            skip=skip,
            limit=limit,
            sort=[("word", 1)]  # Sort alphabetically
        )
    
    async def get_by_difficulty(
        self,
        difficulty: str,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get flashcards by difficulty level
        
        Args:
            difficulty: Difficulty level ('easy', 'medium', 'hard')
            skip: Number of documents to skip
            limit: Maximum number of documents to return
            
        Returns:
            List of flashcard documents
        """
        return await self.find_many(
            filter={"difficulty": difficulty},
            skip=skip,
            limit=limit
        )
    
    async def vector_search(
        self,
        query_vector: List[float],
        limit: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Perform semantic vector search using MongoDB Atlas $vectorSearch.
        
        IMPORTANT: Requires a Vector Search Index named 'flashcard_vector_index'
        to be created on MongoDB Atlas Dashboard before use.
        
        Args:
            query_vector: 768-dimensional embedding vector from Gemini
            limit: Maximum number of results to return
            
        Returns:
            List of flashcard documents with similarity scores
        """
        if not query_vector:
            logger.warning("[VectorSearch] Empty query vector provided")
            return []
        
        pipeline = [
            {
                "$vectorSearch": {
                    "index": "flashcard_vector_index",
                    "path": "vector_embedding",
                    "queryVector": query_vector,
                    "numCandidates": limit * 10,  # Broader search for better results
                    "limit": limit
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "qr_id": 1,
                    "word": 1,
                    "definition": 1,
                    "translation": 1,
                    "category": 1,
                    "image_url": 1,
                    "score": {"$meta": "vectorSearchScore"}
                }
            }
        ]
        
        try:
            cursor = self.collection.aggregate(pipeline)
            results = await cursor.to_list(length=limit)
            
            # Convert ObjectId to string
            for result in results:
                if "_id" in result:
                    result["_id"] = str(result["_id"])
            
            logger.info(f"[VectorSearch] Found {len(results)} results")
            return results
        except Exception as e:
            logger.error(f"[VectorSearch] Search failed: {e}")
            # Fallback: return empty list (index might not exist yet)
            return []
    
    async def get_flashcards_without_embedding(
        self,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get flashcards that don't have vector embeddings yet.
        Useful for batch embedding generation.
        
        Returns:
            List of flashcard documents without embeddings
        """
        cursor = self.collection.find(
            {"vector_embedding": {"$exists": False}},
            {"_id": 1, "qr_id": 1, "word": 1, "definition": 1, "translation": 1}
        ).limit(limit)
        
        results = await cursor.to_list(length=limit)
        for result in results:
            if "_id" in result:
                result["_id"] = str(result["_id"])
        return results
    
    async def update_embedding(
        self,
        qr_id: str,
        embedding: List[float]
    ) -> bool:
        """
        Update vector embedding for a flashcard.
        
        Args:
            qr_id: Flashcard QR ID
            embedding: 768-dimensional embedding vector
            
        Returns:
            True if update successful
        """
        try:
            result = await self.collection.update_one(
                {"qr_id": qr_id},
                {"$set": {"vector_embedding": embedding}}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"[Embedding] Update failed for {qr_id}: {e}")
            return False
    
    async def get_all_categories(self) -> List[str]:
        """Get list of all unique categories"""
        result = await self.collection.distinct("category")
        return result
    
    async def count_by_category(self, category: str) -> int:
        """Count flashcards in a category"""
        return await self.count({"category": category})


def get_flashcard_repository() -> FlashcardRepository:
    """Factory function for dependency injection"""
    return FlashcardRepository()

