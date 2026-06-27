# backend/models/cache_session.py
"""
RedisCache Document - Session data cache for fast access
Note: This is a MongoDB-backed cache for fallback/audit when Redis is unavailable.
For primary caching, use Redis directly. This collection provides durability.
"""
from beanie import Document, Indexed
from pymongo import IndexModel
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


class RedisCache(Document):
    """
    RedisCache Document - MongoDB collection: redis_cache
    
    MongoDB-backed cache for session data and audit trail.
    TTL: Auto-delete based on cache type (1 hour to 7 days).
    """
    cache_key: Indexed(str, unique=True)
    cache_type: CacheType
    
    # Cache data (JSON serialized)
    value: Dict[str, Any]
    
    # Serialization metadata
    serialization_version: int = 1
    
    # TTL configuration
    ttl_seconds: int = 3600  # Default 1 hour
    expires_at: datetime
    
    # Cache metadata
    hit_count: int = 0
    last_hit_at: Optional[datetime] = None
    
    # Origin tracking
    created_by: Optional[str] = None  # user_id or "system"
    source: str = "redis"  # redis, mongodb_fallback, computed
    
    # Invalidation
    is_invalidated: bool = False
    invalidated_at: Optional[datetime] = None
    invalidation_reason: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    class Settings:
        name = "redis_cache"
        indexes: list = [
            # Unique identifier
            [("cache_key", 1)],
            # Cache type queries
            [("cache_type", 1)],
            # Compound indexes for cache management
            [("cache_type", 1), ("expires_at", 1)],  # Type + expiry queries
            [("cache_type", 1), ("created_at", 1)],  # Cache warming queries
            # TTL index for auto-expiration (expireAfterSeconds=0 means delete at expiration time)
            IndexModel(
                [("expires_at", 1)],
                expireAfterSeconds=0,
                name="cache_ttl",
            ),
        ]
    
    @classmethod
    def create_cache_entry(
        cls,
        cache_key: str,
        cache_type: CacheType,
        value: Dict[str, Any],
        ttl_seconds: int = 3600
    ) -> "RedisCache":
        """Factory method to create cache entries with TTL"""
        from datetime import timedelta
        expires_at = datetime.utcnow() + timedelta(seconds=ttl_seconds)
        
        return cls(
            cache_key=cache_key,
            cache_type=cache_type,
            value=value,
            ttl_seconds=ttl_seconds,
            expires_at=expires_at
        )
