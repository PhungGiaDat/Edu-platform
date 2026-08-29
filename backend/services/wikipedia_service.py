# backend/services/wikipedia_service.py
"""Live Wikipedia summaries with a write-through Qdrant cache."""
from dataclasses import dataclass
from typing import Optional
import httpx, logging
from settings import settings
from services.content_safety_service import check_text

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class WikiSummary:
    title: str
    extract: str
    url: str


class WikipediaService:
    # Kid-first chain: Simple English Wikipedia (ages 5-8) then English Wikipedia.
    BASES = (
        "https://simple.wikipedia.org/api/rest_v1/page/summary",
        "https://en.wikipedia.org/api/rest_v1/page/summary",
    )

    def __init__(self, qdrant=None, client_factory=None):
        self._qdrant = qdrant
        self._client_factory = client_factory  # tests inject MockTransport clients

    async def _get_qdrant(self):
        if self._qdrant is None:
            from services.qdrant_rag_service import QdrantRAGService
            self._qdrant = QdrantRAGService()
        return self._qdrant

    def _default_client(self) -> httpx.AsyncClient:
        if self._client_factory is not None:
            return self._client_factory()
        return httpx.AsyncClient(
            timeout=settings.WIKI_FETCH_TIMEOUT_SECONDS,
            headers={"User-Agent": settings.WIKI_USER_AGENT, "Accept": "application/json"},
            follow_redirects=True,
        )

    async def fetch_summary(self, word: str) -> Optional[WikiSummary]:
        title = word.strip().replace(" ", "_")
        for base in self.BASES:
            try:
                async with self._default_client() as client:
                    resp = await client.get(f"{base}/{title}")
            except Exception as exc:
                logger.warning(f"[Wiki] fetch failed for {word!r} on {base}: {exc}")
                continue
            if resp.status_code == 404:
                continue  # no article here — try the next source
            if resp.status_code in (403, 429, 503):
                logger.warning(f"[Wiki] status {resp.status_code} from {base} — degrade, back off")
                return None
            if resp.status_code != 200:
                continue
            data = resp.json()
            extract = (data.get("extract") or "").strip()
            if not extract or data.get("type") != "standard":
                continue  # disambiguation/other — next source, then Task 3b fallback
            page = ((data.get("content_urls") or {}).get("desktop") or {}).get("page", "")
            return WikiSummary(title=data.get("title") or word, extract=extract, url=page)
        return None

    async def lookup_with_cache(self, word: str) -> dict:
        qdrant = await self._get_qdrant()
        cached = await qdrant.get_wiki_doc(word)
        if cached and cached.get("safety_label") == "clean" and cached.get("text"):
            return {"summary": cached["text"], "title": f"wiki:{word.lower()}",
                    "url": cached.get("source_url"), "cached": True}
        summary = await self.fetch_summary(word)
        if summary is None:
            return {"summary": None, "title": None, "url": None, "cached": False}
        text = summary.extract[: settings.WIKI_SUMMARY_MAX_CHARS]
        label = "clean" if check_text(text).ok else "review"
        await qdrant.upsert_wiki_documents(
            [{"word": word, "text": text, "safety_label": label, "source_url": summary.url}])
        if label != "clean":
            return {"summary": None, "title": None, "url": None, "cached": False}
        return {"summary": text, "title": summary.title, "url": summary.url, "cached": False}