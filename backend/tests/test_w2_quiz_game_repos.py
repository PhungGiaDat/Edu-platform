"""W2: quiz/game repos are Postgres-only (no Mongo fallback).

Verifies:
- QuizRepository and GameRepository use only postgres_pool().fetch().
- No BaseRepository inheritance, no self.collection, no postgres_core_enabled.
- get_by_difficulty returns [] (quiz has no difficulty column).
- Game dynamic clauses build correctly with filters.
"""
import json
import inspect
from unittest.mock import AsyncMock, Mock
from pathlib import Path

import pytest

from repositories.quiz_repository import QuizRepository
from repositories.game_repository import GameRepository


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _patch_pool(monkeypatch, rows=None):
    """Patch postgres_pool() in both modules to return a fake pool.

    Returns the pool mock so callers can inspect ``.fetch.await_args``.
    """
    pool = Mock()
    pool.fetch = AsyncMock(return_value=rows if rows is not None else [])
    # same pool object shared across both modules
    monkeypatch.setattr("repositories.quiz_repository.postgres_pool", Mock(return_value=pool))
    monkeypatch.setattr("repositories.game_repository.postgres_pool", Mock(return_value=pool))
    return pool


# ---------------------------------------------------------------------------
# QuizRepository
# ---------------------------------------------------------------------------

class TestQuizRepository:
    """Postgres-only QuizRepository tests."""

    @pytest.mark.asyncio
    async def test_get_by_flashcard_qr_id_assembles_questions(self, monkeypatch):
        """SQL query runs, rows are assembled into a quiz document."""
        rows = [
            {
                "id": 1,
                "question_id": "q-1",
                "question_text": "What colour is the sky?",
                "question_type": "multiple_choice",
                "correct_answer": "Blue",
                "explanation": "The sky appears blue due to Rayleigh scattering.",
                "time_limit": 30,
                "passing_score": 80,
                "options": json.dumps([
                    {"value": "Blue", "option_order": 1},
                    {"value": "Green", "option_order": 2},
                    {"value": "Red", "option_order": 3},
                ]),
            },
            {
                "id": 2,
                "question_id": "q-2",
                "question_text": "What is 2+2?",
                "question_type": "multiple_choice",
                "correct_answer": "4",
                "explanation": "Basic arithmetic.",
                "time_limit": 30,
                "passing_score": 80,
                "options": json.dumps([
                    {"value": "3", "option_order": 1},
                    {"value": "4", "option_order": 2},
                ]),
            },
        ]
        pool = _patch_pool(monkeypatch, rows)
        repo = QuizRepository()

        result = await repo.get_by_flashcard_qr_id("qr1")

        # document shape
        assert result["flashcard_qr_id"] == "qr1"
        assert len(result["questions"]) == 2
        assert result["time_limit"] == 30
        assert result["passing_score"] == 80

        # question fields
        q1 = result["questions"][0]
        assert q1["id"] == "q-1"
        assert q1["type"] == "multiple_choice"
        assert q1["question_text"] == "What colour is the sky?"
        assert q1["correct_answer"] == "Blue"
        assert q1["explanation"] == "The sky appears blue due to Rayleigh scattering."

        # options parsed from JSON string
        assert q1["options"] == [
            {"value": "Blue", "option_order": 1},
            {"value": "Green", "option_order": 2},
            {"value": "Red", "option_order": 3},
        ]

        # SQL contains jsonb_agg and flashcard_qr_id parameter
        sql = pool.fetch.await_args.args[0]
        assert "jsonb_agg" in sql
        assert "quiz_question_options" in sql
        assert pool.fetch.await_args.args[1] == "qr1"

    @pytest.mark.asyncio
    async def test_get_by_flashcard_qr_id_no_rows(self, monkeypatch):
        """Returns None when no rows."""
        _patch_pool(monkeypatch, [])
        repo = QuizRepository()
        assert await repo.get_by_flashcard_qr_id("qr1") is None

    @pytest.mark.asyncio
    async def test_get_by_difficulty_always_empty(self, monkeypatch):
        """get_by_difficulty returns [] and does not call the database."""
        pool = _patch_pool(monkeypatch, [])
        repo = QuizRepository()
        result = await repo.get_by_difficulty("easy", skip=0, limit=50)
        assert result == []
        pool.fetch.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_count_questions(self, monkeypatch):
        """count_questions delegates to get_by_flashcard_qr_id."""
        rows = [
            {
                "id": 1, "question_id": "q-1", "question_text": "Q1",
                "question_type": "mc", "correct_answer": "A",
                "explanation": "E", "time_limit": 30, "passing_score": 80,
                "options": "[]",
            },
        ]
        _patch_pool(monkeypatch, rows)
        repo = QuizRepository()
        assert await repo.count_questions("qr1") == 1
        # no rows -> 0
        _patch_pool(monkeypatch, [])
        assert await repo.count_questions("qr1") == 0


# ---------------------------------------------------------------------------
# GameRepository
# ---------------------------------------------------------------------------

class TestGameRepository:
    """Postgres-only GameRepository tests."""

    @pytest.mark.asyncio
    async def test_get_by_flashcard_qr_id_no_filters(self, monkeypatch):
        """Dynamic clause building: no filters, just flashcard_qr_id."""
        pool = _patch_pool(monkeypatch, [])
        repo = GameRepository()

        result = await repo.get_by_flashcard_qr_id("qr1")

        assert result == []
        sql = pool.fetch.await_args.args[0]
        args = pool.fetch.await_args.args[1:]
        assert "flashcard_qr_id = $1" in sql
        assert "game_type = $" not in sql
        assert "difficulty = $" not in sql
        assert args == ("qr1",)

    @pytest.mark.asyncio
    async def test_get_by_flashcard_qr_id_with_filters(self, monkeypatch):
        """Dynamic clause building: game_type and difficulty filters."""
        rows = [
            {
                "game_type": "match", "flashcard_qr_id": "qr1",
                "difficulty": "hard", "question": "Match the pairs",
                "image_url": "img.jpg", "correct_answer": "pair",
                "stars_reward": 5, "time_limit": 10,
                "payload": json.dumps({"hint": "Look carefully", "bonus": True}),
            },
        ]
        pool = _patch_pool(monkeypatch, rows)
        repo = GameRepository()

        result = await repo.get_by_flashcard_qr_id("qr1", game_type="match", difficulty="hard")

        assert len(result) == 1
        item = result[0]
        assert item["game_type"] == "match"
        assert item["hint"] == "Look carefully"   # merged from payload
        assert item["bonus"] is True               # merged from payload
        assert "payload" not in item               # popped

        sql = pool.fetch.await_args.args[0]
        args = pool.fetch.await_args.args[1:]
        assert "game_type = $2" in sql
        assert "difficulty = $3" in sql
        assert args == ("qr1", "match", "hard")

    @pytest.mark.asyncio
    async def test_get_by_flashcard_qr_id_payload_not_json(self, monkeypatch):
        """Non-JSON payload is handled gracefully."""
        rows = [
            {
                "game_type": "puzzle", "flashcard_qr_id": "qr1",
                "difficulty": "easy", "question": "Q", "image_url": "",
                "correct_answer": "A", "stars_reward": 1, "time_limit": 5,
                "payload": "not-json",
            },
        ]
        _patch_pool(monkeypatch, rows)
        repo = GameRepository()
        result = await repo.get_by_flashcard_qr_id("qr1")
        assert len(result) == 1
        assert "payload" not in result[0]  # popped after failed parse

    @pytest.mark.asyncio
    async def test_get_by_game_type(self, monkeypatch):
        """get_by_game_type returns filtered rows."""
        rows = [
            {"game_type": "match", "flashcard_qr_id": "qr1", "difficulty": "easy",
             "question": "Q", "image_url": "", "correct_answer": "A",
             "stars_reward": 1, "time_limit": 5, "payload": "{}"},
        ]
        pool = _patch_pool(monkeypatch, rows)
        repo = GameRepository()
        result = await repo.get_by_game_type("match")
        assert len(result) == 1
        assert result[0]["game_type"] == "match"
        sql = pool.fetch.await_args.args[0]
        assert "game_type=$1" in sql

    @pytest.mark.asyncio
    async def test_get_by_difficulty(self, monkeypatch):
        """get_by_difficulty returns filtered rows."""
        rows = [
            {"game_type": "puzzle", "flashcard_qr_id": "qr1", "difficulty": "hard",
             "question": "Q", "image_url": "", "correct_answer": "A",
             "stars_reward": 3, "time_limit": 15, "payload": "{}"},
        ]
        pool = _patch_pool(monkeypatch, rows)
        repo = GameRepository()
        result = await repo.get_by_difficulty("hard")
        assert len(result) == 1
        assert result[0]["difficulty"] == "hard"
        sql = pool.fetch.await_args.args[0]
        assert "difficulty=$1" in sql

    @pytest.mark.asyncio
    async def test_get_all_game_types(self, monkeypatch):
        """get_all_game_types returns distinct list."""
        rows = [
            {"game_type": "match"},
            {"game_type": "puzzle"},
            {"game_type": "quiz"},
        ]
        pool = _patch_pool(monkeypatch, rows)
        repo = GameRepository()
        result = await repo.get_all_game_types()
        assert result == ["match", "puzzle", "quiz"]
        sql = pool.fetch.await_args.args[0]
        assert "SELECT DISTINCT game_type" in sql


# ---------------------------------------------------------------------------
# No-Mongo symbol assertions
# ---------------------------------------------------------------------------

class TestNoMongoSymbols:
    """Verify no Mongo-era symbols survive in the repo files."""

    def _read_source(self, module_name: str) -> str:
        """Read the full source of a repository module."""
        # import the module to get its __file__
        import importlib
        mod = importlib.import_module(module_name)
        return Path(mod.__file__).read_text(encoding="utf-8")

    @pytest.mark.parametrize("module_name,forbidden", [
        ("repositories.quiz_repository", ["BaseRepository", "self.collection"]),
        ("repositories.game_repository", ["BaseRepository", "self.collection"]),
    ])
    def test_no_mongo_symbols(self, module_name, forbidden):
        src = self._read_source(module_name)
        for symbol in forbidden:
            assert symbol not in src, f"{module_name} still contains {symbol!r}"
        # The runtime gate import must be gone.  The docstring may *mention*
        # postgres_core_enabled to document its removal, so check the module
        # namespace instead of the raw source text.
        import importlib
        mod = importlib.import_module(module_name)
        assert not hasattr(mod, "postgres_core_enabled"), \
            f"{module_name} still imports postgres_core_enabled"