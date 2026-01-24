# backend/api/learning_path.py
# Learning path preferences and daily goals API

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import logging

router = APIRouter(prefix="/learning-path", tags=["learning-path"])
logger = logging.getLogger(__name__)


# ========== Request/Response Models ==========
class LearningPreferences(BaseModel):
    user_id: str
    priority_topics: List[str]
    daily_time_goal_mins: Optional[int] = 15  # Default 15 minutes
    daily_words_goal: Optional[int] = 5  # Default 5 words
    notifications_enabled: Optional[bool] = True
    reminder_time: Optional[str] = "18:00"  # Default 6 PM


class DailyGoalProgress(BaseModel):
    user_id: str
    date: str  # YYYY-MM-DD
    time_spent_mins: int
    words_learned: int
    games_played: int
    pronunciation_attempts: int


class GoalUpdate(BaseModel):
    user_id: str
    daily_time_goal_mins: Optional[int] = None
    daily_words_goal: Optional[int] = None


# ========== In-memory storage (replace with MongoDB) ==========
# TODO: Move to repository layer with MongoDB
_preferences_store: dict = {}
_daily_progress_store: dict = {}


# ========== Endpoints ==========
@router.get("/{user_id}")
async def get_learning_path(user_id: str):
    """Get user's learning path preferences and current goals."""
    logger.info(f"[LearningPath] Getting preferences for user: {user_id}")
    
    prefs = _preferences_store.get(user_id)
    
    if not prefs:
        # Return default preferences
        prefs = {
            "user_id": user_id,
            "priority_topics": [],
            "daily_time_goal_mins": 15,
            "daily_words_goal": 5,
            "notifications_enabled": True,
            "reminder_time": "18:00"
        }
    
    # Get today's progress
    today = datetime.now().strftime("%Y-%m-%d")
    progress_key = f"{user_id}:{today}"
    today_progress = _daily_progress_store.get(progress_key, {
        "time_spent_mins": 0,
        "words_learned": 0,
        "games_played": 0,
        "pronunciation_attempts": 0
    })
    
    return JSONResponse({
        "preferences": prefs,
        "today_progress": today_progress,
        "goals": {
            "time": {
                "target": prefs.get("daily_time_goal_mins", 15),
                "current": today_progress.get("time_spent_mins", 0),
                "percentage": min(100, int((today_progress.get("time_spent_mins", 0) / max(prefs.get("daily_time_goal_mins", 15), 1)) * 100))
            },
            "words": {
                "target": prefs.get("daily_words_goal", 5),
                "current": today_progress.get("words_learned", 0),
                "percentage": min(100, int((today_progress.get("words_learned", 0) / max(prefs.get("daily_words_goal", 5), 1)) * 100))
            }
        }
    })


@router.post("/preferences")
async def save_learning_preferences(prefs: LearningPreferences):
    """Save user's learning path preferences."""
    logger.info(f"[LearningPath] Saving preferences for user: {prefs.user_id}")
    
    _preferences_store[prefs.user_id] = prefs.dict()
    
    return JSONResponse({
        "status": "saved",
        "message": "Learning path preferences updated!",
        "preferences": prefs.dict()
    })


@router.post("/goals")
async def update_daily_goals(goal_update: GoalUpdate):
    """Update daily learning goals (time and words)."""
    logger.info(f"[LearningPath] Updating goals for user: {goal_update.user_id}")
    
    prefs = _preferences_store.get(goal_update.user_id, {
        "user_id": goal_update.user_id,
        "priority_topics": [],
        "daily_time_goal_mins": 15,
        "daily_words_goal": 5,
        "notifications_enabled": True,
        "reminder_time": "18:00"
    })
    
    if goal_update.daily_time_goal_mins is not None:
        prefs["daily_time_goal_mins"] = goal_update.daily_time_goal_mins
    
    if goal_update.daily_words_goal is not None:
        prefs["daily_words_goal"] = goal_update.daily_words_goal
    
    _preferences_store[goal_update.user_id] = prefs
    
    return JSONResponse({
        "status": "updated",
        "message": "Daily goals updated!",
        "goals": {
            "daily_time_goal_mins": prefs["daily_time_goal_mins"],
            "daily_words_goal": prefs["daily_words_goal"]
        }
    })


@router.post("/progress")
async def track_daily_progress(progress: DailyGoalProgress):
    """Track/update daily learning progress."""
    logger.info(f"[LearningPath] Tracking progress for user: {progress.user_id} on {progress.date}")
    
    progress_key = f"{progress.user_id}:{progress.date}"
    
    existing = _daily_progress_store.get(progress_key, {
        "time_spent_mins": 0,
        "words_learned": 0,
        "games_played": 0,
        "pronunciation_attempts": 0
    })
    
    # Accumulate progress
    updated = {
        "time_spent_mins": existing["time_spent_mins"] + progress.time_spent_mins,
        "words_learned": existing["words_learned"] + progress.words_learned,
        "games_played": existing["games_played"] + progress.games_played,
        "pronunciation_attempts": existing["pronunciation_attempts"] + progress.pronunciation_attempts
    }
    
    _daily_progress_store[progress_key] = updated
    
    # Check if goals are met
    prefs = _preferences_store.get(progress.user_id, {})
    time_goal = prefs.get("daily_time_goal_mins", 15)
    words_goal = prefs.get("daily_words_goal", 5)
    
    goals_met = {
        "time_goal_met": updated["time_spent_mins"] >= time_goal,
        "words_goal_met": updated["words_learned"] >= words_goal,
        "all_goals_met": updated["time_spent_mins"] >= time_goal and updated["words_learned"] >= words_goal
    }
    
    return JSONResponse({
        "status": "tracked",
        "progress": updated,
        "goals_met": goals_met
    })


@router.get("/{user_id}/today")
async def get_today_progress(user_id: str):
    """Get today's learning progress towards goals."""
    logger.info(f"[LearningPath] Getting today's progress for user: {user_id}")
    
    today = datetime.now().strftime("%Y-%m-%d")
    progress_key = f"{user_id}:{today}"
    
    progress = _daily_progress_store.get(progress_key, {
        "time_spent_mins": 0,
        "words_learned": 0,
        "games_played": 0,
        "pronunciation_attempts": 0
    })
    
    prefs = _preferences_store.get(user_id, {})
    time_goal = prefs.get("daily_time_goal_mins", 15)
    words_goal = prefs.get("daily_words_goal", 5)
    
    return JSONResponse({
        "date": today,
        "progress": progress,
        "goals": {
            "time": {
                "target": time_goal,
                "current": progress["time_spent_mins"],
                "percentage": min(100, int((progress["time_spent_mins"] / max(time_goal, 1)) * 100)),
                "remaining": max(0, time_goal - progress["time_spent_mins"])
            },
            "words": {
                "target": words_goal,
                "current": progress["words_learned"],
                "percentage": min(100, int((progress["words_learned"] / max(words_goal, 1)) * 100)),
                "remaining": max(0, words_goal - progress["words_learned"])
            }
        },
        "is_complete": progress["time_spent_mins"] >= time_goal and progress["words_learned"] >= words_goal
    })
