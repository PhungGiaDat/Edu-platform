# backend/api/course_lessons.py
"""
CourseLesson API - Controller layer for CourseLesson Beanie Document

Endpoints:
  GET  /course-lessons                          — List all lessons (filterable by course, status)
  POST /course-lessons                         — Create a new lesson
  GET  /course-lessons/{lesson_id}             — Get lesson by lesson_id
  PUT  /course-lessons/{lesson_id}             — Update lesson fields
  DELETE /course-lessons/{lesson_id}           — Archive (soft-delete) lesson
  POST /course-lessons/{lesson_id}/publish     — Publish lesson
  GET  /course-lessons/course/{course_id}      — Get all lessons for a course
  POST /course-lessons/{lesson_id}/vocabulary  — Add vocabulary item to lesson
"""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from models.course_lesson import (
    CourseLesson,
    LessonStatus,
    LessonType,
    MediaAsset,
    VocabularyItem,
)
from repositories.course_lesson_repository import get_course_lesson_repository, CourseLessonRepository
from core.security import get_current_user
from repositories.postgres_user_repository import PostgresUser


router = APIRouter(prefix="/course-lessons", tags=["Course Lessons"])


# ─── Helpers ───────────────────────────────────────────────────────────────────

def _lesson_not_found(lesson_id: str) -> HTTPException:
    return HTTPException(status_code=404, detail=f"Lesson not found: {lesson_id}")


def _require_lesson(
    lesson: Optional[CourseLesson],
    lesson_id: str,
) -> CourseLesson:
    if lesson is None:
        raise _lesson_not_found(lesson_id)
    return lesson


# ─── CRUD Endpoints ────────────────────────────────────────────────────────────

@router.get("", response_model=List[CourseLesson])
async def list_lessons(
    course_id: Optional[str] = Query(None, description="Filter by course ID"),
    status: Optional[LessonStatus] = Query(None, description="Filter by status"),
    lesson_type: Optional[LessonType] = Query(None, description="Filter by lesson type"),
    skip: int = Query(0, ge=0, description="Skip N records"),
    limit: int = Query(20, ge=1, le=100, description="Limit results"),
    repo: CourseLessonRepository = Depends(get_course_lesson_repository),
):
    """
    List all course lessons, optionally filtered by course, status, or type.
    """
    if course_id:
        return await repo.get_course_lessons(
            course_id=course_id,
            status=status,
            lesson_type=lesson_type,
            skip=skip,
            limit=limit,
        )
    # Fallback: search across all lessons (no course_id filter)
    if status or lesson_type:
        # Use search_lessons with empty query to filter
        return await repo.search_lessons(
            query_text="",
            status=status,
            lesson_type=lesson_type,
            limit=limit,
        )
    # No filters: return published lessons paginated
    cursor = repo.collection.find({}).skip(skip).limit(limit).sort("+order")
    docs = await cursor.to_list(length=limit)
    return [CourseLesson(**d) for d in docs]


@router.post("", response_model=CourseLesson, status_code=201)
async def create_lesson(
    course_id: str,
    lesson_id: str,
    title: str,
    title_vi: str = "",
    description: Optional[str] = None,
    order: int = 0,
    lesson_type: LessonType = LessonType.MIXED,
    duration_minutes: int = 5,
    xp_reward: int = 50,
    current_user: PostgresUser = Depends(get_current_user),
    repo: CourseLessonRepository = Depends(get_course_lesson_repository),
):
    """
    Create a new course lesson document.
    """
    existing = await repo.get_lesson(lesson_id)
    if existing:
        raise HTTPException(status_code=409, detail=f"Lesson already exists: {lesson_id}")

    lesson = await repo.create_lesson(
        lesson_id=lesson_id,
        course_id=course_id,
        title=title,
        title_vi=title_vi,
        description=description,
        order=order,
        lesson_type=lesson_type,
        created_by=current_user.id,
        duration_minutes=duration_minutes,
        xp_reward=xp_reward,
        status=LessonStatus.DRAFT,
    )
    return lesson


@router.get("/course/{course_id}", response_model=List[CourseLesson])
async def get_course_lessons(
    course_id: str,
    status: Optional[LessonStatus] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    repo: CourseLessonRepository = Depends(get_course_lesson_repository),
):
    """
    Get all lessons for a specific course, ordered by the 'order' field.
    """
    return await repo.get_course_lessons(
        course_id=course_id,
        status=status,
        skip=skip,
        limit=limit,
    )


@router.get("/{lesson_id}", response_model=CourseLesson)
async def get_lesson(
    lesson_id: str,
    repo: CourseLessonRepository = Depends(get_course_lesson_repository),
):
    """
    Retrieve a single lesson by its lesson_id.
    """
    lesson = await repo.get_lesson(lesson_id)
    return _require_lesson(lesson, lesson_id)


@router.put("/{lesson_id}", response_model=CourseLesson)
async def update_lesson(
    lesson_id: str,
    title: Optional[str] = None,
    title_vi: Optional[str] = None,
    description: Optional[str] = None,
    order: Optional[int] = None,
    lesson_type: Optional[LessonType] = None,
    duration_minutes: Optional[int] = None,
    xp_reward: Optional[int] = None,
    current_user: PostgresUser = Depends(get_current_user),
    repo: CourseLessonRepository = Depends(get_course_lesson_repository),
):
    """
    Update mutable fields on a lesson. Only non-None values are applied.
    """
    lesson = await repo.get_lesson(lesson_id)
    _require_lesson(lesson, lesson_id)

    updates = {
        k: v for k, v in {
            "title": title,
            "title_vi": title_vi,
            "description": description,
            "order": order,
            "lesson_type": lesson_type,
            "duration_minutes": duration_minutes,
            "xp_reward": xp_reward,
        }.items()
        if v is not None
    }
    updates["updated_by"] = current_user.id

    updated = await repo.update_lesson(lesson_id, **updates)
    return _require_lesson(updated, lesson_id)


@router.delete("/{lesson_id}")
async def delete_lesson(
    lesson_id: str,
    repo: CourseLessonRepository = Depends(get_course_lesson_repository),
):
    """
    Archive (soft-delete) a lesson.
    """
    lesson = await repo.get_lesson(lesson_id)
    _require_lesson(lesson, lesson_id)
    deleted = await repo.delete_lesson(lesson_id)
    if not deleted:
        raise HTTPException(status_code=500, detail="Failed to archive lesson")
    return {"message": "Lesson archived", "lesson_id": lesson_id}


# ─── Status Management ────────────────────────────────────────────────────────

@router.post("/{lesson_id}/publish", response_model=CourseLesson)
async def publish_lesson(
    lesson_id: str,
    repo: CourseLessonRepository = Depends(get_course_lesson_repository),
):
    """
    Publish a lesson (changes status to PUBLISHED).
    """
    lesson = await repo.get_lesson(lesson_id)
    _require_lesson(lesson, lesson_id)
    published = await repo.publish_lesson(lesson_id)
    return _require_lesson(published, lesson_id)


@router.post("/{lesson_id}/archive", response_model=CourseLesson)
async def archive_lesson(
    lesson_id: str,
    repo: CourseLessonRepository = Depends(get_course_lesson_repository),
):
    """
    Archive a lesson (changes status to ARCHIVED).
    """
    lesson = await repo.get_lesson(lesson_id)
    _require_lesson(lesson, lesson_id)
    archived = await repo.archive_lesson(lesson_id)
    return _require_lesson(archived, lesson_id)


# ─── Vocabulary ──────────────────────────────────────────────────────────────

class AddVocabularyRequest(VocabularyItem):
    """Allow vocabulary item fields in request body."""
    pass


@router.post("/{lesson_id}/vocabulary", response_model=CourseLesson)
async def add_vocabulary_item(
    lesson_id: str,
    payload: AddVocabularyRequest,
    repo: CourseLessonRepository = Depends(get_course_lesson_repository),
):
    """
    Append a vocabulary item to an existing lesson.
    """
    lesson = await repo.get_lesson(lesson_id)
    _require_lesson(lesson, lesson_id)

    vocab_item = VocabularyItem(
        word_id=payload.word_id,
        word_en=payload.word_en,
        word_vi=payload.word_vi,
        image=payload.image,
        audio=payload.audio,
        pronunciation=payload.pronunciation,
        difficulty=payload.difficulty,
    )

    updated = await repo.add_vocabulary_item(lesson_id, vocab_item)
    return _require_lesson(updated, lesson_id)


# ─── Statistics ───────────────────────────────────────────────────────────────

@router.get("/{lesson_id}/stats")
async def get_lesson_stats(
    lesson_id: str,
    repo: CourseLessonRepository = Depends(get_course_lesson_repository),
):
    """
    Get aggregated statistics for a lesson.
    """
    lesson = await repo.get_lesson(lesson_id)
    _require_lesson(lesson, lesson_id)
    return {
        "lesson_id": lesson_id,
        "total_attempts": lesson.total_attempts,
        "completion_rate": lesson.completion_rate,
        "average_score": lesson.average_score,
        "vocabulary_count": len(lesson.vocabulary_items),
    }
