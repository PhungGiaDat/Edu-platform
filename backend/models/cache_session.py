# backend/models/cache_session.py
"""
RedisCache Models - PostgreSQL via repositories

MongoDB-backed cache is deprecated. Redis is primary.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum


class CacheType(str, Enum):
    SESSION = "session"
    USER_PROGRESS = "user_progress"
    LEADERBOARD = "leaderboard"
    TRANSLATION = "translation"
    MEDIA_URL = "media_url"
