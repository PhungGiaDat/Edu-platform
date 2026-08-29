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

@pytest.mark.asyncio
async def test_lookup_flags_unsafe_wiki_text(monkeypatch):
    fake = FakeQdrant(cached=None)
    svc = WikipediaService(qdrant=fake)
    monkeypatch.setattr(svc, "fetch_summary", lambda w: _async(WikiSummary("X", "this is about porn stuff", "http://x")))
    out = await svc.lookup_with_cache("x")
    assert out["summary"] is None and fake.upserted[0]["safety_label"] == "review"

def _async(v):
    fut = __import__("asyncio").get_event_loop().create_future(); fut.set_result(v); return fut