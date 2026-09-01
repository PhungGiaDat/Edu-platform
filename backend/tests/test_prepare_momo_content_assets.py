"""Task 3 safety checks for locally staged Momo originals.

Prepared inventory is metadata only.  It never copies a binary into the API
repository or uploads it; publication remains a separate explicit task.
"""

from pathlib import Path

import pytest

from database.seed.momo_content_media_manifest import (
    MomoContentMediaManifest,
    MomoLessonStoryboard,
    MomoStoryboardEntry,
    build_momo_content_media_manifest,
    build_momo_lesson_storyboard,
)
from database.seed.prepare_momo_content_assets import MomoPreparationError, prepare_momo_manifest


def _single_manifest(role: str) -> tuple[MomoContentMediaManifest, MomoLessonStoryboard]:
    manifest = build_momo_content_media_manifest()
    media = next(entry for entry in manifest.entries if entry.role == role)
    storyboard_entry = next(entry for entry in build_momo_lesson_storyboard(manifest).entries if entry.semantic_key == media.semantic_key)
    return (
        manifest.model_copy(update={"entries": (media,)}),
        MomoLessonStoryboard(entries=(storyboard_entry,)),
    )


def test_unapproved_entry_cannot_be_prepared(tmp_path: Path):
    manifest, storyboard = _single_manifest("course_thumbnail")

    with pytest.raises(MomoPreparationError, match="approval"):
        prepare_momo_manifest(manifest, storyboard, tmp_path, tmp_path / "prepared.json")


def test_video_requires_a_real_validated_artifact_not_a_generic_placeholder(tmp_path: Path):
    manifest, storyboard = _single_manifest("lesson_video")
    approved = storyboard.entries[0].model_copy(update={"approval_status": "approved"})

    with pytest.raises(MomoPreparationError, match="video production artifact"):
        prepare_momo_manifest(manifest, MomoLessonStoryboard(entries=(approved,)), tmp_path, tmp_path / "prepared.json")


def test_preparation_reads_staged_original_and_writes_metadata_only(tmp_path: Path):
    manifest, storyboard = _single_manifest("course_thumbnail")
    approved = storyboard.entries[0].model_copy(update={"approval_status": "approved"})
    media = manifest.entries[0]
    source = tmp_path / media.object_path
    source.parent.mkdir(parents=True)
    source.write_text('<svg viewBox="0 0 32 32"><title>Momo home</title></svg>', encoding="utf-8")

    inventory = prepare_momo_manifest(manifest, MomoLessonStoryboard(entries=(approved,)), tmp_path, tmp_path / "prepared.json")

    assert len(inventory.entries) == 1
    assert inventory.entries[0].validation_status == "READY_FOR_UPLOAD"
    assert inventory.entries[0].object_path == media.object_path
    assert not inventory.entries[0].local_source_path
    assert (tmp_path / "prepared.json").is_file()
