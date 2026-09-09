# backend/services/games_vocab_service.py
"""
Vocabulary source for topic-based mini-games.

Merge strategy (approved design 2026-09-05):
1. The learner's own notebook entries matching the topic (personalized).
2. Seed vocabulary for the topic (aligned with momo course themes) as
   fallback filler — a topic round is ALWAYS playable, never empty.

No XP decisions here — games award XP via the idempotent
POST /gamification/xp-event pipeline (backend-authoritative).
"""

from __future__ import annotations

import json
import random
from pathlib import Path
from typing import Any, Dict, List
from urllib.parse import quote

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

# 8 words per topic, aligned with momo course themes (Home / Nature / School&Food / Animals)
# and the public game-card assets under frontend/public/assets/game-cards/.
SEED_VOCAB: Dict[str, List[Dict[str, str]]] = {
    "animals": [
        {"word": "elephant", "translation_vi": "con voi"},
        {"word": "lion", "translation_vi": "sư tử"},
        {"word": "monkey", "translation_vi": "con khỉ"},
        {"word": "fish", "translation_vi": "con cá"},
        {"word": "bird", "translation_vi": "con chim"},
        {"word": "rabbit", "translation_vi": "con thỏ"},
        {"word": "bear", "translation_vi": "con gấu"},
        {"word": "duck", "translation_vi": "con vịt"},
        {"word": "penguin", "translation_vi": "chim cánh cụt"},
        {"word": "turtle", "translation_vi": "con rùa"},
        {"word": "owl", "translation_vi": "con cú"},
        {"word": "pig", "translation_vi": "con heo"},
        {"word": "cow", "translation_vi": "con bò"},
        {"word": "horse", "translation_vi": "con ngựa"},
    ],
    "home": [
        {"word": "house", "translation_vi": "ngôi nhà"},
        {"word": "family", "translation_vi": "gia đình"},
        {"word": "mother", "translation_vi": "mẹ"},
        {"word": "father", "translation_vi": "bố"},
        {"word": "door", "translation_vi": "cái cửa"},
        {"word": "table", "translation_vi": "cái bàn"},
        {"word": "bed", "translation_vi": "cái giường"},
        {"word": "chair", "translation_vi": "cái ghế"},
        {"word": "kitchen", "translation_vi": "căn bếp"},
        {"word": "window", "translation_vi": "cửa sổ"},
        {"word": "sofa", "translation_vi": "ghế sofa"},
        {"word": "lamp", "translation_vi": "cái đèn"},
        {"word": "garden", "translation_vi": "khu vườn"},
        {"word": "clock", "translation_vi": "đồng hồ"},
    ],
    "nature": [
        {"word": "sun", "translation_vi": "mặt trời"},
        {"word": "tree", "translation_vi": "cái cây"},
        {"word": "water", "translation_vi": "nước"},
        {"word": "flower", "translation_vi": "bông hoa"},
        {"word": "sky", "translation_vi": "bầu trời"},
        {"word": "rain", "translation_vi": "cơn mưa"},
        {"word": "leaf", "translation_vi": "chiếc lá"},
        {"word": "stone", "translation_vi": "hòn đá"},
        {"word": "cloud", "translation_vi": "đám mây"},
        {"word": "moon", "translation_vi": "mặt trăng"},
        {"word": "star", "translation_vi": "ngôi sao"},
        {"word": "river", "translation_vi": "dòng sông"},
        {"word": "mountain", "translation_vi": "ngọn núi"},
        {"word": "grass", "translation_vi": "bãi cỏ"},
    ],
    "school_food": [
        {"word": "book", "translation_vi": "quyển sách"},
        {"word": "pencil", "translation_vi": "bút chì"},
        {"word": "apple", "translation_vi": "quả táo"},
        {"word": "rice", "translation_vi": "cơm"},
        {"word": "milk", "translation_vi": "sữa"},
        {"word": "bag", "translation_vi": "cái cặp"},
        {"word": "pen", "translation_vi": "cây bút"},
        {"word": "cake", "translation_vi": "bánh kem"},
        {"word": "banana", "translation_vi": "quả chuối"},
        {"word": "bread", "translation_vi": "bánh mì"},
        {"word": "egg", "translation_vi": "quả trứng"},
        {"word": "juice", "translation_vi": "nước ép"},
        {"word": "ruler", "translation_vi": "thước kẻ"},
        {"word": "notebook", "translation_vi": "quyển vở"},
    ],
}

TOPIC_ALIASES = {
    "animals": "animals",
    "animal": "animals",
    "home": "home",
    "family": "home",
    "nature": "nature",
    "school_food": "school_food",
    "school": "school_food",
    "food": "school_food",
}

# ── Real-asset manifest (built by scripts/rebuild_game_vocab_manifest.py) ──
# Media lives in the public Supabase `learnar-assets` bucket (populated by
# scripts/upload_game_media_to_storage.py). Entries carry `storage_path`s the
# service turns into plain CDN URLs — no signing, browser-cacheable. The
# frontend onError chain falls back to local chibi PNGs when offline.
_MANIFEST_PATH = Path(__file__).resolve().parents[1] / "seeds" / "game_vocab_manifest.json"


def _load_manifest() -> tuple[str, Dict[str, Dict[str, Any]]]:
    try:
        raw = json.loads(_MANIFEST_PATH.read_text(encoding="utf-8"))
    except Exception:  # missing file never blocks the games
        return "", {}
    base = str(raw.get("public_base") or "").rstrip("/")
    if not base:
        return "", {}
    index: Dict[str, Dict[str, Any]] = {}
    for entries in (raw.get("topics") or {}).values():
        for entry in entries:
            w = str(entry.get("word") or "").strip().lower()
            if w and entry.get("storage_path"):
                index[w] = entry
    return base, index


MANIFEST_BASE, MANIFEST_INDEX = _load_manifest()


def _resolve_asset(
    entry: Dict[str, Any],
    topic: str,
    word: str,
    translation_vi: str,
    source: str,
) -> Dict[str, Any]:
    """
    Attach bucket CDN media for a manifest entry. The item's own
    word/translation (notebook case, seed case) is preserved — the manifest
    only contributes media, never text.
    """
    item: Dict[str, Any] = {
        "word": word,
        "translation_vi": translation_vi,
        "image_url": image_url_for(word, topic),
        "audio_url": None,
        "source": source,
    }
    if MANIFEST_BASE:
        item["image_url"] = f"{MANIFEST_BASE}/{entry['storage_path']}"
        if entry.get("audio_storage_path"):
            item["audio_url"] = f"{MANIFEST_BASE}/{entry['audio_storage_path']}"
    return item


def normalize_topic(topic: str | None) -> str | None:
    if not topic:
        return None
    return TOPIC_ALIASES.get(topic.strip().lower().replace("-", "_"))


def image_url_for(word: str, topic: str) -> str:
    """Public bucket CDN URL for the chibi game-card (uploaded 2026-09-08,
    scripts/upload_game_media_to_storage.py). The frontend onError chain
    falls back to the same file inside frontend/public when offline."""
    if MANIFEST_BASE:
        return f"{MANIFEST_BASE}/assets/game-cards/{topic}/{quote(word)}.png"
    return f"/assets/game-cards/{topic}/{quote(word)}.png"


async def get_game_vocab(
    db: AsyncSession,
    user_id: str,
    topic: str,
    limit: int = 8,
) -> Dict[str, Any]:
    """
    Personalized + seeded vocabulary for one game round.
    Notebook words first (they carry the child's real progress), then seed
    filler, shuffled, capped at `limit`. Every item carries an image_url.
    """
    topic = normalize_topic(topic)
    if not topic or topic not in SEED_VOCAB:
        return {"topic": topic, "items": [], "source": "unknown_topic"}

    limit = max(4, min(int(limit or 8), 12))

    items: List[Dict[str, Any]] = []
    seen: set[str] = set()

    # 1) Learner's notebook words for this topic (personalized)
    rows = await db.execute(
        text(
            "SELECT word, translation_vi FROM notebook_entries "
            "WHERE user_id = :uid AND topic = :topic "
            "ORDER BY created_at DESC LIMIT :cap"
        ),
        {"uid": str(user_id), "topic": topic, "cap": limit * 2},
    )
    for r in rows.fetchall():
        w = (r[0] or "").strip()
        if not w or w.lower() in seen:
            continue
        seen.add(w.lower())
        items.append({"word": w, "translation_vi": r[1] or "", "source": "notebook", "manifest": MANIFEST_INDEX.get(w.lower())})

    # 2) Seed fallback (dedup, fill to limit) — manifest entry attached when present
    for seed in SEED_VOCAB[topic]:
        if len(items) >= limit:
            break
        if seed["word"].lower() in seen:
            continue
        seen.add(seed["word"].lower())
        items.append(
            {
                "word": seed["word"],
                "translation_vi": seed["translation_vi"],
                "source": "seed",
                "manifest": MANIFEST_INDEX.get(seed["word"].lower()),
            }
        )

    items = items[:limit]

    out: List[Dict[str, Any]] = []
    for it in items:
        entry = it.pop("manifest")
        if entry:
            out.append(_resolve_asset(entry, topic, it["word"], it["translation_vi"], it["source"]))
        else:
            out.append(
                {
                    "word": it["word"],
                    "translation_vi": it["translation_vi"],
                    "image_url": image_url_for(it["word"], topic),
                    "audio_url": None,
                    "source": it["source"],
                }
            )

    return {"topic": topic, "items": out, "source": "merged"}
