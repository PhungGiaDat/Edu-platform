"""Deterministic, source-only media inventory for the approved Momo catalog.

This module never connects to PostgreSQL or Supabase.  It records authored
``pending`` references as readiness work; it does not claim that an object has
been generated or published.
"""

from __future__ import annotations

import argparse
import json
import re
from collections.abc import Iterator
from pathlib import Path, PurePosixPath
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


SEED_ROOT = Path(__file__).resolve().parents[2] / "seeds" / "courses"
MANIFEST_PATH = Path(__file__).with_name("manifests") / "momo_content_media_assets.json"
STORYBOARD_PATH = Path(__file__).with_name("manifests") / "momo_content_media_storyboard.json"
COURSE_VIDEO_SOURCES_PATH = Path(__file__).with_name("manifests") / "momo_course_video_sources.json"
COURSE_VIDEO_STORYBOARDS_PATH = Path(__file__).with_name("manifests") / "momo_course_video_storyboards.json"
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


class MomoCourseVideoSource(BaseModel):
    """Metadata only for a voluntary Course Details video; never binary media."""

    model_config = ConfigDict(extra="forbid")

    course_id: str = Field(min_length=1)
    slot: Literal["trailer", "explore_more"]
    provider: Literal["supabase", "youtube"]
    provider_id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    age_range: Literal["5-7"]
    learning_objective: str = Field(min_length=1)
    duration_seconds: int = Field(ge=1, le=180)
    poster_object_path: str = Field(min_length=1)
    captions_or_transcript: str = Field(min_length=1)
    approval_status: Literal["pending_production", "approved"]
    source_license_evidence: str | None = None

    @model_validator(mode="after")
    def validate_provider_policy(self) -> "MomoCourseVideoSource":
        expected_prefix = f"courses/{self.course_id}/"
        if not self.poster_object_path.startswith(expected_prefix):
            raise ValueError("video poster must stay under its stable course prefix")
        if self.provider == "supabase":
            path = PurePosixPath(self.provider_id)
            if "\\" in self.provider_id or path.is_absolute() or ".." in path.parts:
                raise ValueError("Supabase provider ID must be a normalized relative object path")
            if not self.provider_id.startswith(expected_prefix) or not self.provider_id.endswith(".mp4"):
                raise ValueError("Supabase provider ID must be an MP4 under its stable course prefix")
        else:
            if not re.fullmatch(r"[A-Za-z0-9_-]{11}", self.provider_id):
                raise ValueError("YouTube provider ID must be an 11-character video ID, not a URL")
            if self.approval_status != "approved":
                raise ValueError("YouTube video requires approved source status")
        if self.slot == "trailer" and self.provider != "supabase":
            raise ValueError("course trailer must be original Supabase media")
        if not self.source_license_evidence:
            raise ValueError("license evidence is required for every course video source")
        return self


class MomoCourseVideoSourceManifest(BaseModel):
    """Stable allow-list for Course Details video providers and IDs."""

    model_config = ConfigDict(extra="forbid")

    schema_version: Literal[1] = 1
    source_only: Literal[True] = True
    course_ids: tuple[str, ...]
    entries: tuple[MomoCourseVideoSource, ...]

    @model_validator(mode="after")
    def validate_catalog(self) -> "MomoCourseVideoSourceManifest":
        if self.course_ids != tuple(sorted(self.course_ids)):
            raise ValueError("course IDs must use stable ordering")
        known_course_ids = set(self.course_ids)
        if {entry.course_id for entry in self.entries} != known_course_ids:
            raise ValueError("course video sources must cover exactly the stable courses")
        if any(entry.course_id not in known_course_ids for entry in self.entries):
            raise ValueError("unknown course video source")
        trailers = [entry for entry in self.entries if entry.slot == "trailer"]
        if len(trailers) != len(self.course_ids) or {entry.course_id for entry in trailers} != known_course_ids:
            raise ValueError("each stable course requires exactly one trailer")
        for course_id in self.course_ids:
            if sum(entry.course_id == course_id and entry.slot == "explore_more" for entry in self.entries) > 3:
                raise ValueError("a course may have at most three explore-more videos")
        identities = [(entry.course_id, entry.slot, entry.provider, entry.provider_id) for entry in self.entries]
        if len(identities) != len(set(identities)):
            raise ValueError("duplicate course video source")
        return self


class MomoCourseVideoBeat(BaseModel):
    """One timed, child-safe beat in an approved trailer production brief."""

    model_config = ConfigDict(extra="forbid")

    start_second: int = Field(ge=0, lt=45)
    end_second: int = Field(gt=0, le=45)
    purpose: Literal["lexi_greeting", "words_in_context", "observation_prompt", "spoken_recap", "start_invitation"]
    visual_direction: str = Field(min_length=1)
    on_screen_copy_vi: str = Field(min_length=1)
    lexi_audio_cue: Literal["welcome_chirp", "word_sparkle", "thinking_pop", "practice_cheer", "start_twinkle"]
    word_audio: tuple[str, ...] = ()
    interaction_prompt: str | None = None

    @model_validator(mode="after")
    def validate_duration(self) -> "MomoCourseVideoBeat":
        if self.end_second <= self.start_second:
            raise ValueError("video beat must have a positive duration")
        if self.purpose == "observation_prompt" and not self.interaction_prompt:
            raise ValueError("observation beat requires a child prompt")
        expected_cue = {
            "lexi_greeting": "welcome_chirp",
            "words_in_context": "word_sparkle",
            "observation_prompt": "thinking_pop",
            "spoken_recap": "practice_cheer",
            "start_invitation": "start_twinkle",
        }[self.purpose]
        if self.lexi_audio_cue != expected_cue:
            raise ValueError("video beat must use the approved non-verbal Lexi cue")
        if self.purpose == "words_in_context" and len(self.word_audio) != 3:
            raise ValueError("words-in-context beat requires exactly three optional word-audio entries")
        if self.purpose != "words_in_context" and self.word_audio:
            raise ValueError("only words-in-context beat may provide optional word audio")
        if any(not word.islower() or any(character.isspace() for character in word) for word in self.word_audio):
            raise ValueError("word audio entries must be individual lower-case English words")
        return self


class MomoCourseVideoStoryboard(BaseModel):
    """Production brief, never proof that the referenced video object exists."""

    model_config = ConfigDict(extra="forbid")

    course_id: str = Field(min_length=1)
    provider_id: str = Field(min_length=1)
    approval_status: Literal["approved_nonverbal_brief"] = "approved_nonverbal_brief"
    beats: tuple[MomoCourseVideoBeat, ...] = Field(min_length=5, max_length=5)

    @model_validator(mode="after")
    def validate_timeline(self) -> "MomoCourseVideoStoryboard":
        expected_purposes = (
            "lexi_greeting",
            "words_in_context",
            "observation_prompt",
            "spoken_recap",
            "start_invitation",
        )
        if tuple(beat.purpose for beat in self.beats) != expected_purposes:
            raise ValueError("trailer beats must follow the approved five-part flow")
        if self.beats[0].start_second != 0 or self.beats[-1].end_second != 45:
            raise ValueError("trailer storyboard must cover exactly 45 seconds")
        if any(previous.end_second != current.start_second for previous, current in zip(self.beats, self.beats[1:])):
            raise ValueError("trailer beats must be continuous without gaps or overlaps")
        return self


class MomoCourseVideoStoryboardManifest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal[1] = 1
    source_only: Literal[True] = True
    source_video_manifest: str = COURSE_VIDEO_SOURCES_PATH.name
    course_ids: tuple[str, ...]
    entries: tuple[MomoCourseVideoStoryboard, ...]

    @model_validator(mode="after")
    def validate_catalog(self) -> "MomoCourseVideoStoryboardManifest":
        if self.course_ids != tuple(sorted(self.course_ids)):
            raise ValueError("course IDs must use stable ordering")
        if tuple(entry.course_id for entry in self.entries) != self.course_ids:
            raise ValueError("storyboards must have one stable-ordered entry per course")
        provider_ids = [entry.provider_id for entry in self.entries]
        if len(provider_ids) != len(set(provider_ids)):
            raise ValueError("duplicate trailer provider ID")
        return self


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
            # Course Details trailer has its own verified Supabase publication
            # pipeline and may already be ready in AR_models.  This manifest
            # owns only pending lesson-content media in learnar-assets.
            if trail and trail[0] == "courseTrailer":
                continue
            if asset["bucket"] != "learnar-assets" or asset["status"] not in {"pending", "ready"}:
                raise ValueError(f"Momo source asset must use learnar-assets and a known status: {asset}")
            if asset["status"] == "ready":
                continue
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


_COURSE_VIDEO_BRIEFS = {
    "momo-home-family-english-5-7": (
        "Cùng Lexi khám phá ngôi nhà",
        "Giới thiệu từ vựng về gia đình và ngôi nhà bằng tình huống gần gũi.",
        "Chào con! Cùng Lexi khám phá gia đình và ngôi nhà nhé.",
    ),
    "momo-nature-english-5-7": (
        "Cùng Lexi khám phá thiên nhiên",
        "Gợi hứng thú gọi tên con vật và cảnh vật thiên nhiên quen thuộc.",
        "Chào con! Cùng Lexi khám phá thiên nhiên nhé.",
    ),
    "momo-school-food-english-5-7": (
        "Cùng Lexi đến trường",
        "Gợi hứng thú học từ vựng lớp học và đồ ăn qua ngày vui ở trường.",
        "Chào con! Cùng Lexi đến trường nhé.",
    ),
}

_COURSE_TRAILER_BEATS = {
    "momo-home-family-english-5-7": (
        (0, 5, "lexi_greeting", "Lexi mở cánh cửa căn nhà ấm áp, vẫy tay cạnh gia đình thân thiện.", "Cùng khám phá ngôi nhà nhé!", "welcome_chirp", (), None),
        (5, 17, "words_in_context", "Lexi chỉ lần lượt vào ngôi nhà, gia đình và mẹ trong cùng một cảnh bình tĩnh.", "Nhìn ba từ mới nào!", "word_sparkle", ("home", "family", "mother"), None),
        (17, 27, "observation_prompt", "Lexi dừng cạnh cảnh bếp gia đình, giữ khung hình đủ lâu để bé quan sát.", "Con thấy ai trong ngôi nhà?", "thinking_pop", (), "Con thấy mẹ hay gia đình nào?"),
        (27, 37, "spoken_recap", "Ba thẻ từ mềm mại xuất hiện lần lượt, không chớp nháy hoặc chuyển cảnh nhanh.", "Cùng nhìn lại ba từ nhé!", "practice_cheer", (), None),
        (37, 45, "start_invitation", "Lexi chỉ vào nút bắt đầu ở khung cuối cùng, với ánh sao nhẹ nhàng.", "Mình bắt đầu nhé!", "start_twinkle", (), None),
    ),
    "momo-nature-english-5-7": (
        (0, 5, "lexi_greeting", "Lexi chào bé trong khu vườn sáng dịu, có cây và ao nhỏ.", "Cùng khám phá thiên nhiên nhé!", "welcome_chirp", (), None),
        (5, 17, "words_in_context", "Một chú chim, thỏ và cá lần lượt được Lexi chỉ trong cùng bối cảnh thiên nhiên.", "Nhìn ba từ mới nào!", "word_sparkle", ("bird", "rabbit", "fish"), None),
        (17, 27, "observation_prompt", "Lexi dừng cạnh ao để bé tìm con vật đang bơi.", "Con thấy con nào đang bơi?", "thinking_pop", (), "Con thấy con cá ở đâu?"),
        (27, 37, "spoken_recap", "Ba thẻ từ thiên nhiên hiện lần lượt với chuyển động nhỏ, chậm và dễ theo dõi.", "Cùng nhìn lại ba từ nhé!", "practice_cheer", (), None),
        (37, 45, "start_invitation", "Lexi chỉ về lối mòn dẫn vào bài học, giữ bố cục rộng và rõ ràng.", "Mình bắt đầu nhé!", "start_twinkle", (), None),
    ),
    "momo-school-food-english-5-7": (
        (0, 5, "lexi_greeting", "Lexi chào bé trước lớp học thân thiện, có ba lô và bàn học.", "Cùng đến trường nhé!", "welcome_chirp", (), None),
        (5, 17, "words_in_context", "Lexi chỉ quyển sách, bút chì và quả táo trong một ngày vui ở trường.", "Nhìn ba từ mới nào!", "word_sparkle", ("book", "pencil", "apple"), None),
        (17, 27, "observation_prompt", "Lexi dừng bên bàn học có hộp cơm để bé quan sát kỹ.", "Con thấy đồ ăn nào trên bàn?", "thinking_pop", (), "Con thấy quả táo ở đâu?"),
        (27, 37, "spoken_recap", "Ba thẻ từ lớp học và đồ ăn hiện lần lượt với nhịp đọc chậm.", "Cùng nhìn lại ba từ nhé!", "practice_cheer", (), None),
        (37, 45, "start_invitation", "Lexi giơ quyển sách và chỉ vào nút bắt đầu, không có lời kêu gọi mua hàng.", "Mình bắt đầu nhé!", "start_twinkle", (), None),
    ),
}


def build_momo_course_video_sources(
    manifest: MomoContentMediaManifest | None = None,
) -> MomoCourseVideoSourceManifest:
    """Create production-pending original trailers, without generating or uploading video."""
    manifest = manifest or build_momo_content_media_manifest()
    entries = tuple(
        MomoCourseVideoSource(
            course_id=course_id,
            slot="trailer",
            provider="supabase",
            provider_id=f"courses/{course_id}/videos/course-trailer.mp4",
            title=_COURSE_VIDEO_BRIEFS[course_id][0],
            age_range="5-7",
            learning_objective=_COURSE_VIDEO_BRIEFS[course_id][1],
            duration_seconds=45,
            poster_object_path=f"courses/{course_id}/images/course-cover.png",
            captions_or_transcript=_COURSE_VIDEO_BRIEFS[course_id][2],
            approval_status="pending_production",
            source_license_evidence="Original Momo/Lexi production brief approved by product owner on 2026-09-02.",
        )
        for course_id in manifest.course_ids
    )
    return MomoCourseVideoSourceManifest(course_ids=manifest.course_ids, entries=entries)


def approve_momo_course_video_sources(
    source_manifest: MomoCourseVideoSourceManifest | None = None,
) -> MomoCourseVideoSourceManifest:
    """Record brief approval only; media objects remain absent until production/upload."""
    source_manifest = source_manifest or build_momo_course_video_sources()
    return MomoCourseVideoSourceManifest(
        course_ids=source_manifest.course_ids,
        entries=tuple(
            entry.model_copy(update={"approval_status": "approved"})
            for entry in source_manifest.entries
        ),
    )


def build_momo_course_video_storyboards(
    source_manifest: MomoCourseVideoSourceManifest | None = None,
) -> MomoCourseVideoStoryboardManifest:
    """Build the approved production briefs without creating a video artifact."""
    source_manifest = source_manifest or approve_momo_course_video_sources()
    approved_trailers = {
        entry.course_id: entry
        for entry in source_manifest.entries
        if entry.slot == "trailer"
    }
    if set(approved_trailers) != set(source_manifest.course_ids):
        raise ValueError("approved source manifest must contain one trailer per stable course")
    if any(entry.provider != "supabase" or entry.approval_status != "approved" for entry in approved_trailers.values()):
        raise ValueError("trailer storyboard requires an approved original Supabase trailer")
    entries = tuple(
        MomoCourseVideoStoryboard(
            course_id=course_id,
            provider_id=approved_trailers[course_id].provider_id,
            beats=tuple(
                MomoCourseVideoBeat(
                    start_second=start_second,
                    end_second=end_second,
                    purpose=purpose,
                    visual_direction=visual_direction,
                    on_screen_copy_vi=on_screen_copy_vi,
                    lexi_audio_cue=lexi_audio_cue,
                    word_audio=word_audio,
                    interaction_prompt=interaction_prompt,
                )
                for start_second, end_second, purpose, visual_direction, on_screen_copy_vi, lexi_audio_cue, word_audio, interaction_prompt in _COURSE_TRAILER_BEATS[course_id]
            ),
        )
        for course_id in source_manifest.course_ids
    )
    return MomoCourseVideoStoryboardManifest(course_ids=source_manifest.course_ids, entries=entries)


def render_course_video_storyboards_json(
    storyboard_manifest: MomoCourseVideoStoryboardManifest | None = None,
) -> str:
    return json.dumps(
        (storyboard_manifest or build_momo_course_video_storyboards()).model_dump(mode="json"),
        ensure_ascii=False,
        indent=2,
    ) + "\n"


def load_momo_course_video_storyboards(
    path: Path = COURSE_VIDEO_STORYBOARDS_PATH,
) -> MomoCourseVideoStoryboardManifest:
    return MomoCourseVideoStoryboardManifest.model_validate_json(path.read_text(encoding="utf-8"))


def render_course_video_sources_json(
    source_manifest: MomoCourseVideoSourceManifest | None = None,
) -> str:
    return json.dumps(
        (source_manifest or build_momo_course_video_sources()).model_dump(mode="json"),
        ensure_ascii=False,
        indent=2,
    ) + "\n"


def load_momo_course_video_sources(
    path: Path = COURSE_VIDEO_SOURCES_PATH,
) -> MomoCourseVideoSourceManifest:
    return MomoCourseVideoSourceManifest.model_validate_json(path.read_text(encoding="utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(description="Build/check the source-only Momo content media manifest")
    parser.add_argument("--check", action="store_true", help="fail if committed manifest differs from canonical output")
    parser.add_argument("--write", action="store_true", help="write the deterministic repository manifest")
    parser.add_argument("--check-storyboard", action="store_true", help="fail if committed storyboard differs from canonical output")
    parser.add_argument("--write-storyboard", action="store_true", help="write the deterministic review storyboard")
    parser.add_argument("--approve-storyboard", action="store_true", help="record approved sourcing policy in the storyboard")
    parser.add_argument("--check-course-videos", action="store_true", help="fail if committed course-video sources differ from canonical output")
    parser.add_argument("--write-course-videos", action="store_true", help="write the deterministic metadata-only course-video sources")
    parser.add_argument("--approve-course-videos", action="store_true", help="record approved course-video briefs without producing media")
    parser.add_argument("--check-course-video-storyboards", action="store_true", help="fail if committed course-video storyboards differ from canonical output")
    parser.add_argument("--write-course-video-storyboards", action="store_true", help="write approved metadata-only course-video storyboards")
    args = parser.parse_args()
    rendered = render_manifest_json()
    if args.check:
        if not MANIFEST_PATH.is_file() or MANIFEST_PATH.read_text(encoding="utf-8") != rendered:
            raise SystemExit("committed manifest is not the canonical deterministic output")
        return 0
    if args.write:
        MANIFEST_PATH.write_text(rendered, encoding="utf-8")
        return 0
    storyboard = (
        approve_momo_lesson_storyboard()
        if args.approve_storyboard or args.check_storyboard
        else build_momo_lesson_storyboard()
    )
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
    course_videos = (
        approve_momo_course_video_sources()
        if args.approve_course_videos or args.check_course_videos
        else build_momo_course_video_sources()
    )
    course_videos_rendered = render_course_video_sources_json(course_videos)
    if args.check_course_videos:
        if not COURSE_VIDEO_SOURCES_PATH.is_file() or COURSE_VIDEO_SOURCES_PATH.read_text(encoding="utf-8") != course_videos_rendered:
            raise SystemExit("committed course-video sources are not the canonical deterministic output")
        return 0
    if args.write_course_videos:
        COURSE_VIDEO_SOURCES_PATH.write_text(course_videos_rendered, encoding="utf-8")
        return 0
    if args.approve_course_videos:
        COURSE_VIDEO_SOURCES_PATH.write_text(course_videos_rendered, encoding="utf-8")
        return 0
    course_video_storyboards_rendered = render_course_video_storyboards_json()
    if args.check_course_video_storyboards:
        if not COURSE_VIDEO_STORYBOARDS_PATH.is_file() or COURSE_VIDEO_STORYBOARDS_PATH.read_text(encoding="utf-8") != course_video_storyboards_rendered:
            raise SystemExit("committed course-video storyboards are not the canonical deterministic output")
        return 0
    if args.write_course_video_storyboards:
        COURSE_VIDEO_STORYBOARDS_PATH.write_text(course_video_storyboards_rendered, encoding="utf-8")
        return 0
    print(rendered, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
