# Redis Caching Strategy for Edu-platform

## Overview

Comprehensive Redis caching architecture for app lock/time limits, session management, rate limiting, and frequently accessed data caching. Designed for local deployment with Redis as configuration and Supabase integration options.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Edu-platform                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐      │
│  │   App Lock /    │    │     Session      │    │   Rate Limit    │      │
│  │   Time Limits   │    │   Management     │    │     Layer       │      │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘      │
│           │                       │                       │                │
│  TTL: 20-30 min             TTL: 24h              TTL: sliding window   │
│  Auto-expire                Refresh on activity    Counter per IP/user  │
└───────────┬───────────────────────┬───────────────────────┬─────────────┘
            │                       │                       │
            ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Redis Cache Layer                                  │
│  ┌──────────────────┬──────────────────┬──────────────────┐               │
│  │  Lock State      │   Sessions       │   Rate Limits    │               │
│  │  (app_lock:*)    │   (session:*)    │   (ratelimit:*)  │               │
│  ├──────────────────┼──────────────────┼──────────────────┤               │
│  │  Usage Timestamps│   JWT Blacklist  │   API Counters   │               │
│  │  (usage:*)       │   (blacklist:*)  │   (api:*)        │               │
│  └──────────────────┴──────────────────┴──────────────────┘               │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │                    Data Cache Layer                           │          │
│  │  (pets:*, courses:*, user_stats:*, leaderboard:*)           │          │
│  └──────────────────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
            │
            ▼ (Optional)
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Supabase Integration                                  │
│  ┌──────────────────┬──────────────────┬──────────────────┐               │
│  │  Session Backup  │  Usage Analytics │  Cache Sync      │               │
│  │  (long-term)     │  (aggregation)  │  (fallback)      │               │
│  └──────────────────┴──────────────────┴──────────────────┘               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Requirements

### Functional

- [ ] **App Lock/Time Limits**: Auto-lock after 20-30 minutes of usage with configurable TTL
- [ ] **Session Management**: Store user sessions with refresh capability and JWT blacklist
- [ ] **Rate Limiting**: Sliding window rate limiting per user/IP with configurable thresholds
- [ ] **Cache Layer**: Cache frequently accessed data (pets, courses, user stats, leaderboards)

### Non-Functional

- **Performance**: Sub-millisecond cache operations, connection pooling
- **Security**: Redis AUTH, TLS support, secure key naming conventions
- **Scalability**: Local Redis config with Docker Compose, Supabase optional fallback
- **Availability**: Graceful degradation when Redis unavailable

---

## Key Naming Convention

```
Format: {category}:{subcategory}:{identifier}:{property}

Examples:
  app_lock:user:{user_id}                    → Lock state for user
  app_lock:usage:{user_id}:{date}            → Daily usage timestamp
  session:{session_id}                        → Session data
  session:blacklist:{jti}                    → Revoked JWT token
  ratelimit:api:{user_id}:{window}           → API rate limit counter
  ratelimit:auth:{ip}:{window}               → Auth rate limit per IP
  cache:pets:all                             → All pets catalog
  cache:course:{course_id}                   → Course data
  cache:user_stats:{user_id}                 → User statistics
  cache:leaderboard:weekly                   → Weekly leaderboard
```

---

## TTL Configuration

| Key Pattern | TTL | Purpose |
|-------------|-----|---------|
| `app_lock:user:{id}` | 30 min | Default app lock timer |
| `app_lock:usage:{id}:{date}` | 24h | Daily usage tracking |
| `session:{session_id}` | 24h | User session storage |
| `session:blacklist:{jti}` | Token exp | Revoked JWT storage |
| `ratelimit:*` | 60s | Sliding window counters |
| `cache:pets:*` | 600s | Pet catalog (10 min) |
| `cache:course:{id}` | 300s | Course data (5 min) |
| `cache:user_stats:{id}` | 60s | User stats (1 min) |
| `cache:leaderboard:*` | 300s | Leaderboards (5 min) |

---

## Implementation Tasks

### Epic 1: Redis Infrastructure Setup

- [ ] 1.1 Create Redis configuration files (docker-compose.yml, redis.conf) (Est: 1h, Priority: High)
- [ ] 1.2 Create environment configuration (.env.example) (Est: 30m, Priority: High)
- [ ] 1.3 Add Redis Python client dependencies (requirements.txt) (Est: 15m, Priority: High)

### Epic 2: Core Redis Service

- [ ] 2.1 Implement Redis connection manager with connection pooling (Est: 2h, Priority: High)
- [ ] 2.2 Implement graceful degradation (fallback to SimpleCache) (Est: 1h, Priority: High)
- [ ] 2.3 Add health check and connection retry logic (Est: 1h, Priority: Medium)

### Epic 3: Session Management

- [ ] 3.1 Implement session storage with Redis (Est: 2h, Priority: High)
- [ ] 3.2 Implement JWT blacklist for token revocation (Est: 1h, Priority: High)
- [ ] 3.3 Add session refresh and logout endpoints (Est: 1h, Priority: High)

### Epic 4: App Lock / Time Limits

- [ ] 4.1 Implement app lock state management (Est: 2h, Priority: High)
- [ ] 4.2 Add usage timestamp tracking (Est: 1h, Priority: High)
- [ ] 4.3 Create API endpoints for lock state and time extension (Est: 1h, Priority: Medium)

### Epic 5: Rate Limiting

- [ ] 5.1 Implement sliding window rate limiter (Est: 2h, Priority: High)
- [ ] 5.2 Create rate limit middleware for API routes (Est: 1h, Priority: High)
- [ ] 5.3 Add per-IP and per-user rate limits (Est: 1h, Priority: Medium)

### Epic 6: Cache Layer

- [ ] 6.1 Implement generic cache service with TTL support (Est: 2h, Priority: Medium)
- [ ] 6.2 Add cache invalidation strategies (Est: 1h, Priority: Medium)
- [ ] 6.3 Integrate with existing services (pets, courses, gamification) (Est: 3h, Priority: Medium)

### Epic 7: Supabase Integration

- [ ] 7.1 Create session backup to Supabase (Est: 2h, Priority: Low)
- [ ] 7.2 Add usage analytics aggregation (Est: 2h, Priority: Low)
- [ ] 7.3 Implement cache sync fallback (Est: 1h, Priority: Low)

### Epic 8: Frontend Integration

- [ ] 8.1 Update useSessionTimer hook for Redis backend (Est: 2h, Priority: High)
- [ ] 8.2 Add session keep-alive mechanism (Est: 1h, Priority: High)
- [ ] 8.3 Create lock state UI components (Est: 2h, Priority: Medium)

---

## Dependencies

```
docker-compose.yml
    └── redis:7-alpine

backend/
    ├── requirements.txt (redis, fakeredis)
    ├── settings.py (Redis config)
    ├── services/
    │   ├── redis_service.py      ← NEW
    │   ├── session_service.py    ← NEW
    │   ├── lock_service.py      ← NEW
    │   ├── rate_limiter.py      ← NEW
    │   └── cache_service.py     ← NEW
    ├── api/
    │   └── sessions.py          ← UPDATE (add lock/rate limit endpoints)
    └── utils/
        └── cache.py             ← UPDATE (add Redis backend)

frontend-web/
    ├── src/
    │   ├── hooks/
    │   │   └── useSessionTimer.ts  ← UPDATE
    │   ├── services/
    │   │   └── sessionApi.ts       ← NEW
    │   └── context/
    │       └── SessionContext.tsx   ← NEW
    └── .env.example
```

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Redis unavailable | Low | High | Graceful fallback to SimpleCache; logs warning |
| Memory exhaustion | Low | Medium | Set maxmemory-policy; monitor with redis-cli |
| Connection pool exhaustion | Medium | Medium | Configure appropriate pool size; use timeouts |
| Cache stampede | Medium | Medium | Use Redis SETNX for cache warming |
| Data inconsistency | Low | High | TTL ensures eventual consistency; Supabase backup |

---

## Files to Create/Modify

### New Files

1. `docker-compose.yml` - Redis container configuration
2. `redis.conf` - Redis server configuration
3. `backend/services/redis_service.py` - Core Redis service
4. `backend/services/session_service.py` - Session management
5. `backend/services/lock_service.py` - App lock service
6. `backend/services/rate_limiter.py` - Rate limiting service
7. `backend/services/cache_service.py` - Cache layer service
8. `backend/api/rate_limits.py` - Rate limit API endpoints
9. `backend/api/sessions.py` - Updated session endpoints
10. `frontend-web/src/services/sessionApi.ts` - Frontend session API
11. `frontend-web/src/context/SessionContext.tsx` - Session state context

### Files to Modify

1. `backend/settings.py` - Add Redis configuration
2. `backend/requirements.txt` - Add Redis dependencies
3. `backend/utils/cache.py` - Add Redis backend support
4. `backend/main.py` - Add Redis lifecycle management
5. `backend/api/auth.py` - Integrate session management
6. `frontend-web/src/hooks/useSessionTimer.ts` - Add Redis sync

---

## Timeline

| Phase | Duration | Milestones |
|-------|----------|------------|
| Phase 1: Infrastructure | 2h | Docker Compose, Redis config, env setup |
| Phase 2: Core Services | 6h | Redis service, session, lock services |
| Phase 3: Rate Limiting | 4h | Rate limiter, middleware, endpoints |
| Phase 4: Cache Layer | 4h | Generic cache, service integration |
| Phase 5: Frontend | 3h | Hook updates, context, UI components |
| Phase 6: Testing | 4h | Integration tests, load tests |

**Total Estimated Time**: 23 hours

---

## Configuration Reference

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=
REDIS_SSL=false

# Redis Connection Pool
REDIS_MAX_CONNECTIONS=50
REDIS_SOCKET_TIMEOUT=5
REDIS_SOCKET_CONNECT_TIMEOUT=5

# App Lock Settings
APP_LOCK_DEFAULT_TTL_MINUTES=30
APP_LOCK_WARNING_TTL_MINUTES=25

# Rate Limiting
RATE_LIMIT_AUTH_PER_MINUTE=10
RATE_LIMIT_API_PER_MINUTE=60
RATE_LIMIT_API_PER_HOUR=1000

# Session Settings
SESSION_TTL_HOURS=24

# Cache Settings
CACHE_PETS_TTL_SECONDS=600
CACHE_COURSE_TTL_SECONDS=300
CACHE_USER_STATS_TTL_SECONDS=60

# Supabase (Optional)
SUPABASE_REDIS_BACKUP_ENABLED=false
```

---

## Implementation Complete

### Files Created/Modified

#### Backend Services (New)

| File | Description |
|------|-------------|
| `services/redis_service.py` | Core Redis client with connection pooling, graceful degradation |
| `services/session_service.py` | Session management (create, validate, refresh, blacklist JWTs) |
| `services/lock_service.py` | App lock/time limits with TTL, pause/resume, extend |
| `services/rate_limiter.py` | Sliding window rate limiting, burst handling |
| `services/cache_service.py` | Cache-aside pattern with TTL for pets, courses, stats |

#### Configuration Files

| File | Description |
|------|-------------|
| `redis.conf` | Redis server configuration (persistence, memory, security) |
| `docker-compose.yml` | Redis container with health check |
| `backend/.env.example` | Redis and related environment variables |
| `backend/settings.py` | Updated with all Redis configuration |
| `backend/requirements.txt` | Added `redis>=5.0.0` |

#### Backend Updates

| File | Change |
|------|--------|
| `main.py` | Redis lifecycle management, health check integration |
| `utils/cache.py` | Added RedisCache adapter, Redis backend support |

#### Frontend (New)

| File | Description |
|------|-------------|
| `src/services/sessionApi.ts` | API client for session/lock/rate-limit endpoints |
| `src/hooks/useSessionTimer.ts` | Updated with Redis backend sync support |
| `src/context/SessionContext.tsx` | Global session state management |

---

## Quick Start

### 1. Start Redis

```bash
# Using Docker Compose
docker-compose up -d redis

# Or standalone Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or local installation
redis-server
```

### 2. Update Environment

```bash
# Copy and configure environment
cp backend/.env.example backend/.env

# Add Redis config
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. Install Dependencies

```bash
cd backend
pip install redis>=5.0.0
```

### 4. Run Backend

```bash
uvicorn main:app --reload
```

---

## Architecture Summary

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Backend (FastAPI)                             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │   Auth API   │  │  Session API │  │   Lock API   │  │Cache API │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └────┬─────┘ │
│         │                 │                 │                │       │
│         └────────────┬────┴─────────────────┴────────────────┘       │
│                      ▼                                                │
│         ┌────────────────────────────────────────────────────────┐   │
│         │              Redis Service Layer                        │   │
│         │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │   │
│         │  │ Session  │ │  Lock    │ │  Rate    │ │   Cache   │  │   │
│         │  │ Service  │ │ Service  │ │ Limiter  │ │  Service  │  │   │
│         │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬──────┘  │   │
│         └───────┼────────────┼────────────┼─────────────┼─────────┘   │
│                 │            │            │             │             │
│                 └────────────┴─────┬──────┴─────────────┘             │
│                                    ▼                                  │
│                         ┌─────────────────────┐                     │
│                         │   Redis Connection   │                     │
│                         │      Pool            │                     │
│                         └─────────┬───────────┘                     │
│                                   ▼                                   │
│                         ┌─────────────────────┐                     │
│                         │   Redis Server      │                     │
│                         │   (localhost:6379)   │                     │
│                         └─────────────────────┘                     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Key Features

### 1. App Lock / Time Limits
- **TTL-based auto-lock**: Users automatically locked after configurable inactivity (default: 30 min)
- **Warning threshold**: 5-minute warning before lock
- **Pause/Resume**: Temporarily pause timer
- **Parent override**: Extend time when needed
- **Usage tracking**: Track daily usage minutes

### 2. Session Management
- **Redis-backed sessions**: Distributed session storage
- **JWT blacklist**: Token revocation support
- **Multiple sessions**: Support for multiple concurrent sessions per user
- **Session refresh**: Automatic TTL refresh on activity
- **Session stats**: Track session count and duration

### 3. Rate Limiting
- **Sliding window algorithm**: Accurate rate limiting
- **Per-IP and per-user limits**: Different limits for auth vs API
- **Burst handling**: Token bucket for burst allowance
- **Configurable limits**: Easy to adjust per-endpoint

### 4. Cache Layer
- **Cache-aside pattern**: Get-or-fetch with automatic caching
- **TTL-based expiration**: Configurable per data type
- **Smart invalidation**: Pattern-based cache clearing
- **Redis integration**: Shares connection pool with other services

---

## Next Steps

1. **API Endpoints**: Create REST endpoints for all services in `api/session_lock.py`
2. **Middleware**: Add rate limiting middleware to FastAPI routes
3. **Testing**: Write integration tests for all services
4. **Monitoring**: Add Prometheus metrics for Redis operations
5. **Documentation**: Update API docs with new endpoints
