# backend/services/wikipedia_service.py
"""Live Wikipedia summaries with a write-through Qdrant cache."""
import html
import re
from dataclasses import dataclass
from typing import Optional
import httpx, logging
from settings import settings
from services.content_safety_service import check_text

logger = logging.getLogger(__name__)

_STYLE_TAG_RE = re.compile(r"<style[^>]*>.*?</style>", re.DOTALL | re.IGNORECASE)
_TAG_RE = re.compile(r"<[^>]*>")


def _strip_html(raw: str) -> str:
    """Strip HTML tags, style fragments, and unescape entities."""
    text = _STYLE_TAG_RE.sub(" ", raw)
    text = _TAG_RE.sub(" ", text)
    text = html.unescape(text)
    text = re.sub(r"\s+([.,;:!?])", r"\1", text)  # tidy space-before-punctuation
    return re.sub(r"\s+", " ", text).strip()

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

    async def fetch_definitions(self, term: str) -> Optional[str]:
        """Wiktionary fallback: English definitions blob for non-entity words.

        Pipeline (research RQ2): data["en"] only -> keep groups with
        language == "English" (exclude Translingual/foreign) -> per group keep
        the first <=WIKTIONARY_MAX_SENSES non-empty definitions[].definition ->
        strip all HTML -> join into one blob capped at WIKTIONARY_TEXT_MAX_CHARS.
        """
        title = term.strip().replace(" ", "_")
        url = f"https://en.wiktionary.org/api/rest_v1/page/definition/{title}"
        try:
            async with self._default_client() as client:
                resp = await client.get(url)
        except Exception as exc:
            logger.warning(f"[Wiki] Wiktionary fetch failed for {term!r}: {exc}")
            return None
        if resp.status_code != 200:
            return None
        data = resp.json()
        groups = [g for g in data.get("en", []) if g.get("language") == "English"]
        senses: list[str] = []
        for group in groups:
            pos = str(group.get("partOfSpeech") or "").strip()
            picked = 0
            for definition in group.get("definitions", []):
                text = _strip_html(str(definition.get("definition") or ""))
                if not text:
                    continue  # skip empty senses
                senses.append(f"{pos}: {text}" if pos else text)
                picked += 1
                if picked >= settings.WIKTIONARY_MAX_SENSES:
                    break
        if not senses:
            return None
        blob = " ".join(senses)
        return blob[: settings.WIKTIONARY_TEXT_MAX_CHARS]

    async def lookup_with_cache(self, word: str) -> dict:
        qdrant = await self._get_qdrant()
        cached = await qdrant.get_wiki_doc(word)
        if cached and cached.get("safety_label") == "clean" and cached.get("text"):
            return {"summary": cached["text"], "title": f"wiki:{word.lower()}",
                    "url": cached.get("source_url"), "cached": True,
                    "source_type": cached.get("source_type") or "wikipedia_summary"}
        summary = await self.fetch_summary(word)
        if summary is not None:
            text = summary.extract[: settings.WIKI_SUMMARY_MAX_CHARS]
            label = "clean" if check_text(text).ok else "review"
            await qdrant.upsert_wiki_documents(
                [{"word": word, "text": text, "safety_label": label,
                  "source_url": summary.url, "source_type": "wikipedia_summary"}])
            if label != "clean":
                return {"summary": None, "title": None, "url": None, "cached": False,
                        "source_type": "wikipedia_summary"}
            return {"summary": text, "title": summary.title, "url": summary.url,
                    "cached": False, "source_type": "wikipedia_summary"}
        # Fallback: Wiktionary definitions (404 or type != "standard" on both wikis).
        definitions = await self.fetch_definitions(word)
        if definitions is None:
            return {"summary": None, "title": None, "url": None, "cached": False,
                    "source_type": "wikipedia_summary"}
        label = "clean" if check_text(definitions).ok else "review"
        source_url = f"https://en.wiktionary.org/wiki/{word.strip().replace(' ', '_')}"
        await qdrant.upsert_wiki_documents(
            [{"word": word, "text": definitions, "safety_label": label,
              "source_url": source_url, "source_type": "wiktionary_definitions"}])
        if label != "clean":
            return {"summary": None, "title": None, "url": None, "cached": False,
                    "source_type": "wiktionary_definitions"}
        return {"summary": definitions, "title": word.strip(), "url": source_url,
                "cached": False, "source_type": "wiktionary_definitions"}