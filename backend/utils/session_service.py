# backend/utils/session_service.py
"""
Session service with Redis-backed session tracking and app lock.

Features:
- Track user session start time
- Auto-lock after configurable idle time (default: 25 minutes)
- Heartbeat endpoint integration
- Lock/unlock endpoints
- Session metadata storage (active topic, device info)
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from settings import settings
from utils.redis_client import get_redis, RedisClient

logger = logging.getLogger(__name__)


class SessionService:
    """
    Manages user sessions with Redis backing and auto-lock functionality.

    Session data structure:
    {
        "user_id": str,
        "started_at": ISO timestamp,
        "last_activity": ISO timestamp,
        "active_topic": str | None,
        "device_info": dict | None,
        "is_locked": bool,
        "locked_at": ISO timestamp | None
    }
    """

    SESSION_PREFIX = "session:"
    LOCK_PREFIX = "lock:"
    HEARTBEAT_INTERVAL = 60  # seconds

    def __init__(self, redis: RedisClient):
        self._redis = redis
        # Use APP_LOCK_DEFAULT_TTL_MINUTES converted to seconds
        self._lock_timeout = settings.APP_LOCK_DEFAULT_TTL_MINUTES * 60

    def _session_key(self, user_id: str) -> str:
        """Generate session key for a user."""
        return f"{self.SESSION_PREFIX}{user_id}"

    def _lock_key(self, user_id: str) -> str:
        """Generate lock key for a user."""
        return f"{self.LOCK_PREFIX}{user_id}"

    # ========== Session Management ==========

    async def start_session(
        self,
        user_id: str,
        active_topic: Optional[str] = None,
        device_info: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Start a new session for a user.
        Clears any existing lock state.
        """
        now = datetime.utcnow()
        session_data = {
            "user_id": user_id,
            "started_at": now.isoformat(),
            "last_activity": now.isoformat(),
            "active_topic": active_topic,
            "device_info": device_info,
            "is_locked": False,
            "locked_at": None,
        }

        session_key = self._session_key(user_id)
        await self._redis.set(session_key, session_data, ttl=settings.REDIS_TTL)

        # Clear any existing lock
        await self.unlock(user_id)

        logger.info(f"[Session] Started for user={user_id}, topic={active_topic}")
        return session_data

    async def get_session(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get current session data for a user."""
        session_key = self._session_key(user_id)
        return await self._redis.get(session_key)

    async def end_session(self, user_id: str) -> bool:
        """End a user's session and clear all related data."""
        session_key = self._session_key(user_id)
        lock_key = self._lock_key(user_id)

        await self._redis.delete(session_key)
        await self._redis.delete(lock_key)

        logger.info(f"[Session] Ended for user={user_id}")
        return True

    async def update_activity(
        self,
        user_id: str,
        active_topic: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Update session activity timestamp.
        Called on every user interaction (API call, heartbeat).
        Resets idle timer and unlocks if was locked.
        """
        session_key = self._session_key(user_id)
        session_data = await self._redis.get(session_key)

        if not session_data:
            # No active session, auto-start one
            return await self.start_session(user_id, active_topic)

        now = datetime.utcnow()
        session_data["last_activity"] = now.isoformat()
        if active_topic:
            session_data["active_topic"] = active_topic

        # If was locked, unlock on activity
        if session_data.get("is_locked"):
            session_data["is_locked"] = False
            session_data["locked_at"] = None
            logger.info(f"[Session] Auto-unlocked on activity for user={user_id}")

        await self._redis.set(session_key, session_data, ttl=settings.REDIS_TTL)

        # Also clear the lock key
        lock_key = self._lock_key(user_id)
        await self._redis.delete(lock_key)

        return session_data

    async def heartbeat(self, user_id: str) -> Dict[str, Any]:
        """
        Process heartbeat from client.
        Updates last_activity timestamp.
        Returns current session status.
        """
        session_data = await self.update_activity(user_id)

        # Check if should be auto-locked due to inactivity
        if session_data:
            last_activity = datetime.fromisoformat(session_data["last_activity"])
            idle_seconds = (datetime.utcnow() - last_activity).total_seconds()

            return {
                "status": "active",
                "idle_seconds": int(idle_seconds),
                "is_locked": session_data.get("is_locked", False),
                "ttl_seconds": self._lock_timeout - int(idle_seconds),
            }

        return {"status": "no_session", "idle_seconds": 0}

    # ========== Lock Management ==========

    async def lock(self, user_id: str, reason: str = "manual") -> bool:
        """
        Lock the user's app session.
        Prevents access until unlocked.
        """
        session_key = self._session_key(user_id)
        session_data = await self._redis.get(session_key)

        if not session_data:
            logger.warning(f"[Session] Cannot lock - no active session for user={user_id}")
            return False

        now = datetime.utcnow()
        session_data["is_locked"] = True
        session_data["locked_at"] = now.isoformat()
        session_data["lock_reason"] = reason

        # Store with longer TTL to preserve lock state
        await self._redis.set(session_key, session_data, ttl=settings.REDIS_TTL)

        # Also set a separate lock key for quick checks
        lock_key = self._lock_key(user_id)
        await self._redis.set(
            lock_key,
            {"user_id": user_id, "reason": reason, "locked_at": now.isoformat()},
            ttl=self._lock_timeout,
        )

        logger.info(f"[Session] Locked user={user_id}, reason={reason}")
        return True

    async def unlock(self, user_id: str) -> bool:
        """Unlock the user's app session."""
        session_key = self._session_key(user_id)
        session_data = await self._redis.get(session_key)

        if session_data:
            session_data["is_locked"] = False
            session_data["locked_at"] = None
            session_data.pop("lock_reason", None)
            await self._redis.set(session_key, session_data, ttl=settings.REDIS_TTL)

        lock_key = self._lock_key(user_id)
        await self._redis.delete(lock_key)

        logger.info(f"[Session] Unlocked user={user_id}")
        return True

    async def is_locked(self, user_id: str) -> bool:
        """Check if a user's session is locked."""
        # Quick check via lock key
        lock_key = self._lock_key(user_id)
        if await self._redis.exists(lock_key):
            return True

        # Fallback to session data check
        session_key = self._session_key(user_id)
        session_data = await self._redis.get(session_key)
        return session_data.get("is_locked", False) if session_data else False

    async def check_idle_lock(self, user_id: str) -> bool:
        """
        Check if user should be auto-locked due to inactivity.
        Returns True if lock was applied.
        """
        session_key = self._session_key(user_id)
        session_data = await self._redis.get(session_key)

        if not session_data:
            return False

        # Skip if already locked
        if session_data.get("is_locked"):
            return False

        last_activity = datetime.fromisoformat(session_data["last_activity"])
        idle_seconds = (datetime.utcnow() - last_activity).total_seconds()

        if idle_seconds >= self._lock_timeout:
            await self.lock(user_id, reason="idle_timeout")
            logger.info(f"[Session] Auto-locked user={user_id} after {idle_seconds}s idle")
            return True

        return False

    # ========== Utility Methods ==========

    async def get_session_duration(self, user_id: str) -> Optional[int]:
        """Get session duration in seconds."""
        session_data = await self.get_session(user_id)
        if not session_data:
            return None

        started_at = datetime.fromisoformat(session_data["started_at"])
        return int((datetime.utcnow() - started_at).total_seconds())

    async def get_idle_time(self, user_id: str) -> Optional[int]:
        """Get idle time in seconds since last activity."""
        session_data = await self.get_session(user_id)
        if not session_data:
            return None

        last_activity = datetime.fromisoformat(session_data["last_activity"])
        return int((datetime.utcnow() - last_activity).total_seconds())

    async def get_all_active_sessions(self) -> list:
        """Get all active sessions (for admin/monitoring)."""
        keys = await self._redis.keys(f"{self.SESSION_PREFIX}*")
        sessions = []
        for key in keys:
            data = await self._redis.get(key)
            if data:
                sessions.append(data)
        return sessions

    async def cleanup_stale_sessions(self) -> int:
        """
        Clean up sessions that have been idle beyond the lock timeout.
        This should be called periodically (e.g., every 5 minutes).
        """
        sessions = await self.get_all_active_sessions()
        cleaned = 0

        for session in sessions:
            user_id = session.get("user_id")
            if not user_id:
                continue

            # Check if session has exceeded lock timeout
            last_activity = datetime.fromisoformat(session["last_activity"])
            idle_seconds = (datetime.utcnow() - last_activity).total_seconds()

            if idle_seconds >= self._lock_timeout * 2:  # 2x timeout = session expired
                await self.end_session(user_id)
                cleaned += 1
            elif idle_seconds >= self._lock_timeout:
                # Just lock, don't end
                await self.lock(user_id, reason="idle_timeout")
                cleaned += 1

        if cleaned > 0:
            logger.info(f"[Session] Cleaned up {cleaned} stale sessions")

        return cleaned


# ========== Service Instance ==========

_session_service: Optional[SessionService] = None


async def get_session_service() -> SessionService:
    """Get or create session service instance."""
    global _session_service
    if _session_service is None:
        redis = await get_redis()
        _session_service = SessionService(redis)
    return _session_service


async def close_session_service() -> None:
    """Close session service."""
    global _session_service
    if _session_service is not None:
        _session_service = None
