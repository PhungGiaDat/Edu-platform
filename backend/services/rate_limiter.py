# backend/services/rate_limiter.py
"""
Rate Limiter Service - Redis-backed Sliding Window Rate Limiting
Implements per-user and per-IP rate limiting with sliding window algorithm.
"""
import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Tuple

from settings import settings
from services.redis_service import redis_service

logger = logging.getLogger(__name__)


class RateLimitKeys:
    """Rate limit key patterns."""
    
    # Sliding window rate limit
    RATE_LIMIT = "ratelimit:{type}:{identifier}:{window}"
    
    # Token bucket (for burst limiting)
    BUCKET = "bucket:{type}:{identifier}"
    
    @classmethod
    def rate_limit(cls, limit_type: str, identifier: str, window: str) -> str:
        return cls.RATE_LIMIT.format(type=limit_type, identifier=identifier, window=window)
    
    @classmethod
    def bucket(cls, limit_type: str, identifier: str) -> str:
        return cls.BUCKET.format(type=limit_type, identifier=identifier)


class RateLimitType:
    """Rate limit type constants."""
    
    AUTH = "auth"      # Login, register, etc.
    API = "api"       # General API calls
    BURST = "burst"   # Burst allowance


class RateLimitService:
    """
    Redis-backed sliding window rate limiter.
    
    Features:
    - Sliding window algorithm for accurate rate limiting
    - Per-user and per-IP rate limits
    - Configurable limits for different endpoints
    - Token bucket for burst handling
    - Graceful handling when Redis unavailable
    """
    
    def __init__(self):
        # Rate limit configurations
        self._limits = {
            RateLimitType.AUTH: {
                "requests": settings.RATE_LIMIT_AUTH_PER_MINUTE,
                "window_seconds": 60,
                "description": "Auth endpoints (login, register)"
            },
            RateLimitType.API: {
                "requests": settings.RATE_LIMIT_API_PER_MINUTE,
                "window_seconds": 60,
                "description": "General API endpoints"
            },
        }
        
        # Burst configuration
        self._burst_limit = settings.RATE_LIMIT_BURST
        self._burst_window_seconds = 10
    
    async def check_rate_limit(
        self,
        identifier: str,
        limit_type: str = RateLimitType.API,
        custom_limit: Optional[int] = None,
        custom_window: Optional[int] = None
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Check if request is within rate limit using sliding window algorithm.
        
        Args:
            identifier: User ID, IP address, or API key
            limit_type: Type of rate limit (auth, api)
            custom_limit: Override limit (optional)
            custom_window: Override window in seconds (optional)
            
        Returns:
            Tuple of (is_allowed, rate_limit_info)
        """
        limit_config = self._limits.get(limit_type, self._limits[RateLimitType.API])
        
        max_requests = custom_limit or limit_config["requests"]
        window_seconds = custom_window or limit_config["window_seconds"]
        
        # Get current window timestamp
        now = time.time()
        window_start = now - window_seconds
        
        key = RateLimitKeys.rate_limit(
            limit_type,
            identifier,
            str(int(now / window_seconds))
        )
        
        # Remove old entries outside the window
        old_key = RateLimitKeys.rate_limit(
            limit_type,
            identifier,
            str(int(window_start / window_seconds))
        )
        
        # Use pipeline for atomic operations
        try:
            # Get current count
            current_count = await redis_service.get(key)
            
            if current_count is None:
                current_count = 0
            else:
                current_count = int(current_count)
            
            # Check if within limit
            remaining = max(0, max_requests - current_count - 1)
            reset_time = int((int(now / window_seconds) + 1) * window_seconds)
            
            if current_count >= max_requests:
                # Rate limit exceeded
                return False, {
                    "allowed": False,
                    "limit": max_requests,
                    "remaining": 0,
                    "reset": reset_time,
                    "retry_after": reset_time - int(now),
                    "window_seconds": window_seconds,
                    "type": limit_type,
                }
            
            # Increment counter
            await redis_service.set(
                key,
                str(current_count + 1),
                ttl_seconds=window_seconds * 2  # Keep for 2 windows
            )
            
            return True, {
                "allowed": True,
                "limit": max_requests,
                "remaining": remaining,
                "reset": reset_time,
                "window_seconds": window_seconds,
                "type": limit_type,
            }
            
        except Exception as e:
            logger.error(f"[RateLimit] Error checking limit: {e}")
            # Fail open (allow request) if Redis is unavailable
            return True, {
                "allowed": True,
                "limit": max_requests,
                "remaining": max_requests,
                "reset": int(now) + window_seconds,
                "window_seconds": window_seconds,
                "type": limit_type,
                "error": "Redis unavailable, failing open",
            }
    
    async def check_burst_limit(
        self,
        identifier: str,
        burst_size: Optional[int] = None
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Check burst limit using token bucket algorithm.
        
        Args:
            identifier: User ID or IP address
            burst_size: Maximum burst size (optional)
            
        Returns:
            Tuple of (is_allowed, burst_info)
        """
        max_burst = burst_size or self._burst_limit
        
        key = RateLimitKeys.bucket(RateLimitType.BURST, identifier)
        
        try:
            # Get current tokens
            bucket_data = await redis_service.get_json(key)
            
            if bucket_data is None:
                # Initialize bucket with full tokens
                bucket_data = {
                    "tokens": max_burst,
                    "last_refill": time.time(),
                }
            
            now = time.time()
            
            # Calculate token refill
            time_passed = now - bucket_data["last_refill"]
            refill_rate = 1.0 / self._burst_window_seconds  # 1 token per window
            
            # Add tokens based on time passed
            new_tokens = min(
                max_burst,
                bucket_data["tokens"] + (time_passed * refill_rate)
            )
            
            # Try to consume a token
            if new_tokens >= 1:
                new_tokens -= 1
                bucket_data["tokens"] = new_tokens
                bucket_data["last_refill"] = now
                
                # Store updated bucket
                await redis_service.set_json(
                    key,
                    bucket_data,
                    ttl_seconds=max_burst * self._burst_window_seconds
                )
                
                return True, {
                    "allowed": True,
                    "tokens_remaining": int(new_tokens),
                    "max_tokens": max_burst,
                }
            else:
                # No tokens available
                return False, {
                    "allowed": False,
                    "tokens_remaining": 0,
                    "max_tokens": max_burst,
                    "retry_after": int((1 - new_tokens) / refill_rate),
                }
                
        except Exception as e:
            logger.error(f"[RateLimit] Error checking burst limit: {e}")
            # Fail open
            return True, {
                "allowed": True,
                "tokens_remaining": max_burst,
                "max_tokens": max_burst,
                "error": "Redis unavailable, failing open",
            }
    
    async def get_rate_limit_status(
        self,
        identifier: str,
        limit_type: str = RateLimitType.API
    ) -> Dict[str, Any]:
        """
        Get current rate limit status without incrementing.
        
        Returns:
            Rate limit status information
        """
        limit_config = self._limits.get(limit_type, self._limits[RateLimitType.API])
        
        max_requests = limit_config["requests"]
        window_seconds = limit_config["window_seconds"]
        
        now = time.time()
        window_key = str(int(now / window_seconds))
        
        key = RateLimitKeys.rate_limit(limit_type, identifier, window_key)
        
        try:
            current_count = await redis_service.get(key)
            
            if current_count is None:
                current_count = 0
            else:
                current_count = int(current_count)
            
            reset_time = int((int(now / window_seconds) + 1) * window_seconds)
            
            return {
                "limit": max_requests,
                "remaining": max(0, max_requests - current_count),
                "reset": reset_time,
                "window_seconds": window_seconds,
                "type": limit_type,
            }
            
        except Exception as e:
            logger.error(f"[RateLimit] Error getting status: {e}")
            return {
                "limit": max_requests,
                "remaining": max_requests,
                "reset": int(now) + window_seconds,
                "window_seconds": window_seconds,
                "type": limit_type,
                "error": "Redis unavailable",
            }
    
    async def reset_rate_limit(
        self,
        identifier: str,
        limit_type: str = RateLimitType.API
    ) -> bool:
        """
        Reset rate limit for an identifier (admin function).
        
        Returns:
            True if reset successfully
        """
        try:
            pattern = f"ratelimit:{limit_type}:{identifier}:*"
            count = await redis_service.delete_pattern(pattern)
            
            logger.info(f"[RateLimit] Reset {count} keys for {identifier}:{limit_type}")
            return True
            
        except Exception as e:
            logger.error(f"[RateLimit] Error resetting limit: {e}")
            return False
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get rate limiter statistics."""
        try:
            # Count rate limit keys
            keys = await redis_service.keys("ratelimit:*")
            
            auth_keys = [k for k in keys if ":auth:" in k]
            api_keys = [k for k in keys if ":api:" in k]
            
            return {
                "total_keys": len(keys),
                "auth_keys": len(auth_keys),
                "api_keys": len(api_keys),
                "limits": self._limits,
                "burst_limit": self._burst_limit,
            }
            
        except Exception as e:
            logger.error(f"[RateLimit] Error getting stats: {e}")
            return {"error": str(e)}


# ==================== Global Instance ====================

rate_limiter = RateLimitService()


# ==================== FastAPI Dependency ====================

from fastapi import HTTPException, Request
from fastapi.security import HTTPBearer

rate_limit_scheme = HTTPBearer(auto_error=False)


async def rate_limit_dependency(
    request: Request,
    limit_type: str = RateLimitType.API
) -> Dict[str, Any]:
    """
    FastAPI dependency for rate limiting.
    
    Usage:
        @app.post("/api/endpoint")
        async def endpoint(rate_info: dict = Depends(rate_limit_dependency)):
            ...
    """
    # Get identifier (prefer user ID if authenticated, fall back to IP)
    identifier = None
    user = getattr(request.state, "user", None)
    
    if user and hasattr(user, "id"):
        identifier = f"user:{user.id}"
    else:
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        
        # Check for X-Forwarded-For header (behind proxy)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        
        identifier = f"ip:{client_ip}"
    
    # Check rate limit
    is_allowed, rate_info = await rate_limiter.check_rate_limit(
        identifier=identifier,
        limit_type=limit_type
    )
    
    # Store rate info in request state for response headers
    request.state.rate_limit_info = rate_info
    
    if not is_allowed:
        raise HTTPException(
            status_code=429,
            detail={
                "message": "Rate limit exceeded",
                "retry_after": rate_info["retry_after"],
            },
            headers={
                "X-RateLimit-Limit": str(rate_info["limit"]),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(rate_info["reset"]),
                "Retry-After": str(rate_info["retry_after"]),
            }
        )
    
    return rate_info
