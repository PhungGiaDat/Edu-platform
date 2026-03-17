from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from bson import ObjectId
from datetime import datetime


# ========== STICKER SCHEMA ==========

class StickerEarned(BaseModel):
    """A sticker earned by a user — embedded in user_points documents."""
    sticker_id: str
    name: str
    emoji: str
    rarity: str  # common | rare | epic | legendary
    earned_at: datetime = Field(default_factory=datetime.utcnow)


# ========== GAMIFICATION SCHEMAS ==========

class BadgeSchema(BaseModel):
    """Badge definition schema"""
    id: str = Field(default_factory=lambda: str(ObjectId()))
    name: str
    emoji: str = ""
    description: str
    icon_url: str = ""
    criteria: str  # e.g., "complete_5_lessons"
    xp_reward: int = 0


class DailyProgressSchema(BaseModel):
    """Daily learning progress"""
    date: str  # YYYY-MM-DD
    xp_earned: int = 0
    flashcards_viewed: int = 0
    quizzes_completed: int = 0
    games_played: int = 0


class UserPointsSchema(BaseModel):
    """User gamification stats"""
    user_id: str
    total_points: int = 0
    level: int = 1
    xp_to_next_level: int = 100
    stars: int = 0
    badges: List[str] = []
    streak_days: int = 0
    longest_streak: int = 0
    last_activity_date: Optional[datetime] = None
    daily_progress: List[DailyProgressSchema] = []

    class Config:
        json_encoders = {ObjectId: str}
        populate_by_name = True


class LeaderboardEntrySchema(BaseModel):
    """Leaderboard entry"""
    user_id: str
    username: str
    avatar_url: Optional[str] = None
    points: int
    level: int = 1
    rank: int


# ========== CONSTANTS ==========

BADGE_DEFINITIONS: Dict[str, dict] = {
    # Existing badges
    "first_scan":        {"name": "First Scan",        "emoji": "🔍", "description": "Scanned your first flashcard!",   "xp_reward": 50},
    "quiz_starter":      {"name": "Quiz Starter",      "emoji": "📝", "description": "Completed your first quiz!",      "xp_reward": 50},
    "quiz_master":       {"name": "Quiz Master",       "emoji": "🏆", "description": "Got 100% on a quiz!",             "xp_reward": 200},
    "streak_3":          {"name": "3 Day Streak",      "emoji": "🔥", "description": "Learned for 3 days in a row!",    "xp_reward": 100},
    "streak_7":          {"name": "Week Warrior",      "emoji": "🌟", "description": "7 day learning streak!",          "xp_reward": 300},
    "combo_hunter":      {"name": "Combo Hunter",      "emoji": "🎯", "description": "Found a flashcard combo!",        "xp_reward": 75},
    "pronunciation_pro": {"name": "Pronunciation Pro", "emoji": "🎤", "description": "Perfect pronunciation!",          "xp_reward": 100},
    "level_5":           {"name": "Rising Star",       "emoji": "⭐", "description": "Reached Level 5!",                "xp_reward": 150},
    "level_10":          {"name": "Super Learner",     "emoji": "🚀", "description": "Reached Level 10!",               "xp_reward": 300},
    # New badges for pronunciation, topic mastery, and time management
    "pronunciation_pro_5": {"name": "Pronunciation Star", "emoji": "🌟", "description": "Made 5 pronunciation attempts!",    "xp_reward": 75},
    "topic_master":        {"name": "Topic Master",       "emoji": "📖", "description": "Mastered all words in a topic!",    "xp_reward": 150},
    "time_keeper":         {"name": "Time Keeper",        "emoji": "⏰", "description": "Took a break on time — well done!", "xp_reward": 50},
}

XP_REWARDS: Dict[str, int] = {
    # Existing actions
    "flashcard_viewed":         5,
    "flashcard_3d_interaction": 10,
    "quiz_question_correct":    20,
    "quiz_completed":           50,
    "game_completed":           30,
    "pronunciation_correct":    25,
    "combo_discovered":         40,
    "daily_login":              10,
    # New actions for pronunciation, lessons, topics, and sessions
    "pronunciation_attempt":    15,   # Any attempt (encourages trying)
    "pronunciation_perfect":    35,   # Score >= 90 (bonus on top of attempt XP)
    "lesson_completed":         60,   # Completing a full topic lesson
    "topic_mastered":          100,   # mastery_level=5 for every word in a topic
    "session_checkin":          10,   # Logging a session start (daily engagement)
}


def calculate_next_level_xp(level: int) -> int:
    """Exponential XP curve for levels"""
    base_xp = 100
    return int(base_xp * (1.5 ** (level - 1)))
