from datetime import datetime
from typing import Any, Dict, Optional

from settings import settings

from .course_model import CourseSchema


def normalize_asset_buckets(value: Any, default_bucket: Optional[str] = None) -> Any:
    """Fill missing asset buckets recursively without changing unrelated data."""
    bucket_name = default_bucket or settings.LEARNAR_ASSETS_BUCKET
    if isinstance(value, dict):
        normalized = {key: normalize_asset_buckets(item, bucket_name) for key, item in value.items()}
        if {"path", "type"}.issubset(normalized.keys()) and (
            "bucket" in normalized or "status" in normalized
        ):
            normalized["bucket"] = normalized.get("bucket") or bucket_name
        return normalized
    if isinstance(value, list):
        return [normalize_asset_buckets(item, bucket_name) for item in value]
    return value


def validate_generated_course(course: CourseSchema) -> None:
    # NOTE: This function only enforces *semantic* invariants that are NOT already
    # guaranteed by CourseSchema. Fields the Pydantic schema marks as Optional
    # (e.g. thumbnail, videoLesson, readAloudStory, pronunciation) are accepted
    # as Optional here too — generated-course gating for those lives in the
    # seed/UI layer, not the strict validator.
    if course.age_range != "5-8":
        raise ValueError("Generated courses must target age range 5-8")
    if not 5 <= len(course.lessons) <= 8:
        raise ValueError("Generated courses require 5-8 lessons")

    for lesson in course.lessons:
        if not 3 <= lesson.duration_minutes <= 7:
            raise ValueError(f"Lesson {lesson.lesson_id} must be 3-7 minutes")
        if lesson.videoLesson is not None and not 60 <= lesson.videoLesson.duration_seconds <= 120:
            raise ValueError(f"Lesson {lesson.lesson_id} video must be 60-120 seconds")
        for question in lesson.quiz:
            if len(question.options) > 4:
                raise ValueError(f"Quiz {question.question_id} has more than 4 options")
            if not question.questionAudioText:
                raise ValueError(f"Quiz {question.question_id} requires questionAudioText")


def normalize_course_payload(
    payload: Dict[str, Any],
    *,
    strict_generated: bool = True,
    refresh_updated_at: bool = True,
) -> Dict[str, Any]:
    normalized_payload = normalize_asset_buckets(payload)
    if not strict_generated and isinstance(normalized_payload, dict):
        normalized_payload = dict(normalized_payload)
        if normalized_payload.get("age_range") != "5-8":
            normalized_payload["age_range"] = "5-8"

    course = CourseSchema.model_validate(normalized_payload)
    if strict_generated:
        validate_generated_course(course)

    course_data = course.model_dump()
    if refresh_updated_at:
        course_data["updated_at"] = datetime.utcnow()
    return course_data
