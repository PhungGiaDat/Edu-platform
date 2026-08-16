# backend/repositories/game_repository.py
"""
Game Repository - Data Access Layer for mini games
"""
from typing import Optional, List, Dict, Any
import json
from database.base_repo import BaseRepository
from database.postgres_connection import postgres_core_enabled, postgres_pool
import logging

logger = logging.getLogger(__name__)


class GameRepository(BaseRepository):
    """
    Repository for mini_game_bank collection
    Handles mini game challenges and data
    """
    
    def __init__(self):
        if postgres_core_enabled():
            self.collection = None
        else:
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
        
        if postgres_core_enabled():
            clauses = ["flashcard_qr_id = $1"]
            args: list[Any] = [qr_id]
            if filters.get("game_type"):
                clauses.append(f"game_type = ${len(args)+1}")
                args.append(filters["game_type"])
            if filters.get("difficulty"):
                clauses.append(f"difficulty = ${len(args)+1}")
                args.append(filters["difficulty"])
            rows = await postgres_pool().fetch(
                "SELECT game_type,flashcard_qr_id,difficulty,question,image_url,correct_answer,stars_reward,time_limit,payload FROM public.mini_game_items WHERE " + " AND ".join(clauses),
                *args,
            )
            values = []
            for row in rows:
                value = dict(row)
                payload = value.pop("payload", {}) or {}
                if isinstance(payload, str):
                    try:
                        payload = json.loads(payload)
                    except json.JSONDecodeError:
                        payload = {}
                value.update(payload)
                values.append(value)
            return values
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
        if postgres_core_enabled():
            rows = await postgres_pool().fetch("SELECT * FROM public.mini_game_items WHERE game_type=$1 OFFSET $2 LIMIT $3", game_type, skip, limit)
            return [dict(row) for row in rows]
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
        if postgres_core_enabled():
            rows = await postgres_pool().fetch("SELECT * FROM public.mini_game_items WHERE difficulty=$1 OFFSET $2 LIMIT $3", difficulty, skip, limit)
            return [dict(row) for row in rows]
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
        if postgres_core_enabled():
            return [row["game_type"] for row in await postgres_pool().fetch("SELECT DISTINCT game_type FROM public.mini_game_items ORDER BY game_type")]
        return await self.collection.distinct("game_type")


def get_game_repository() -> GameRepository:
    """Factory function for dependency injection"""
    return GameRepository()
