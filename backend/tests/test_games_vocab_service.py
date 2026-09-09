# backend/tests/test_games_vocab_service.py
"""
Behavioral tests for the games vocab merge service (topic mini-games).

Uses a fake AsyncSession — only execute()+fetchall() contract is required.
Covers: notebook-first merge, seed fallback, dedup, limit capping,
unknown topic handling, image_url shape.
"""

import pytest

from services.games_vocab_service import (
    SEED_VOCAB,
    get_game_vocab,
    normalize_topic,
)


class FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def fetchall(self):
        return self._rows


class FakeDB:
    def __init__(self, notebook_rows):
        self._rows = notebook_rows

    async def execute(self, _query, _params):
        return FakeResult(self._rows)


@pytest.mark.asyncio
async def test_normalize_topic_aliases():
    assert normalize_topic("Animals") == "animals"
    assert normalize_topic("school-food") == "school_food"
    assert normalize_topic("family") == "home"
    assert normalize_topic("unknown") is None
    assert normalize_topic(None) is None


@pytest.mark.asyncio
async def test_notebook_words_first_then_seed_fills():
    db = FakeDB([("dolphin", "cá heo"), ("elephant", "con voi")])
    data = await get_game_vocab(db, "u-1", "animals", limit=8)
    words = [it["word"] for it in data["items"]]
    assert data["source"] == "merged"
    assert "dolphin" in words            # notebook word included
    assert words.count("elephant") == 1  # no dup between notebook & seed
    assert len(words) == 8               # filled to limit with seed
    dolphin = next(it for it in data["items"] if it["word"] == "dolphin")
    # CDN game-card URL (bucket) — manifest_base always present in dev/prod
    assert dolphin["image_url"].startswith("http") and "game-cards/animals/" in dolphin["image_url"]
    for it in data["items"]:
        # bucket CDN asset OR local game-card fallback (offline env without manifest)
        assert "game-cards/" in it["image_url"] or "supabase" in it["image_url"]
        assert "audio_url" in it


@pytest.mark.asyncio
async def test_empty_notebook_falls_back_to_seed():
    db = FakeDB([])
    data = await get_game_vocab(db, "u-2", "home", limit=6)
    assert len(data["items"]) == 6
    assert all(it["source"] == "seed" for it in data["items"])


@pytest.mark.asyncio
async def test_unknown_topic_returns_empty():
    db = FakeDB([])
    data = await get_game_vocab(db, "u-3", "space", 8)
    assert data["items"] == []
    assert data["source"] == "unknown_topic"


@pytest.mark.asyncio
async def test_limit_capped():
    db = FakeDB([])
    data = await get_game_vocab(db, "u-4", "nature", limit=99)
    assert len(data["items"]) <= 12


@pytest.mark.asyncio
async def test_real_assets_attached_when_manifest_has_word():
    """Words present in the course manifest must carry a real asset URL —
    a local /learnar-assets/ path served by the SPA host (the Supabase
    bucket was never populated; manifest only indexes files on disk)."""
    from services.games_vocab_service import MANIFEST_INDEX
    if not MANIFEST_INDEX:
        pytest.skip("manifest not built in this environment")
    db = FakeDB([])
    data = await get_game_vocab(db, "u-5", "nature", limit=8)
    for it in data["items"]:
        assert it["image_url"]
        assert "audio_url" in it


def test_seed_covers_all_four_topics_with_fourteen_words():
    """Expansion pack 2026-09-06: 14 words per topic (8 base + 6 new)."""
    assert set(SEED_VOCAB.keys()) == {"animals", "home", "nature", "school_food"}
    for topic, words in SEED_VOCAB.items():
        assert len(words) == 14, f"{topic} must have exactly 14 seed words"
        assert all(w["word"] and w["translation_vi"] for w in words)
