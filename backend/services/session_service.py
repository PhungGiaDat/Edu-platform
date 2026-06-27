# backend/services/session_service.py
"""
Session Service - Redis-backed Session Management
Handles user sessions, JWT blacklist, and session refresh.
"""
import asyncio
import json
import logging
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from settings import settings
from services.redis_service import redis_service

logger = logging.getLogger(__name__)


class SessionKeys:
    """Session key patterns."""
    
    # Session data
    SESSION = "session:{session_id}"
    
    # JWT blacklist (revoked tokens)
    BLACKLIST = "blacklist:{jti}"
    
    # User sessions (index of active sessions per user)
    USER_SESSIONS = "user_sessions:{user_id}"
    
    # Session activity tracking
    ACTIVITY = "activity:{session_id}"
    
    @classmethod
    def session(cls, session_id: str) -> str:
        return cls.SESSION.format(session_id=session_id)
    
    @classmethod
    def blacklist(cls, jti: str) -> str:
        return cls.BLACKLIST.format(jti=jti)
    
    @classmethod
    def user_sessions(cls, user_id: str) -> str:
        return cls.USER_SESSIONS.format(user_id=user_id)
    
    @classmethod
    def activity(cls, session_id: str) -> str:
        return cls.ACTIVITY.format(session_id=session_id)


class SessionService:
    """
    Redis-backed session management service.
    
    Features:
    - Create/validate/refresh sessions
    - JWT blacklist for token revocation
    - Session activity tracking
    - Multiple sessions per user support
    """
    
    def __init__(self):
        self._session_ttl_seconds = settings.SESSION_TTL_HOURS * 3600
        self._refresh_threshold_seconds = settings.SESSION_REFRESH_THRESHOLD_MINUTES * 60
    
    async def create_session(
        self,
        user_id: str,
        jti: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a new session.
        
        Args:
            user_id: User identifier
            jti: JWT ID for token
            metadata: Additional session metadata
            
        Returns:
            Session data including session_id
        """
        session_id = secrets.token_urlsafe(32)
        now = datetime.utcnow()
        
        session_data = {
            "session_id": session_id,
            "user_id": user_id,
            "jti": jti,
            "created_at": now.isoformat(),
            "last_activity": now.isoformat(),
            "metadata": metadata or {},
        }
        
        # Store session data
        await redis_service.set_json(
            SessionKeys.session(session_id),
            session_data,
            ttl_seconds=self._session_ttl_seconds
        )
        
        # Add to user's session index
        await redis_service.hset(
            SessionKeys.user_sessions(user_id),
            session_id,
            now.isoformat()
        )
        
        # Set TTL on user sessions index
        await redis_service.expire(
            SessionKeys.user_sessions(user_id),
            self._session_ttl_seconds
        )
        
        logger.info(f"[Session] Created session {session_id} for user {user_id}")
        
        return session_data
    
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get session by ID.
        
        Returns:
            Session data or None if not found/expired
        """
        session = await redis_service.get_json(SessionKeys.session(session_id))
        
        if session:
            # Update last activity
            session["last_activity"] = datetime.utcnow().isoformat()
            await redis_service.set_json(
                SessionKeys.session(session_id),
                session,
                ttl_seconds=self._session_ttl_seconds
            )
        
        return session
    
    async def validate_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Validate session and return user data if valid.
        
        Returns:
            Session data if valid, None otherwise
        """
        session = await self.get_session(session_id)
        
        if not session:
            return None
        
        # Check if session is expired (shouldn't happen with Redis TTL, but double-check)
        created_at = datetime.fromisoformat(session["created_at"])
        if datetime.utcnow() - created_at > timedelta(hours=settings.SESSION_TTL_HOURS):
            await self.delete_session(session_id)
            return None
        
        return session
    
    async def refresh_session(self, session_id: str) -> bool:
        """
        Refresh session TTL and update last activity.
        
        Returns:
            True if successful, False if session not found
        """
        session = await redis_service.get_json(SessionKeys.session(session_id))
        
        if not session:
            return False
        
        # Update activity timestamp
        session["last_activity"] = datetime.utcnow().isoformat()
        
        # Refresh TTL
        await redis_service.set_json(
            SessionKeys.session(session_id),
            session,
            ttl_seconds=self._session_ttl_seconds
        )
        
        return True
    
    async def delete_session(self, session_id: str) -> bool:
        """
        Delete a session.
        
        Returns:
            True if deleted, False if not found
        """
        # Get session first to clean up user index
        session = await redis_service.get_json(SessionKeys.session(session_id))
        
        if session:
            user_id = session.get("user_id")
            
            # Delete session
            await redis_service.delete(SessionKeys.session(session_id))
            
            # Remove from user sessions index
            if user_id:
                await redis_service.hdel(
                    SessionKeys.user_sessions(user_id),
                    session_id
                )
            
            # Delete activity tracking
            await redis_service.delete(SessionKeys.activity(session_id))
            
            logger.info(f"[Session] Deleted session {session_id}")
            return True
        
        return False
    
    async def delete_all_user_sessions(self, user_id: str) -> int:
        """
        Delete all sessions for a user.
        
        Returns:
            Number of sessions deleted
        """
        # Get all user sessions
        sessions = await redis_service.hgetall(SessionKeys.user_sessions(user_id))
        
        count = 0
        for session_id in sessions.keys():
            await redis_service.delete(SessionKeys.session(session_id))
            await redis_service.delete(SessionKeys.activity(session_id))
            count += 1
        
        # Delete user sessions index
        await redis_service.delete(SessionKeys.user_sessions(user_id))
        
        logger.info(f"[Session] Deleted {count} sessions for user {user_id}")
        return count
    
    async def get_user_sessions(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Get all active sessions for a user.
        
        Returns:
            List of session data
        """
        sessions = []
        
        # Get session IDs from user index
        session_ids = await redis_service.hgetall(SessionKeys.user_sessions(user_id))
        
        for session_id in session_ids.keys():
            session = await redis_service.get_json(SessionKeys.session(session_id))
            if session:
                sessions.append({
                    "session_id": session_id,
                    "created_at": session.get("created_at"),
                    "last_activity": session.get("last_activity"),
                    "metadata": session.get("metadata", {}),
                })
        
        return sessions
    
    # ==================== JWT Blacklist ====================
    
    async def blacklist_token(self, jti: str, exp: datetime) -> bool:
        """
        Add JWT to blacklist.
        
        Args:
            jti: JWT ID
            exp: Token expiration time
            
        Returns:
            True if added successfully
        """
        # Calculate TTL based on token expiration
        ttl = int((exp - datetime.utcnow()).total_seconds())
        
        if ttl <= 0:
            # Token already expired, no need to blacklist
            return True
        
        # Store in blacklist
        await redis_service.set(
            SessionKeys.blacklist(jti),
            datetime.utcnow().isoformat(),
            ttl_seconds=ttl
        )
        
        logger.info(f"[Session] Blacklisted token {jti}")
        return True
    
    async def is_token_blacklisted(self, jti: str) -> bool:
        """
        Check if JWT is blacklisted.
        
        Returns:
            True if blacklisted (revoked)
        """
        return await redis_service.exists(SessionKeys.blacklist(jti))
    
    # ==================== Activity Tracking ====================
    
    async def record_activity(self, session_id: str) -> bool:
        """
        Record user activity for the session.
        
        Used for tracking usage time and activity patterns.
        """
        now = datetime.utcnow()
        
        activity_data = {
            "timestamp": now.isoformat(),
            "date": now.strftime("%Y-%m-%d"),
        }
        
        await redis_service.set_json(
            SessionKeys.activity(session_id),
            activity_data,
            ttl_seconds=86400  # 24 hours
        )
        
        return True
    
    async def get_session_activity(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get last activity for a session."""
        return await redis_service.get_json(SessionKeys.activity(session_id))
    
    # ==================== Session Stats ====================
    
    async def get_stats(self, user_id: str) -> Dict[str, Any]:
        """Get session statistics for a user."""
        sessions = await self.get_user_sessions(user_id)
        
        now = datetime.utcnow()
        active_count = 0
        total_duration_minutes = 0
        
        for session in sessions:
            created = datetime.fromisoformat(session["created_at"])
            duration = (now - created).total_seconds() / 60
            total_duration_minutes += duration
            active_count += 1
        
        return {
            "active_sessions": active_count,
            "total_duration_minutes": round(total_duration_minutes, 1),
            "avg_session_minutes": round(total_duration_minutes / active_count, 1) if active_count > 0 else 0,
        }


# ==================== Global Instance ====================

session_service = SessionService()
