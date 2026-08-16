"""Canonical LC7 authored content for the PostgreSQL Animals Adventure seed.

This module deliberately contains semantic content only.  It does not create
``media_assets`` rows or provide URLs: LC8--LC10 own manifest, generation and
upload.  Database materialisation resolves the existing bigint quiz/game row
identities before writing schema-v2 ``learning_blocks``.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable

from models.asset_contract import AssetRole
from models.game_activity import MemoryMatchPayload
from models.lesson_activity import LessonLearningBlocks


COURSE_ID = "animals-adventure-en-5-7"
CONTENT_VERSION = 1
VOCABULARY = (
    ("animals-v1-cat", "Cat", "con mèo"),
    ("animals-v1-dog", "Dog", "con chó"),
    ("animals-v1-bird", "Bird", "con chim"),
    ("animals-v1-fish", "Fish", "con cá"),
    ("animals-v1-rabbit", "Rabbit", "con thỏ"),
)


@dataclass(frozen=True)
class CanonicalCourse:
    course_id: str
    title: str
    title_vi: str
    category_key: str
    category_label: str
    category_icon: str
    level: str


COURSE = CanonicalCourse(
    course_id=COURSE_ID,
    title="Animals Adventure",
    title_vi="Hành trình động vật",
    category_key="nature",
    category_label="Nature",
    category_icon="🌿",
    level="beginner",
)


@dataclass(frozen=True)
class CanonicalLesson:
    lesson_id: str
    title: str
    title_vi: str
    focus_vocabulary_id: str
    order: int


@dataclass(frozen=True)
class QuizSeedQuestion:
    """Stable authored identity; PostgreSQL assigns the bigint row identity."""

    key: str
    vocabulary_id: str
    prompt: str
    options: tuple[str, str]
    correct_answer: str


LESSONS = tuple(
    CanonicalLesson(f"learn-the-{word.lower()}", f"Learn the {word}", f"Học về {translation}", vocabulary_id, order)
    for order, (vocabulary_id, word, translation) in enumerate(VOCABULARY, start=1)
)


def quiz_questions(lesson: CanonicalLesson) -> tuple[QuizSeedQuestion, ...]:
    """Text-only LC3 questions; answer keys remain in relational persistence."""
    return tuple(
        QuizSeedQuestion(
            key=f"{lesson.lesson_id}:identify:{vocabulary_id}",
            vocabulary_id=vocabulary_id,
            prompt=f"Which word means {translation}?",
            options=(word, next(other_word for _, other_word, _ in VOCABULARY if other_word != word)),
            correct_answer=word,
        )
        for vocabulary_id, word, translation in VOCABULARY
    )


def mini_game_seed_key(lesson: CanonicalLesson) -> str:
    return f"{lesson.lesson_id}:memory-match:{lesson.focus_vocabulary_id}"


def vocabulary_ids() -> tuple[str, ...]:
    return tuple(item[0] for item in VOCABULARY)


def asset_requirements() -> tuple[tuple[str, AssetRole], ...]:
    """Manifest input, expressed only as content identity plus semantic role."""
    return (
        ((COURSE_ID, AssetRole.COURSE_COVER),)
        + tuple((vocabulary_id, AssetRole.VOCABULARY_ILLUSTRATION) for vocabulary_id in vocabulary_ids())
        + tuple((vocabulary_id, AssetRole.PRONUNCIATION_AUDIO) for vocabulary_id in vocabulary_ids())
    )


def memory_match_payload(vocabulary_id: str, word: str) -> dict:
    """One canonical pair; no legacy raw image URL is embedded."""
    return MemoryMatchPayload.model_validate(
        {
            "pairs": [
                {"id": f"{vocabulary_id}:word", "type": "word", "content": word},
                {
                    "id": f"{vocabulary_id}:image",
                    "type": "image",
                    "vocabulary_id": vocabulary_id,
                    "asset_role": AssetRole.VOCABULARY_ILLUSTRATION,
                },
            ]
        }
    ).model_dump(mode="json")


def lesson_blocks(lesson: CanonicalLesson, quiz_question_ids: Iterable[int], mini_game_item_ids: Iterable[int]) -> dict:
    """Produce a fully validated schema-v2 lesson after relational IDs resolve."""
    blocks = LessonLearningBlocks.model_validate(
        {
            "schema_version": 2,
            "content_version": CONTENT_VERSION,
            "vocabulary": list(vocabulary_ids()),
            "activities": [
                {
                    "activity_id": f"{lesson.lesson_id}:learn-vocabulary",
                    "type": "learn_vocabulary",
                    "order": 1,
                    "required": True,
                    "completion_policy": {"mode": "all_items"},
                    "config": {"vocabulary_ids": list(vocabulary_ids())},
                },
                {
                    "activity_id": f"{lesson.lesson_id}:memory-match",
                    "type": "mini_game",
                    "order": 2,
                    "required": True,
                    "completion_policy": {"mode": "game_complete"},
                    "config": {"game_type": "memory_match", "mini_game_item_ids": list(mini_game_item_ids)},
                },
                {
                    "activity_id": f"{lesson.lesson_id}:quiz",
                    "type": "quiz",
                    "order": 3,
                    "required": True,
                    "completion_policy": {"mode": "quiz_complete"},
                    "config": {"question_ids": list(quiz_question_ids), "order_policy": "authored"},
                },
            ],
        }
    )
    return blocks.model_dump(mode="json")


def dry_run_summary() -> dict[str, int | str]:
    """Deterministic, non-mutating input summary for the controlled seed command."""
    return {
        "course_id": COURSE_ID,
        "course": 1,
        "lessons": len(LESSONS),
        "vocabulary": len(VOCABULARY),
        "quiz_questions": len(LESSONS) * len(VOCABULARY),
        "quiz_options": len(LESSONS) * len(VOCABULARY) * 2,
        "mini_game_items": len(LESSONS),
        "course_cover": 1,
        "vocabulary_illustration": len(VOCABULARY),
        "pronunciation_audio": len(VOCABULARY),
    }


@dataclass
class InMemoryCanonicalSeedStore:
    """Test-double for the controlled PostgreSQL upsert sequence.

    The production command will use the same stable semantic keys to resolve
    existing bigint rows. Keeping this small store here proves that a second
    seed pass preserves those resolved identities rather than appending rows.
    """

    course: dict | None = None
    lessons: dict[str, dict] = field(default_factory=dict)
    quiz_rows: dict[str, int] = field(default_factory=dict)
    game_rows: dict[str, int] = field(default_factory=dict)

    def apply(self) -> None:
        self.course = {
            "course_id": COURSE.course_id,
            "title": COURSE.title,
            "title_vi": COURSE.title_vi,
            "category_key": COURSE.category_key,
            "category_label": COURSE.category_label,
            "category_icon": COURSE.category_icon,
            "level": COURSE.level,
        }
        for lesson in LESSONS:
            question_ids = []
            for question in quiz_questions(lesson):
                self.quiz_rows.setdefault(question.key, 1000 + len(self.quiz_rows) + 1)
                question_ids.append(self.quiz_rows[question.key])
            game_key = mini_game_seed_key(lesson)
            self.game_rows.setdefault(game_key, 2000 + len(self.game_rows) + 1)
            self.lessons[lesson.lesson_id] = lesson_blocks(lesson, question_ids, [self.game_rows[game_key]])

    def snapshot(self) -> tuple[dict | None, dict[str, dict], dict[str, int], dict[str, int]]:
        return self.course, dict(self.lessons), dict(self.quiz_rows), dict(self.game_rows)
