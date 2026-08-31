"""Canonical adaptive activity metadata for the release Momo catalog."""

from __future__ import annotations

import json
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from models.lesson_activity import LessonLearningBlocks


CONTENT_VERSION = 1
SEED_ROOT = Path(__file__).resolve().parents[2] / "seeds" / "courses"
MANIFEST_PATH = Path(__file__).resolve().parent / "manifests" / "momo_adaptive_courses.json"
SOURCE_FILES = (
    "momo_home_family.json",
    "momo_nature.json",
    "momo_school_food.json",
)
REQUIRED_ACTIVITY_TYPES = (
    "learn_vocabulary",
    "listen_choose",
    "match",
    "read_aloud",
    "pronunciation",
    "quiz",
)


def normalize_key(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value).casefold()
    return " ".join(normalized.replace("’", "'").replace("“", '"').replace("”", '"').split())


def slugify(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    parts = [part for part in "".join(ch if ch.isalnum() else "-" for ch in ascii_value.lower()).split("-") if part]
    return "-".join(parts)


@dataclass(frozen=True)
class VocabularyEntry:
    key: str
    vocabulary_id: str
    word_en: str
    word_vi: str


@dataclass(frozen=True)
class QuizQuestionPlan:
    question_key: str
    source_question_id: str
    vocabulary_key: str


@dataclass(frozen=True)
class MatchActivityPlan:
    game_key: str
    item_vocabulary_keys: tuple[str, ...]
    game_type: str = "drag_match"


@dataclass(frozen=True)
class CanonicalLessonPlan:
    course_id: str
    lesson_id: str
    content_version: int
    vocabulary: tuple[VocabularyEntry, ...]
    listen_choose_keys: tuple[str, ...]
    match_activity: MatchActivityPlan
    pronunciation_keys: tuple[str, ...]
    read_aloud_story_id: str
    quiz_questions: tuple[QuizQuestionPlan, ...]

    @property
    def vocabulary_by_key(self) -> dict[str, VocabularyEntry]:
        return {item.key: item for item in self.vocabulary}


@dataclass(frozen=True)
class CourseLessonSource:
    lesson_id: str
    order: int
    title: str
    title_vi: str
    learning_blocks: dict[str, Any]


@dataclass(frozen=True)
class CourseSource:
    course_id: str
    title: str
    category_key: str
    lessons: tuple[CourseLessonSource, ...]


class ManifestCatalog:
    def __init__(self, lesson_plans: dict[tuple[str, str], CanonicalLessonPlan]):
        self._lesson_plans = lesson_plans

    def lesson_plan(self, course_id: str, lesson_id: str) -> CanonicalLessonPlan:
        return self._lesson_plans[(course_id, lesson_id)]

    def course_ids(self) -> tuple[str, ...]:
        return tuple(dict.fromkeys(course_id for course_id, _ in self._lesson_plans))


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def build_course_index() -> dict[str, CourseSource]:
    courses: dict[str, CourseSource] = {}
    for filename in SOURCE_FILES:
        raw = _load_json(SEED_ROOT / filename)
        lessons = tuple(
            CourseLessonSource(
                lesson_id=str(lesson["lesson_id"]),
                order=int(lesson["order"]),
                title=str(lesson["title"]),
                title_vi=str(lesson.get("title_vi", "")),
                learning_blocks={
                    key: lesson[key]
                    for key in ("vocabulary", "game", "activity", "readAloudStory", "pronunciation", "quiz")
                    if key in lesson
                },
            )
            for lesson in raw["lessons"]
        )
        courses[str(raw["course_id"])] = CourseSource(
            course_id=str(raw["course_id"]),
            title=str(raw["title"]),
            category_key=str(raw.get("category_key", "")),
            lessons=lessons,
        )
    return courses


def load_manifest() -> ManifestCatalog:
    raw = _load_json(MANIFEST_PATH)
    courses = build_course_index()
    lesson_plans: dict[tuple[str, str], CanonicalLessonPlan] = {}
    for course_entry in raw["courses"]:
        course_id = str(course_entry["course_id"])
        source_course = courses[course_id]
        source_lessons = {lesson.lesson_id: lesson for lesson in source_course.lessons}
        for lesson_entry in course_entry["lessons"]:
            lesson_id = str(lesson_entry["lesson_id"])
            source_lesson = source_lessons[lesson_id]
            vocabulary = _build_vocabulary(source_lesson)
            lesson_plans[(course_id, lesson_id)] = CanonicalLessonPlan(
                course_id=course_id,
                lesson_id=lesson_id,
                content_version=int(lesson_entry["content_version"]),
                vocabulary=vocabulary,
                listen_choose_keys=(str(lesson_entry["listen_choose_target"]),),
                match_activity=MatchActivityPlan(
                    game_key=f"{course_id}:{lesson_id}:match_picture",
                    item_vocabulary_keys=tuple(str(item) for item in lesson_entry["match_item_keys"]),
                ),
                pronunciation_keys=tuple(str(item) for item in lesson_entry["pronunciation_keys"]),
                read_aloud_story_id=str(source_lesson.learning_blocks["readAloudStory"]["story_id"]),
                quiz_questions=tuple(
                    QuizQuestionPlan(
                        question_key=f"{course_id}:{lesson_id}:quiz:{question_id}",
                        source_question_id=str(question_id),
                        vocabulary_key=str(vocabulary_key),
                    )
                    for question_id, vocabulary_key in lesson_entry["quiz_owner_by_question"].items()
                ),
            )
    return ManifestCatalog(lesson_plans)


def _build_vocabulary(lesson: CourseLessonSource) -> tuple[VocabularyEntry, ...]:
    return tuple(
        VocabularyEntry(
            key=slugify(str(item["word_en"])),
            vocabulary_id=f"{lesson.lesson_id}:{slugify(str(item['word_en']))}",
            word_en=str(item["word_en"]),
            word_vi=str(item["word_vi"]),
        )
        for item in lesson.learning_blocks.get("vocabulary", [])
    )


def build_match_payload(plan: CanonicalLessonPlan, flashcard_ids: dict[str, str]) -> dict[str, Any]:
    return {
        "semantic_id": plan.match_activity.game_key,
        "prompt": f"match:{plan.lesson_id}",
        "items": [
            {
                "vocabulary_id": plan.vocabulary_by_key[key].vocabulary_id,
                "flashcard_qr_id": flashcard_ids[key],
                "word_en": plan.vocabulary_by_key[key].word_en,
                "word_vi": plan.vocabulary_by_key[key].word_vi,
            }
            for key in plan.match_activity.item_vocabulary_keys
        ],
    }


def generate_lesson_blocks(
    course: CourseSource,
    lesson: CourseLessonSource,
    plan: CanonicalLessonPlan,
    resolved_dependencies: dict[str, dict[str, int]],
) -> dict[str, Any]:
    question_ids = [resolved_dependencies["question_ids"][item.question_key] for item in plan.quiz_questions]
    mini_game_ids = [resolved_dependencies["mini_game_ids"][plan.match_activity.game_key]]
    blocks = LessonLearningBlocks.model_validate(
        {
            "schema_version": 2,
            "content_version": plan.content_version,
            "vocabulary": [item.vocabulary_id for item in plan.vocabulary],
            "activities": [
                {
                    "activity_id": f"{course.course_id}:{lesson.lesson_id}:learn_vocabulary",
                    "type": "learn_vocabulary",
                    "order": 1,
                    "required": True,
                    "title": "Learn Vocabulary",
                    "completion_policy": {"mode": "all_items"},
                    "config": {"vocabulary_ids": [item.vocabulary_id for item in plan.vocabulary]},
                },
                {
                    "activity_id": f"{course.course_id}:{lesson.lesson_id}:listen_choose",
                    "type": "listen_choose",
                    "order": 2,
                    "required": True,
                    "title": "Listen and Choose",
                    "completion_policy": {"mode": "all_items"},
                    "config": {
                        "vocabulary_ids": [plan.vocabulary_by_key[key].vocabulary_id for key in plan.listen_choose_keys],
                        "question_count": len(plan.listen_choose_keys),
                        "order_policy": "authored",
                    },
                },
                {
                    "activity_id": f"{course.course_id}:{lesson.lesson_id}:match_picture",
                    "type": "match",
                    "order": 3,
                    "required": True,
                    "title": "Match Picture",
                    "completion_policy": {"mode": "interaction_complete"},
                    "config": {"mini_game_item_ids": mini_game_ids},
                },
                {
                    "activity_id": f"{course.course_id}:{lesson.lesson_id}:read_aloud",
                    "type": "read_aloud",
                    "order": 4,
                    "required": True,
                    "title": "Read Aloud",
                    "completion_policy": {"mode": "all_items"},
                    "config": {"story_id": plan.read_aloud_story_id},
                },
                {
                    "activity_id": f"{course.course_id}:{lesson.lesson_id}:pronunciation",
                    "type": "pronunciation",
                    "order": 5,
                    "required": True,
                    "title": "Pronunciation",
                    "completion_policy": {"mode": "interaction_complete"},
                    "config": {
                        "vocabulary_ids": [plan.vocabulary_by_key[key].vocabulary_id for key in plan.pronunciation_keys],
                    },
                },
                {
                    "activity_id": f"{course.course_id}:{lesson.lesson_id}:quiz",
                    "type": "quiz",
                    "order": 6,
                    "required": True,
                    "title": "Quiz",
                    "completion_policy": {"mode": "quiz_complete"},
                    "config": {"question_ids": question_ids, "order_policy": "authored"},
                },
            ],
        }
    )
    return blocks.model_dump(mode="json")
