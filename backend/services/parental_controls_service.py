"""
Parental Controls Service - Business Logic Layer
Handles learning paths, time limits, and usage tracking
"""
from typing import List, Dict, Any, Optional
from repositories.parental_controls_repository import (
    ParentalControlsRepository, 
    get_parental_controls_repository
)
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class ParentalControlsService:
    """Service for parental controls business logic"""
    
    DEFAULT_TIME_LIMIT = 60  # minutes
    DEFAULT_BREAK_REMINDER = 20  # minutes
    
    def __init__(self, repo: ParentalControlsRepository):
        self.repo = repo
    
    async def get_controls(self, child_id: str) -> Dict[str, Any]:
        """Get parental controls for a child, with defaults"""
        controls = await self.repo.get_by_child_id(child_id)
        
        if not controls:
            controls = {
                "child_id": child_id,
                "time_limit_mins": self.DEFAULT_TIME_LIMIT,
                "break_reminder_mins": self.DEFAULT_BREAK_REMINDER,
                "priority_topics": [],
                "today_usage_mins": 0
            }
        
        return controls
    
    async def set_time_limit(self, child_id: str, time_limit_mins: int) -> Dict[str, Any]:
        """
        Set daily time limit.
        Args:
            time_limit_mins: 0 = unlimited, otherwise max minutes per day
        """
        if time_limit_mins < 0:
            return {"success": False, "error": "Time limit must be >= 0"}
        
        result = await self.repo.set_time_limit(child_id, time_limit_mins)
        logger.info(f"Set time limit for {child_id}: {time_limit_mins} mins")
        
        return {
            "success": True,
            "time_limit_mins": time_limit_mins
        }
    
    async def set_learning_path(self, child_id: str, priority_topics: List[str]) -> Dict[str, Any]:
        """
        Set learning path priorities.
        Topics will be prioritized in flashcard/quiz order.
        """
        result = await self.repo.set_learning_path(child_id, priority_topics)
        logger.info(f"Set learning path for {child_id}: {priority_topics}")
        
        return {
            "success": True,
            "priority_topics": priority_topics
        }
    
    async def set_break_reminder(self, child_id: str, break_mins: int) -> Dict[str, Any]:
        """
        Set break reminder interval.
        Child will be reminded to take a break after this many minutes.
        """
        if break_mins < 5:
            return {"success": False, "error": "Break reminder must be >= 5 minutes"}
        
        await self.repo.set_break_reminder(child_id, break_mins)
        
        return {
            "success": True,
            "break_reminder_mins": break_mins
        }
    
    async def check_time_limit(self, child_id: str) -> Dict[str, Any]:
        """
        Check if child has reached their time limit.
        Returns time remaining and whether limit is reached.
        """
        controls = await self.get_controls(child_id)
        
        time_limit = controls.get("time_limit_mins", self.DEFAULT_TIME_LIMIT)
        today_usage = controls.get("today_usage_mins", 0)
        
        # 0 means unlimited
        if time_limit == 0:
            return {
                "limit_reached": False,
                "unlimited": True,
                "today_usage_mins": today_usage
            }
        
        remaining = max(0, time_limit - today_usage)
        
        return {
            "limit_reached": remaining <= 0,
            "unlimited": False,
            "time_limit_mins": time_limit,
            "today_usage_mins": today_usage,
            "remaining_mins": remaining
        }
    
    async def log_session(self, child_id: str, session_mins: int) -> Dict[str, Any]:
        """
        Log a learning session and check if limit reached.
        """
        await self.repo.log_session(child_id, session_mins)
        
        # Check if limit is now reached
        limit_status = await self.check_time_limit(child_id)
        
        return {
            "success": True,
            "session_mins": session_mins,
            **limit_status
        }
    
    async def get_recommended_content(self, child_id: str) -> Dict[str, Any]:
        """
        Get recommended content based on learning path priorities.
        """
        controls = await self.get_controls(child_id)
        priority_topics = controls.get("priority_topics", [])
        
        return {
            "priority_topics": priority_topics,
            "recommendation": priority_topics[0] if priority_topics else None
        }


def get_parental_controls_service() -> ParentalControlsService:
    repo = get_parental_controls_repository()
    return ParentalControlsService(repo)
