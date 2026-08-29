# backend/tests/test_wikipedia_service.py
import httpx, pytest
from services.wikipedia_service import WikipediaService, WikiSummary
from services.content_safety_service import ContentSafetyError

class FakeQdrant:
    def __init__(self, cached=None): self.cached = cached; self.upserted = []
    async def get_wiki_doc(self, word): return self.cached
    async def upsert_wiki_documents(self, docs): self.upserted.extend(docs); return len(docs)

def _transport(handler):  # real httpx mocking
    return httpx.AsyncClient(transport=httpx.MockTransport(handler), base_url="https://en.wikipedia.org")

@pytest.mark.asyncio
async def test_fetch_summary_parses_rest_payload():
    svc = WikipediaService()
    def handler(request):
        assert "Elephant" in str(request.url)
        return httpx.Response(200, json={"title": "Elephant", "extract": "Elephants are large mammals.",
                                         "type": "standard",
                                         "content_urls": {"desktop": {"page": "https://en.wikipedia.org/wiki/Elephant"}}})
    svc._client_factory = lambda: _transport(handler)
    s = await svc.fetch_summary("Elephant")
    assert s.extract == "Elephants are large mammals."

@pytest.mark.asyncio
async def test_fetch_summary_returns_none_on_404():
    svc = WikipediaService()
    svc._client_factory = lambda: _transport(lambda req: httpx.Response(404, json={}))
    assert await svc.fetch_summary("zzqqx") is None

@pytest.mark.asyncio
async def test_fetch_summary_treats_malformed_json_as_miss():
    """ISSUE-010: malformed JSON body must degrade to a miss, not raise."""
    svc = WikipediaService()
    svc._client_factory = lambda: _transport(lambda req: httpx.Response(200, content=b"not-json"))
    assert await svc.fetch_summary("zzqqx") is None

@pytest.mark.asyncio
async def test_fetch_definitions_treats_malformed_json_as_none():
    """ISSUE-010: malformed Wiktionary JSON returns None, not raise."""
    svc = WikipediaService()
    svc._client_factory = lambda: httpx.AsyncClient(
        transport=httpx.MockTransport(lambda req: httpx.Response(200, content=b"not-json")),
        base_url="https://en.wiktionary.org")
    assert await svc.fetch_definitions("zzqqx") is None

@pytest.mark.asyncio
async def test_lookup_serves_from_qdrant_cache(monkeypatch):
    fake = FakeQdrant(cached={"text": "Cached fact.", "safety_label": "clean"})
    svc = WikipediaService(qdrant=fake)
    out = await svc.lookup_with_cache("elephant")
    assert out["summary"] == "Cached fact." and out["cached"] is True

@pytest.mark.asyncio
async def test_lookup_fetches_and_caches_clean_content(monkeypatch):
    fake = FakeQdrant(cached=None)
    svc = WikipediaService(qdrant=fake)
    monkeypatch.setattr(svc, "fetch_summary", lambda w: _async(WikiSummary("Elephant", "Big animal.", "http://x")))
    out = await svc.lookup_with_cache("elephant")
    assert out["summary"] == "Big animal." and fake.upserted[0]["safety_label"] == "clean"
    # Title is now stored in the Qdrant payload and returned on cache hits.
    assert fake.upserted[0]["title"] == "Elephant"
    assert out["title"] == "Elephant"

@pytest.mark.asyncio
async def test_lookup_uses_stored_title_on_cache_hit(monkeypatch):
    """Cache hit with a stored title returns the real title, not wiki:word."""
    fake = FakeQdrant(cached={"text": "Cached fact.", "safety_label": "clean",
                               "title": "Elephant (real)"})
    svc = WikipediaService(qdrant=fake)
    out = await svc.lookup_with_cache("elephant")
    assert out["summary"] == "Cached fact." and out["cached"] is True
    assert out["title"] == "Elephant (real)"

@pytest.mark.asyncio
async def test_lookup_uses_fallback_title_when_cache_missing_title(monkeypatch):
    """Old cached points without a 'title' field fall back to wiki:word."""
    fake = FakeQdrant(cached={"text": "Cached fact.", "safety_label": "clean"})
    svc = WikipediaService(qdrant=fake)
    out = await svc.lookup_with_cache("elephant")
    assert out["title"] == "wiki:elephant"
    assert out["cached"] is True

@pytest.mark.asyncio
async def test_lookup_flags_unsafe_wiki_text(monkeypatch):
    fake = FakeQdrant(cached=None)
    svc = WikipediaService(qdrant=fake)
    monkeypatch.setattr(svc, "fetch_summary", lambda w: _async(WikiSummary("X", "this is about porn stuff", "http://x")))
    out = await svc.lookup_with_cache("x")
    assert out["summary"] is None and fake.upserted[0]["safety_label"] == "review"

def _async(v):
    fut = __import__("asyncio").get_event_loop().create_future(); fut.set_result(v); return fut


# ── Task 3b: Wiktionary definition fallback ───────────────────────────────────

WIKTIONARY_PAYLOAD = {
    "en": [
        {"partOfSpeech": "Adjective", "language": "English",
         "definitions": [
             {"definition": 'Possessing <a rel="mw:WikiLink" href="/wiki/beauty">beauty</a>. '
                            '<style data-mw-deduplicate="TemplateStyles:r90144991">'
                            ".mw-parser-output .defdate{font-size:smaller}</style>",
              "examples": []},
             {"definition": "Made <b>beautiful</b>.", "examples": []},
             {"definition": '<link rel="mw:PageProp/Category" href="/wiki/Category:English_adjectives"/>Third sense.',
              "examples": []},
             {"definition": "Fourth sense — should be capped out.", "examples": []},
         ]},
        {"partOfSpeech": "Noun", "language": "English",
         "definitions": [
             {"definition": "A person who is beautiful.", "examples": []},
             {"definition": "", "examples": []},
         ]},
        {"partOfSpeech": "Symbol", "language": "Translingual",
         "definitions": [{"definition": "ISO 639-3 language code for Kirundi", "examples": []}]},
        {"partOfSpeech": "Noun", "language": "Vietnamese",
         "definitions": [{"definition": "Từ tiếng Việt — must be excluded", "examples": []}]},
    ]
}

def _wiktionary_transport():
    return httpx.AsyncClient(
        transport=httpx.MockTransport(lambda req: httpx.Response(200, json=WIKTIONARY_PAYLOAD)),
        base_url="https://en.wiktionary.org")

@pytest.mark.asyncio
async def test_fetch_definitions_strips_html_excludes_foreign_caps_senses():
    svc = WikipediaService()
    svc._client_factory = _wiktionary_transport
    blob = await svc.fetch_definitions("beautiful")
    assert blob is not None
    assert "<" not in blob and "style" not in blob.lower()
    assert "Kirundi" not in blob              # Translingual group excluded
    assert "Từ tiếng Việt" not in blob        # foreign-language group excluded
    assert "Possessing beauty." in blob       # HTML stripped, style fragment removed
    assert "Made beautiful." in blob
    assert "Third sense." in blob
    assert "Fourth sense" not in blob         # capped to WIKTIONARY_MAX_SENSES per POS

@pytest.mark.asyncio
async def test_fetch_definitions_returns_none_on_404():
    svc = WikipediaService()
    svc._client_factory = lambda: httpx.AsyncClient(
        transport=httpx.MockTransport(lambda req: httpx.Response(404, json={})),
        base_url="https://en.wiktionary.org")
    assert await svc.fetch_definitions("zzqqx") is None

@pytest.mark.asyncio
async def test_lookup_falls_back_to_wiktionary_when_summary_is_none(monkeypatch):
    fake = FakeQdrant(cached=None)
    svc = WikipediaService(qdrant=fake)
    # summary None = 404 or type != "standard" on BOTH simple and en Wikipedia
    monkeypatch.setattr(svc, "fetch_summary", lambda w: _async(None))
    monkeypatch.setattr(svc, "fetch_definitions", lambda w: _async("Run means to move quickly."))
    out = await svc.lookup_with_cache("run")
    assert out["summary"] == "Run means to move quickly."
    assert out["source_type"] == "wiktionary_definitions"
    assert fake.upserted[0]["source_type"] == "wiktionary_definitions"
    assert fake.upserted[0]["safety_label"] == "clean"

@pytest.mark.asyncio
async def test_lookup_blocks_unsafe_wiktionary_senses(monkeypatch):
    fake = FakeQdrant(cached=None)
    svc = WikipediaService(qdrant=fake)
    monkeypatch.setattr(svc, "fetch_summary", lambda w: _async(None))
    monkeypatch.setattr(svc, "fetch_definitions", lambda w: _async("this is about porn stuff"))
    out = await svc.lookup_with_cache("run")
    assert out["summary"] is None
    assert fake.upserted[0]["safety_label"] == "review"
    assert fake.upserted[0]["source_type"] == "wiktionary_definitions"

def _summary_chain_transport(simple_status=200, simple_type="standard",
                             en_status=200, en_type="standard"):
    def handler(request):
        url = str(request.url)
        if "simple.wikipedia.org" in url:
            if simple_status != 200:
                return httpx.Response(simple_status, json={})
            return httpx.Response(200, json={
                "title": "Run (simple)", "extract": "Simple extract.", "type": simple_type,
                "content_urls": {"desktop": {"page": "https://simple.wikipedia.org/wiki/Run"}}})
        return httpx.Response(en_status, json={
            "title": "Run", "extract": "English extract.", "type": en_type,
            "content_urls": {"desktop": {"page": "https://en.wikipedia.org/wiki/Run"}}})
    return httpx.AsyncClient(transport=httpx.MockTransport(handler), base_url="https://en.wikipedia.org")

@pytest.mark.asyncio
async def test_fetch_summary_prefers_simple_wikipedia():
    svc = WikipediaService()
    svc._client_factory = lambda: _summary_chain_transport()
    s = await svc.fetch_summary("run")
    assert s is not None and s.extract == "Simple extract."

@pytest.mark.asyncio
async def test_fetch_summary_uses_en_when_simple_missing():
    svc = WikipediaService()
    svc._client_factory = lambda: _summary_chain_transport(simple_status=404)
    s = await svc.fetch_summary("run")
    assert s is not None and s.extract == "English extract."

@pytest.mark.asyncio
async def test_fetch_summary_skips_simple_disambiguation_for_en():
    svc = WikipediaService()
    svc._client_factory = lambda: _summary_chain_transport(simple_type="disambiguation")
    s = await svc.fetch_summary("run")
    assert s is not None and s.extract == "English extract."