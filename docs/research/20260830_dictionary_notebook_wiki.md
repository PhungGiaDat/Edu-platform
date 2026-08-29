# Wiki Retrieval Research — Dictionary/Tra từ (2026-08-30)

**Method:** All endpoint behaviors below were verified with live HTTP calls against `en.wikipedia.org`, `en.wiktionary.org`, `simple.wikipedia.org`, and `vi.wikipedia.org` (August 29–30, 2026), plus the current Wikimedia policy pages. JSON snippets are verbatim (trimmed) from live responses.

---

## RQ1 — Wikipedia REST summary endpoint: coverage, `type` field, redirects, rate limits, UA policy

### Findings

**Endpoint under test:** `GET https://en.wikipedia.org/api/rest_v1/page/summary/{title}`

**Live behavior for common non-entity words** (the exact failure mode the plan worried about is real and predictable):

| Query | Result | Key JSON |
|---|---|---|
| `run` | 200 — disambiguation page | `"type":"disambiguation"`, `"description":"Topics referred to by the same term"`, `"extract":"Run(s) or RUN may refer to:"` |
| `happy` | 200 — redirect resolved to a real article | `"type":"standard"`, `titles.normalized:"Happy"`, `titles.canonical:"Happiness"`, full 3-sentence extract |
| `Mercury` | 200 — disambiguation page | `"type":"disambiguation"`, extract lists planet/element/mythology |

So for verbs/adjectives, two things happen: the API normalizes capitalization (`happy` → `Happy`) and follows wiki-redirects internally (`Happy` → `Happiness`) returning HTTP 200 with the *final* article; if what remains is a disambiguation page, you get a ~10-word extract and `type:"disambiguation"`. The `type` field is present on every 200 response observed on both `en.wikipedia.org` and `simple.wikipedia.org` and is reliable for filtering: treat **only `type == "standard"` as usable wiki content**. (Canonical schema: RESTBase OpenAPI spec at `gerrit.wikimedia.org/plugins/gitiles/mediawiki/services/restbase/+/master/v1/`, linked from the [Wikimedia REST API page](https://www.mediawiki.org/wiki/Wikimedia_REST_API); my direct spec fetch was 403-blocked, but the live `type` values on two wikis confirm `"standard"` and `"disambiguation"`.) Missing titles return 404 with a JSON error body (`"type":"https://mediawiki.org/wiki/HyperSwitch/errors/not_found"`), not HTML.

**Also confirmed by accident:** `https://en.wikipedia.org/api/rest_v1/page/definition/run` returns **404** — the definition endpoint exists *only* on Wiktionary (see RQ2). Don't point it at `en.wikipedia.org`.

**Rate limits — NEW in 2026 and material to the plan.** Wikimedia deployed API-wide rate limiting in 2026 ([Wikimedia APIs/Rate limits](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits)), enforced per client across REST APIs:

| Client class | Limit |
|---|---|
| Unidentified (IP only, no compliant UA) | **10 req/min** |
| Unauthenticated with compliant User-Agent | **200 req/min** |
| Browser (unauthenticated) | 200 req/min |

Errors are HTTP 429/503 with a `Retry-After` header (if absent, wait ≥5s or back off exponentially). Best practice: ≤3 concurrent requests. The page states the limits are "new in 2026 and subject to experimentation and change." For this app's traffic (dictionary lookups, cached into Qdrant), 200 req/min with a compliant UA is far more than enough.

**User-Agent policy is mandatory and enforced** ([Policy:Wikimedia Foundation User-Agent Policy](https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy)): requests with empty or generic UAs (`python-requests/x`, `curl`, `Python-urllib`) "may be blocked" (HTTP 403). Required format: `<client name>/<version> (<contact information>) <library>/<version>`, e.g. `CoolBot/0.0 (https://example.org/coolbot/; coolbot@example.org) generic-library/0.0`. Do not copy a browser UA (treated as malicious). Corroborating anecdote: my own spec fetch via PowerShell's default UA got a hard 403 from Wikimedia's Gerrit during this research — UA-based blocking is real. Browser-JS clients must use the `Api-User-Agent` header instead (not relevant for a FastAPI backend).

**Caching politeness:** Wikimedia endpoints support conditional GETs via `ETag`/`If-None-Match` → 304 ([Conditional requests](https://www.mediawiki.org/wiki/Wikimedia_APIs/Conditional_requests)). Caching into Qdrant already satisfies the spirit of this; storing the ETag for future revalidation is a cheap optional extra.

### Recommendation
**Adopt, with two adjustments.** (1) Keep the endpoint and 8s timeout exactly as planned, but add the explicit acceptance rule: `type == "standard"` → cache as safe wiki summary; `type == "disambiguation"` (or any other value) → treat as *no wiki summary* and trigger the RQ2 fallback. (2) The custom User-Agent is not optional polish — it must contain a contact URL/email in the Wikimedia-specified format, and the client must handle 403 (UA problem) and 429 (back off / degrade to `wiki_summary=""`).

---

## RQ2 — Wiktionary REST definition endpoint: fallback for non-entity words?

### Findings

**Endpoint:** `GET https://en.wiktionary.org/api/rest_v1/page/definition/{term}` (English Wiktionary only; officially described as **experimental** on the [Wikimedia REST API page](https://www.mediawiki.org/wiki/Wikimedia_REST_API): "offers an experimental definition end point… Support for other languages is under discussion").

**Response shape** (live, `beautiful`):

```json
{
  "en": [
    { "partOfSpeech": "Adjective",
      "language": "English",
      "definitions": [
        { "definition": "Possessing <a rel=\"mw:WikiLink\" href=\"/wiki/beauty\">beauty</a>, impressing the eye. <style data-mw-deduplicate=\"TemplateStyles:r90144991\">.mw-parser-output .defdate{font-size:smaller}</style>",
          "examples": ["Anyone who has ever met her thought she was absolutely <b>beautiful</b>."],
          "parsedExamples": [ { "example": "…" } ] } ] },
    { "partOfSpeech": "Noun", "language": "English", "definitions": [ … ] }
  ]
}
```

**Structural caveats, all verified live:**

1. **Top level is keyed by language code, and common words hit many languages.** For `run`: keys `en, nl, got, other, nrm, pl, es, vi, yo` (77 KB payload). For `ass`: keys `en, kw, de, ltg, lv, lb, gv, other, sv`. You **must** select `["en"]` and then keep only groups with `language == "English"` (exclude `Translingual`, whose "definitions" are things like "ISO 639-3 language code for Kirundi").
2. **Definitions are raw HTML fragments**: `<a rel="mw:WikiLink">` links (312 in `run`), `<i>/<b>/<span class="Latn">` mention markup, invisible category `<link rel="mw:PageProp/Category">` tags, `mw:Entity` spans, and even a leaked **`<style>…</style>` CSS fragment** (seen in `beautiful`). Multi-line strings with nested `<ol><li>` sub-sense lists occur (10 in `run`). HTML must be stripped; nested sub-lists flattened or truncated.
3. **Empty definitions exist**: `{"definition": ""}` appears twice in `ass`. Skip empties.
4. **Coverage for the target vocabulary is excellent** — `run` alone yields 135 English definitions across Verb/Noun/Adjective, `beautiful` yields 6 across Adjective/Noun. This is exactly the audience's word class mix.
5. **Vulgar senses: present, and effectively unlabeled in the payload.** In `ass`, the adult senses (buttocks/anus/sex) sit in a second Noun group right after the safe primary sense. Critically, the usage labels are **empty spans** in the API output: `<span class="usage-label-sense" about="#mwt96" typeof="mw:Transclusion"></span>` — the rendered text "(vulgar)", "(slang)" etc. does **not** appear as text (88 label spans in `run`, zero of them carrying visible text; one `parsedExamples` entry even has `"qualifier": ""`). So the endpoint cannot be made child-safe by parsing labels; safety must come from *which* senses you select plus a blocklist on the cleaned text (see RQ5).

### Recommendation
**Adopt as a v1 fallback** — it is the single highest-value fix for the plan's coverage gap, because the words 5–12-year-olds look up (`run`, `happy`, `beautiful`) are precisely the ones Wikipedia answers with disambiguation stubs. Exact pipeline:

```python
data = await fetch_json(f"https://en.wiktionary.org/api/rest_v1/page/definition/{term}")
groups = [g for g in data.get("en", []) if g.get("language") == "English"]  # skip Translingual
senses = []
for g in groups:                      # keep partOfSpeech label g["partOfSpeech"]
    for d in g["definitions"][:3]:    # first senses only (primary senses)
        text = strip_html(d["definition"])   # tags, <style>, entities; flatten \n<ol>
        if text: senses.append((g["partOfSpeech"], text))
```
Join into a `definitions_text` blob (cap ~500–800 chars), run the same normalized blocklist as the wiki path, and pass to the LLM as `wiktionary_definitions` alongside `wiki_summary=""`. Do **not** attempt label-based sense filtering (labels are empty); do **not** expose raw HTML to the LLM or the child.

---

## RQ3 — vi.wikipedia.org for Vietnamese summaries

### Findings
The identical REST contract is live on `vi.wikipedia.org` (verified: `GET https://vi.wikipedia.org/api/rest_v1/page/summary/Ch%C3%B3` → 200, `"type":"standard"`, full Vietnamese extract, `description_source:"central"` i.e. Wikidata description in Vietnamese, same `content_urls`/`thumbnail` structure). Same UA/rate-limit rules apply. However, using it requires the *Vietnamese article title* for an English word — resolvable only via interlanguage links (`https://en.wikipedia.org/w/api.php?action=query&prop=langlinks&titles={canonical}&lllang=vi&format=json`), and verbs/adjectives (`run`, `happy`) generally have no Vietnamese article at all, so coverage would collapse exactly where Wiktionary shines.

### Recommendation
**Skip for v1.** The LLM's `translation_vi` field fully covers the Vietnamese need at zero extra latency and zero mapping complexity. If a verified-source Vietnamese sentence is ever wanted (v2+), use the langlinks call above to resolve the vi title, then the vi summary endpoint — but don't build it now.

---

## RQ4 — httpx + Wikimedia etiquette

### Findings
- **httpx does not follow redirects by default** ([Quickstart](https://www.python-httpx.org/quickstart/): "By default, HTTPX will **not** follow redirects for all HTTP methods"). Wikipedia's summary endpoint normally resolves wiki-redirects server-side (`redirect=true` default), but HTTP-level 3xx/normalization edge cases exist; without `follow_redirects=True` you'd surface a 301 to your caller. This is a real plan bug waiting to happen.
- **Timeouts:** httpx has a built-in 5s default network-inactivity timeout; the plan's explicit 8s `timeout=8.0` is compatible and fine. Use `response.raise_for_status()` and catch `httpx.HTTPError` for the graceful-degradation path.
- **Etiquette checklist applicable to this client:** compliant UA with contact info (RQ1), ≤3 concurrent requests, respect `Retry-After` on 429, prefer cached/conditional requests via ETag (RQ1), and cache aggressively — the Qdrant write-back design is exactly what Wikimedia asks for.

### Recommendation
**Adjust one line, keep the rest.** Recommended client config: module-level `httpx.AsyncClient(timeout=8.0, follow_redirects=True, headers={"User-Agent": "<App>/<ver> (<contact-url>; <email>) httpx/<ver>"})`. Map status codes: 200 → parse; 404 → not-found fallback; 403 → log UA-policy warning, degrade; 429/503 → honor `Retry-After`, degrade. No other changes.

---

## RQ5 — Child-safety for live wiki text

### Findings
Wikimedia offers no "safe content" filter or children's mode. The live evidence shows the actual risk profile is narrow and structural: (a) disambiguation pages are content-free stubs ("X may refer to:") — near-zero risk but zero value; (b) the risk concentrates in topically adult *articles* (en.wikipedia) and adult *senses* (en.wiktionary), and in the Wiktionary case the payload gives **no machine-readable label text** to detect them (RQ2), though the primary/first sense is almost always the safe common meaning (`ass` → donkey/animal first, adult senses later). Text-only usage (the plan already excludes images/links) removes the largest exposure surface of live wiki content. One legal obligation does apply: wiki text is CC BY-SA, so attribution must ship with any displayed extract ([Wikimedia APIs/Content reuse](https://www.mediawiki.org/wiki/Wikimedia_APIs); license noted on all API-served content).

### Recommendation
**Keep the plan's blocklist + `safety_label` design, and make it a hard gate, not a label.** Proportional best practice for a graduation project:
1. Only cache/serve content that passed screening: default retrieval filter `safety_label == "safe"`; `"review"` items are stored for the teacher-review queue but never returned to learners.
2. Screen the normalized (`NFKC` + casefold, word-boundary regex) concatenation of `title + description + extract` (and cleaned Wiktionary senses) against a small EN blocklist (sex/drugs/gambling/graphic-violence terms, ~50–100 entries). This is the *only* workable detector for Wiktionary senses given the empty labels.
3. Prefer **first senses only** from Wiktionary (≤3 per POS) — structurally safer.
4. Text-only everywhere (already planned); strip all HTML before LLM and before caching.
5. Attribution: persist `content_urls.desktop.page` and render a "Nguồn: Wikipedia / Wiktionary (CC BY-SA)" link on the card footer.
6. The LLM rewrite (child-friendly system prompt) is a genuine second safety layer — keep it.
7. Optional v2 experiment, not v1: try `https://simple.wikipedia.org/api/rest_v1/page/summary/{title}` first (verified working, same contract, shorter/simpler extracts designed for learners), fall back to `en`. Deferred because coverage is patchier and it doubles the failure surface.

---

## Plan impact

- **Add Wiktionary fallback (highest priority change):** when the summary is 404 *or* `type != "standard"`, call `GET https://en.wiktionary.org/api/rest_v1/page/definition/{term}` and feed ≤3 first-sense English definitions per part of speech as the LLM's grounding instead of `wiki_summary`. This rescues the run/happy/beautiful class of words. *(Adjustment — plan currently degrades straight to `wiki_summary=""`.)*
- **Wiktionary parsing rules:** use `data["en"]` only → filter `language == "English"` (exclude `Translingual` and foreign languages) → strip HTML (including leaked `<style>` fragments, category `<link>` tags, `mw:Entity` spans) → flatten/skip nested `<ol>` sub-senses → skip empty `definition` strings → cap length.
- **Do not parse Wiktionary usage labels:** `(vulgar)`/`(slang)` text is absent from the payload (empty `usage-label-sense` spans). Child-safety = first-sense selection + normalized blocklist on cleaned text. *(Adjustment — any plan assumption of label-based filtering is invalid.)*
- **Cache gate:** only `type == "standard"` summaries are cached as safe wiki content; `disambiguation`/`index`/anything else → fallback path, don't cache the stub extract as a summary.
- **User-Agent must include contact info:** e.g. `EduPlatformDictionary/1.0 (https://github.com/<org>/edu-platform; <contact-email>) httpx/<version>`; generic/`python-requests` UAs risk HTTP 403. Handle 403 and 429 (`Retry-After`, exponential backoff) as graceful-degradation triggers. *(Adjustment — plan says "custom UA" but must specify the compliant format.)*
- **Rate limits are new in 2026:** IP-only clients get 10 req/min; compliant-UA unauthenticated clients get 200 req/min; keep ≤3 concurrent requests; the numbers may change, so treat limits as config, not constants.
- **httpx:** add `follow_redirects=True` (default is `False`); keep `timeout=8.0`; use `raise_for_status()` + catch `httpx.HTTPError`. *(Adjustment — one-line fix, prevents 301 leaks.)*
- **Attribution:** persist `content_urls.desktop.page` and render a CC BY-SA source link on the definition card. *(Adjustment — small but legally required for displayed wiki text.)*
- **vi.wikipedia summaries:** No change (skip v1; LLM `translation_vi` is sufficient; langlinks path documented for v2).
- **ETag revalidation:** No change (optional; store the ETag alongside the cached payload for future freshness checks — Qdrant caching already satisfies caching etiquette).
- **Simple English Wikipedia:** No change for v1 (verified working, same contract; consider as v2 primary source experiment).

## References

- Live endpoint tests (2026-08-29/30): [en:summary/run](https://en.wikipedia.org/api/rest_v1/page/summary/run) · [en:summary/happy](https://en.wikipedia.org/api/rest_v1/page/summary/happy) · [en:summary/Mercury](https://en.wikipedia.org/api/rest_v1/page/summary/Mercury) · [en:page/definition/run → 404](https://en.wikipedia.org/api/rest_v1/page/definition/run) · [wiktionary:definition/run](https://en.wiktionary.org/api/rest_v1/page/definition/run) · [wiktionary:definition/beautiful](https://en.wiktionary.org/api/rest_v1/page/definition/beautiful) · [wiktionary:definition/ass](https://en.wiktionary.org/api/rest_v1/page/definition/ass) · [simple:summary/run](https://simple.wikipedia.org/api/rest_v1/page/summary/run) · [vi:summary/Chó](https://vi.wikipedia.org/api/rest_v1/page/summary/Ch%C3%B3)
- [Wikimedia REST API](https://www.mediawiki.org/wiki/Wikimedia_REST_API) — endpoint catalog; Wiktionary definition endpoint documented as experimental; OpenAPI spec location
- [Wikimedia APIs/Rate limits](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits) — 2026 rate-limit classes (10/min unidentified, 200/min compliant-UA), 429/Retry-After, ≤3 concurrent
- [Policy:Wikimedia Foundation User-Agent Policy](https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy) — mandatory descriptive UA with contact info, 403 enforcement, `Api-User-Agent`
- [Wikimedia APIs/Conditional requests](https://www.mediawiki.org/wiki/Wikimedia_APIs/Conditional_requests) — ETag/If-None-Match caching etiquette
- [Wikimedia APIs](https://www.mediawiki.org/wiki/Wikimedia_APIs) — API catalog + content reuse / licensing pointers
- [httpx Quickstart](https://www.python-httpx.org/quickstart/) — `follow_redirects` default `False`, timeout defaults, `raise_for_status()`

---

## Addendum — 2026-08-30 (product owner directive)

The product owner requires wiki content to suit **children ages 5–8 only**. Effective changes to the recommendations above:

- **Simple English Wikipedia is promoted from "v2 experiment" to v1 PRIMARY source.** Fetch chain: `simple.wikipedia.org/api/rest_v1/page/summary/{title}` → `en.wikipedia.org/...` → Wiktionary definitions. The RQ5.7 coverage caveat stands (simple is patchier), which is exactly why en remains in the chain as fallback.
- Qdrant wiki payload `age_range` set to `"5-8"`; the retrieval filter and RAG-bot enrichment continue to apply unchanged.
- DictionaryService LLM prompts pinned to ages 5–8: everyday words, sentences ≤ 12 words (this is the main lever for age-appropriateness, since the LLM rewrites wiki text for children anyway).
- Frontend source badge distinguishes Simple Wikipedia / Wikipedia / Wiktionary; CC BY-SA attribution unchanged.
