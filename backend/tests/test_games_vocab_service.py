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
    for it in data["items"]:
        assert it["image_url"].startswith("/assets/game-cards/animals/")
        assert it["source"] in {"notebook", "seed"}


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


def test_seed_covers_all_four_topics_with_eight_words():
    assert set(SEED_VOCAB.keys()) == {"animals", "home", "nature", "school_food"}
    for topic, words in SEED_VOCAB.items():
        assert len(words) == 8, f"{topic} must have exactly 8 seed words"
        assert all(w["word"] and w["translation_vi"] for w in words)
