"""Catalog identity backfill for ``ar_objects``.

Pre-existing documents pointed at ``nft_base_url`` URLs that lived on a
single-target MindAR file each.  The Shared-Mind Persistent Viewer plan
collapses those into a single versioned catalog
(``animals-v2.mind`` + ``animals-v2.manifest.json``) and tracks every
target by ``(mind_catalog_id, mind_target_index)`` instead of by URL.

This migration is intentionally narrow:

* only ``elephant_marker_01`` and ``shiba_marker_01`` are repaired,
* the existing ``nft_base_url`` must be in the documented legacy set, and
* dry-run is the default — the operator must pass ``--apply`` to mutate.

Every repair is a compare-and-set ``update_one`` whose filter includes
the original ``nft_base_url`` and the absence of ``mind_catalog_id``.  If
a concurrent writer changed the document in the meantime, ``matched_count``
drops below 1 and the script aborts without applying any further repairs.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from typing import Iterable, List, Mapping


CATALOG_ID = "animals-v2"
MIND_URL = "/assets/target/catalogs/animals-v2.mind"
INDEX_BY_TAG = {
    "elephant_marker_01": 0,
    "shiba_marker_01": 1,
}
ALLOWED_LEGACY_URLS = {
    "elephant_marker_01": {
        "https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/assets/mind-files/elephant_targets.mind",
        "https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/mind-files/animals.mind",
    },
    "shiba_marker_01": {
        "https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/assets/mind-files/shiba_targets.mind",
        "https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/mind-files/animals.mind",
    },
}


@dataclass(frozen=True)
class CatalogRepair:
    ar_tag: str
    old_mind_url: str
    mind_target_index: int


def build_operations(documents: Iterable[Mapping[str, object]]) -> List[CatalogRepair]:
    """Return the exact list of repairs an apply run would perform.

    The function is pure — no database access — so tests can drive it with
    synthetic documents.  Documents that already match the contract are
    skipped, and documents outside the whitelist are ignored entirely so
    the operator can handle them out-of-band.
    """

    repairs: List[CatalogRepair] = []
    for doc in documents:
        tag = doc.get("ar_tag")
        if tag not in INDEX_BY_TAG:
            continue
        if (
            doc.get("mind_catalog_id") == CATALOG_ID
            and doc.get("mind_target_index") == INDEX_BY_TAG[tag]
            and doc.get("nft_base_url") == MIND_URL
        ):
            continue
        existing_catalog = doc.get("mind_catalog_id")
        if existing_catalog not in (None, ""):
            continue
        existing_url = doc.get("nft_base_url")
        if existing_url not in ALLOWED_LEGACY_URLS[tag]:
            continue
        repairs.append(
            CatalogRepair(
                ar_tag=tag,
                old_mind_url=existing_url,
                mind_target_index=INDEX_BY_TAG[tag],
            )
        )
    return repairs


def parse_args(argv=None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Persist repairs (default is dry-run, which only prints the plan).",
    )
    return parser.parse_args(argv)


def _build_update_filter(repair: CatalogRepair) -> dict:
    return {
        "ar_tag": repair.ar_tag,
        "nft_base_url": repair.old_mind_url,
        "$or": [
            {"mind_catalog_id": {"$exists": False}},
            {"mind_catalog_id": None},
            {"mind_catalog_id": ""},
        ],
    }


def _build_update_document(repair: CatalogRepair) -> dict:
    return {
        "$set": {
            "nft_base_url": MIND_URL,
            "mind_catalog_id": CATALOG_ID,
            "mind_target_index": repair.mind_target_index,
        }
    }


def main(argv=None) -> int:
    args = parse_args(argv)

    # Late import keeps the migration importable in unit tests without
    # pulling in the MongoDB connection stack.
    from database.db import mongo_connector

    collection = mongo_connector.get_collection("ar_objects")
    documents = collection.find(
        {"ar_tag": {"$in": list(INDEX_BY_TAG.keys())}}
    )
    repairs = build_operations(documents)

    print(f"[backfill] catalog={CATALOG_ID} mind_url={MIND_URL}")
    print(f"[backfill] planned repairs: {len(repairs)}")
    for repair in repairs:
        print(
            json.dumps(
                {
                    "ar_tag": repair.ar_tag,
                    "old_mind_url": repair.old_mind_url,
                    "mind_target_index": repair.mind_target_index,
                }
            )
        )

    if not args.apply:
        print("DRY RUN: no data changed. Re-run with --apply to persist.")
        return 0

    applied = 0
    for repair in repairs:
        result = collection.update_one(
            _build_update_filter(repair),
            _build_update_document(repair),
        )
        if result.matched_count != 1:
            print(
                f"[backfill] ABORT: lost compare-and-set race for {repair.ar_tag}; "
                f"matched_count={result.matched_count}",
                flush=True,
            )
            return 2
        applied += 1

    print(f"[backfill] applied repairs: {applied}")
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())
