# backend/api/lessons.py
"""
Lesson Media API - Controller layer

Endpoints:
  GET  /lessons/{id}/media           — Get lesson with media assets
  POST /lessons/{id}/media           — Upload media for a lesson
  GET  /lessons/{id}/progress        — Get user's lesson progress
  PUT  /lessons/{id}/progress        — Update lesson progress
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from typing import Optional, List
import logging
import uuid

from models.lesson_media import (
    LessonWithMedia,
    LessonProgressResponse,
    LessonProgressStatus,
    StepProgress,
    MediaUploadResponse,
)
from models.course_model import Lesson
from repositories.lesson_media_repository import (
    LessonMediaRepository,
    get_lesson_media_repository,
)
from repositories.course_repository import CourseRepository, get_course_repository
from services.lesson_media_service import LessonMediaService, get_lesson_media_service
from core.base_router import BaseAPIRouter

router = BaseAPIRouter(prefix="/lessons", tags=["Lesson Media"])
logger = logging.getLogger(__name__)

MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50MB


@router.get("/{lesson_id}/media")
async def get_lesson_with_media(
    lesson_id: str,
    course_id: Optional[str] = Query(None, description="Course ID for context"),
    media_repo: LessonMediaRepository = Depends(get_lesson_media_repository),
    course_repo: CourseRepository = Depends(get_course_repository),
):
    """
    Get lesson data enriched with all associated media assets.

    Returns video, images, audio, and generated media for the lesson.
    """
    lesson_data = None

    if course_id:
        lesson_data = await course_repo.get_lesson(course_id, lesson_id)

    if not lesson_data:
        lesson_data = {
            "lesson_id": lesson_id,
            "title": f"Lesson {lesson_id[:8]}",
            "description": None,
        }

    media_assets = await media_repo.get_media_by_lesson(
        lesson_id=lesson_id,
        course_id=course_id
    )

    video_url = None
    video_thumbnail = None
    video_duration = None
    images = []

    for asset in media_assets:
        public_url = asset.get("public_url") or asset.get("path", "")
        asset_type = asset.get("type", "")

        if asset_type == "video":
            video_url = public_url
            video_duration = asset.get("metadata", {}).get("duration_seconds")
        elif asset_type == "image":
            images.append(public_url)

    return LessonWithMedia(
        lesson_id=lesson_id,
        title=lesson_data.get("title", ""),
        description=lesson_data.get("description"),
        video_url=video_url,
        video_thumbnail=video_thumbnail,
        video_duration_seconds=video_duration,
        images=images,
        generated_media=[
            {
                "asset_id": a["asset_id"],
                "course_id": a["course_id"],
                "lesson_id": a["lesson_id"],
                "section_id": a.get("section_id"),
                "asset_key": a["asset_key"],
                "bucket": a["bucket"],
                "path": a["path"],
                "type": a["type"],
                "status": a["status"],
                "public_url": a.get("public_url"),
                "provider": a.get("provider", "supabase"),
                "metadata": a.get("metadata", {}),
            }
            for a in media_assets
        ],
        ar_reference=lesson_data.get("arReference"),
    )


@router.post("/{lesson_id}/media", response_model=MediaUploadResponse, status_code=201)
async def upload_lesson_media(
    lesson_id: str,
    course_id: str = Form(..., description="Course ID"),
    section_id: Optional[str] = Form(None, description="Section ID"),
    media_type: str = Form(..., description="Media type: video, image, audio"),
    file: UploadFile = File(..., description="Media file"),
    media_repo: LessonMediaRepository = Depends(get_lesson_media_repository),
    media_service: LessonMediaService = Depends(get_lesson_media_service),
):
    """
    Upload media file for a lesson.

    Supports video, image, and audio files up to 50MB.
    Files are stored in Supabase Storage or locally.
    """
    content = await file.read()

    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size: {MAX_UPLOAD_SIZE // (1024*1024)}MB"
        )

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    content_type = file.content_type or "application/octet-stream"
    filename = file.filename or f"{uuid.uuid4()}"

    logger.info(
        f"[LessonMedia] Uploading: lesson={lesson_id} type={media_type} "
        f"size={len(content)} filename={filename}"
    )

    try:
        asset_record = await media_service.upload_media(
            file_content=content,
            filename=filename,
            content_type=content_type,
            lesson_id=lesson_id,
            course_id=course_id,
            section_id=section_id,
            media_type=media_type,
            metadata={"original_filename": filename},
        )

        asset_id = await media_repo.create_media_asset(asset_record)

        return MediaUploadResponse(
            asset_id=asset_id,
            bucket=asset_record["bucket"],
            path=asset_record["path"],
            public_url=asset_record.get("public_url"),
            type=media_type,
            status="ready",
            metadata=asset_record.get("metadata", {}),
        )

    except Exception as e:
        logger.error(f"[LessonMedia] Upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.delete("/{lesson_id}/media/{asset_id}")
async def delete_lesson_media(
    lesson_id: str,
    asset_id: str,
    media_repo: LessonMediaRepository = Depends(get_lesson_media_repository),
    media_service: LessonMediaService = Depends(get_lesson_media_service),
):
    """Delete a media asset from a lesson."""
    asset = await media_repo.get_media_asset(asset_id)

    if not asset:
        raise HTTPException(status_code=404, detail="Media asset not found")

    if asset["lesson_id"] != lesson_id:
        raise HTTPException(status_code=400, detail="Asset does not belong to this lesson")

    await media_service.delete_media(asset_id, asset["path"])
    deleted = await media_repo.delete_media_asset(asset_id)

    if not deleted:
        raise HTTPException(status_code=500, detail="Failed to delete asset record")

    return {"message": "Media asset deleted", "asset_id": asset_id}


@router.get("/{lesson_id}/progress", response_model=LessonProgressResponse)
async def get_lesson_progress(
    lesson_id: str,
    user_id: str,
    course_repo: CourseRepository = Depends(get_course_repository),
):
    """
    Get user's progress through a specific lesson.

    Includes step-by-step progress, scores, and completion status.
    """
    session_data = await course_repo.get_lesson_session(user_id, course_id="", lesson_id=lesson_id)

    if not session_data:
        return LessonProgressResponse(
            lesson_id=lesson_id,
            user_id=user_id,
            status=LessonProgressStatus.NOT_STARTED,
        )

    steps = []
    for step in session_data.get("steps", []):
        steps.append(StepProgress(
            step_id=step.get("step_id", ""),
            step_type=step.get("step_type", "unknown"),
            status=step.get("status", LessonProgressStatus.NOT_STARTED),
            best_score=step.get("best_score", 0),
            attempts=step.get("attempts", 0),
            completed=step.get("passed", False),
            started_at=step.get("started_at"),
            completed_at=step.get("completed_at"),
        ))

    status_map = {
        "started": LessonProgressStatus.IN_PROGRESS,
        "completed": LessonProgressStatus.COMPLETED,
    }

    return LessonProgressResponse(
        lesson_id=lesson_id,
        user_id=user_id,
        status=status_map.get(session_data.get("status", "started"), LessonProgressStatus.IN_PROGRESS),
        current_step_index=session_data.get("current_step_index", 0),
        progress_percent=session_data.get("progress_percent", 0),
        steps=steps,
        total_time_seconds=session_data.get("total_time_seconds", 0),
        started_at=session_data.get("started_at"),
        last_activity_at=session_data.get("updated_at"),
        completed_at=session_data.get("completed_at"),
    )


@router.put("/{lesson_id}/progress", response_model=LessonProgressResponse)
async def update_lesson_progress(
    lesson_id: str,
    user_id: str,
    course_id: str,
    current_step_index: int = 0,
    progress_percent: int = 0,
    current_step_id: Optional[str] = None,
    course_repo: CourseRepository = Depends(get_course_repository),
):
    """Update lesson progress (called from lesson session)."""
    from datetime import datetime

    session_data = await course_repo.get_lesson_session(user_id, course_id, lesson_id)

    if not session_data:
        import uuid
        session_data = {
            "session_id": str(uuid.uuid4()),
            "user_id": user_id,
            "course_id": course_id,
            "lesson_id": lesson_id,
            "status": "started",
            "current_step_id": current_step_id,
            "current_step_index": current_step_index,
            "progress_percent": progress_percent,
            "steps": [],
            "started_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
    else:
        session_data["current_step_index"] = current_step_index
        session_data["progress_percent"] = progress_percent
        session_data["current_step_id"] = current_step_id
        session_data["updated_at"] = datetime.utcnow()

    await course_repo.upsert_lesson_session(session_data)

    steps = [
        StepProgress(
            step_id=step.get("step_id", ""),
            step_type=step.get("step_type", "unknown"),
            status=step.get("status", LessonProgressStatus.NOT_STARTED),
            best_score=step.get("best_score", 0),
            attempts=step.get("attempts", 0),
            completed=step.get("passed", False),
        )
        for step in session_data.get("steps", [])
    ]

    return LessonProgressResponse(
        lesson_id=lesson_id,
        user_id=user_id,
        status=LessonProgressStatus.IN_PROGRESS,
        current_step_index=current_step_index,
        progress_percent=progress_percent,
        steps=steps,
        total_time_seconds=session_data.get("total_time_seconds", 0),
        started_at=session_data.get("started_at"),
        last_activity_at=session_data.get("updated_at"),
    )
