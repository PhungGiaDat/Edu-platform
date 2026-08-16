"""Focused course-start semantics tests."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from api.courses import get_user_progress, start_course
from models.course_model import StartCourseRequest
from services.course_service import CourseService


def _course():
    return {
        "course_id": "course-1",
        "lessons": [{"lesson_id": "lesson-1"}, {"lesson_id": "lesson-2"}],
    }


@pytest.mark.asyncio
async def test_start_course_creates_initial_progress_once():
    repo = SimpleNamespace(
        get_by_course_id=AsyncMock(return_value=_course()),
        get_one_progress=AsyncMock(return_value=None),
        upsert_progress=AsyncMock(return_value=True),
    )
    service = CourseService()
    service.repo = repo

    result = await service.start_course("user-1", "course-1")

    assert result["current_lesson_id"] == "lesson-1"
    assert result["completed_lessons"] == []
    assert [item["lesson_id"] for item in result["lesson_progress"]] == ["lesson-1", "lesson-2"]
    repo.upsert_progress.assert_awaited_once_with("user-1", "course-1", result)


@pytest.mark.asyncio
async def test_start_course_reuses_existing_progress_without_resetting_it():
    existing = {
        "user_id": "user-1",
        "course_id": "course-1",
        "status": "started",
        "current_lesson_id": "lesson-2",
        "completed_lessons": ["lesson-1"],
        "lesson_progress": [{"lesson_id": "lesson-1", "status": "completed"}],
        "total_xp": 10,
        "rewards": [],
    }
    repo = SimpleNamespace(
        get_by_course_id=AsyncMock(return_value=_course()),
        get_one_progress=AsyncMock(return_value=existing),
        upsert_progress=AsyncMock(return_value=True),
    )
    service = CourseService()
    service.repo = repo

    result = await service.start_course("user-1", "course-1")

    assert result is existing
    assert result["current_lesson_id"] == "lesson-2"
    assert result["completed_lessons"] == ["lesson-1"]
    repo.upsert_progress.assert_awaited_once_with("user-1", "course-1", existing)


@pytest.mark.asyncio
async def test_start_route_rejects_a_payload_for_another_user():
    service = SimpleNamespace(start_course=AsyncMock())

    with pytest.raises(HTTPException) as exc_info:
        await start_course(
            "course-1",
            StartCourseRequest(user_id="another-user"),
            SimpleNamespace(id="user-1"),
            service,
        )

    assert exc_info.value.status_code == 403
    service.start_course.assert_not_awaited()


@pytest.mark.asyncio
async def test_progress_route_rejects_another_users_progress():
    service = SimpleNamespace(get_user_progress=AsyncMock())

    with pytest.raises(HTTPException) as exc_info:
        await get_user_progress("another-user", SimpleNamespace(id="user-1"), service)

    assert exc_info.value.status_code == 403
    service.get_user_progress.assert_not_awaited()
