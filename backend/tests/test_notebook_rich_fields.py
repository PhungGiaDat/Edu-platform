# backend/tests/test_notebook_rich_fields.py
import pytest
from unittest.mock import AsyncMock
from services.notebook_service import NotebookService
from services.content_safety_service import ContentSafetyError
from api.notebook import _format_entry
from models.notebook_entry import NotebookEntryCreate, EntrySource


def test_create_model_accepts_rich_fields():
    m = NotebookEntryCreate(word="elephant", translation_vi="con voi",
                            source=EntrySource.WORD_LOOKUP, pronunciation="/ˈel.ə.fənt/",
                            part_of_speech="noun", definition_en="Big grey animal.",
                            wiki_summary="Largest land animal.")
    assert m.source == EntrySource.WORD_LOOKUP and m.pronunciation == "/ˈel.ə.fənt/"


def test_format_entry_includes_rich_fields():
    row = {"id": "x", "user_id": "u", "word": "w", "translation_vi": "t", "source": "word_lookup",
           "pronunciation": "/w/", "part_of_speech": "noun", "definition_en": "d", "wiki_summary": "s",
           "created_at": "2026-01-01T00:00:00Z", "review_count": 0, "ease_factor": 2.5, "interval_days": 0}
    out = _format_entry(row)
    assert out["pronunciation"] == "/w/" and out["wiki_summary"] == "s"


@pytest.mark.asyncio
async def test_get_or_create_returns_existing_on_duplicate():
    repo = AsyncMock()
    repo.get_by_word = AsyncMock(return_value={"id": "existing", "word": "elephant"})
    svc = NotebookService(repo)
    entry, created = await svc.get_or_create_entry(user_id="u", word="elephant", translation_vi="con voi", source="word_lookup")
    assert created is False and entry["id"] == "existing"
    repo.create.assert_not_called()


@pytest.mark.asyncio
async def test_get_or_create_creates_when_absent():
    repo = AsyncMock()
    repo.get_by_word = AsyncMock(return_value=None)
    repo.create = AsyncMock(return_value={"id": "new", "word": "elephant"})
    svc = NotebookService(repo)
    entry, created = await svc.get_or_create_entry(user_id="u", word="elephant", translation_vi="con voi", source="word_lookup")
    assert created is True and repo.create.called


@pytest.mark.asyncio
async def test_unsafe_word_rejected():
    repo = AsyncMock()
    svc = NotebookService(repo)
    with pytest.raises(ContentSafetyError):
        await svc.get_or_create_entry(user_id="u", word="p0rn", translation_vi="x", source="word_lookup")
