"""
Parental Controls API Router - Controller Layer
Handles HTTP for learning paths, time limits, and usage.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from services.parental_controls_service import (
    ParentalControlsService,
    get_parental_controls_service
)

router = APIRouter(prefix="/parental", tags=["parental-controls"])


# ========== REQUEST SCHEMAS ==========

class SetTimeLimitRequest(BaseModel):
    child_id: str
    time_limit_mins: int  # 0 = unlimited


class SetLearningPathRequest(BaseModel):
    child_id: str
    priority_topics: List[str]


class SetBreakReminderRequest(BaseModel):
    child_id: str
    break_mins: int


class LogSessionRequest(BaseModel):
    child_id: str
    session_mins: int


# ========== ENDPOINTS ==========

@router.get("/controls/{child_id}")
async def get_controls(
    child_id: str,
    service: ParentalControlsService = Depends(get_parental_controls_service)
):
    """Get all parental controls for a child"""
    return await service.get_controls(child_id)


@router.post("/time-limit")
async def set_time_limit(
    request: SetTimeLimitRequest,
    service: ParentalControlsService = Depends(get_parental_controls_service)
):
    """
    Set daily time limit for child.
    Set to 0 for unlimited.
    """
    result = await service.set_time_limit(request.child_id, request.time_limit_mins)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result


@router.post("/learning-path")
async def set_learning_path(
    request: SetLearningPathRequest,
    service: ParentalControlsService = Depends(get_parental_controls_service)
):
    """
    Set learning path priorities.
    Topics in the list will be prioritized in order.
    """
    return await service.set_learning_path(request.child_id, request.priority_topics)


@router.post("/break-reminder")
async def set_break_reminder(
    request: SetBreakReminderRequest,
    service: ParentalControlsService = Depends(get_parental_controls_service)
):
    """
    Set break reminder interval.
    Child will be reminded to take a break after this many minutes.
    """
    result = await service.set_break_reminder(request.child_id, request.break_mins)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result


@router.get("/check-limit/{child_id}")
async def check_time_limit(
    child_id: str,
    service: ParentalControlsService = Depends(get_parental_controls_service)
):
    """
    Check if child has reached their daily time limit.
    Returns remaining time and limit status.
    """
    return await service.check_time_limit(child_id)


@router.post("/log-session")
async def log_session(
    request: LogSessionRequest,
    service: ParentalControlsService = Depends(get_parental_controls_service)
):
    """
    Log a learning session.
    Returns updated time limit status.
    """
    return await service.log_session(request.child_id, request.session_mins)


@router.get("/recommendations/{child_id}")
async def get_recommendations(
    child_id: str,
    service: ParentalControlsService = Depends(get_parental_controls_service)
):
    """
    Get recommended content based on learning path priorities.
    """
    return await service.get_recommended_content(child_id)
