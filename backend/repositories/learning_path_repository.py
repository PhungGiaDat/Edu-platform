# backend/repositories/learning_path_repository.py
"""
Learning Path Repository - Data Access Layer for learning_paths collection

One document per user, upserted on every save from LearningPathSetup.
"""
from typing import Optional, Dict, Any
from datetime import datetime
from database.base_repo import BaseRepository
import logging

logger = logging.getLogger(__name__)


class LearningPathRepository(BaseRepository):
    """
    Repository for learning_paths collection.
    One document per user (unique on user_id).
    """

    def __init__(self):
        super().__init__("learning_paths")

    async def get_by_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Return the user's learning path document, or None if not set."""
        doc = await self.find_one({"user_id": user_id})
        if doc and "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return doc

    async def upsert(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create or replace the user's learning path.
        Always sets updated_at to now. Sets created_at only on insert.
        """
        user_id = data["user_id"]
        now = datetime.utcnow()

        update = {
            "$set": {
                "priority_topics":        data.get("priority_topics", []),
                "daily_time_goal_mins":   data.get("daily_time_goal_mins", 15),
                "daily_words_goal":       data.get("daily_words_goal", 5),
                "notifications_enabled":  data.get("notifications_enabled", True),
                "updated_at":             now,
            },
            "$setOnInsert": {
                "user_id":    user_id,
                "created_at": now,
            },
        }

        await self.collection.update_one(
            {"user_id": user_id},
            update,
            upsert=True,
        )

        result = await self.get_by_user(user_id)
        logger.info(f"[LearningPath] Upserted for user={user_id}")
        return result or {}

    async def update_topics(
        self, user_id: str, priority_topics: list
    ) -> bool:
        """Partial update: only change priority_topics list."""
        return await self.update_one(
            {"user_id": user_id},
            {"$set": {"priority_topics": priority_topics, "updated_at": datetime.utcnow()}},
        )

    async def delete_by_user(self, user_id: str) -> bool:
        """Remove a user's learning path (e.g., account deletion)."""
        return await self.delete_one({"user_id": user_id})


def get_learning_path_repository() -> LearningPathRepository:
    """Factory function for FastAPI dependency injection."""
    return LearningPathRepository()
