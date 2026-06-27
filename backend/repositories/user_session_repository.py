# backend/repositories/user_session_repository.py
"""
UserSession Repository - CRUD operations for user sessions
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from beanie import PydanticObjectId

from models.user_session import UserSession, SessionStatus, ActivityEntry
from database.connection import db_manager
import logging

logger = logging.getLogger(__name__)


class UserSessionRepository:
    """Repository for UserSession document operations."""
    
    def __init__(self):
        self.collection_name = "user_sessions"
    
    @property
    def collection(self):
        return db_manager.get_collection(self.collection_name)
    
    async def create_session(
        self,
        user_id: str,
        session_id: str,
        session_type: str = "learning",
        course_id: Optional[str] = None,
        lesson_id: Optional[str] = None,
        active_topic: Optional[str] = None,
        client_timezone: Optional[str] = None,
        device_info: Optional[Dict[str, Any]] = None
    ) -> UserSession:
        """Create a new user session."""
        session = UserSession(
            session_id=session_id,
            user_id=user_id,
            session_type=session_type,
            course_id=course_id,
            lesson_id=lesson_id,
            active_topic=active_topic,
            client_timezone=client_timezone,
            device_info=device_info or {},
            status=SessionStatus.ACTIVE,
            started_at=datetime.utcnow(),
            last_activity_at=datetime.utcnow(),
        )
        await session.insert()
        logger.info(f"✅ [Session] Created: {session_id}")
        return session
    
    async def get_active_session(self, user_id: str) -> Optional[UserSession]:
        """Get the current active session for a user."""
        return await UserSession.find_one(
            UserSession.user_id == user_id,
            UserSession.status == SessionStatus.ACTIVE
        )
    
    async def get_session(self, session_id: str) -> Optional[UserSession]:
        """Get a session by session_id."""
        return await UserSession.find_one(UserSession.session_id == session_id)
    
    async def get_user_sessions(
        self,
        user_id: str,
        status: Optional[SessionStatus] = None,
        limit: int = 20,
        skip: int = 0
    ) -> List[UserSession]:
        """Get sessions for a user."""
        query = UserSession.find(UserSession.user_id == user_id)
        if status:
            query = query.match(UserSession.status == status)
        query = query.sort("-started_at").skip(skip).limit(limit)
        return await query.to_list()
    
    async def update_session_activity(
        self,
        session_id: str,
        activity_type: str,
        target_id: str,
        duration_seconds: int = 0,
        completed: bool = False,
        score: Optional[int] = None
    ) -> Optional[UserSession]:
        """Add an activity to the session."""
        session = await self.get_session(session_id)
        if not session:
            return None
        
        activity = ActivityEntry(
            activity_type=activity_type,
            target_id=target_id,
            started_at=datetime.utcnow(),
            duration_seconds=duration_seconds,
            completed=completed,
            score=score
        )
        
        session.activities.append(activity)
        session.last_activity_at = datetime.utcnow()
        await session.save()
        return session
    
    async def update_session_metrics(
        self,
        session_id: str,
        words_learned: int = 0,
        games_played: int = 0,
        pronunciation_attempts: int = 0,
        quiz_score: Optional[int] = None,
        xp_earned: int = 0
    ) -> Optional[UserSession]:
        """Update session metrics."""
        session = await self.get_session(session_id)
        if not session:
            return None
        
        session.words_learned += words_learned
        session.games_played += games_played
        session.pronunciation_attempts += pronunciation_attempts
        if quiz_score is not None:
            session.quiz_score = quiz_score
        session.xp_earned += xp_earned
        session.last_activity_at = datetime.utcnow()
        await session.save()
        return session
    
    async def pause_session(self, session_id: str) -> Optional[UserSession]:
        """Pause an active session."""
        session = await self.get_session(session_id)
        if not session or session.status != SessionStatus.ACTIVE:
            return None
        
        session.status = SessionStatus.PAUSED
        await session.save()
        logger.info(f"⏸️ [Session] Paused: {session_id}")
        return session
    
    async def resume_session(self, session_id: str) -> Optional[UserSession]:
        """Resume a paused session."""
        session = await self.get_session(session_id)
        if not session or session.status != SessionStatus.PAUSED:
            return None
        
        session.status = SessionStatus.ACTIVE
        session.last_activity_at = datetime.utcnow()
        await session.save()
        logger.info(f"▶️ [Session] Resumed: {session_id}")
        return session
    
    async def end_session(
        self,
        session_id: str,
        streak_maintained: bool = False,
        break_count: int = 0,
        break_reminder_sent: bool = False
    ) -> Optional[UserSession]:
        """End a session and calculate duration."""
        session = await self.get_session(session_id)
        if not session:
            return None
        
        session.status = SessionStatus.COMPLETED
        session.ended_at = datetime.utcnow()
        session.total_duration_seconds = int(
            (session.ended_at - session.started_at).total_seconds()
        )
        session.active_duration_seconds = session.total_duration_seconds - session.paused_duration_seconds
        session.streak_maintained = streak_maintained
        session.break_count = break_count
        session.break_reminder_sent = break_reminder_sent
        
        # Set TTL (180 days)
        session.expires_at = datetime.utcnow() + timedelta(days=180)
        
        await session.save()
        logger.info(f"🏁 [Session] Ended: {session_id} ({session.total_duration_seconds}s)")
        return session
    
    async def abandon_session(self, session_id: str) -> Optional[UserSession]:
        """Mark a session as abandoned (user left without ending)."""
        session = await self.get_session(session_id)
        if not session:
            return None
        
        session.status = SessionStatus.ABANDONED
        session.ended_at = datetime.utcnow()
        session.expires_at = datetime.utcnow() + timedelta(days=180)
        await session.save()
        logger.info(f"⚠️ [Session] Abandoned: {session_id}")
        return session
    
    async def get_user_session_stats(
        self,
        user_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get session statistics for a user over a period."""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        pipeline = [
            {"$match": {
                "user_id": user_id,
                "started_at": {"$gte": start_date}
            }},
            {"$group": {
                "_id": None,
                "total_sessions": {"$sum": 1},
                "total_duration": {"$sum": "$total_duration_seconds"},
                "total_words_learned": {"$sum": "$words_learned"},
                "total_games_played": {"$sum": "$games_played"},
                "total_pronunciation": {"$sum": "$pronunciation_attempts"},
                "total_xp": {"$sum": "$xp_earned"},
                "avg_duration": {"$avg": "$total_duration_seconds"},
                "longest_session": {"$max": "$total_duration_seconds"},
                "streaks_maintained": {
                    "$sum": {"$cond": ["$streak_maintained", 1, 0]}
                }
            }}
        ]
        
        results = await self.collection.aggregate(pipeline).to_list(1)
        if not results:
            return {
                "total_sessions": 0,
                "total_duration": 0,
                "avg_duration": 0,
                "days": days
            }
        
        stats = results[0]
        stats["days"] = days
        stats["total_duration_hours"] = round(stats["total_duration"] / 3600, 2)
        stats["avg_duration_minutes"] = round(stats["avg_duration"] / 60, 2)
        stats["longest_session_minutes"] = round(stats["longest_session"] / 60, 2)
        del stats["_id"]
        
        return stats


# Singleton instance
user_session_repo = UserSessionRepository()


def get_user_session_repository() -> UserSessionRepository:
    return user_session_repo
