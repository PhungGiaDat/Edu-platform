# backend/api/sessions.py
"""
Session Log API - Controller layer
"""
from fastapi import APIRouter, HTTPException, Depends
import logging

from models.session_log import (
    SessionStartRequest,
    SessionEndRequest,
    SessionLogResponse,
    SessionSummary,
)
from repositories.postgres_session_log_repository import (
    PostgresSessionLogRepository,
    get_postgres_session_log_repository,
)
from repositories.postgres_user_repository import PostgresUser
from core.security import get_current_user

router = APIRouter(prefix="/sessions", tags=["Sessions"])
logger = logging.getLogger(__name__)


@router.post("/start", response_model=SessionLogResponse, status_code=201)
async def start_session(
    payload: SessionStartRequest,
    current_user: PostgresUser = Depends(get_current_user),
    repo: PostgresSessionLogRepository = Depends(get_postgres_session_log_repository),
):
    """
    Open a new learning session.
    Called by the frontend when the learner enters the app/lesson.
    """
    user_id = current_user.id
    logger.info(f"[Session] Starting session for user={user_id} topic={payload.active_topic}")

    session = await repo.create_session(user_id=user_id, active_topic=payload.active_topic)

    return SessionLogResponse(
        _id=str(session["id"]),
        user_id=session["user_id"],
        started_at=session["started_at"],
        ended_at=session.get("ended_at"),
        duration_seconds=session.get("duration_seconds"),
        break_reminder_sent=session.get("break_reminder_sent", False),
        active_topic=session.get("active_topic"),
    )


@router.patch("/{session_id}/end", response_model=SessionLogResponse)
async def end_session(
    session_id: str,
    payload: SessionEndRequest,
    current_user: PostgresUser = Depends(get_current_user),
    repo: PostgresSessionLogRepository = Depends(get_postgres_session_log_repository),
):
    """
    Close an open session and compute its duration.
    """
    logger.info(f"[Session] Ending session id={session_id} break_reminder={payload.break_reminder_sent}")

    user_id = current_user.id
    updated = await repo.end_session(
        session_id=session_id,
        user_id=user_id,
        break_reminder_sent=payload.break_reminder_sent,
    )

    if not updated:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")

    return SessionLogResponse(
        _id=str(updated["id"]),
        user_id=updated["user_id"],
        started_at=updated["started_at"],
        ended_at=updated.get("ended_at"),
        duration_seconds=updated.get("duration_seconds"),
        break_reminder_sent=updated.get("break_reminder_sent", False),
        active_topic=updated.get("active_topic"),
    )


@router.get("/{user_id}/summary", response_model=SessionSummary)
async def get_session_summary(
    user_id: str,
    current_user: PostgresUser = Depends(get_current_user),
    repo: PostgresSessionLogRepository = Depends(get_postgres_session_log_repository),
):
    """Aggregated session stats for the Progress Report dashboard."""
    user_id = current_user.id
    logger.info(f"[Session] Summary requested for user={user_id}")
    summary = await repo.get_summary(user_id)
    return SessionSummary(**summary)


@router.get("/{user_id}/active")
async def get_active_session(
    user_id: str,
    current_user: PostgresUser = Depends(get_current_user),
    repo: PostgresSessionLogRepository = Depends(get_postgres_session_log_repository),
):
    """Return the most recent unclosed session for a user."""
    user_id = current_user.id
    doc = await repo.get_active_session(user_id)
    if not doc:
        return {"active_session": None}
    return {"active_session": doc}
