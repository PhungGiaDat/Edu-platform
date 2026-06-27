# backend/services/session_tracking_service.py
"""
Session Tracking Service - Business logic for session management
"""
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

SESSION_TIMEOUT_SECONDS = 300  # 5 minutes


class SessionTrackingService:
    """
    Service for managing session heartbeat, status, and app locking.
    """

    def __init__(self):
        self.idle_threshold = SESSION_TIMEOUT_SECONDS

    async def process_heartbeat(
        self,
        repo,
        session_id: str,
        user_id: str,
        current_step_id: Optional[str] = None,
        current_step_index: Optional[int] = None,
        progress_percent: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Process a heartbeat from the client.
        Updates session last_seen time and returns updated session.
        """
        return await repo.heartbeat(
            session_id=session_id,
            user_id=user_id,
            current_step_id=current_step_id,
            current_step_index=current_step_index,
            progress_percent=progress_percent
        )

    async def get_session_status(
        self,
        repo,
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get current session status for a user.
        Returns None if no active session.
        """
        session = await repo.get_active_session(user_id)

        if not session:
            return None

        now = datetime.utcnow()
        last_heartbeat = session.get("last_heartbeat", now)

        idle_seconds = 0
        if session.get("status") in ("active", "idle"):
            idle_seconds = int((now - last_heartbeat).total_seconds())

        total_time = 0
        if session.get("started_at"):
            total_time = int((now - session["started_at"]).total_seconds())

        is_locked = session.get("is_locked", False)
        locked_until = session.get("locked_until")

        if is_locked and locked_until and now > locked_until:
            await repo.unlock_app(session["session_id"], user_id)
            is_locked = False
            locked_until = None

        return {
            "session_id": session.get("session_id"),
            "user_id": user_id,
            "status": session.get("status", "active"),
            "started_at": session.get("started_at"),
            "last_heartbeat": last_heartbeat,
            "total_time_seconds": total_time,
            "idle_time_seconds": idle_seconds,
            "current_step_id": session.get("current_step_id"),
            "current_step_index": session.get("current_step_index", 0),
            "progress_percent": session.get("progress_percent", 0),
            "is_locked": is_locked,
            "locked_at": session.get("locked_at"),
            "locked_until": locked_until,
            "locked_reason": session.get("locked_reason"),
        }

    async def lock_app(
        self,
        repo,
        session_id: str,
        user_id: str,
        reason: Optional[str] = None,
        duration_minutes: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Lock the app for the current session.
        Optional duration for temporary locks.
        """
        result = await repo.lock_app(
            session_id=session_id,
            user_id=user_id,
            reason=reason,
            duration_minutes=duration_minutes
        )

        if not result:
            return None

        now = datetime.utcnow()
        locked_until = result.get("locked_until")

        message = "App locked successfully"
        if reason:
            message = f"App locked: {reason}"
        if locked_until:
            message = f"App locked until {locked_until.strftime('%H:%M')}"

        return {
            "session_id": session_id,
            "status": "locked",
            "locked_at": now,
            "locked_until": locked_until,
            "message": message,
        }

    async def unlock_app(
        self,
        repo,
        session_id: str,
        user_id: str
    ) -> bool:
        """Unlock the app for the current session."""
        return await repo.unlock_app(session_id, user_id)

    async def cleanup_idle_sessions(self, repo) -> int:
        """Mark stale sessions as idle."""
        return await repo.cleanup_stale_sessions(self.idle_threshold)

    async def get_user_metrics(
        self,
        repo,
        user_id: str
    ) -> Dict[str, Any]:
        """Get aggregated metrics for a user."""
        return await repo.get_user_metrics(user_id)


def get_session_tracking_service() -> SessionTrackingService:
    """Factory function for dependency injection."""
    return SessionTrackingService()
