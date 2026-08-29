# Dictionary + Notebook + Wiki Hybrid Retrieval Contract (Tra từ & Sổ tay)

**Status:** Approved by the product owner on 2026-08-30 (updated for the ages-5–8 wiki directive; implementation evidence in [progress](../progress/2026-08-30-dictionary-notebook-wiki.md)).

## Context

The Tra từ (Dictionary) and Sổ tay (Notebook) surfaces exist end-to-end
(`/dictionary`, `/notebook` in `frontend/src/App.tsx:311-313`;
`backend/api/dictionary.py`, `backend/api/notebook.py` registered in
`backend/main.py`) but have eight confirmed gaps:

1. No navigation links anywhere in `Sidebar.tsx`/`Navbar.tsx` — the feature is
   undiscoverable.
2. "Wiki" today is only the small ingested animal dataset in Qdrant
   (`settings.QDRANT_COLLECTION`), not Wikipedia. There is no live Wikipedia
   retrieval and no cache-back path.
3. Save-to-notebook extracts only the first word of a sentence
   (`DictionaryPage.tsx:51-73`) and persists no rich data.
4. Notebook detail view is a TODO stub (`NotebookPage.tsx:251`).
5. No profanity/vulgar-language gate exists anywhere in the backend, although
   the audience is children aged 5–12.
6. The translate LLM path has no prompt-injection hardening and silently degrades:
   `DictionaryService.translate` calls `rag_service.search(...)` (QdrantRAGService
   only exposes `retrieve(...)`), and `AIService().generate(prompt)` (AIService has
   no `generate` method) — so both retrieval and generation fail into the
   `"[Translation unavailable]"` fallback at runtime.
7. Retrieved chunks (Qdrant vector hits + wiki text) are concatenated into the
   prompt with no reranking stage.
8. The pages use legacy design tokens and emoji-only UI icons, violating the
   approved visual system.

## Decision

Make **word lookup** the primary dictionary UX (definition card with save),
keep **sentence translation with context** as a secondary mode, save **any**
user-selected word with rich data, and back both modes with a **hybrid
retrieval pipeline**: Qdrant corpus + live wiki summaries cached into
Qdrant — **Simple English Wikipedia first (ages 5–8), English Wikipedia
fallback, Wiktionary definitions as the final fallback for common words** —
merged and reranked before LLM prompt assembly, protected by a content-safety
gate and prompt-injection hardening. No API contract of another domain
changes; all response-model changes are additive and optional.

### Navigation entries

- `Sidebar.tsx` gains two links in `fullNavItems`: `/dictionary`
  (`navDictionary` / `navDictionaryShort`, new `dictionary` icon key, inline
  SVG) and `/notebook` (`navNotebook` / `navNotebookShort`, `notebook` icon
  key, inline SVG).
- Both entries are excluded from the mobile bottom bar (it already renders 8
  items + More) and instead appear as auth-gated buttons in the mobile More
  sheet, next to the existing Pets/Stickers buttons.
- `LocaleContext.tsx` gains the four keys in both EN and VI locales
  (`navDictionary`, `navDictionaryShort`, `navNotebook`, `navNotebookShort`;
  VI labels "Tra từ" and "Sổ tay").
- Navbar keeps its current structure; no Navbar cleanup in this program.

### Word Lookup UX (PRIMARY — route `/dictionary`, default mode)

- The page renders a two-mode tab strip: **Tra từ** (default) and
  **Dịch câu**. Tabs use `role="tab"` / `aria-selected` and keyboard
  navigation (arrow keys optional; Tab+Enter minimum).
- Tra từ mode: single-line input (`max_length` 100, enforced client and
  server), submit button "Tra từ", Enter submits.
- Result is a **Definition card** showing: word (Nunito, large),
  pronunciation (IPA), part-of-speech badge, kid-friendly English
  definition, Vietnamese translation (accent color), one example sentence,
  wiki summary excerpt with a "Simple Wikipedia" / "Wikipedia" / "Wiktionary"
  source badge (whichever served), and the corpus sources used.
- Card footer shows attribution: "Nguồn: Wikipedia / Wiktionary (CC BY-SA)"
  linking to the persisted `source_url` when present (license requirement for
  displayed wiki text).
- Wiki-derived text and LLM wording target ages **5–8**: everyday words,
  sentences ≤ 12 words, positive tone.
- Save button on the card: "Lưu vào Sổ tay" → saves the full rich payload
  (see Save flow). After save it shows a confirmed state for ~3s.
- If the backend safety gate rejects the input, the card shows the
  kid-friendly blocked message: "Từ này không phù hợp để tra. Bạn thử từ khác nhé!"
- If Wikipedia/Qdrant/LLM degrade, the card still renders whatever fields
  the backend returned; `translation_vi` is the only required field.
- Lexi mascot appears via `CodexPetSprite`: `waving` in the page header,
  `idle` while loading, `waiting` on error/blocked result.
- All emoji UI icons on this page are replaced by inline SVG icons
  (search, book, sparkle, save, globe, alert).

### Sentence Translation UX (SECONDARY mode)

- Preserves the existing `POST /api/v1/dictionary/translate` request/response
  contract exactly (text ≤ 500, optional context ≤ 1000, `target_lang: "vi"`).
- `word_breakdown` rows render as **clickable word chips**. Clicking a chip
  switches to Tra từ mode and runs a lookup for that word — this is how
  "save any word from a sentence" works.
- The sentence-level save button is removed; saving happens per word via the
  definition card. (Old behavior saved only the first word and is retired.)
- Existing result sections (vi translation, literal translation,
  contextual note, related words) keep their data and gain SVG icons.

### Notebook list + detail (route `/notebook`)

- List behavior (search, topic/difficulty filters, due-cards banner,
  grid/list toggle) is preserved.
- Card click opens **NotebookEntryDetail**: an accessible overlay dialog
  (`role="dialog"`, `aria-modal`, Escape + backdrop close, focus moved in on
  open and restored on close) showing the full record: word, IPA,
  part-of-speech, definition_en, translation_vi, wiki_summary, context,
  source badge, review stats (review_count, next_review_at), and the
  existing delete action (delete remains confirm-gated).
- Legacy rows saved before this feature may have empty rich fields; the
  detail view renders whatever exists and never shows placeholder errors.
- All emoji source icons (`🤖 🃏 ✏️ 📝 📋 🔲 📚`) become inline SVG icons.

### Save flow (any word, rich data)

- Frontend `notebookApi.create` gains optional rich fields (all additive):
  `pronunciation`, `part_of_speech`, `definition_en`, `wiki_summary`, and the
  new source value `"word_lookup"`.
- Backend `NotebookEntryCreate`/`NotebookEntryUpdate`/
  `NotebookEntryResponse` mirror the same optional fields; existing clients
  (RN/Unity reference surfaces) are unaffected because every new field is
  optional and defaults to absent.
- Duplicate save: the table has `UNIQUE(user_id, word)`. Instead of the
  current 500, the backend returns the existing entry with HTTP 200 (201 on
  first create). The frontend treats both as success and shows the confirmed
  state.
- Profanity gate applies to `word`, `translation_vi`, `translation_en`,
  `context` on create and update (HTTP 422 with kid-friendly detail on
  violation).

## Data & retrieval contract

Where each piece lives (all backend, under `backend/`):

| Concern | Module | Contract |
|---|---|---|
| Profanity/vulgarity gate | `services/content_safety_service.py` (new) | `check_text(text) -> SafetyVerdict`, `assert_safe(text, field)` raising `ContentSafetyError`; normalized (lowercase, leetspeak map, punctuation-stripped) matching over a seed EN+VI blocklist |
| Prompt-injection hardening | `services/prompt_guard.py` (new) | `sanitize_user_text(text)` (strip control chars, collapse whitespace, neutralize code fences/injection markers), `wrap_user_content(text)` producing `<<<USER_CONTENT>>>` fences used by every dictionary prompt |
| Live child-friendly wiki + cache | `services/wikipedia_service.py` (new) | `fetch_summary(word)` walks the chain **Simple English Wikipedia** (`simple.wikipedia.org`, ages 5–8 extracts) → **English Wikipedia** — same REST `api/rest_v1/page/summary/{word}` contract (httpx, 8s timeout, `follow_redirects=True`, compliant User-Agent with contact info per Wikimedia UA policy, no API key); only `type == "standard"` summaries are used/cached — disambiguation stubs are not; `lookup_with_cache(word)` → Qdrant cache check → fetch chain → safety check → cache-back with `age_range: "5-8"` |
| Wiktionary fallback | `services/wikipedia_service.py` (same module) | When BOTH wiki summaries are unavailable (404 or `type != "standard"` on simple and en), fetch `en.wiktionary.org/api/rest_v1/page/definition/{term}`: `data["en"]` only, `language == "English"` groups, ≤3 first senses per part of speech, HTML stripped, empty senses skipped, same safety blocklist; feeds the LLM instead of `wiki_summary` (rescues common words like `run`/`happy` — see `docs/research/20260830_dictionary_notebook_wiki.md`) |
| Qdrant cache write/read | `services/qdrant_rag_service.py` (modify) | new `wiki_point_id(word)` (uuid5 of `wiki:{word.lower()}`), `get_wiki_doc(word)`, `upsert_wiki_documents(docs)` writing the shared payload schema (`text`, `doc_id`, `canonical_group="wiki:{word}"`, `topic="wiki"`, `level="A0"`, `age_range="5-8"`, `safety_label`, `source_type="wikipedia_summary"|"wiktionary_definitions"`, `content_hash`, `embedding_model`, `source_url`). Same collection, same server-side embedding model |
| Safety on wiki content | wikipedia_service | flagged extracts are cached with `safety_label="review"` — the existing `retrieve()` filter (`safety_label == "clean"`) excludes them from ALL consumers automatically |
| Reranking | `services/retrieval_reranker.py` (new) | pure function `rerank(query, chunks, top_k=4)`: deterministic blend `0.6 × normalized vector score + 0.4 × lexical token overlap`, dedup by `canonical_group` |
| Dictionary v2 | `services/dictionary_service.py` (rewrite) | `lookup(word)` and repaired `translate(text, context, target_lang)`; both: sanitize → retrieve Qdrant (`retrieve()`) + wiki context → rerank → hardened prompt (ages 5–8 wording: everyday words, sentences ≤ 12 words) → `ModelRouter(role="generator").call_with_fallback(...)` → strict JSON parse → output safety gate |
| API surface | `api/dictionary.py` | new `POST /api/v1/dictionary/lookup` (`LookupRequest{word ≤ 100}` → `LookupResponse`); `/translate` contract unchanged (response gains optional fields only). `ContentSafetyError` → 422; `RuntimeError` from model cascade → 503 |
| Notebook rich fields | migration + models/repo/service/api | `20260830_01_notebook_rich_fields.sql` adds nullable `pronunciation VARCHAR(100)`, `part_of_speech VARCHAR(50)`, `definition_en TEXT`, `wiki_summary TEXT` and extends the `source` CHECK with `'word_lookup'` |
| RAG bot enrichment | `services/agentic_rag_service.py` | automatic: the chatbot retrieves from the same collection, so cached wiki docs flow in; the generator prompt context label changes from "Qdrant animal-document context" to "Qdrant kid-learning context". No chat API contract change |

Retrieval pipeline (both modes):

```text
word/sentence (sanitized, safety-gated)
      ↓
QdrantRAGService.retrieve()  ──┐
                               ├─→ rerank(top_k=4) ──→ hardened LLM prompt ──→ JSON validate ──→ output safety gate
WikipediaService.lookup_with_cache() ─┘   (simple → en → Wiktionary chain;
                                           cache-back into Qdrant on miss)
```

Settings additions (`backend/settings.py`): `WIKI_FETCH_TIMEOUT_SECONDS: float = 8.0`,
`WIKI_SUMMARY_MAX_CHARS: int = 1200`, `WIKI_USER_AGENT: str` (compliant
Wikimedia format with contact info). No new infrastructure, no new
dependencies (httpx is already in `backend/requirements.txt`).

## Visual system

Follows the approved gamification spec palette exactly:

- Style: vibrant, block-based claymorphism; `ClayCard`/`ClayButton`/`ClayBadge`
  from `frontend/src/shared/components/clay/`.
- Primary `#2563EB`, Secondary `#7C3AED`, Accent/CTA `#F59E0B`, Background
  `#EFF6FF`, Foreground `#0F172A` — added to `frontend/src/design-tokens/claymorphic.ts`
  as a new `brandColors` export; legacy tokens stay untouched for other pages.
- Heading font Nunito, body font DM Sans, loaded once via `frontend/index.html`
  stylesheet link (existing per-page `@import`s remain harmless).
- Interaction transitions 150–300ms; visible `:focus-visible` rings on every
  interactive element (tabs, chips, save buttons, detail dialog).
- Emoji must not be used as a UI icon on the dictionary/notebook surfaces or
  the two new nav entries.

## Accessibility contract

- Mode tabs: `role="tablist"/"tab"`, `aria-selected`, `aria-controls`.
- Definition card fields have visible text labels; IPA block is plain text
  (not announced as punctuation noise — wrap in `<span lang="en">`).
- Detail dialog: `role="dialog"`, `aria-modal="true"`, labelled by the word,
  Escape closes, body scroll locked while open, focus restored to the
  triggering card.
- All new SVG icons are `aria-hidden="true"` with adjacent text or
  `aria-label` on the control.
- Mascot states carry accessible labels ("Lexi đang tra từ", etc.).
- `prefers-reduced-motion: reduce` disables mascot animation (built into
  `CodexPetSprite`) and page transitions (CSS media queries).

## Boundaries

- Do NOT change any API contract outside `/dictionary` and `/notebook`.
  `/translate` keeps its request shape; its response only gains optional
  fields. `/notebook` keeps all existing routes and status codes (201 create
  / 200 duplicate / 422 safety violation).
- Do NOT touch `mobile/rn/**` or `mobile/unity/**` (paused surfaces).
- Do NOT introduce Redis/Kafka/microservices/new persistence; Qdrant,
  Supabase Storage, PostgreSQL, and FastAPI keep their current roles.
- Do NOT re-ingest or modify the existing animal dataset or
  `AnimalRAGDocument` typing; wiki docs use a separate generic upsert.
- Do NOT change gamification semantics — saving words awards no XP.
- Do NOT restore emoji icons to satisfy stale tests.

## Acceptance gates

- **CODE_VERIFIED**: focused backend pytest files
  (`tests/test_content_safety.py`, `tests/test_prompt_guard.py`,
  `tests/test_wikipedia_service.py`, `tests/test_retrieval_reranker.py`,
  `tests/test_dictionary_service.py`, `tests/test_notebook_rich_fields.py`)
  pass from `backend/`; focused vitest files (`DictionaryPage`,
  `NotebookPage`, `dictionaryApi`, `SidebarNavigation`, `designTokens`) pass
  from `frontend/`; `npm.cmd run build` (tsc -b + vite) and
  `npm.cmd run lint -- --quiet` exit 0.
- **RUNTIME_VERIFIED**: with backend + frontend dev servers running, a real
  login can (1) reach both pages through the new nav links, (2) look up a
  word and see definition + IPA + wiki summary (badge reads "Simple
  Wikipedia" / "Wikipedia" / "Wiktionary" per serving source), (3) save it to
  the notebook and see it in the list and detail dialog, (4) translate a
  sentence and open a word chip lookup, (5) confirm a blocked word returns the
  kid-friendly message, (6) confirm the wiki summary round-trips through
  Qdrant (second lookup served from cache — visible in backend logs), (7) a
  common word (`run`) returns a Wiktionary-grounded definition instead of a
  disambiguation stub.
- **DEVICE_BROWSER_VERIFIED**: the same journey exercised in a mobile browser
  (or labelled responsive emulation) at ~390px width: bottom nav More sheet
  opens the two new entries, tabs and chips are touch-reachable (≥44px),
  detail dialog is scrollable, no horizontal overflow.

Evidence is appended to `docs/frontend-web/progress/2026-08-30-dictionary-notebook-wiki.md`.
