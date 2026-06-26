# backend/api/reports.py
# Progress reports API for learning analytics

from fastapi import APIRouter, Query, Depends
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta
import logging
from models.user_mongo import UserDocument, LearningProgressDocument
from models.session_log import SessionLogDocument
from core.security import get_current_user
from repositories.gamification_repository import get_gamification_repository
from database.db import get_database

router = APIRouter(prefix="/reports", tags=["reports"])
logger = logging.getLogger(__name__)


@router.get("/user/{user_id}/summary")
async def get_user_progress_summary(
    user_id: str,
    days: int = Query(7, ge=1, le=30, description="Number of days to include"),
    current_user: UserDocument = Depends(get_current_user),
):
    """
    Get comprehensive learning progress summary for a user.
    Aggregates from SessionLogDocument, LearningProgressDocument, and user_points.
    Uses real MongoDB queries instead of mock data.
    """
    user_id = str(current_user.id)
    logger.info(f"[Reports API] Getting real summary for user: {user_id}, days: {days}")
    
    repo = get_gamification_repository()
    db = await get_database()
    
    # 1. Get user gamification stats from user_points
    user_stats = await repo.get_by_user_id(user_id) or {}
    
    # 2. Aggregate words_learned from LearningProgressDocument (Q2: mastery_level >= 3)
    # Count words with mastery_level >= 3
    words_pipeline = [
        {"$match": {"user_id": user_id, "mastery_level": {"$gte": 3}}},
        {"$count": "total_words_learned"}
    ]
    words_result = await db.learning_progress.aggregate(words_pipeline).to_list(1)
    total_words_learned = words_result[0]["total_words_learned"] if words_result else 0
    
    # 3. Get topic breakdown (words per topic via flashcard_qr_id prefix)
    topic_pipeline = [
        {"$match": {"user_id": user_id, "mastery_level": {"$gte": 3}}},
        {"$group": {
            "_id": {"$substr": ["$flashcard_qr_id", 0, {"$indexOfBytes": ["$flashcard_qr_id", "-"]}]},
            "words_learned": {"$sum": 1}
        }},
        {"$sort": {"words_learned": -1}}
    ]
    topic_results = await db.learning_progress.aggregate(topic_pipeline).to_list(20)
    
    # 4. Find favorite topic (Q3: most mastered words, fallback to session time)
    favorite_topic = None
    if topic_results:
        favorite_topic = topic_results[0]["_id"]
    
    # 5. Get daily stats from session logs (uses upsert-per-day pattern - Q5)
    daily_stats = await repo.get_daily_stats_v2(user_id, days)
    
    # Calculate totals from daily stats
    total_time_mins = sum(s.get("time_mins", 0) for s in daily_stats)
    total_games = sum(s.get("games_played", 0) for s in daily_stats)
    
    # 6. Get pronunciation average from quiz_attempts
    pronun_pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": None, "avg_score": {"$avg": "$score"}, "count": {"$sum": 1}}},
        {"$limit": 1}
    ]
    pronun_result = await db.quiz_attempts.aggregate(pronun_pipeline).to_list(1)
    pronunciation_score_avg = round(pronun_result[0]["avg_score"]) if pronun_result and pronun_result[0]["count"] > 0 else 0
    
    # 7. Get recent activity from session logs
    start_date = datetime.utcnow() - timedelta(days=days)
    recent_sessions = await db.session_logs.find({
        "user_id": user_id,
        "started_at": {"$gte": start_date}
    }).sort("started_at", -1).limit(10).to_list(10)
    
    recent_activity = [
        {
            "date": s["started_at"].strftime("%Y-%m-%d"),
            "words_learned": s.get("words_learned", 0),
            "games_played": s.get("games_played", 0),
        }
        for s in recent_sessions if s.get("ended_at")
    ]
    
    # 8. Build topic list with percentages (estimated total_words per topic)
    topics = []
    for t in topic_results[:10]:
        topic_name = t["_id"] or "General"
        # Estimate total words as 2x mastered (rough estimate)
        estimated_total = max(t["words_learned"], t["words_learned"] * 2)
        percentage = round((t["words_learned"] / estimated_total) * 100) if estimated_total > 0 else 0
        topics.append({
            "topic": topic_name,
            "words_learned": t["words_learned"],
            "total_words": estimated_total,
            "percentage": percentage
        })
    
    # If no topics found, add placeholder
    if not topics:
        topics = [
            {"topic": "Start Learning", "words_learned": 0, "total_words": 10, "percentage": 0}
        ]
    
    return JSONResponse({
        "user_id": user_id,
        "stats": {
            "total_words_learned": total_words_learned,
            "total_xp": user_stats.get("total_points", 0),
            "level": user_stats.get("level", 1),
            "streak_days": user_stats.get("streak_days", 0),
            "topics_completed": [t["topic"] for t in topics if t["percentage"] >= 100],
            "favorite_topic": favorite_topic or (topics[0]["topic"] if topics else "Start Learning"),
            "time_spent_mins": total_time_mins,
            "games_played": total_games,
            "pronunciation_score_avg": pronunciation_score_avg
        },
        "topics": topics,
        "recent_activity": recent_activity[-days:] if recent_activity else [],
        "generated_at": datetime.utcnow().isoformat()
    })


@router.get("/user/{user_id}/weekly")
async def get_weekly_report(
    user_id: str,
    current_user: UserDocument = Depends(get_current_user),
):
    """Get weekly learning report with real aggregated data."""
    user_id = str(current_user.id)
    logger.info(f"[Reports API] Getting weekly report for user: {user_id}")
    
    repo = get_gamification_repository()
    db = await get_database()
    
    # Get last 7 days of session data
    daily_stats = await repo.get_daily_stats_v2(user_id, 7)
    
    # Calculate summary
    total_sessions = sum(s.get("sessions_count", 0) for s in daily_stats)
    total_time_mins = sum(s.get("time_mins", 0) for s in daily_stats)
    words_learned = sum(s.get("words_learned", 0) for s in daily_stats)
    games_completed = sum(s.get("games_played", 0) for s in daily_stats)
    
    # Build daily breakdown with day names
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    daily_breakdown = []
    
    for i in range(7):
        target_date = (datetime.utcnow() - timedelta(days=6-i)).strftime("%Y-%m-%d")
        day_stat = next((s for s in daily_stats if s.get("date") == target_date), None)
        
        day_index = (datetime.utcnow() - timedelta(days=6-i)).weekday()
        daily_breakdown.append({
            "day": day_names[day_index],
            "date": target_date,
            "time_mins": day_stat.get("time_mins", 0) if day_stat else 0,
            "words": day_stat.get("words_learned", 0) if day_stat else 0,
        })
    
    # Get average pronunciation score
    pronun_pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": None, "avg_score": {"$avg": "$score"}}},
        {"$limit": 1}
    ]
    pronun_result = await db.quiz_attempts.aggregate(pronun_pipeline).to_list(1)
    avg_pronun_score = round(pronun_result[0]["avg_score"]) if pronun_result else 0
    
    return JSONResponse({
        "user_id": user_id,
        "week_start": (datetime.utcnow() - timedelta(days=7)).isoformat(),
        "week_end": datetime.utcnow().isoformat(),
        "summary": {
            "total_sessions": total_sessions,
            "total_time_mins": total_time_mins,
            "words_learned": words_learned,
            "games_completed": games_completed,
            "avg_pronunciation_score": avg_pronun_score
        },
        "daily_breakdown": daily_breakdown
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
