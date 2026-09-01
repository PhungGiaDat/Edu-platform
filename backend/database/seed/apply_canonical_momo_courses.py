"""Apply canonical adaptive lesson blocks for the release Momo catalog."""

from __future__ import annotations

import argparse
import asyncio
import copy
import json
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import text

from database.orm_session import close_orm, connect_orm, session_factory
from database.seed.canonical_momo_courses import (
    REQUIRED_ACTIVITY_TYPES,
    ManifestCatalog,
    build_course_index,
    build_match_payload,
    build_missing_flashcard_owner_payload,
    generate_lesson_blocks,
    load_manifest,
    normalize_key,
)
from models.lesson_activity import LessonLearningBlocks


class CanonicalMomoConflict(RuntimeError):
    """Raised when a canonical semantic identity conflicts with existing content."""


def readback_lesson_blocks(payload: dict[str, Any]) -> LessonLearningBlocks:
    blocks = LessonLearningBlocks.model_validate(payload)
    if blocks.schema_version == 2:
        actual = [activity.type for activity in blocks.activities]
        if actual != list(REQUIRED_ACTIVITY_TYPES):
            raise ValueError("canonical activities missing or out of order")
    return blocks


@dataclass
class InMemoryMomoCatalogStore:
    catalog: dict[str, Any]
    manifest: ManifestCatalog
    courses: dict[str, dict[str, Any]]
    lessons: dict[str, dict[str, Any]]
    flashcards: dict[str, dict[str, Any]] = field(default_factory=dict)
    quiz_questions: dict[str, dict[str, Any]] = field(default_factory=dict)
    quiz_options: dict[tuple[str, int], str] = field(default_factory=dict)
    mini_game_items: dict[str, dict[str, Any]] = field(default_factory=dict)
    user_course_progress: dict[str, Any] = field(default_factory=dict)
    user_course_lesson_progress: dict[str, Any] = field(default_factory=dict)
    lesson_sessions: dict[str, dict[str, Any]] = field(default_factory=dict)
    lesson_session_steps: dict[str, Any] = field(default_factory=dict)
    lesson_step_attempts: dict[str, Any] = field(default_factory=dict)
    gamification_history: dict[str, Any] = field(default_factory=dict)
    _next_question_id: int = 1000
    _next_game_id: int = 2000

    @classmethod
    def from_catalog(cls, catalog: dict[str, Any], manifest: ManifestCatalog) -> "InMemoryMomoCatalogStore":
        courses = {
            course_id: {
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
                "thumbnail": copy.deepcopy(course.thumbnail),
                "catalog_preview": [copy.deepcopy(item) for item in course.catalog_preview],
                "is_published": course.is_published,
            }
            for course_id, course in catalog.items()
        }
        lessons: dict[str, dict[str, Any]] = {}
        for course in catalog.values():
            for lesson in course.lessons:
                lessons[lesson.lesson_id] = {
                    "lesson_id": lesson.lesson_id,
                    "course_id": course.course_id,
                    "title": lesson.title,
                    "title_vi": lesson.title_vi,
                    "description": lesson.description,
                    "lesson_order": lesson.order,
                    "duration_minutes": lesson.duration_minutes,
                    "learning_blocks": copy.deepcopy(lesson.learning_blocks),
                    "open_session_count": 0,
                }
        return cls(catalog=catalog, manifest=manifest, courses=courses, lessons=lessons)

    def seed_flashcard(
        self,
        qr_id: str,
        word_en: str,
        word_vi: str,
        category: str,
        *,
        image_url: str | None = None,
        audio_url: str | None = None,
        difficulty: str = "easy",
        is_active: bool = True,
    ) -> None:
        self.flashcards[qr_id] = {
            "qr_id": qr_id,
            "word_en": word_en,
            "word_vi": word_vi,
            "word": word_en,
            "translation": {"en": word_en.lower(), "vi": word_vi},
            "category": category,
            "image_url": image_url,
            "audio_url": audio_url,
            "difficulty": difficulty,
            "is_active": is_active,
        }

    def seed_conflicting_quiz(
        self,
        *,
        semantic_id: str,
        flashcard_qr_id: str,
        question_text: str,
        options: tuple[str, ...],
        correct_answer: str,
    ) -> None:
        self._next_question_id += 1
        self.quiz_questions[semantic_id] = {
            "id": self._next_question_id,
            "semantic_id": semantic_id,
            "flashcard_qr_id": flashcard_qr_id,
            "question_text": question_text,
            "question_type": "multiple_choice",
            "correct_answer": correct_answer,
        }
        for index, value in enumerate(options, start=1):
            self.quiz_options[(semantic_id, index)] = value

    def snapshot(self) -> dict[str, Any]:
        return copy.deepcopy(
            {
                "courses": self.courses,
                "lessons": self.lessons,
                "flashcards": self.flashcards,
                "quiz_questions": self.quiz_questions,
                "quiz_options": self.quiz_options,
                "mini_game_items": self.mini_game_items,
                "runtime": self.runtime_snapshot(),
            }
        )

    def runtime_snapshot(self) -> dict[str, Any]:
        return copy.deepcopy(
            {
                "user_course_progress": self.user_course_progress,
                "user_course_lesson_progress": self.user_course_lesson_progress,
                "lesson_sessions": self.lesson_sessions,
                "lesson_session_steps": self.lesson_session_steps,
                "lesson_step_attempts": self.lesson_step_attempts,
                "gamification_history": self.gamification_history,
            }
        )


def _is_empty_value(value: Any) -> bool:
    return value is None or value == "" or value == [] or value == {}


def _looks_like_lossy_text(value: Any) -> bool:
    if not isinstance(value, str) or not value:
        return False
    return "?" in value or "\ufffd" in value


def _non_destructive_owned_merge(
    *,
    entity: str,
    current: dict[str, Any],
    canonical: dict[str, Any],
    allow_lossy_text_repair: bool = True,
) -> tuple[dict[str, Any], str, list[str]]:
    merged = copy.deepcopy(current)
    changed: list[str] = []
    for field_name, canonical_value in canonical.items():
        if _is_empty_value(canonical_value):
            continue
        current_value = merged.get(field_name)
        if current_value == canonical_value:
            continue
        if _is_empty_value(current_value):
            merged[field_name] = copy.deepcopy(canonical_value)
            changed.append(field_name)
            continue
        if allow_lossy_text_repair and isinstance(canonical_value, str) and _looks_like_lossy_text(current_value):
            merged[field_name] = canonical_value
            changed.append(field_name)
            continue
        raise CanonicalMomoConflict(f"CONFLICT: {entity}.{field_name} has non-empty non-canonical value")
    return merged, "NO_CHANGE" if not changed else "UPDATE", changed


def _course_metadata_payload(course) -> dict[str, Any]:
    return {
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
        "thumbnail": copy.deepcopy(course.thumbnail),
        "catalog_preview": [copy.deepcopy(item) for item in course.catalog_preview],
        "is_published": course.is_published,
    }


def _lesson_metadata_payload(course, lesson) -> dict[str, Any]:
    return {
        "course_id": course.course_id,
        "title": lesson.title,
        "title_vi": lesson.title_vi,
        "description": lesson.description,
        "lesson_order": lesson.order,
        "duration_minutes": lesson.duration_minutes,
    }


def _merge_course_metadata(current: dict[str, Any], course) -> tuple[dict[str, Any], str, list[str]]:
    return _non_destructive_owned_merge(
        entity=f"course:{course.course_id}",
        current=current,
        canonical=_course_metadata_payload(course),
    )


def _merge_lesson_metadata(current: dict[str, Any], course, lesson) -> tuple[dict[str, Any], str, list[str]]:
    return _non_destructive_owned_merge(
        entity=f"lesson:{lesson.lesson_id}",
        current=current,
        canonical=_lesson_metadata_payload(course, lesson),
    )


def _flashcard_semantic_index(*rows: dict[str, dict[str, Any]]) -> dict[tuple[str, str], list[str]]:
    by_semantics: dict[tuple[str, str], list[str]] = {}
    for collection in rows:
        for row in collection.values():
            key = (normalize_key(row["word_en"]), normalize_key(row["word_vi"]))
            by_semantics.setdefault(key, []).append(row["qr_id"])
    return by_semantics


def _same_flashcard_semantics(row: dict[str, Any], *, word_en: str, word_vi: str) -> bool:
    return (
        normalize_key(str(row.get("word_en") or row.get("word") or "")) == normalize_key(word_en)
        and normalize_key(str(row.get("word_vi") or row.get("translation", {}).get("vi") or "")) == normalize_key(word_vi)
    )


def _resolve_flashcards(
    store: InMemoryMomoCatalogStore,
    course,
    lesson,
    plan,
    pending_flashcards: dict[str, dict[str, Any]],
) -> tuple[dict[str, str], list[str], list[str]]:
    by_semantics = _flashcard_semantic_index(store.flashcards, pending_flashcards)
    resolved: dict[str, str] = {}
    conflicts: list[str] = []
    created: list[str] = []
    source_by_key = {item.key: item for item in plan.vocabulary}
    for item in plan.vocabulary:
        matches = by_semantics.get((normalize_key(item.word_en), normalize_key(item.word_vi)), [])
        if len(matches) == 1:
            resolved[item.key] = matches[0]
        elif matches:
            conflicts.append(f"AMBIGUOUS_FLASHCARD:{plan.lesson_id}:{item.key}")
        else:
            try:
                payload = build_missing_flashcard_owner_payload(
                    course_id=course.course_id,
                    lesson_id=lesson.lesson_id,
                    vocabulary_item={
                        "word_en": source_by_key[item.key].word_en,
                        "word_vi": source_by_key[item.key].word_vi,
                        "image": source_by_key[item.key].source_image,
                        "audio": source_by_key[item.key].source_audio,
                    },
                    category_key=course.category_key,
                )
            except ValueError:
                conflicts.append(f"MISSING_FLASHCARD:{plan.lesson_id}:{item.key}")
                continue
            existing = store.flashcards.get(payload["qr_id"]) or pending_flashcards.get(payload["qr_id"])
            if existing is not None and not _same_flashcard_semantics(
                existing,
                word_en=payload["word_en"],
                word_vi=payload["word_vi"],
            ):
                raise CanonicalMomoConflict(f"Conflicting flashcard owner semantic qr_id {payload['qr_id']}")
            if existing is None:
                pending_flashcards[payload["qr_id"]] = payload
                created.append(payload["qr_id"])
                by_semantics.setdefault((normalize_key(payload["word_en"]), normalize_key(payload["word_vi"])), []).append(
                    payload["qr_id"]
                )
            resolved[item.key] = payload["qr_id"]
    return resolved, conflicts, created


def _question_payload(plan, question, flashcard_qr_id: str, source_question: dict[str, Any]) -> tuple[dict[str, Any], tuple[str, ...]]:
    options = tuple(str(option["label"]) for option in source_question["options"])
    correct_id = source_question["correctOptionId"]
    correct = next(option for option in source_question["options"] if option["option_id"] == correct_id)
    payload = {
        "semantic_id": question.question_key,
        "flashcard_qr_id": flashcard_qr_id,
        "question_text": str(source_question.get("questionAudioText") or source_question.get("prompt_vi") or source_question["question_id"]),
        "question_type": "multiple_choice",
        "correct_answer": str(correct["label"]),
    }
    return payload, options


def _ensure_question(
    store: InMemoryMomoCatalogStore,
    *,
    semantic_id: str,
    payload: dict[str, Any],
    options: tuple[str, ...],
    apply: bool,
    preview_ids: dict[str, int],
) -> tuple[int, str, int]:
    existing = store.quiz_questions.get(semantic_id)
    if existing is None:
        preview_ids.setdefault(semantic_id, store._next_question_id + len(preview_ids) + 1)
        if apply:
            store._next_question_id += 1
            store.quiz_questions[semantic_id] = {"id": store._next_question_id, **payload}
            for index, value in enumerate(options, start=1):
                store.quiz_options[(semantic_id, index)] = value
            return store._next_question_id, "CREATE", len(options)
        return preview_ids[semantic_id], "CREATE", len(options)

    comparable = {key: existing[key] for key in ("semantic_id", "flashcard_qr_id", "question_text", "question_type", "correct_answer")}
    if comparable != {key: payload[key] for key in comparable}:
        raise CanonicalMomoConflict(f"Conflicting quiz payload for {semantic_id}")
    existing_orders = {order for option_semantic_id, order in store.quiz_options if option_semantic_id == semantic_id}
    unsupported_orders = sorted(order for order in existing_orders if order < 1 or order > len(options))
    if unsupported_orders:
        raise CanonicalMomoConflict(f"Conflicting quiz option identities for {semantic_id}")
    created_options = 0
    for index, expected in enumerate(options, start=1):
        key = (semantic_id, index)
        current = store.quiz_options.get(key)
        if current is None:
            if apply:
                store.quiz_options[key] = expected
            created_options += 1
            continue
        if current != expected:
            raise CanonicalMomoConflict(f"Conflicting quiz options for {semantic_id}")
    state = "UPDATE" if created_options else "NO_CHANGE"
    return int(existing["id"]), state, created_options


def _ensure_mini_game(
    store: InMemoryMomoCatalogStore,
    *,
    semantic_id: str,
    payload: dict[str, Any],
    flashcard_ids: dict[str, str],
    apply: bool,
    preview_ids: dict[str, int],
) -> tuple[int, str]:
    existing = store.mini_game_items.get(semantic_id)
    stored = {
        "semantic_id": semantic_id,
        "game_type": "drag_match",
        "flashcard_qr_id": flashcard_ids[next(iter(flashcard_ids))],
        "payload": payload,
    }
    if existing is None:
        preview_ids.setdefault(semantic_id, store._next_game_id + len(preview_ids) + 1)
        if apply:
            store._next_game_id += 1
            store.mini_game_items[semantic_id] = {"id": store._next_game_id, **stored}
            return store._next_game_id, "CREATE"
        return preview_ids[semantic_id], "CREATE"
    comparable = {key: existing[key] for key in ("semantic_id", "game_type", "flashcard_qr_id", "payload")}
    if comparable != stored:
        raise CanonicalMomoConflict(f"Conflicting mini-game payload for {semantic_id}")
    return int(existing["id"]), "NO_CHANGE"


def _merge_learning_blocks(existing: dict[str, Any], canonical: dict[str, Any]) -> tuple[dict[str, Any], str]:
    merged = copy.deepcopy(existing)
    schema_version = int(merged.get("schema_version", 1)) if isinstance(merged, dict) else 1
    for key in ("schema_version", "content_version", "vocabulary", "activities"):
        if schema_version == 2 and key == "activities" and merged.get(key):
            existing_shape = [
                (item["activity_id"], item["type"], item["order"], item["required"])
                for item in merged[key]
            ]
            canonical_shape = [
                (item["activity_id"], item["type"], item["order"], item["required"])
                for item in canonical[key]
            ]
            if existing_shape != canonical_shape:
                raise CanonicalMomoConflict("CONFLICT: existing canonical activities differ")
            canonical_by_activity = {item["activity_id"]: item for item in canonical[key]}
            for item in merged[key]:
                canonical_item = canonical_by_activity[item["activity_id"]]
                if item["type"] == "quiz":
                    item.setdefault("config", {})["question_ids"] = copy.deepcopy(
                        canonical_item["config"]["question_ids"]
                    )
                elif item["type"] == "match":
                    item.setdefault("config", {})["mini_game_item_ids"] = copy.deepcopy(
                        canonical_item["config"]["mini_game_item_ids"]
                    )
            continue
        if schema_version == 2 and key == "vocabulary" and merged.get(key) and merged[key] != canonical[key]:
            raise CanonicalMomoConflict("CONFLICT: existing canonical vocabulary differs")
        merged[key] = copy.deepcopy(canonical[key])
    return merged, "NO_CHANGE" if merged == existing else "UPDATE"


def _refresh_lesson_blocks_with_actual_ids(store: InMemoryMomoCatalogStore) -> None:
    for selected_course_id, course in store.catalog.items():
        for lesson in course.lessons:
            if int(store.lessons[lesson.lesson_id].get("open_session_count", 0)) > 0:
                continue
            plan = store.manifest.lesson_plan(selected_course_id, lesson.lesson_id)
            if (
                any(question.question_key not in store.quiz_questions for question in plan.quiz_questions)
                or plan.match_activity.game_key not in store.mini_game_items
            ):
                continue
            question_ids = {
                question.question_key: int(store.quiz_questions[question.question_key]["id"])
                for question in plan.quiz_questions
            }
            mini_game_id = int(store.mini_game_items[plan.match_activity.game_key]["id"])
            canonical = generate_lesson_blocks(
                course,
                lesson,
                plan,
                {
                    "question_ids": question_ids,
                    "mini_game_ids": {plan.match_activity.game_key: mini_game_id},
                },
            )
            merged, _ = _merge_learning_blocks(store.lessons[lesson.lesson_id]["learning_blocks"], canonical)
            store.lessons[lesson.lesson_id]["learning_blocks"] = merged


def apply_canonical_catalog(
    store: InMemoryMomoCatalogStore,
    manifest: ManifestCatalog,
    *,
    course_id: str | None = None,
    apply: bool,
) -> dict[str, Any]:
    selected_courses = [course_id] if course_id else list(store.catalog)
    lessons_report: list[dict[str, Any]] = []
    inserted_rows = 0
    extended_rows = 0
    unchanged_rows = 0
    before = store.snapshot()
    pending_flashcards: dict[str, dict[str, Any]] = {}
    preview_question_ids: dict[str, int] = {}
    preview_game_ids: dict[str, int] = {}
    courses_report: list[dict[str, Any]] = []
    try:
        for selected_course_id in selected_courses:
            course = store.catalog[selected_course_id]
            course_report = {
                "course_id": selected_course_id,
                "status": "NO_CHANGE",
                "updated": [],
                "conflicts": [],
            }
            merged_course, course_state, course_fields = _merge_course_metadata(store.courses[selected_course_id], course)
            if apply and course_state != "NO_CHANGE":
                store.courses[selected_course_id] = merged_course
            if course_state != "NO_CHANGE":
                course_report["status"] = "UPDATED"
                course_report["updated"] = [f"metadata.{field_name}" for field_name in course_fields]
                extended_rows += 1
            courses_report.append(course_report)
            for lesson in course.lessons:
                plan = manifest.lesson_plan(selected_course_id, lesson.lesson_id)
                report = {
                    "course_id": selected_course_id,
                    "lesson_id": lesson.lesson_id,
                    "status": "NO_CHANGE",
                    "created": [],
                    "updated": [],
                    "unchanged": [],
                    "fallback_reason": None,
                    "conflicts": [],
                    "open_session_count": int(store.lessons[lesson.lesson_id].get("open_session_count", 0)),
                }
                if report["open_session_count"] > 0:
                    report["status"] = "LEGACY_FALLBACK"
                    report["fallback_reason"] = "OPEN_LESSON_SESSION"
                    report["conflicts"] = [
                        f"OPEN_LESSON_SESSION:{lesson.lesson_id}:{report['open_session_count']}"
                    ]
                    lessons_report.append(report)
                    unchanged_rows += 1
                    continue

                merged_lesson_metadata, lesson_metadata_state, lesson_fields = _merge_lesson_metadata(
                    store.lessons[lesson.lesson_id],
                    course,
                    lesson,
                )
                flashcard_ids, flashcard_conflicts, created_flashcards = _resolve_flashcards(
                    store,
                    course,
                    lesson,
                    plan,
                    pending_flashcards,
                )
                if flashcard_conflicts:
                    report["status"] = "LEGACY_FALLBACK"
                    report["fallback_reason"] = "UNRESOLVED_FLASHCARD_REFERENCES"
                    report["conflicts"] = flashcard_conflicts
                    lessons_report.append(report)
                    unchanged_rows += 1
                    continue
                if apply:
                    for qr_id in created_flashcards:
                        payload = pending_flashcards[qr_id]
                        store.seed_flashcard(
                            qr_id,
                            payload["word_en"],
                            payload["word_vi"],
                            payload["category"],
                            image_url=payload["image_url"],
                            audio_url=payload["audio_url"],
                            difficulty=payload["difficulty"],
                            is_active=payload["is_active"],
                        )

                source_quiz_by_id = {
                    item["question_id"]: item
                    for item in store.lessons[lesson.lesson_id]["learning_blocks"]["quiz"]
                }
                question_ids: dict[str, int] = {}
                question_states: list[str] = []
                created_option_rows = 0
                for question in plan.quiz_questions:
                    payload, options = _question_payload(
                        plan,
                        question,
                        flashcard_ids[question.vocabulary_key],
                        source_quiz_by_id[question.source_question_id],
                    )
                    question_id, state, option_creates = _ensure_question(
                        store,
                        semantic_id=question.question_key,
                        payload=payload,
                        options=options,
                        apply=apply,
                        preview_ids=preview_question_ids,
                    )
                    question_ids[question.question_key] = question_id
                    question_states.append(state)
                    created_option_rows += option_creates

                mini_game_payload = build_match_payload(plan, flashcard_ids)
                mini_game_id, mini_game_state = _ensure_mini_game(
                    store,
                    semantic_id=plan.match_activity.game_key,
                    payload=mini_game_payload,
                    flashcard_ids=flashcard_ids,
                    apply=apply,
                    preview_ids=preview_game_ids,
                )
                canonical = generate_lesson_blocks(
                    course,
                    lesson,
                    plan,
                    {
                        "question_ids": question_ids,
                        "mini_game_ids": {plan.match_activity.game_key: mini_game_id},
                    },
                )
                merged, lesson_state = _merge_learning_blocks(store.lessons[lesson.lesson_id]["learning_blocks"], canonical)
                if lesson_metadata_state != "NO_CHANGE":
                    merged_lesson_metadata["learning_blocks"] = store.lessons[lesson.lesson_id]["learning_blocks"]
                    store.lessons[lesson.lesson_id] = merged_lesson_metadata if apply else store.lessons[lesson.lesson_id]
                if apply and lesson_state != "NO_CHANGE":
                    store.lessons[lesson.lesson_id]["learning_blocks"] = merged
                readback_lesson_blocks(merged)

                created = (
                    len(created_flashcards)
                    + sum(state == "CREATE" for state in [*question_states, mini_game_state])
                    + created_option_rows
                )
                updated = int(lesson_state == "UPDATE") + int(lesson_metadata_state == "UPDATE")
                report["created"] = (
                    ["flashcard_owner" for _ in created_flashcards]
                    + ["quiz_dependencies" for state in question_states if state == "CREATE"]
                    + ["quiz_option" for _ in range(created_option_rows)]
                )
                if mini_game_state == "CREATE":
                    report["created"].append("mini_game_dependency")
                if lesson_metadata_state == "UPDATE":
                    report["updated"].extend(f"metadata.{field_name}" for field_name in lesson_fields)
                if lesson_state == "UPDATE":
                    report["updated"].append("learning_blocks")
                if created or updated:
                    report["status"] = "UPDATED"
                    inserted_rows += created
                    extended_rows += updated
                else:
                    report["unchanged"] = ["learning_blocks", "dependencies"]
                    unchanged_rows += 1
                lessons_report.append(report)
    except Exception:
        store.courses = before["courses"]
        store.lessons = before["lessons"]
        store.flashcards = before["flashcards"]
        store.quiz_questions = before["quiz_questions"]
        store.quiz_options = before["quiz_options"]
        store.mini_game_items = before["mini_game_items"]
        raise
    return {
        "mode": "apply" if apply else "dry-run",
        "courses": courses_report,
        "lessons": lessons_report,
        "summary": {
            "inserted_rows": inserted_rows,
            "extended_rows": extended_rows,
            "unchanged_rows": unchanged_rows,
            "deleted_rows": 0,
            "destructive_statements": 0,
        },
    }


async def _preflight_schema(session) -> None:
    rows = (
        await session.execute(
            text(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema='public' AND table_name IN "
                "('courses','lessons','flashcards','quiz_questions','quiz_question_options','mini_game_items')"
            )
        )
    ).mappings().all()
    found = {row["table_name"] for row in rows}
    expected = {"courses", "lessons", "flashcards", "quiz_questions", "quiz_question_options", "mini_game_items"}
    if found != expected:
        missing = ", ".join(sorted(expected - found))
        raise RuntimeError(f"Missing required PostgreSQL tables: {missing}")
    columns = (
        await session.execute(
            text(
                "SELECT table_name, column_name FROM information_schema.columns "
                "WHERE table_schema='public' AND ("
                "(table_name='lessons' AND column_name='learning_blocks') OR "
                "(table_name='lesson_sessions' AND column_name='content_version') OR "
                "(table_name='lesson_session_steps' AND column_name IN ('activity_type','activity_order','required')))"
            )
        )
    ).mappings().all()
    expected_columns = {
        ("lessons", "learning_blocks"),
        ("lesson_sessions", "content_version"),
        ("lesson_session_steps", "activity_type"),
        ("lesson_session_steps", "activity_order"),
        ("lesson_session_steps", "required"),
    }
    found_columns = {(row["table_name"], row["column_name"]) for row in columns}
    if found_columns != expected_columns:
        missing = ", ".join(f"{table}.{column}" for table, column in sorted(expected_columns - found_columns))
        raise RuntimeError(
            "Migration-order error: apply 20260812_01_mobile_core.sql and "
            f"20260814_03_lesson_activity_contract.sql first; missing {missing}"
        )


def _selected_catalog(course_id: str | None) -> dict[str, Any]:
    catalog = build_course_index()
    return {course_id: catalog[course_id]} if course_id else catalog


async def _load_live_store(session, manifest: ManifestCatalog, course_id: str | None) -> InMemoryMomoCatalogStore:
    catalog = _selected_catalog(course_id)
    store = InMemoryMomoCatalogStore.from_catalog(catalog, manifest)
    course_ids = list(catalog)
    lesson_ids = [lesson.lesson_id for course in catalog.values() for lesson in course.lessons]
    course_rows = (
        await session.execute(
            text(
                "SELECT course_id, title, title_vi, description, description_vi, thumbnail_url, "
                "subtitle_vi, theme, category_key, category_label, category_icon, age_range, level, "
                "thumbnail, catalog_preview, is_published "
                "FROM courses WHERE course_id=ANY(CAST(:course_ids AS text[]))"
            ),
            {"course_ids": course_ids},
        )
    ).mappings().all()
    found_courses = {str(row["course_id"]) for row in course_rows}
    if found_courses != set(course_ids):
        missing = ", ".join(sorted(set(course_ids) - found_courses))
        raise RuntimeError(f"Missing release catalog courses in PostgreSQL: {missing}")
    for row in course_rows:
        store.courses[str(row["course_id"])] = {
            "course_id": str(row["course_id"]),
            "title": str(row["title"] or ""),
            "title_vi": str(row["title_vi"] or ""),
            "description": row["description"],
            "description_vi": str(row["description_vi"] or ""),
            "thumbnail_url": row["thumbnail_url"],
            "subtitle_vi": str(row["subtitle_vi"] or ""),
            "theme": str(row["theme"] or ""),
            "category_key": str(row["category_key"] or ""),
            "category_label": str(row["category_label"] or ""),
            "category_icon": str(row["category_icon"] or ""),
            "age_range": str(row["age_range"] or ""),
            "level": str(row["level"] or ""),
            "thumbnail": copy.deepcopy(row["thumbnail"]),
            "catalog_preview": copy.deepcopy(row["catalog_preview"] or []),
            "is_published": bool(row["is_published"]),
        }
    lesson_rows = (
        await session.execute(
            text(
                "SELECT lesson_id, course_id, title, title_vi, description, lesson_order, duration_minutes, learning_blocks "
                "FROM lessons WHERE course_id=ANY(CAST(:course_ids AS text[])) "
                "ORDER BY course_id, lesson_order"
            ),
            {"course_ids": course_ids},
        )
    ).mappings().all()
    expected_lessons = {(course_id_value, lesson.lesson_id) for course_id_value, course in catalog.items() for lesson in course.lessons}
    found_lessons = {(str(row["course_id"]), str(row["lesson_id"])) for row in lesson_rows}
    if found_lessons != expected_lessons:
        missing = ", ".join(f"{item[0]}/{item[1]}" for item in sorted(expected_lessons - found_lessons))
        raise RuntimeError(f"Missing release catalog lessons in PostgreSQL: {missing}")
    for row in lesson_rows:
        lesson_id_value = str(row["lesson_id"])
        store.lessons[lesson_id_value].update(
            {
                "lesson_id": lesson_id_value,
                "course_id": str(row["course_id"]),
                "title": str(row["title"] or ""),
                "title_vi": str(row["title_vi"] or ""),
                "description": row["description"],
                "lesson_order": int(row["lesson_order"]),
                "duration_minutes": int(row["duration_minutes"]),
                "learning_blocks": copy.deepcopy(row["learning_blocks"] or {}),
            }
        )

    session_rows = (
        await session.execute(
            text(
                "SELECT lesson_id, count(*)::int AS open_session_count "
                "FROM lesson_sessions WHERE lesson_id=ANY(CAST(:lesson_ids AS text[])) "
                "AND status <> 'completed' GROUP BY lesson_id"
            ),
            {"lesson_ids": lesson_ids},
        )
    ).mappings().all()
    for row in session_rows:
        store.lessons[str(row["lesson_id"])]["open_session_count"] = int(row["open_session_count"])

    plans = [manifest.lesson_plan(course_id_value, lesson.lesson_id) for course_id_value, course in catalog.items() for lesson in course.lessons]
    words = sorted({normalize_key(item.word_en) for plan in plans for item in plan.vocabulary})
    translations = sorted({normalize_key(item.word_vi) for plan in plans for item in plan.vocabulary})
    flashcard_rows = (
        await session.execute(
            text(
                "SELECT qr_id, word, COALESCE(translation->>'vi', '') AS word_vi, category, image_url, audio_url, difficulty, is_active "
                "FROM flashcards WHERE lower(word)=ANY(CAST(:words AS text[])) "
                "OR lower(COALESCE(translation->>'vi', ''))=ANY(CAST(:translations AS text[]))"
            ),
            {"words": words, "translations": translations},
        )
    ).mappings().all()
    for row in flashcard_rows:
        store.seed_flashcard(
            str(row["qr_id"]),
            str(row["word"]),
            str(row["word_vi"]),
            str(row.get("category") or ""),
            image_url=str(row.get("image_url") or "") or None,
            audio_url=str(row.get("audio_url") or "") or None,
            difficulty=str(row.get("difficulty") or "easy"),
            is_active=bool(row.get("is_active", True)),
        )

    question_keys = [question.question_key for plan in plans for question in plan.quiz_questions]
    quiz_rows = (
        await session.execute(
            text(
                "SELECT q.id, q.question_id, q.flashcard_qr_id, q.question_text, q.question_type, q.correct_answer, "
                "o.option_order, o.value "
                "FROM quiz_questions q "
                "LEFT JOIN quiz_question_options o ON o.question_id=q.id "
                "WHERE q.question_id=ANY(CAST(:question_keys AS text[])) "
                "ORDER BY q.question_id, o.option_order"
            ),
            {"question_keys": question_keys},
        )
    ).mappings().all()
    for row in quiz_rows:
        semantic_id = str(row["question_id"])
        if semantic_id not in store.quiz_questions:
            store.quiz_questions[semantic_id] = {
                "id": int(row["id"]),
                "semantic_id": semantic_id,
                "flashcard_qr_id": str(row["flashcard_qr_id"]),
                "question_text": str(row["question_text"]),
                "question_type": str(row["question_type"]),
                "correct_answer": str(row["correct_answer"]),
            }
        else:
            existing = store.quiz_questions[semantic_id]
            comparable = {
                "id": int(row["id"]),
                "semantic_id": semantic_id,
                "flashcard_qr_id": str(row["flashcard_qr_id"]),
                "question_text": str(row["question_text"]),
                "question_type": str(row["question_type"]),
                "correct_answer": str(row["correct_answer"]),
            }
            if existing != comparable:
                raise CanonicalMomoConflict(f"Ambiguous existing quiz semantic identity {semantic_id}")
        if row["option_order"] is not None:
            option_key = (semantic_id, int(row["option_order"]))
            option_value = str(row["value"])
            existing_value = store.quiz_options.get(option_key)
            if existing_value is not None and existing_value != option_value:
                raise CanonicalMomoConflict(f"Conflicting quiz option values for {semantic_id}")
            store.quiz_options[option_key] = option_value
        store._next_question_id = max(store._next_question_id, int(row["id"]))

    game_keys = [plan.match_activity.game_key for plan in plans]
    game_rows = (
        await session.execute(
            text(
                "SELECT id, question, game_type, flashcard_qr_id, payload "
                "FROM mini_game_items WHERE question=ANY(CAST(:game_keys AS text[]))"
            ),
            {"game_keys": game_keys},
        )
    ).mappings().all()
    for row in game_rows:
        semantic_id = str(row["question"])
        if semantic_id in store.mini_game_items:
            raise CanonicalMomoConflict(f"Ambiguous existing mini-game semantic identity {semantic_id}")
        store.mini_game_items[semantic_id] = {
            "id": int(row["id"]),
            "semantic_id": semantic_id,
            "game_type": str(row["game_type"]),
            "flashcard_qr_id": str(row["flashcard_qr_id"]),
            "payload": copy.deepcopy(row["payload"] or {}),
        }
        store._next_game_id = max(store._next_game_id, int(row["id"]))
    return store


async def _validate_learning_block_references_in_transaction(
    session,
    store: InMemoryMomoCatalogStore,
    *,
    lesson_ids: set[str],
) -> None:
    question_ids: set[int] = set()
    game_ids: set[int] = set()
    for lesson_id in lesson_ids:
        row = store.lessons[lesson_id]
        raw_blocks = row.get("learning_blocks")
        if not isinstance(raw_blocks, dict) or raw_blocks.get("schema_version") != 2:
            continue
        blocks = readback_lesson_blocks(raw_blocks)
        for activity in blocks.activities:
            if activity.type == "quiz":
                question_ids.update(int(value) for value in activity.config.question_ids)
            elif activity.type == "match":
                game_ids.update(int(value) for value in activity.config.mini_game_item_ids)

    if question_ids:
        found_questions = (
            await session.execute(
                text("SELECT id FROM quiz_questions WHERE id=ANY(CAST(:ids AS bigint[]))"),
                {"ids": sorted(question_ids)},
            )
        ).scalars().all()
        missing = question_ids - {int(value) for value in found_questions}
        if missing:
            raise CanonicalMomoConflict(f"Learning blocks reference missing quiz_questions IDs: {sorted(missing)}")
    if game_ids:
        found_games = (
            await session.execute(
                text("SELECT id FROM mini_game_items WHERE id=ANY(CAST(:ids AS bigint[]))"),
                {"ids": sorted(game_ids)},
            )
        ).scalars().all()
        missing = game_ids - {int(value) for value in found_games}
        if missing:
            raise CanonicalMomoConflict(f"Learning blocks reference missing mini_game_items IDs: {sorted(missing)}")


def _lesson_ids_without_open_sessions(store: InMemoryMomoCatalogStore) -> set[str]:
    return {
        lesson.lesson_id
        for course in store.catalog.values()
        for lesson in course.lessons
        if int(store.lessons[lesson.lesson_id].get("open_session_count", 0)) == 0
    }


def _metadata_changed(before_row: dict[str, Any], after_row: dict[str, Any], fields: tuple[str, ...]) -> bool:
    return any(before_row.get(field_name) != after_row.get(field_name) for field_name in fields)


async def _persist_live_changes(session, before: dict[str, Any], store: InMemoryMomoCatalogStore) -> set[str]:
    course_fields = (
        "title",
        "title_vi",
        "description",
        "description_vi",
        "thumbnail_url",
        "subtitle_vi",
        "theme",
        "category_key",
        "category_label",
        "category_icon",
        "age_range",
        "level",
        "thumbnail",
        "catalog_preview",
        "is_published",
    )
    for course_id, row in store.courses.items():
        if not _metadata_changed(before["courses"][course_id], row, course_fields):
            continue
        await session.execute(
            text(
                "UPDATE courses SET title=:title, title_vi=:title_vi, description=:description, "
                "description_vi=:description_vi, thumbnail_url=:thumbnail_url, subtitle_vi=:subtitle_vi, "
                "theme=:theme, category_key=:category_key, category_label=:category_label, "
                "category_icon=:category_icon, age_range=:age_range, level=:level, "
                "thumbnail=CAST(:thumbnail AS jsonb), catalog_preview=CAST(:catalog_preview AS jsonb), "
                "is_published=:is_published WHERE course_id=:course_id"
            ),
            {
                "course_id": course_id,
                "title": row["title"],
                "title_vi": row["title_vi"],
                "description": row["description"],
                "description_vi": row["description_vi"],
                "thumbnail_url": row["thumbnail_url"],
                "subtitle_vi": row["subtitle_vi"],
                "theme": row["theme"],
                "category_key": row["category_key"],
                "category_label": row["category_label"],
                "category_icon": row["category_icon"],
                "age_range": row["age_range"],
                "level": row["level"],
                "thumbnail": json.dumps(row["thumbnail"], ensure_ascii=False),
                "catalog_preview": json.dumps(row["catalog_preview"], ensure_ascii=False),
                "is_published": row["is_published"],
            },
        )

    for qr_id, row in store.flashcards.items():
        if qr_id in before["flashcards"]:
            continue
        await session.execute(
            text(
                "INSERT INTO flashcards "
                "(qr_id, word, translation, category, image_url, audio_url, difficulty, is_active) "
                "VALUES (:qr_id, :word, CAST(:translation AS jsonb), :category, :image_url, :audio_url, :difficulty, :is_active)"
            ),
            {
                "qr_id": qr_id,
                "word": row["word"],
                "translation": json.dumps(row["translation"], ensure_ascii=False),
                "category": row["category"],
                "image_url": row["image_url"],
                "audio_url": row["audio_url"],
                "difficulty": row["difficulty"],
                "is_active": row["is_active"],
            },
        )

    for semantic_id, row in store.quiz_questions.items():
        if semantic_id in before["quiz_questions"]:
            continue
        inserted = (
            await session.execute(
                text(
                    "INSERT INTO quiz_questions "
                    "(flashcard_qr_id, question_id, question_text, question_type, correct_answer) "
                    "VALUES (:flashcard_qr_id, :question_id, :question_text, :question_type, :correct_answer) "
                    "RETURNING id"
                ),
                {
                    "flashcard_qr_id": row["flashcard_qr_id"],
                    "question_id": semantic_id,
                    "question_text": row["question_text"],
                    "question_type": row["question_type"],
                    "correct_answer": row["correct_answer"],
                },
            )
        ).scalar_one()
        row["id"] = int(inserted)

    for (option_semantic_id, option_order), value in store.quiz_options.items():
        if (option_semantic_id, option_order) in before["quiz_options"]:
            continue
        question = store.quiz_questions[option_semantic_id]
        await session.execute(
            text(
                "INSERT INTO quiz_question_options (question_id, option_order, value) "
                "VALUES (:question_id, :option_order, :value)"
            ),
            {"question_id": int(question["id"]), "option_order": option_order, "value": value},
        )

    for semantic_id, row in store.mini_game_items.items():
        if semantic_id in before["mini_game_items"]:
            continue
        await session.execute(text("SELECT pg_advisory_xact_lock(hashtext(:semantic_id))"), {"semantic_id": semantic_id})
        existing = (
            await session.execute(
                text(
                    "SELECT id, game_type, flashcard_qr_id, question, payload "
                    "FROM mini_game_items WHERE question=:semantic_id"
                ),
                {"semantic_id": semantic_id},
            )
        ).mappings().all()
        if len(existing) > 1:
            raise CanonicalMomoConflict(f"Ambiguous mini-game semantic identity {semantic_id}")
        if existing:
            existing_row = existing[0]
            comparable = {
                "semantic_id": str(existing_row["question"]),
                "game_type": str(existing_row["game_type"]),
                "flashcard_qr_id": str(existing_row["flashcard_qr_id"]),
                "payload": copy.deepcopy(existing_row["payload"] or {}),
            }
            expected = {
                "semantic_id": semantic_id,
                "game_type": row["game_type"],
                "flashcard_qr_id": row["flashcard_qr_id"],
                "payload": row["payload"],
            }
            if comparable != expected:
                raise CanonicalMomoConflict(f"Conflicting mini-game payload for {semantic_id}")
            row["id"] = int(existing_row["id"])
            continue
        inserted = (
            await session.execute(
                text(
                    "INSERT INTO mini_game_items (game_type, flashcard_qr_id, question, payload) "
                    "VALUES (:game_type, :flashcard_qr_id, :question, CAST(:payload AS jsonb)) RETURNING id"
                ),
                {
                    "game_type": row["game_type"],
                    "flashcard_qr_id": row["flashcard_qr_id"],
                    "question": semantic_id,
                    "payload": json.dumps(row["payload"], ensure_ascii=False),
                },
            )
        ).scalar_one()
        row["id"] = int(inserted)

    lesson_metadata_fields = ("course_id", "title", "title_vi", "description", "lesson_order", "duration_minutes")
    _refresh_lesson_blocks_with_actual_ids(store)
    await _validate_learning_block_references_in_transaction(
        session,
        store,
        lesson_ids=_lesson_ids_without_open_sessions(store),
    )

    mutated_lesson_ids: set[str] = set()
    for lesson_id, row in store.lessons.items():
        metadata_changed = _metadata_changed(before["lessons"][lesson_id], row, lesson_metadata_fields)
        blocks_changed = before["lessons"][lesson_id]["learning_blocks"] != row["learning_blocks"]
        if not metadata_changed and not blocks_changed:
            continue
        await session.execute(
            text(
                "UPDATE lessons SET course_id=:course_id, title=:title, title_vi=:title_vi, "
                "description=:description, lesson_order=:lesson_order, duration_minutes=:duration_minutes, "
                "learning_blocks=CAST(:learning_blocks AS jsonb) "
                "WHERE lesson_id=:lesson_id"
            ),
            {
                "lesson_id": lesson_id,
                "course_id": row["course_id"],
                "title": row["title"],
                "title_vi": row["title_vi"],
                "description": row["description"],
                "lesson_order": row["lesson_order"],
                "duration_minutes": row["duration_minutes"],
                "learning_blocks": json.dumps(row["learning_blocks"], ensure_ascii=False),
            },
        )
        mutated_lesson_ids.add(lesson_id)
    return mutated_lesson_ids


async def _readback_live(
    session,
    manifest: ManifestCatalog,
    course_id: str | None,
    *,
    apply: bool,
    mutated_lesson_ids: set[str],
) -> dict[str, Any]:
    store = await _load_live_store(session, manifest, course_id)
    lessons = []
    for selected_course_id, course in store.catalog.items():
        for lesson in course.lessons:
            raw_blocks = store.lessons[lesson.lesson_id]["learning_blocks"]
            if apply and lesson.lesson_id in mutated_lesson_ids:
                blocks = readback_lesson_blocks(raw_blocks)
                schema_version = blocks.schema_version
                content_version = blocks.content_version
                activity_count = len(blocks.activities)
            else:
                raw_summary = raw_blocks if isinstance(raw_blocks, dict) else {}
                activities = raw_summary.get("activities")
                schema_version = raw_summary.get("schema_version")
                content_version = raw_summary.get("content_version")
                activity_count = len(activities) if isinstance(activities, list) else 0
            lessons.append(
                {
                    "course_id": selected_course_id,
                    "lesson_id": lesson.lesson_id,
                    "schema_version": schema_version,
                    "content_version": content_version,
                    "activity_count": activity_count,
                }
            )
    return {"lessons": lessons}


async def _run_live(*, apply: bool, course_id: str | None) -> dict[str, Any]:
    manifest = load_manifest()
    await connect_orm()
    try:
        mutated_lesson_ids: set[str] = set()
        if apply:
            async with session_factory()() as session:
                async with session.begin():
                    await _preflight_schema(session)
                    store = await _load_live_store(session, manifest, course_id)
                    before = store.snapshot()
                    result = apply_canonical_catalog(store, manifest, course_id=course_id, apply=True)
                    mutated_lesson_ids = await _persist_live_changes(session, before, store)
        else:
            async with session_factory()() as session:
                await _preflight_schema(session)
                store = await _load_live_store(session, manifest, course_id)
                result = apply_canonical_catalog(store, manifest, course_id=course_id, apply=False)
        async with session_factory()() as fresh:
            await _preflight_schema(fresh)
            readback = await _readback_live(
                fresh,
                manifest,
                course_id,
                apply=apply,
                mutated_lesson_ids=mutated_lesson_ids,
            )
        return result | {"readback": readback}
    finally:
        await close_orm()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--apply", action="store_true")
    parser.add_argument("--course-id")
    args = parser.parse_args()
    result = asyncio.run(_run_live(apply=args.apply, course_id=args.course_id))
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
