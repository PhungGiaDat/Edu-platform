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

import random
from typing import Any, Dict, List

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


def normalize_topic(topic: str | None) -> str | None:
    if not topic:
        return None
    return TOPIC_ALIASES.get(topic.strip().lower().replace("-", "_"))


def image_url_for(word: str, topic: str) -> str:
    """Local game-card asset; SVG chibi fallback if the PNG has not been generated yet."""
    return f"/assets/game-cards/{topic}/{word}.png"


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

    # 1) Learner's notebook words for this topic
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
        items.append(
            {"word": w, "translation_vi": r[1] or "", "image_url": image_url_for(w, topic), "source": "notebook"}
        )

    # 2) Seed fallback (dedup, then fill to limit)
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
                "image_url": image_url_for(seed["word"], topic),
                "source": "seed",
            }
        )

    # 3) Final shuffle — notebook words stay in the pool, order is not predictable
    items = items[:limit]
    random.shuffle(items)
    return {"topic": topic, "items": items, "source": "merged"}
