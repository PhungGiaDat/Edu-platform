# backend/repositories/game_repository.py
"""
Game Repository - Data Access Layer for mini games
"""
from typing import Optional, List, Dict, Any
from database.base_repo import BaseRepository
import logging

logger = logging.getLogger(__name__)


class GameRepository(BaseRepository):
    """
    Repository for mini_game_bank collection
    Handles mini game challenges and data
    """
    
    def __init__(self):
        super().__init__("mini_game_bank")
    
    async def get_by_flashcard_qr_id(
        self,
        qr_id: str,
        **filters
    ) -> List[Dict[str, Any]]:
        """
        Get game challenges by flashcard QR ID with optional filters
        
        Args:
            qr_id: Flashcard QR identifier (e.g., 'ele123')
            **filters: Optional filters (game_type, difficulty)
            
        Returns:
            List of game challenge documents
        """
        logger.debug(f"🔍 [SEARCH] Games for flashcard: {qr_id}, filters: {filters}")
        
        query = {"flashcard_qr_id": qr_id}
        query.update(filters)
        
        cursor = self.collection.find(query)
        results = await cursor.to_list(length=100)
        
        for result in results:
            if "_id" in result:
                result["_id"] = str(result["_id"])
        
        return results
    
    async def get_by_game_type(
        self,
        game_type: str,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get game sessions by game type
        
        Args:
            game_type: Game type identifier
            skip: Number to skip
            limit: Max number to return
            
        Returns:
            List of game session documents
        """
        return await self.find_many(
            filter={"game_type": game_type},
            skip=skip,
            limit=limit
        )
    
    async def get_by_difficulty(
        self,
        difficulty: str,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get game sessions by difficulty
        
        Args:
            difficulty: Difficulty level
            skip: Number to skip
            limit: Max number to return
            
        Returns:
            List of game session documents
        """
        return await self.find_many(
            filter={"difficulty": difficulty},
            skip=skip,
            limit=limit
        )
    
    async def get_all_game_types(self) -> List[str]:
        """
        Get list of all available game types
        
        Returns:
            List of game type identifiers
        """
        return await self.collection.distinct("game_type")


def get_game_repository() -> GameRepository:
    """Factory function for dependency injection"""
    return GameRepository()
