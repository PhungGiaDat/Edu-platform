from copy import deepcopy
from dataclasses import replace

import pytest
from pydantic import ValidationError
import database.seed.apply_canonical_momo_courses as momo_apply

from database.seed.canonical_momo_courses import (
    CanonicalLessonPlan,
    CONTENT_VERSION,
    VocabularyEntry,
    build_course_index,
    build_missing_flashcard_owner_payload,
    generate_lesson_blocks,
    load_manifest,
    semantic_flashcard_qr_id,
)
from database.seed.apply_canonical_momo_courses import (
    CanonicalMomoConflict,
    InMemoryMomoCatalogStore,
    _lesson_ids_without_open_sessions,
    _load_live_store,
    _readback_live,
    _validate_learning_block_references_in_transaction,
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


def _build_partial_store(manifest, catalog) -> InMemoryMomoCatalogStore:
    store = InMemoryMomoCatalogStore.from_catalog(catalog, manifest)
    store.seed_flashcard("apple01", "Apple", "quáº£ tÃ¡o", "fruits")
    store.seed_flashcard("ele123", "Elephant", "con voi", "animals")
    store.seed_flashcard("animals-v1-bird", "Bird", "con chim", "animals")
    store.seed_flashcard("tree01", "Tree", "cÃ¡i cÃ¢y", "nature")
    return store


def _course_rows(course):
    return [
        {
            "course_id": course.course_id,
            "title": course.title,
            "title_vi": course.title_vi,
            "description": course.description,
            "description_vi": course.description_vi,
            "thumbnail_url": course.thumbnail_url,
            "subtitle_vi": course.subtitle_vi,
            "theme": course.theme,
            "category_key": course.category_key,
            "category_label": course.category_label,
            "category_icon": course.category_icon,
            "age_range": course.age_range,
            "level": course.level,
            "thumbnail": deepcopy(course.thumbnail),
            "catalog_preview": [deepcopy(item) for item in course.catalog_preview],
            "is_published": course.is_published,
        }
    ]


def _lesson_rows(course):
    return [
        {
            "lesson_id": lesson.lesson_id,
            "course_id": course.course_id,
            "title": lesson.title,
            "title_vi": lesson.title_vi,
            "description": lesson.description,
            "lesson_order": lesson.order,
            "duration_minutes": lesson.duration_minutes,
            "learning_blocks": deepcopy(lesson.learning_blocks),
        }
        for lesson in course.lessons
    ]


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
    original = manifest.lesson_plan("momo-home-family-english-5-7", "hello-family")
    invalid_vocabulary = (
        replace(original.vocabulary[0], source_image={}),
        *original.vocabulary[1:],
    )
    manifest._lesson_plans[("momo-home-family-english-5-7", "hello-family")] = CanonicalLessonPlan(
        course_id=original.course_id,
        lesson_id=original.lesson_id,
        content_version=original.content_version,
        vocabulary=invalid_vocabulary,
        listen_choose_keys=original.listen_choose_keys,
        match_activity=original.match_activity,
        pronunciation_keys=original.pronunciation_keys,
        read_aloud_story_id=original.read_aloud_story_id,
        quiz_questions=original.quiz_questions,
    )

    result = apply_canonical_catalog(store, manifest, course_id="momo-home-family-english-5-7", apply=True)
    hello_family = next(item for item in result["lessons"] if item["lesson_id"] == "hello-family")

    assert hello_family["status"] == "LEGACY_FALLBACK"
    assert hello_family["fallback_reason"] == "UNRESOLVED_FLASHCARD_REFERENCES"
    assert store.lessons["hello-family"]["learning_blocks"] == snapshot["lessons"]["hello-family"]["learning_blocks"]
    assert result["summary"]["deleted_rows"] == 0
    assert result["summary"]["destructive_statements"] == 0


def test_missing_momo_flashcard_owners_are_added_only_from_valid_authored_sources(manifest, catalog):
    store = _build_partial_store(manifest, catalog)

    result = apply_canonical_catalog(store, manifest, course_id="momo-home-family-english-5-7", apply=True)
    hello_family = next(item for item in result["lessons"] if item["lesson_id"] == "hello-family")
    seeded_qr_id = semantic_flashcard_qr_id("Mom", "mẹ")
    seeded = store.flashcards[seeded_qr_id]

    assert hello_family["status"] == "UPDATED"
    assert seeded["qr_id"] == "momo:mom:me"
    assert seeded["word_en"] == "Mom"
    assert seeded["category"] == "home_family"
    assert seeded["image_url"].endswith(
        "/storage/v1/object/public/learnar-assets/courses/momo-home-family-english-5-7/lessons/hello-family/vocabulary/mom.svg"
    )
    assert seeded["audio_url"].endswith(
        "/storage/v1/object/public/learnar-assets/courses/momo-home-family-english-5-7/lessons/hello-family/audio/mom.wav"
    )
    assert "flashcard_owner" in hello_family["created"]
    assert result["summary"]["deleted_rows"] == 0
    assert result["summary"]["destructive_statements"] == 0


def test_flashcard_owner_seed_fails_closed_on_semantic_qr_id_collision(manifest, catalog):
    store = _build_partial_store(manifest, catalog)
    conflict = build_missing_flashcard_owner_payload(
        course_id="momo-home-family-english-5-7",
        lesson_id="hello-family",
        vocabulary_item={
            "word_en": "Mom",
            "word_vi": "mẹ",
            "image": {
                "bucket": "learnar-assets",
                "path": "courses/momo-home-family-english-5-7/lessons/hello-family/vocabulary/mom.svg",
            },
            "audio": {
                "bucket": "learnar-assets",
                "path": "courses/momo-home-family-english-5-7/lessons/hello-family/audio/mom.wav",
            },
        },
        category_key="home_family",
    )
    store.flashcards[conflict["qr_id"]] = {
        "qr_id": conflict["qr_id"],
        "word_en": "Not Mom",
        "word_vi": "khac",
        "category": "collision",
        "image_url": "https://example.invalid/not-mom.svg",
        "audio_url": None,
    }
    before = store.snapshot()

    with pytest.raises(CanonicalMomoConflict, match=conflict["qr_id"]):
        apply_canonical_catalog(store, manifest, course_id="momo-home-family-english-5-7", apply=True)

    assert store.snapshot() == before


def test_open_lesson_session_skips_lesson_before_dependency_mutation(manifest, catalog):
    store = _build_store(manifest, catalog)
    store.lessons["hello-family"]["open_session_count"] = 1
    before_lesson = deepcopy(store.lessons["hello-family"])

    result = apply_canonical_catalog(store, manifest, course_id="momo-home-family-english-5-7", apply=True)
    hello_family = next(item for item in result["lessons"] if item["lesson_id"] == "hello-family")

    assert hello_family["status"] == "LEGACY_FALLBACK"
    assert hello_family["fallback_reason"] == "OPEN_LESSON_SESSION"
    assert hello_family["conflicts"] == ["OPEN_LESSON_SESSION:hello-family:1"]
    assert store.lessons["hello-family"] == before_lesson
    assert not any(":hello-family:" in key for key in store.quiz_questions)
    assert "momo-home-family-english-5-7:hello-family:match_picture" not in store.mini_game_items
    assert result["summary"]["deleted_rows"] == 0
    assert result["summary"]["destructive_statements"] == 0


def test_open_lesson_session_dry_run_does_not_plan_dependency_mutation(manifest, catalog):
    store = _build_store(manifest, catalog)
    store.lessons["hello-family"]["open_session_count"] = 2
    before = store.snapshot()

    result = apply_canonical_catalog(store, manifest, course_id="momo-home-family-english-5-7", apply=False)
    hello_family = next(item for item in result["lessons"] if item["lesson_id"] == "hello-family")

    assert hello_family["status"] == "LEGACY_FALLBACK"
    assert hello_family["fallback_reason"] == "OPEN_LESSON_SESSION"
    assert store.snapshot() == before
    assert "quiz_dependencies" not in hello_family["created"]
    assert "mini_game_dependency" not in hello_family["created"]


def test_missing_existing_quiz_options_are_extended_without_duplicates(manifest, catalog):
    store = _build_store(manifest, catalog)
    apply_canonical_catalog(store, manifest, course_id="momo-home-family-english-5-7", apply=True)
    semantic_id = "momo-home-family-english-5-7:hello-family:quiz:hello-family-q1"
    missing_value = store.quiz_options.pop((semantic_id, 3))

    result = apply_canonical_catalog(store, manifest, course_id="momo-home-family-english-5-7", apply=True)
    hello_family = next(item for item in result["lessons"] if item["lesson_id"] == "hello-family")

    assert store.quiz_options[(semantic_id, 3)] == missing_value
    assert hello_family["created"].count("quiz_option") == 1
    assert len([key for key in store.quiz_options if key[0] == semantic_id]) == 3
    assert len(store.quiz_options) == 54


def test_conflicting_existing_quiz_option_fails_closed(manifest, catalog):
    store = _build_store(manifest, catalog)
    apply_canonical_catalog(store, manifest, course_id="momo-home-family-english-5-7", apply=True)
    semantic_id = "momo-home-family-english-5-7:hello-family:quiz:hello-family-q1"
    store.quiz_options[(semantic_id, 2)] = "Wrong populated value"
    before = store.snapshot()

    with pytest.raises(CanonicalMomoConflict, match="Conflicting quiz options"):
        apply_canonical_catalog(store, manifest, course_id="momo-home-family-english-5-7", apply=True)

    assert store.snapshot() == before


def test_source_owned_metadata_repairs_lossy_question_mark_values(manifest, catalog):
    course = catalog["momo-home-family-english-5-7"]
    store = _build_store(manifest, catalog)
    store.courses[course.course_id]["title"] = "B? G?u Momo"
    store.lessons["hello-family"]["title_vi"] = "Ch?o gia ??nh"

    result = apply_canonical_catalog(store, manifest, course_id=course.course_id, apply=True)
    hello_family = next(item for item in result["lessons"] if item["lesson_id"] == "hello-family")

    assert store.courses[course.course_id]["title"] == course.title
    assert store.lessons["hello-family"]["title_vi"] == next(
        lesson.title_vi for lesson in course.lessons if lesson.lesson_id == "hello-family"
    )
    assert "metadata.title" in result["courses"][0]["updated"]
    assert "metadata.title_vi" in hello_family["updated"]


def test_source_owned_metadata_conflict_preserves_valid_nonempty_values(manifest, catalog):
    course = catalog["momo-home-family-english-5-7"]
    store = _build_store(manifest, catalog)
    store.courses[course.course_id]["title"] = "Different valid custom title"
    before = store.snapshot()

    with pytest.raises(CanonicalMomoConflict, match="course:momo-home-family-english-5-7.title"):
        apply_canonical_catalog(store, manifest, course_id=course.course_id, apply=True)

    assert store.snapshot() == before


def test_source_owned_boolean_metadata_conflicts_when_false_is_existing_value(manifest, catalog):
    course = catalog["momo-home-family-english-5-7"]
    store = _build_store(manifest, catalog)
    store.courses[course.course_id]["is_published"] = False
    before = store.snapshot()

    with pytest.raises(CanonicalMomoConflict, match="course:momo-home-family-english-5-7.is_published"):
        apply_canonical_catalog(store, manifest, course_id=course.course_id, apply=True)

    assert store.snapshot() == before


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


def test_existing_schema_v2_blocks_can_be_reconciled_when_dependency_ids_change(manifest, catalog):
    store = _build_store(manifest, catalog)
    apply_canonical_catalog(store, manifest, course_id="momo-home-family-english-5-7", apply=True)
    match_activity = next(
        activity
        for activity in store.lessons["hello-family"]["learning_blocks"]["activities"]
        if activity["type"] == "match"
    )
    quiz_activity = next(
        activity
        for activity in store.lessons["hello-family"]["learning_blocks"]["activities"]
        if activity["type"] == "quiz"
    )
    match_activity["title"] = "Keep authored match title"
    match_activity["config"]["vocabulary_ids"] = ["legacy-match-vocabulary"]
    quiz_activity["title"] = "Keep authored quiz title"
    quiz_activity["config"]["question_count"] = 1

    for row in store.quiz_questions.values():
        row["id"] += 5000
    for row in store.mini_game_items.values():
        row["id"] += 7000

    result = apply_canonical_catalog(store, manifest, course_id="momo-home-family-english-5-7", apply=True)
    hello_family = next(item for item in result["lessons"] if item["lesson_id"] == "hello-family")
    quiz_activity = next(
        activity
        for activity in store.lessons["hello-family"]["learning_blocks"]["activities"]
        if activity["type"] == "quiz"
    )
    match_activity = next(
        activity
        for activity in store.lessons["hello-family"]["learning_blocks"]["activities"]
        if activity["type"] == "match"
    )

    assert hello_family["status"] == "UPDATED"
    assert min(quiz_activity["config"]["question_ids"]) >= 6001
    assert quiz_activity["title"] == "Keep authored quiz title"
    assert quiz_activity["config"]["question_count"] == 1
    assert match_activity["title"] == "Keep authored match title"
    assert match_activity["config"]["vocabulary_ids"] == ["legacy-match-vocabulary"]
    assert min(match_activity["config"]["mini_game_item_ids"]) >= 9001


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

    def scalars(self):
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
    session = _FakeSession([[]])

    with pytest.raises(RuntimeError, match="Missing release catalog courses"):
        await _load_live_store(session, manifest, "momo-home-family-english-5-7")


@pytest.mark.asyncio
async def test_live_loader_rejects_ambiguous_duplicate_quiz_semantic_dependencies(manifest, catalog):
    course = catalog["momo-home-family-english-5-7"]
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
    session = _FakeSession([_course_rows(course), _lesson_rows(course), [], [], duplicate_quiz_rows, []])

    with pytest.raises(CanonicalMomoConflict, match="Ambiguous existing quiz semantic identity"):
        await _load_live_store(session, manifest, "momo-home-family-english-5-7")


@pytest.mark.asyncio
async def test_live_loader_rejects_duplicate_quiz_option_order_with_conflicting_value(manifest, catalog):
    course = catalog["momo-home-family-english-5-7"]
    quiz_row = {
        "id": 11,
        "question_id": "momo-home-family-english-5-7:hello-family:quiz:hello-family-q1",
        "flashcard_qr_id": "fc-mom",
        "question_text": "Tap mom.",
        "question_type": "multiple_choice",
        "correct_answer": "Mom",
        "option_order": 1,
        "value": "Mom",
    }
    conflicting_option = {**quiz_row, "value": "Dad"}
    session = _FakeSession([_course_rows(course), _lesson_rows(course), [], [], [quiz_row, conflicting_option], []])

    with pytest.raises(CanonicalMomoConflict, match="Conflicting quiz option values"):
        await _load_live_store(session, manifest, "momo-home-family-english-5-7")


@pytest.mark.asyncio
async def test_precommit_validation_rejects_learning_blocks_with_unpersisted_ids(manifest, catalog):
    store = _build_store(manifest, catalog)
    apply_canonical_catalog(store, manifest, course_id="momo-home-family-english-5-7", apply=True)
    quiz_activity = next(
        activity
        for activity in store.lessons["hello-family"]["learning_blocks"]["activities"]
        if activity["type"] == "quiz"
    )
    quiz_activity["config"]["question_ids"][0] = 999999
    session = _FakeSession([[]])

    with pytest.raises(CanonicalMomoConflict, match="missing quiz_questions IDs"):
        await _validate_learning_block_references_in_transaction(
            session,
            store,
            lesson_ids={"hello-family"},
        )


@pytest.mark.asyncio
async def test_precommit_validation_ignores_stale_binding_from_open_session_lesson(manifest, catalog):
    store = _build_store(manifest, catalog)
    course_id = "momo-home-family-english-5-7"
    store.catalog = {course_id: store.catalog[course_id]}
    store.lessons["hello-family"]["open_session_count"] = 1
    apply_canonical_catalog(store, manifest, course_id=course_id, apply=True)

    eligible_lesson_id = "my-room"
    skipped_blocks = deepcopy(store.lessons[eligible_lesson_id]["learning_blocks"])
    skipped_quiz = next(activity for activity in skipped_blocks["activities"] if activity["type"] == "quiz")
    skipped_quiz["config"]["question_ids"][0] = 1001
    store.lessons["hello-family"]["learning_blocks"] = skipped_blocks

    eligible_question_ids = [
        question_id
        for lesson_id in _lesson_ids_without_open_sessions(store)
        for activity in readback_lesson_blocks(store.lessons[lesson_id]["learning_blocks"]).activities
        if activity.type == "quiz"
        for question_id in activity.config.question_ids
    ]
    eligible_game_ids = [
        game_id
        for lesson_id in _lesson_ids_without_open_sessions(store)
        for activity in readback_lesson_blocks(store.lessons[lesson_id]["learning_blocks"]).activities
        if activity.type == "match"
        for game_id in activity.config.mini_game_item_ids
    ]
    session = _FakeSession([eligible_question_ids, eligible_game_ids])

    await _validate_learning_block_references_in_transaction(
        session,
        store,
        lesson_ids=_lesson_ids_without_open_sessions(store),
    )


@pytest.mark.asyncio
async def test_precommit_validation_rejects_stale_binding_from_non_open_lesson_even_when_unchanged(manifest, catalog):
    store = _build_store(manifest, catalog)
    course_id = "momo-home-family-english-5-7"
    store.catalog = {course_id: store.catalog[course_id]}
    apply_canonical_catalog(store, manifest, course_id=course_id, apply=True)
    stale_lesson_id = "my-room"
    stale_quiz = next(
        activity
        for activity in store.lessons[stale_lesson_id]["learning_blocks"]["activities"]
        if activity["type"] == "quiz"
    )
    stale_quiz["config"]["question_ids"][0] = 999999

    question_ids = set()
    game_ids = set()
    for lesson_id in _lesson_ids_without_open_sessions(store):
        blocks = readback_lesson_blocks(store.lessons[lesson_id]["learning_blocks"])
        for activity in blocks.activities:
            if activity.type == "quiz":
                question_ids.update(activity.config.question_ids)
            elif activity.type == "match":
                game_ids.update(activity.config.mini_game_item_ids)
    session = _FakeSession([sorted(question_ids - {999999}), sorted(game_ids)])

    with pytest.raises(CanonicalMomoConflict, match=r"missing quiz_questions IDs: \[999999\]"):
        await _validate_learning_block_references_in_transaction(
            session,
            store,
            lesson_ids=_lesson_ids_without_open_sessions(store),
        )


@pytest.mark.asyncio
async def test_dry_run_readback_reports_invalid_legacy_v2_payload_without_crashing(monkeypatch, manifest, catalog):
    store = _build_store(manifest, catalog)
    course_id = "momo-home-family-english-5-7"
    store.catalog = {course_id: store.catalog[course_id]}
    apply_canonical_catalog(store, manifest, course_id=course_id, apply=True)
    store.lessons["my-room"]["learning_blocks"] = {"schema_version": 2, "content_version": 1}

    async def load_store(*_args, **_kwargs):
        return store

    monkeypatch.setattr(momo_apply, "_load_live_store", load_store)

    result = await _readback_live(
        None,
        manifest,
        course_id,
        apply=False,
        mutated_lesson_ids={"my-room"},
    )

    my_room = next(item for item in result["lessons"] if item["lesson_id"] == "my-room")
    assert my_room["schema_version"] == 2
    assert my_room["activity_count"] == 0


@pytest.mark.asyncio
async def test_post_apply_readback_rejects_invalid_v2_payload_for_mutated_lesson(monkeypatch, manifest, catalog):
    store = _build_store(manifest, catalog)
    course_id = "momo-home-family-english-5-7"
    store.catalog = {course_id: store.catalog[course_id]}
    apply_canonical_catalog(store, manifest, course_id=course_id, apply=True)
    store.lessons["my-room"]["learning_blocks"] = {"schema_version": 2, "content_version": 1}

    async def load_store(*_args, **_kwargs):
        return store

    monkeypatch.setattr(momo_apply, "_load_live_store", load_store)

    with pytest.raises(ValidationError):
        await _readback_live(
            None,
            manifest,
            course_id,
            apply=True,
            mutated_lesson_ids={"my-room"},
        )
