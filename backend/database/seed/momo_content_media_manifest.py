"""Deterministic, source-only media inventory for the approved Momo catalog.

This module never connects to PostgreSQL or Supabase.  It records authored
``pending`` references as readiness work; it does not claim that an object has
been generated or published.
"""

from __future__ import annotations

import argparse
import json
from collections.abc import Iterator
from pathlib import Path, PurePosixPath
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


SEED_ROOT = Path(__file__).resolve().parents[2] / "seeds" / "courses"
MANIFEST_PATH = Path(__file__).with_name("manifests") / "momo_content_media_assets.json"
STORYBOARD_PATH = Path(__file__).with_name("manifests") / "momo_content_media_storyboard.json"
SOURCE_FILES = (
    ("momo_home_family.json", "home_family"),
    ("momo_nature.json", "nature"),
    ("momo_school_food.json", "school_food"),
)
MIME_TYPES = {
    "svg": "image/svg+xml",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "wav": "audio/wav",
    "mp3": "audio/mpeg",
    "mp4": "video/mp4",
}


class MomoLessonMedia(BaseModel):
    model_config = ConfigDict(extra="forbid")

    course_id: str = Field(min_length=1)
    lesson_id: str = Field(min_length=1)
    category: Literal["home_family", "nature", "school_food"]


class MomoContentMediaEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    semantic_key: str = Field(min_length=1)
    course_id: str = Field(min_length=1)
    lesson_id: str | None = None
    role: str = Field(min_length=1)
    media_type: Literal["image", "audio", "video", "sticker"]
    mime_type: str = Field(min_length=1)
    bucket: Literal["learnar-assets"]
    object_path: str = Field(min_length=1)
    status: Literal["pending"]
    consumers: tuple[str, ...] = Field(min_length=1)
    question_bindings: tuple[str, ...] = ()

    @model_validator(mode="after")
    def validate_path_and_key(self) -> "MomoContentMediaEntry":
        path = PurePosixPath(self.object_path)
        if "\\" in self.object_path or path.is_absolute() or ".." in path.parts:
            raise ValueError("object path must be normalized and relative")
        if not self.object_path.startswith(f"courses/{self.course_id}/"):
            raise ValueError("Momo object path must stay under its stable course prefix")
        if self.semantic_key != f"{self.course_id}:{self.object_path}":
            raise ValueError("semantic key must be derived from stable course ID and object path")
        if self.question_bindings and self.role != "quiz_illustration":
            raise ValueError("question binding is only supported for quiz illustrations")
        return self


class MomoContentMediaManifest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal[1] = 1
    source_only: Literal[True] = True
    course_ids: tuple[str, ...]
    lessons: tuple[MomoLessonMedia, ...]
    question_ids: tuple[str, ...]
    entries: tuple[MomoContentMediaEntry, ...]

    @model_validator(mode="after")
    def validate_catalog(self) -> "MomoContentMediaManifest":
        if self.course_ids != tuple(sorted(self.course_ids)):
            raise ValueError("course IDs must use stable ordering")
        lesson_keys = [(lesson.course_id, lesson.lesson_id) for lesson in self.lessons]
        if len(lesson_keys) != len(set(lesson_keys)):
            raise ValueError("duplicate lesson identity")
        object_paths = [entry.object_path for entry in self.entries]
        if len(object_paths) != len(set(object_paths)):
            raise ValueError("object path collision")
        keys = [entry.semantic_key for entry in self.entries]
        if keys != sorted(keys):
            raise ValueError("entries must use stable semantic-key ordering")
        known_questions = set(self.question_ids)
        for entry in self.entries:
            if not set(entry.question_bindings).issubset(known_questions):
                raise ValueError("unknown question binding")
        return self


class MomoStoryboardEntry(BaseModel):
    """One review decision for one pending Momo media object."""

    model_config = ConfigDict(extra="forbid")

    semantic_key: str = Field(min_length=1)
    course_id: str = Field(min_length=1)
    lesson_id: str | None = None
    asset_role: str = Field(min_length=1)
    learner_purpose: str = Field(min_length=1)
    expected_mime: str = Field(min_length=1)
    source_priority: tuple[
        Literal["original_required", "approved_existing", "external_licensed"],
        Literal["approved_existing", "external_licensed"],
        Literal["external_licensed"],
    ] = ("original_required", "approved_existing", "external_licensed")
    source_strategy: Literal["original_required", "approved_existing", "external_licensed", "video_production_required"]
    source_license_evidence: str | None = None
    approval_status: Literal["pending_user_approval", "approved"] = "pending_user_approval"

    @model_validator(mode="after")
    def validate_source_evidence(self) -> "MomoStoryboardEntry":
        if self.source_strategy in {"approved_existing", "external_licensed"} and not self.source_license_evidence:
            raise ValueError("license evidence is required for non-original media")
        if self.asset_role == "lesson_video" and self.source_strategy not in {"video_production_required", "external_licensed"}:
            raise ValueError("lesson video requires production or licensed external evidence")
        return self


class MomoLessonStoryboard(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal[1] = 1
    source_manifest: str = MANIFEST_PATH.name
    entries: tuple[MomoStoryboardEntry, ...]

    @model_validator(mode="after")
    def validate_entries(self) -> "MomoLessonStoryboard":
        keys = [entry.semantic_key for entry in self.entries]
        if len(keys) != len(set(keys)):
            raise ValueError("duplicate storyboard semantic key")
        if keys != sorted(keys):
            raise ValueError("storyboard entries must use stable semantic-key ordering")
        return self

    @property
    def lesson_keys(self) -> tuple[tuple[str, str], ...]:
        return tuple(sorted({(entry.course_id, entry.lesson_id) for entry in self.entries if entry.lesson_id is not None}))


def _walk_media(value: Any, trail: tuple[str, ...] = (), question_id: str | None = None) -> Iterator[tuple[dict[str, Any], tuple[str, ...], str | None]]:
    if isinstance(value, dict):
        active_question = value.get("question_id", question_id)
        if {"bucket", "path", "type", "status"}.issubset(value):
            yield value, trail, active_question
        for key, child in value.items():
            if key not in {"bucket", "path", "type", "status"}:
                yield from _walk_media(child, (*trail, key), active_question)
    elif isinstance(value, list):
        for child in value:
            yield from _walk_media(child, trail, question_id)


def _role_for(path: str, media_type: str, trail: tuple[str, ...], question_id: str | None) -> str:
    context = set(trail)
    if question_id:
        return "quiz_illustration"
    if media_type == "video" or path.endswith("/video.mp4"):
        return "lesson_video"
    if "thumbnail" in context or path.endswith(("/thumb.svg", "/thumb.png")):
        return "course_thumbnail" if "thumbnail" in context and "lessons" not in context else "lesson_thumbnail"
    if "scenes" in context:
        return "scene_illustration"
    if "vocabulary" in context:
        return "vocabulary_audio" if media_type == "audio" else "vocabulary_illustration"
    if "pronunciation" in context:
        return "pronunciation_audio" if media_type == "audio" else "pronunciation_illustration"
    if "readAloudStory" in context:
        return "read_audio" if media_type == "audio" else "read_illustration"
    if "game" in context or "activity" in context:
        return "activity_illustration"
    if "reward" in context:
        return "reward_sticker" if media_type == "sticker" else "reward_illustration"
    return "authored_audio" if media_type == "audio" else "authored_illustration"


def _mime_for(path: str) -> str:
    mime_type = MIME_TYPES.get(PurePosixPath(path).suffix.removeprefix(".").lower())
    if not mime_type:
        raise ValueError(f"unsupported Momo media extension: {path}")
    return mime_type


def build_momo_content_media_manifest() -> MomoContentMediaManifest:
    lessons: list[MomoLessonMedia] = []
    question_ids: set[str] = set()
    collected: dict[str, dict[str, Any]] = {}
    course_ids: list[str] = []
    for source_file, category in SOURCE_FILES:
        course = json.loads((SEED_ROOT / source_file).read_text(encoding="utf-8"))
        course_id = course["course_id"]
        course_ids.append(course_id)
        for asset, trail, question_id in _walk_media(course):
            if asset["bucket"] != "learnar-assets" or asset["status"] != "pending":
                raise ValueError(f"Momo source asset must remain pending in learnar-assets: {asset}")
            object_path, media_type = asset["path"], asset["type"]
            if media_type not in {"image", "audio", "video", "sticker"}:
                raise ValueError(f"unsupported Momo media type: {media_type}")
            role = _role_for(object_path, media_type, trail, question_id)
            consumer = ".".join(trail)
            existing = collected.setdefault(object_path, {
                "semantic_key": f"{course_id}:{object_path}", "course_id": course_id,
                "lesson_id": None, "role": role, "media_type": media_type,
                "mime_type": _mime_for(object_path), "bucket": asset["bucket"],
                "object_path": object_path, "status": asset["status"], "consumers": set(), "question_bindings": set(),
            })
            if existing["course_id"] != course_id or existing["media_type"] != media_type:
                raise ValueError(f"conflicting Momo asset definition: {object_path}")
            existing["consumers"].add(consumer)
            if question_id:
                existing["question_bindings"].add(question_id)
        for lesson in course["lessons"]:
            lesson_id = lesson["lesson_id"]
            lessons.append(MomoLessonMedia(course_id=course_id, lesson_id=lesson_id, category=category))
            question_ids.update(question["question_id"] for question in lesson["quiz"])
            prefix = f"courses/{course_id}/lessons/{lesson_id}/"
            for path, entry in collected.items():
                if path.startswith(prefix):
                    entry["lesson_id"] = lesson_id
    entries = tuple(
        MomoContentMediaEntry(**{**entry, "consumers": tuple(sorted(entry["consumers"])), "question_bindings": tuple(sorted(entry["question_bindings"]))})
        for _, entry in sorted(collected.items(), key=lambda item: item[1]["semantic_key"])
    )
    return MomoContentMediaManifest(
        course_ids=tuple(sorted(course_ids)), lessons=tuple(sorted(lessons, key=lambda item: (item.course_id, item.lesson_id))),
        question_ids=tuple(sorted(question_ids)), entries=entries,
    )


def render_manifest_json(manifest: MomoContentMediaManifest | None = None) -> str:
    return json.dumps((manifest or build_momo_content_media_manifest()).model_dump(mode="json"), ensure_ascii=False, indent=2) + "\n"


def _learner_purpose(entry: MomoContentMediaEntry) -> str:
    return {
        "course_thumbnail": "Giúp bé và phụ huynh nhận ra chủ đề khóa học.",
        "lesson_thumbnail": "Cho bé nhận ra bài học trước khi bắt đầu.",
        "lesson_video": "Dẫn dắt bài học bằng video ngắn có Momo đồng hành.",
        "scene_illustration": "Minh họa trực quan cho từng cảnh học.",
        "vocabulary_illustration": "Neo nghĩa của từ mới bằng hình ảnh rõ ràng.",
        "vocabulary_audio": "Cho bé nghe mẫu phát âm của từ mới.",
        "pronunciation_audio": "Cho bé nghe mẫu trước khi nói theo.",
        "activity_illustration": "Hỗ trợ thao tác chạm, ghép hoặc chọn đáp án.",
        "quiz_illustration": "Tạo đáp án trực quan cho câu hỏi kiểm tra.",
        "read_illustration": "Minh họa trang đọc ngắn cùng Momo.",
        "read_audio": "Cung cấp mẫu nghe cho trang đọc ngắn.",
        "reward_sticker": "Ghi nhận hoàn thành bài học bằng sticker.",
    }[entry.role]


def build_momo_lesson_storyboard(manifest: MomoContentMediaManifest | None = None) -> MomoLessonStoryboard:
    manifest = manifest or build_momo_content_media_manifest()
    entries = tuple(
        MomoStoryboardEntry(
            semantic_key=entry.semantic_key,
            course_id=entry.course_id,
            lesson_id=entry.lesson_id,
            asset_role=entry.role,
            learner_purpose=_learner_purpose(entry),
            expected_mime=entry.mime_type,
            source_strategy="video_production_required" if entry.role == "lesson_video" else "original_required",
        )
        for entry in manifest.entries
    )
    return MomoLessonStoryboard(entries=entries)


def render_storyboard_json(storyboard: MomoLessonStoryboard | None = None) -> str:
    return json.dumps((storyboard or build_momo_lesson_storyboard()).model_dump(mode="json"), ensure_ascii=False, indent=2) + "\n"


def approve_momo_lesson_storyboard(storyboard: MomoLessonStoryboard | None = None) -> MomoLessonStoryboard:
    """Record the user's approved hybrid sourcing policy, never asset readiness."""
    storyboard = storyboard or build_momo_lesson_storyboard()
    return MomoLessonStoryboard(
        entries=tuple(entry.model_copy(update={"approval_status": "approved"}) for entry in storyboard.entries),
    )


def load_momo_lesson_storyboard(path: Path = STORYBOARD_PATH) -> MomoLessonStoryboard:
    return MomoLessonStoryboard.model_validate_json(path.read_text(encoding="utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(description="Build/check the source-only Momo content media manifest")
    parser.add_argument("--check", action="store_true", help="fail if committed manifest differs from canonical output")
    parser.add_argument("--write", action="store_true", help="write the deterministic repository manifest")
    parser.add_argument("--check-storyboard", action="store_true", help="fail if committed storyboard differs from canonical output")
    parser.add_argument("--write-storyboard", action="store_true", help="write the deterministic review storyboard")
    parser.add_argument("--approve-storyboard", action="store_true", help="record approved sourcing policy in the storyboard")
    args = parser.parse_args()
    rendered = render_manifest_json()
    if args.check:
        if not MANIFEST_PATH.is_file() or MANIFEST_PATH.read_text(encoding="utf-8") != rendered:
            raise SystemExit("committed manifest is not the canonical deterministic output")
        return 0
    if args.write:
        MANIFEST_PATH.write_text(rendered, encoding="utf-8")
        return 0
    storyboard = approve_momo_lesson_storyboard() if args.approve_storyboard else build_momo_lesson_storyboard()
    storyboard_rendered = render_storyboard_json(storyboard)
    if args.check_storyboard:
        if not STORYBOARD_PATH.is_file() or STORYBOARD_PATH.read_text(encoding="utf-8") != storyboard_rendered:
            raise SystemExit("committed storyboard is not the canonical deterministic output")
        return 0
    if args.write_storyboard:
        STORYBOARD_PATH.write_text(storyboard_rendered, encoding="utf-8")
        return 0
    if args.approve_storyboard:
        STORYBOARD_PATH.write_text(storyboard_rendered, encoding="utf-8")
        return 0
    print(rendered, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
