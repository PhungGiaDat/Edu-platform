# backend/services/cache_service.py
"""
Cache Service - Redis-backed Cache Layer
Provides caching for frequently accessed data with TTL support.
"""
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Callable, Dict, List, Optional, TypeVar, Union
from functools import wraps

from settings import settings
from services.redis_service import redis_service

logger = logging.getLogger(__name__)

T = TypeVar('T')


class CacheKeys:
    """Cache key patterns."""
    
    # Pet catalog
    PETS_ALL = "cache:pets:all"
    PETS_ACTIVE = "cache:pets:active"
    
    # Course data
    COURSE = "cache:course:{course_id}"
    COURSES_ALL = "cache:courses:all"
    COURSES_BY_CATEGORY = "cache:courses:category:{category}"
    
    # User data
    USER_STATS = "cache:user_stats:{user_id}"
    USER_PROFILE = "cache:user_profile:{user_id}"
    USER_PROGRESS = "cache:user_progress:{user_id}"
    
    # Leaderboards
    LEADERBOARD_WEEKLY = "cache:leaderboard:weekly"
    LEADERBOARD_ALL_TIME = "cache:leaderboard:alltime"
    LEADERBOARD_FRIENDS = "cache:leaderboard:friends:{user_id}"
    
    # Gamification
    DAILY_CHALLENGES = "cache:daily_challenges"
    ACHIEVEMENTS = "cache:achievements"
    
    # Combo/AR data
    COMBOS = "cache:combos"
    AR_OBJECTS = "cache:ar_objects"
    
    @classmethod
    def course(cls, course_id: str) -> str:
        return cls.COURSE.format(course_id=course_id)
    
    @classmethod
    def courses_by_category(cls, category: str) -> str:
        return cls.COURSES_BY_CATEGORY.format(category=category)
    
    @classmethod
    def user_stats(cls, user_id: str) -> str:
        return cls.USER_STATS.format(user_id=user_id)
    
    @classmethod
    def user_profile(cls, user_id: str) -> str:
        return cls.USER_PROFILE.format(user_id=user_id)
    
    @classmethod
    def user_progress(cls, user_id: str) -> str:
        return cls.USER_PROGRESS.format(user_id=user_id)
    
    @classmethod
    def leaderboard_friends(cls, user_id: str) -> str:
        return cls.LEADERBOARD_FRIENDS.format(user_id=user_id)


class CacheService:
    """
    Redis-backed cache service.
    
    Features:
    - TTL-based expiration
    - Cache invalidation patterns
    - Integration with existing SimpleCache fallback
    - Cache-aside pattern support
    """
    
    # Default TTLs from settings
    TTL_PETS = settings.CACHE_PETS_TTL_SECONDS
    TTL_COURSE = settings.CACHE_COURSE_TTL_SECONDS
    TTL_USER_STATS = settings.CACHE_USER_STATS_TTL_SECONDS
    TTL_LEADERBOARD = settings.CACHE_LEADERBOARD_TTL_SECONDS
    TTL_DEFAULT = settings.REDIS_TTL
    
    # ==================== Basic Operations ====================
    
    async def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None
        """
        value = await redis_service.get(key)
        
        if value is None:
            return None
        
        # Try to parse as JSON
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl_seconds: Optional[int] = None
    ) -> bool:
        """
        Set value in cache.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl_seconds: TTL in seconds (uses default if not provided)
            
        Returns:
            True if successful
        """
        if isinstance(value, (dict, list)):
            value = json.dumps(value)
        elif not isinstance(value, str):
            value = str(value)
        
        return await redis_service.set(
            key,
            value,
            ttl_seconds=ttl_seconds or self.TTL_DEFAULT
        )
    
    async def delete(self, key: str) -> bool:
        """Delete a key from cache."""
        return await redis_service.delete(key)
    
    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern."""
        return await redis_service.delete_pattern(pattern)
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        return await redis_service.exists(key)
    
    # ==================== Cache-Aside Pattern ====================
    
    async def get_or_fetch(
        self,
        key: str,
        fetch_func: Callable[[], Any],
        ttl_seconds: Optional[int] = None,
        is_json: bool = True
    ) -> Any:
        """
        Cache-aside pattern: get from cache or fetch and cache.
        
        Args:
            key: Cache key
            fetch_func: Async function to fetch data if not cached
            ttl_seconds: TTL in seconds
            is_json: Whether to parse result as JSON
            
        Returns:
            Cached or fetched value
        """
        # Try to get from cache
        cached = await self.get(key)
        
        if cached is not None:
            logger.debug(f"[Cache] HIT: {key}")
            return cached
        
        # Cache miss - fetch data
        logger.debug(f"[Cache] MISS: {key}")
        
        try:
            data = await fetch_func()
            
            if data is not None:
                await self.set(key, data, ttl_seconds)
            
            return data
            
        except Exception as e:
            logger.error(f"[Cache] Fetch error for {key}: {e}")
            # Return None on fetch error (don't cache errors)
            return None
    
    # ==================== Pet Cache ====================
    
    async def get_all_pets(self, fetch_func: Callable) -> Any:
        """Get all pets with caching."""
        return await self.get_or_fetch(
            CacheKeys.PETS_ALL,
            fetch_func,
            ttl_seconds=self.TTL_PETS
        )
    
    async def get_active_pets(self, fetch_func: Callable) -> Any:
        """Get active pets with caching."""
        return await self.get_or_fetch(
            CacheKeys.PETS_ACTIVE,
            fetch_func,
            ttl_seconds=self.TTL_PETS
        )
    
    async def invalidate_pets(self) -> None:
        """Invalidate pet cache."""
        await self.delete(CacheKeys.PETS_ALL)
        await self.delete(CacheKeys.PETS_ACTIVE)
        await self.delete_pattern("cache:user_pets:*")
        logger.info("[Cache] Pet cache invalidated")
    
    # ==================== Course Cache ====================
    
    async def get_course(self, course_id: str, fetch_func: Callable) -> Any:
        """Get course by ID with caching."""
        return await self.get_or_fetch(
            CacheKeys.course(course_id),
            fetch_func,
            ttl_seconds=self.TTL_COURSE
        )
    
    async def get_all_courses(self, fetch_func: Callable) -> Any:
        """Get all courses with caching."""
        return await self.get_or_fetch(
            CacheKeys.COURSES_ALL,
            fetch_func,
            ttl_seconds=self.TTL_COURSE
        )
    
    async def get_courses_by_category(self, category: str, fetch_func: Callable) -> Any:
        """Get courses by category with caching."""
        return await self.get_or_fetch(
            CacheKeys.courses_by_category(category),
            fetch_func,
            ttl_seconds=self.TTL_COURSE
        )
    
    async def invalidate_course(self, course_id: str) -> None:
        """Invalidate course cache."""
        await self.delete(CacheKeys.course(course_id))
        await self.delete(CacheKeys.COURSES_ALL)
        await self.delete_pattern("cache:courses:category:*")
        logger.info(f"[Cache] Course cache invalidated for {course_id}")
    
    # ==================== User Stats Cache ====================
    
    async def get_user_stats(self, user_id: str, fetch_func: Callable) -> Any:
        """Get user stats with caching."""
        return await self.get_or_fetch(
            CacheKeys.user_stats(user_id),
            fetch_func,
            ttl_seconds=self.TTL_USER_STATS
        )
    
    async def get_user_profile(self, user_id: str, fetch_func: Callable) -> Any:
        """Get user profile with caching."""
        return await self.get_or_fetch(
            CacheKeys.user_profile(user_id),
            fetch_func,
            ttl_seconds=self.TTL_USER_STATS
        )
    
    async def get_user_progress(self, user_id: str, fetch_func: Callable) -> Any:
        """Get user progress with caching."""
        return await self.get_or_fetch(
            CacheKeys.user_progress(user_id),
            fetch_func,
            ttl_seconds=self.TTL_USER_STATS
        )
    
    async def invalidate_user_cache(self, user_id: str) -> None:
        """Invalidate all cache for a user."""
        await self.delete(CacheKeys.user_stats(user_id))
        await self.delete(CacheKeys.user_profile(user_id))
        await self.delete(CacheKeys.user_progress(user_id))
        await self.delete(CacheKeys.leaderboard_friends(user_id))
        logger.info(f"[Cache] User cache invalidated for {user_id}")
    
    # ==================== Leaderboard Cache ====================
    
    async def get_weekly_leaderboard(self, fetch_func: Callable) -> Any:
        """Get weekly leaderboard with caching."""
        return await self.get_or_fetch(
            CacheKeys.LEADERBOARD_WEEKLY,
            fetch_func,
            ttl_seconds=self.TTL_LEADERBOARD
        )
    
    async def get_alltime_leaderboard(self, fetch_func: Callable) -> Any:
        """Get all-time leaderboard with caching."""
        return await self.get_or_fetch(
            CacheKeys.LEADERBOARD_ALL_TIME,
            fetch_func,
            ttl_seconds=self.TTL_LEADERBOARD
        )
    
    async def invalidate_leaderboard(self) -> None:
        """Invalidate all leaderboard caches."""
        await self.delete(CacheKeys.LEADERBOARD_WEEKLY)
        await self.delete(CacheKeys.LEADERBOARD_ALL_TIME)
        await self.delete_pattern("cache:leaderboard:friends:*")
        logger.info("[Cache] Leaderboard cache invalidated")
    
    # ==================== Gamification Cache ====================
    
    async def get_daily_challenges(self, fetch_func: Callable) -> Any:
        """Get daily challenges with caching."""
        return await self.get_or_fetch(
            CacheKeys.DAILY_CHALLENGES,
            fetch_func,
            ttl_seconds=300  # 5 minutes
        )
    
    async def get_achievements(self, fetch_func: Callable) -> Any:
        """Get achievements with caching."""
        return await self.get_or_fetch(
            CacheKeys.ACHIEVEMENTS,
            fetch_func,
            ttl_seconds=self.TTL_LEADERBOARD
        )
    
    # ==================== Combo/AR Cache ====================
    
    async def get_combos(self, fetch_func: Callable) -> Any:
        """Get AR combos with caching."""
        return await self.get_or_fetch(
            CacheKeys.COMBOS,
            fetch_func,
            ttl_seconds=self.TTL_LEADERBOARD
        )
    
    async def get_ar_objects(self, fetch_func: Callable) -> Any:
        """Get AR objects with caching."""
        return await self.get_or_fetch(
            CacheKeys.AR_OBJECTS,
            fetch_func,
            ttl_seconds=self.TTL_LEADERBOARD
        )
    
    async def invalidate_combos(self) -> None:
        """Invalidate combo cache."""
        await self.delete(CacheKeys.COMBOS)
        logger.info("[Cache] Combo cache invalidated")
    
    # ==================== Stats ====================
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        try:
            keys = await redis_service.keys("cache:*")
            
            # Count by category
            stats = {
                "total_keys": len(keys),
                "by_category": {},
            }
            
            categories = ["pets", "course", "user", "leaderboard", "combos", "ar_objects"]
            
            for category in categories:
                category_keys = [k for k in keys if f":{category}" in k]
                stats["by_category"][category] = len(category_keys)
            
            return stats
            
        except Exception as e:
            logger.error(f"[Cache] Error getting stats: {e}")
            return {"error": str(e)}


# ==================== Decorator ====================

def cached(
    key_func: Callable[..., str],
    ttl_seconds: Optional[int] = None
):
    """
    Decorator for caching async function results.
    
    Usage:
        @cached(lambda user_id: CacheKeys.user_stats(user_id), ttl=60)
        async def get_user_stats(user_id: str):
            return await db.get_stats(user_id)
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            # Generate cache key
            cache_key = key_func(*args, **kwargs)
            
            # Try to get from cache
            cached_value = await cache_service.get(cache_key)
            if cached_value is not None:
                logger.debug(f"[Cache] HIT: {cache_key}")
                return cached_value
            
            # Cache miss
            logger.debug(f"[Cache] MISS: {cache_key}")
            result = await func(*args, **kwargs)
            
            if result is not None:
                await cache_service.set(cache_key, result, ttl_seconds)
            
            return result
        
        return wrapper
    return decorator


# ==================== Global Instance ====================

cache_service = CacheService()
