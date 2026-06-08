from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from models.course_model import (
    CompleteLessonRequest,
    CourseSchema,
    QuizSubmitRequest,
    StartCourseRequest,
    UserProgress,
)
from services.course_service import CourseService, get_course_service


router = APIRouter()


class GenerateCourseRequest(BaseModel):
    seed_name: Optional[str] = None
    course: Optional[Dict[str, Any]] = None


@router.get("/courses", response_model=List[CourseSchema])
async def get_courses(
    skip: int = 0,
    limit: int = 20,
    service: CourseService = Depends(get_course_service),
):
    return await service.get_courses(skip, limit)


@router.get("/courses/{course_id}", response_model=CourseSchema)
async def get_course(
    course_id: str,
    service: CourseService = Depends(get_course_service),
):
    course = await service.get_course_by_id(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.get("/courses/{course_id}/lessons/{lesson_id}")
async def get_lesson(
    course_id: str,
    lesson_id: str,
    service: CourseService = Depends(get_course_service),
):
    lesson = await service.get_lesson(course_id, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson


@router.post("/courses/generate", response_model=CourseSchema)
async def generate_course(
    payload: Optional[GenerateCourseRequest] = None,
    service: CourseService = Depends(get_course_service),
):
    try:
        return await service.generate_sample_course(
            seed_name=payload.seed_name if payload else None,
            payload=payload.course if payload else None,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/courses/{course_id}/start")
async def start_course(
    course_id: str,
    payload: StartCourseRequest,
    service: CourseService = Depends(get_course_service),
):
    try:
        return await service.start_course(payload.user_id, course_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/lessons/{lesson_id}/complete")
async def complete_lesson(
    lesson_id: str,
    payload: CompleteLessonRequest,
    service: CourseService = Depends(get_course_service),
):
    try:
        return await service.complete_lesson(payload.user_id, payload.course_id, lesson_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/courses/{course_id}/lessons/{lesson_id}/complete")
async def complete_lesson_legacy(
    course_id: str,
    lesson_id: str,
    payload: StartCourseRequest,
    service: CourseService = Depends(get_course_service),
):
    try:
        return await service.complete_lesson(payload.user_id, course_id, lesson_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/quizzes/{quiz_id}/submit")
async def submit_quiz(
    quiz_id: str,
    payload: QuizSubmitRequest,
    service: CourseService = Depends(get_course_service),
):
    # quiz_id maps to a lesson_id in Phase 1; a separate quiz collection can be added later.
    lesson_id = payload.lesson_id or quiz_id
    try:
        return await service.submit_quiz(payload.user_id, payload.course_id, lesson_id, payload.answers)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/users/{user_id}/progress", response_model=List[UserProgress])
async def get_user_progress(
    user_id: str,
    service: CourseService = Depends(get_course_service),
):
    return await service.get_user_progress(user_id)
