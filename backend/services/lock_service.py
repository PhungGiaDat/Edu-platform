# backend/services/lock_service.py
"""
App Lock Service - Redis-backed Time Limit Management
Handles auto-lock, usage tracking, and parental controls.
"""
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from settings import settings
from services.redis_service import redis_service

logger = logging.getLogger(__name__)


class LockKeys:
    """App lock key patterns."""
    
    # User's current lock state
    USER_LOCK = "app_lock:user:{user_id}"
    
    # Daily usage tracking
    USAGE = "app_lock:usage:{user_id}:{date}"
    
    # Lock override (parent/admin)
    OVERRIDE = "app_lock:override:{user_id}"
    
    @classmethod
    def user_lock(cls, user_id: str) -> str:
        return cls.USER_LOCK.format(user_id=user_id)
    
    @classmethod
    def usage(cls, user_id: str, date: str) -> str:
        return cls.USAGE.format(user_id=user_id, date=date)
    
    @classmethod
    def override(cls, user_id: str) -> str:
        return cls.OVERRIDE.format(user_id=user_id)


class LockState:
    """Lock state constants."""
    
    ACTIVE = "active"
    LOCKED = "locked"
    WARNING = "warning"
    PAUSED = "paused"
    UNLOCKED = "unlocked"


class LockService:
    """
    Redis-backed app lock service for time limits.
    
    Features:
    - TTL-based auto-lock after inactivity
    - Usage time tracking
    - Warning before lock
    - Parent override capability
    - Pause/resume functionality
    """
    
    def __init__(self):
        self._default_ttl_seconds = settings.APP_LOCK_DEFAULT_TTL_MINUTES * 60
        self._warning_ttl_seconds = settings.APP_LOCK_WARNING_TTL_MINUTES * 60
        self._max_extension_seconds = settings.APP_LOCK_MAX_EXTENSION_MINUTES * 60
    
    async def start_lock(
        self,
        user_id: str,
        ttl_minutes: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Start a new app lock for a user.
        
        Args:
            user_id: User identifier
            ttl_minutes: Custom TTL in minutes (uses default if not provided)
            metadata: Additional metadata
            
        Returns:
            Lock state data
        """
        ttl_seconds = (ttl_minutes or settings.APP_LOCK_DEFAULT_TTL_MINUTES) * 60
        now = datetime.utcnow()
        
        lock_data = {
            "user_id": user_id,
            "state": LockState.ACTIVE,
            "started_at": now.isoformat(),
            "expires_at": (now + timedelta(seconds=ttl_seconds)).isoformat(),
            "ttl_seconds": ttl_seconds,
            "warning_threshold_seconds": self._warning_ttl_seconds,
            "is_paused": False,
            "paused_at": None,
            "total_paused_seconds": 0,
            "metadata": metadata or {},
        }
        
        # Store lock state with TTL
        await redis_service.set_json(
            LockKeys.user_lock(user_id),
            lock_data,
            ttl_seconds=ttl_seconds
        )
        
        # Initialize daily usage tracking
        today = now.strftime("%Y-%m-%d")
        await self._record_usage(user_id, today)
        
        logger.info(f"[Lock] Started lock for user {user_id}, TTL={ttl_minutes or settings.APP_LOCK_DEFAULT_TTL_MINUTES}min")
        
        return lock_data
    
    async def get_lock_state(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get current lock state for a user.
        
        Returns:
            Lock state data or None if not locked
        """
        lock_data = await redis_service.get_json(LockKeys.user_lock(user_id))
        
        if not lock_data:
            return None
        
        # Calculate remaining time
        expires_at = datetime.fromisoformat(lock_data["expires_at"])
        remaining_seconds = max(0, int((expires_at - datetime.utcnow()).total_seconds()))
        
        # Update state based on remaining time
        if remaining_seconds == 0:
            lock_data["state"] = LockState.LOCKED
        elif remaining_seconds <= self._warning_ttl_seconds:
            lock_data["state"] = LockState.WARNING
        elif lock_data.get("is_paused"):
            lock_data["state"] = LockState.PAUSED
        else:
            lock_data["state"] = LockState.ACTIVE
        
        lock_data["remaining_seconds"] = remaining_seconds
        
        return lock_data
    
    async def is_locked(self, user_id: str) -> bool:
        """Check if user is currently locked."""
        lock_state = await self.get_lock_state(user_id)
        
        if not lock_state:
            return False
        
        return lock_state.get("state") == LockState.LOCKED
    
    async def unlock(self, user_id: str) -> bool:
        """
        Unlock a user (end the session).
        
        Returns:
            True if unlocked successfully
        """
        lock_data = await redis_service.get_json(LockKeys.user_lock(user_id))
        
        if lock_data:
            # Record final usage
            today = datetime.utcnow().strftime("%Y-%m-%d")
            await self._record_usage(user_id, today, finalize=True)
            
            # Delete lock
            await redis_service.delete(LockKeys.user_lock(user_id))
            await redis_service.delete(LockKeys.override(user_id))
            
            logger.info(f"[Lock] Unlocked user {user_id}")
            return True
        
        return False
    
    async def pause_lock(self, user_id: str) -> bool:
        """
        Pause the lock timer.
        
        Returns:
            True if paused successfully
        """
        lock_data = await redis_service.get_json(LockKeys.user_lock(user_id))
        
        if not lock_data or lock_data.get("is_paused"):
            return False
        
        # Record pause time
        now = datetime.utcnow()
        lock_data["is_paused"] = True
        lock_data["paused_at"] = now.isoformat()
        lock_data["state"] = LockState.PAUSED
        
        # Calculate remaining time
        expires_at = datetime.fromisoformat(lock_data["expires_at"])
        remaining_seconds = max(0, int((expires_at - now).total_seconds()))
        
        # Store remaining time for later
        lock_data["remaining_seconds_before_pause"] = remaining_seconds
        
        # Update with remaining time as TTL
        await redis_service.set_json(
            LockKeys.user_lock(user_id),
            lock_data,
            ttl_seconds=remaining_seconds
        )
        
        logger.info(f"[Lock] Paused lock for user {user_id}")
        return True
    
    async def resume_lock(self, user_id: str) -> bool:
        """
        Resume the lock timer from where it was paused.
        
        Returns:
            True if resumed successfully
        """
        lock_data = await redis_service.get_json(LockKeys.user_lock(user_id))
        
        if not lock_data or not lock_data.get("is_paused"):
            return False
        
        # Get remaining time from pause
        remaining_seconds = lock_data.get("remaining_seconds_before_pause", self._default_ttl_seconds)
        
        now = datetime.utcnow()
        
        # Update lock state
        lock_data["is_paused"] = False
        lock_data["paused_at"] = None
        lock_data["expires_at"] = (now + timedelta(seconds=remaining_seconds)).isoformat()
        lock_data["state"] = LockState.ACTIVE if remaining_seconds > self._warning_ttl_seconds else LockState.WARNING
        lock_data["remaining_seconds"] = remaining_seconds
        
        # Add paused time to total
        if lock_data.get("paused_at"):
            pause_duration = (now - datetime.fromisoformat(lock_data["paused_at"])).total_seconds()
            lock_data["total_paused_seconds"] = lock_data.get("total_paused_seconds", 0) + pause_duration
        
        # Reset remaining before pause
        lock_data.pop("remaining_seconds_before_pause", None)
        
        # Store with new TTL
        await redis_service.set_json(
            LockKeys.user_lock(user_id),
            lock_data,
            ttl_seconds=remaining_seconds
        )
        
        logger.info(f"[Lock] Resumed lock for user {user_id}, remaining={remaining_seconds}s")
        return True
    
    async def extend_lock(
        self,
        user_id: str,
        extra_minutes: int,
        extended_by: str = "parent"
    ) -> Optional[Dict[str, Any]]:
        """
        Extend the lock time (parent override).
        
        Args:
            user_id: User identifier
            extra_minutes: Additional minutes to add
            extended_by: Who extended (for audit)
            
        Returns:
            Updated lock state or None if not locked
        """
        # Enforce maximum extension
        extra_minutes = min(extra_minutes, settings.APP_LOCK_MAX_EXTENSION_MINUTES)
        
        lock_data = await redis_service.get_json(LockKeys.user_lock(user_id))
        
        if not lock_data:
            return None
        
        # Calculate new expiry
        now = datetime.utcnow()
        current_ttl = await redis_service.ttl(LockKeys.user_lock(user_id))
        
        if current_ttl < 0:
            current_ttl = 0
        
        new_ttl_seconds = current_ttl + (extra_minutes * 60)
        
        # Check max extension
        if new_ttl_seconds > self._max_extension_seconds:
            new_ttl_seconds = self._max_extension_seconds
        
        new_expires_at = now + timedelta(seconds=new_ttl_seconds)
        
        # Update lock state
        lock_data["expires_at"] = new_expires_at.isoformat()
        lock_data["ttl_seconds"] = new_ttl_seconds
        lock_data["is_paused"] = False
        lock_data["state"] = LockState.ACTIVE
        lock_data["last_extended_at"] = now.isoformat()
        lock_data["last_extended_by"] = extended_by
        lock_data["remaining_seconds"] = new_ttl_seconds
        
        # Store with new TTL
        await redis_service.set_json(
            LockKeys.user_lock(user_id),
            lock_data,
            ttl_seconds=new_ttl_seconds
        )
        
        # Store override record
        override_data = {
            "extended_by": extended_by,
            "extra_minutes": extra_minutes,
            "at": now.isoformat(),
        }
        await redis_service.set_json(
            LockKeys.override(user_id),
            override_data,
            ttl_seconds=86400  # 24 hours
        )
        
        logger.info(f"[Lock] Extended lock for user {user_id} by {extra_minutes}min by {extended_by}")
        
        return lock_data
    
    async def record_activity(self, user_id: str) -> bool:
        """
        Record user activity to keep the lock active.
        
        This should be called periodically to update usage.
        
        Returns:
            True if recorded successfully
        """
        today = datetime.utcnow().strftime("%Y-%m-%d")
        return await self._record_usage(user_id, today)
    
    async def get_usage_today(self, user_id: str) -> Dict[str, Any]:
        """
        Get usage statistics for today.
        
        Returns:
            Usage data including total minutes
        """
        today = datetime.utcnow().strftime("%Y-%m-%d")
        return await self._get_usage(user_id, today)
    
    async def get_usage_range(
        self,
        user_id: str,
        start_date: str,
        end_date: str
    ) -> Dict[str, Any]:
        """
        Get usage statistics for a date range.
        
        Args:
            user_id: User identifier
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            
        Returns:
            Usage data for the range
        """
        total_minutes = 0
        daily_breakdown = []
        
        current = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
        
        while current <= end:
            date_str = current.strftime("%Y-%m-%d")
            usage = await self._get_usage(user_id, date_str)
            
            if usage.get("total_minutes", 0) > 0:
                total_minutes += usage["total_minutes"]
                daily_breakdown.append({
                    "date": date_str,
                    "minutes": usage["total_minutes"],
                })
            
            current += timedelta(days=1)
        
        return {
            "start_date": start_date,
            "end_date": end_date,
            "total_minutes": total_minutes,
            "daily_breakdown": daily_breakdown,
        }
    
    # ==================== Private Methods ====================
    
    async def _record_usage(self, user_id: str, date: str, finalize: bool = False) -> bool:
        """Record usage for a specific date."""
        key = LockKeys.usage(user_id, date)
        
        usage_data = await redis_service.get_json(key) or {
            "user_id": user_id,
            "date": date,
            "sessions": [],
            "total_minutes": 0,
        }
        
        now = datetime.utcnow()
        
        if finalize:
            # Record session end
            if usage_data.get("current_session_start"):
                session_start = datetime.fromisoformat(usage_data["current_session_start"])
                session_minutes = int((now - session_start).total_seconds() / 60)
                usage_data["sessions"].append({
                    "start": usage_data["current_session_start"],
                    "end": now.isoformat(),
                    "minutes": session_minutes,
                })
                usage_data["total_minutes"] += session_minutes
                usage_data["current_session_start"] = None
        else:
            # Record or update current session
            if not usage_data.get("current_session_start"):
                usage_data["current_session_start"] = now.isoformat()
        
        # Set TTL (keep for 7 days after the date)
        days_until_expiry = 7 - (datetime.strptime(date, "%Y-%m-%d") - now).days
        ttl = max(86400, days_until_expiry * 86400)
        
        await redis_service.set_json(key, usage_data, ttl_seconds=ttl)
        
        return True
    
    async def _get_usage(self, user_id: str, date: str) -> Dict[str, Any]:
        """Get usage data for a specific date."""
        usage_data = await redis_service.get_json(LockKeys.usage(user_id, date))
        
        if not usage_data:
            return {
                "date": date,
                "total_minutes": 0,
                "sessions": [],
            }
        
        # If there's an active session, add current time to total
        total_minutes = usage_data.get("total_minutes", 0)
        
        if usage_data.get("current_session_start"):
            session_start = datetime.fromisoformat(usage_data["current_session_start"])
            current_session_minutes = int((datetime.utcnow() - session_start).total_seconds() / 60)
            total_minutes += current_session_minutes
        
        return {
            "date": date,
            "total_minutes": total_minutes,
            "sessions": usage_data.get("sessions", []),
        }


# ==================== Global Instance ====================

lock_service = LockService()
