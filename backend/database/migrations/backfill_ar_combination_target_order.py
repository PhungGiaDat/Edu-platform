"""Backfill physically audited MindAR target-index order for AR combinations.

Run from ``backend`` after each combo asset has been tested one card at a time:

    python -m database.migrations.backfill_ar_combination_target_order --apply

Do not add a combo to AUDITED_TARGET_ORDERS from required_tags or filename
convention. Values here must come from an index 0/1 physical tracking audit.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path

import certifi
from dotenv import load_dotenv
from pymongo import MongoClient


# Physical test confirmed jungle => index 0 and elephant => index 1 for the
# hosted combo_targets.mind asset (the inverse of required_tags in MongoDB).
AUDITED_TARGET_ORDERS = {
    "jungle_scene_v1": ["jungle_marker_01", "elephant_marker_01"],
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="write audited orders to MongoDB")
    args = parser.parse_args()

    backend_dir = Path(__file__).resolve().parents[2]
    load_dotenv(backend_dir / ".env")
    mongo_url = os.getenv("MONGO_URL")
    if not mongo_url:
        raise RuntimeError("MONGO_URL is not set")

    client = MongoClient(
        mongo_url,
        tls=True,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=10_000,
    )
    collection = client[os.getenv("MONGO_DB", "edu_platform")]["ar_combinations"]
    try:
        for combo_id, target_order in AUDITED_TARGET_ORDERS.items():
            combo = collection.find_one({"combo_id": combo_id}, {"required_tags": 1})
            if not combo:
                raise RuntimeError(f"Combo not found: {combo_id}")
            required_tags = combo.get("required_tags", [])
            if len(set(target_order)) != len(target_order) or set(target_order) != set(required_tags):
                raise RuntimeError(f"Audited order is not a permutation of required_tags: {combo_id}")
            action = "APPLY" if args.apply else "DRY RUN"
            print(f"[{action}] {combo_id}: {target_order}")
            if args.apply:
                collection.update_one(
                    {"combo_id": combo_id},
                    {"$set": {"target_order": target_order}},
                )

        unaudited = list(collection.find(
            {"combo_id": {"$nin": list(AUDITED_TARGET_ORDERS)}},
            {"_id": 0, "combo_id": 1},
        ))
        if unaudited:
            print("[AUDIT REQUIRED] " + ", ".join(c["combo_id"] for c in unaudited))
        return 0
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(main())
