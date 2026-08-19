"""
Learning Path API
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date
import logging

from repositories.learning_path_repository import (
    LearningPathRepository,
    DailyProgressRepository,
    get_learning_path_repository,
)
from repositories.postgres_user_repository import PostgresUser
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
    reminder_time: Optional[str] = "18:00"


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


async def _today_progress(user_id: str, progress_repo: DailyProgressRepository) -> dict:
    return await progress_repo.get_today(user_id)


# ========== Endpoints ==========

def get_daily_progress_repo() -> DailyProgressRepository:
    return DailyProgressRepository()


@router.get("/{user_id}")
async def get_learning_path(
    user_id: str,
    current_user: PostgresUser = Depends(get_current_user),
    repo: LearningPathRepository = Depends(get_learning_path_repository),
    progress_repo: DailyProgressRepository = Depends(get_daily_progress_repo),
):
    """Get user's learning path preferences and current daily goals."""
    user_id = current_user.id
    logger.info(f"[LearningPath] GET preferences for user={user_id}")

    doc = await repo.get_by_user(user_id)

    prefs = doc or {
        "user_id": user_id,
        "priority_topics": [],
        "daily_time_goal_mins": 15,
        "daily_words_goal": 5,
        "notifications_enabled": True,
    }

    today_progress = await progress_repo.get_today(user_id)

    return JSONResponse({
        "preferences": prefs,
        "today_progress": today_progress,
        "goals": _build_goals_block(prefs, today_progress),
    })


@router.post("/preferences")
async def save_learning_preferences(
    prefs: LearningPreferences,
    current_user: PostgresUser = Depends(get_current_user),
    repo: LearningPathRepository = Depends(get_learning_path_repository),
):
    """Save (upsert) user's learning path preferences."""
    user_id = current_user.id
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
    current_user: PostgresUser = Depends(get_current_user),
    repo: LearningPathRepository = Depends(get_learning_path_repository),
):
    """Partial update: only change time and/or words goals."""
    user_id = current_user.id
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
    current_user: PostgresUser = Depends(get_current_user),
    progress_repo: DailyProgressRepository = Depends(get_daily_progress_repo),
):
    """Track daily progress — aggregates from PostgreSQL daily_learning_progress."""
    user_id = current_user.id
    try:
        target_date = date.fromisoformat(progress.date)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="date must use YYYY-MM-DD") from exc
    logger.info(f"[LearningPath] POST progress for user={user_id} date={target_date}")

    row = await progress_repo.upsert(
        user_id, target_date,
        progress.time_spent_mins, progress.words_learned,
        progress.games_played, progress.pronunciation_attempts,
    )
    total_time_mins = row["time_spent_mins"]
    total_words = row["words_learned"]
    total_games = row["games_played"]
    total_pronun = row["pronunciation_attempts"]

    prefs = await get_learning_path_repository().get_by_user(user_id) or {}
    time_goal = prefs.get("daily_time_goal_mins", 15)
    words_goal = prefs.get("daily_words_goal", 5)

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
        "most_studied_topic": None,
        "sessions_count": 0,
        "source": "daily_learning_progress",
    })


@router.get("/{user_id}/today")
async def get_today_progress(
    user_id: str,
    current_user: PostgresUser = Depends(get_current_user),
    repo: LearningPathRepository = Depends(get_learning_path_repository),
    progress_repo: DailyProgressRepository = Depends(get_daily_progress_repo),
):
    """Get today's learning progress vs. stored goal targets."""
    user_id = current_user.id
    logger.info(f"[LearningPath] GET today progress for user={user_id}")

    today = datetime.now().strftime("%Y-%m-%d")
    doc = await repo.get_by_user(user_id) or {}
    progress = await progress_repo.get_today(user_id)
    goals = _build_goals_block(doc, progress)

    return JSONResponse({
        "date": today,
        "progress": progress,
        "goals": goals,
        "is_complete": goals["time"]["percentage"] >= 100 and goals["words"]["percentage"] >= 100,
    })
