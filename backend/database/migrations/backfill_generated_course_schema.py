"""Audit and normalize generated course documents.

Run from the backend directory:

    python -m database.migrations.backfill_generated_course_schema
    python -m database.migrations.backfill_generated_course_schema --apply

By default this validates generated-looking courses with the strict generated
course rules used by ``POST /courses/generate`` while allowing simple legacy
records to normalize through the base course schema. Use ``--allow-legacy``
only when you want every record to use relaxed validation.
"""
from __future__ import annotations

import argparse
import asyncio
import logging
from datetime import datetime
from typing import Any, Dict, List, Tuple

import certifi
from motor.motor_asyncio import AsyncIOMotorClient

from models.course_integrity import normalize_course_payload
from settings import settings


logger = logging.getLogger(__name__)


_GENERATED_COURSE_MARKERS = ("thumbnail", "catalogPreview", "studentTestimonials", "enrollmentCta")
_GENERATED_LESSON_MARKERS = (
    "videoLesson",
    "vocabulary",
    "game",
    "readAloudStory",
    "pronunciation",
    "activity",
    "quiz",
    "reward",
    "arReference",
    "generatedMedia",
)


def _without_mongo_id(document: Dict[str, Any]) -> Dict[str, Any]:
    return {key: value for key, value in document.items() if key != "_id"}


def _has_value(value: Any) -> bool:
    return value not in (None, "", [], {})


def _looks_generated_course(document: Dict[str, Any]) -> bool:
    if any(_has_value(document.get(key)) for key in _GENERATED_COURSE_MARKERS):
        return True

    lessons = document.get("lessons") or []
    return any(
        isinstance(lesson, dict)
        and any(_has_value(lesson.get(key)) for key in _GENERATED_LESSON_MARKERS)
        for lesson in lessons
    )


def _should_validate_strict(document: Dict[str, Any], strict_generated: bool) -> bool:
    return strict_generated and _looks_generated_course(document)


def _merge_schema_values(existing: Any, normalized: Any) -> Any:
    if isinstance(existing, dict) and isinstance(normalized, dict):
        merged = dict(existing)
        for key, value in normalized.items():
            merged[key] = _merge_schema_values(existing.get(key), value)
        return merged

    if isinstance(existing, list) and isinstance(normalized, list):
        merged = []
        for index, value in enumerate(normalized):
            if index < len(existing):
                merged.append(_merge_schema_values(existing[index], value))
            else:
                merged.append(value)
        if len(existing) > len(normalized):
            merged.extend(existing[len(normalized):])
        return merged

    return normalized


async def audit_and_backfill_courses(*, apply: bool, strict_generated: bool) -> int:
    client = AsyncIOMotorClient(
        settings.MONGO_URL,
        tls=True,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=10_000,
    )
    collection = client[settings.MONGO_DB]["courses"]
    invalid: List[Tuple[str, str]] = []
    pending_updates: List[Tuple[Any, str, Dict[str, Any]]] = []
    strict_generated_count = 0
    relaxed_legacy_count = 0

    try:
        async for document in collection.find({}):
            course_id = str(document.get("course_id") or document.get("_id"))
            document_strict = _should_validate_strict(document, strict_generated)
            if document_strict:
                strict_generated_count += 1
            else:
                relaxed_legacy_count += 1

            try:
                normalized = normalize_course_payload(
                    document,
                    strict_generated=document_strict,
                    refresh_updated_at=False,
                )
            except Exception as exc:
                invalid.append((course_id, str(exc)))
                continue

            existing_document = _without_mongo_id(document)
            merged_document = _merge_schema_values(existing_document, normalized)

            if merged_document != existing_document:
                pending_updates.append((document["_id"], course_id, merged_document))

        logger.info(
            "Scanned courses: strict_generated=%s, relaxed_legacy=%s, invalid=%s, pending_updates=%s",
            strict_generated_count,
            relaxed_legacy_count,
            len(invalid),
            len(pending_updates),
        )

        if invalid:
            for course_id, error in invalid:
                logger.error("Invalid course %s: %s", course_id, error)
            logger.error("No changes were applied because at least one course failed validation.")
            return 1

        for _, course_id, _ in pending_updates:
            logger.info("%s course %s", "Apply" if apply else "Would normalize", course_id)

        if apply:
            now = datetime.utcnow()
            for document_id, _, normalized in pending_updates:
                normalized["updated_at"] = now
                await collection.update_one(
                    {"_id": document_id},
                    {"$set": normalized},
                )

        return 0
    finally:
        client.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit/backfill generated course MongoDB documents.")
    parser.add_argument("--apply", action="store_true", help="write normalized documents after validation passes")
    parser.add_argument(
        "--allow-legacy",
        action="store_true",
        help="validate only CourseSchema, not strict generated course rules",
    )
    return parser.parse_args()


async def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    args = parse_args()
    return await audit_and_backfill_courses(
        apply=args.apply,
        strict_generated=not args.allow_legacy,
    )


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
