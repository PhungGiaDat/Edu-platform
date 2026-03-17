# backend/repositories/pronunciation_repository.py
"""
Pronunciation Repository - Data Access Layer for pronunciation_attempts collection

Provides insert + query operations over PronunciationAttemptDocument.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from database.base_repo import BaseRepository
import logging

logger = logging.getLogger(__name__)


class PronunciationRepository(BaseRepository):
    """
    Repository for pronunciation_attempts collection.
    One document per attempt; multiple per (user, flashcard) pair.
    """

    def __init__(self):
        super().__init__("pronunciation_attempts")

    # ------------------------------------------------------------------
    # WRITE
    # ------------------------------------------------------------------

    async def create_attempt(self, data: Dict[str, Any]) -> str:
        """
        Insert a new pronunciation attempt.
        Returns the inserted document _id as string.
        """
        data.setdefault("attempted_at", datetime.utcnow())
        doc_id = await self.insert_one(data)
        logger.info(
            f"[Pronunciation] Attempt logged: user={data.get('user_id')} "
            f"word={data.get('flashcard_qr_id')} score={data.get('score')}"
        )
        return doc_id

    # ------------------------------------------------------------------
    # READ
    # ------------------------------------------------------------------

    async def get_attempts(
        self,
        user_id: str,
        flashcard_qr_id: str,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """Get the most recent attempts for a (user, word) pair."""
        docs = await self.find_many(
            filter={"user_id": user_id, "flashcard_qr_id": flashcard_qr_id},
            limit=limit,
            sort=[("attempted_at", -1)],
        )
        for doc in docs:
            if "_id" in doc:
                doc["_id"] = str(doc["_id"])
        return docs

    async def get_best_score(
        self, user_id: str, flashcard_qr_id: str
    ) -> Optional[int]:
        """Return the highest score the user has achieved for a word."""
        pipeline = [
            {"$match": {"user_id": user_id, "flashcard_qr_id": flashcard_qr_id}},
            {"$group": {"_id": None, "best": {"$max": "$score"}}},
        ]
        cursor = self.collection.aggregate(pipeline)
        results = await cursor.to_list(length=1)
        if results:
            return results[0].get("best")
        return None

    async def get_stats(
        self, user_id: str, flashcard_qr_id: str
    ) -> Dict[str, Any]:
        """
        Return aggregated stats for a (user, word) pair:
        total_attempts, best_score, average_score, last_attempted_at.
        """
        pipeline = [
            {"$match": {"user_id": user_id, "flashcard_qr_id": flashcard_qr_id}},
            {
                "$group": {
                    "_id": None,
                    "total_attempts": {"$sum": 1},
                    "best_score": {"$max": "$score"},
                    "average_score": {"$avg": "$score"},
                    "last_attempted_at": {"$max": "$attempted_at"},
                }
            },
        ]
        cursor = self.collection.aggregate(pipeline)
        results = await cursor.to_list(length=1)
        if results:
            r = results[0]
            return {
                "flashcard_qr_id": flashcard_qr_id,
                "total_attempts": r["total_attempts"],
                "best_score": r["best_score"],
                "average_score": round(r["average_score"], 1),
                "last_attempted_at": r["last_attempted_at"],
            }
        return {
            "flashcard_qr_id": flashcard_qr_id,
            "total_attempts": 0,
            "best_score": 0,
            "average_score": 0.0,
            "last_attempted_at": None,
        }

    async def count_attempts_for_user(self, user_id: str) -> int:
        """Total number of pronunciation attempts by a user (for badge check)."""
        return await self.count({"user_id": user_id})

    async def get_recent_attempts(
        self, user_id: str, limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get the most recent attempts across all words (for Progress Report)."""
        docs = await self.find_many(
            filter={"user_id": user_id},
            limit=limit,
            sort=[("attempted_at", -1)],
        )
        for doc in docs:
            if "_id" in doc:
                doc["_id"] = str(doc["_id"])
        return docs


def get_pronunciation_repository() -> PronunciationRepository:
    """Factory function for FastAPI dependency injection."""
    return PronunciationRepository()
