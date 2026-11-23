"""Regression coverage for nullable persisted lesson-step update timestamps."""

from copy import deepcopy
from datetime import datetime
from json import loads
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.courses import router
from core.security import get_current_user
from services.course_service import CourseService, _build_session, get_course_service


COURSE_ID = "course-1"
LESSON_ID = "lesson-1"
USER_ID = "learner-1"


class InMemoryLessonSessionRepository:
    def __init__(self, course: dict[str, Any], lesson: dict[str, Any], session: dict[str, Any]) -> None:
        self.course = course
        self.lesson = lesson
        self.session = session
        self.progress: dict[str, Any] | None = None
        self.attempts: list[dict[str, Any]] = []

    async def get_by_course_id(self, course_id: str) -> dict[str, Any] | None:
        return deepcopy(self.course) if course_id == self.course["course_id"] else None

    async def get_one_progress(self, user_id: str, course_id: str) -> dict[str, Any] | None:
        return deepcopy(self.progress)

    async def upsert_progress(self, user_id: str, course_id: str, progress: dict[str, Any]) -> bool:
        self.progress = deepcopy(progress)
        return True

    async def get_lesson(self, course_id: str, lesson_id: str) -> dict[str, Any] | None:
        return deepcopy(self.lesson) if (course_id, lesson_id) == (self.course["course_id"], self.lesson["lesson_id"]) else None

    async def upsert_media_assets(self, assets: list[dict[str, Any]]) -> None:
        return None

    async def get_lesson_session(self, user_id: str, course_id: str, lesson_id: str) -> dict[str, Any] | None:
        return deepcopy(self.session)

    async def upsert_lesson_session(self, session: dict[str, Any]) -> bool:
        self.session = deepcopy(session)
        return True

    async def create_lesson_step_attempt(self, attempt: dict[str, Any]) -> str:
        self.attempts.append(deepcopy(attempt))
        return str(len(self.attempts))

    async def update_word_mastery(
        self,
        user_id: str,
        course_id: str,
        lesson_id: str,
        word: str,
        passed: bool,
        score: int,
    ) -> bool:
        return True


@pytest.fixture
def session_client() -> tuple[TestClient, InMemoryLessonSessionRepository]:
    lesson = {
        "lesson_id": LESSON_ID,
        "learning_blocks": {
            "schema_version": 2,
            "content_version": 1,
            "activities": [
                {"activity_id": "learn", "type": "learn_vocabulary", "order": 1, "required": True, "completion_policy": {"mode": "all_items"}, "config": {"vocabulary_ids": []}},
                {"activity_id": "match", "type": "match", "order": 2, "required": True, "completion_policy": {"mode": "interaction_complete"}, "config": {"vocabulary_ids": []}},
                {"activity_id": "finish", "type": "quiz", "order": 3, "required": True, "completion_policy": {"mode": "all_items"}, "config": {"question_ids": []}},
            ],
        },
    }
    persisted_session = _build_session(USER_ID, COURSE_ID, lesson)
    for step in persisted_session["steps"]:
        step["updated_at"] = None

    repo = InMemoryLessonSessionRepository(
        {"course_id": COURSE_ID, "lessons": [{"lesson_id": LESSON_ID}]},
        lesson,
        persisted_session,
    )
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=USER_ID)
    app.dependency_overrides[get_course_service] = lambda: CourseService(repo=repo)

    with TestClient(app, raise_server_exceptions=False) as client:
        yield client, repo

    app.dependency_overrides.clear()


def test_session_start_serializes_multiple_fresh_steps_without_updated_at(
    session_client: tuple[TestClient, InMemoryLessonSessionRepository],
) -> None:
    client, _ = session_client

    response = client.post(f"/api/v1/courses/{COURSE_ID}/lessons/{LESSON_ID}/session/start")

    assert response.status_code == 200
    payload = response.json()
    assert [step["step_id"] for step in payload["steps"]] == ["learn", "match", "finish"]
    assert all(step["updated_at"] is None for step in payload["steps"])


def test_step_attempt_after_session_start_finds_the_active_session(
    session_client: tuple[TestClient, InMemoryLessonSessionRepository],
) -> None:
    client, repo = session_client

    assert client.post(f"/api/v1/courses/{COURSE_ID}/lessons/{LESSON_ID}/session/start").status_code == 200
    response = client.post(
        f"/api/v1/courses/{COURSE_ID}/lessons/{LESSON_ID}/steps/attempt",
        json={"step_id": "learn", "passed": True, "score": 100, "response_data": {"step_complete": True}},
    )

    assert response.status_code == 200
    assert repo.attempts[0]["step_id"] == "learn"


def test_attempted_step_serializes_the_real_update_timestamp(
    session_client: tuple[TestClient, InMemoryLessonSessionRepository],
) -> None:
    client, _ = session_client

    assert client.post(f"/api/v1/courses/{COURSE_ID}/lessons/{LESSON_ID}/session/start").status_code == 200
    response = client.post(
        f"/api/v1/courses/{COURSE_ID}/lessons/{LESSON_ID}/steps/attempt",
        json={"step_id": "learn", "passed": True, "score": 100, "response_data": {"step_complete": True}},
    )

    assert response.status_code == 200
    updated_at = response.json()["steps"][0]["updated_at"]
    assert isinstance(datetime.fromisoformat(updated_at), datetime)


@pytest.mark.parametrize(
    ("course_id", "lesson_id", "seed_path"),
    [
        ("momo-home-family-english-5-7", "hello-family", "seeds/courses/momo_home_family.json"),
        ("momo-school-food-english-5-7", "my-classroom", "seeds/courses/momo_school_food.json"),
        ("animals-adventure-en-5-7", "learn-the-cat", "database/seed/animals_adventure.json"),
    ],
)
def test_hero_lesson_routes_accept_a_fresh_persisted_session(
    course_id: str,
    lesson_id: str,
    seed_path: str,
) -> None:
    course = loads((Path(__file__).parents[1] / seed_path).read_text(encoding="utf-8"))
    lesson = next(item for item in course["lessons"] if item["lesson_id"] == lesson_id)
    lesson["course_id"] = course_id
    persisted_session = _build_session(USER_ID, course_id, lesson)
    for step in persisted_session["steps"]:
        step["updated_at"] = None

    repo = InMemoryLessonSessionRepository(course, lesson, persisted_session)
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=USER_ID)
    app.dependency_overrides[get_course_service] = lambda: CourseService(repo=repo)

    with TestClient(app, raise_server_exceptions=False) as client:
        lesson_response = client.get(f"/api/v1/courses/{course_id}/lessons/{lesson_id}")
        session_response = client.post(f"/api/v1/courses/{course_id}/lessons/{lesson_id}/session/start")
        attempt_response = client.post(
            f"/api/v1/courses/{course_id}/lessons/{lesson_id}/steps/attempt",
            json={
                "step_id": session_response.json()["current_step_id"],
                "passed": True,
                "score": 100,
                "response_data": {"step_complete": True},
            },
        )

    app.dependency_overrides.clear()
    assert lesson_response.status_code == 200
    assert session_response.status_code == 200
    assert attempt_response.status_code == 200
