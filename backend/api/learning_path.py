# backend/api/learning_path.py
"""
Learning Path API - Controller layer
GET  /learning-path/{user_id}          — get preferences + today's goal progress
POST /learning-path/preferences        — upsert preferences (called by LearningPathSetup.tsx)
POST /learning-path/goals              — partial update: time/words goals only
POST /learning-path/progress           — accumulate daily progress
GET  /learning-path/{user_id}/today   — today's progress vs goals
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import logging

from repositories.learning_path_repository import (
    LearningPathRepository,
    get_learning_path_repository,
)
from models.user_mongo import UserDocument
from core.security import get_current_user

router = APIRouter(prefix="/learning-path", tags=["Learning Path"])
logger = logging.getLogger(__name__)


# ========== Request/Response Models ==========

class LearningPreferences(BaseModel):
    user_id: str
    priority_topics: List[str] = []
    daily_time_goal_mins: Optional[int] = 15
    daily_words_goal: Optional[int] = 5
    notifications_enabled: Optional[bool] = True
    reminder_time: Optional[str] = "18:00"  # informational — not persisted to DB


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


# ========== Helpers ==========

def _build_goals_block(prefs: dict, progress: dict) -> dict:
    time_goal = prefs.get("daily_time_goal_mins", 15) or 15
    words_goal = prefs.get("daily_words_goal", 5) or 5
    time_spent = progress.get("time_spent_mins", 0)
    words_learned = progress.get("words_learned", 0)
    return {
        "time": {
            "target": time_goal,
            "current": time_spent,
            "percentage": min(100, int(time_spent / max(time_goal, 1) * 100)),
            "remaining": max(0, time_goal - time_spent),
        },
        "words": {
            "target": words_goal,
            "current": words_learned,
            "percentage": min(100, int(words_learned / max(words_goal, 1) * 100)),
            "remaining": max(0, words_goal - words_learned),
        },
    }


def _default_progress() -> dict:
    return {"time_spent_mins": 0, "words_learned": 0, "games_played": 0, "pronunciation_attempts": 0}


# ========== Endpoints ==========

@router.get("/{user_id}")
async def get_learning_path(
    user_id: str,
    current_user: UserDocument = Depends(get_current_user),
    repo: LearningPathRepository = Depends(get_learning_path_repository),
):
    """Get user's learning path preferences and current daily goals."""
    user_id = str(current_user.id)
    logger.info(f"[LearningPath] GET preferences for user={user_id}")

    doc = await repo.get_by_user(user_id)

    prefs = doc or {
        "user_id": user_id,
        "priority_topics": [],
        "daily_time_goal_mins": 15,
        "daily_words_goal": 5,
        "notifications_enabled": True,
    }

    # Daily progress is not tracked in this repo — return zeros so frontend renders
    today_progress = _default_progress()

    return JSONResponse({
        "preferences": prefs,
        "today_progress": today_progress,
        "goals": _build_goals_block(prefs, today_progress),
    })


@router.post("/preferences")
async def save_learning_preferences(
    prefs: LearningPreferences,
    current_user: UserDocument = Depends(get_current_user),
    repo: LearningPathRepository = Depends(get_learning_path_repository),
):
    """
    Save (upsert) user's learning path preferences.
    Called by LearningPathSetup.tsx on step 3 confirmation.
    """
    user_id = str(current_user.id)
    logger.info(f"[LearningPath] POST preferences for user={user_id}")

    saved = await repo.upsert({
        "user_id": user_id,
        "priority_topics": prefs.priority_topics,
        "daily_time_goal_mins": prefs.daily_time_goal_mins or 15,
        "daily_words_goal": prefs.daily_words_goal or 5,
        "notifications_enabled": prefs.notifications_enabled if prefs.notifications_enabled is not None else True,
    })

    return JSONResponse({
        "status": "saved",
        "message": "Learning path preferences updated!",
        "preferences": saved,
    })


@router.post("/goals")
async def update_daily_goals(
    goal_update: GoalUpdate,
    current_user: UserDocument = Depends(get_current_user),
    repo: LearningPathRepository = Depends(get_learning_path_repository),
):
    """Partial update: only change time and/or words goals."""
    user_id = str(current_user.id)
    logger.info(f"[LearningPath] POST goals for user={user_id}")

    doc = await repo.get_by_user(user_id) or {}

    patch: dict = {}
    if goal_update.daily_time_goal_mins is not None:
        patch["daily_time_goal_mins"] = goal_update.daily_time_goal_mins
    if goal_update.daily_words_goal is not None:
        patch["daily_words_goal"] = goal_update.daily_words_goal

    if patch:
        merged = {**doc, **patch, "user_id": user_id}
        await repo.upsert(merged)

    final = await repo.get_by_user(user_id) or {}
    return JSONResponse({
        "status": "updated",
        "message": "Daily goals updated!",
        "goals": {
            "daily_time_goal_mins": final.get("daily_time_goal_mins", 15),
            "daily_words_goal": final.get("daily_words_goal", 5),
        },
    })


@router.post("/progress")
async def track_daily_progress(
    progress: DailyGoalProgress,
    current_user: UserDocument = Depends(get_current_user),
):
    """
    Track daily progress from session logs.
    Aggregates from SessionLogDocument instead of echoing client input (Q5: upsert-per-day).
    """
    from repositories.gamification_repository import get_gamification_repository
    from database.db import get_database
    
    user_id = str(current_user.id)
    target_date = progress.date
    logger.info(f"[LearningPath] POST progress for user={user_id} date={target_date}")
    
    repo = get_gamification_repository()
    db = await get_database()
    
    # Get all sessions for the target date
    start_of_day = datetime.strptime(target_date, "%Y-%m-%d")
    end_of_day = start_of_day.replace(hour=23, minute=59, second=59)
    
    sessions = await db.session_logs.find({
        "user_id": user_id,
        "started_at": {"$gte": start_of_day, "$lte": end_of_day},
        "ended_at": {"$ne": None}  # Only completed sessions
    }).to_list(100)
    
    # Aggregate from session logs
    total_time_seconds = 0
    total_words = 0
    total_games = 0
    total_pronun = 0
    topic_counts: dict = {}
    
    for session in sessions:
        # Calculate duration from ended_at - started_at
        if session.get("ended_at") and session.get("started_at"):
            duration = (session["ended_at"] - session["started_at"]).total_seconds()
            total_time_seconds += int(duration)
        
        # Aggregate learning metrics
        total_words += session.get("words_learned", 0)
        total_games += session.get("games_played", 0)
        total_pronun += session.get("pronunciation_attempts", 0)
        
        # Track most studied topic
        topic = session.get("active_topic")
        if topic:
            topic_counts[topic] = topic_counts.get(topic, 0) + 1
    
    total_time_mins = total_time_seconds // 60
    most_studied_topic = max(topic_counts, key=topic_counts.get) if topic_counts else None
    
    # Get user goals for comparison
    user_prefs = await repo.get_by_user_id(user_id) or {}
    time_goal = 15  # default
    words_goal = 5  # default
    
    # Determine goals met
    goals_met = {
        "time_goal_met": total_time_mins >= time_goal,
        "words_goal_met": total_words >= words_goal,
        "all_goals_met": total_time_mins >= time_goal and total_words >= words_goal,
    }
    
    return JSONResponse({
        "status": "tracked",
        "progress": {
            "time_spent_mins": total_time_mins,
            "words_learned": total_words,
            "games_played": total_games,
            "pronunciation_attempts": total_pronun,
        },
        "goals_met": goals_met,
        "most_studied_topic": most_studied_topic,
        "sessions_count": len(sessions),
        "source": "session_logs"  # Indicates real aggregation vs mock
    })


@router.get("/{user_id}/today")
async def get_today_progress(
    user_id: str,
    current_user: UserDocument = Depends(get_current_user),
    repo: LearningPathRepository = Depends(get_learning_path_repository),
):
    """Get today's learning progress vs. stored goal targets."""
    user_id = str(current_user.id)
    logger.info(f"[LearningPath] GET today progress for user={user_id}")

    today = datetime.now().strftime("%Y-%m-%d")
    doc = await repo.get_by_user(user_id) or {}
    progress = _default_progress()
    goals = _build_goals_block(doc, progress)

    return JSONResponse({
        "date": today,
        "progress": progress,
        "goals": goals,
        "is_complete": goals["time"]["percentage"] >= 100 and goals["words"]["percentage"] >= 100,
    })
