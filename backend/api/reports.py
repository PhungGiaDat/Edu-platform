# backend/api/reports.py
# Progress reports API for learning analytics

from fastapi import APIRouter, Query, Depends
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta
import logging

from repositories.postgres_user_repository import PostgresUser
from repositories.gamification_repository import get_gamification_repository
from repositories.reports_repository import ReportsRepository, get_reports_repository
from core.security import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])
logger = logging.getLogger(__name__)


def get_reports_repo() -> ReportsRepository:
    return get_reports_repository()


@router.get("/user/{user_id}/summary")
async def get_user_progress_summary(
    user_id: str,
    days: int = Query(7, ge=1, le=30, description="Number of days to include"),
    current_user: PostgresUser = Depends(get_current_user),
    reports_repo: ReportsRepository = Depends(get_reports_repo),
):
    """
    Get comprehensive learning progress summary for a user.
    Aggregates from PostgreSQL: word_mastery, session_logs, quiz_attempts, user_gamification.
    """
    user_id = current_user.id
    logger.info(f"[Reports API] Getting real summary for user: {user_id}, days: {days}")

    gam_repo = get_gamification_repository()
    user_stats = await gam_repo.get_by_user_id(user_id) or {}

    total_words_learned = await reports_repo.get_words_learned_count(user_id)
    topic_rows = await reports_repo.get_topic_breakdown(user_id)
    daily_stats = await gam_repo.get_daily_stats_v2(user_id, days)
    total_time_mins = sum(s.get("time_mins", 0) for s in daily_stats)
    total_games = sum(s.get("games_played", 0) for s in daily_stats)
    pronunciation_score_avg = await reports_repo.get_avg_pronunciation_score(user_id)
    recent_rows = await reports_repo.get_recent_sessions(user_id, days)

    recent_activity = [
        {
            "date": r["started_at"].strftime("%Y-%m-%d"),
            "words_learned": r["words_learned"] or 0,
            "games_played": r["games_played"] or 0,
        }
        for r in recent_rows
    ]

    topics = []
    for row in topic_rows:
        topic_name = row["course_id"] or "General"
        words = row["words_count"]
        estimated_total = words * 2
        percentage = round((words / estimated_total) * 100) if estimated_total > 0 else 0
        topics.append({
            "topic": topic_name,
            "words_learned": words,
            "total_words": estimated_total,
            "percentage": percentage,
        })

    if not topics:
        topics = [{"topic": "Start Learning", "words_learned": 0, "total_words": 10, "percentage": 0}]

    favorite_topic = topic_rows[0]["course_id"] if topic_rows else topics[0]["topic"]

    return JSONResponse({
        "user_id": user_id,
        "stats": {
            "total_words_learned": total_words_learned,
            "total_xp": user_stats.get("total_points", 0),
            "level": user_stats.get("level", 1),
            "streak_days": user_stats.get("streak_days", 0),
            "topics_completed": [t["topic"] for t in topics if t["percentage"] >= 100],
            "favorite_topic": favorite_topic,
            "time_spent_mins": total_time_mins,
            "games_played": total_games,
            "pronunciation_score_avg": pronunciation_score_avg,
        },
        "topics": topics,
        "recent_activity": recent_activity,
        "generated_at": datetime.utcnow().isoformat(),
    })


@router.get("/user/{user_id}/weekly")
async def get_weekly_report(
    user_id: str,
    current_user: PostgresUser = Depends(get_current_user),
    reports_repo: ReportsRepository = Depends(get_reports_repo),
):
    """Get weekly learning report with real aggregated data."""
    user_id = current_user.id
    logger.info(f"[Reports API] Getting weekly report for user: {user_id}")

    gam_repo = get_gamification_repository()

    # Last 7 days daily stats
    daily_stats = await gam_repo.get_daily_stats_v2(user_id, 7)

    total_sessions = sum(s.get("sessions_count", 0) for s in daily_stats)
    total_time_mins = sum(s.get("time_mins", 0) for s in daily_stats)
    words_learned = sum(s.get("words_learned", 0) for s in daily_stats)
    games_completed = sum(s.get("games_played", 0) for s in daily_stats)

    # Daily breakdown with day names
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    now = datetime.utcnow()
    daily_breakdown = []
    for i in range(7):
        target_date = (now - timedelta(days=6 - i)).strftime("%Y-%m-%d")
        day_stat = next((s for s in daily_stats if s.get("date") == target_date), None)
        day_index = (now - timedelta(days=6 - i)).weekday()
        daily_breakdown.append({
            "day": day_names[day_index],
            "date": target_date,
            "time_mins": day_stat.get("time_mins", 0) if day_stat else 0,
            "words": day_stat.get("words_learned", 0) if day_stat else 0,
        })

    avg_pronun_score = await reports_repo.get_avg_pronunciation_score(user_id)

    return JSONResponse({
        "user_id": user_id,
        "week_start": (now - timedelta(days=7)).isoformat(),
        "week_end": now.isoformat(),
        "summary": {
            "total_sessions": total_sessions,
            "total_time_mins": total_time_mins,
            "words_learned": words_learned,
            "games_completed": games_completed,
            "avg_pronunciation_score": avg_pronun_score,
        },
        "daily_breakdown": daily_breakdown,
    })


@router.get("/user/{user_id}/achievements")
async def get_achievements(
    user_id: str,
    current_user: PostgresUser = Depends(get_current_user),
):
    """Get user achievements and badges from PostgreSQL."""
    user_id = current_user.id
    logger.info(f"[Reports API] Getting achievements for user: {user_id}")

    gam_repo = get_gamification_repository()
    user_stats = await gam_repo.get_by_user_id(user_id) or {}

    badges_raw = user_stats.get("badges", [])
    stickers = await gam_repo.get_stickers(user_id)

    badges = [
        {"id": b, "name": b.replace("_", " ").title(), "emoji": "🏅", "earned_at": datetime.utcnow().isoformat()}
        for b in badges_raw
    ]

    return JSONResponse({
        "user_id": user_id,
        "badges": badges,
        "stickers_collected": len(stickers),
        "total_stars": user_stats.get("total_points", 0),
    })
