"""Read-only catalog consistency audit for release course sources.

Run from ``backend``::

    python -m database.seed.audit_catalog_consistency --source-only
    python -m database.seed.audit_catalog_consistency --json --source-only
"""

from __future__ import annotations

import argparse
import asyncio
import contextlib
import importlib
import io
import json
import re
import sys
from collections import Counter
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Iterable

from sqlalchemy import text


BACKEND_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_ROOT.parent
ANIMALS_SOURCE_PATH = Path(__file__).resolve().parent / "animals_adventure.json"
FRONTEND_TOPIC_PATH = REPO_ROOT / "frontend" / "src" / "lib" / "learningPathTopics.ts"
MANIFEST_PATH = Path(__file__).resolve().parent / "manifests" / "momo_adaptive_courses.json"
SOURCE_FILES = (
    "momo_home_family.json",
    "momo_nature.json",
    "momo_school_food.json",
)
REQUIRED_COURSE_FIELDS = (
    "course_id",
    "title",
    "title_vi",
    "description",
    "subtitle_vi",
    "theme",
    "category_key",
    "category_label",
    "category_icon",
    "age_range",
    "level",
)
ISSUE_CODES = {
    "CATALOG_MISSING",
    "COURSE_METADATA_MISMATCH",
    "TOPIC_UNMAPPED",
    "LESSON_ORPHAN",
    "LESSON_ORDER_CONFLICT",
    "OWNER_AMBIGUOUS",
    "DEPENDENCY_MISMATCH",
    "BLOCK_REFERENCE_STALE",
    "OPEN_SESSION",
    "LEGACY_UNMAPPED",
}


def _quiet_import(module_name: str):
    with contextlib.redirect_stdout(io.StringIO()):
        return importlib.import_module(module_name)


@dataclass(frozen=True)
class AuditIssue:
    code: str
    message: str
    course_id: str | None = None
    lesson_id: str | None = None
    source: str | None = None
    detail: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class LessonInventory:
    lesson_id: str
    order: int | None
    title: str
    course_id: str
    source: str


@dataclass(frozen=True)
class CourseInventory:
    course_id: str
    title: str
    category_key: str
    source: str
    metadata: dict[str, Any]
    lessons: tuple[LessonInventory, ...]


@dataclass(frozen=True)
class TopicBinding:
    topic_id: str
    related_course_keys: tuple[str, ...]


@dataclass
class AuditReport:
    mode: str
    source_course_count: int
    source_lesson_count: int
    source_counts: dict[str, dict[str, int]]
    issues: list[AuditIssue] = field(default_factory=list)
    destructive_statements: int = 0
    writes_performed: int = 0

    def summary(self) -> dict[str, Any]:
        counts = Counter(issue.code for issue in self.issues)
        return {
            "source_courses": self.source_course_count,
            "source_lessons": self.source_lesson_count,
            "issues": len(self.issues),
            "issue_counts": dict(sorted(counts.items())),
            "destructive_statements": self.destructive_statements,
            "writes_performed": self.writes_performed,
        }

    def as_dict(self) -> dict[str, Any]:
        return {
            "mode": self.mode,
            "summary": self.summary(),
            "source_counts": self.source_counts,
            "issues": [asdict(issue) for issue in self.issues],
            "destructive_statements": self.destructive_statements,
            "writes_performed": self.writes_performed,
        }


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _source_relpath(path: Path) -> str:
    return path.relative_to(REPO_ROOT).as_posix()


def _course_source_path(filename: str) -> Path:
    return BACKEND_ROOT / "seeds" / "courses" / filename


def _lesson_identity(raw: dict[str, Any]) -> str:
    return str(raw.get("lesson_id") or raw.get("id") or "").strip()


def _course_from_raw(path: Path, raw: dict[str, Any]) -> CourseInventory:
    course_id = str(raw.get("course_id") or "").strip()
    lessons = tuple(
        LessonInventory(
            lesson_id=_lesson_identity(lesson),
            order=lesson.get("order") if isinstance(lesson.get("order"), int) else None,
            title=str(lesson.get("title") or ""),
            course_id=course_id,
            source=_source_relpath(path),
        )
        for lesson in raw.get("lessons", [])
    )
    metadata = {field_name: raw.get(field_name) for field_name in REQUIRED_COURSE_FIELDS}
    return CourseInventory(
        course_id=course_id,
        title=str(raw.get("title") or ""),
        category_key=str(raw.get("category_key") or ""),
        source=_source_relpath(path),
        metadata=metadata,
        lessons=lessons,
    )


def load_source_inventory() -> tuple[dict[str, CourseInventory], list[AuditIssue]]:
    issues: list[AuditIssue] = []
    courses: dict[str, CourseInventory] = {}
    seen_course_sources: dict[str, list[str]] = {}
    seen_lesson_sources: dict[str, list[str]] = {}

    for path in [*(_course_source_path(filename) for filename in SOURCE_FILES), ANIMALS_SOURCE_PATH]:
        if not path.exists():
            issues.append(AuditIssue("CATALOG_MISSING", f"Missing canonical source file {path}", source=str(path)))
            continue
        raw = _read_json(path)
        course = _course_from_raw(path, raw)
        seen_course_sources.setdefault(course.course_id, []).append(course.source)
        for lesson in course.lessons:
            seen_lesson_sources.setdefault(lesson.lesson_id, []).append(f"{course.course_id}:{lesson.source}")
        if not course.course_id:
            issues.append(AuditIssue("CATALOG_MISSING", "Course source is missing course_id", source=course.source))
            continue
        courses[course.course_id] = course
        missing = [name for name, value in course.metadata.items() if value in (None, "")]
        if missing:
            issues.append(
                AuditIssue(
                    "CATALOG_MISSING",
                    "Course metadata has empty required fields",
                    course_id=course.course_id,
                    source=course.source,
                    detail={"fields": missing},
                )
            )

    for course_id, sources in seen_course_sources.items():
        if course_id and len(sources) > 1:
            issues.append(
                AuditIssue(
                    "OWNER_AMBIGUOUS",
                    "Duplicate course identity appears in multiple source files",
                    course_id=course_id,
                    detail={"sources": sources},
                )
            )
    for lesson_id, owners in seen_lesson_sources.items():
        if lesson_id and len(owners) > 1:
            issues.append(
                AuditIssue(
                    "OWNER_AMBIGUOUS",
                    "Duplicate lesson identity appears in multiple source courses",
                    lesson_id=lesson_id,
                    detail={"owners": owners},
                )
            )
    issues.extend(audit_lesson_order(courses.values()))
    return courses, issues


def audit_lesson_order(courses: Iterable[CourseInventory]) -> list[AuditIssue]:
    issues: list[AuditIssue] = []
    for course in courses:
        orders = [lesson.order for lesson in course.lessons if lesson.order is not None]
        if len(orders) != len(course.lessons):
            missing_lessons = [lesson.lesson_id for lesson in course.lessons if lesson.order is None]
            issues.append(
                AuditIssue(
                    "LESSON_ORDER_CONFLICT",
                    "Lesson order is missing",
                    course_id=course.course_id,
                    source=course.source,
                    detail={"lessons": missing_lessons},
                )
            )
        duplicates = sorted(order for order, count in Counter(orders).items() if count > 1)
        if duplicates:
            issues.append(
                AuditIssue(
                    "LESSON_ORDER_CONFLICT",
                    "Duplicate lesson order values",
                    course_id=course.course_id,
                    source=course.source,
                    detail={"orders": duplicates},
                )
            )
        expected = set(range(1, len(course.lessons) + 1))
        missing = sorted(expected - set(orders))
        if missing:
            issues.append(
                AuditIssue(
                    "LESSON_ORDER_CONFLICT",
                    "Lesson order sequence has gaps",
                    course_id=course.course_id,
                    source=course.source,
                    detail={"missing_orders": missing},
                )
            )
    return issues


def _manifest_raw_identities() -> tuple[set[str], set[tuple[str, str]], list[dict[str, Any]]]:
    raw = _read_json(MANIFEST_PATH)
    course_ids: set[str] = set()
    lesson_ids: set[tuple[str, str]] = set()
    entries: list[dict[str, Any]] = []
    for course in raw.get("courses", []):
        course_id = str(course.get("course_id") or "")
        course_ids.add(course_id)
        for lesson in course.get("lessons", []):
            lesson_id = str(lesson.get("lesson_id") or "")
            lesson_ids.add((course_id, lesson_id))
            entries.append({"course_id": course_id, **lesson})
    return course_ids, lesson_ids, entries


def audit_momo_manifest(courses: dict[str, CourseInventory]) -> list[AuditIssue]:
    canonical_momo_courses = _quiet_import("database.seed.canonical_momo_courses")
    issues: list[AuditIssue] = []
    momo_source_courses = {course_id: course for course_id, course in courses.items() if course_id.startswith("momo-")}
    source_course_ids = set(momo_source_courses)
    source_lesson_ids = {
        (course.course_id, lesson.lesson_id)
        for course in momo_source_courses.values()
        for lesson in course.lessons
    }
    manifest_course_ids, manifest_lesson_ids, manifest_entries = _manifest_raw_identities()
    for course_id in sorted(source_course_ids - manifest_course_ids):
        issues.append(AuditIssue("CATALOG_MISSING", "Momo source course missing from manifest", course_id=course_id))
    for course_id in sorted(manifest_course_ids - source_course_ids):
        issues.append(AuditIssue("LEGACY_UNMAPPED", "Manifest course is not in Momo source inventory", course_id=course_id))
    for course_id, lesson_id in sorted(source_lesson_ids - manifest_lesson_ids):
        issues.append(
            AuditIssue("CATALOG_MISSING", "Momo source lesson missing from manifest", course_id=course_id, lesson_id=lesson_id)
        )
    for course_id, lesson_id in sorted(manifest_lesson_ids - source_lesson_ids):
        issues.append(
            AuditIssue("LEGACY_UNMAPPED", "Manifest lesson is not in Momo source inventory", course_id=course_id, lesson_id=lesson_id)
        )

    source_by_pair = {
        (course.course_id, lesson.lesson_id): lesson
        for course in momo_source_courses.values()
        for lesson in course.lessons
    }
    # Existing loader validates the manifest can be resolved against current source files.
    manifest = canonical_momo_courses.load_manifest()
    for course_id, lesson_id in source_lesson_ids:
        try:
            manifest.lesson_plan(course_id, lesson_id)
        except Exception as exc:
            issues.append(
                AuditIssue(
                    "DEPENDENCY_MISMATCH",
                    "Canonical Momo loader could not resolve source lesson",
                    course_id=course_id,
                    lesson_id=lesson_id,
                    detail={"error": str(exc)},
                )
            )

    for entry in manifest_entries:
        course_id = str(entry["course_id"])
        lesson_id = str(entry["lesson_id"])
        source_lesson = source_by_pair.get((course_id, lesson_id))
        if source_lesson is None:
            continue
        raw_lesson = next(
            lesson
            for lesson in _read_json(REPO_ROOT / source_lesson.source).get("lessons", [])
            if _lesson_identity(lesson) == lesson_id
        )
        vocabulary_keys = {canonical_momo_courses.slugify(str(item.get("word_en") or "")) for item in raw_lesson.get("vocabulary", [])}
        quiz_ids = {str(item.get("question_id") or "") for item in raw_lesson.get("quiz", [])}
        checks = {
            "listen_choose_target": [entry.get("listen_choose_target")],
            "match_item_keys": list(entry.get("match_item_keys") or []),
            "pronunciation_keys": list(entry.get("pronunciation_keys") or []),
            "quiz_owner_by_question.values": list((entry.get("quiz_owner_by_question") or {}).values()),
        }
        bad_refs = {
            name: sorted(str(value) for value in values if str(value) not in vocabulary_keys)
            for name, values in checks.items()
            if any(str(value) not in vocabulary_keys for value in values)
        }
        bad_questions = sorted(set((entry.get("quiz_owner_by_question") or {}).keys()) - quiz_ids)
        if bad_refs or bad_questions:
            issues.append(
                AuditIssue(
                    "DEPENDENCY_MISMATCH",
                    "Manifest semantic references do not resolve to source lesson vocabulary or quiz",
                    course_id=course_id,
                    lesson_id=lesson_id,
                    detail={"bad_refs": bad_refs, "bad_quiz_question_ids": bad_questions},
                )
            )
    return issues


def audit_animals_metadata(courses: dict[str, CourseInventory]) -> list[AuditIssue]:
    canonical_animals = _quiet_import("database.seed.canonical_animals")
    source = courses.get(canonical_animals.COURSE_ID)
    if source is None:
        return [AuditIssue("CATALOG_MISSING", "Animals Adventure source is missing", course_id=canonical_animals.COURSE_ID)]
    canonical = canonical_animals.COURSE
    expected = {
        "course_id": canonical.course_id,
        "title": canonical.title,
        "title_vi": canonical.title_vi,
        "category_key": canonical.category_key,
        "category_label": canonical.category_label,
        "category_icon": canonical.category_icon,
        "level": canonical.level,
    }
    actual = {key: source.metadata.get(key) for key in expected}
    mismatches = {
        key: {"source": actual[key], "canonical": expected[key]}
        for key in expected
        if actual[key] != expected[key]
    }
    if not mismatches:
        return []
    return [
        AuditIssue(
            "COURSE_METADATA_MISMATCH",
            "Animals Adventure source metadata differs from canonical_animals.COURSE",
            course_id=canonical_animals.COURSE_ID,
            source=source.source,
            detail={"fields": mismatches},
        )
    ]


def load_frontend_topic_registry(path: Path = FRONTEND_TOPIC_PATH) -> tuple[TopicBinding, ...]:
    content = path.read_text(encoding="utf-8")
    topics: list[TopicBinding] = []
    for block_match in re.finditer(r"\{\s*id:\s*'([^']+)'.*?relatedCourseKeys:\s*\[([^\]]*)\]", content, re.DOTALL):
        topic_id = block_match.group(1)
        keys = tuple(re.findall(r"'([^']+)'", block_match.group(2)))
        topics.append(TopicBinding(topic_id=topic_id, related_course_keys=keys))
    return tuple(topics)


def audit_topic_registry(courses: dict[str, CourseInventory], topics: Iterable[TopicBinding]) -> list[AuditIssue]:
    issues: list[AuditIssue] = []
    topic_list = tuple(topics)
    related_keys = {key for topic in topic_list for key in topic.related_course_keys}
    source_category_keys = {course.category_key for course in courses.values() if course.category_key}
    for category_key in sorted(source_category_keys - related_keys):
        issues.append(
            AuditIssue(
                "TOPIC_UNMAPPED",
                "Source course category key is not represented by frontend relatedCourseKeys",
                detail={"category_key": category_key, "mapping_status": "missing_authoritative_relatedCourseKeys"},
            )
        )
    return issues


def _source_counts(courses: dict[str, CourseInventory]) -> dict[str, dict[str, int]]:
    return {
        course.source: {"courses": 1, "lessons": len(course.lessons)}
        for course in sorted(courses.values(), key=lambda item: item.source)
    }


def source_audit_report() -> AuditReport:
    courses, issues = load_source_inventory()
    issues.extend(audit_momo_manifest(courses))
    issues.extend(audit_animals_metadata(courses))
    issues.extend(audit_topic_registry(courses, load_frontend_topic_registry()))
    return AuditReport(
        mode="source-only",
        source_course_count=len(courses),
        source_lesson_count=sum(len(course.lessons) for course in courses.values()),
        source_counts=_source_counts(courses),
        issues=issues,
    )


def _assert_select_only(sql: str) -> None:
    stripped = sql.strip().lower()
    if not (stripped.startswith("select") or stripped.startswith("with")):
        raise RuntimeError("DB audit attempted a non-SELECT statement")
    forbidden = re.search(r"\b(insert|update|delete|merge|alter|drop|create|truncate|grant|revoke|copy|vacuum)\b", stripped)
    if forbidden:
        raise RuntimeError(f"DB audit statement is not read-only: {forbidden.group(1).upper()}")


async def _execute_select(session: Any, sql: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    _assert_select_only(sql)
    result = await session.execute(text(sql), params or {})
    return [dict(row) for row in result.mappings().all()]


async def audit_database(session: Any, courses: dict[str, CourseInventory]) -> list[AuditIssue]:
    issues: list[AuditIssue] = []
    table_rows = await _execute_select(
        session,
        """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema='public'
          AND table_name IN ('courses','lessons','lesson_sessions','quiz_questions','mini_game_items')
        """,
    )
    tables = {str(row["table_name"]) for row in table_rows}
    required = {"courses", "lessons"}
    if not required.issubset(tables):
        missing = sorted(required - tables)
        raise RuntimeError(f"PostgreSQL schema unavailable for catalog audit; missing tables: {', '.join(missing)}")

    course_ids = sorted(courses)
    lesson_pairs = {
        lesson.lesson_id: (course.course_id, lesson.order)
        for course in courses.values()
        for lesson in course.lessons
    }
    lesson_ids = sorted(lesson_pairs)
    course_rows = await _execute_select(
        session,
        """
        SELECT course_id, title, title_vi, category_key, category_label, category_icon, level, is_published
        FROM public.courses
        WHERE course_id = ANY(CAST(:course_ids AS text[]))
        """,
        {"course_ids": course_ids},
    )
    db_courses = {str(row["course_id"]): row for row in course_rows}
    for course_id in sorted(set(course_ids) - set(db_courses)):
        issues.append(AuditIssue("CATALOG_MISSING", "Source course missing from public.courses", course_id=course_id))
    for course_id, course in courses.items():
        row = db_courses.get(course_id)
        if row is None:
            continue
        fields = ["title", "category_key", "category_label", "category_icon", "level"]
        mismatches = {
            field_name: {"source": course.metadata.get(field_name), "db": row.get(field_name)}
            for field_name in fields
            if course.metadata.get(field_name) not in (None, "") and row.get(field_name) != course.metadata.get(field_name)
        }
        if mismatches:
            issues.append(
                AuditIssue(
                    "COURSE_METADATA_MISMATCH",
                    "DB course metadata differs from canonical source inventory",
                    course_id=course_id,
                    detail={"fields": mismatches},
                )
            )

    lesson_rows = await _execute_select(
        session,
        """
        SELECT lesson_id, course_id, lesson_order, learning_blocks
        FROM public.lessons
        WHERE lesson_id = ANY(CAST(:lesson_ids AS text[]))
           OR course_id = ANY(CAST(:course_ids AS text[]))
        """,
        {"lesson_ids": lesson_ids, "course_ids": course_ids},
    )
    db_lessons = {str(row["lesson_id"]): row for row in lesson_rows}
    for lesson_id in sorted(set(lesson_ids) - set(db_lessons)):
        expected_course, _ = lesson_pairs[lesson_id]
        issues.append(
            AuditIssue("CATALOG_MISSING", "Source lesson missing from public.lessons", course_id=expected_course, lesson_id=lesson_id)
        )
    for lesson_id, (expected_course, expected_order) in lesson_pairs.items():
        row = db_lessons.get(lesson_id)
        if row is None:
            continue
        if row.get("course_id") != expected_course:
            issues.append(
                AuditIssue(
                    "LESSON_ORPHAN",
                    "DB lesson identity belongs to a different course",
                    course_id=expected_course,
                    lesson_id=lesson_id,
                    detail={"db_course_id": row.get("course_id")},
                )
            )
        if expected_order is not None and row.get("lesson_order") != expected_order:
            issues.append(
                AuditIssue(
                    "LESSON_ORDER_CONFLICT",
                    "DB lesson order differs from source inventory",
                    course_id=expected_course,
                    lesson_id=lesson_id,
                    detail={"source_order": expected_order, "db_order": row.get("lesson_order")},
                )
            )

    if "lesson_sessions" in tables:
        open_sessions = await _execute_select(
            session,
            """
            SELECT session_id, course_id, lesson_id, status
            FROM public.lesson_sessions
            WHERE status <> 'completed'
            """,
        )
        for row in open_sessions:
            issues.append(
                AuditIssue(
                    "OPEN_SESSION",
                    "Open lesson session exists",
                    course_id=str(row.get("course_id")),
                    lesson_id=str(row.get("lesson_id")),
                    detail={"session_id": row.get("session_id"), "status": row.get("status")},
                )
            )

    legacy_rows = await _execute_select(
        session,
        """
        SELECT course_id, title
        FROM public.courses
        WHERE is_published = true
          AND NOT (course_id = ANY(CAST(:course_ids AS text[])))
        ORDER BY course_id
        """,
        {"course_ids": course_ids},
    )
    for row in legacy_rows:
        issues.append(
            AuditIssue(
                "LEGACY_UNMAPPED",
                "Published DB course is not in canonical source inventory",
                course_id=str(row.get("course_id")),
                detail={"title": row.get("title")},
            )
        )

    if {"quiz_questions", "mini_game_items"}.issubset(tables):
        issues.extend(await audit_block_references(session, lesson_rows))
    return issues


async def audit_block_references(session: Any, lesson_rows: Iterable[dict[str, Any]]) -> list[AuditIssue]:
    issues: list[AuditIssue] = []
    question_ids: set[int] = set()
    game_ids: set[int] = set()
    owners: dict[tuple[str, int], list[tuple[str, str]]] = {"quiz": [], "mini_game": []}
    for row in lesson_rows:
        blocks = row.get("learning_blocks") or {}
        if not isinstance(blocks, dict) or blocks.get("schema_version") != 2:
            continue
        for activity in blocks.get("activities") or []:
            if not isinstance(activity, dict):
                continue
            config = activity.get("config") or {}
            if activity.get("type") == "quiz":
                for value in config.get("question_ids") or []:
                    if isinstance(value, int):
                        question_ids.add(value)
                        owners.setdefault(("quiz", value), []).append((str(row["course_id"]), str(row["lesson_id"])))
            if activity.get("type") in {"mini_game", "match"}:
                for value in config.get("mini_game_item_ids") or []:
                    if isinstance(value, int):
                        game_ids.add(value)
                        owners.setdefault(("mini_game", value), []).append((str(row["course_id"]), str(row["lesson_id"])))
    if question_ids:
        rows = await _execute_select(
            session,
            "SELECT id FROM public.quiz_questions WHERE id = ANY(CAST(:ids AS bigint[]))",
            {"ids": sorted(question_ids)},
        )
        found = {int(row["id"]) for row in rows}
        for missing in sorted(question_ids - found):
            for course_id, lesson_id in owners.get(("quiz", missing), []):
                issues.append(
                    AuditIssue(
                        "BLOCK_REFERENCE_STALE",
                        "Lesson learning_blocks references missing quiz_questions row",
                        course_id=course_id,
                        lesson_id=lesson_id,
                        detail={"question_id": missing},
                    )
                )
    if game_ids:
        rows = await _execute_select(
            session,
            "SELECT id FROM public.mini_game_items WHERE id = ANY(CAST(:ids AS bigint[]))",
            {"ids": sorted(game_ids)},
        )
        found = {int(row["id"]) for row in rows}
        for missing in sorted(game_ids - found):
            for course_id, lesson_id in owners.get(("mini_game", missing), []):
                issues.append(
                    AuditIssue(
                        "BLOCK_REFERENCE_STALE",
                        "Lesson learning_blocks references missing mini_game_items row",
                        course_id=course_id,
                        lesson_id=lesson_id,
                        detail={"mini_game_item_id": missing},
                    )
                )
    return issues


async def run_audit(*, source_only: bool) -> AuditReport:
    courses, issues = load_source_inventory()
    issues.extend(audit_momo_manifest(courses))
    issues.extend(audit_animals_metadata(courses))
    issues.extend(audit_topic_registry(courses, load_frontend_topic_registry()))
    mode = "source-only" if source_only else "database"
    if not source_only:
        settings_module = _quiet_import("settings")
        orm_session = _quiet_import("database.orm_session")
        settings = settings_module.settings
        if not settings.DATABASE_URL:
            raise RuntimeError("DATABASE_URL is required for database catalog audit; rerun with --source-only to skip DB checks")
        await orm_session.connect_orm()
        try:
            async with orm_session.session_factory()() as session:
                issues.extend(await audit_database(session, courses))
        finally:
            await orm_session.close_orm()
    return AuditReport(
        mode=mode,
        source_course_count=len(courses),
        source_lesson_count=sum(len(course.lessons) for course in courses.values()),
        source_counts=_source_counts(courses),
        issues=issues,
    )


def _format_text(report: AuditReport) -> str:
    data = report.as_dict()
    lines = [
        f"Catalog audit mode={data['mode']}",
        f"source_courses={data['summary']['source_courses']} source_lessons={data['summary']['source_lessons']}",
        f"issues={data['summary']['issues']} issue_counts={data['summary']['issue_counts']}",
        "destructive_statements=0 writes_performed=0",
    ]
    for issue in report.issues:
        owner = "/".join(value for value in (issue.course_id, issue.lesson_id) if value)
        suffix = f" [{owner}]" if owner else ""
        lines.append(f"{issue.code}{suffix}: {issue.message} {json.dumps(issue.detail, ensure_ascii=False)}")
    return "\n".join(lines)


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-only", action="store_true", help="Skip DATABASE_URL and PostgreSQL checks")
    parser.add_argument("--json", action="store_true", help="Print structured JSON")
    args = parser.parse_args()
    try:
        report = asyncio.run(run_audit(source_only=args.source_only))
    except Exception as exc:
        raise SystemExit(f"Catalog audit failed without mutation: {exc}") from exc
    if args.json:
        print(json.dumps(report.as_dict(), ensure_ascii=False, indent=2))
    else:
        print(_format_text(report))


if __name__ == "__main__":
    main()
