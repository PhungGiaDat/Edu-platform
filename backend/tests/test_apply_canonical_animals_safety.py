from copy import deepcopy
from types import SimpleNamespace

import pytest
import database.seed.apply_canonical_animals as animals_apply

from database.seed.apply_canonical_animals import (
    CanonicalContentConflict,
    _merge_learning_blocks,
    _merge_course_metadata,
    _non_destructive_owned_merge,
    _option_rows_by_order,
    _open_session_counts,
    _question_flashcard_qr_id,
    _resolve_flashcard_mapping,
    reconcile,
)
from database.seed.canonical_animals import COURSE, LESSONS


class _MappingsResult:
    def __init__(self, rows):
        self.rows = rows

    def mappings(self):
        return self

    def all(self):
        return self.rows


class _Session:
    def __init__(self, rows):
        self.rows = rows

    async def execute(self, *_args, **_kwargs):
        return _MappingsResult(self.rows)


class _ScalarResult:
    def scalars(self):
        return self

    def unique(self):
        return self

    def all(self):
        return []


class _ReconcileSession:
    def __init__(self):
        self.added = []
        self.flush_count = 0
        self.course = SimpleNamespace(
            title=COURSE.title,
            title_vi=COURSE.title_vi,
            category_key=COURSE.category_key,
            category_label=COURSE.category_label,
            category_icon=COURSE.category_icon,
            level=COURSE.level,
            is_published=True,
        )

    async def get(self, *_args, **_kwargs):
        return self.course

    async def execute(self, *_args, **_kwargs):
        return _ScalarResult()

    def add(self, row):
        self.added.append(row)

    async def flush(self):
        self.flush_count += 1


@pytest.mark.asyncio
async def test_open_lesson_sessions_are_detected_before_reconciliation_mutation():
    counts = await _open_session_counts(_Session([{"lesson_id": "learn-the-cat", "open_session_count": 1}]))

    assert counts == {"learn-the-cat": 1}


@pytest.mark.asyncio
async def test_reconcile_mutate_skips_open_lessons_before_dependency_or_lesson_mutation(monkeypatch):
    session = _ReconcileSession()
    monkeypatch.setattr(
        animals_apply,
        "_open_session_counts",
        lambda _session: _async_result({lesson.lesson_id: 1 for lesson in LESSONS}),
    )
    monkeypatch.setattr(animals_apply, "_resolve_flashcards", lambda _session: _async_result(({}, [])))

    report = await reconcile(session, mutate=True)

    assert report.lessons.records == {lesson.lesson_id: "LEGACY_FALLBACK" for lesson in LESSONS}
    assert report.quiz_questions.records == {}
    assert report.mini_game_items.records == {}
    assert session.added == []


async def _async_result(value):
    return value


def test_source_owned_merge_fills_empty_but_rejects_populated_difference():
    merged, changed = _non_destructive_owned_merge(
        entity="course:animals",
        current={"category_key": ""},
        canonical={"category_key": "animals"},
    )

    assert merged["category_key"] == "animals"
    assert changed == ["category_key"]
    with pytest.raises(CanonicalContentConflict, match="is_published"):
        _non_destructive_owned_merge(
            entity="course:animals",
            current={"is_published": False},
            canonical={"is_published": True},
        )


def test_course_taxonomy_exception_only_repairs_exact_legacy_nature_values():
    merged, changed = _merge_course_metadata(
        {
            "category_key": "nature",
            "category_label": "Nature",
            "category_icon": "🌿",
            "title": COURSE.title,
        },
        {
            "category_key": "animals",
            "category_label": "Animals",
            "category_icon": "🐾",
            "title": COURSE.title,
        },
    )

    assert changed == ["category_key", "category_label", "category_icon"]
    assert {field: merged[field] for field in changed} == {
        "category_key": "animals",
        "category_label": "Animals",
        "category_icon": "🐾",
    }


def test_course_taxonomy_exception_rejects_any_other_populated_mismatch():
    with pytest.raises(CanonicalContentConflict, match="title"):
        _merge_course_metadata(
            {"title": "Custom Animals Title"},
            {"title": COURSE.title},
        )

    with pytest.raises(CanonicalContentConflict, match="category_key"):
        _merge_course_metadata(
            {"category_key": "food"},
            {"category_key": "animals"},
        )


def test_mixed_review_quiz_uses_question_vocabulary_not_enclosing_lesson_focus():
    fish_question = SimpleNamespace(vocabulary_id="animals-v1-fish")
    mapping = {"animals-v1-dog": "dog-flashcard", "animals-v1-fish": "fish-flashcard"}

    assert _question_flashcard_qr_id(mapping, fish_question) == "fish-flashcard"


def test_quiz_question_vocabulary_mismatch_remains_rejected():
    fish_question = SimpleNamespace(key="learn-the-dog:identify:animals-v1-fish", vocabulary_id="animals-v1-fish")

    with pytest.raises(CanonicalContentConflict, match="expected fish-flashcard"):
        _question_flashcard_qr_id(
            {"animals-v1-fish": "fish-flashcard"},
            fish_question,
            existing_qr_id="dog-flashcard",
        )


def test_flashcard_resolver_falls_back_to_exact_animals_v1_qr_identity_for_fish():
    mapping, conflicts = _resolve_flashcard_mapping(
        [{"qr_id": "animals-v1-fish", "word": "Fish "}],
        {"animals-v1-fish": "Fish"},
    )

    assert mapping == {"animals-v1-fish": "animals-v1-fish"}
    assert conflicts == []


def test_flashcard_resolver_accepts_exact_qr_identity_even_when_stored_word_differs():
    mapping, conflicts = _resolve_flashcard_mapping(
        [{"qr_id": "animals-v1-fish", "word": "Dog"}],
        {"animals-v1-fish": "Fish"},
    )

    assert mapping == {"animals-v1-fish": "animals-v1-fish"}
    assert conflicts == []


def test_flashcard_resolver_rejects_duplicate_exact_qr_identity():
    mapping, conflicts = _resolve_flashcard_mapping(
        [
            {"qr_id": "animals-v1-fish", "word": "Fish"},
            {"qr_id": "animals-v1-fish", "word": "Dog"},
        ],
        {"animals-v1-fish": "Fish"},
    )

    assert mapping == {"animals-v1-fish": "__missing__:animals-v1-fish"}
    assert conflicts == ["Ambiguous flashcard semantic identity for animals-v1-fish"]


def test_schema_v2_block_merge_preserves_authored_config_and_only_refreshes_bindings():
    existing = {
        "schema_version": 2,
        "content_version": 1,
        "activities": [
            {"activity_id": "learn", "type": "learn_vocabulary", "order": 1, "required": True, "config": {"keep": 1}},
            {"activity_id": "game", "type": "mini_game", "order": 2, "required": True, "title": "Keep game", "config": {"mini_game_item_ids": [1], "keep": "game"}},
            {"activity_id": "quiz", "type": "quiz", "order": 3, "required": True, "title": "Keep quiz", "config": {"question_ids": [2], "keep": "quiz"}},
        ],
    }
    canonical = deepcopy(existing)
    canonical["activities"][1]["config"]["mini_game_item_ids"] = [101]
    canonical["activities"][2]["config"]["question_ids"] = [201, 202]

    merged, changed = _merge_learning_blocks(existing, canonical)

    assert changed is True
    assert merged["activities"][1]["title"] == "Keep game"
    assert merged["activities"][1]["config"] == {"mini_game_item_ids": [101], "keep": "game"}
    assert merged["activities"][2]["title"] == "Keep quiz"
    assert merged["activities"][2]["config"] == {"question_ids": [201, 202], "keep": "quiz"}


def test_schema_v2_block_merge_rejects_changed_activity_shape():
    existing = {"schema_version": 2, "activities": []}
    canonical = {"schema_version": 2, "activities": [{"activity_id": "quiz", "type": "quiz", "order": 1, "required": True, "config": {"question_ids": []}}]}

    with pytest.raises(CanonicalContentConflict, match="activities differ"):
        _merge_learning_blocks(existing, canonical)


def test_legacy_block_merge_fails_closed_instead_of_replacing_payload():
    with pytest.raises(CanonicalContentConflict, match="legacy learning_blocks"):
        _merge_learning_blocks({"quiz": [{"question_id": 1001}]}, {"schema_version": 2, "activities": []})


def test_duplicate_option_order_with_different_values_fails_closed():
    duplicate = type("Option", (), {"option_order": 1, "value": "Cat"})()
    conflict = type("Option", (), {"option_order": 1, "value": "Dog"})()

    with pytest.raises(CanonicalContentConflict, match="duplicate option order"):
        _option_rows_by_order("animals:q1", [duplicate, conflict])
