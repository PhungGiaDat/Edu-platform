"""Mongo migration for lesson-engine collections, indexes, and backfills.

Run from ``backend/``:

    python scripts/migrate_lesson_engine.py --apply

Safe to run multiple times.
"""
from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from datetime import datetime, UTC
from pathlib import Path
from typing import Any

import certifi
import motor.motor_asyncio

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from settings import settings
from services.course_service import _collect_lesson_media_assets, _normalize_session


logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


async def ensure_indexes(db: Any) -> None:
    await db["courses"].create_index("course_id", unique=True, name="course_id_unique")
    await db["courses"].create_index("is_published", name="course_is_published")
    await db["courses"].create_index("category_key", name="course_category_key")

    await db["lesson_sessions"].create_index(
        [("user_id", 1), ("course_id", 1), ("lesson_id", 1)],
        unique=True,
        name="lesson_session_user_course_lesson_unique",
    )
    await db["lesson_sessions"].create_index(
        "session_id",
        unique=True,
        sparse=True,
        name="lesson_session_id_unique",
    )
    await db["lesson_sessions"].create_index(
        [("user_id", 1), ("status", 1), ("updated_at", -1)],
        name="lesson_session_user_status_updated",
    )

    await db["lesson_step_attempts"].create_index(
        [("session_id", 1), ("attempted_at", -1)],
        name="lesson_attempt_session_attempted",
    )
    await db["lesson_step_attempts"].create_index(
        [("user_id", 1), ("course_id", 1), ("lesson_id", 1), ("step_id", 1)],
        name="lesson_attempt_user_course_lesson_step",
    )

    await db["word_mastery"].create_index(
        [("user_id", 1), ("course_id", 1), ("lesson_id", 1), ("word", 1)],
        unique=True,
        name="word_mastery_user_course_lesson_word_unique",
    )
    await db["word_mastery"].create_index(
        [("user_id", 1), ("updated_at", -1)],
        name="word_mastery_user_updated",
    )

    await db["media_assets"].create_index(
        [("course_id", 1), ("lesson_id", 1), ("section_id", 1), ("asset_key", 1), ("path", 1)],
        unique=True,
        name="media_asset_course_lesson_section_key_path_unique",
    )
    await db["media_assets"].create_index(
        [("course_id", 1), ("lesson_id", 1), ("section_id", 1)],
        name="media_asset_course_lesson_section",
    )

    await db["pronunciation_attempts"].create_index(
        [("course_id", 1), ("lesson_id", 1), ("section_id", 1), ("attempted_at", -1)],
        name="pronunciation_course_lesson_section_attempted",
    )
    await db["pronunciation_attempts"].create_index(
        [("session_id", 1), ("attempted_at", -1)],
        sparse=True,
        name="pronunciation_session_attempted",
    )


async def backfill_courses(db: Any) -> int:
    result = await db["courses"].update_many(
        {
            "$or": [
                {"age_range": {"$exists": False}},
                {"age_range": "5-7"},
            ]
        },
        {
            "$set": {
                "age_range": "5-8",
                "updated_at": utcnow(),
            }
        },
    )
    return int(result.modified_count)


async def backfill_pronunciation_context(db: Any) -> int:
    updates = 0
    for field in ("course_id", "lesson_id", "section_id", "session_id", "target_text"):
        result = await db["pronunciation_attempts"].update_many(
            {field: {"$exists": False}},
            {"$set": {field: None}},
        )
        updates += int(result.modified_count)
    return updates


async def backfill_media_assets(db: Any) -> tuple[int, int]:
    courses = await db["courses"].find({}, {"course_id": 1, "lessons": 1}).to_list(length=None)
    upserts = 0
    lesson_count = 0

    for course in courses:
        course_id = course.get("course_id")
        lessons = course.get("lessons") or []
        for lesson in lessons:
            lesson_count += 1
            for asset in _collect_lesson_media_assets(course_id, lesson):
                created_at = asset.get("created_at", utcnow())
                asset["updated_at"] = utcnow()
                result = await db["media_assets"].update_one(
                    {
                        "course_id": asset["course_id"],
                        "lesson_id": asset["lesson_id"],
                        "section_id": asset["section_id"],
                        "asset_key": asset["asset_key"],
                        "path": asset["path"],
                    },
                    {
                        "$set": asset,
                        "$setOnInsert": {"created_at": created_at},
                    },
                    upsert=True,
                )
                if result.modified_count > 0 or result.upserted_id is not None:
                    upserts += 1

    return lesson_count, upserts


async def backfill_lesson_sessions(db: Any) -> int:
    updates = 0
    courses = await db["courses"].find({}, {"course_id": 1, "lessons": 1}).to_list(length=None)
    lesson_lookup: dict[tuple[str, str], dict[str, Any]] = {}
    for course in courses:
        for lesson in course.get("lessons") or []:
            lesson_lookup[(course["course_id"], lesson["lesson_id"])] = lesson

    cursor = db["lesson_sessions"].find({})
    async for session in cursor:
        lesson = lesson_lookup.get((session.get("course_id"), session.get("lesson_id")))
        if not lesson:
            continue
        normalized = _normalize_session(dict(session), lesson)
        normalized.pop("_id", None)
        normalized["updated_at"] = utcnow()
        result = await db["lesson_sessions"].update_one(
            {"_id": session["_id"]},
            {"$set": normalized},
        )
        updates += int(result.modified_count)
    return updates


async def log_index_summary(db: Any) -> None:
    for collection_name in (
        "courses",
        "lesson_sessions",
        "lesson_step_attempts",
        "word_mastery",
        "media_assets",
        "pronunciation_attempts",
    ):
        indexes = await db[collection_name].index_information()
        logger.info("[%s] indexes: %s", collection_name, ", ".join(indexes.keys()))


async def run_migration(apply: bool) -> int:
    logger.info("=== Edu-platform Migration: Lesson Engine ===")
    logger.info("Target database: %s", settings.MONGO_DB)

    client = motor.motor_asyncio.AsyncIOMotorClient(
        settings.MONGO_URL,
        tls=True,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=10_000,
    )
    db = client[settings.MONGO_DB]

    try:
        await client.admin.command("ping")
        logger.info("Connected to MongoDB successfully.")

        await ensure_indexes(db)
        logger.info("Indexes created or verified.")

        if not apply:
            await log_index_summary(db)
            logger.info("Dry run complete. Re-run with --apply to backfill documents.")
            return 0

        course_updates = await backfill_courses(db)
        pronunciation_updates = await backfill_pronunciation_context(db)
        lesson_count, media_updates = await backfill_media_assets(db)
        session_updates = await backfill_lesson_sessions(db)

        logger.info("Backfill complete.")
        logger.info("  courses updated: %s", course_updates)
        logger.info("  pronunciation docs updated: %s", pronunciation_updates)
        logger.info("  lessons scanned for media: %s", lesson_count)
        logger.info("  media asset rows upserted: %s", media_updates)
        logger.info("  lesson sessions normalized: %s", session_updates)

        await log_index_summary(db)
        return 0
    finally:
        client.close()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="write updates to MongoDB")
    args = parser.parse_args()
    return asyncio.run(run_migration(apply=args.apply))


if __name__ == "__main__":
    raise SystemExit(main())
