# backend/repositories/session_log_repository.py
"""
Session Log Repository - Data Access Layer for session_logs collection

Backend is log-only: records start/end times and duration.
Enforcement (break reminders, locking) is handled by the frontend.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
from database.base_repo import BaseRepository
import logging

logger = logging.getLogger(__name__)


class SessionLogRepository(BaseRepository):
    """
    Repository for session_logs collection.
    One document per session; a user may have many sessions.
    """

    def __init__(self):
        super().__init__("session_logs")

    # ------------------------------------------------------------------
    # WRITE
    # ------------------------------------------------------------------

    async def create_session(
        self, user_id: str, active_topic: Optional[str] = None
    ) -> str:
        """
        Open a new session log. Returns the new document _id as string.
        Called by the frontend when the learner enters the app/lesson.
        """
        doc = {
            "user_id": user_id,
            "started_at": datetime.utcnow(),
            "ended_at": None,
            "duration_seconds": None,
            "break_reminder_sent": False,
            "active_topic": active_topic,
        }
        doc_id = await self.insert_one(doc)
        logger.info(f"[Session] Started: user={user_id} topic={active_topic} id={doc_id}")
        return doc_id

    async def end_session(
        self,
        session_id: str,
        break_reminder_sent: bool = False,
    ) -> Optional[Dict[str, Any]]:
        """
        Close an open session. Computes duration_seconds server-side.
        Returns the updated document, or None if not found.
        """
        try:
            oid = ObjectId(session_id)
        except Exception:
            logger.warning(f"[Session] Invalid session_id: {session_id}")
            return None

        doc = await self.collection.find_one({"_id": oid})
        if not doc:
            return None

        now = datetime.utcnow()
        started_at: datetime = doc.get("started_at", now)
        duration_seconds = int((now - started_at).total_seconds())

        await self.collection.update_one(
            {"_id": oid},
            {
                "$set": {
                    "ended_at": now,
                    "duration_seconds": duration_seconds,
                    "break_reminder_sent": break_reminder_sent,
                }
            },
        )
        logger.info(
            f"[Session] Ended: id={session_id} duration={duration_seconds}s "
            f"break_reminder={break_reminder_sent}"
        )
        updated = await self.collection.find_one({"_id": oid})
        if updated and "_id" in updated:
            updated["_id"] = str(updated["_id"])
        return updated

    # ------------------------------------------------------------------
    # READ
    # ------------------------------------------------------------------

    async def get_sessions(
        self, user_id: str, days: int = 7, limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get recent closed sessions for a user (for Progress Report)."""
        since = datetime.utcnow() - timedelta(days=days)
        docs = await self.find_many(
            filter={
                "user_id": user_id,
                "started_at": {"$gte": since},
                "ended_at": {"$ne": None},
            },
            limit=limit,
            sort=[("started_at", -1)],
        )
        for doc in docs:
            if "_id" in doc:
                doc["_id"] = str(doc["_id"])
        return docs

    async def get_summary(self, user_id: str) -> Dict[str, Any]:
        """
        Aggregate session stats for the Progress Report:
        total_sessions, total_time_seconds, average, longest, most_studied_topic.
        """
        pipeline = [
            {"$match": {"user_id": user_id, "ended_at": {"$ne": None}}},
            {
                "$group": {
                    "_id": None,
                    "total_sessions": {"$sum": 1},
                    "total_time_seconds": {"$sum": "$duration_seconds"},
                    "average_session_seconds": {"$avg": "$duration_seconds"},
                    "longest_session_seconds": {"$max": "$duration_seconds"},
                }
            },
        ]
        cursor = self.collection.aggregate(pipeline)
        results = await cursor.to_list(length=1)

        # Most studied topic — separate aggregation
        topic_pipeline = [
            {"$match": {"user_id": user_id, "active_topic": {"$ne": None}}},
            {"$group": {"_id": "$active_topic", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 1},
        ]
        topic_cursor = self.collection.aggregate(topic_pipeline)
        topic_results = await topic_cursor.to_list(length=1)
        most_studied_topic = topic_results[0]["_id"] if topic_results else None

        if results:
            r = results[0]
            return {
                "user_id": user_id,
                "total_sessions": r["total_sessions"],
                "total_time_seconds": r["total_time_seconds"] or 0,
                "average_session_seconds": round(r["average_session_seconds"] or 0, 1),
                "longest_session_seconds": r["longest_session_seconds"] or 0,
                "most_studied_topic": most_studied_topic,
            }

        return {
            "user_id": user_id,
            "total_sessions": 0,
            "total_time_seconds": 0,
            "average_session_seconds": 0.0,
            "longest_session_seconds": 0,
            "most_studied_topic": None,
        }

    async def get_active_session(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Return the most recent unclosed session for a user (if any)."""
        doc = await self.collection.find_one(
            {"user_id": user_id, "ended_at": None},
            sort=[("started_at", -1)],
        )
        if doc and "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return doc


def get_session_log_repository() -> SessionLogRepository:
    """Factory function for FastAPI dependency injection."""
    return SessionLogRepository()
