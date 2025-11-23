"""
Game Service - Business logic for game operations
"""
from typing import Optional, List, Dict, Any

from repositories.game_repository import GameRepository, get_game_repository


class GameService:
    """Service handling game business logic"""
    
    def __init__(self, game_repo: GameRepository):
        self.game_repo = game_repo
    
    async def get_game_by_flashcard(
        self,
        qr_id: str,
        game_type: Optional[str] = None,
        difficulty: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get game session for a flashcard by QR ID
        
        Args:
            qr_id: Flashcard QR ID
            game_type: Optional game type filter
            difficulty: Optional difficulty filter
        
        Returns:
            Game session with challenges array
        """
        # Get all game challenges for this flashcard with filters
        filters = {}
        if game_type:
            filters["game_type"] = game_type
        if difficulty:
            filters["difficulty"] = difficulty
        
        challenges = await self.game_repo.get_by_flashcard_qr_id(qr_id, **filters)
        
        if not challenges:
            return None
        
        # Return in GameSessionSchema format
        return {
            "flashcard_qr_id": qr_id,
            "challenges": challenges,
            "difficulty": difficulty,
            "game_type": game_type
        }


def get_game_service() -> GameService:
    """Factory function for dependency injection"""
    game_repo = get_game_repository()
    return GameService(game_repo)
