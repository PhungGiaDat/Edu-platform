# backend/services/redis_service.py
from __future__ import annotations

"""
Redis Service - Core Redis Client with Connection Pooling
Provides unified interface for Redis operations with graceful degradation.
"""
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union
from contextlib import asynccontextmanager

try:
    import redis.asyncio as redis
    from redis.asyncio.connection import ConnectionPool
    from redis.exceptions import RedisError, ConnectionError as RedisConnectionError
    REDIS_CLIENT_AVAILABLE = True
except ModuleNotFoundError:  # Optional local/test dependency.
    redis = None
    ConnectionPool = Any
    RedisError = Exception
    RedisConnectionError = ConnectionError
    REDIS_CLIENT_AVAILABLE = False

from settings import settings

logger = logging.getLogger(__name__)


class RedisService:
    """
    Redis service with connection pooling and graceful degradation.
    
    Features:
    - Connection pooling for efficient resource usage
    - Automatic reconnection on connection loss
    - Fallback to None when Redis is unavailable
    - Comprehensive error handling
    """
    
    def __init__(self):
        self._pool: Optional[ConnectionPool] = None
        self._client: Optional[redis.Redis] = None
        self._is_connected: bool = False
        self._lock = asyncio.Lock()
    
    async def connect(self) -> bool:
        """
        Initialize Redis connection pool.
        Returns True if successful, False if Redis is unavailable.
        """
        if not REDIS_CLIENT_AVAILABLE:
            logger.info("[Redis] Python client unavailable; using in-memory fallback")
            return False
        async with self._lock:
            if self._client is not None and self._is_connected:
                return True
            
            try:
                # Create connection pool
                self._pool = ConnectionPool.from_url(
                    settings.redis_url or "redis://localhost:6379/0",
                    max_connections=settings.REDIS_MAX_CONNECTIONS,
                    socket_timeout=settings.REDIS_SOCKET_TIMEOUT,
                    socket_connect_timeout=settings.REDIS_SOCKET_CONNECT_TIMEOUT,
                    decode_responses=True,
                    retry_on_timeout=True,
                )
                
                # Create client from pool
                self._client = redis.Redis(connection_pool=self._pool)
                
                # Test connection
                await self._client.ping()
                
                self._is_connected = True
                logger.info(f"[Redis] Connected to {settings.REDIS_HOST}:{settings.REDIS_PORT}")
                return True
                
            except Exception as e:
                logger.warning(f"[Redis] Connection failed: {e}. Using fallback mode.")
                self._is_connected = False
                self._client = None
                self._pool = None
                return False
    
    async def disconnect(self) -> None:
        """Close Redis connection pool."""
        async with self._lock:
            if self._client:
                await self._client.aclose()
                self._client = None
            if self._pool:
                await self._pool.disconnect()
                self._pool = None
            self._is_connected = False
            logger.info("[Redis] Disconnected")
    
    async def health_check(self) -> Dict[str, Any]:
        """Check Redis connection health."""
        if not self._is_connected or not self._client:
            return {"status": "disconnected", "healthy": False}
        
        try:
            start = datetime.utcnow()
            await self._client.ping()
            latency_ms = (datetime.utcnow() - start).total_seconds() * 1000
            
            info = await self._client.info("server")
            
            return {
                "status": "connected",
                "healthy": True,
                "latency_ms": round(latency_ms, 2),
                "version": info.get("redis_version", "unknown"),
                "uptime_seconds": info.get("uptime_in_seconds", 0),
            }
        except Exception as e:
            logger.error(f"[Redis] Health check failed: {e}")
            return {"status": "error", "healthy": False, "error": str(e)}
    
    # ==================== Basic Operations ====================
    
    async def get(self, key: str) -> Optional[str]:
        """Get value by key."""
        if not self._is_connected:
            return None
        try:
            return await self._client.get(key)
        except RedisError as e:
            logger.error(f"[Redis] GET error for {key}: {e}")
            return None
    
    async def set(
        self, 
        key: str, 
        value: Union[str, int, float, Dict, List], 
        ttl_seconds: Optional[int] = None
    ) -> bool:
        """Set key-value pair with optional TTL."""
        if not self._is_connected:
            return False
        try:
            if isinstance(value, (dict, list)):
                value = json.dumps(value)
            elif not isinstance(value, str):
                value = str(value)
            
            if ttl_seconds:
                await self._client.setex(key, ttl_seconds, value)
            else:
                await self._client.set(key, value)
            return True
        except RedisError as e:
            logger.error(f"[Redis] SET error for {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete a key."""
        if not self._is_connected:
            return False
        try:
            result = await self._client.delete(key)
            return result > 0
        except RedisError as e:
            logger.error(f"[Redis] DELETE error for {key}: {e}")
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if key exists."""
        if not self._is_connected:
            return False
        try:
            return await self._client.exists(key) > 0
        except RedisError as e:
            logger.error(f"[Redis] EXISTS error for {key}: {e}")
            return False
    
    async def expire(self, key: str, ttl_seconds: int) -> bool:
        """Set TTL on a key."""
        if not self._is_connected:
            return False
        try:
            return await self._client.expire(key, ttl_seconds)
        except RedisError as e:
            logger.error(f"[Redis] EXPIRE error for {key}: {e}")
            return False
    
    async def ttl(self, key: str) -> int:
        """Get remaining TTL of a key (-1 if no TTL, -2 if key doesn't exist)."""
        if not self._is_connected:
            return -2
        try:
            return await self._client.ttl(key)
        except RedisError as e:
            logger.error(f"[Redis] TTL error for {key}: {e}")
            return -2
    
    # ==================== Hash Operations ====================
    
    async def hset(self, key: str, field: str, value: Any) -> bool:
        """Set hash field."""
        if not self._is_connected:
            return False
        try:
            if isinstance(value, (dict, list)):
                value = json.dumps(value)
            await self._client.hset(key, field, value)
            return True
        except RedisError as e:
            logger.error(f"[Redis] HSET error for {key}.{field}: {e}")
            return False
    
    async def hget(self, key: str, field: str) -> Optional[str]:
        """Get hash field."""
        if not self._is_connected:
            return None
        try:
            return await self._client.hget(key, field)
        except RedisError as e:
            logger.error(f"[Redis] HGET error for {key}.{field}: {e}")
            return None
    
    async def hgetall(self, key: str) -> Dict[str, str]:
        """Get all hash fields."""
        if not self._is_connected:
            return {}
        try:
            return await self._client.hgetall(key)
        except RedisError as e:
            logger.error(f"[Redis] HGETALL error for {key}: {e}")
            return {}
    
    async def hmset(self, key: str, mapping: Dict[str, Any]) -> bool:
        """Set multiple hash fields."""
        if not self._is_connected:
            return False
        try:
            # Convert complex values to JSON
            serialized = {}
            for k, v in mapping.items():
                if isinstance(v, (dict, list)):
                    serialized[k] = json.dumps(v)
                else:
                    serialized[k] = str(v)
            await self._client.hset(key, mapping=serialized)
            return True
        except RedisError as e:
            logger.error(f"[Redis] HMSET error for {key}: {e}")
            return False
    
    async def hincrby(self, key: str, field: str, amount: int = 1) -> Optional[int]:
        """Increment hash field by amount."""
        if not self._is_connected:
            return None
        try:
            return await self._client.hincrby(key, field, amount)
        except RedisError as e:
            logger.error(f"[Redis] HINCRBY error for {key}.{field}: {e}")
            return None
    
    async def hdel(self, key: str, *fields: str) -> bool:
        """Delete hash fields."""
        if not self._is_connected:
            return False
        try:
            await self._client.hdel(key, *fields)
            return True
        except RedisError as e:
            logger.error(f"[Redis] HDEL error for {key}: {e}")
            return False
    
    # ==================== Sorted Set Operations (for rate limiting) ====================
    
    async def zadd(self, key: str, mapping: Dict[str, float]) -> bool:
        """Add members to sorted set."""
        if not self._is_connected:
            return False
        try:
            await self._client.zadd(key, mapping)
            return True
        except RedisError as e:
            logger.error(f"[Redis] ZADD error for {key}: {e}")
            return False
    
    async def zremrangebyscore(self, key: str, min_score: float, max_score: float) -> int:
        """Remove members by score range."""
        if not self._is_connected:
            return 0
        try:
            return await self._client.zremrangebyscore(key, min_score, max_score)
        except RedisError as e:
            logger.error(f"[Redis] ZREMRANGEBYSCORE error for {key}: {e}")
            return 0
    
    async def zcard(self, key: str) -> int:
        """Get sorted set cardinality."""
        if not self._is_connected:
            return 0
        try:
            return await self._client.zcard(key)
        except RedisError as e:
            logger.error(f"[Redis] ZCARD error for {key}: {e}")
            return 0
    
    async def zrangebyscore(self, key: str, min_score: float, max_score: float) -> List[str]:
        """Get members by score range."""
        if not self._is_connected:
            return []
        try:
            return await self._client.zrangebyscore(key, min_score, max_score)
        except RedisError as e:
            logger.error(f"[Redis] ZRANGEBYSCORE error for {key}: {e}")
            return []
    
    # ==================== Key Pattern Operations ====================
    
    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern."""
        if not self._is_connected:
            return 0
        try:
            count = 0
            async for key in self._client.scan_iter(match=pattern, count=100):
                await self._client.delete(key)
                count += 1
            return count
        except RedisError as e:
            logger.error(f"[Redis] DELETE_PATTERN error for {pattern}: {e}")
            return 0
    
    async def keys(self, pattern: str = "*") -> List[str]:
        """Get keys matching pattern."""
        if not self._is_connected:
            return []
        try:
            return await self._client.keys(pattern)
        except RedisError as e:
            logger.error(f"[Redis] KEYS error for {pattern}: {e}")
            return []
    
    # ==================== Atomic Operations ====================
    
    async def incr(self, key: str) -> Optional[int]:
        """Atomically increment a key."""
        if not self._is_connected:
            return None
        try:
            return await self._client.incr(key)
        except RedisError as e:
            logger.error(f"[Redis] INCR error for {key}: {e}")
            return None
    
    async def decr(self, key: str) -> Optional[int]:
        """Atomically decrement a key."""
        if not self._is_connected:
            return None
        try:
            return await self._client.decr(key)
        except RedisError as e:
            logger.error(f"[Redis] DECR error for {key}: {e}")
            return None
    
    async def setnx(self, key: str, value: str) -> bool:
        """Set key if not exists (atomic)."""
        if not self._is_connected:
            return False
        try:
            return await self._client.setnx(key, value)
        except RedisError as e:
            logger.error(f"[Redis] SETNX error for {key}: {e}")
            return False
    
    # ==================== JSON Helpers ====================
    
    async def get_json(self, key: str) -> Optional[Dict]:
        """Get and parse JSON value."""
        value = await self.get(key)
        if value:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                logger.error(f"[Redis] Failed to parse JSON for {key}")
                return None
        return None
    
    async def set_json(self, key: str, value: Dict, ttl_seconds: Optional[int] = None) -> bool:
        """Set JSON value."""
        return await self.set(key, json.dumps(value), ttl_seconds)
    
    # ==================== Lock Operations ====================
    
    @asynccontextmanager
    async def lock(self, lock_name: str, timeout: int = 10, blocking_timeout: int = 5):
        """Context manager for distributed locking."""
        if not self._is_connected:
            yield None
            return
        
        lock = self._client.lock(lock_name, timeout=timeout, blocking_timeout=blocking_timeout)
        try:
            await lock.acquire()
            yield lock
        except Exception as e:
            logger.error(f"[Redis] Lock acquisition failed for {lock_name}: {e}")
            yield None
        finally:
            try:
                await lock.release()
            except Exception:
                pass  # Lock may have expired


# ==================== Global Instance ====================

# Global Redis service instance
redis_service = RedisService()


# ==================== Dependency for FastAPI ====================

async def get_redis() -> RedisService:
    """FastAPI dependency to get Redis service."""
    if not redis_service._is_connected:
        await redis_service.connect()
    return redis_service
