"""Safely repair lossy Vietnamese copy in the three Momo Mongo courses.

Dry run (default):
    python -m database.migrations.repair_momo_course_unicode

Apply after reviewing the dry-run output:
    python -m database.migrations.repair_momo_course_unicode --apply --confirm momo-unicode-v1

Only string fields that are suspicious in Mongo and clean in the reviewed seed
are updated.  A full copy of each affected document is inserted into
``course_migration_backups`` before any field-level update is applied.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict
from uuid import uuid4

import certifi
from motor.motor_asyncio import AsyncIOMotorClient

from course_unicode import collect_repair_updates, is_suspicious, walk_strings
from settings import settings


logger = logging.getLogger(__name__)
CONFIRMATION = "momo-unicode-v1"
SEED_DIR = Path(__file__).resolve().parents[2] / "seeds" / "courses"
SEED_FILES = (
    SEED_DIR / "momo_home_family.json",
    SEED_DIR / "momo_nature.json",
    SEED_DIR / "momo_school_food.json",
)


def load_reviewed_seeds() -> Dict[str, Dict[str, Any]]:
    seeds: Dict[str, Dict[str, Any]] = {}
    for path in SEED_FILES:
        document = json.loads(path.read_text(encoding="utf-8"))
        if any(is_suspicious(text) for _, text in walk_strings(document)):
            raise ValueError(f"Reviewed seed still contains suspicious Unicode: {path}")
        seeds[document["course_id"]] = document
    return seeds


async def migrate(*, apply: bool) -> int:
    reviewed_seeds = load_reviewed_seeds()
    run_id = f"momo-unicode-v1-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}-{uuid4().hex[:8]}"
    client = AsyncIOMotorClient(
        settings.MONGO_URL,
        tls=True,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=10_000,
    )
    database = client[settings.MONGO_DB]
    courses = database["courses"]
    backups = database["course_migration_backups"]
    pending = []

    try:
        for course_id, seed in reviewed_seeds.items():
            existing = await courses.find_one({"course_id": course_id})
            if existing is None:
                logger.error("Course is missing; refusing a partial migration: %s", course_id)
                return 1
            updates = collect_repair_updates(existing, seed)
            logger.info("%s: %s text fields need repair", course_id, len(updates))
            for path in list(updates)[:10]:
                logger.info("  %s", path)
            pending.append((course_id, existing, updates))

        if not any(updates for _, _, updates in pending):
            logger.info("No repairs required. The migration is already converged.")
            return 0

        if not apply:
            logger.info("Dry run only; no database writes were made.")
            return 0

        for course_id, existing, updates in pending:
            if not updates:
                continue
            await backups.insert_one({
                "migration": CONFIRMATION,
                "run_id": run_id,
                "course_id": course_id,
                "created_at": datetime.now(timezone.utc),
                "original_document": existing,
            })
            result = await courses.update_one(
                {"_id": existing["_id"], "course_id": course_id},
                {"$set": {**updates, "updated_at": datetime.now(timezone.utc)}},
            )
            if result.matched_count != 1:
                logger.error("Course changed or disappeared during migration: %s", course_id)
                return 1
            logger.info("Applied %s field repairs to %s", len(updates), course_id)

        logger.info("Migration complete. Backup run id: %s", run_id)
        return 0
    finally:
        client.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="write backup and field-level repairs")
    parser.add_argument("--confirm", help=f"required with --apply; must equal {CONFIRMATION!r}")
    args = parser.parse_args()
    if args.apply and args.confirm != CONFIRMATION:
        parser.error(f"--apply requires --confirm {CONFIRMATION}")
    return args


async def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    args = parse_args()
    return await migrate(apply=args.apply)


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
