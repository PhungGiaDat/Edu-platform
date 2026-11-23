# Rebuild game-vocab manifest from assets that ACTUALLY exist — now the
# Supabase `learnar-assets` public bucket (populated 2026-09-08 by
# scripts/upload_game_media_to_storage.py, 63 objects).
#
# Output schema (consumed by services/games_vocab_service.py):
#   { "topic": [ { word, translation_vi, storage_path, audio_storage_path }, ... ] }
# storage_path is served as {SUPABASE_PROJECT_URL}/storage/v1/object/public/
# learnar-assets/{storage_path} — plain CDN URL, no signing, browser-cacheable.
#
# Local files under frontend/public stay as the offline fallback (frontend
# onError chain: storage URL → local chibi PNG → topic emoji).
#
# Run:  python scripts/rebuild_game_vocab_manifest.py

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND_PUBLIC = ROOT / "frontend" / "public"
OUTPUT = ROOT / "backend" / "seeds" / "game_vocab_manifest.json"

BUCKET = "learnar-assets"

# words the games already have chibi art for are ALSO uploaded (assets/game-cards/...)
# so the CDN covers every seed word; manifest below indexes the per-course
# vocabulary art which is NOT part of the chibi set.


def read_project_url() -> str:
    env_path = ROOT / "backend" / ".env"
    if env_path.exists():
        m = re.search(r"^SUPABASE_PROJECT_URL\s*=\s*(\S+)", env_path.read_text(encoding="utf-8"), re.M)
        if m:
            return m.group(1).strip().strip('"')
    return "https://YOUR-PROJECT.supabase.co"


def main() -> None:
    project_url = read_project_url()
    manifest: dict[str, list] = {}

    # Per-course word art under learnar-assets (uploaded to the bucket with the
    # same relative path the manifest stores).
    COURSE_TOPICS = {
        "momo-home-family-english-5-7": "home",
        "momo-nature-english-5-7": "nature",
        "momo-school-food-english-5-7": "school_food",
        "animals-adventure": "animals",
    }
    total = 0
    for course_dir in sorted((FRONTEND_PUBLIC / "learnar-assets" / "courses").glob("*")):
        topic = COURSE_TOPICS.get(course_dir.name)
        if not topic:
            continue
        entries: list[dict] = []
        seen: set[str] = set()

        def add_word(word: str, rel_path: str, lesson: str) -> None:
            word = word.strip()
            key = word.lower()
            if not word or key in seen:
                return
            src = FRONTEND_PUBLIC / "learnar-assets" / rel_path
            audio = src.with_suffix(".wav")
            seen.add(key)
            entries.append(
                {
                    "word": word,
                    "translation_vi": "",  # unknown from filename — service keeps seed translation
                    "lesson": lesson,
                    "storage_path": rel_path.replace("\\", "/"),
                    "audio_storage_path": (
                        str(audio.relative_to(FRONTEND_PUBLIC / "learnar-assets")).replace("\\", "/")
                        if audio.exists()
                        else None
                    ),
                }
            )

        for sub in ("vocabulary", "activities", "games"):
            for img in sorted(course_dir.glob(f"lessons/*/{sub}/*.png")):
                if not img.stem.isalpha():
                    continue
                add_word(
                    img.stem,
                    str(img.relative_to(FRONTEND_PUBLIC / "learnar-assets")),
                    img.parent.parent.name.replace("-", " "),
                )

        if entries:
            manifest[topic] = entries
            total += len(entries)
            print(f"{topic}: {len(entries)} bucket-backed files (course {course_dir.name})")

    meta = {
        "bucket": BUCKET,
        "public_base": f"{project_url}/storage/v1/object/public/{BUCKET}/",
        "topics": manifest,
    }
    OUTPUT.write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"wrote {OUTPUT} — {total} entries, base {meta['public_base']}")


if __name__ == "__main__":
    main()
