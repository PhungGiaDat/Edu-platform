from typing import List, Optional, Dict, Any, TYPE_CHECKING
from database.base_repo import BaseRepository
import logging
from datetime import datetime
from bson import ObjectId

if TYPE_CHECKING:
    from motor.motor_asyncio import AsyncIOMotorCollection

logger = logging.getLogger(__name__)


class _SafeCursor:
    def sort(self, *args, **kwargs): return self
    def skip(self, *args, **kwargs): return self
    def limit(self, *args, **kwargs): return self
    async def to_list(self, *args, **kwargs): return []


class _SafeCollection:
    async def find_one(self, *args, **kwargs): return None
    async def find(self, *args, **kwargs): return _SafeCursor()
    async def update_one(self, *args, **kwargs):
        raise RuntimeError("MongoDB unavailable: chat_history not migrated to PostgreSQL")


class ChatRepository(BaseRepository):
    def __init__(self):
        try:
            super().__init__("chat_history")
        except RuntimeError:
            self._collection = None  # pragma: no cover — postgres_core_enabled=True

    @property
    def collection(self) -> "AsyncIOMotorCollection":
        if self._collection is None:
            return _SafeCollection()  # type: ignore[return-value]
        return self._collection

    async def get_user_sessions(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        cursor = self.collection.find({"user_id": user_id})
        cursor = cursor.sort("updated_at", -1).limit(limit)
        results = await cursor.to_list(length=limit)
        for doc in results:
            if "_id" in doc:
                doc["_id"] = str(doc["_id"])
        return results

    async def add_message(self, session_id: str, message: Dict[str, Any]) -> bool:
        result = await self.collection.update_one(
            {"_id": ObjectId(session_id)},
            {"$push": {"messages": message}, "$set": {"updated_at": datetime.utcnow()}}
        )
        return result.modified_count > 0


def get_chat_repository() -> ChatRepository:
    return ChatRepository()
