# backend/tests/test_dictionary_service.py
import json, pytest
from services.dictionary_service import DictionaryService
from services.content_safety_service import ContentSafetyError

LOOKUP_JSON = json.dumps({
    "word": "elephant", "pronunciation": "/ˈel.ə.fənt/", "part_of_speech": "noun",
    "definition_en": "A very large grey animal with a long trunk.",
    "translation_vi": "con voi", "example_sentence": "The elephant drinks water.",
    "wiki_summary": "Elephants are the largest land animals.",
})
TRANSLATE_JSON = json.dumps({"vi": "con voi uống nước", "literalTranslation": "elephant drink water",
                             "contextualNote": "Animals in Vietnamese often take 'con'."})


def _svc(monkeypatch, llm_json, context=None):
    svc = DictionaryService()
    async def fake_context(query, include_wiki=True):
        return context if context is not None else [
            {"text": "Elephants are large land animals.", "score": 0.9,
             "source": "qdrant", "canonical_group": "elephant"}]
    async def fake_invoke(prompt): return llm_json
    monkeypatch.setattr(svc, "_gather_context", fake_context)
    monkeypatch.setattr(svc, "_invoke_llm", fake_invoke)
    return svc


@pytest.mark.asyncio
async def test_lookup_returns_rich_fields(monkeypatch):
    out = await _svc(monkeypatch, LOOKUP_JSON).lookup("elephant")
    assert out["translation_vi"] == "con voi"
    assert out["pronunciation"].startswith("/")
    assert out["wiki_summary"]


@pytest.mark.asyncio
async def test_lookup_blocked_word_raises_safety_error(monkeypatch):
    with pytest.raises(ContentSafetyError):
        await _svc(monkeypatch, LOOKUP_JSON).lookup("p0rn")


@pytest.mark.asyncio
async def test_lookup_wraps_word_in_user_fence(monkeypatch):
    svc = _svc(monkeypatch, LOOKUP_JSON)
    captured = {}
    async def fake_invoke(prompt): captured["p"] = prompt; return LOOKUP_JSON
    monkeypatch.setattr(svc, "_invoke_llm", fake_invoke)
    await svc.lookup("elephant")
    assert "<<<USER_CONTENT>>>" in captured["p"] and "elephant" in captured["p"]


@pytest.mark.asyncio
async def test_translate_keeps_legacy_response_shape(monkeypatch):
    out = await _svc(monkeypatch, TRANSLATE_JSON).translate("The elephant drinks water")
    assert set(out) >= {"original", "translation", "word_breakdown", "related_words", "sources"}
    assert out["translation"]["vi"] == "con voi uống nước"


@pytest.mark.asyncio
async def test_translate_context_survives_rag_outage(monkeypatch):
    out = await _svc(monkeypatch, TRANSLATE_JSON, context=[]).translate("Hello")
    assert out["translation"]["vi"]
