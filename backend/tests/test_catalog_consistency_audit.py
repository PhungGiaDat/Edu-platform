from __future__ import annotations

import json
import subprocess
import sys
from dataclasses import replace

import pytest

from database.seed import audit_catalog_consistency as audit


class _FakeMappings:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows


class _FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def mappings(self):
        return _FakeMappings(self._rows)


class _RecordingSession:
    def __init__(self, responses):
        self.responses = list(responses)
        self.statements = []

    async def execute(self, statement, params=None):
        self.statements.append(str(statement))
        return _FakeResult(self.responses.pop(0))


def _issue_codes(report):
    return [issue.code for issue in report.issues]


def test_current_sources_have_expected_counts_and_known_source_only_gaps():
    report = audit.source_audit_report()

    assert report.source_course_count == 4
    assert report.source_lesson_count == 23
    assert not any(
        issue.code == "COURSE_METADATA_MISMATCH"
        and issue.course_id == "animals-adventure-en-5-7"
        for issue in report.issues
    )
    assert not any(issue.code == "TOPIC_UNMAPPED" for issue in report.issues)
    assert report.destructive_statements == 0
    assert report.writes_performed == 0


def test_manifest_coverage_has_no_missing_or_extra_momo_identities():
    courses, _ = audit.load_source_inventory()
    issues = audit.audit_momo_manifest(courses)

    assert [
        issue
        for issue in issues
        if issue.code in {"CATALOG_MISSING", "LEGACY_UNMAPPED"} and (issue.course_id or "").startswith("momo-")
    ] == []


def test_explicit_empty_topic_is_accepted_when_other_source_categories_are_mapped():
    course = audit.CourseInventory(
        course_id="animals-course",
        title="Animals",
        category_key="animals",
        source="fixture.json",
        metadata={},
        lessons=(),
    )
    topics = (
        audit.TopicBinding(topic_id="animals", related_course_keys=("animals",)),
        audit.TopicBinding(topic_id="transport", related_course_keys=()),
    )

    assert audit.audit_topic_registry({course.course_id: course}, topics) == []


def test_duplicate_and_missing_lesson_order_fixture_reports_expected_issue():
    lesson_a = audit.LessonInventory("one", 1, "One", "course-a", "fixture.json")
    lesson_b = audit.LessonInventory("two", 1, "Two", "course-a", "fixture.json")
    lesson_c = audit.LessonInventory("three", None, "Three", "course-a", "fixture.json")
    course = audit.CourseInventory(
        course_id="course-a",
        title="Course A",
        category_key="fixture",
        source="fixture.json",
        metadata={},
        lessons=(lesson_a, lesson_b, lesson_c),
    )

    issues = audit.audit_lesson_order([course])

    assert [issue.code for issue in issues] == [
        "LESSON_ORDER_CONFLICT",
        "LESSON_ORDER_CONFLICT",
        "LESSON_ORDER_CONFLICT",
    ]
    assert any(issue.detail.get("orders") == [1] for issue in issues)
    assert any(issue.detail.get("missing_orders") == [2, 3] for issue in issues)


def test_source_only_audit_performs_no_writes_and_report_invariants_remain_zero():
    report = audit.source_audit_report()
    data = report.as_dict()

    assert data["summary"]["destructive_statements"] == 0
    assert data["summary"]["writes_performed"] == 0
    assert data["destructive_statements"] == 0
    assert data["writes_performed"] == 0


def test_json_source_only_cli_stdout_is_parseable_json():
    result = subprocess.run(
        [sys.executable, "-m", "database.seed.audit_catalog_consistency", "--json", "--source-only"],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )

    payload = json.loads(result.stdout)

    assert result.stdout.lstrip().startswith("{")
    assert "[CONFIG]" not in result.stdout
    assert payload["mode"] == "source-only"
    assert payload["summary"]["source_courses"] == 4
    assert payload["summary"]["source_lessons"] == 23
    assert payload["summary"]["destructive_statements"] == 0
    assert payload["summary"]["writes_performed"] == 0


@pytest.mark.asyncio
async def test_database_audit_uses_select_only_statements_and_reports_db_gaps():
    courses, _ = audit.load_source_inventory()
    first_course = next(iter(courses.values()))
    first_lesson = first_course.lessons[0]
    stale_blocks = {
        "schema_version": 2,
        "activities": [
            {"type": "quiz", "config": {"question_ids": [111]}},
            {"type": "mini_game", "config": {"mini_game_item_ids": [222]}},
        ],
    }
    lesson_rows = [
        {
            "lesson_id": first_lesson.lesson_id,
            "course_id": first_course.course_id,
            "lesson_order": first_lesson.order,
            "learning_blocks": stale_blocks,
        }
    ]
    session = _RecordingSession(
        [
            [
                {"table_name": "courses"},
                {"table_name": "lessons"},
                {"table_name": "lesson_sessions"},
                {"table_name": "quiz_questions"},
                {"table_name": "mini_game_items"},
            ],
            [{"course_id": first_course.course_id, **first_course.metadata, "is_published": True}],
            lesson_rows,
            [{"session_id": "s1", "course_id": first_course.course_id, "lesson_id": first_lesson.lesson_id, "status": "started"}],
            [{"course_id": "legacy-course", "title": "Legacy"}],
            [],
            [],
        ]
    )

    issues = await audit.audit_database(session, {first_course.course_id: replace(first_course, lessons=(first_lesson,))})

    assert all(statement.lstrip().lower().startswith("select") for statement in session.statements)
    assert "OPEN_SESSION" in [issue.code for issue in issues]
    assert "LEGACY_UNMAPPED" in [issue.code for issue in issues]
    assert [issue.code for issue in issues].count("BLOCK_REFERENCE_STALE") == 2
