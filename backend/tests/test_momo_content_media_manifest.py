"""Source-only contract coverage for the Momo media readiness manifest."""

import pytest
from pydantic import ValidationError

from database.seed.momo_content_media_manifest import (
    MANIFEST_PATH,
    MomoContentMediaManifest,
    MomoStoryboardEntry,
    STORYBOARD_PATH,
    approve_momo_lesson_storyboard,
    build_momo_content_media_manifest,
    build_momo_lesson_storyboard,
    load_momo_lesson_storyboard,
    render_manifest_json,
    render_storyboard_json,
)


def test_manifest_has_three_stable_courses_and_eighteen_lessons():
    manifest = build_momo_content_media_manifest()

    assert manifest.course_ids == (
        "momo-home-family-english-5-7",
        "momo-nature-english-5-7",
        "momo-school-food-english-5-7",
    )
    assert len(manifest.lessons) == 18
    assert {lesson.category for lesson in manifest.lessons} == {
        "home_family",
        "nature",
        "school_food",
    }


def test_manifest_media_stays_pending_under_stable_course_prefixes_with_bindings():
    manifest = build_momo_content_media_manifest()

    assert manifest.entries
    assert all(entry.bucket == "learnar-assets" for entry in manifest.entries)
    assert all(entry.status == "pending" for entry in manifest.entries)
    assert all(entry.object_path.startswith(f"courses/{entry.course_id}/") for entry in manifest.entries)
    assert any(entry.role == "lesson_video" and entry.media_type == "video" for entry in manifest.entries)
    assert any(entry.role == "quiz_illustration" and entry.question_bindings for entry in manifest.entries)
    assert all(entry.mime_type for entry in manifest.entries)


def test_manifest_rejects_duplicate_object_path_and_unknown_question_binding():
    payload = build_momo_content_media_manifest().model_dump(mode="json")
    quiz_entry_index = next(index for index, entry in enumerate(payload["entries"]) if entry["role"] == "quiz_illustration")
    duplicate_path_payload = {
        **payload,
        "entries": [
            payload["entries"][0],
            {
                **payload["entries"][1],
                "object_path": payload["entries"][0]["object_path"],
                "semantic_key": payload["entries"][0]["semantic_key"],
            },
        ],
    }
    unknown_question_payload = {
        **payload,
        "entries": [
            *payload["entries"][:quiz_entry_index],
            {**payload["entries"][quiz_entry_index], "question_bindings": ["not-a-source-question"]},
            *payload["entries"][quiz_entry_index + 1 :],
        ],
    }

    with pytest.raises(ValidationError, match="object path collision"):
        MomoContentMediaManifest.model_validate(duplicate_path_payload)
    with pytest.raises(ValidationError, match="question binding"):
        MomoContentMediaManifest.model_validate(unknown_question_payload)


def test_committed_manifest_is_deterministic_canonical_output():
    rendered = render_manifest_json()

    assert rendered == render_manifest_json(build_momo_content_media_manifest())
    assert MANIFEST_PATH.read_text(encoding="utf-8") == rendered


def test_storyboard_covers_every_pending_manifest_asset_and_stays_unapproved():
    manifest = build_momo_content_media_manifest()
    storyboard = build_momo_lesson_storyboard(manifest)

    assert {entry.semantic_key for entry in storyboard.entries} == {entry.semantic_key for entry in manifest.entries}
    assert len(storyboard.lesson_keys) == 18
    assert all(entry.approval_status == "pending_user_approval" for entry in storyboard.entries)
    assert all(entry.source_priority[0] == "original_required" for entry in storyboard.entries)
    assert any(entry.asset_role == "lesson_video" and entry.source_strategy == "video_production_required" for entry in storyboard.entries)


def test_storyboard_rejects_external_video_without_license_evidence():
    entry = next(item for item in build_momo_lesson_storyboard().entries if item.asset_role == "lesson_video")
    payload = entry.model_dump(mode="json")

    with pytest.raises(ValidationError, match="license evidence"):
        MomoStoryboardEntry.model_validate({**payload, "source_strategy": "external_licensed", "source_license_evidence": None})


def test_committed_storyboard_is_deterministic_canonical_output():
    approved = approve_momo_lesson_storyboard(build_momo_lesson_storyboard())

    assert all(entry.approval_status == "approved" for entry in approved.entries)
    assert load_momo_lesson_storyboard() == approved
    assert STORYBOARD_PATH.read_text(encoding="utf-8") == render_storyboard_json(approved)
