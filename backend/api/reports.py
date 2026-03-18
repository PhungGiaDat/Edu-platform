# backend/api/reports.py
# Progress reports API for learning analytics

from fastapi import APIRouter, Query, Depends
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta
import logging
from models.user_mongo import UserDocument
from core.security import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])
logger = logging.getLogger(__name__)


@router.get("/user/{user_id}/summary")
async def get_user_progress_summary(
    user_id: str,
    current_user: UserDocument = Depends(get_current_user),
):
    """
    Get comprehensive learning progress summary for a user.
    Returns stats, topic progress, and achievements.
    """
    user_id = str(current_user.id)
    logger.info(f"[Reports API] Getting summary for user: {user_id}")
    
    # TODO: Replace with actual MongoDB aggregation
    # For now return mock data structure
    
    return JSONResponse({
        "user_id": user_id,
        "stats": {
            "total_words_learned": 24,
            "total_xp": 1250,
            "level": 5,
            "streak_days": 3,
            "topics_completed": ["Animals", "Colors"],
            "favorite_topic": "Animals",
            "time_spent_mins": 45,
            "games_played": 12,
            "pronunciation_score_avg": 82
        },
        "topics": [
            {"topic": "Animals", "words_learned": 10, "total_words": 15, "percentage": 67},
            {"topic": "Colors", "words_learned": 8, "total_words": 8, "percentage": 100},
            {"topic": "Family", "words_learned": 4, "total_words": 12, "percentage": 33},
            {"topic": "Nature", "words_learned": 2, "total_words": 10, "percentage": 20}
        ],
        "recent_activity": [
            {"date": "2026-01-22", "words_learned": 5, "games_played": 2},
            {"date": "2026-01-21", "words_learned": 3, "games_played": 1},
            {"date": "2026-01-20", "words_learned": 4, "games_played": 3}
        ],
        "generated_at": datetime.utcnow().isoformat()
    })


@router.get("/user/{user_id}/weekly")
async def get_weekly_report(
    user_id: str,
    current_user: UserDocument = Depends(get_current_user),
):
    """Get weekly learning report."""
    user_id = str(current_user.id)
    logger.info(f"[Reports API] Getting weekly report for user: {user_id}")
    
    return JSONResponse({
        "user_id": user_id,
        "week_start": (datetime.utcnow() - timedelta(days=7)).isoformat(),
        "week_end": datetime.utcnow().isoformat(),
        "summary": {
            "total_sessions": 5,
            "total_time_mins": 45,
            "words_learned": 12,
            "games_completed": 8,
            "avg_pronunciation_score": 78
        },
        "daily_breakdown": [
            {"day": "Mon", "time_mins": 10, "words": 2},
            {"day": "Tue", "time_mins": 8, "words": 3},
            {"day": "Wed", "time_mins": 12, "words": 4},
            {"day": "Thu", "time_mins": 0, "words": 0},
            {"day": "Fri", "time_mins": 15, "words": 3}
        ]
    })


@router.get("/user/{user_id}/achievements")
async def get_achievements(
    user_id: str,
    current_user: UserDocument = Depends(get_current_user),
):
    """Get user achievements and badges."""
    user_id = str(current_user.id)
    logger.info(f"[Reports API] Getting achievements for user: {user_id}")
    
    return JSONResponse({
        "user_id": user_id,
        "badges": [
            {"id": "first_word", "name": "First Word!", "emoji": "🌟", "earned_at": "2026-01-15"},
            {"id": "streak_3", "name": "3 Day Streak", "emoji": "🔥", "earned_at": "2026-01-20"},
            {"id": "perfect_pronun", "name": "Perfect Pronunciation", "emoji": "🎤", "earned_at": "2026-01-21"}
        ],
        "stickers_collected": 15,
        "total_stars": 42
    })
