# backend/repositories/session_tracking_repository.py
"""
Session Tracking Repository - Data Access Layer for active_sessions and session_activities
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from database.base_repo import BaseRepository
import logging

logger = logging.getLogger(__name__)


class SessionTrackingRepository(BaseRepository):
    """
    Repository for active_sessions collection.
    Handles session heartbeat, status tracking, and app locking.
    """

    def __init__(self):
        super().__init__("active_sessions")
        self._activities_collection_name = "session_activities"

    @property
    def activities_collection(self):
        from database.db import mongo_connector
        return mongo_connector.get_collection(self._activities_collection_name)

    # ------------------------------------------------------------------
    # SESSION MANAGEMENT
    # ------------------------------------------------------------------

    async def create_or_update_session(
        self,
        user_id: str,
        session_id: str
    ) -> str:
        """Create or update an active session."""
        now = datetime.utcnow()
        doc = {
            "session_id": session_id,
            "user_id": user_id,
            "status": "active",
            "started_at": now,
            "last_heartbeat": now,
            "last_activity_at": now,
            "current_step_id": None,
            "current_step_index": 0,
            "progress_percent": 0,
            "is_locked": False,
            "locked_at": None,
            "locked_until": None,
            "locked_reason": None,
            "idle_seconds": 0,
        }

        await self.collection.update_one(
            {"user_id": user_id, "status": {"$ne": "ended"}},
            {
                "$set": {"status": "ended", "ended_at": now, "updated_at": now},
            }
        )

        result = await self.collection.update_one(
            {"session_id": session_id},
            {
                "$set": doc,
                "$setOnInsert": {"created_at": now}
            },
            upsert=True
        )

        if result.upserted_id:
            logger.info(f"[SessionTracking] Created new session: {session_id}")
        else:
            logger.debug(f"[SessionTracking] Updated session: {session_id}")

        return session_id

    async def heartbeat(
        self,
        session_id: str,
        user_id: str,
        current_step_id: Optional[str] = None,
        current_step_index: Optional[int] = None,
        progress_percent: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """Update session heartbeat and return updated session."""
        now = datetime.utcnow()

        update_data: Dict[str, Any] = {
            "last_heartbeat": now,
            "last_activity_at": now,
            "idle_seconds": 0,
            "status": "active",
        }

        if current_step_id is not None:
            update_data["current_step_id"] = current_step_id
        if current_step_index is not None:
            update_data["current_step_index"] = current_step_index
        if progress_percent is not None:
            update_data["progress_percent"] = progress_percent

        result = await self.collection.update_one(
            {"session_id": session_id, "user_id": user_id},
            {"$set": update_data}
        )

        if result.modified_count > 0:
            doc = await self.collection.find_one({"session_id": session_id})
            if doc and "_id" in doc:
                doc["_id"] = str(doc["_id"])
            return doc

        return None

    async def get_active_session(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get the current active session for a user."""
        doc = await self.collection.find_one({
            "user_id": user_id,
            "status": {"$in": ["active", "idle", "locked"]}
        })
        if doc and "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return doc

    async def get_session_by_id(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get a session by its ID."""
        doc = await self.collection.find_one({"session_id": session_id})
        if doc and "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return doc

    async def end_session(self, session_id: str, user_id: str) -> bool:
        """End a session."""
        now = datetime.utcnow()
        result = await self.collection.update_one(
            {"session_id": session_id, "user_id": user_id},
            {
                "$set": {
                    "status": "ended",
                    "ended_at": now,
                    "updated_at": now,
                }
            }
        )
        return result.modified_count > 0

    # ------------------------------------------------------------------
    # APP LOCK
    # ------------------------------------------------------------------

    async def lock_app(
        self,
        session_id: str,
        user_id: str,
        reason: Optional[str] = None,
        duration_minutes: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """Lock the app for a session."""
        now = datetime.utcnow()
        locked_until = None
        if duration_minutes:
            locked_until = now + timedelta(minutes=duration_minutes)

        update_data: Dict[str, Any] = {
            "status": "locked",
            "is_locked": True,
            "locked_at": now,
            "locked_until": locked_until,
            "locked_reason": reason,
            "updated_at": now,
        }

        result = await self.collection.update_one(
            {"session_id": session_id, "user_id": user_id},
            {"$set": update_data}
        )

        if result.modified_count > 0:
            doc = await self.collection.find_one({"session_id": session_id})
            if doc and "_id" in doc:
                doc["_id"] = str(doc["_id"])
            logger.info(f"[SessionTracking] App locked: session={session_id} reason={reason}")
            return doc

        return None

    async def unlock_app(self, session_id: str, user_id: str) -> bool:
        """Unlock the app for a session."""
        result = await self.collection.update_one(
            {"session_id": session_id, "user_id": user_id},
            {
                "$set": {
                    "status": "active",
                    "is_locked": False,
                    "locked_at": None,
                    "locked_until": None,
                    "locked_reason": None,
                    "updated_at": datetime.utcnow(),
                }
            }
        )
        return result.modified_count > 0

    # ------------------------------------------------------------------
    # IDLE DETECTION
    # ------------------------------------------------------------------

    async def mark_idle(self, session_id: str, user_id: str) -> bool:
        """Mark a session as idle (no heartbeat received)."""
        result = await self.collection.update_one(
            {"session_id": session_id, "user_id": user_id, "status": "active"},
            {
                "$set": {
                    "status": "idle",
                    "updated_at": datetime.utcnow(),
                }
            }
        )
        return result.modified_count > 0

    async def cleanup_stale_sessions(self, idle_threshold_seconds: int = 300) -> int:
        """Mark stale sessions as idle or ended."""
        threshold = datetime.utcnow() - timedelta(seconds=idle_threshold_seconds)

        result = await self.collection.update_many(
            {
                "status": "active",
                "last_heartbeat": {"$lt": threshold},
            },
            {
                "$set": {
                    "status": "idle",
                    "idle_seconds": int(idle_threshold_seconds),
                    "updated_at": datetime.utcnow(),
                }
            }
        )

        if result.modified_count > 0:
            logger.info(f"[SessionTracking] Marked {result.modified_count} sessions as idle")

        return result.modified_count

    # ------------------------------------------------------------------
    # ACTIVITY LOGGING
    # ------------------------------------------------------------------

    async def log_activity(
        self,
        session_id: str,
        user_id: str,
        activity_type: str,
        activity_data: Optional[Dict[str, Any]] = None
    ) -> str:
        """Log an activity event for analytics."""
        doc = {
            "session_id": session_id,
            "user_id": user_id,
            "activity_type": activity_type,
            "activity_data": activity_data or {},
            "timestamp": datetime.utcnow(),
        }
        result = await self.activities_collection.insert_one(doc)
        return str(result.inserted_id)

    async def get_session_activities(
        self,
        session_id: str,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get activity log for a session."""
        cursor = self.activities_collection.find(
            {"session_id": session_id}
        ).sort("timestamp", -1).limit(limit)
        return await cursor.to_list(length=limit)

    # ------------------------------------------------------------------
    # METRICS
    # ------------------------------------------------------------------

    async def get_user_metrics(self, user_id: str) -> Dict[str, Any]:
        """Get aggregated session metrics for a user."""
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = today - timedelta(days=7)

        # Total sessions and time
        pipeline = [
            {"$match": {"user_id": user_id, "status": "ended"}},
            {
                "$group": {
                    "_id": None,
                    "total_sessions": {"$sum": 1},
                    "total_time_seconds": {"$sum": "$idle_seconds"},
                }
            }
        ]
        cursor = self.collection.aggregate(pipeline)
        totals = await cursor.to_list(length=1)

        # Today's stats
        today_pipeline = [
            {"$match": {
                "user_id": user_id,
                "started_at": {"$gte": today},
                "status": "ended"
            }},
            {"$group": {
                "_id": None,
                "sessions_today": {"$sum": 1},
                "time_today": {"$sum": "$idle_seconds"},
            }}
        ]
        today_cursor = self.collection.aggregate(today_pipeline)
        today_stats = await today_cursor.to_list(length=1)

        total = totals[0] if totals else {"total_sessions": 0, "total_time_seconds": 0}
        today_data = today_stats[0] if today_stats else {"sessions_today": 0, "time_today": 0}

        return {
            "user_id": user_id,
            "total_sessions": total.get("total_sessions", 0),
            "total_time_seconds": total.get("total_time_seconds", 0),
            "average_session_seconds": (
                total.get("total_time_seconds", 0) / total.get("total_sessions", 1)
                if total.get("total_sessions", 0) > 0 else 0
            ),
            "sessions_today": today_data.get("sessions_today", 0),
            "time_today_seconds": today_data.get("time_today", 0),
        }


def get_session_tracking_repository() -> SessionTrackingRepository:
    """Factory function for FastAPI dependency injection."""
    return SessionTrackingRepository()
