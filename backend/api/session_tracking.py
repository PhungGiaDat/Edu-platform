# backend/api/session_tracking.py
"""
Session Tracking API - Controller layer

Endpoints:
  POST /session/heartbeat    — Keep session alive
  GET  /session/status      — Get current session status
  POST /session/lock        — Lock the app
  DELETE /session/lock      — Unlock the app
  GET  /session/metrics     — Get user session metrics
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional
import logging

from models.session_tracking import (
    HeartbeatRequest,
    HeartbeatResponse,
    SessionStatusResponse,
    AppLockRequest,
    AppLockResponse,
    SessionMetrics,
)
from repositories.session_tracking_repository import (
    SessionTrackingRepository,
    get_session_tracking_repository,
)
from services.session_tracking_service import (
    SessionTrackingService,
    get_session_tracking_service,
)
from repositories.postgres_user_repository import PostgresUser
from core.security import get_current_user
from core.base_router import BaseAPIRouter

router = BaseAPIRouter(prefix="/session", tags=["Session Tracking"])
logger = logging.getLogger(__name__)


@router.post("/heartbeat", response_model=HeartbeatResponse)
async def send_heartbeat(
    payload: HeartbeatRequest,
    current_user: PostgresUser = Depends(get_current_user),
    tracking_repo: SessionTrackingRepository = Depends(get_session_tracking_repository),
    tracking_service: SessionTrackingService = Depends(get_session_tracking_service),
):
    """
    Keep the session alive and update progress.

    Should be called every 30-60 seconds by the frontend.
    Updates current step, progress percentage, and resets idle timer.
    """
    user_id = current_user.id

    session = await tracking_service.process_heartbeat(
        repo=tracking_repo,
        session_id=payload.session_id,
        user_id=user_id,
        current_step_id=payload.current_step_id,
        current_step_index=payload.current_step_index,
        progress_percent=payload.progress_percent,
    )

    if not session:
        raise HTTPException(
            status_code=404,
            detail=f"Session '{payload.session_id}' not found or ended"
        )

    from datetime import datetime
    last_heartbeat = session.get("last_heartbeat", datetime.utcnow())

    return HeartbeatResponse(
        session_id=payload.session_id,
        status=session.get("status", "active"),
        last_heartbeat=last_heartbeat,
        idle_seconds=0,
        total_time_seconds=session.get("total_time_seconds", 0),
        is_locked=session.get("is_locked", False),
    )


@router.get("/status", response_model=SessionStatusResponse)
async def get_session_status(
    current_user: PostgresUser = Depends(get_current_user),
    tracking_repo: SessionTrackingRepository = Depends(get_session_tracking_repository),
    tracking_service: SessionTrackingService = Depends(get_session_tracking_service),
):
    """
    Get the current active session status for the authenticated user.

    Returns session details including idle time, progress, and lock status.
    """
    user_id = current_user.id

    status = await tracking_service.get_session_status(
        repo=tracking_repo,
        user_id=user_id,
    )

    if not status:
        return SessionStatusResponse(
            user_id=user_id,
            status="no_session",
            is_locked=False,
        )

    return SessionStatusResponse(**status)


@router.post("/lock", response_model=AppLockResponse)
async def lock_app(
    payload: AppLockRequest,
    current_user: PostgresUser = Depends(get_current_user),
    tracking_repo: SessionTrackingRepository = Depends(get_session_tracking_repository),
    tracking_service: SessionTrackingService = Depends(get_session_tracking_service),
):
    """
    Lock the app (for parental control or break time).

    Optional duration for temporary locks.
    """
    user_id = current_user.id

    result = await tracking_service.lock_app(
        repo=tracking_repo,
        session_id=payload.session_id,
        user_id=user_id,
        reason=payload.reason,
        duration_minutes=payload.lock_duration_minutes,
    )

    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"Session '{payload.session_id}' not found"
        )

    from datetime import datetime

    return AppLockResponse(
        session_id=payload.session_id,
        status="locked",
        locked_at=result["locked_at"],
        locked_until=result.get("locked_until"),
        message=result["message"],
    )


@router.delete("/lock")
async def unlock_app(
    session_id: str,
    current_user: PostgresUser = Depends(get_current_user),
    tracking_repo: SessionTrackingRepository = Depends(get_session_tracking_repository),
    tracking_service: SessionTrackingService = Depends(get_session_tracking_service),
):
    """
    Unlock the app.

    Requires the session to be in locked state.
    """
    user_id = current_user.id

    success = await tracking_service.unlock_app(
        repo=tracking_repo,
        session_id=session_id,
        user_id=user_id,
    )

    if not success:
        raise HTTPException(
            status_code=400,
            detail="Failed to unlock. Session may not be locked."
        )

    return {"message": "App unlocked successfully", "session_id": session_id}


@router.get("/metrics", response_model=SessionMetrics)
async def get_session_metrics(
    current_user: PostgresUser = Depends(get_current_user),
    tracking_repo: SessionTrackingRepository = Depends(get_session_tracking_repository),
    tracking_service: SessionTrackingService = Depends(get_session_tracking_service),
):
    """
    Get aggregated session metrics for the authenticated user.

    Returns total sessions, time, averages, and streak data.
    """
    user_id = current_user.id

    metrics = await tracking_service.get_user_metrics(
        repo=tracking_repo,
        user_id=user_id,
    )

    return SessionMetrics(**metrics)


class SessionStartRequest(BaseModel):
    """Request to start a new tracking session."""
    session_id: str


@router.post("/start")
async def start_tracking_session(
    payload: SessionStartRequest,
    current_user: PostgresUser = Depends(get_current_user),
    tracking_repo: SessionTrackingRepository = Depends(get_session_tracking_repository),
):
    """
    Start or resume a tracking session.

    Creates a new session record or updates existing.
    """
    user_id = current_user.id

    session_id = await tracking_repo.create_or_update_session(
        user_id=user_id,
        session_id=payload.session_id,
    )

    return {
        "message": "Session started",
        "session_id": session_id,
        "user_id": user_id,
    }


@router.post("/end")
async def end_tracking_session(
    session_id: str,
    current_user: PostgresUser = Depends(get_current_user),
    tracking_repo: SessionTrackingRepository = Depends(get_session_tracking_repository),
):
    """
    End a tracking session.

    Marks session as ended.
    """
    user_id = current_user.id

    success = await tracking_repo.end_session(
        session_id=session_id,
        user_id=user_id,
    )

    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Session '{session_id}' not found"
        )

    return {"message": "Session ended", "session_id": session_id}
