"""Focused LC9 local asset preparation tests with fake generation adapters."""

from __future__ import annotations

import math
import shutil
import wave
from pathlib import Path

import pytest
from PIL import Image
from pydantic import ValidationError

from database.seed.learner_asset_manifest import (
    REPOSITORY_ROOT,
    AssetManifestEntry,
    LearnerAssetManifest,
    SourceClassification,
    build_animals_asset_manifest,
)
from database.seed.prepare_learner_assets import (
    PreparationError,
    dry_run,
    prepare_manifest,
)
from models.asset_contract import AssetRole


class FakeRasterizer:
    method = "fake_svg_rasterizer"

    def __init__(self):
        self.calls: list[tuple[Path, Path]] = []

    def rasterize(self, source_path: Path, output_path: Path, width: int, height: int) -> None:
        self.calls.append((source_path, output_path))
        output_path.parent.mkdir(parents=True, exist_ok=True)
        Image.new("RGB", (width, height), color=(30, 120, 210)).save(output_path, format="PNG")


class FakePronunciationGenerator:
    method = "fake_tts"

    def __init__(self, corrupt: bool = False):
        self.corrupt = corrupt
        self.calls: list[tuple[str, Path]] = []

    def generate(self, text: str, output_path: Path) -> None:
        self.calls.append((text, output_path))
        output_path.parent.mkdir(parents=True, exist_ok=True)
        if self.corrupt:
            output_path.write_bytes(b"not-wave")
            return
        sample_rate = 16_000
        samples = [int(8_000 * math.sin(2 * math.pi * 440 * index / sample_rate)) for index in range(sample_rate // 2)]
        with wave.open(str(output_path), "wb") as audio:
            audio.setnchannels(1)
            audio.setsampwidth(2)
            audio.setframerate(sample_rate)
            audio.writeframes(b"".join(sample.to_bytes(2, "little", signed=True) for sample in samples))


@pytest.fixture
def local_batch(tmp_path):
    manifest = build_animals_asset_manifest()
    for entry in manifest.entries:
        if entry.source_path:
            source = REPOSITORY_ROOT / entry.source_path
            target = tmp_path / entry.source_path
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
    return manifest, tmp_path, tmp_path / "prepared.json"


def test_current_manifest_routes_six_images_and_five_canonical_words(local_batch):
    manifest, root, state = local_batch
    rasterizer = FakeRasterizer()
    generator = FakePronunciationGenerator()
    inventory = prepare_manifest(manifest, root, generator, rasterizer, state)
    assert len(inventory.entries) == 11
    assert len(rasterizer.calls) == 6
    assert [text for text, _ in generator.calls] == ["Bird", "Cat", "Dog", "Fish", "Rabbit"]
    assert all(entry.validation_status == "READY_FOR_UPLOAD" for entry in inventory.entries)


def test_semantic_keys_paths_provenance_and_readiness_survive_preparation(local_batch):
    manifest, root, state = local_batch
    inventory = prepare_manifest(manifest, root, FakePronunciationGenerator(), FakeRasterizer(), state)
    assert [entry.semantic_key for entry in inventory.entries] == [entry.semantic_key for entry in manifest.entries]
    assert [entry.output_path for entry in inventory.entries] == [entry.output_path for entry in manifest.entries]
    images = [entry for entry in inventory.entries if entry.media_type == "image"]
    audio = [entry for entry in inventory.entries if entry.media_type == "audio"]
    assert all(entry.source_path and entry.source_sha256 for entry in images)
    assert all(entry.spoken_text and entry.locale == "en-US" for entry in audio)
    assert all(entry.byte_size > 0 and len(entry.sha256) == 64 for entry in inventory.entries)


def test_second_run_reuses_owned_outputs_without_regeneration(local_batch):
    manifest, root, state = local_batch
    first_generator, first_rasterizer = FakePronunciationGenerator(), FakeRasterizer()
    first = prepare_manifest(manifest, root, first_generator, first_rasterizer, state)
    second_generator, second_rasterizer = FakePronunciationGenerator(), FakeRasterizer()
    second = prepare_manifest(manifest, root, second_generator, second_rasterizer, state)
    assert second == first
    assert second_generator.calls == []
    assert second_rasterizer.calls == []


def test_validate_mode_requires_owned_current_artifacts(local_batch):
    manifest, root, state = local_batch
    with pytest.raises(PreparationError, match="missing/stale"):
        prepare_manifest(manifest, root, FakePronunciationGenerator(), FakeRasterizer(), state, validate_only=True)
    prepare_manifest(manifest, root, FakePronunciationGenerator(), FakeRasterizer(), state)
    validated = prepare_manifest(manifest, root, FakePronunciationGenerator(), FakeRasterizer(), state, validate_only=True)
    assert len(validated.entries) == 11


def test_corrupt_audio_never_becomes_ready(local_batch):
    manifest, root, state = local_batch
    with pytest.raises(PreparationError, match="invalid WAV"):
        prepare_manifest(manifest, root, FakePronunciationGenerator(corrupt=True), FakeRasterizer(), state)
    assert not state.exists()


def test_invalid_svg_never_becomes_ready(local_batch):
    manifest, root, state = local_batch
    image = next(entry for entry in manifest.entries if entry.source_path)
    (root / image.source_path).write_text("not-svg", encoding="utf-8")
    with pytest.raises(PreparationError, match="invalid SVG"):
        prepare_manifest(manifest, root, FakePronunciationGenerator(), FakeRasterizer(), state)
    assert not state.exists()


def test_unsupported_classification_and_non_pronunciation_generation_fail(local_batch):
    manifest, root, state = local_batch
    first = manifest.entries[0].model_copy(update={"source_classification": SourceClassification.MANUAL_REQUIRED})
    modified = manifest.model_copy(update={"entries": (first,) + manifest.entries[1:]})
    with pytest.raises(PreparationError, match="unsupported source classification"):
        prepare_manifest(modified, root, FakePronunciationGenerator(), FakeRasterizer(), state)
    generated_cover = manifest.entries[0].model_copy(update={"source_classification": SourceClassification.GENERATION_REQUIRED, "source_path": None})
    modified = manifest.model_copy(update={"entries": (generated_cover,) + manifest.entries[1:]})
    with pytest.raises(PreparationError, match="unsupported generation requirement"):
        prepare_manifest(modified, root, FakePronunciationGenerator(), FakeRasterizer(), state)


def test_manifest_model_rejects_output_collision_and_ar_role():
    manifest = build_animals_asset_manifest()
    collision = manifest.entries[1].model_copy(update={"output_path": manifest.entries[0].output_path})
    with pytest.raises(ValidationError, match="output path collision"):
        LearnerAssetManifest(content_batch=manifest.content_batch, content_version=1, entries=tuple(sorted((manifest.entries[0], collision), key=lambda item: item.semantic_key)))
    data = manifest.entries[1].model_dump(mode="json")
    with pytest.raises(ValidationError):
        AssetManifestEntry.model_validate({**data, "asset_role": "reference_image"})


def test_dry_run_is_read_only_and_manifest_driven(local_batch):
    manifest, root, state = local_batch
    actions = dry_run(manifest)
    assert len(actions) == 11
    assert sum("PREPARE_SVG_TO_PNG" in action for action in actions) == 6
    assert sum("GENERATE_AUDIO" in action for action in actions) == 5
    assert not state.exists()
    assert not any((root / entry.output_path).exists() for entry in manifest.entries)
