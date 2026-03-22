# backend/api/sessions.py
"""
Session Log API - Controller layer
POST  /sessions/start                  — open a new session log
PATCH /sessions/{session_id}/end       — close session, compute duration
GET   /sessions/{user_id}/summary      — aggregated stats for Progress Report
GET   /sessions/{user_id}/active       — get currently open session (if any)
"""
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
import logging

from models.session_log import (
    SessionStartRequest,
    SessionEndRequest,
    SessionLogResponse,
    SessionSummary,
)
from repositories.session_log_repository import (
    SessionLogRepository,
    get_session_log_repository,
)
from models.user_mongo import UserDocument
from core.security import get_current_user

router = APIRouter(prefix="/sessions", tags=["Sessions"])
logger = logging.getLogger(__name__)


@router.post("/start", response_model=SessionLogResponse, status_code=201)
async def start_session(
    payload: SessionStartRequest,
    current_user: UserDocument = Depends(get_current_user),
    repo: SessionLogRepository = Depends(get_session_log_repository),
):
    """
    Open a new learning session.
    Called by useSessionTimer hook when the learner enters the app.
    Returns the new session document (id needed to call /end).
    """
    user_id = str(current_user.id)
    logger.info(f"[Session] Starting session for user={user_id} topic={payload.active_topic}")

    session_id = await repo.create_session(
        user_id=user_id,
        active_topic=payload.active_topic,
    )

    # Fetch the freshly created document to return it
    doc = await repo.collection.find_one({"_id": ObjectId(session_id)})
    if not doc:
        raise HTTPException(status_code=500, detail="Session created but could not be retrieved")

    doc["_id"] = str(doc["_id"])
    return SessionLogResponse(**{
        "_id": doc["_id"],
        "user_id": doc["user_id"],
        "started_at": doc["started_at"],
        "ended_at": doc.get("ended_at"),
        "duration_seconds": doc.get("duration_seconds"),
        "break_reminder_sent": doc.get("break_reminder_sent", False),
        "active_topic": doc.get("active_topic"),
    })


@router.patch("/{session_id}/end", response_model=SessionLogResponse)
async def end_session(
    session_id: str,
    payload: SessionEndRequest,
    current_user: UserDocument = Depends(get_current_user),
    repo: SessionLogRepository = Depends(get_session_log_repository),
):
    """
    Close an open session and compute its duration.
    Called by useSessionTimer hook on unmount / BreakReminder confirmation.
    """
    logger.info(f"[Session] Ending session id={session_id} break_reminder={payload.break_reminder_sent}")

    user_id = str(current_user.id)
    updated = await repo.end_session(
        session_id=session_id,
        user_id=user_id,
        break_reminder_sent=payload.break_reminder_sent,
    )

    if not updated:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")

    return SessionLogResponse(**{
        "_id": updated["_id"],
        "user_id": updated["user_id"],
        "started_at": updated["started_at"],
        "ended_at": updated.get("ended_at"),
        "duration_seconds": updated.get("duration_seconds"),
        "break_reminder_sent": updated.get("break_reminder_sent", False),
        "active_topic": updated.get("active_topic"),
    })


@router.get("/{user_id}/summary", response_model=SessionSummary)
async def get_session_summary(
    user_id: str,
    current_user: UserDocument = Depends(get_current_user),
    repo: SessionLogRepository = Depends(get_session_log_repository),
):
    """
    Aggregated session stats for the Progress Report dashboard.
    Returns totals, average, longest session, and most studied topic.
    """
    user_id = str(current_user.id)
    logger.info(f"[Session] Summary requested for user={user_id}")

    summary = await repo.get_summary(user_id)
    return SessionSummary(**summary)


@router.get("/{user_id}/active")
async def get_active_session(
    user_id: str,
    current_user: UserDocument = Depends(get_current_user),
    repo: SessionLogRepository = Depends(get_session_log_repository),
):
    """
    Return the most recent unclosed session for a user, or null.
    Used by the frontend to resume session tracking after page reload.
    """
    user_id = str(current_user.id)
    doc = await repo.get_active_session(user_id)
    if not doc:
        return {"active_session": None}
    return {"active_session": doc}
