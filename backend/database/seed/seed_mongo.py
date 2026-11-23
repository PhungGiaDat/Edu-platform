"""
seed_mongo.py — Upsert-safe MongoDB seed script.

Run from the backend/ directory:
    python -m database.seed.seed_mongo

or from backend/database/seed/:
    python seed_mongo.py  (only works if backend/ is in sys.path)

Safe to run multiple times. Existing documents are updated, never duplicated.
Fields not present in the seed file (e.g. vector_embedding) are preserved.
"""
import json
import sys
import os
from pathlib import Path
from datetime import datetime, timezone

# ── Ensure the backend/ directory is on sys.path so we can import settings ──
BACKEND_DIR = Path(__file__).resolve().parents[2]  # .../backend
sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv
load_dotenv(BACKEND_DIR / ".env")

import certifi
import pymongo
from core.url_builders import supabase_resolve_placeholders

MONGO_URL = os.getenv("MONGO_URL")
MONGO_DB  = os.getenv("MONGO_DB", "edu_platform")

if not MONGO_URL:
    raise RuntimeError("MONGO_URL is not set. Check backend/.env")

# ── Synchronous PyMongo client for standalone scripts ──
client = pymongo.MongoClient(
    MONGO_URL,
    tls=True,
    tlsCAFile=certifi.where(),
    serverSelectionTimeoutMS=10_000,
)
db = client[MONGO_DB]
print(f"[SEED] Connected to database: {MONGO_DB}")

# Force UTF-8 output on Windows
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")


def _parse_dates(doc: dict) -> dict:
    """Convert ISO-8601 date strings to datetime objects in-place."""
    for field in ("created_at", "updated_at"):
        if field in doc and isinstance(doc[field], str):
            try:
                doc[field] = datetime.fromisoformat(
                    doc[field].replace("Z", "+00:00")
                ).replace(tzinfo=timezone.utc)
            except ValueError:
                pass
    return doc


def upsert_seed_data(collection_name: str, file_path: Path, unique_key: str) -> None:
    """
    Load JSON seed file and upsert every document into MongoDB.

    - Existing docs (matched by unique_key) are updated via $set.
    - Fields absent from the seed (e.g. vector_embedding) are left untouched.
    - New docs are inserted.
    - ``__SUPABASE_BASE__`` placeholders in any string field are replaced with
      ``settings.SUPABASE_PROJECT_URL`` at load time, so seed JSON files do
      not need to know the deployed Supabase host.
    """
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Resolve env-driven placeholders before walking individual docs.
    data = supabase_resolve_placeholders(data)

    inserted = updated = 0

    for doc in data:
        _parse_dates(doc)

        key_value = doc.get(unique_key)
        if key_value is None:
            print(f"  ⚠️  Skipping doc with missing key '{unique_key}': {doc}")
            continue

        result = db[collection_name].update_one(
            {unique_key: key_value},
            {"$set": doc},
            upsert=True,
        )

        if result.upserted_id:
            inserted += 1
        else:
            updated += 1

    print(
        f"  ✅ '{collection_name}': {inserted} inserted, {updated} updated "
        f"(total {len(data)} documents)"
    )


def upsert_feedback_templates(file_path: Path) -> None:
    """
    Seed feedback templates with composite unique key (category + template).
    This ensures we don't duplicate templates while allowing updates.
    """
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    inserted = updated = 0
    now = datetime.now(timezone.utc)

    for doc in data:
        # Add timestamps if not present
        doc.setdefault("created_at", now)
        doc.setdefault("updated_at", now)
        doc.setdefault("is_active", True)

        # Use category + template as composite unique key
        category = doc.get("category")
        template = doc.get("template")

        if not category or not template:
            print(f"  ⚠️  Skipping feedback template with missing category/template")
            continue

        result = db["feedback_templates"].update_one(
            {"category": category, "template": template},
            {"$set": doc},
            upsert=True,
        )

        if result.upserted_id:
            inserted += 1
        else:
            updated += 1

    print(
        f"  ✅ 'feedback_templates': {inserted} inserted, {updated} updated "
        f"(total {len(data)} documents)"
    )


if __name__ == "__main__":
    base = Path(__file__).parent

    print("\n[SEED] Seeding collections...")
    upsert_seed_data("flashcards",     base / "flashcards.json",      unique_key="qr_id")
    upsert_seed_data("ar_objects",     base / "ar_objects.json",      unique_key="ar_tag")

    # Seed feedback templates (for dynamic pronunciation feedback)
    feedback_templates_path = base / "feedback_templates.json"
    if feedback_templates_path.exists():
        upsert_feedback_templates(feedback_templates_path)
    else:
        print(f"  ⏭️  'feedback_templates': file not found, skipping")

    # Only seed these if the files have meaningful content (non-empty arrays)
    for name, filename, key in [
        ("ai_feedback",    "ai_feedback.json",    "_id"),
        ("mini_game_bank", "mini_game_bank.json", "_id"),
        ("quiz_questions", "quiz_questions.json", "_id"),
    ]:
        fpath = base / filename
        if fpath.exists():
            with open(fpath, "r", encoding="utf-8") as f:
                content = json.load(f)
            if content:
                upsert_seed_data(name, fpath, unique_key=key)
            else:
                print(f"  ⏭️  '{name}': empty file, skipping")
        else:
            print(f"  ⏭️  '{name}': file not found, skipping")

    client.close()

    print("\n[SEED] All collections seeded successfully!")
    print("[SEED] Next steps:")
    print("  1.  cd backend && python -m scripts.generate_embeddings")
    print("  2.  cd backend && python -m scripts.setup_rag_indexes")
    print("  3.  Manually create Atlas Vector Search index in MongoDB Atlas UI:")
    print("      Index name : flashcard_vector_index")
    print("      Collection : edu_platform.flashcards")
    print("      Field path : vector_embedding")
    print("      Dimensions : 3072  (Gemini embedding-001 produces 3072-dim vectors)")
    print("      Similarity : cosine")
    print("")
    print("  ⚠️  IMPORTANT: If you previously created the index with 768 dimensions,")
    print("      you MUST delete it and recreate with 3072 dimensions!")
