import json
from pathlib import Path

import pytest

from database.migrations.backfill_generated_course_schema import _merge_schema_values, _should_validate_strict
from models.course_integrity import normalize_course_payload


SEED_PATH = Path(__file__).resolve().parents[1] / "seeds" / "courses" / "momo_nature.json"


def _seed_payload():
    with SEED_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def test_normalizeCoursePayload_fillsMissingAssetBucket():
    payload = _seed_payload()
    payload["thumbnail"]["bucket"] = ""
    payload["lessons"][0]["videoLesson"]["video"]["bucket"] = ""

    normalized = normalize_course_payload(payload, strict_generated=True, refresh_updated_at=False)

    assert normalized["thumbnail"]["bucket"] == "learnar-assets"
    assert normalized["lessons"][0]["videoLesson"]["video"]["bucket"] == "learnar-assets"


def test_normalizeCoursePayload_fillsMissingAssetBucketWhenStatusOmitted():
    payload = _seed_payload()
    payload["thumbnail"]["bucket"] = ""
    payload["thumbnail"].pop("status")

    normalized = normalize_course_payload(payload, strict_generated=True, refresh_updated_at=False)

    assert normalized["thumbnail"]["bucket"] == "learnar-assets"
    assert normalized["thumbnail"]["status"] == "pending"


def test_normalizeCoursePayload_rejectsMissingGeneratedCourseBlock():
    payload = _seed_payload()
    lesson_id = payload["lessons"][0]["lesson_id"]
    payload["lessons"][0]["videoLesson"] = None

    with pytest.raises(ValueError, match=f"Lesson {lesson_id} requires videoLesson"):
        normalize_course_payload(payload, strict_generated=True)


def test_normalizeCoursePayload_canAuditLegacyCourseShape():
    payload = {
        "course_id": "legacy-course",
        "title": "Legacy Course",
        "lessons": [
            {
                "lesson_id": "legacy-lesson",
                "title": "Legacy Lesson",
                "order": 1,
            }
        ],
    }

    normalized = normalize_course_payload(payload, strict_generated=False, refresh_updated_at=False)

    assert normalized["course_id"] == "legacy-course"
    assert normalized["age_range"] == "5-8"
    assert normalized["lessons"][0]["duration_minutes"] == 3


def test_normalizeCoursePayload_relaxedModeNormalizesLegacyAgeRange():
    payload = {
        "course_id": "legacy-course",
        "title": "Legacy Course",
        "age_range": "5-7",
        "lessons": [
            {
                "lesson_id": "legacy-lesson",
                "title": "Legacy Lesson",
                "order": 1,
            }
        ],
    }

    normalized = normalize_course_payload(payload, strict_generated=False, refresh_updated_at=False)

    assert normalized["age_range"] == "5-8"


def test_backfillMerge_preservesUnknownLegacyFields():
    existing = {
        "course_id": "legacy-course",
        "legacy_flag": True,
        "lessons": [
            {
                "lesson_id": "legacy-lesson",
                "title": "Legacy Lesson",
                "order": 1,
                "legacy_note": "keep this",
            }
        ],
    }
    normalized = {
        "course_id": "legacy-course",
        "lessons": [
            {
                "lesson_id": "legacy-lesson",
                "title": "Legacy Lesson",
                "order": 1,
                "duration_minutes": 3,
            }
        ],
    }

    merged = _merge_schema_values(existing, normalized)

    assert merged["legacy_flag"] is True
    assert merged["lessons"][0]["legacy_note"] == "keep this"
    assert merged["lessons"][0]["duration_minutes"] == 3


def test_backfillStrictMode_onlyTargetsGeneratedLookingCourses():
    legacy_document = {
        "course_id": "legacy-course",
        "title": "Legacy Course",
        "age_range": "5-7",
        "lessons": [{"lesson_id": "legacy-lesson", "title": "Legacy Lesson", "order": 1}],
    }
    generated_document = _seed_payload()
    generated_document["lessons"][0]["videoLesson"] = None

    assert _should_validate_strict(legacy_document, strict_generated=True) is False
    assert _should_validate_strict(generated_document, strict_generated=True) is True
    assert _should_validate_strict(generated_document, strict_generated=False) is False
