"""Focused LC8 semantic manifest, determinism, and safety coverage."""

import pytest
from pydantic import ValidationError

from database.seed.canonical_animals import COURSE_ID, asset_requirements
from database.seed.learner_asset_manifest import (
    MANIFEST_PATH,
    REPOSITORY_ROOT,
    AssetManifestEntry,
    LearnerAssetManifest,
    SourceClassification,
    build_animals_asset_manifest,
    collect_asset_requirements,
    manifest_semantic_key,
    render_manifest_json,
)
from models.asset_contract import AssetRole


def test_current_animals_requirements_have_exact_manifest_coverage_and_counts():
    manifest = build_animals_asset_manifest()
    required = {manifest_semantic_key(*requirement) for requirement in asset_requirements()}
    assert {entry.semantic_key for entry in manifest.entries} == required
    assert len(manifest.entries) == 11
    counts = {role: sum(entry.asset_role is role for entry in manifest.entries) for role in AssetRole}
    assert counts == {
        AssetRole.COURSE_COVER: 1,
        AssetRole.WARM_UP_VISUAL: 0,
        AssetRole.VOCABULARY_ILLUSTRATION: 5,
        AssetRole.PRONUNCIATION_AUDIO: 5,
        AssetRole.COLORING_OUTLINE: 0,
    }


def test_manifest_identity_media_type_and_order_are_canonical():
    manifest = build_animals_asset_manifest()
    keys = [entry.semantic_key for entry in manifest.entries]
    assert keys == sorted(keys)
    assert all(entry.media_type.value == ("audio" if entry.asset_role is AssetRole.PRONUNCIATION_AUDIO else "image") for entry in manifest.entries)
    assert all(entry.bucket == "AR_models" for entry in manifest.entries)
    assert all(entry.object_path.startswith(f"courses/{COURSE_ID}/") for entry in manifest.entries)


def test_duplicate_activity_consumers_collapse_to_one_semantic_requirement():
    illustration = ("animals-v1-cat", AssetRole.VOCABULARY_ILLUSTRATION)
    requirements = tuple(asset_requirements()) + (illustration, illustration)
    assert collect_asset_requirements(requirements).count(illustration) == 1
    entry = next(item for item in build_animals_asset_manifest().entries if item.semantic_key == manifest_semantic_key(*illustration))
    assert entry.consumers == ("learn_vocabulary", "memory_match")


def test_manifest_rejects_duplicate_semantic_keys_and_path_collisions():
    entry = build_animals_asset_manifest().entries[0]
    with pytest.raises(ValidationError, match="duplicate semantic keys"):
        LearnerAssetManifest(content_batch=COURSE_ID, content_version=1, entries=(entry, entry))
    other = build_animals_asset_manifest().entries[1].model_copy(update={"object_path": entry.object_path})
    with pytest.raises(ValidationError, match="object path collision"):
        LearnerAssetManifest(content_batch=COURSE_ID, content_version=1, entries=tuple(sorted((entry, other), key=lambda item: item.semantic_key)))


def test_role_media_compatibility_and_relative_paths_are_validated():
    data = build_animals_asset_manifest().entries[0].model_dump(mode="json")
    with pytest.raises(ValidationError, match="incompatible"):
        AssetManifestEntry.model_validate({**data, "media_type": "audio"})
    with pytest.raises(ValidationError, match="absolute paths"):
        AssetManifestEntry.model_validate({**data, "output_path": "C:/developer/asset.svg"})


def test_source_audit_is_honest_and_contains_no_ar_contract_fields():
    manifest = build_animals_asset_manifest()
    existing = [entry for entry in manifest.entries if entry.source_classification is SourceClassification.EXISTING_FILE]
    generation = [entry for entry in manifest.entries if entry.source_classification is SourceClassification.GENERATION_REQUIRED]
    assert len(existing) == 6
    assert len(generation) == 5
    assert all(entry.source_path and (REPOSITORY_ROOT / entry.source_path).is_file() for entry in existing)
    assert all((REPOSITORY_ROOT / entry.source_path).suffix == ".svg" for entry in existing if entry.source_path)
    assert all("<svg" in (REPOSITORY_ROOT / entry.source_path).read_text(encoding="utf-8") for entry in existing if entry.source_path)
    payload = manifest.model_dump(mode="json")
    rendered = str(payload)
    assert "reference_image_url" not in rendered
    assert "model_3d_url" not in rendered
    assert "physical_width_m" not in rendered


def test_source_candidate_inventory_never_changes_semantic_identity(tmp_path):
    with_sources = build_animals_asset_manifest()
    without_sources = build_animals_asset_manifest(tmp_path)
    assert [entry.semantic_key for entry in without_sources.entries] == [entry.semantic_key for entry in with_sources.entries]
    assert all(entry.source_classification is SourceClassification.GENERATION_REQUIRED for entry in without_sources.entries)


def test_manifest_has_no_quiz_specific_or_unsupported_requirements():
    manifest = build_animals_asset_manifest()
    assert all("quiz" not in entry.consumers for entry in manifest.entries)
    assert all(entry.asset_role not in {AssetRole.WARM_UP_VISUAL, AssetRole.COLORING_OUTLINE} for entry in manifest.entries)


def test_committed_manifest_is_idempotent_canonical_output():
    first = render_manifest_json()
    second = render_manifest_json(build_animals_asset_manifest())
    assert first == second
    assert MANIFEST_PATH.read_text(encoding="utf-8") == first
