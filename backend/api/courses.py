from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from models.course_model import (
    CompleteLessonRequest,
    CourseSchema,
    LessonSchema,
    LessonSession,
    LessonSessionRequest,
    LessonStepAttemptRequest,
    QuizSubmitRequest,
    StartCourseRequest,
    UserProgress,
)
from models.quiz_activity import QuizActivityAnswerRequest, QuizActivityAnswerResult, QuizActivityHydration
from models.game_activity import MiniGameActivityHydration, MiniGameCompleteRequest, MiniGameCompleteResult
from models.vocabulary_activity import VocabularyActivityHydration
from repositories.postgres_user_repository import PostgresUser
from core.security import get_current_user
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


@router.get("/courses/{course_id}/lessons/{lesson_id}", response_model=LessonSchema)
async def get_lesson(
    course_id: str,
    lesson_id: str,
    service: CourseService = Depends(get_course_service),
):
    lesson = await service.get_lesson(course_id, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson


@router.get("/courses/{course_id}/lessons/{lesson_id}/media")
async def get_lesson_media(
    course_id: str,
    lesson_id: str,
    current_user: PostgresUser = Depends(get_current_user),
    service: CourseService = Depends(get_course_service),
):
    try:
        return await service.get_lesson_media(course_id, lesson_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/courses/{course_id}/lessons/{lesson_id}/session", response_model=LessonSession)
async def get_lesson_session(
    course_id: str,
    lesson_id: str,
    current_user: PostgresUser = Depends(get_current_user),
    service: CourseService = Depends(get_course_service),
):
    user_id = current_user.id
    try:
        return await service.get_lesson_session(user_id, course_id, lesson_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/courses/{course_id}/lessons/{lesson_id}/session/start", response_model=LessonSession)
async def start_lesson_session(
    course_id: str,
    lesson_id: str,
    current_user: PostgresUser = Depends(get_current_user),
    service: CourseService = Depends(get_course_service),
):
    user_id = current_user.id
    try:
        return await service.start_lesson_session(user_id, course_id, lesson_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/courses/{course_id}/lessons/{lesson_id}/steps/attempt", response_model=LessonSession)
async def submit_lesson_step(
    course_id: str,
    lesson_id: str,
    payload: LessonStepAttemptRequest,
    current_user: PostgresUser = Depends(get_current_user),
    service: CourseService = Depends(get_course_service),
):
    user_id = current_user.id
    try:
        return await service.submit_lesson_step(
            user_id,
            course_id,
            lesson_id,
            payload.step_id,
            payload.attempt_type,
            payload.passed,
            payload.score,
            payload.response_data,
            payload.mastery_words,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/courses/{course_id}/lessons/{lesson_id}/activities/{activity_id}/quiz", response_model=QuizActivityHydration)
async def get_quiz_activity(
    course_id: str, lesson_id: str, activity_id: str,
    current_user: PostgresUser = Depends(get_current_user),
    service: CourseService = Depends(get_course_service),
):
    try:
        return await service.get_quiz_activity(current_user.id, course_id, lesson_id, activity_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/courses/{course_id}/lessons/{lesson_id}/activities/{activity_id}/quiz/answers", response_model=QuizActivityAnswerResult)
async def submit_quiz_activity_answer(
    course_id: str, lesson_id: str, activity_id: str, payload: QuizActivityAnswerRequest,
    current_user: PostgresUser = Depends(get_current_user),
    service: CourseService = Depends(get_course_service),
):
    try:
        return await service.submit_quiz_activity_answer(current_user.id, course_id, lesson_id, activity_id, payload.question_id, payload.option_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get(
    "/courses/{course_id}/lessons/{lesson_id}/activities/{activity_id}/vocabulary",
    response_model=VocabularyActivityHydration,
)
async def get_vocabulary_activity(
    course_id: str,
    lesson_id: str,
    activity_id: str,
    current_user: PostgresUser = Depends(get_current_user),
    service: CourseService = Depends(get_course_service),
):
    try:
        return await service.get_vocabulary_activity(
            current_user.id, course_id, lesson_id, activity_id
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

@router.get('/courses/{course_id}/lessons/{lesson_id}/activities/{activity_id}/mini-game', response_model=MiniGameActivityHydration)
async def get_mini_game_activity(course_id: str, lesson_id: str, activity_id: str, current_user: PostgresUser = Depends(get_current_user), service: CourseService = Depends(get_course_service)):
    try: return await service.get_mini_game_activity(current_user.id, course_id, lesson_id, activity_id)
    except ValueError as exc: raise HTTPException(status_code=404, detail=str(exc)) from exc

@router.post('/courses/{course_id}/lessons/{lesson_id}/activities/{activity_id}/mini-game/complete', response_model=MiniGameCompleteResult)
async def complete_mini_game_activity(course_id: str, lesson_id: str, activity_id: str, payload: MiniGameCompleteRequest, current_user: PostgresUser = Depends(get_current_user), service: CourseService = Depends(get_course_service)):
    try: return await service.complete_mini_game_activity(current_user.id, course_id, lesson_id, activity_id, payload.matched_pair_ids)
    except ValueError as exc: raise HTTPException(status_code=400, detail=str(exc)) from exc


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
    current_user: PostgresUser = Depends(get_current_user),
    service: CourseService = Depends(get_course_service),
):
    current_user_id = current_user.id
    if payload.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Cannot start a course for another user")
    try:
        return await service.start_course(current_user_id, course_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/lessons/{lesson_id}/complete")
async def complete_lesson(
    lesson_id: str,
    payload: CompleteLessonRequest,
    current_user: PostgresUser = Depends(get_current_user),
    service: CourseService = Depends(get_course_service),
):
    user_id = current_user.id
    try:
        return await service.complete_lesson(
            user_id,
            payload.course_id,
            lesson_id,
            score=payload.score,
            time_spent=payload.time_spent,
            words_learned=payload.words_learned,
            pronunciation_scores=payload.pronunciation_scores,
            games_played=payload.games_played,
            completed_steps=payload.completed_steps,
        )
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
    # quiz_id currently maps to a lesson_id; a separate quiz collection can be added later.
    lesson_id = payload.lesson_id or quiz_id
    try:
        return await service.submit_quiz(payload.user_id, payload.course_id, lesson_id, payload.answers)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/users/{user_id}/progress", response_model=List[UserProgress])
async def get_user_progress(
    user_id: str,
    current_user: PostgresUser = Depends(get_current_user),
    service: CourseService = Depends(get_course_service),
):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot access progress for another user")
    return await service.get_user_progress(user_id)
