# backend/service/game/repository/game_repo.py

from database.base_repo import BaseRepository

class GameRepository(BaseRepository):
    """
    Repository for mini games CRUD operations
    """
    
    def __init__(self):
        super().__init__("mini_game_bank")
    
    async def get_by_filters(self, qr_id: str, difficulty: str = None, game_type: str = None):
        """
        Get game challenges by flashcard QR ID with optional filters
        
        Args:
            qr_id: Flashcard QR ID (e.g., 'ele123')
            difficulty: Optional filter ('easy', 'medium', 'hard')
            game_type: Optional filter ('drag_match', 'catch_word', etc.)
            
        Returns:
            list: Array of game challenges
        """
        print(f"[GAME_REPO] Fetching games for: {qr_id}, difficulty: {difficulty}, type: {game_type}")
        
        # Build query
        query = {"flashcard_qr_id": qr_id}
        if difficulty:
            query["difficulty"] = difficulty
        if game_type:
            query["game_type"] = game_type
        
        # Find all matching games
        cursor = self.collection.find(query)
        results = await cursor.to_list(length=100)
        
        # Convert ObjectId to string
        for result in results:
            if "_id" in result:
                result["_id"] = str(result["_id"])
        
        print(f"[GAME_REPO] Found {len(results)} game(s)")
        return results