# backend/repositories/learning_progress_repository.py
"""
Learning Progress Repository - Data Access Layer for learning_progress collection

Provides CRUD + aggregation operations over LearningProgressDocument.
LearningProgressDocument is defined in models/user_mongo.py.
"""
from typing import Optional, List, Dict, Any, TYPE_CHECKING
from datetime import datetime
from database.base_repo import BaseRepository
import logging

if TYPE_CHECKING:
    from motor.motor_asyncio import AsyncIOMotorCollection

logger = logging.getLogger(__name__)


class _SafeCursor:
    def sort(self, *args, **kwargs): return self
    def limit(self, *args, **kwargs): return self
    async def to_list(self, *args, **kwargs): return []


class _SafeCollection:
    async def find_one(self, *args, **kwargs): return None
    async def find(self, *args, **kwargs): return _SafeCursor()
    async def aggregate(self, *args, **kwargs): return _SafeCursor()
    async def count_documents(self, *args, **kwargs): return 0
    async def update_one(self, *args, **kwargs):
        raise RuntimeError("MongoDB unavailable: learning_progress not migrated to PostgreSQL")


class LearningProgressRepository(BaseRepository):
    """
    Repository for learning_progress collection.
    Tracks per-user, per-flashcard mastery and spaced repetition data.
    """

    def __init__(self):
        try:
            super().__init__("learning_progress")
        except RuntimeError:
            self._collection = None  # pragma: no cover — postgres_core_enabled=True

    @property
    def collection(self) -> "AsyncIOMotorCollection":
        if self._collection is None:
            return _SafeCollection()  # type: ignore[return-value]
        return self._collection

    # ------------------------------------------------------------------
    # READ
    # ------------------------------------------------------------------

    async def get_by_user_and_card(
        self, user_id: str, flashcard_qr_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get progress record for a specific (user, flashcard) pair."""
        doc = await self.find_one(
            {"user_id": user_id, "flashcard_qr_id": flashcard_qr_id}
        )
        if doc and "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return doc

    async def get_all_for_user(
        self, user_id: str, skip: int = 0, limit: int = 200
    ) -> List[Dict[str, Any]]:
        """Get all progress records for a user (for progress dashboard)."""
        docs = await self.find_many(
            filter={"user_id": user_id},
            skip=skip,
            limit=limit,
            sort=[("last_reviewed_at", -1)],
        )
        for doc in docs:
            if "_id" in doc:
                doc["_id"] = str(doc["_id"])
        return docs

    async def get_due_for_review(
        self, user_id: str, limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get flashcards whose next_review_at is in the past (spaced repetition)."""
        now = datetime.utcnow()
        docs = await self.find_many(
            filter={"user_id": user_id, "next_review_at": {"$lte": now}},
            limit=limit,
            sort=[("next_review_at", 1)],
        )
        for doc in docs:
            if "_id" in doc:
                doc["_id"] = str(doc["_id"])
        return docs

    async def get_mastered_by_category(
        self, user_id: str, mastery_threshold: int = 4
    ) -> Dict[str, int]:
        """
        Return {category: mastered_count} for use in the Progress Report.
        Requires a join with the flashcards collection; done via aggregation.
        """
        pipeline = [
            {"$match": {"user_id": user_id, "mastery_level": {"$gte": mastery_threshold}}},
            {
                "$lookup": {
                    "from": "flashcards",
                    "localField": "flashcard_qr_id",
                    "foreignField": "qr_id",
                    "as": "flashcard",
                }
            },
            {"$unwind": {"path": "$flashcard", "preserveNullAndEmptyArrays": True}},
            {"$group": {"_id": "$flashcard.category", "count": {"$sum": 1}}},
        ]
        cursor = self.collection.aggregate(pipeline)
        results = await cursor.to_list(length=100)
        return {r["_id"] or "unknown": r["count"] for r in results}

    # ------------------------------------------------------------------
    # WRITE
    # ------------------------------------------------------------------

    async def upsert_progress(
        self,
        user_id: str,
        flashcard_qr_id: str,
        *,
        viewed: bool = False,
        correct: bool = False,
        incorrect: bool = False,
        mastery_delta: int = 0,
        next_review_at: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Upsert a progress record. Increments counters and optionally updates
        mastery_level and spaced-repetition timestamps.
        """
        now = datetime.utcnow()

        inc_ops: Dict[str, int] = {}
        if viewed:
            inc_ops["times_viewed"] = 1
        if correct:
            inc_ops["times_correct"] = 1
        if incorrect:
            inc_ops["times_incorrect"] = 1

        set_ops: Dict[str, Any] = {"last_reviewed_at": now}
        if next_review_at:
            set_ops["next_review_at"] = next_review_at

        update: Dict[str, Any] = {
            "$setOnInsert": {
                "user_id": user_id,
                "flashcard_qr_id": flashcard_qr_id,
                "mastery_level": 0,
                "first_seen_at": now,
            },
            "$set": set_ops,
        }
        if inc_ops:
            update["$inc"] = inc_ops
        if mastery_delta != 0:
            # Clamp mastery_level to 0–5 via pipeline update is complex;
            # use $inc and rely on service layer to validate 0–5 range.
            update.setdefault("$inc", {})
            update["$inc"]["mastery_level"] = mastery_delta

        await self.collection.update_one(
            {"user_id": user_id, "flashcard_qr_id": flashcard_qr_id},
            update,
            upsert=True,
        )
        return await self.get_by_user_and_card(user_id, flashcard_qr_id) or {}

    async def set_mastery_level(
        self, user_id: str, flashcard_qr_id: str, level: int
    ) -> bool:
        """Directly set mastery_level (0–5). Used by quiz grading service."""
        level = max(0, min(5, level))
        return await self.update_one(
            {"user_id": user_id, "flashcard_qr_id": flashcard_qr_id},
            {"$set": {"mastery_level": level}},
        )

    async def count_mastered(self, user_id: str, threshold: int = 4) -> int:
        """Count how many flashcards a user has mastered."""
        return await self.count(
            {"user_id": user_id, "mastery_level": {"$gte": threshold}}
        )


def get_learning_progress_repository() -> LearningProgressRepository:
    """Factory function for FastAPI dependency injection."""
    return LearningProgressRepository()
