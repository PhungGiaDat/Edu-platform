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
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging

from models.user_mongo import UserDocument
from core.security import get_current_user
from utils.session_service import get_session_service, SessionService

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
    current_user: UserDocument = Depends(get_current_user),
    session_service: SessionService = Depends(get_session_service),
):
    """
    Start or resume a tracked session.
    Called when the user opens the app or returns to it.
    """
    user_id = str(current_user.id)
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
    current_user: UserDocument = Depends(get_current_user),
    session_service: SessionService = Depends(get_session_service),
):
    """
    Process heartbeat from the client.
    Called every 60 seconds by the frontend useSessionTimer hook.
    Updates the last_activity timestamp and checks for idle lock.
    """
    user_id = str(current_user.id)

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
    current_user: UserDocument = Depends(get_current_user),
    session_service: SessionService = Depends(get_session_service),
):
    """
    Manually lock the app.
    The user will need to unlock it to continue.
    """
    user_id = str(current_user.id)
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
    current_user: UserDocument = Depends(get_current_user),
    session_service: SessionService = Depends(get_session_service),
):
    """
    Unlock the app.
    Resumes normal session tracking.
    """
    user_id = str(current_user.id)
    logger.info(f"[SessionLock] Unlock requested for user={user_id}")

    await session_service.unlock(user_id)

    return {"success": True, "message": "App unlocked", "is_locked": False}


@router.get("/status", response_model=SessionStatusResponse)
async def get_lock_status(
    current_user: UserDocument = Depends(get_current_user),
    session_service: SessionService = Depends(get_session_service),
):
    """
    Get current session and lock status.
    Checks for idle lock and returns current state.
    """
    user_id = str(current_user.id)

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
    current_user: UserDocument = Depends(get_current_user),
    session_service: SessionService = Depends(get_session_service),
):
    """
    End the tracked session.
    Called when the user logs out or closes the app completely.
    """
    user_id = str(current_user.id)
    logger.info(f"[SessionLock] Session end requested for user={user_id}")

    await session_service.end_session(user_id)

    return {"success": True, "message": "Session ended"}
