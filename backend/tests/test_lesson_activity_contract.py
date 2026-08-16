from copy import deepcopy
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

from api.courses import router
from models.course_model import LessonSchema
from models.lesson_activity import LessonLearningBlocks, normalize_learning_blocks
from services.course_service import (
    _advance_session,
    _build_session,
    _normalize_session,
)
from services.course_service import get_course_service


def activity(activity_type: str, activity_id: str, order: int, config: dict, mode: str, **extra):
    return {
        "activity_id": activity_id,
        "type": activity_type,
        "order": order,
        "required": extra.pop("required", True),
        "completion_policy": {"mode": mode},
        "config": config,
        **extra,
    }


@pytest.fixture
def valid_blocks() -> dict:
    return {
        "schema_version": 2,
        "content_version": 4,
        "vocabulary": ["cat", "dog"],
        "activities": [
            activity("quiz", "quiz-main", 3, {"question_ids": [10, 11]}, "quiz_complete"),
            activity("learn_vocabulary", "learn-animals", 1, {"vocabulary_ids": ["cat", "dog"]}, "all_items"),
            activity("mini_game", "game-memory", 2, {"game_type": "memory_match", "mini_game_item_ids": [20]}, "game_complete"),
        ],
    }


def test_valid_activities_are_sorted_by_authored_order(valid_blocks):
    blocks = LessonLearningBlocks.model_validate(valid_blocks)

    assert [item.activity_id for item in blocks.activities] == [
        "learn-animals",
        "game-memory",
        "quiz-main",
    ]


def test_schema_v2_requires_at_least_one_activity():
    with pytest.raises(ValidationError, match="at least one activity"):
        LessonLearningBlocks.model_validate({"schema_version": 2, "activities": []})


@pytest.mark.parametrize(
    ("mutation", "message"),
    [
        (lambda value: value["activities"].append(deepcopy(value["activities"][0])), "activity_id"),
        (lambda value: value["activities"].__setitem__(1, {**value["activities"][1], "order": 3}), "order"),
        (lambda value: value["activities"].__setitem__(0, {**value["activities"][0], "order": 0}), "greater than or equal"),
        (lambda value: value["activities"].__setitem__(0, {**value["activities"][0], "type": "reward"}), "union_tag_invalid"),
        (lambda value: value["activities"][0].pop("required"), "required"),
        (lambda value: value["activities"][0]["config"].update({"unknown": True}), "extra_forbidden"),
        (lambda value: value["activities"][0].update({"status": "completed"}), "extra_forbidden"),
    ],
)
def test_malformed_activity_contract_is_rejected(valid_blocks, mutation, message):
    mutation(valid_blocks)

    with pytest.raises(ValidationError) as error:
        LessonLearningBlocks.model_validate(valid_blocks)

    assert message in str(error.value)


@pytest.mark.parametrize(
    "candidate",
    [
        activity("warm_up", "warm-up", 1, {"media_asset_ids": ["intro-video"]}, "viewed"),
        activity("listen_choose", "listen", 1, {"vocabulary_ids": ["cat"], "question_count": 1}, "all_items"),
        activity("match", "match", 1, {"vocabulary_ids": ["cat"]}, "interaction_complete"),
        activity("drag_drop", "drag", 1, {"mini_game_item_ids": [1]}, "all_items"),
        activity("memory_match", "memory", 1, {"vocabulary_ids": ["cat"]}, "interaction_complete"),
        activity("coloring", "color", 1, {"vocabulary_id": "cat", "outline_asset_id": "cat-outline"}, "interaction_complete"),
        activity("read_aloud", "read", 1, {"story_id": "story-1"}, "all_items"),
        activity("pronunciation", "say", 1, {"vocabulary_ids": ["cat"]}, "interaction_complete"),
    ],
)
def test_supported_typed_configs_are_accepted(candidate):
    blocks = LessonLearningBlocks.model_validate({"schema_version": 2, "vocabulary": ["cat"], "activities": [candidate]})
    assert blocks.activities[0].activity_id == candidate["activity_id"]


def test_legacy_learning_blocks_remain_readable_without_fabricated_activities():
    blocks = normalize_learning_blocks({
        "vocabulary": [{"word_en": "Cat"}],
        "game": {"game_id": "legacy-game"},
        "quiz": [{"question_id": "legacy-question"}],
    })

    assert blocks.schema_version == 1
    assert blocks.content_version == 1
    assert blocks.activities == []
    assert blocks.vocabulary == [{"word_en": "Cat"}]
    assert blocks.game == {"game_id": "legacy-game"}


def test_activity_id_maps_to_session_step_and_survives_reorder(valid_blocks):
    lesson = {"lesson_id": "lesson-1", "learning_blocks": valid_blocks}
    session = _build_session("user-1", "course-1", lesson)

    assert session["content_version"] == 4
    assert [step["step_id"] for step in session["steps"]] == ["learn-animals", "game-memory", "quiz-main"]
    assert session["steps"][0]["activity_type"] == "learn_vocabulary"

    session["steps"][0]["status"] = "completed"
    session["steps"][0]["passed"] = True
    reordered = deepcopy(valid_blocks)
    reordered["content_version"] = 5
    reordered["activities"][0]["order"] = 1
    reordered["activities"][1]["order"] = 2
    reordered["activities"][2]["order"] = 3
    normalized = _normalize_session(session, {"lesson_id": "lesson-1", "learning_blocks": reordered})

    assert normalized["content_version"] == 5
    assert [step["step_id"] for step in normalized["steps"]] == ["quiz-main", "learn-animals", "game-memory"]
    assert next(step for step in normalized["steps"] if step["step_id"] == "learn-animals")["passed"] is True


def test_required_activity_completion_updates_session_but_not_lesson_definition(valid_blocks):
    lesson = {"lesson_id": "lesson-1", "learning_blocks": deepcopy(valid_blocks)}
    session = _build_session("user-1", "course-1", lesson)
    original = deepcopy(lesson)

    for step in list(session["steps"]):
        session = _advance_session(session, step["step_id"], True, 100, {"step_complete": True})

    assert session["status"] == "completed"
    assert lesson == original
    assert all("status" not in item for item in lesson["learning_blocks"]["activities"])


def test_attempt_uses_stable_activity_id():
    session = {
        "session_id": "session-1",
        "status": "started",
        "current_step_id": "quiz-main",
        "current_step_index": 0,
        "steps": [{
            "step_id": "quiz-main",
            "activity_type": "quiz",
            "activity_order": 1,
            "required": True,
            "status": "in_progress",
        }],
    }

    advanced = _advance_session(session, "quiz-main", True, 100, {"selected_answer": "cat"})
    assert advanced["steps"][0]["step_id"] == "quiz-main"
    assert advanced["steps"][0]["last_response"] == {"selected_answer": "cat"}


def test_representative_lesson_api_response_contains_contract(valid_blocks):
    lesson = LessonSchema.model_validate({
        "lesson_id": "lesson-1",
        "course_id": "course-1",
        "title": "Animals",
        "order": 1,
        "duration_minutes": 3,
        "learning_blocks": valid_blocks,
    })

    class FakeCourseService:
        async def get_lesson(self, course_id: str, lesson_id: str):
            return lesson.model_dump(mode="json")

    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides[get_course_service] = lambda: FakeCourseService()

    response = TestClient(app).get("/api/v1/courses/course-1/lessons/lesson-1")
    assert response.status_code == 200
    assert response.json()["learning_blocks"]["activities"][0]["activity_id"] == "learn-animals"


def test_additive_migration_contains_only_session_contract_changes():
    migration = (
        Path(__file__).parents[1]
        / "database/postgres/migrations/20260814_03_lesson_activity_contract.sql"
    ).read_text(encoding="utf-8")

    assert "ADD COLUMN IF NOT EXISTS content_version" in migration
    assert "ADD COLUMN IF NOT EXISTS activity_order" in migration
    assert "DROP " not in migration.upper()
    assert "CREATE TABLE" not in migration.upper()
