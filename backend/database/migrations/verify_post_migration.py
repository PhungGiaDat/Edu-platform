"""
Phase 5: Verification — confirm post-migration state of ar_combinations.
"""
from __future__ import annotations

import io
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Fix path
_BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import certifi
from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient
import json


def serialize_doc(doc: dict) -> dict:
    result = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            result[k] = str(v)
        elif isinstance(v, datetime):
            result[k] = v.isoformat()
        else:
            result[k] = v
    return result


def main():
    env_path = _BACKEND_DIR / ".env"
    load_dotenv(env_path)

    mongo_url = os.getenv("MONGO_URL")
    if not mongo_url:
        raise RuntimeError("MONGO_URL is not set.")
    db_name = os.getenv("MONGO_DB", "edu_platform")

    client = MongoClient(
        mongo_url,
        tls=True,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=5000,
    )
    db = client[db_name]
    coll = db["ar_combinations"]

    # 1. Count
    total = coll.count_documents({})
    print(f"[VERIFY] Total documents: {total}")
    assert total == 9, f"Expected 9, got {total}"
    print("[VERIFY] Count check PASSED (9)")

    # 2. Full dump of jungle_scene_v1
    jungle = coll.find_one({"combo_id": "jungle_scene_v1"})
    assert jungle is not None, "jungle_scene_v1 not found"
    jungle_s = serialize_doc(jungle)

    print("\n" + "=" * 60)
    print("jungle_scene_v1 — POST-MIGRATION DUMP")
    print("=" * 60)
    print(json.dumps(jungle_s, indent=2, ensure_ascii=False))

    # 3. Check original fields preserved
    original_fields = {
        "combo_id", "description", "required_tags", "model_3d_url",
        "image_2d_url", "center_transform", "combo_mind_url", "texture_url",
        "bonus_xp", "target_order", "created_at", "updated_at"
    }
    missing_original = original_fields - set(jungle.keys())
    if missing_original:
        print(f"\n[VERIFY] MISSING original fields: {missing_original}")
    else:
        print("\n[VERIFY] All 12 original fields PRESERVED")

    # 4. Check new defaults present
    new_fields = {
        "semantic_result": None,
        "animation": None,
        "sound": None,
        "phrase": None,
        "priority": 0,
        "active": True,
        "flashcard_set": None,
    }
    for field, expected in new_fields.items():
        actual = jungle.get(field)
        status = "PASS" if actual == expected else f"FAIL (got {actual!r})"
        print(f"[VERIFY] {field} = {actual!r}  [{status}]")

    # 5. Spot-check 2 random other docs
    spot_ids = ["fruit_basket_v1", "road_trip_v1"]
    print("\n" + "=" * 60)
    print("SPOT-CHECK: other docs")
    print("=" * 60)
    for combo_id in spot_ids:
        doc = coll.find_one({"combo_id": combo_id})
        if doc:
            doc_s = serialize_doc(doc)
            missing = original_fields - set(doc.keys())
            if missing:
                print(f"[VERIFY] {combo_id}: MISSING {missing}")
            else:
                print(f"[VERIFY] {combo_id}: all original fields preserved")
            for field in ["active", "priority", "semantic_result"]:
                print(f"  {field} = {doc.get(field)!r}")
        else:
            print(f"[VERIFY] {combo_id}: NOT FOUND")

    print("\n[VERIFY] All checks complete")


if __name__ == "__main__":
    main()
