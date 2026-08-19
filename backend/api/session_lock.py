# backend/api/session_lock.py
"""
Session Lock API - Controller layer
POST   /session-lock/start        — Start/track session with heartbeat
POST   /session-lock/heartbeat   — Update session activity (called every 60s by frontend)
POST   /session-lock/lock        — Manually lock the app
POST   /session-lock/unlock       — Unlock the app
GET    /session-lock/status       — Get current lock status
POST   /session-lock/end         — End session and cleanup
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import logging

from repositories.postgres_user_repository import PostgresUser
from core.security import get_current_user
from utils.session_service import get_session_service, SessionService
from services.lock_service import lock_service

router = APIRouter(prefix="/session-lock", tags=["Session Lock"])
logger = logging.getLogger(__name__)


# ========== Request/Response Models ==========

class SessionStartRequest(BaseModel):
    active_topic: Optional[str] = None
    device_info: Optional[Dict[str, Any]] = None


class SessionHeartbeatRequest(BaseModel):
    active_topic: Optional[str] = None


class LockRequest(BaseModel):
    reason: Optional[str] = "manual"


class SessionExtendRequest(BaseModel):
    extra_minutes: int = Field(10, ge=1, le=120)
    extended_by: str = "parent"


class UsageTodayResponse(BaseModel):
    date: str
    total_minutes: int
    sessions: list[dict]


class SessionStatusResponse(BaseModel):
    user_id: str
    is_active: bool
    is_locked: bool
    started_at: Optional[str] = None
    last_activity: Optional[str] = None
    active_topic: Optional[str] = None
    idle_seconds: Optional[int] = None
    duration_seconds: Optional[int] = None
    lock_reason: Optional[str] = None


class HeartbeatResponse(BaseModel):
    status: str
    idle_seconds: int
    is_locked: bool
    ttl_seconds: int


# ========== API Endpoints ==========

@router.post("/start", response_model=SessionStatusResponse)
async def start_session_lock(
    payload: SessionStartRequest,
    current_user: PostgresUser = Depends(get_current_user),
    session_service: SessionService = Depends(get_session_service),
):
    """
    Start or resume a tracked session.
    Called when the user opens the app or returns to it.
    """
    user_id = current_user.id
    logger.info(f"[SessionLock] Starting session for user={user_id}")

    session_data = await session_service.start_session(
        user_id=user_id,
        active_topic=payload.active_topic,
        device_info=payload.device_info,
    )

    idle_time = await session_service.get_idle_time(user_id)
    duration = await session_service.get_session_duration(user_id)

    return SessionStatusResponse(
        user_id=user_id,
        is_active=True,
        is_locked=False,
        started_at=session_data.get("started_at"),
        last_activity=session_data.get("last_activity"),
        active_topic=session_data.get("active_topic"),
        idle_seconds=idle_time,
        duration_seconds=duration,
    )


@router.post("/heartbeat", response_model=HeartbeatResponse)
async def heartbeat(
    payload: SessionHeartbeatRequest,
    current_user: PostgresUser = Depends(get_current_user),
    session_service: SessionService = Depends(get_session_service),
):
    """
    Process heartbeat from the client.
    Called every 60 seconds by the frontend useSessionTimer hook.
    Updates the last_activity timestamp and checks for idle lock.
    """
    user_id = current_user.id

    # Update activity with optional topic change
    result = await session_service.heartbeat(user_id)

    if payload.active_topic:
        # Also update the active topic
        await session_service.update_activity(user_id, payload.active_topic)

    return HeartbeatResponse(
        status=result.get("status", "active"),
        idle_seconds=result.get("idle_seconds", 0),
        is_locked=result.get("is_locked", False),
        ttl_seconds=result.get("ttl_seconds", 0),
    )


@router.post("/lock")
async def lock_app(
    payload: LockRequest,
    current_user: PostgresUser = Depends(get_current_user),
    session_service: SessionService = Depends(get_session_service),
):
    """
    Manually lock the app.
    The user will need to unlock it to continue.
    """
    user_id = current_user.id
    logger.info(f"[SessionLock] Manual lock requested for user={user_id}")

    success = await session_service.lock(user_id, reason=payload.reason or "manual")

    if not success:
        raise HTTPException(
            status_code=400,
            detail="Cannot lock: no active session found. Start a session first."
        )

    return {"success": True, "message": "App locked", "is_locked": True}


@router.post("/unlock")
async def unlock_app(
    current_user: PostgresUser = Depends(get_current_user),
    session_service: SessionService = Depends(get_session_service),
):
    """
    Unlock the app.
    Resumes normal session tracking.
    """
    user_id = current_user.id
    logger.info(f"[SessionLock] Unlock requested for user={user_id}")

    await session_service.unlock(user_id)

    return {"success": True, "message": "App unlocked", "is_locked": False}


# ========== Session Lock Extension, Pause, Resume & Usage ==========

@router.post("/extend")
async def extend_session_lock(
    payload: SessionExtendRequest,
    current_user: PostgresUser = Depends(get_current_user),
):
    """
    Extend the current session by extra_minutes (parent override).
    """
    user_id = current_user.id
    logger.info(f"[SessionLock] Extend requested by {payload.extended_by} for user={user_id}")

    result = lock_service.extend_lock(
        user_id=user_id,
        extra_minutes=payload.extra_minutes,
        extended_by=payload.extended_by,
    )

    if not result:
        raise HTTPException(status_code=400, detail="No active session to extend")

    return {
        "user_id": user_id,
        "is_active": True,
        "is_locked": False,
        "duration_seconds": result.get("ttl_seconds", 0),
        "started_at": result.get("started_at"),
        "last_activity": result.get("last_activity"),
        "active_topic": result.get("metadata", {}).get("active_topic"),
        "idle_seconds": 0,
        "lock_reason": None,
    }


@router.get("/usage/today")
async def get_usage_today(
    current_user: PostgresUser = Depends(get_current_user),
):
    """
    Get today's usage statistics for the current user.
    """
    user_id = current_user.id
    usage = lock_service.get_usage_today(user_id)

    return {
        "date": datetime.utcnow().strftime("%Y-%m-%d"),
        "total_minutes": usage.get("total_minutes", 0),
        "sessions": usage.get("sessions", []),
    }


@router.post("/pause")
async def pause_session_lock(
    current_user: PostgresUser = Depends(get_current_user),
):
    """
    Pause the session timer.
    """
    user_id = current_user.id
    success = lock_service.pause_lock(user_id)

    if not success:
        raise HTTPException(status_code=400, detail="No active session to pause")

    return {"success": True, "is_paused": True}


@router.post("/resume")
async def resume_session_lock(
    current_user: PostgresUser = Depends(get_current_user),
):
    """
    Resume the session timer.
    """
    user_id = current_user.id
    success = lock_service.resume_lock(user_id)

    if not success:
        raise HTTPException(status_code=400, detail="No paused session to resume")

    return {"success": True, "is_paused": False}


@router.get("/status", response_model=SessionStatusResponse)
async def get_lock_status(
    current_user: PostgresUser = Depends(get_current_user),
    session_service: SessionService = Depends(get_session_service),
):
    """
    Get current session and lock status.
    Checks for idle lock and returns current state.
    """
    user_id = current_user.id

    # Check if should be locked due to idle
    await session_service.check_idle_lock(user_id)

    # Get session data
    session_data = await session_service.get_session(user_id)

    if not session_data:
        return SessionStatusResponse(
            user_id=user_id,
            is_active=False,
            is_locked=False,
        )

    idle_time = await session_service.get_idle_time(user_id)
    duration = await session_service.get_session_duration(user_id)
    is_locked = await session_service.is_locked(user_id)

    return SessionStatusResponse(
        user_id=user_id,
        is_active=True,
        is_locked=is_locked,
        started_at=session_data.get("started_at"),
        last_activity=session_data.get("last_activity"),
        active_topic=session_data.get("active_topic"),
        idle_seconds=idle_time,
        duration_seconds=duration,
        lock_reason=session_data.get("lock_reason"),
    )


@router.post("/end")
async def end_session_lock(
    current_user: PostgresUser = Depends(get_current_user),
    session_service: SessionService = Depends(get_session_service),
):
    """
    End the tracked session.
    Called when the user logs out or closes the app completely.
    """
    user_id = current_user.id
    logger.info(f"[SessionLock] Session end requested for user={user_id}")

    await session_service.end_session(user_id)

    return {"success": True, "message": "Session ended"}
