from typing import List, Dict, Any
from repositories.gamification_repository import get_gamification_repository
import logging

logger = logging.getLogger(__name__)

class GamificationService:
    def __init__(self):
        self.repo = get_gamification_repository()

    async def award_points(self, user_id: str, points: int, reason: str) -> Dict[str, Any]:
        logger.info(f"Awarding {points} points to {user_id} for {reason}")
        return await self.repo.update_points(user_id, points)

    async def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        stats = await self.repo.get_by_user_id(user_id)
        if not stats:
            return {"total_points": 0, "level": 1, "badges": []}
        return stats

    async def get_leaderboard(self) -> List[Dict[str, Any]]:
        return await self.repo.get_leaderboard()

def get_gamification_service() -> GamificationService:
    return GamificationService()
