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


def get_flashcard_repository() -> FlashcardRepository:
    """Factory function for dependency injection"""
    return FlashcardRepository()
    async def search_by_word(self, word: str) -> List[Dict[str, Any]]:
        """
        Search flashcards by word (case-insensitive, partial match)
        
        Args:
            word: Search term
            
        Returns:
            List of matching flashcard documents
        """
        return await self.find_many(
            filter={"word": {"$regex": word, "$options": "i"}},
            limit=100
        )
    
    async def get_all_categories(self) -> List[str]:
        """
        Get list of all unique categories
        
        Returns:
            List of category names
        """
        result = await self.collection.distinct("category")
        return result
    
    async def count_by_category(self, category: str) -> int:
        """
        Count flashcards in a category
        
        Args:
            category: Category name
            
        Returns:
            Number of flashcards
        """
        return await self.count({"category": category})
