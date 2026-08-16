"""Safely backfill ``cross_category_allowed`` for known AR combos.

The command defaults to dry-run. Pass ``--apply`` explicitly to write changes.
Combo behavior is defined by an audited allowlist instead of regex inference.
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Collection, Sequence

import certifi
import motor.motor_asyncio
from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from settings import settings  # noqa: E402


# Audited from the nine production ar_combinations documents. Mixed semantic
# categories are true; same-category combinations are false.
KNOWN_COMBO_FLAGS: dict[str, bool] = {
    "birthday_party_v1": True,
    "desert_oasis_v1": False,
    "forest_scene_v1": False,
    "fruit_basket_v1": False,
    "jungle_scene_v1": True,
    "picnic_day_v1": True,
    "race_track_v1": False,
    "road_trip_v1": True,
    "safari_adventure_v1": True,
}


@dataclass(frozen=True)
class MigrationReport:
    """Deterministic summary returned by dry-run and apply modes."""

    mode: str
    planned_updates: dict[str, bool]
    missing_ids: tuple[str, ...]
    unexpected_ids: tuple[str, ...]
    modified_count: int = 0

    @property
    def planned_count(self) -> int:
        return len(self.planned_updates)


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Backfill audited cross_category_allowed values for AR combos."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write the planned changes. Without this flag the command is read-only.",
    )
    return parser.parse_args(argv)


def build_update_filter(combo_ids: Collection[str], desired: bool) -> dict:
    """Build a collision-free Mongo filter with two explicit ``$or`` groups."""
    sorted_ids = sorted(combo_ids)
    if not sorted_ids:
        raise ValueError("At least one combo_id is required")
    return {
        "$and": [
            {"$or": [{"combo_id": combo_id} for combo_id in sorted_ids]},
            {
                "$or": [
                    {"cross_category_allowed": {"$exists": False}},
                    {"cross_category_allowed": None},
                    {"cross_category_allowed": not desired},
                ]
            },
        ]
    }


async def migrate_cross_category_combos(
    collection,
    apply: bool = False,
) -> MigrationReport:
    """Plan or apply the audited backfill against an injected collection."""
    cursor = collection.find(
        {},
        {"_id": 0, "combo_id": 1, "cross_category_allowed": 1},
    )
    documents = await cursor.to_list(length=None)
    documents_by_id = {
        document["combo_id"]: document
        for document in documents
        if isinstance(document.get("combo_id"), str)
    }

    found_ids = set(documents_by_id)
    known_ids = set(KNOWN_COMBO_FLAGS)
    missing_ids = tuple(sorted(known_ids - found_ids))
    unexpected_ids = tuple(sorted(found_ids - known_ids))
    planned_updates = {
        combo_id: desired
        for combo_id, desired in KNOWN_COMBO_FLAGS.items()
        if combo_id in documents_by_id
        and documents_by_id[combo_id].get("cross_category_allowed") is not desired
    }

    modified_count = 0
    if apply:
        for desired in (True, False):
            combo_ids = {
                combo_id
                for combo_id, value in planned_updates.items()
                if value is desired
            }
            if not combo_ids:
                continue
            result = await collection.update_many(
                build_update_filter(combo_ids, desired),
                {"$set": {"cross_category_allowed": desired}},
            )
            modified_count += result.modified_count

    return MigrationReport(
        mode="apply" if apply else "dry-run",
        planned_updates=dict(sorted(planned_updates.items())),
        missing_ids=missing_ids,
        unexpected_ids=unexpected_ids,
        modified_count=modified_count,
    )


def print_report(report: MigrationReport) -> None:
    print(f"[Migration] Mode: {report.mode}")
    for combo_id, desired in report.planned_updates.items():
        print(f"[Migration] PLAN {combo_id}: cross_category_allowed={desired}")
    print(f"[Migration] Planned changes: {report.planned_count}")
    print(f"[Migration] Missing known IDs: {list(report.missing_ids)}")
    print(f"[Migration] Unexpected IDs: {list(report.unexpected_ids)}")
    print(f"[Migration] Modified documents: {report.modified_count}")
    if report.mode == "dry-run":
        print("[Migration] Dry-run complete; no MongoDB writes were performed.")


async def run_cli(apply: bool) -> MigrationReport:
    client = motor.motor_asyncio.AsyncIOMotorClient(
        settings.MONGO_URL,
        tls=True,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=10_000,
    )
    try:
        await client.admin.command("ping")
        collection = client[settings.MONGO_DB]["ar_combinations"]
        report = await migrate_cross_category_combos(collection, apply=apply)
        print_report(report)
        return report
    finally:
        client.close()


if __name__ == "__main__":
    arguments = parse_args()
    asyncio.run(run_cli(apply=arguments.apply))
