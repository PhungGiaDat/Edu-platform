"""
seed_animals_course.py — Upsert Animals Adventure course into MongoDB.

Run from the backend/ directory:
    python -m database.seed.seed_animals_course

Safe to run multiple times. The course is upserted by course_id.
Lesson content (vocabulary, game, activity, quiz, reward) is upserted per lesson.

Usage:
    python -m database.seed.seed_animals_course [--dry-run]
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

# ── Ensure the backend/ directory is on sys.path ──
BACKEND_DIR = Path(__file__).resolve().parents[2]  # .../backend
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv
load_dotenv(BACKEND_DIR / ".env")

import certifi
import pymongo
from core.url_builders import supabase_resolve_placeholders
from models.course_integrity import normalize_course_payload

MONGO_URL = __import__("os").getenv("MONGO_URL")
MONGO_DB = __import__("os").getenv("MONGO_DB", "edu_platform")

if not MONGO_URL:
    raise RuntimeError("MONGO_URL is not set. Check backend/.env")

# ── Sync PyMongo client ──
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
    for field in ("created_at", "updated_at"):
        if field in doc and isinstance(doc[field], str):
            try:
                doc[field] = datetime.fromisoformat(
                    doc[field].replace("Z", "+00:00")
                ).replace(tzinfo=timezone.utc)
            except ValueError:
                pass
    return doc


def upsert_animals_course(seed_path: Path, dry_run: bool = False) -> dict:
    """
    Load animals_adventure.json, normalize it, and upsert into:
      - courses  (by course_id)
      - lesson_sessions  (by lesson_id, per lesson)
    """
    with open(seed_path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    # Resolve Supabase placeholders
    data = supabase_resolve_placeholders(raw)

    # Normalize to generated-course schema
    course = normalize_course_payload(data, strict_generated=True)

    # Strip MongoDB _id if present
    course.pop("_id", None)
    course.setdefault("created_at", datetime.utcnow())
    course.setdefault("updated_at", datetime.utcnow())
    course["is_published"] = False  # Keep unpublished until explicitly published

    print(f"\n[SEED] Course: {course['course_id']} — {course['title']}")
    print(f"       Lessons: {len(course.get('lessons', []))}")

    if dry_run:
        print("[SEED] DRY RUN — no changes written to MongoDB")
        return course

    # Upsert the course document
    result = db["courses"].update_one(
        {"course_id": course["course_id"]},
        {"$set": course},
        upsert=True,
    )
    action = "inserted" if result.upserted_id else "updated"
    print(f"  ✅ courses: {action} (matched={result.matched_count}, modified={result.modified_count})")

    # Upsert each lesson into the same document (lessons are embedded)
    # We track lesson titles for the summary
    lesson_summaries = []
    for lesson in course.get("lessons", []):
        lesson_id = lesson.get("lesson_id", "unknown")
        vocab_count = len(lesson.get("vocabulary", []))
        quiz_count = len(lesson.get("quiz", []))
        has_game = "game" in lesson
        has_activity = "activity" in lesson
        has_reward = "reward" in lesson

        lesson_summaries.append({
            "lesson_id": lesson_id,
            "title": lesson.get("title", ""),
            "vocab": vocab_count,
            "quiz": quiz_count,
            "game": has_game,
            "activity": has_activity,
            "reward": has_reward,
        })

    # Also upsert each lesson as a standalone document in course_lessons collection
    lesson_collection = db["course_lessons"]
    for lesson in course.get("lessons", []):
        lesson_id = lesson.get("lesson_id", "")
        lesson_doc = {
            "lesson_id": lesson_id,
            "course_id": course["course_id"],
            "title": lesson.get("title", ""),
            "title_vi": lesson.get("title_vi", ""),
            "description": lesson.get("description"),
            "order": lesson.get("order", 0),
            "lesson_type": "vocabulary",  # Animals course is vocabulary-focused
            "status": "draft",
            "duration_minutes": lesson.get("duration_minutes", 5),
            "xp_reward": (lesson.get("reward") or {}).get("xp", 50),
            "vocabulary_items": _build_vocabulary_items(lesson),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        result_lesson = lesson_collection.update_one(
            {"lesson_id": lesson_id},
            {"$set": lesson_doc},
            upsert=True,
        )
        l_action = "inserted" if result_lesson.upserted_id else "updated"
        print(f"  ✅ course_lessons.{lesson_id}: {l_action}")

    return course, lesson_summaries


def _build_vocabulary_items(lesson: dict) -> list:
    """
    Map seed vocabulary entries to CourseLesson.MediaAsset / VocabularyItem shape.
    """
    items = []
    for vocab in lesson.get("vocabulary", []):
        image_data = vocab.get("image", {})
        audio_data = vocab.get("audio", {})

        items.append({
            "word_id": f"word_{vocab.get('word_en', '').lower().replace(' ', '_')}",
            "word_en": vocab.get("word_en", ""),
            "word_vi": vocab.get("word_vi", ""),
            "image": {
                "url": f"/{image_data.get('bucket', 'learnar-assets')}/{image_data.get('path', '')}",
                "bucket": image_data.get("bucket", "learnar-assets"),
                "path": image_data.get("path", ""),
                "type": image_data.get("type", "image"),
                "status": image_data.get("status", "ready"),
            },
            "audio": {
                "url": f"/{audio_data.get('bucket', 'learnar-assets')}/{audio_data.get('path', '')}",
                "bucket": audio_data.get("bucket", "learnar-assets"),
                "path": audio_data.get("path", ""),
                "type": audio_data.get("type", "audio"),
                "status": audio_data.get("status", "ready"),
            },
            "difficulty": "easy",
        })
    return items


def main():
    parser = argparse.ArgumentParser(description="Seed Animals Adventure course")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate and print summary without writing to MongoDB",
    )
    args = parser.parse_args()

    base = Path(__file__).parent
    seed_path = base / "animals_adventure.json"

    if not seed_path.exists():
        print(f"❌  Seed file not found: {seed_path}")
        sys.exit(1)

    print("\n[SEED] === Animals Adventure Course ===")
    print(f"[SEED] Source: {seed_path}")
    print(f"[SEED] Target DB: {MONGO_DB}")

    result = upsert_animals_course(seed_path, dry_run=args.dry_run)

    if not args.dry_run:
        course, summaries = result
        print("\n[SEED] Lesson Summary:")
        for s in summaries:
            features = [
                f"{s['vocab']} vocab",
                "game" if s["game"] else None,
                "activity" if s["activity"] else None,
                f"{s['quiz']} quiz",
                "reward" if s["reward"] else None,
            ]
            features_str = ", ".join(f for f in features if f)
            print(f"  • {s['lesson_id']} — {s['title']}: {features_str}")

        total_xp = sum(
            (l.get("reward") or {}).get("xp", 0)
            for l in course.get("lessons", [])
        )
        print(f"\n[SEED] Total course XP: {total_xp}")
        print("\n[SEED] ✅ Animals Adventure course seeded successfully!")
        print("[SEED] To publish: set is_published: true in the course document")
    else:
        print("\n[SEED] Dry run complete. No changes made.")

    client.close()


if __name__ == "__main__":
    main()
