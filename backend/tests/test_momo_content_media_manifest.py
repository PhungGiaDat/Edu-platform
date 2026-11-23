"""Source-only contract coverage for the Momo media readiness manifest."""

import pytest
from pydantic import ValidationError

from database.seed import momo_content_media_manifest as momo_media
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


def test_pending_momo_visual_assets_use_png_raster_paths_for_generated_art():
    manifest = build_momo_content_media_manifest()
    visual_entries = [entry for entry in manifest.entries if entry.media_type in {"image", "sticker"}]

    assert visual_entries
    assert all(entry.object_path.endswith(".png") for entry in visual_entries)
    assert all(entry.mime_type == "image/png" for entry in visual_entries)


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


def test_course_video_contract_creates_one_pending_lexi_trailer_per_stable_course():
    contract = momo_media.build_momo_course_video_sources()

    assert contract.course_ids == build_momo_content_media_manifest().course_ids
    assert len(contract.entries) == 3
    assert all(entry.slot == "trailer" for entry in contract.entries)
    assert all(entry.provider == "supabase" for entry in contract.entries)
    assert all(entry.approval_status == "pending_production" for entry in contract.entries)
    assert all(entry.duration_seconds == 45 for entry in contract.entries)
    assert all(entry.provider_id == f"courses/{entry.course_id}/videos/course-trailer.mp4" for entry in contract.entries)


def test_course_video_contract_rejects_unapproved_youtube_url_and_missing_license_evidence():
    valid = {
        "course_id": "momo-home-family-english-5-7",
        "slot": "explore_more",
        "provider": "youtube",
        "provider_id": "AbCdEfGhI12",
        "title": "Approved animal song",
        "age_range": "5-7",
        "learning_objective": "Củng cố từ vựng bằng bài hát ngắn.",
        "duration_seconds": 60,
        "poster_object_path": "courses/momo-home-family-english-5-7/images/course-cover.png",
        "captions_or_transcript": "Cat, dog, bird.",
        "approval_status": "approved",
        "source_license_evidence": "Reviewed source and license: 2026-09-02",
    }

    with pytest.raises(ValidationError, match="YouTube provider ID"):
        momo_media.MomoCourseVideoSource.model_validate({**valid, "provider_id": "https://youtube.com/watch?v=AbCdEfGhI12"})
    with pytest.raises(ValidationError, match="license evidence"):
        momo_media.MomoCourseVideoSource.model_validate({**valid, "source_license_evidence": None})


def test_committed_course_video_sources_are_deterministic_metadata_only_output():
    contract = momo_media.approve_momo_course_video_sources()

    assert momo_media.load_momo_course_video_sources() == contract
    assert momo_media.COURSE_VIDEO_SOURCES_PATH.read_text(encoding="utf-8") == momo_media.render_course_video_sources_json(contract)


def test_video_source_approval_keeps_every_trailer_pending_production():
    approved = momo_media.approve_momo_course_video_sources()

    assert all(entry.approval_status == "approved" for entry in approved.entries)
    assert all(entry.provider == "supabase" for entry in approved.entries)
    assert all(entry.provider_id.endswith("/videos/course-trailer.mp4") for entry in approved.entries)


def test_approved_trailers_have_one_complete_child_safe_storyboard_each():
    storyboards = momo_media.build_momo_course_video_storyboards(
        momo_media.approve_momo_course_video_sources()
    )

    assert {item.course_id for item in storyboards.entries} == set(build_momo_content_media_manifest().course_ids)
    assert all(item.provider_id.endswith("/videos/course-trailer.mp4") for item in storyboards.entries)
    assert all(len(item.beats) == 5 for item in storyboards.entries)
    assert all(item.beats[0].start_second == 0 and item.beats[-1].end_second == 45 for item in storyboards.entries)
    assert all("autoplay" not in item.model_dump_json().lower() for item in storyboards.entries)


def test_approved_trailers_use_the_nonverbal_lexi_contract():
    storyboards = momo_media.build_momo_course_video_storyboards(
        momo_media.approve_momo_course_video_sources()
    )
    allowed_cues = {
        "welcome_chirp",
        "word_sparkle",
        "thinking_pop",
        "practice_cheer",
        "start_twinkle",
    }

    assert all(item.approval_status == "approved_nonverbal_brief" for item in storyboards.entries)
    assert all("narration" not in beat.model_dump() for item in storyboards.entries for beat in item.beats)
    assert all(beat.on_screen_copy_vi for item in storyboards.entries for beat in item.beats)
    assert {beat.lexi_audio_cue for item in storyboards.entries for beat in item.beats} == allowed_cues
    assert all(
        len(beat.word_audio) == (3 if beat.purpose == "words_in_context" else 0)
        for item in storyboards.entries
        for beat in item.beats
    )
    assert all(
        all(word.islower() and " " not in word for word in beat.word_audio)
        for item in storyboards.entries
        for beat in item.beats
    )


def test_nonverbal_lexi_beat_rejects_legacy_or_invalid_audio_metadata():
    beat = momo_media.build_momo_course_video_storyboards().entries[0].beats[1]
    payload = beat.model_dump(mode="json")

    with pytest.raises(ValidationError):
        momo_media.MomoCourseVideoBeat.model_validate({**payload, "narration": "Legacy narration"})
    with pytest.raises(ValidationError):
        momo_media.MomoCourseVideoBeat.model_validate({key: value for key, value in payload.items() if key != "on_screen_copy_vi"})
    with pytest.raises(ValidationError, match="approved non-verbal Lexi cue"):
        momo_media.MomoCourseVideoBeat.model_validate({**payload, "lexi_audio_cue": "welcome_chirp"})
    with pytest.raises(ValidationError, match="individual lower-case English words"):
        momo_media.MomoCourseVideoBeat.model_validate({**payload, "word_audio": ["home family", "mother", "house"]})


def test_committed_course_video_storyboards_are_deterministic_metadata_only_output():
    storyboards = momo_media.build_momo_course_video_storyboards()

    assert momo_media.load_momo_course_video_storyboards() == storyboards
    assert momo_media.COURSE_VIDEO_STORYBOARDS_PATH.read_text(encoding="utf-8") == momo_media.render_course_video_storyboards_json(storyboards)
