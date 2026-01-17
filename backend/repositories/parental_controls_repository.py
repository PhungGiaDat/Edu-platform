"""
Parental Controls Repository - Data Access Layer
Handles learning paths and time limits
"""
from typing import Optional, List, Dict, Any
from database.base_repo import BaseRepository
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class ParentalControlsRepository(BaseRepository):
    """Repository for parental_controls collection"""
    
    def __init__(self):
        super().__init__("parental_controls")
    
    async def get_by_child_id(self, child_id: str) -> Optional[Dict[str, Any]]:
        """Get parental controls for a child"""
        return await self.find_one({"child_id": child_id})
    
    async def upsert_controls(self, child_id: str, controls: Dict[str, Any]) -> Dict[str, Any]:
        """Create or update parental controls"""
        controls["updated_at"] = datetime.utcnow()
        return await self.collection.find_one_and_update(
            {"child_id": child_id},
            {"$set": controls, "$setOnInsert": {"child_id": child_id, "created_at": datetime.utcnow()}},
            upsert=True,
            return_document=True
        )
    
    async def set_time_limit(self, child_id: str, time_limit_mins: int) -> Dict[str, Any]:
        """Set daily time limit"""
        return await self.collection.find_one_and_update(
            {"child_id": child_id},
            {"$set": {"time_limit_mins": time_limit_mins, "updated_at": datetime.utcnow()}},
            upsert=True,
            return_document=True
        )
    
    async def set_learning_path(self, child_id: str, priority_topics: List[str]) -> Dict[str, Any]:
        """Set learning path priorities"""
        return await self.collection.find_one_and_update(
            {"child_id": child_id},
            {"$set": {"priority_topics": priority_topics, "updated_at": datetime.utcnow()}},
            upsert=True,
            return_document=True
        )
    
    async def set_break_reminder(self, child_id: str, break_mins: int) -> Dict[str, Any]:
        """Set break reminder interval"""
        return await self.collection.find_one_and_update(
            {"child_id": child_id},
            {"$set": {"break_reminder_mins": break_mins, "updated_at": datetime.utcnow()}},
            upsert=True,
            return_document=True
        )
    
    async def log_session(self, child_id: str, session_mins: int) -> Dict[str, Any]:
        """Log a learning session"""
        today = datetime.utcnow().strftime("%Y-%m-%d")
        return await self.collection.find_one_and_update(
            {"child_id": child_id},
            {
                "$push": {
                    "sessions": {
                        "date": today,
                        "duration_mins": session_mins,
                        "timestamp": datetime.utcnow()
                    }
                },
                "$inc": {"today_usage_mins": session_mins}
            },
            upsert=True,
            return_document=True
        )
    
    async def reset_daily_usage(self, child_id: str) -> Dict[str, Any]:
        """Reset daily usage counter (called at start of new day)"""
        return await self.collection.find_one_and_update(
            {"child_id": child_id},
            {"$set": {"today_usage_mins": 0}},
            return_document=True
        )


def get_parental_controls_repository() -> ParentalControlsRepository:
    return ParentalControlsRepository()
