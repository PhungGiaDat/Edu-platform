from copy import deepcopy

import pytest
from pydantic import ValidationError

from database.seed.canonical_momo_courses import (
    CONTENT_VERSION,
    build_course_index,
    generate_lesson_blocks,
    load_manifest,
)
from database.seed.apply_canonical_momo_courses import (
    CanonicalMomoConflict,
    InMemoryMomoCatalogStore,
    _load_live_store,
    apply_canonical_catalog,
    readback_lesson_blocks,
)
from models.lesson_activity import LessonLearningBlocks


@pytest.fixture
def manifest():
    return load_manifest()


@pytest.fixture
def catalog():
    return build_course_index()


@pytest.fixture
def hello_family_context(catalog, manifest):
    course = catalog["momo-home-family-english-5-7"]
    lesson = next(item for item in course.lessons if item.lesson_id == "hello-family")
    plan = manifest.lesson_plan(course.course_id, lesson.lesson_id)
    return course, lesson, plan


def _resolved_dependencies(plan, *, start_question_id: int = 1100, game_item_id: int = 2100):
    return {
        "question_ids": {
            question.question_key: start_question_id + index
            for index, question in enumerate(plan.quiz_questions)
        },
        "mini_game_ids": {
            plan.match_activity.game_key: game_item_id,
        },
    }


def _build_store(manifest, catalog) -> InMemoryMomoCatalogStore:
    store = InMemoryMomoCatalogStore.from_catalog(catalog, manifest)
    store.seed_flashcard("fc-mom", "Mom", "mẹ", "home_family")
    store.seed_flashcard("fc-dad", "Dad", "ba", "home_family")
    store.seed_flashcard("fc-baby", "Baby", "em bé", "home_family")
    store.seed_flashcard("fc-bed", "Bed", "giường", "home_family")
    store.seed_flashcard("fc-chair", "Chair", "ghế", "home_family")
    store.seed_flashcard("fc-toy", "Toy", "đồ chơi", "home_family")
    store.seed_flashcard("fc-apple", "Apple", "quả táo", "home_family")
    store.seed_flashcard("fc-milk", "Milk", "sữa", "home_family")
    store.seed_flashcard("fc-cookie", "Cookie", "bánh quy", "home_family")
    store.seed_flashcard("fc-hand", "Hand", "bàn tay", "home_family")
    store.seed_flashcard("fc-soap", "Soap", "xà phòng", "home_family")
    store.seed_flashcard("fc-clean", "Clean", "sạch", "home_family")
    store.seed_flashcard("fc-happy", "Happy", "vui", "home_family")
    store.seed_flashcard("fc-sad", "Sad", "buồn", "home_family")
    store.seed_flashcard("fc-smile", "Smile", "mỉm cười", "home_family")
    store.seed_flashcard("fc-book", "Book", "quyển sách", "school_food")
    store.seed_flashcard("fc-red", "Red", "màu đỏ", "school_food")
    store.seed_flashcard("fc-three", "Three", "số ba", "school_food")
    return store


def test_canonical_generation_validates_schema_v2_and_preserves_lesson_order(hello_family_context):
    course, lesson, plan = hello_family_context
    blocks = LessonLearningBlocks.model_validate(
        generate_lesson_blocks(course, lesson, plan, _resolved_dependencies(plan))
    )

    assert course.course_id == "momo-home-family-english-5-7"
    assert lesson.order == 1
    assert blocks.schema_version == 2
    assert blocks.content_version == CONTENT_VERSION
    assert [activity.type for activity in blocks.activities] == [
        "learn_vocabulary",
        "listen_choose",
        "match",
        "read_aloud",
        "pronunciation",
        "quiz",
    ]
    assert [activity.order for activity in blocks.activities] == [1, 2, 3, 4, 5, 6]


def test_activity_and_dependency_ids_are_stable_across_generations(hello_family_context):
    course, lesson, plan = hello_family_context
    resolved = _resolved_dependencies(plan, start_question_id=11, game_item_id=21)

    first = generate_lesson_blocks(course, lesson, plan, resolved)
    second = generate_lesson_blocks(course, lesson, plan, resolved)

    assert first == second
    assert [activity["activity_id"] for activity in first["activities"]] == [
        "momo-home-family-english-5-7:hello-family:learn_vocabulary",
        "momo-home-family-english-5-7:hello-family:listen_choose",
        "momo-home-family-english-5-7:hello-family:match_picture",
        "momo-home-family-english-5-7:hello-family:read_aloud",
        "momo-home-family-english-5-7:hello-family:pronunciation",
        "momo-home-family-english-5-7:hello-family:quiz",
    ]
    assert first["activities"][2]["config"]["mini_game_item_ids"] == [21]
    assert first["activities"][5]["config"]["question_ids"] == [11, 12, 13]


def test_unresolved_references_produce_legacy_fallback_and_no_v2_write(manifest, catalog):
    store = InMemoryMomoCatalogStore.from_catalog(catalog, manifest)
    snapshot = store.snapshot()

    result = apply_canonical_catalog(store, manifest, course_id="momo-home-family-english-5-7", apply=True)
    hello_family = next(item for item in result["lessons"] if item["lesson_id"] == "hello-family")

    assert hello_family["status"] == "LEGACY_FALLBACK"
    assert hello_family["fallback_reason"] == "UNRESOLVED_FLASHCARD_REFERENCES"
    assert store.lessons["hello-family"]["learning_blocks"] == snapshot["lessons"]["hello-family"]["learning_blocks"]
    assert result["summary"]["deleted_rows"] == 0
    assert result["summary"]["destructive_statements"] == 0


def test_conflicting_dependency_payload_fails_before_transaction_writes(manifest, catalog):
    store = _build_store(manifest, catalog)
    store.seed_conflicting_quiz(
        semantic_id="momo-home-family-english-5-7:hello-family:quiz:hello-family-q1",
        flashcard_qr_id="fc-dad",
        question_text="Conflicting question owner",
        options=("Mom", "Dog", "Cup"),
        correct_answer="Mom",
    )
    before = store.snapshot()

    with pytest.raises(CanonicalMomoConflict, match="hello-family-q1"):
        apply_canonical_catalog(store, manifest, course_id="momo-home-family-english-5-7", apply=True)

    assert store.snapshot() == before


def test_dry_run_performs_no_runtime_writes_and_reports_planned_changes(manifest, catalog):
    store = _build_store(manifest, catalog)
    before = store.runtime_snapshot()

    result = apply_canonical_catalog(store, manifest, course_id="momo-home-family-english-5-7", apply=False)

    assert result["mode"] == "dry-run"
    assert result["summary"]["inserted_rows"] > 0
    assert result["summary"]["deleted_rows"] == 0
    assert result["summary"]["destructive_statements"] == 0
    assert store.runtime_snapshot() == before


def test_second_apply_reports_no_change_and_does_not_duplicate_dependencies(manifest, catalog):
    store = _build_store(manifest, catalog)

    first = apply_canonical_catalog(store, manifest, course_id="momo-home-family-english-5-7", apply=True)
    second = apply_canonical_catalog(store, manifest, course_id="momo-home-family-english-5-7", apply=True)

    assert first["summary"]["inserted_rows"] > 0
    assert second["summary"]["inserted_rows"] == 0
    assert second["summary"]["extended_rows"] == 0
    assert second["summary"]["deleted_rows"] == 0
    assert all(item["status"] == "NO_CHANGE" for item in second["lessons"])
    assert len(store.quiz_questions) == 18
    assert len(store.quiz_options) == 54
    assert len(store.mini_game_items) == 6


def test_readback_rejects_missing_duplicated_or_out_of_order_required_activities(hello_family_context):
    course, lesson, plan = hello_family_context
    valid = generate_lesson_blocks(course, lesson, plan, _resolved_dependencies(plan))

    missing = deepcopy(valid)
    missing["activities"] = missing["activities"][:-1]
    duplicate = deepcopy(valid)
    duplicate["activities"][1]["activity_id"] = duplicate["activities"][0]["activity_id"]
    out_of_order = deepcopy(valid)
    out_of_order["activities"][1]["order"] = out_of_order["activities"][0]["order"]

    with pytest.raises((ValidationError, ValueError)):
        readback_lesson_blocks(missing)
    with pytest.raises((ValidationError, ValueError)):
        readback_lesson_blocks(duplicate)
    with pytest.raises((ValidationError, ValueError)):
        readback_lesson_blocks(out_of_order)


def test_existing_legacy_fields_remain_available_after_canonical_blocks_are_written(manifest, catalog):
    store = _build_store(manifest, catalog)
    legacy_before = deepcopy(store.lessons["hello-family"]["learning_blocks"])

    apply_canonical_catalog(store, manifest, course_id="momo-home-family-english-5-7", apply=True)
    stored = store.lessons["hello-family"]["learning_blocks"]
    blocks = readback_lesson_blocks(stored)

    assert blocks.schema_version == 2
    assert stored["game"] == legacy_before["game"]
    assert stored["quiz"] == legacy_before["quiz"]
    assert stored["pronunciation"] == legacy_before["pronunciation"]
    assert stored["readAloudStory"] == legacy_before["readAloudStory"]


class _FakeMappingsResult:
    def __init__(self, rows):
        self._rows = rows

    def mappings(self):
        return self

    def all(self):
        return self._rows


class _FakeSession:
    def __init__(self, responses):
        self._responses = list(responses)

    async def execute(self, *_args, **_kwargs):
        return _FakeMappingsResult(self._responses.pop(0))


@pytest.mark.asyncio
async def test_live_loader_rejects_missing_required_course_rows(manifest, catalog):
    course = catalog["momo-home-family-english-5-7"]
    lesson_rows = [
        {
            "lesson_id": lesson.lesson_id,
            "course_id": course.course_id,
            "learning_blocks": deepcopy(lesson.learning_blocks),
        }
        for lesson in course.lessons[:-1]
    ]
    session = _FakeSession([lesson_rows, [], [], [], []])

    with pytest.raises(RuntimeError, match="Missing release catalog lessons"):
        await _load_live_store(session, manifest, "momo-home-family-english-5-7")


@pytest.mark.asyncio
async def test_live_loader_rejects_ambiguous_duplicate_quiz_semantic_dependencies(manifest, catalog):
    course = catalog["momo-home-family-english-5-7"]
    lesson_rows = [
        {
            "lesson_id": lesson.lesson_id,
            "course_id": course.course_id,
            "learning_blocks": deepcopy(lesson.learning_blocks),
        }
        for lesson in course.lessons
    ]
    duplicate_quiz_rows = [
        {
            "id": 11,
            "question_id": "momo-home-family-english-5-7:hello-family:quiz:hello-family-q1",
            "flashcard_qr_id": "fc-mom",
            "question_text": "Tap mom.",
            "question_type": "multiple_choice",
            "correct_answer": "Mom",
            "option_order": 1,
            "value": "Mom",
        },
        {
            "id": 12,
            "question_id": "momo-home-family-english-5-7:hello-family:quiz:hello-family-q1",
            "flashcard_qr_id": "fc-dad",
            "question_text": "Tap dad.",
            "question_type": "multiple_choice",
            "correct_answer": "Dad",
            "option_order": 1,
            "value": "Dad",
        },
    ]
    session = _FakeSession([lesson_rows, [], [], duplicate_quiz_rows, []])

    with pytest.raises(CanonicalMomoConflict, match="Ambiguous existing quiz semantic identity"):
        await _load_live_store(session, manifest, "momo-home-family-english-5-7")
