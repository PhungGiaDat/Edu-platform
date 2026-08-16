"""LC9 local preparation for the canonical LC8 Animals asset manifest."""

from __future__ import annotations

import argparse
import array
import hashlib
import json
import os
import shutil
import subprocess
import wave
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Protocol

from PIL import Image
from pydantic import BaseModel, ConfigDict, Field

from database.seed.canonical_animals import COURSE, VOCABULARY
from database.seed.learner_asset_manifest import (
    MANIFEST_PATH,
    REPOSITORY_ROOT,
    AssetManifestEntry,
    LearnerAssetManifest,
    SourceClassification,
)
from models.asset_contract import AssetRole


PREPARATION_SCHEMA_VERSION = 1
PREPARATION_PATH = MANIFEST_PATH.with_name("animals_adventure_assets.prepared.json")
TTS_LOCALE = "en-US"
TTS_VOICE = "Microsoft Zira Desktop"
TTS_RATE = 0


class PreparationError(RuntimeError):
    pass


class PronunciationGenerator(Protocol):
    method: str

    def generate(self, text: str, output_path: Path) -> None: ...


class SvgRasterizer(Protocol):
    method: str

    def rasterize(self, source_path: Path, output_path: Path, width: int, height: int) -> None: ...


class SystemSpeechPronunciationGenerator:
    method = "windows_sapi_microsoft_zira_desktop"

    def generate(self, text: str, output_path: Path) -> None:
        powershell = shutil.which("powershell.exe") or shutil.which("powershell")
        if not powershell:
            raise PreparationError("Windows PowerShell is unavailable for canonical local TTS generation")
        output_path.parent.mkdir(parents=True, exist_ok=True)
        env = os.environ.copy()
        env.update({
            "LC9_TTS_TEXT": text,
            "LC9_TTS_OUTPUT": str(output_path.resolve()),
            "LC9_TTS_VOICE": TTS_VOICE,
        })
        script = (
            "$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Speech; "
            "$s=New-Object System.Speech.Synthesis.SpeechSynthesizer; try { "
            "$s.SelectVoice([Environment]::GetEnvironmentVariable('LC9_TTS_VOICE')); "
            f"$s.Rate={TTS_RATE}; "
            "$s.SetOutputToWaveFile([Environment]::GetEnvironmentVariable('LC9_TTS_OUTPUT')); "
            "$s.Speak([Environment]::GetEnvironmentVariable('LC9_TTS_TEXT')) "
            "} finally { $s.Dispose() }"
        )
        result = subprocess.run(
            [powershell, "-NoProfile", "-NonInteractive", "-Command", script],
            env=env,
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            raise PreparationError("Windows SAPI pronunciation generation failed")


class ChromiumSvgRasterizer:
    method = "chromium_headless_svg_to_png"

    def __init__(self, executable: Path | None = None):
        candidates = [
            executable,
            Path(os.environ["CHROMIUM_PATH"]) if os.environ.get("CHROMIUM_PATH") else None,
            Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
            Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
        ]
        self.executable = next((path for path in candidates if path and path.is_file()), None)
        if self.executable is None:
            raise PreparationError("Chrome/Edge is unavailable for deterministic SVG preparation")

    def rasterize(self, source_path: Path, output_path: Path, width: int, height: int) -> None:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        result = subprocess.run(
            [
                str(self.executable),
                "--headless=new",
                "--disable-gpu",
                "--hide-scrollbars",
                "--force-device-scale-factor=1",
                f"--window-size={width},{height}",
                f"--screenshot={output_path.resolve()}",
                source_path.resolve().as_uri(),
            ],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0 or not output_path.is_file():
            raise PreparationError("Chromium SVG rasterization failed")


class PreparedAsset(BaseModel):
    model_config = ConfigDict(extra="forbid")

    semantic_key: str
    content_identity: str
    asset_role: AssetRole
    media_type: str
    source_classification: str
    source_path: str | None
    source_sha256: str | None
    output_path: str
    bucket: str
    object_path: str
    mime_type: str
    byte_size: int = Field(gt=0)
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    validation_status: str
    technical_validation: str
    content_validation: str
    preparation_method: str
    width: int | None = None
    height: int | None = None
    duration_seconds: float | None = None
    sample_rate: int | None = None
    channels: int | None = None
    spoken_text: str | None = None
    locale: str | None = None
    voice: str | None = None


class PreparationInventory(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: int = PREPARATION_SCHEMA_VERSION
    input_manifest: str
    entries: tuple[PreparedAsset, ...]


def load_manifest(path: Path = MANIFEST_PATH) -> LearnerAssetManifest:
    return LearnerAssetManifest.model_validate_json(path.read_text(encoding="utf-8"))


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _svg_dimensions_and_content(source: Path, entry: AssetManifestEntry) -> tuple[int, int]:
    if not source.is_file() or source.stat().st_size == 0:
        raise PreparationError(f"missing/empty SVG source for {entry.semantic_key}")
    try:
        root = ET.parse(source).getroot()
    except ET.ParseError as exc:
        raise PreparationError(f"invalid SVG source for {entry.semantic_key}") from exc
    if not root.tag.endswith("svg"):
        raise PreparationError(f"source is not SVG for {entry.semantic_key}")
    view_box = root.attrib.get("viewBox", "").split()
    if len(view_box) != 4:
        raise PreparationError(f"SVG viewBox is required for {entry.semantic_key}")
    width, height = int(float(view_box[2])), int(float(view_box[3]))
    text = " ".join(value.strip() for value in root.itertext() if value.strip()).casefold()
    if entry.asset_role is AssetRole.COURSE_COVER:
        expected = (COURSE.title,)
    else:
        canonical = {identity: (word, translation) for identity, word, translation in VOCABULARY}[entry.content_identity]
        expected = canonical
    if not all(value.casefold() in text for value in expected):
        raise PreparationError(f"SVG semantic text mismatch for {entry.semantic_key}")
    return width, height


def _validate_png(path: Path, expected_size: tuple[int, int]) -> tuple[int, int]:
    try:
        with Image.open(path) as image:
            image.load()
            if image.format != "PNG":
                raise PreparationError(f"expected PNG, got {image.format}")
            if image.size != expected_size:
                raise PreparationError(f"PNG dimensions {image.size} do not match {expected_size}")
            return image.size
    except OSError as exc:
        raise PreparationError(f"invalid PNG artifact: {path}") from exc


def _validate_wav(path: Path) -> tuple[float, int, int]:
    try:
        with wave.open(str(path), "rb") as audio:
            channels = audio.getnchannels()
            sample_width = audio.getsampwidth()
            sample_rate = audio.getframerate()
            frame_count = audio.getnframes()
            frames = audio.readframes(frame_count)
    except (wave.Error, EOFError) as exc:
        raise PreparationError(f"invalid WAV artifact: {path}") from exc
    duration = frame_count / sample_rate if sample_rate else 0
    if channels not in {1, 2} or sample_width != 2 or not (0.25 <= duration <= 4.0):
        raise PreparationError(f"WAV technical validation failed: {path}")
    samples = array.array("h")
    samples.frombytes(frames)
    if not samples or max(abs(sample) for sample in samples) < 128:
        raise PreparationError(f"WAV is silent or empty: {path}")
    return duration, sample_rate, channels


def _previous_inventory(path: Path) -> dict[str, PreparedAsset]:
    if not path.is_file():
        return {}
    inventory = PreparationInventory.model_validate_json(path.read_text(encoding="utf-8"))
    return {entry.semantic_key: entry for entry in inventory.entries}


def _can_reuse(previous: PreparedAsset | None, output: Path, source_sha256: str | None) -> bool:
    return bool(
        previous
        and output.is_file()
        and previous.source_sha256 == source_sha256
        and previous.sha256 == _sha256(output)
        and previous.validation_status == "READY_FOR_UPLOAD"
    )


def _prepared_image(
    entry: AssetManifestEntry,
    root: Path,
    rasterizer: SvgRasterizer,
    previous: PreparedAsset | None,
    validate_only: bool,
) -> PreparedAsset:
    if not entry.source_path:
        raise PreparationError(f"image source provenance missing for {entry.semantic_key}")
    source = root / entry.source_path
    output = root / entry.output_path
    dimensions = _svg_dimensions_and_content(source, entry)
    source_sha = _sha256(source)
    if not _can_reuse(previous, output, source_sha):
        if validate_only:
            raise PreparationError(f"prepared image is missing/stale for {entry.semantic_key}")
        if output.exists():
            raise PreparationError(f"unowned/conflicting output exists for {entry.semantic_key}")
        rasterizer.rasterize(source, output, *dimensions)
    width, height = _validate_png(output, dimensions)
    return PreparedAsset(
        semantic_key=entry.semantic_key,
        content_identity=entry.content_identity,
        asset_role=entry.asset_role,
        media_type=entry.media_type.value,
        source_classification=entry.source_classification.value,
        source_path=entry.source_path,
        source_sha256=source_sha,
        output_path=entry.output_path,
        bucket=entry.bucket,
        object_path=entry.object_path,
        mime_type="image/png",
        byte_size=output.stat().st_size,
        sha256=_sha256(output),
        validation_status="READY_FOR_UPLOAD",
        technical_validation="TECHNICALLY_VALID",
        content_validation="CONTENT_VALIDATED",
        preparation_method=rasterizer.method,
        width=width,
        height=height,
    )


def _prepared_audio(
    entry: AssetManifestEntry,
    root: Path,
    generator: PronunciationGenerator,
    previous: PreparedAsset | None,
    validate_only: bool,
) -> PreparedAsset:
    canonical_text = {identity: word for identity, word, _ in VOCABULARY}[entry.content_identity]
    output = root / entry.output_path
    reusable = bool(
        _can_reuse(previous, output, None)
        and previous
        and previous.spoken_text == canonical_text
        and previous.locale == TTS_LOCALE
        and previous.voice == TTS_VOICE
    )
    if not reusable:
        if validate_only:
            raise PreparationError(f"prepared audio is missing/stale for {entry.semantic_key}")
        if output.exists():
            raise PreparationError(f"unowned/conflicting output exists for {entry.semantic_key}")
        generator.generate(canonical_text, output)
    duration, sample_rate, channels = _validate_wav(output)
    return PreparedAsset(
        semantic_key=entry.semantic_key,
        content_identity=entry.content_identity,
        asset_role=entry.asset_role,
        media_type=entry.media_type.value,
        source_classification="generated",
        source_path=None,
        source_sha256=None,
        output_path=entry.output_path,
        bucket=entry.bucket,
        object_path=entry.object_path,
        mime_type="audio/wav",
        byte_size=output.stat().st_size,
        sha256=_sha256(output),
        validation_status="READY_FOR_UPLOAD",
        technical_validation="TECHNICALLY_VALID",
        content_validation="CONTENT_VALIDATED",
        preparation_method=generator.method,
        duration_seconds=round(duration, 6),
        sample_rate=sample_rate,
        channels=channels,
        spoken_text=canonical_text,
        locale=TTS_LOCALE,
        voice=TTS_VOICE,
    )


def prepare_manifest(
    manifest: LearnerAssetManifest,
    root: Path = REPOSITORY_ROOT,
    generator: PronunciationGenerator | None = None,
    rasterizer: SvgRasterizer | None = None,
    preparation_path: Path = PREPARATION_PATH,
    validate_only: bool = False,
) -> PreparationInventory:
    if len(manifest.entries) != 11:
        raise PreparationError("LC9 accepts exactly the current 11-entry LC8 batch")
    previous = _previous_inventory(preparation_path)
    generator = generator or SystemSpeechPronunciationGenerator()
    rasterizer = rasterizer or ChromiumSvgRasterizer()
    prepared: list[PreparedAsset] = []
    for entry in manifest.entries:
        if entry.source_classification is SourceClassification.EXISTING_FILE:
            if entry.media_type.value != "image":
                raise PreparationError(f"unsupported existing-file media for {entry.semantic_key}")
            prepared.append(_prepared_image(entry, root, rasterizer, previous.get(entry.semantic_key), validate_only))
        elif entry.source_classification is SourceClassification.GENERATION_REQUIRED:
            if entry.asset_role is not AssetRole.PRONUNCIATION_AUDIO:
                raise PreparationError(f"unsupported generation requirement for {entry.semantic_key}")
            prepared.append(_prepared_audio(entry, root, generator, previous.get(entry.semantic_key), validate_only))
        else:
            raise PreparationError(f"unsupported source classification for {entry.semantic_key}")
    inventory = PreparationInventory(
        input_manifest=MANIFEST_PATH.relative_to(REPOSITORY_ROOT).as_posix(),
        entries=tuple(prepared),
    )
    if not validate_only:
        preparation_path.parent.mkdir(parents=True, exist_ok=True)
        preparation_path.write_text(
            json.dumps(inventory.model_dump(mode="json"), ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    return inventory


def dry_run(manifest: LearnerAssetManifest) -> list[str]:
    actions = []
    for entry in manifest.entries:
        action = "PREPARE_SVG_TO_PNG" if entry.source_classification is SourceClassification.EXISTING_FILE else "GENERATE_AUDIO"
        actions.append(f"{entry.semantic_key} -> {action} -> {entry.output_path}")
    return actions


def main() -> int:
    parser = argparse.ArgumentParser(description="Prepare/validate the 11 canonical LC9 Animals learner assets")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--validate", action="store_true")
    args = parser.parse_args()
    manifest = load_manifest()
    if args.dry_run:
        print("\n".join(dry_run(manifest)))
        return 0
    inventory = prepare_manifest(manifest, validate_only=args.validate)
    print(f"prepared={len(inventory.entries)} ready={sum(e.validation_status == 'READY_FOR_UPLOAD' for e in inventory.entries)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
