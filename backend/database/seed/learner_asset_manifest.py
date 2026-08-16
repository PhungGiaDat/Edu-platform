"""LC8 canonical learner asset manifest for the LC7 Animals batch.

The manifest is a repository artifact upstream of generation, upload, and
``media_assets`` persistence. Semantic requirements always come from LC7;
legacy filenames are inspected only as possible source artifacts.
"""

from __future__ import annotations

import argparse
import json
from enum import Enum
from pathlib import Path, PurePosixPath
from typing import Iterable, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from database.seed.canonical_animals import CONTENT_VERSION, COURSE_ID, VOCABULARY, asset_requirements
from models.asset_contract import AssetRole, asset_role_media_type, vocabulary_asset_key
from models.lesson_media import MediaType


SCHEMA_VERSION = 1
# The project uses one public application-asset bucket. Learner/AR separation
# is semantic and path-based; learner assets stay under ``courses/``.
BUCKET = "AR_models"
REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
MANIFEST_PATH = Path(__file__).with_name("manifests") / "animals_adventure_assets.json"


class SourceClassification(str, Enum):
    EXISTING_FILE = "existing_file"
    GENERATION_REQUIRED = "generation_required"
    MANUAL_REQUIRED = "manual_required"
    BLOCKED = "blocked"


class AssetManifestEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    semantic_key: str = Field(min_length=1)
    owner_type: Literal["course", "vocabulary"]
    content_identity: str = Field(min_length=1)
    asset_role: AssetRole
    media_type: MediaType
    source_classification: SourceClassification
    source_path: str | None = None
    output_path: str = Field(min_length=1)
    bucket: str = Field(min_length=1)
    object_path: str = Field(min_length=1)
    consumers: tuple[str, ...] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_contract(self) -> "AssetManifestEntry":
        if self.media_type is not asset_role_media_type(self.asset_role):
            raise ValueError(f"{self.asset_role.value} is incompatible with {self.media_type.value}")
        expected_key = manifest_semantic_key(self.content_identity, self.asset_role)
        if self.semantic_key != expected_key:
            raise ValueError("semantic_key must be derived from content identity and asset role")
        if self.owner_type == "course" and self.asset_role is not AssetRole.COURSE_COVER:
            raise ValueError("only course_cover may be owned by the Course in this batch")
        if self.owner_type == "vocabulary" and self.asset_role not in {
            AssetRole.VOCABULARY_ILLUSTRATION,
            AssetRole.PRONUNCIATION_AUDIO,
        }:
            raise ValueError("unsupported vocabulary role in the current LC7 batch")
        for value in (self.source_path, self.output_path, self.object_path):
            if value is not None:
                _validate_relative_path(value)
        if self.source_classification is SourceClassification.EXISTING_FILE and not self.source_path:
            raise ValueError("existing_file requires a repository-relative source_path")
        if self.source_classification is not SourceClassification.EXISTING_FILE and self.source_path:
            raise ValueError("non-existing source classifications cannot claim a source_path")
        return self


class LearnerAssetManifest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal[1] = SCHEMA_VERSION
    content_batch: str = Field(min_length=1)
    content_version: int = Field(gt=0)
    entries: tuple[AssetManifestEntry, ...]

    @model_validator(mode="after")
    def validate_manifest(self) -> "LearnerAssetManifest":
        semantic_keys = [entry.semantic_key for entry in self.entries]
        if len(semantic_keys) != len(set(semantic_keys)):
            raise ValueError("duplicate semantic keys")
        object_paths = [entry.object_path for entry in self.entries]
        if len(object_paths) != len(set(object_paths)):
            raise ValueError("object path collision")
        output_paths = [entry.output_path for entry in self.entries]
        if len(output_paths) != len(set(output_paths)):
            raise ValueError("output path collision")
        if semantic_keys != sorted(semantic_keys):
            raise ValueError("entries must use stable semantic-key ordering")
        return self


def _validate_relative_path(value: str) -> None:
    path = PurePosixPath(value)
    if not value or "\\" in value or path.is_absolute() or ".." in path.parts:
        raise ValueError(f"manifest paths must be normalized repository/object-relative paths: {value}")
    if len(path.parts) > 0 and ":" in path.parts[0]:
        raise ValueError("developer absolute paths are forbidden")


def manifest_semantic_key(content_identity: str, role: AssetRole) -> str:
    if role is AssetRole.COURSE_COVER:
        return f"course:{content_identity}:{role.value}"
    return vocabulary_asset_key(content_identity, role)


def collect_asset_requirements(
    requirements: Iterable[tuple[str, AssetRole]],
) -> tuple[tuple[str, AssetRole], ...]:
    """Collapse repeated consumers to one canonical semantic requirement."""
    unique = {(content_identity, role) for content_identity, role in requirements}
    return tuple(sorted(unique, key=lambda item: manifest_semantic_key(*item)))


def _legacy_candidate(content_identity: str, role: AssetRole) -> str | None:
    """Locate known legacy sources after semantics have already been resolved."""
    if role is AssetRole.COURSE_COVER:
        return "frontend-web/public/assets/animals/course-cover.svg"
    if role is AssetRole.VOCABULARY_ILLUSTRATION:
        word_by_id = {vocabulary_id: word.lower() for vocabulary_id, word, _ in VOCABULARY}
        word = word_by_id[content_identity]
        return f"frontend-web/public/assets/animals/mascots/{word}-vocab.svg"
    return None


def _format_for(role: AssetRole) -> str:
    return "wav" if asset_role_media_type(role) is MediaType.AUDIO else "png"


def _destination(content_identity: str, role: AssetRole) -> tuple[str, str]:
    extension = _format_for(role)
    if role is AssetRole.COURSE_COVER:
        object_path = f"courses/{COURSE_ID}/course/course-cover.{extension}"
    else:
        object_path = f"courses/{COURSE_ID}/vocabulary/{content_identity}/{role.value}.{extension}"
    return f"backend/generated/learnar-assets/{object_path}", object_path


def _consumers(role: AssetRole) -> tuple[str, ...]:
    return {
        AssetRole.COURSE_COVER: ("course_card", "course_detail"),
        AssetRole.VOCABULARY_ILLUSTRATION: ("learn_vocabulary", "memory_match"),
        AssetRole.PRONUNCIATION_AUDIO: ("learn_vocabulary", "pronunciation"),
    }[role]


def build_animals_asset_manifest(repository_root: Path = REPOSITORY_ROOT) -> LearnerAssetManifest:
    entries: list[AssetManifestEntry] = []
    for content_identity, role in collect_asset_requirements(asset_requirements()):
        candidate = _legacy_candidate(content_identity, role)
        candidate_exists = bool(candidate and (repository_root / candidate).is_file())
        generated_path, object_path = _destination(content_identity, role)
        source_path = candidate if candidate_exists else None
        entries.append(
            AssetManifestEntry(
                semantic_key=manifest_semantic_key(content_identity, role),
                owner_type="course" if role is AssetRole.COURSE_COVER else "vocabulary",
                content_identity=content_identity,
                asset_role=role,
                media_type=asset_role_media_type(role),
                source_classification=(
                    SourceClassification.EXISTING_FILE
                    if candidate_exists
                    else SourceClassification.GENERATION_REQUIRED
                ),
                source_path=source_path,
                output_path=generated_path,
                bucket=BUCKET,
                object_path=object_path,
                consumers=_consumers(role),
            )
        )
    return LearnerAssetManifest(
        content_batch=COURSE_ID,
        content_version=CONTENT_VERSION,
        entries=tuple(entries),
    )


def render_manifest_json(manifest: LearnerAssetManifest | None = None) -> str:
    manifest = manifest or build_animals_asset_manifest()
    return json.dumps(manifest.model_dump(mode="json"), ensure_ascii=False, indent=2) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Build/check the canonical LC8 Animals learner asset manifest")
    parser.add_argument("--check", action="store_true", help="fail if committed manifest differs from canonical output")
    parser.add_argument("--write", action="store_true", help="write the deterministic repository manifest")
    args = parser.parse_args()
    rendered = render_manifest_json()
    if args.check:
        if not MANIFEST_PATH.is_file() or MANIFEST_PATH.read_text(encoding="utf-8") != rendered:
            raise SystemExit("committed manifest is not the canonical deterministic output")
        return 0
    if args.write:
        MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
        MANIFEST_PATH.write_text(rendered, encoding="utf-8")
        return 0
    print(rendered, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
