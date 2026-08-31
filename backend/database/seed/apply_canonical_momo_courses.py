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
        courses = {course_id: {"course_id": course.course_id, "title": course.title} for course_id, course in catalog.items()}
        lessons: dict[str, dict[str, Any]] = {}
        for course in catalog.values():
            for lesson in course.lessons:
                lessons[lesson.lesson_id] = {
                    "lesson_id": lesson.lesson_id,
                    "course_id": course.course_id,
                    "title": lesson.title,
                    "title_vi": lesson.title_vi,
                    "lesson_order": lesson.order,
                    "learning_blocks": copy.deepcopy(lesson.learning_blocks),
                    "open_session_count": 0,
                }
        return cls(catalog=catalog, manifest=manifest, courses=courses, lessons=lessons)

    def seed_flashcard(self, qr_id: str, word_en: str, word_vi: str, category: str) -> None:
        self.flashcards[qr_id] = {
            "qr_id": qr_id,
            "word_en": word_en,
            "word_vi": word_vi,
            "category": category,
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


def _resolve_flashcards(store: InMemoryMomoCatalogStore, plan) -> tuple[dict[str, str], list[str]]:
    by_semantics: dict[tuple[str, str], list[str]] = {}
    for row in store.flashcards.values():
        key = (normalize_key(row["word_en"]), normalize_key(row["word_vi"]))
        by_semantics.setdefault(key, []).append(row["qr_id"])
    resolved: dict[str, str] = {}
    conflicts: list[str] = []
    for item in plan.vocabulary:
        matches = by_semantics.get((normalize_key(item.word_en), normalize_key(item.word_vi)), [])
        if len(matches) == 1:
            resolved[item.key] = matches[0]
        elif matches:
            conflicts.append(f"AMBIGUOUS_FLASHCARD:{plan.lesson_id}:{item.key}")
        else:
            conflicts.append(f"MISSING_FLASHCARD:{plan.lesson_id}:{item.key}")
    return resolved, conflicts


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
) -> tuple[int, str]:
    existing = store.quiz_questions.get(semantic_id)
    if existing is None:
        preview_ids.setdefault(semantic_id, store._next_question_id + len(preview_ids) + 1)
        if apply:
            store._next_question_id += 1
            store.quiz_questions[semantic_id] = {"id": store._next_question_id, **payload}
            for index, value in enumerate(options, start=1):
                store.quiz_options[(semantic_id, index)] = value
            return store._next_question_id, "CREATE"
        return preview_ids[semantic_id], "CREATE"

    comparable = {key: existing[key] for key in ("semantic_id", "flashcard_qr_id", "question_text", "question_type", "correct_answer")}
    if comparable != {key: payload[key] for key in comparable}:
        raise CanonicalMomoConflict(f"Conflicting quiz payload for {semantic_id}")
    existing_options = tuple(store.quiz_options.get((semantic_id, index)) for index in range(1, len(options) + 1))
    if existing_options != options:
        raise CanonicalMomoConflict(f"Conflicting quiz options for {semantic_id}")
    return int(existing["id"]), "NO_CHANGE"


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
        if schema_version == 2 and key in merged and key == "activities" and merged[key] and merged[key] != canonical[key]:
            raise CanonicalMomoConflict("CONFLICT: existing canonical activities differ")
        if schema_version == 2 and key in merged and key == "vocabulary" and merged[key] and merged[key] != canonical[key]:
            raise CanonicalMomoConflict("CONFLICT: existing canonical vocabulary differs")
        merged[key] = copy.deepcopy(canonical[key])
    return merged, "NO_CHANGE" if merged == existing else "UPDATE"


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
    preview_question_ids: dict[str, int] = {}
    preview_game_ids: dict[str, int] = {}
    try:
        for selected_course_id in selected_courses:
            course = store.catalog[selected_course_id]
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
                flashcard_ids, flashcard_conflicts = _resolve_flashcards(store, plan)
                if flashcard_conflicts:
                    report["status"] = "LEGACY_FALLBACK"
                    report["fallback_reason"] = "UNRESOLVED_FLASHCARD_REFERENCES"
                    report["conflicts"] = flashcard_conflicts
                    lessons_report.append(report)
                    unchanged_rows += 1
                    continue

                source_quiz_by_id = {
                    item["question_id"]: item
                    for item in store.lessons[lesson.lesson_id]["learning_blocks"]["quiz"]
                }
                question_ids: dict[str, int] = {}
                question_states: list[str] = []
                for question in plan.quiz_questions:
                    payload, options = _question_payload(
                        plan,
                        question,
                        flashcard_ids[question.vocabulary_key],
                        source_quiz_by_id[question.source_question_id],
                    )
                    question_id, state = _ensure_question(
                        store,
                        semantic_id=question.question_key,
                        payload=payload,
                        options=options,
                        apply=apply,
                        preview_ids=preview_question_ids,
                    )
                    question_ids[question.question_key] = question_id
                    question_states.append(state)

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
                if apply and lesson_state != "NO_CHANGE":
                    store.lessons[lesson.lesson_id]["learning_blocks"] = merged
                readback_lesson_blocks(merged)

                created = sum(state == "CREATE" for state in [*question_states, mini_game_state])
                updated = 1 if lesson_state == "UPDATE" else 0
                report["created"] = ["quiz_dependencies" for state in question_states if state == "CREATE"]
                if mini_game_state == "CREATE":
                    report["created"].append("mini_game_dependency")
                if lesson_state == "UPDATE":
                    report["updated"] = ["learning_blocks"]
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
    lesson_rows = (
        await session.execute(
            text(
                "SELECT lesson_id, course_id, learning_blocks "
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
        store.lessons[str(row["lesson_id"])]["learning_blocks"] = copy.deepcopy(row["learning_blocks"] or {})

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
                "SELECT qr_id, word, COALESCE(translation->>'vi', '') AS word_vi, category "
                "FROM flashcards WHERE lower(word)=ANY(CAST(:words AS text[])) "
                "OR lower(COALESCE(translation->>'vi', ''))=ANY(CAST(:translations AS text[]))"
            ),
            {"words": words, "translations": translations},
        )
    ).mappings().all()
    for row in flashcard_rows:
        store.seed_flashcard(str(row["qr_id"]), str(row["word"]), str(row["word_vi"]), str(row.get("category") or ""))

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
            store.quiz_options[(semantic_id, int(row["option_order"]))] = str(row["value"])
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


async def _persist_live_changes(session, before: dict[str, Any], store: InMemoryMomoCatalogStore) -> None:
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
            if option_semantic_id != semantic_id:
                continue
            await session.execute(
                text(
                    "INSERT INTO quiz_question_options (question_id, option_order, value) "
                    "VALUES (:question_id, :option_order, :value)"
                ),
                {"question_id": int(inserted), "option_order": option_order, "value": value},
            )

    for semantic_id, row in store.mini_game_items.items():
        if semantic_id in before["mini_game_items"]:
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

    for lesson_id, row in store.lessons.items():
        if before["lessons"][lesson_id]["learning_blocks"] == row["learning_blocks"]:
            continue
        await session.execute(
            text(
                "UPDATE lessons SET learning_blocks=CAST(:learning_blocks AS jsonb) "
                "WHERE lesson_id=:lesson_id"
            ),
            {"lesson_id": lesson_id, "learning_blocks": json.dumps(row["learning_blocks"], ensure_ascii=False)},
        )


async def _readback_live(
    session,
    manifest: ManifestCatalog,
    course_id: str | None,
    *,
    validate_schema_v2: bool,
) -> dict[str, Any]:
    store = await _load_live_store(session, manifest, course_id)
    lessons = []
    for selected_course_id, course in store.catalog.items():
        for lesson in course.lessons:
            raw_blocks = store.lessons[lesson.lesson_id]["learning_blocks"]
            blocks = LessonLearningBlocks.model_validate(
                raw_blocks
                if isinstance(raw_blocks, dict)
                and any(key in raw_blocks for key in ("schema_version", "content_version", "activities"))
                else {"schema_version": 1, "content_version": 1, "activities": [], **(raw_blocks or {})}
            )
            if validate_schema_v2:
                blocks = readback_lesson_blocks(raw_blocks)
            lessons.append(
                {
                    "course_id": selected_course_id,
                    "lesson_id": lesson.lesson_id,
                    "schema_version": blocks.schema_version,
                    "content_version": blocks.content_version,
                    "activity_count": len(blocks.activities),
                }
            )
    return {"lessons": lessons}


async def _run_live(*, apply: bool, course_id: str | None) -> dict[str, Any]:
    manifest = load_manifest()
    await connect_orm()
    try:
        if apply:
            async with session_factory()() as session:
                async with session.begin():
                    await _preflight_schema(session)
                    store = await _load_live_store(session, manifest, course_id)
                    before = store.snapshot()
                    result = apply_canonical_catalog(store, manifest, course_id=course_id, apply=True)
                    await _persist_live_changes(session, before, store)
        else:
            async with session_factory()() as session:
                await _preflight_schema(session)
                store = await _load_live_store(session, manifest, course_id)
                result = apply_canonical_catalog(store, manifest, course_id=course_id, apply=False)
        async with session_factory()() as fresh:
            await _preflight_schema(fresh)
            readback = await _readback_live(fresh, manifest, course_id, validate_schema_v2=apply)
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
