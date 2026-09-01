"""Validate locally staged Momo originals and write metadata-only readiness.

This module never copies binaries into the repository, database, or API
server.  The input root is an operator-owned temporary staging directory; the
result is a metadata inventory for the later explicit Supabase publish task.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import wave
import xml.etree.ElementTree as ET
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field

from database.seed.momo_content_media_manifest import (
    MANIFEST_PATH,
    STORYBOARD_PATH,
    MomoContentMediaEntry,
    MomoContentMediaManifest,
    MomoLessonStoryboard,
    load_momo_lesson_storyboard,
    build_momo_content_media_manifest,
)


PREPARATION_PATH = MANIFEST_PATH.with_name("momo_content_media_assets.prepared.json")


class MomoPreparationError(RuntimeError):
    pass


class PreparedMomoAsset(BaseModel):
    model_config = ConfigDict(extra="forbid")

    semantic_key: str
    bucket: str
    object_path: str
    mime_type: str
    byte_size: int = Field(gt=0)
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    validation_status: str = "READY_FOR_UPLOAD"
    technical_validation: str = "TECHNICALLY_VALID"
    local_source_path: None = None


class MomoPreparationInventory(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: int = 1
    input_manifest: str = MANIFEST_PATH.name
    input_storyboard: str = STORYBOARD_PATH.name
    entries: tuple[PreparedMomoAsset, ...]


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _source_file(staging_root: Path, entry: MomoContentMediaEntry) -> Path:
    return staging_root / Path(*entry.object_path.split("/"))


def _validate_svg(source: Path) -> None:
    try:
        root = ET.parse(source).getroot()
    except ET.ParseError as exc:
        raise MomoPreparationError(f"invalid SVG artifact: {source.name}") from exc
    if not root.tag.endswith("svg") or not root.attrib.get("viewBox"):
        raise MomoPreparationError(f"SVG technical validation failed: {source.name}")


def _validate_wav(source: Path) -> None:
    try:
        with wave.open(str(source), "rb") as audio:
            if audio.getnframes() <= 0 or audio.getframerate() <= 0:
                raise MomoPreparationError(f"WAV technical validation failed: {source.name}")
    except (wave.Error, EOFError) as exc:
        raise MomoPreparationError(f"invalid WAV artifact: {source.name}") from exc


def _validate_mp4(source: Path) -> None:
    if source.stat().st_size < 1024 or b"ftyp" not in source.read_bytes()[:64]:
        raise MomoPreparationError(f"video production artifact is required for {source.name}")


def _validate_source(entry: MomoContentMediaEntry, source: Path) -> None:
    if not source.is_file() or source.stat().st_size == 0:
        if entry.role == "lesson_video":
            raise MomoPreparationError(f"video production artifact is required for {entry.semantic_key}")
        raise MomoPreparationError(f"staged original is missing for {entry.semantic_key}")
    if "placeholder" in source.name.casefold():
        raise MomoPreparationError(f"generic placeholder cannot satisfy {entry.semantic_key}")
    suffix = source.suffix.casefold()
    if suffix == ".svg":
        _validate_svg(source)
    elif suffix == ".wav":
        _validate_wav(source)
    elif suffix == ".mp4":
        _validate_mp4(source)
    else:
        raise MomoPreparationError(f"unsupported staged artifact extension: {source.name}")


def prepare_momo_manifest(
    manifest: MomoContentMediaManifest,
    storyboard: MomoLessonStoryboard,
    staging_root: Path,
    preparation_path: Path = PREPARATION_PATH,
) -> MomoPreparationInventory:
    storyboard_by_key = {entry.semantic_key: entry for entry in storyboard.entries}
    if set(storyboard_by_key) != {entry.semantic_key for entry in manifest.entries}:
        raise MomoPreparationError("storyboard coverage must match the media manifest")
    prepared: list[PreparedMomoAsset] = []
    for entry in manifest.entries:
        approval = storyboard_by_key[entry.semantic_key]
        if approval.approval_status != "approved":
            raise MomoPreparationError(f"approval required for {entry.semantic_key}")
        source = _source_file(staging_root, entry)
        _validate_source(entry, source)
        prepared.append(PreparedMomoAsset(
            semantic_key=entry.semantic_key,
            bucket=entry.bucket,
            object_path=entry.object_path,
            mime_type=entry.mime_type,
            byte_size=source.stat().st_size,
            sha256=_sha256(source),
        ))
    inventory = MomoPreparationInventory(entries=tuple(prepared))
    preparation_path.parent.mkdir(parents=True, exist_ok=True)
    preparation_path.write_text(json.dumps(inventory.model_dump(mode="json"), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return inventory


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate locally staged approved Momo originals without uploading them")
    parser.add_argument("--staging-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=PREPARATION_PATH)
    args = parser.parse_args()
    inventory = prepare_momo_manifest(build_momo_content_media_manifest(), load_momo_lesson_storyboard(), args.staging_root, args.output)
    print(f"prepared={len(inventory.entries)} ready={len(inventory.entries)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
