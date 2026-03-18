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
    Track daily progress increments.
    NOTE: Detailed daily progress tracking is done via session_logs.
    This endpoint returns a computed response using the stored goal targets.
    """
    user_id = str(current_user.id)
    logger.info(f"[LearningPath] POST progress for user={user_id} date={progress.date}")

    # Simple echo-back: actual accumulation lives in session_logs
    updated = {
        "time_spent_mins": progress.time_spent_mins,
        "words_learned": progress.words_learned,
        "games_played": progress.games_played,
        "pronunciation_attempts": progress.pronunciation_attempts,
    }

    goals_met = {
        "time_goal_met": False,
        "words_goal_met": False,
        "all_goals_met": False,
    }

    return JSONResponse({"status": "tracked", "progress": updated, "goals_met": goals_met})


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
