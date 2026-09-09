# Upload game media assets to the Supabase `learnar-assets` bucket (public).
#
# What goes up:
#   1. game-cards/{topic}/{word}.png      (56 chibi tiles)      → assets/game-cards/{topic}/{word}.png
#   2. game-themes/{topic}/bg.jpg         (4 topic headers)     → assets/game-themes/{topic}/bg.jpg
#   3. learnar-assets course files        (mom/dad/baby + wav)  → courses/... (same relative path the manifest uses)
#
# Why public URLs: game art is non-sensitive and public-read lets the vocab
# service serve plain CDN URLs — no signing, no expiry, browser-cacheable.
# Local files stay in frontend/public as offline fallback (frontend onError
# chain already prefers whatever the backend returns).
#
# Idempotent: re-running re-uploads (upsert), safe to extend later.
#
# Run:  python scripts/upload_game_media_to_storage.py

import asyncio
import mimetypes
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
FRONTEND_PUBLIC = ROOT / "frontend" / "public"

BUCKET = "learnar-assets"


def read_env() -> tuple[str, str]:
    env = (ROOT / "backend" / ".env").read_text(encoding="utf-8")
    import re

    url = re.search(r"^SUPABASE_PROJECT_URL\s*=\s*(\S+)", env, re.M)
    key = re.search(r"^SUPABASE_SERVICE_ROLE_KEY\s*=\s*(\S+)", env, re.M)
    if not url or not key:
        raise SystemExit("SUPABASE_PROJECT_URL / SUPABASE_SERVICE_ROLE_KEY missing in backend/.env")
    return url.group(1).strip().strip('"'), key.group(1).strip().strip('"')


def collect_files() -> list[tuple[Path, str]]:
    """(local file, storage object path) pairs."""
    pairs: list[tuple[Path, str]] = []

    cards = FRONTEND_PUBLIC / "assets" / "game-cards"
    for png in sorted(cards.glob("*/*.png")):
        pairs.append((png, f"assets/game-cards/{png.parent.name}/{png.name}"))

    themes = FRONTEND_PUBLIC / "assets" / "game-themes"
    for bg in sorted(themes.glob("*/bg.jpg")):
        pairs.append((bg, f"assets/game-themes/{bg.parent.name}/bg.jpg"))

    learnar = FRONTEND_PUBLIC / "learnar-assets"
    for pattern in ("courses/*/lessons/*/vocabulary/*.png", "courses/*/lessons/*/vocabulary/*.wav"):
        for f in sorted(learnar.glob(pattern)):
            pairs.append((f, str(f.relative_to(learnar)).replace("\\", "/")))

    return pairs


async def main() -> None:
    project, key = read_env()
    pairs = collect_files()
    print(f"{len(pairs)} files to upload to bucket '{BUCKET}'")

    ok = fail = 0
    async with httpx.AsyncClient(timeout=60.0) as client:
        sem = asyncio.Semaphore(6)  # gentle concurrency

        async def upload(path: Path, obj: str) -> bool:
            mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
            async with sem:
                r = await client.post(
                    f"{project}/storage/v1/object/{BUCKET}/{obj}",
                    content=path.read_bytes(),
                    headers={"Authorization": f"Bearer {key}", "Content-Type": mime,
                             "x-upsert": "true"},
                )
            if r.status_code < 300:
                print(f"  OK   {obj}")
                return True
            print(f"  ERR  {obj}: {r.status_code} {r.text[:100]}")
            return False

        results = await asyncio.gather(*(upload(p, o) for p, o in pairs))
    ok, fail = sum(results), len(results) - sum(results)
    print(f"Done: {ok} ok, {fail} failed")


if __name__ == "__main__":
    asyncio.run(main())
