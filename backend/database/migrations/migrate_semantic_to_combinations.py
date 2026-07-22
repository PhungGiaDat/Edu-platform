"""
Migration: Merge semantic_rules collection into ar_combinations.

This script migrates all semantic_rules documents into the existing
ar_combinations collection, adding the following new fields:

    semantic_result  <- from 'result' (renamed to avoid conflict)
    animation
    sound
    phrase
    priority
    active
    flashcard_set   <- from 'flashcardSet' (snake_case)

Run in dry-run mode first (default):
    python -m database.migrations.migrate_semantic_to_combinations

Apply changes:
    python -m database.migrations.migrate_semantic_to_combinations --apply

Rollback (restore from backup):
    python -m database.migrations.migrate_semantic_to_combinations --rollback

Idempotent: re-running on already-migrated data is safe (upsert logic).
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import certifi

# Allow running as script or module
backend_dir = Path(__file__).resolve().parents[3]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database


# ========== CONFIGURATION ==========

MIGRATION_BANNER = """
===============================================
  SEMANTIC_RULES -> AR_COMBINATIONS MIGRATION
===============================================
"""
SEMANTIC_COLLECTION = "semantic_rules"
COMBO_COLLECTION = "ar_combinations"

# Fields that exist in semantic_rules and their target names in ar_combinations
SEMANTIC_FIELD_MAP = {
    "result": "semantic_result",  # renamed to avoid conflict
    "animation": "animation",
    "sound": "sound",
    "phrase": "phrase",
    "priority": "priority",
    "active": "active",
    "flashcardSet": "flashcard_set",  # snake_case
    "cards": "required_tags",  # cards -> required_tags
}

# New fields to add to ar_combinations (None = use existing or empty string)
REQUIRED_NEW_FIELDS = {
    "semantic_result": None,
    "animation": None,
    "sound": None,
    "phrase": None,
    "priority": 0,
    "active": True,
    "flashcard_set": None,
}


# ========== MIGRATION LOGIC ==========

def get_timestamp() -> str:
    """Return timestamp string for backup naming."""
    return datetime.utcnow().strftime("%Y%m%d_%H%M%S")


def validate_semantic_doc(doc: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Validate a semantic_rules document has required fields.
    Returns (is_valid, error_message).
    """
    if not doc:
        return False, "Empty document"

    cards = doc.get("cards") or doc.get("required_tags")
    if not cards or not isinstance(cards, list) or len(cards) == 0:
        return False, "Missing or empty 'cards' field"

    if not doc.get("result"):
        return False, "Missing 'result' field"

    if not doc.get("animation"):
        return False, "Missing 'animation' field"

    if not doc.get("flashcardSet"):
        return False, "Missing 'flashcardSet' field"

    return True, ""


def find_matching_combo(
    combo_collection: Collection, cards: List[str]
) -> Optional[Dict[str, Any]]:
    """
    Find an existing ar_combinations document that overlaps with the given cards.

    Strategy: Find combos where ANY required_tag matches ANY card from the rule.
    This handles the case where semantic_rules and ar_combinations share partial cards.
    """
    for card in cards:
        match = combo_collection.find_one({"required_tags": card})
        if match:
            return match
    return None


def build_merged_doc(
    semantic_doc: Dict[str, Any],
    existing_combo: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Build the merged document.

    - If existing_combo is provided: add semantic fields, preserve existing
    - If no existing_combo: create new entry with defaults for missing fields
    """
    merged: Dict[str, Any] = {}

    if existing_combo:
        # Start with existing ar_combinations fields (preserve all)
        for key, value in existing_combo.items():
            if key != "_id":
                merged[key] = value

        # Use existing combo_id as identifier
        merged["_id"] = existing_combo.get("_id")
        if existing_combo.get("combo_id"):
            merged["combo_id"] = existing_combo["combo_id"]
    else:
        # No matching combo found — create new entry
        doc_id = semantic_doc.get("_id") or f"migrated_{get_timestamp()}"
        merged["_id"] = doc_id
        merged["combo_id"] = doc_id
        merged["description"] = (
            f"Migrated from semantic_rules: {semantic_doc.get('result', 'unknown')}"
        )
        merged["model_3d_url"] = ""
        merged["image_2d_url"] = ""
        merged["bonus_xp"] = 100

    # Add/map semantic_rules fields
    merged["semantic_result"] = semantic_doc.get("result")
    merged["animation"] = semantic_doc.get("animation")
    merged["sound"] = semantic_doc.get("sound")
    merged["phrase"] = semantic_doc.get("phrase")
    merged["priority"] = semantic_doc.get("priority", 0)
    merged["active"] = semantic_doc.get("active", True)
    merged["flashcard_set"] = semantic_doc.get("flashcardSet")

    # Map cards -> required_tags (only if creating new, existing tags preserved)
    if not existing_combo:
        merged["required_tags"] = semantic_doc.get("cards", [])

    # Migration metadata
    merged["_migrated_from_semantic"] = True
    merged["_migrated_at"] = datetime.utcnow().isoformat()
    merged["_original_semantic_id"] = semantic_doc.get("_id")

    return merged


def run_migration(
    client: MongoClient,
    db_name: str,
    dry_run: bool = True,
    rollback: bool = False,
) -> Dict[str, Any]:
    """
    Execute the migration.

    Args:
        client: MongoDB client
        db_name: Database name
        dry_run: If True, only simulate (no writes)
        rollback: If True, restore from backup

    Returns:
        Stats dict with migration results
    """
    db: Database = client[db_name]
    combo_coll: Collection = db[COMBO_COLLECTION]
    semantic_coll: Collection = db[SEMANTIC_COLLECTION]
    timestamp = get_timestamp()
    backup_name = f"{COMBO_COLLECTION}_backup_{timestamp}"

    stats = {
        "dry_run": dry_run,
        "rollback": rollback,
        "backup_name": backup_name,
        "semantic_docs_found": 0,
        "semantic_docs_valid": 0,
        "semantic_docs_invalid": 0,
        "merged_into_existing": 0,
        "created_new_combo": 0,
        "skipped": 0,
        "errors": [],  # type: list[str]
    }

    print(MIGRATION_BANNER)
    print(f"Database:        {db_name}")
    print(f"Source:          {SEMANTIC_COLLECTION}")
    print(f"Target:          {COMBO_COLLECTION}")
    print(f"Backup:          {backup_name}")
    print(f"Mode:            {'DRY RUN (no changes)' if dry_run else 'APPLYING CHANGES' if not rollback else 'ROLLBACK'}")
    print("-" * 50)

    if rollback:
        return _rollback_migration(db, combo_coll, stats)

    # ========== STEP 1: Create backup of ar_combinations ==========
    print("\n[STEP 1] Creating backup...")
    if not dry_run:
        existing_count = combo_coll.count_documents({})
        if existing_count > 0:
            combo_coll.aggregate([{"$out": backup_name}])
            print(f"  Backup created: {backup_name} ({existing_count} docs)")
        else:
            print(f"  ar_combinations is empty — skipping backup copy")
    else:
        existing_count = combo_coll.count_documents({})
        print(f"  [DRY RUN] Would backup {existing_count} docs to {backup_name}")

    # ========== STEP 2: Read all semantic_rules ==========
    print("\n[STEP 2] Reading semantic_rules collection...")
    all_semantic = list(semantic_coll.find({}))
    stats["semantic_docs_found"] = len(all_semantic)
    print(f"  Found {len(all_semantic)} semantic_rules documents")

    if len(all_semantic) == 0:
        print("\n  No semantic_rules to migrate. Migration complete.")
        return stats

    # ========== STEP 3: Migrate each document ==========
    print("\n[STEP 3] Migrating documents...")
    processed_ids: set = set()

    for doc in all_semantic:
        doc_id = doc.get("_id", "unknown")

        # Validate
        is_valid, error_msg = validate_semantic_doc(doc)
        if not is_valid:
            stats["semantic_docs_invalid"] += 1
            stats["skipped"] += 1
            print(f"  SKIP  {doc_id}: {error_msg}")
            stats["errors"].append(f"{doc_id}: {error_msg}")
            continue

        stats["semantic_docs_valid"] += 1
        cards = doc.get("cards", [])

        # Idempotency: skip if already migrated (has migration marker with same original id)
        if combo_coll.find_one({"_original_semantic_id": str(doc_id)}):
            stats["skipped"] += 1
            print(f"  SKIP  {doc_id}: already migrated (idempotency check)")
            continue

        # Find matching ar_combinations
        existing = find_matching_combo(combo_coll, cards)
        merged = build_merged_doc(doc, existing)

        if dry_run:
            action = "MERGE" if existing else "CREATE"
            print(f"  [DRY] {action:6s} {doc_id} -> "
                  f"{merged.get('combo_id', '?')} "
                  f"(cards={cards[:2]}{'...' if len(cards) > 2 else ''})")
        else:
            if existing:
                # Upsert: update existing combo with new semantic fields
                filter_query = {"combo_id": existing["combo_id"]}
                # Only set (don't overwrite) semantic fields — existing fields untouched
                update_ops = {
                    "$set": {
                        "semantic_result": merged["semantic_result"],
                        "animation": merged["animation"],
                        "sound": merged["sound"],
                        "phrase": merged["phrase"],
                        "priority": merged["priority"],
                        "active": merged["active"],
                        "flashcard_set": merged["flashcard_set"],
                        "_migrated_from_semantic": True,
                        "_migrated_at": merged["_migrated_at"],
                        "_original_semantic_id": str(doc_id),
                    }
                }
                combo_coll.update_one(filter_query, update_ops)
                stats["merged_into_existing"] += 1
                print(f"  MERGED {doc_id} -> {existing['combo_id']}")
            else:
                # Insert new combo
                del merged["_id"]  # Let MongoDB assign
                combo_coll.insert_one(merged)
                stats["created_new_combo"] += 1
                print(f"  CREATED new combo for {doc_id}")

    # ========== STEP 4: Drop semantic_rules collection ==========
    print("\n[STEP 4] Dropping semantic_rules collection...")
    if not dry_run:
        if semantic_coll.count_documents({}) > 0:
            semantic_coll.drop()
            print(f"  Dropped: {SEMANTIC_COLLECTION}")
        else:
            print(f"  Collection already empty — nothing to drop")
    else:
        print(f"  [DRY RUN] Would drop {SEMANTIC_COLLECTION}")

    # ========== STEP 5: Cleanup old backups (older than 7 days) ==========
    if not dry_run:
        _cleanup_old_backups(db, backup_name)

    # ========== SUMMARY ==========
    print("\n" + "=" * 50)
    print("MIGRATION SUMMARY")
    print("=" * 50)
    print(f"  semantic_rules found:    {stats['semantic_docs_found']}")
    print(f"  valid docs:             {stats['semantic_docs_valid']}")
    print(f"  invalid/skipped:        {stats['semantic_docs_invalid'] + stats['skipped']}")
    print(f"  merged into existing:   {stats['merged_into_existing']}")
    print(f"  created as new combo:   {stats['created_new_combo']}")
    print(f"  total processed:        {stats['semantic_docs_valid']}")
    if stats["errors"]:
        print(f"  errors:                 {len(stats['errors'])}")
        for err in stats["errors"][:5]:
            print(f"    - {err}")

    if dry_run:
        print("\n  Run with --apply to execute migration.")

    return stats


def _rollback_migration(
    db: Database, combo_coll: Collection, stats: Dict[str, Any]
) -> Dict[str, Any]:
    """Restore ar_combinations from backup and recreate semantic_rules."""
    import re as re_module

    print("\n[ROLLBACK] Looking for backup collections...")
    all_collections = db.list_collection_names()

    # Find most recent backup
    backups = [c for c in all_collections if re_module.match(r"ar_combinations_backup_\d{8}_\d{6}", c)]
    if not backups:
        print("  No backup found. Cannot rollback.")
        stats["errors"].append("No backup found for rollback")
        return stats

    latest_backup = sorted(backups)[-1]
    print(f"  Found backup: {latest_backup}")

    # Drop current ar_combinations
    combo_coll.drop()
    print(f"  Dropped current {COMBO_COLLECTION}")

    # Copy backup back
    db[latest_backup].aggregate([{"$out": COMBO_COLLECTION}])
    restored_count = db[COMBO_COLLECTION].count_documents({})
    print(f"  Restored {restored_count} documents to {COMBO_COLLECTION}")

    # Recreate semantic_rules from migrated combo docs (reverse)
    migrated_docs = list(combo_coll.find({"_migrated_from_semantic": True}))
    if migrated_docs:
        db.create_collection(SEMANTIC_COLLECTION)
        semantic_coll = db[SEMANTIC_COLLECTION]

        for doc in migrated_docs:
            sr_doc = {
                "_id": doc.get("_original_semantic_id"),
                "cards": doc.get("required_tags", []),
                "result": doc.get("semantic_result"),
                "animation": doc.get("animation"),
                "sound": doc.get("sound"),
                "phrase": doc.get("phrase"),
                "priority": doc.get("priority", 0),
                "active": doc.get("active", True),
                "flashcardSet": doc.get("flashcard_set"),
            }
            semantic_coll.insert_one(sr_doc)
        print(f"  Recreated {len(migrated_docs)} semantic_rules documents")

    stats["rollback_restored"] = restored_count
    stats["rollback_semantic_recreated"] = len(migrated_docs)
    return stats


def _cleanup_old_backups(db: Database, current_backup: str) -> None:
    """Remove backup collections older than 7 days (keep current one)."""
    import re

    cutoff = datetime.utcnow() - timedelta(days=7)
    cutoff_str = cutoff.strftime("%Y%m%d_%H%M%S")

    all_collections = db.list_collection_names()
    backups = [c for c in all_collections if re.match(r"ar_combinations_backup_\d{8}_\d{6}", c)]

    removed = 0
    for backup in backups:
        if backup == current_backup:
            continue
        # Extract timestamp from backup name
        ts_match = re.search(r"ar_combinations_backup_(\d{8}_\d{6})", backup)
        if ts_match and ts_match.group(1) < cutoff_str:
            db[backup].drop()
            removed += 1
            print(f"  Removed old backup: {backup}")

    if removed > 0:
        print(f"  Cleaned up {removed} old backup(s)")
    else:
        print(f"  No old backups to clean up")


# ========== CLI ENTRY POINT ==========

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Migrate semantic_rules into ar_combinations",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  Dry run (default):
    python -m database.migrations.migrate_semantic_to_combinations

  Apply migration:
    python -m database.migrations.migrate_semantic_to_combinations --apply

  Rollback to previous backup:
    python -m database.migrations.migrate_semantic_to_combinations --rollback
        """,
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply changes (default is dry-run)",
    )
    parser.add_argument(
        "--rollback",
        action="store_true",
        help="Rollback migration using most recent backup",
    )
    parser.add_argument(
        "--db",
        default=None,
        help="Override database name (default: from .env or 'edu_platform')",
    )
    args = parser.parse_args()

    # Load environment
    env_path = backend_dir / ".env"
    load_dotenv(env_path)

    mongo_url = os.getenv("MONGO_URL")
    if not mongo_url:
        raise RuntimeError(
            "MONGO_URL is not set. Please set it in your .env file or environment."
        )

    db_name = args.db or os.getenv("MONGO_DB", "edu_platform")

    # Connect to MongoDB
    client = MongoClient(
        mongo_url,
        tls=True,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=10_000,
    )

    try:
        # Verify connection
        client.admin.command("ping")
        print(f"\nConnected to MongoDB: {db_name}")
    except Exception as e:
        print(f"\nFailed to connect to MongoDB: {e}")
        return 1

    try:
        stats = run_migration(
            client,
            db_name,
            dry_run=not args.apply and not args.rollback,
            rollback=args.rollback,
        )

        # Exit code: 0 if no errors, 1 if errors occurred
        if stats.get("errors"):
            return 1
        return 0

    finally:
        client.close()
        print("\nMongoDB connection closed.")


if __name__ == "__main__":
    raise SystemExit(main())
