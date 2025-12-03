from typing import List, Optional, Dict, Any
from database.base_repo import BaseRepository
import logging
from datetime import datetime
from bson import ObjectId

logger = logging.getLogger(__name__)

class ChatRepository(BaseRepository):
    def __init__(self):
        super().__init__("chat_history")

    async def get_user_sessions(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        return await self.find_many(
            filter={"user_id": user_id},
            limit=limit,
            sort=[("updated_at", -1)]
        )

    async def add_message(self, session_id: str, message: Dict[str, Any]) -> bool:
        result = await self.collection.update_one(
            {"_id": ObjectId(session_id)},
            {"$push": {"messages": message}, "$set": {"updated_at": datetime.utcnow()}}
        )
        return result.modified_count > 0

def get_chat_repository() -> ChatRepository:
    return ChatRepository()
