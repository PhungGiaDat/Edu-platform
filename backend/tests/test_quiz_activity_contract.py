from copy import deepcopy
import random
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

from api.courses import router
from core.security import get_current_user
from database.orm_models.quiz import QuizQuestionORM, QuizQuestionOptionORM
from models.lesson_activity import QuizConfig
from services.quiz_activity_service import QuizActivityService
from services.course_service import get_course_service


def question(question_id: int, correct: str = "Yes") -> QuizQuestionORM:
    value = QuizQuestionORM(id=question_id, flashcard_qr_id="card-1", question_id=f"q-{question_id}", question_text=f"Question {question_id}", question_type="multiple_choice", correct_answer=correct)
    value.options = [QuizQuestionOptionORM(question_id=question_id, option_order=1, value=correct), QuizQuestionOptionORM(question_id=question_id, option_order=2, value="No")]
    return value


class QuizRepo:
    def __init__(self, questions): self.questions = {item.id: item for item in questions}
    async def get_questions(self, ids):
        missing = [item for item in ids if item not in self.questions]
        if missing: raise ValueError(f"Unknown quiz question IDs: {missing}")
        return [self.questions[item] for item in ids]


class CourseRepo:
    def __init__(self, blocks):
        self.lesson = {"lesson_id": "lesson-1", "learning_blocks": blocks}
        self.session = {"session_id": "session-1", "current_step_id": "quiz-main", "steps": [{"step_id": "quiz-main", "status": "in_progress", "attempts": 0, "best_score": 0, "passed": False, "last_response": {}}]}
        self.persisted_attempts = []
    async def get_lesson(self, *_): return self.lesson
    async def get_lesson_session(self, *_): return self.session
    async def upsert_lesson_session(self, session): self.session = session
    async def get_lesson_step_attempts(self, *_): return list(self.persisted_attempts)
    async def create_lesson_step_attempt(self, payload): self.persisted_attempts.append(payload); return "1"


def blocks(order_policy="authored", count=None):
    config = {"question_ids": [11, 12], "order_policy": order_policy}
    if count is not None: config["question_count"] = count
    return {"schema_version": 2, "content_version": 1, "activities": [{"activity_id": "quiz-main", "type": "quiz", "order": 1, "required": True, "completion_policy": {"mode": "quiz_complete"}, "config": config}]}


@pytest.mark.asyncio
async def test_hydration_uses_fixed_question_and_option_order():
    courses = CourseRepo(blocks())
    service = QuizActivityService(courses, QuizRepo([question(11), question(12)]))
    result = await service.hydrate("user", "course", "lesson-1", "quiz-main")
    assert [item["question_id"] for item in result["questions"]] == [11, 12]
    assert result["questions"][0]["options"] == [{"option_id": "11:1", "label": "Yes", "order": 1}, {"option_id": "11:2", "label": "No", "order": 2}]
    assert courses.session["steps"][0]["last_response"]["quiz_question_ids"] == [11, 12]


@pytest.mark.asyncio
async def test_random_selection_is_saved_as_runtime_order():
    courses = CourseRepo(blocks("random", 1))
    service = QuizActivityService(courses, QuizRepo([question(11), question(12)]), random.Random(7))
    first = await service.hydrate("user", "course", "lesson-1", "quiz-main")
    second = await service.hydrate("user", "course", "lesson-1", "quiz-main")
    assert [item["question_id"] for item in first["questions"]] == [item["question_id"] for item in second["questions"]]


@pytest.mark.asyncio
async def test_answer_is_backend_evaluated_and_completes_when_pool_is_exhausted():
    courses = CourseRepo(blocks())
    service = QuizActivityService(courses, QuizRepo([question(11), question(12)]))
    first = await service.submit_answer("user", "course", "lesson-1", "quiz-main", 11, "11:1")
    assert first["correct"] is True and first["completed"] is False
    second = await service.submit_answer("user", "course", "lesson-1", "quiz-main", 12, "12:2")
    assert second["correct"] is False and second["completed"] is True
    assert courses.persisted_attempts[0]["response_data"]["question_id"] == 11
    with pytest.raises(ValueError, match="already been answered"):
        await service.submit_answer("user", "course", "lesson-1", "quiz-main", 11, "11:1")


def test_quiz_config_rejects_duplicate_ids_and_oversized_count():
    with pytest.raises(ValidationError, match="duplicates"):
        QuizConfig(question_ids=[1, 1])
    with pytest.raises(ValidationError, match="cannot exceed"):
        QuizConfig(question_ids=[1], question_count=2)


def test_quiz_activity_api_hydrates_and_uses_authenticated_user_for_answers():
    class Service:
        async def get_quiz_activity(self, user_id, course_id, lesson_id, activity_id):
            assert user_id == "authenticated-user"
            return {"activity_id": activity_id, "questions": [{"question_id": 11, "question_type": "multiple_choice", "prompt": "Choose", "flashcard_qr_id": "card-1", "options": [{"option_id": "11:1", "label": "Yes", "order": 1}]}]}
        async def submit_quiz_activity_answer(self, user_id, course_id, lesson_id, activity_id, question_id, option_id):
            assert user_id == "authenticated-user"
            return {"question_id": question_id, "correct": True, "score": 100, "completed": True, "session": {"session_id": "session-1"}}

    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id="authenticated-user")
    app.dependency_overrides[get_course_service] = lambda: Service()
    client = TestClient(app)
    path = "/api/v1/courses/course-1/lessons/lesson-1/activities/quiz-main/quiz"
    assert client.get(path).status_code == 200
    response = client.post(f"{path}/answers", json={"question_id": 11, "option_id": "11:1"})
    assert response.status_code == 200
    assert response.json()["correct"] is True
