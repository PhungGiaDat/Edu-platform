"""
Phase 4: Field enrichment — adds missing semantic fields with safe defaults
to existing ar_combinations documents.

Preserves ALL existing fields — only $set fields that are absent.
Idempotent: re-running will NOT re-add fields (because of the `if k not in doc` check).
"""
from __future__ import annotations

import io
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Fix path so this can run as `python -m database.migrations.enrich_ar_combinations_defaults`
_BACKEND_DIR = Path(__file__).resolve().parents[2]  # migrations/ -> database/ -> backend/
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

# Force UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import certifi
from dotenv import load_dotenv
from pymongo import MongoClient

DEFAULT_FIELDS = {
    "semantic_result": None,
    "animation": None,
    "sound": None,
    "phrase": None,
    "priority": 0,
    "active": True,
    "flashcard_set": None,
}


def main() -> dict[str, Any]:
    env_path = _BACKEND_DIR / ".env"
    load_dotenv(env_path)

    mongo_url = os.getenv("MONGO_URL")
    if not mongo_url:
        raise RuntimeError(
            "MONGO_URL is not set. Please set it in your .env file or environment."
        )
    db_name = os.getenv("MONGO_DB", "edu_platform")

    client = MongoClient(
        mongo_url,
        tls=True,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=5000,
    )
    db = client[db_name]
    coll = db["ar_combinations"]

    before_count = coll.count_documents({})
    print(f"[ENRICH] Starting. Documents: {before_count}")

    enriched = 0
    enrichment_log = []

    for doc in coll.find({}):
        updates = {k: v for k, v in DEFAULT_FIELDS.items() if k not in doc}
        if updates:
            updates["updated_at"] = datetime.now(timezone.utc)
            coll.update_one({"_id": doc["_id"]}, {"$set": updates})
            enriched += 1
            fields_added = list(updates.keys())
            combo_id = doc.get("combo_id", str(doc["_id"]))
            print(f"[ENRICH] {combo_id}: added {fields_added}")
            enrichment_log.append({
                "combo_id": combo_id,
                "fields_added": fields_added,
            })
        else:
            combo_id = doc.get("combo_id", str(doc["_id"]))
            print(f"[ENRICH] {combo_id}: no enrichment needed")

    after_count = coll.count_documents({})
    print(f"[ENRICH] Done. Enriched {enriched}/{before_count}. Count before={before_count}, after={after_count}")

    assert after_count == before_count, "Document count must not change during enrichment"

    return {
        "before_count": before_count,
        "after_count": after_count,
        "enriched_count": enriched,
        "enrichment_log": enrichment_log,
    }


if __name__ == "__main__":
    main()
