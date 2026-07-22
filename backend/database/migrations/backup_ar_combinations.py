"""
Phase 3: MongoDB backup — exports all ar_combinations docs to JSON.
Idempotent: safe to re-run.
"""
from __future__ import annotations

import io
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Fix path so this can run as `python -m database.migrations.backup_ar_combinations`
_BACKEND_DIR = Path(__file__).resolve().parents[2]  # migrations/ -> database/ -> backend/
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

# Force UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import certifi
from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient

BACKUP_DIR = _BACKEND_DIR / "backups"
BACKUP_DIR.mkdir(exist_ok=True)


def get_timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")


def main() -> dict[str, Any]:
    env_path = _BACKEND_DIR / ".env"
    load_dotenv(env_path)

    import os
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

    docs = list(coll.find({}))
    count = len(docs)
    print(f"[BACKUP] Found {count} documents in ar_combinations")

    serializable = []
    for doc in docs:
        d = {}
        for k, v in doc.items():
            if isinstance(v, ObjectId):
                d[k] = str(v)
            elif isinstance(v, datetime):
                d[k] = v.isoformat()
            else:
                d[k] = v
        serializable.append(d)

    timestamp = get_timestamp()
    backup_file = BACKUP_DIR / f"pre_merge_{timestamp}.json"
    payload = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "collection": "ar_combinations",
        "db": db_name,
        "count": count,
        "documents": serializable,
    }

    with open(backup_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    size_bytes = backup_file.stat().st_size
    print(f"[BACKUP] Saved to {backup_file}")
    print(f"[BACKUP] File size: {size_bytes:,} bytes ({size_bytes / 1024:.1f} KB)")

    assert size_bytes > 0, "Backup file is empty — ABORTING"
    assert count > 0, "No documents backed up — ABORTING"
    print("[BACKUP] VERIFIED — safe to proceed with migration")

    return {
        "backup_file": str(backup_file),
        "count": count,
        "size_bytes": size_bytes,
    }


if __name__ == "__main__":
    result = main()
    print(f"\nBACKUP_PATH={result['backup_file']}")
    print(f"DOC_COUNT={result['count']}")
