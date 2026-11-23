"""Idempotently materialise the LC7 Animals content in PostgreSQL.

This command owns authored Course/Lesson fields plus the relational quiz and
memory-match rows referenced by schema-v2 ``learning_blocks``. It deliberately
does not write learner runtime state, media assets, Storage, or AR data.

Run from ``backend``::

    python -m database.seed.apply_canonical_animals --dry-run
    python -m database.seed.apply_canonical_animals --apply
"""

from __future__ import annotations

import argparse
import asyncio
import json
from collections import Counter
from dataclasses import asdict, dataclass, field
from typing import Any, Literal

from sqlalchemy import and_, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database.orm_models.game import MiniGameItemORM
from database.orm_models.learner import CourseORM, LessonORM
from database.orm_models.quiz import QuizQuestionORM, QuizQuestionOptionORM
from database.orm_session import close_orm, connect_orm, session_factory
from database.seed.canonical_animals import (
    CONTENT_VERSION,
    COURSE,
    COURSE_ID,
    LESSONS,
    VOCABULARY,
    lesson_blocks,
    memory_match_payload,
    mini_game_seed_key,
    quiz_questions,
)
from models.game_activity import MemoryMatchPayload
from models.lesson_activity import LessonLearningBlocks


State = Literal["CREATE", "UPDATE_CANONICAL_FIELD", "NO_CHANGE", "LEGACY_FALLBACK"]
VOCABULARY_WORDS = {vocabulary_id: word for vocabulary_id, word, _ in VOCABULARY}
LESSON_IDS = tuple(lesson.lesson_id for lesson in LESSONS)
QUESTION_KEYS = tuple(question.key for lesson in LESSONS for question in quiz_questions(lesson))
GAME_KEYS = tuple(mini_game_seed_key(lesson) for lesson in LESSONS)


class CanonicalContentConflict(RuntimeError):
    """An existing stable identity has unrelated or ambiguous semantics."""


@dataclass
class EntityDiff:
    records: dict[str, State] = field(default_factory=dict)

    def counts(self) -> dict[str, int]:
        counts = Counter(self.records.values())
        return {
            "CREATE": counts["CREATE"],
            "UPDATE_CANONICAL_FIELD": counts["UPDATE_CANONICAL_FIELD"],
            "NO_CHANGE": counts["NO_CHANGE"],
            "LEGACY_FALLBACK": counts["LEGACY_FALLBACK"],
        }


@dataclass
class ReconciliationReport:
    course: EntityDiff = field(default_factory=EntityDiff)
    lessons: EntityDiff = field(default_factory=EntityDiff)
    quiz_questions: EntityDiff = field(default_factory=EntityDiff)
    quiz_options: EntityDiff = field(default_factory=EntityDiff)
    mini_game_items: EntityDiff = field(default_factory=EntityDiff)
    conflicts: list[str] = field(default_factory=list)
    destructive_operations: int = 0
    flashcard_mapping: dict[str, str] = field(default_factory=dict)
    mutated_lesson_ids: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        value = asdict(self)
        for name in ("course", "lessons", "quiz_questions", "quiz_options", "mini_game_items"):
            value[name]["counts"] = getattr(self, name).counts()
        return value


def validate_canonical_content() -> dict[str, Any]:
    """Validate every authored contract without touching PostgreSQL."""
    quiz_count = 0
    game_count = 0
    for lesson_index, lesson in enumerate(LESSONS, start=1):
        questions = quiz_questions(lesson)
        for question in questions:
            if question.correct_answer not in question.options or len(set(question.options)) != 2:
                raise ValueError(f"Invalid canonical answer/options for {question.key}")
        quiz_count += len(questions)
        payload = memory_match_payload(
            lesson.focus_vocabulary_id,
            VOCABULARY_WORDS[lesson.focus_vocabulary_id],
        )
        MemoryMatchPayload.model_validate(payload)
        game_count += 1
        # Positive placeholders validate the complete LC2 shape before DB IDs exist.
        blocks = lesson_blocks(
            lesson,
            range(lesson_index * 100, lesson_index * 100 + len(questions)),
            [lesson_index * 1000],
        )
        validated = LessonLearningBlocks.model_validate(blocks)
        if [activity.type for activity in validated.activities] != ["learn_vocabulary", "mini_game", "quiz"]:
            raise ValueError(f"Unexpected canonical activity order for {lesson.lesson_id}")
    return {
        "schema_v2_lessons": len(LESSONS),
        "quiz_questions": quiz_count,
        "quiz_options": quiz_count * 2,
        "mini_game_items": game_count,
    }


def _changed(row: Any, values: dict[str, Any]) -> bool:
    return any(getattr(row, key) != value for key, value in values.items())


def _apply_values(row: Any, values: dict[str, Any]) -> None:
    for key, value in values.items():
        setattr(row, key, value)


def _is_empty_value(value: Any) -> bool:
    return value is None or value == "" or value == [] or value == {}


def _looks_like_lossy_text(value: Any) -> bool:
    return isinstance(value, str) and ("?" in value or "\ufffd" in value)


def _non_destructive_owned_merge(
    *,
    entity: str,
    current: dict[str, Any],
    canonical: dict[str, Any],
) -> tuple[dict[str, Any], list[str]]:
    merged = dict(current)
    changed: list[str] = []
    for field_name, canonical_value in canonical.items():
        if _is_empty_value(canonical_value):
            continue
        current_value = merged.get(field_name)
        if current_value == canonical_value:
            continue
        if _is_empty_value(current_value) or (
            isinstance(canonical_value, str) and _looks_like_lossy_text(current_value)
        ):
            merged[field_name] = canonical_value
            changed.append(field_name)
            continue
        raise CanonicalContentConflict(f"CONFLICT: {entity}.{field_name} has non-empty non-canonical value")
    return merged, changed


def _merge_course_metadata(current: dict[str, Any], canonical: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    legacy_taxonomy = {
        "category_key": ("nature", "animals"),
        "category_label": ("Nature", "Animals"),
        "category_icon": ("🌿", "🐾"),
    }
    merged = dict(current)
    changed: list[str] = []
    for field_name, (legacy_value, canonical_value) in legacy_taxonomy.items():
        if canonical.get(field_name) == canonical_value and merged.get(field_name) == legacy_value:
            merged[field_name] = canonical_value
            changed.append(field_name)
    merged, remaining_changed = _non_destructive_owned_merge(
        entity=f"course:{COURSE_ID}",
        current=merged,
        canonical=canonical,
    )
    return merged, changed + remaining_changed


def _merge_learning_blocks(existing: dict[str, Any], canonical: dict[str, Any]) -> tuple[dict[str, Any], bool]:
    if not isinstance(existing, dict) or existing.get("schema_version") != 2:
        raise CanonicalContentConflict("CONFLICT: legacy learning_blocks cannot be replaced")
    existing_activities = existing.get("activities")
    canonical_activities = canonical.get("activities")
    if not isinstance(existing_activities, list) or not isinstance(canonical_activities, list):
        raise CanonicalContentConflict("CONFLICT: existing canonical activities differ")
    shape = lambda activities: [
        (item.get("activity_id"), item.get("type"), item.get("order"), item.get("required"))
        for item in activities
    ]
    if shape(existing_activities) != shape(canonical_activities):
        raise CanonicalContentConflict("CONFLICT: existing canonical activities differ")
    merged = json.loads(json.dumps(existing))
    canonical_by_id = {item["activity_id"]: item for item in canonical_activities}
    for activity in merged["activities"]:
        canonical_activity = canonical_by_id[activity["activity_id"]]
        config = activity.setdefault("config", {})
        if activity["type"] == "quiz":
            config["question_ids"] = list(canonical_activity["config"]["question_ids"])
        elif activity["type"] == "mini_game":
            config["mini_game_item_ids"] = list(canonical_activity["config"]["mini_game_item_ids"])
    return merged, merged != existing


def _option_rows_by_order(question_key: str, options: list[Any]) -> dict[int, Any]:
    by_order: dict[int, Any] = {}
    for option in options:
        existing = by_order.get(option.option_order)
        if existing is not None and existing.value != option.value:
            raise CanonicalContentConflict(
                f"Conflicting duplicate option order for {question_key}:{option.option_order}"
            )
        by_order[option.option_order] = option
    return by_order


async def _open_session_counts(session: AsyncSession) -> dict[str, int]:
    rows = (
        await session.execute(
            text(
                "SELECT lesson_id, count(*)::int AS open_session_count FROM lesson_sessions "
                "WHERE lesson_id=ANY(CAST(:lesson_ids AS text[])) AND status <> 'completed' "
                "GROUP BY lesson_id"
            ),
            {"lesson_ids": list(LESSON_IDS)},
        )
    ).mappings().all()
    return {str(row["lesson_id"]): int(row["open_session_count"]) for row in rows}


async def _validate_eligible_lesson_bindings(session: AsyncSession, lesson_ids: tuple[str, ...]) -> None:
    rows = (
        await session.execute(select(LessonORM).where(LessonORM.lesson_id.in_(lesson_ids)))
    ).scalars().all()
    question_ids: set[int] = set()
    game_ids: set[int] = set()
    for row in rows:
        try:
            blocks = LessonLearningBlocks.model_validate(row.learning_blocks)
        except ValueError as exc:
            raise CanonicalContentConflict(f"Invalid schema-v2 learning blocks for {row.lesson_id}") from exc
        for activity in blocks.activities:
            if activity.type == "quiz":
                question_ids.update(int(value) for value in activity.config.question_ids)
            elif activity.type == "mini_game":
                game_ids.update(int(value) for value in activity.config.mini_game_item_ids)
    if question_ids:
        found = set(
            (await session.execute(select(QuizQuestionORM.id).where(QuizQuestionORM.id.in_(question_ids)))).scalars().all()
        )
        if question_ids - found:
            raise CanonicalContentConflict(f"Learning blocks reference missing quiz IDs: {sorted(question_ids - found)}")
    if game_ids:
        found = set(
            (await session.execute(select(MiniGameItemORM.id).where(MiniGameItemORM.id.in_(game_ids)))).scalars().all()
        )
        if game_ids - found:
            raise CanonicalContentConflict(f"Learning blocks reference missing mini-game IDs: {sorted(game_ids - found)}")


def _resolve_flashcard_mapping(
    rows: list[dict[str, Any]], vocabulary_words: dict[str, str] = VOCABULARY_WORDS
) -> tuple[dict[str, str], list[str]]:
    by_word: dict[str, list[dict[str, Any]]] = {}
    by_qr_id: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        word = str(row.get("word") or "").strip().lower()
        if word:
            by_word.setdefault(word, []).append(row)
        by_qr_id.setdefault(str(row["qr_id"]), []).append(row)
    mapping: dict[str, str] = {}
    conflicts: list[str] = []
    for vocabulary_id, word in vocabulary_words.items():
        qr_candidates = by_qr_id.get(vocabulary_id, [])
        # Canonical QR identity is authoritative.  Legacy word values are not
        # reliable enough to reject an otherwise exact LC5 identity match.
        if len(qr_candidates) > 1:
            conflicts.append(f"Ambiguous flashcard semantic identity for {vocabulary_id}")
            mapping[vocabulary_id] = f"__missing__:{vocabulary_id}"
            continue
        if qr_candidates:
            mapping[vocabulary_id] = str(qr_candidates[0]["qr_id"])
            continue

        candidates = by_word.get(word.lower(), [])
        if len(candidates) > 1:
            conflicts.append(f"Ambiguous flashcard semantic identity for {vocabulary_id}")
            mapping[vocabulary_id] = f"__missing__:{vocabulary_id}"
            continue
        if candidates:
            candidate = candidates[0]
            mapping[vocabulary_id] = str(candidate["qr_id"])
            continue
        conflicts.append(f"Expected one existing flashcard for {vocabulary_id}/{word}; found 0")
        mapping[vocabulary_id] = f"__missing__:{vocabulary_id}"
    return mapping, conflicts


async def _resolve_flashcards(session: AsyncSession) -> tuple[dict[str, str], list[str]]:
    """Map LC5 semantic vocabulary IDs onto existing legacy FK identities.

    The relational quiz/game schema predates LC5 and references
    ``flashcards.qr_id``. LC5 vocabulary IDs remain authoritative in Lesson
    JSON and asset payloads; this unique word match supplies only the required
    legacy foreign-key value and never mutates flashcards.
    """
    words = tuple(word.lower() for word in VOCABULARY_WORDS.values())
    rows = (
        await session.execute(
            text(
                "SELECT qr_id, word FROM flashcards "
                "WHERE lower(word) = ANY(CAST(:words AS text[])) "
                "OR qr_id = ANY(CAST(:vocabulary_ids AS text[])) "
                "ORDER BY qr_id"
            ),
            {"words": list(words), "vocabulary_ids": list(VOCABULARY_WORDS)},
        )
    ).mappings().all()
    return _resolve_flashcard_mapping([dict(row) for row in rows])


def _question_flashcard_qr_id(
    flashcard_mapping: dict[str, str], question: Any, *, existing_qr_id: str | None = None
) -> str:
    """Quiz ownership follows the question vocabulary, including mixed-review lessons."""
    expected_qr_id = flashcard_mapping[question.vocabulary_id]
    if existing_qr_id is not None and existing_qr_id != expected_qr_id:
        raise CanonicalContentConflict(
            f"Quiz identity {question.key if hasattr(question, 'key') else question.vocabulary_id} "
            f"belongs to flashcard {existing_qr_id}, expected {expected_qr_id}"
        )
    return expected_qr_id


async def reconcile(session: AsyncSession, *, mutate: bool) -> ReconciliationReport:
    """Diff and optionally apply canonical content within the caller transaction."""
    report = ReconciliationReport()
    open_session_counts = await _open_session_counts(session)
    eligible_lessons = tuple(lesson for lesson in LESSONS if lesson.lesson_id not in open_session_counts)
    for lesson in LESSONS:
        if lesson.lesson_id in open_session_counts:
            report.lessons.records[lesson.lesson_id] = "LEGACY_FALLBACK"
    flashcard_mapping, flashcard_conflicts = await _resolve_flashcards(session)
    if mutate and flashcard_conflicts:
        raise CanonicalContentConflict("; ".join(flashcard_conflicts))
    report.conflicts.extend(flashcard_conflicts)
    report.flashcard_mapping = flashcard_mapping

    course = await session.get(CourseORM, COURSE_ID)
    course_values = {
        "title": COURSE.title,
        "title_vi": COURSE.title_vi,
        "category_key": COURSE.category_key,
        "category_label": COURSE.category_label,
        "category_icon": COURSE.category_icon,
        "level": COURSE.level,
        "is_published": True,
    }
    if course is None:
        report.course.records[COURSE_ID] = "CREATE"
        if mutate:
            course = CourseORM(course_id=COURSE_ID, **course_values)
            session.add(course)
            await session.flush()
    else:
        merged_course, changed_fields = _merge_course_metadata(
            {key: getattr(course, key) for key in course_values},
            course_values,
        )
        state: State = "UPDATE_CANONICAL_FIELD" if changed_fields else "NO_CHANGE"
        report.course.records[COURSE_ID] = state
        if mutate and state != "NO_CHANGE":
            _apply_values(course, merged_course)

    existing_lessons = (
        await session.execute(
            select(LessonORM).where(
                or_(LessonORM.lesson_id.in_(LESSON_IDS), LessonORM.course_id == COURSE_ID)
            )
        )
    ).scalars().all()
    by_lesson_id = {row.lesson_id: row for row in existing_lessons}
    by_order = {row.lesson_order: row for row in existing_lessons if row.course_id == COURSE_ID}
    reconciled_lessons = []
    for lesson in eligible_lessons:
        row = by_lesson_id.get(lesson.lesson_id)
        if row is not None and (
            not isinstance(row.learning_blocks, dict) or row.learning_blocks.get("schema_version") != 2
        ):
            report.lessons.records[lesson.lesson_id] = "LEGACY_FALLBACK"
            continue
        order_owner = by_order.get(lesson.order)
        if row is not None and row.course_id != COURSE_ID:
            raise CanonicalContentConflict(
                f"Lesson identity {lesson.lesson_id} belongs to unrelated Course {row.course_id}"
            )
        if order_owner is not None and order_owner.lesson_id != lesson.lesson_id:
            raise CanonicalContentConflict(
                f"Canonical lesson order {lesson.order} is owned by {order_owner.lesson_id}"
            )
        reconciled_lessons.append(lesson)

    existing_questions = (
        await session.execute(
            select(QuizQuestionORM)
            .options(selectinload(QuizQuestionORM.options))
            .where(QuizQuestionORM.question_id.in_(QUESTION_KEYS))
        )
    ).scalars().unique().all()
    questions_by_key: dict[str, QuizQuestionORM] = {}
    for row in existing_questions:
        if row.question_id in questions_by_key:
            raise CanonicalContentConflict(f"Duplicate quiz semantic identity {row.question_id}")
        questions_by_key[row.question_id] = row

    question_ids_by_lesson: dict[str, list[int]] = {}
    for lesson in reconciled_lessons:
        ids: list[int] = []
        for question in quiz_questions(lesson):
            row = questions_by_key.get(question.key)
            expected_flashcard_qr_id = _question_flashcard_qr_id(flashcard_mapping, question)
            values = {
                "flashcard_qr_id": expected_flashcard_qr_id,
                "question_id": question.key,
                "question_text": question.prompt,
                "question_type": "multiple_choice",
                "correct_answer": question.correct_answer,
            }
            if row is None:
                state = "CREATE"
                if mutate:
                    row = QuizQuestionORM(**values)
                    session.add(row)
                    await session.flush()
            elif row.flashcard_qr_id != expected_flashcard_qr_id:
                _question_flashcard_qr_id(flashcard_mapping, question, existing_qr_id=row.flashcard_qr_id)
            else:
                if _changed(row, values):
                    raise CanonicalContentConflict(f"Conflicting quiz payload for {question.key}")
                state = "NO_CHANGE"
            report.quiz_questions.records[question.key] = state

            existing_options = (
                {} if state == "CREATE"
                else _option_rows_by_order(question.key, list(row.options))
            )
            if any(order not in (1, 2) for order in existing_options):
                raise CanonicalContentConflict(f"Quiz {question.key} has non-canonical option identities")
            for option_order, option_value in enumerate(question.options, start=1):
                option_key = f"{question.key}:{option_order}"
                option = existing_options.get(option_order)
                if option is None:
                    option_state: State = "CREATE"
                    if mutate:
                        session.add(
                            QuizQuestionOptionORM(
                                question_id=row.id,
                                option_order=option_order,
                                value=option_value,
                            )
                        )
                else:
                    if option.value != option_value:
                        raise CanonicalContentConflict(f"Conflicting quiz option for {question.key}:{option_order}")
                    option_state = "NO_CHANGE"
                report.quiz_options.records[option_key] = option_state
            if mutate:
                ids.append(row.id)
        question_ids_by_lesson[lesson.lesson_id] = ids

    game_ids_by_lesson: dict[str, list[int]] = {}
    for lesson in reconciled_lessons:
        key = mini_game_seed_key(lesson)
        payload = memory_match_payload(
            lesson.focus_vocabulary_id,
            VOCABULARY_WORDS[lesson.focus_vocabulary_id],
        )
        candidates = (
            await session.execute(
                select(MiniGameItemORM).where(
                    and_(
                        MiniGameItemORM.game_type == "memory_match",
                        MiniGameItemORM.flashcard_qr_id == flashcard_mapping[lesson.focus_vocabulary_id],
                        or_(MiniGameItemORM.question == key, MiniGameItemORM.payload == payload),
                    )
                )
            )
        ).scalars().all()
        if len(candidates) > 1:
            raise CanonicalContentConflict(f"Ambiguous mini-game semantic identity {key}")
        row = candidates[0] if candidates else None
        values = {
            "game_type": "memory_match",
            "flashcard_qr_id": flashcard_mapping[lesson.focus_vocabulary_id],
            "question": key,
            "payload": payload,
        }
        if row is None:
            state = "CREATE"
            if mutate:
                row = MiniGameItemORM(**values)
                session.add(row)
                await session.flush()
        else:
            if _changed(row, values):
                raise CanonicalContentConflict(f"Conflicting mini-game payload for {key}")
            state = "NO_CHANGE"
        report.mini_game_items.records[key] = state
        game_ids_by_lesson[lesson.lesson_id] = [row.id] if mutate else []

    for lesson in reconciled_lessons:
        row = by_lesson_id.get(lesson.lesson_id)
        if mutate:
            blocks = lesson_blocks(
                lesson,
                question_ids_by_lesson[lesson.lesson_id],
                game_ids_by_lesson[lesson.lesson_id],
            )
        else:
            # Existing IDs allow an exact dry-run comparison. New dependencies
            # necessarily imply a Lesson update, so placeholders are sufficient.
            question_ids = [
                questions_by_key[q.key].id
                for q in quiz_questions(lesson)
                if q.key in questions_by_key
            ]
            game_key = mini_game_seed_key(lesson)
            game_rows = (
                await session.execute(select(MiniGameItemORM).where(MiniGameItemORM.question == game_key))
            ).scalars().all()
            blocks = lesson_blocks(
                lesson,
                question_ids if len(question_ids) == len(quiz_questions(lesson)) else range(1, 6),
                [game_rows[0].id] if len(game_rows) == 1 else [1],
            )
        lesson_metadata = {
            "course_id": COURSE_ID,
            "title": lesson.title,
            "title_vi": lesson.title_vi,
            "lesson_order": lesson.order,
        }
        dependencies_change = any(
            report.quiz_questions.records[q.key] != "NO_CHANGE" for q in quiz_questions(lesson)
        ) or report.mini_game_items.records[mini_game_seed_key(lesson)] != "NO_CHANGE"
        if row is None:
            state = "CREATE"
            if mutate:
                row = LessonORM(lesson_id=lesson.lesson_id, learning_blocks=blocks, **lesson_metadata)
                session.add(row)
                report.mutated_lesson_ids.append(lesson.lesson_id)
        else:
            merged_metadata, changed_fields = _non_destructive_owned_merge(
                entity=f"lesson:{lesson.lesson_id}",
                current={key: getattr(row, key) for key in lesson_metadata},
                canonical=lesson_metadata,
            )
            merged_blocks, blocks_changed = _merge_learning_blocks(row.learning_blocks, blocks)
            state = "UPDATE_CANONICAL_FIELD" if dependencies_change or changed_fields or blocks_changed else "NO_CHANGE"
            if mutate and state != "NO_CHANGE":
                _apply_values(row, merged_metadata)
                row.learning_blocks = merged_blocks
                report.mutated_lesson_ids.append(lesson.lesson_id)
        report.lessons.records[lesson.lesson_id] = state

    if mutate:
        await session.flush()
        await _validate_eligible_lesson_bindings(session, tuple(lesson.lesson_id for lesson in reconciled_lessons))
    return report


async def readback(session: AsyncSession, *, strict_lesson_ids: set[str] | None = None) -> dict[str, Any]:
    strict_lesson_ids = strict_lesson_ids or set()
    course = await session.get(CourseORM, COURSE_ID)
    lessons = (
        await session.execute(
            select(LessonORM).where(
                LessonORM.course_id == COURSE_ID,
                LessonORM.lesson_id.in_(LESSON_IDS),
            ).order_by(LessonORM.lesson_order)
        )
    ).scalars().all()
    schema_v2 = 0
    raw_schema_v2 = 0
    invalid_schema_v2 = 0
    activity_sequence = 0
    referenced_questions: set[int] = set()
    referenced_games: set[int] = set()
    for row in lessons:
        raw_schema_v2 += int(isinstance(row.learning_blocks, dict) and row.learning_blocks.get("schema_version") == 2)
        if row.lesson_id not in strict_lesson_ids:
            continue
        try:
            blocks = LessonLearningBlocks.model_validate(row.learning_blocks)
        except ValueError as exc:
            invalid_schema_v2 += 1
            raise CanonicalContentConflict(f"Invalid post-apply schema-v2 learning blocks for {row.lesson_id}") from exc
        schema_v2 += int(blocks.schema_version == 2 and blocks.content_version == CONTENT_VERSION)
        activity_sequence += int([item.type for item in blocks.activities] == ["learn_vocabulary", "mini_game", "quiz"])
        for activity in blocks.activities:
            if activity.type == "quiz":
                referenced_questions.update(activity.config.question_ids)
            elif activity.type == "mini_game":
                referenced_games.update(activity.config.mini_game_item_ids)
    questions = (
        await session.execute(
            select(QuizQuestionORM)
            .options(selectinload(QuizQuestionORM.options))
            .where(QuizQuestionORM.id.in_(referenced_questions))
        )
    ).scalars().unique().all()
    games = (
        await session.execute(select(MiniGameItemORM).where(MiniGameItemORM.id.in_(referenced_games)))
    ).scalars().all()
    return {
        "course": int(course is not None),
        "published": bool(course and course.is_published),
        "lessons": len(lessons),
        "schema_v2": schema_v2,
        "raw_schema_v2": raw_schema_v2,
        "invalid_schema_v2": invalid_schema_v2,
        "activity_sequence": activity_sequence,
        "quiz_questions": len(questions),
        "quiz_options": sum(len(row.options) for row in questions),
        "mini_game_items": len(games),
    }


async def _run(apply: bool) -> dict[str, Any]:
    validation = validate_canonical_content()
    await connect_orm()
    try:
        if apply:
            async with session_factory()() as session:
                async with session.begin():
                    report = await reconcile(session, mutate=True)
            async with session_factory()() as fresh_session:
                fresh = await readback(fresh_session, strict_lesson_ids=set(report.mutated_lesson_ids))
        else:
            async with session_factory()() as session:
                report = await reconcile(session, mutate=False)
                fresh = await readback(session)
        return {
            "mode": "apply" if apply else "dry-run",
            "validation": validation,
            "diff": report.as_dict(),
            "readback": fresh,
        }
    finally:
        await close_orm()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    try:
        result = asyncio.run(_run(args.apply))
    except CanonicalContentConflict as exc:
        print(json.dumps({"status": "CONFLICT", "reason": str(exc)}, ensure_ascii=False, indent=2))
        raise SystemExit(2) from exc
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
