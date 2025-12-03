from typing import List, Optional, Dict, Any
from database.base_repo import BaseRepository
import logging
from datetime import datetime
from bson import ObjectId

logger = logging.getLogger(__name__)

class GamificationRepository(BaseRepository):
    def __init__(self):
        super().__init__("user_points")

    async def get_by_user_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"user_id": user_id})

    async def update_points(self, user_id: str, points: int) -> Dict[str, Any]:
        """Increment points for a user"""
        return await self.collection.find_one_and_update(
            {"user_id": user_id},
            {"$inc": {"total_points": points}, "$set": {"last_activity_date": datetime.utcnow()}},
            upsert=True,
            return_document=True
        )
    
    async def get_leaderboard(self, limit: int = 10) -> List[Dict[str, Any]]:
        return await self.find_many(
            filter={},
            limit=limit,
            sort=[("total_points", -1)]
        )

def get_gamification_repository() -> GamificationRepository:
    return GamificationRepository()
