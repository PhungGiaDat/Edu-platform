# Dictionary + Notebook + Wiki Progress

**Date:** 2026-08-30
**Status:** Complete (CODE_VERIFIED + RUNTIME_VERIFIED at API level; device pass = emulation)
**Scope:** Tra từ (Dictionary) + Sổ tay (Notebook) + hybrid Qdrant/Wikipedia retrieval — backend + mobile-web frontend. Deployment phase skipped by product owner directive.
**Companion:** [spec](../spec/2026-08-30-dictionary-notebook-wiki.md) · [plan](../plan/2026-08-30-dictionary-notebook-wiki.md) · [UI design](../ui-design/2026-08-30-dictionary-notebook-wiki.md) · [research](../../research/20260830_dictionary_notebook_wiki.md)

## Approved decision

Word lookup is the primary dictionary UX backed by hybrid retrieval
(Simple English Wikipedia → English Wikipedia → Wiktionary, cached into
Qdrant, reranked, safety-gated, prompt-hardened). Notebook saves any word
with rich fields (pronunciation/POS/definition_en/wiki_summary) idempotently.
Both surfaces surfaced in learner navigation. Wiki content pinned to ages
5–8 per product owner directive issued during planning.

## Implementation evidence (TDD, commit per task)

| Task | Scope | Commit |
|---|---|---|
| 1 | content_safety_service (profanity gate) | `e292b1b` |
| 2 | prompt_guard (injection hardening) | `eb96adb` |
| 3 | wikipedia_service + Qdrant cache-back | `bed34c3` |
| 3b | Wiktionary definition fallback | `224406a` |
| 4 | retrieval_reranker (0.6 vector + 0.4 lexical) | `de0a1a6` |
| 5 | DictionaryService v2 + `POST /dictionary/lookup` | `e519c49` |
| 6 | Notebook rich fields + idempotent save + migration | `9ceca68` |
| 7 | dictionaryApi client + rich types | `5320f0a` |
| 8 | brandColors tokens + Nunito/DM Sans + clay utilities | `ac929da` |
| 9 | Word-lookup mode + DefinitionCard | `ca77ee7` |
| 10 | Sentence mode + save-any-word chips | `c188442` |
| 11 | Notebook detail dialog | `c473a22` |
| 12 | Sidebar/More-sheet navigation entries | `6b074c4` |
| QA | Taste pre-flight catches (contrast/labels/register) | `39edc65`, `bebcdb8`, `202cc58` |

Notable plan deviations (all reconciled in-session, behavior-preserving):
plain profanity terms added alongside masked entries (masked `f*ck`
normalizes to `fck` and cannot match `fuck` — caught later by review as
ISSUE-001); test fixtures required `type: "standard"`; `upsert_wiki_documents`
accepts `source_type` (needed by 3b); Task-4 test re-vectored so lexical
overlap is the tiebreaker.

## Code review (Phase 4, YOLO) and fixes

Reviewer verdict: CHANGES REQUIRED — 1 Critical, 4 Important, 5 Minor.
All except ISSUE-007 fixed in 4 commits:

| Commit | Issues fixed |
|---|---|
| `6c215df` | ISSUE-001 (Critical): plain-term blocklist + whole-word space-bypass matching; ISSUE-005 regression tests (Scunthorpe/classroom pass) |
| `86bdd3f` | ISSUE-003 IntegrityError → refetch (idempotent race); ISSUE-008 gate pronunciation/POS |
| `9d90d3c` | ISSUE-004 word charset validation + URL quote encoding; ISSUE-006 real title cached; ISSUE-010 JSON parse guard |
| `d75e29e` | ISSUE-002 `.status` attached to API errors (422 blocked-word UX now reachable); ISSUE-009 300ms search debounce |

Deliberately deferred: ISSUE-007 (merge styles inside `shared/components/ui/
Button.tsx`) — the `style` prop replaces variant styles app-wide; changing it
would alter 20+ existing consumers. Flagged as its own task. New code
documents the workaround at each call site.

## Testing evidence (Phase 5, YOLO)

- Backend focused suites (7 files): **103 passed** (content_safety 13,
  prompt_guard 5, wikipedia 12, reranker 5, dictionary 5, notebook_rich 5,
  llm_clients 18) — includes ISSUE-005 regression vectors.
- Frontend focused suites (5 files): **16 passed** (DictionaryPage 6,
  NotebookPage 3, dictionaryApi 3, SidebarNavigation 3, designTokens 1).
- `tsc --noEmit` exit 0 · `npm.cmd run build` exit 0 · `eslint --quiet`
  0 errors (248 pre-existing warnings).
- Full frontend suite: 348 passed / 10 failed — the 10 are the pre-existing
  unrelated set (ARContainerV2, Leaderboard, CourseList, Sentry DSN env, …);
  failing set at HEAD is a strict subset of baseline `c3c01f6`.

## Runtime verification (live backend on :8010, real Supabase Postgres)

**Database migrations applied to `edu_platform` (Supabase):**
- `20260820_01_notebook_tables.sql` — notebook_entries / review_schedules /
  review_history / vocabulary_topics (10 topics seeded, Vietnamese intact)
- `20260830_01_notebook_rich_fields.sql` — 4 rich columns + source CHECK
- `20260830_02_notebook_fk_retarget.sql` — user FKs retargeted
  `auth.users` → `public.users` and `user_id` UUID → VARCHAR (matches the
  convention of 13 existing Postgres domains). Finding: the pre-existing
  notebook API had never persisted — its router imported a non-existent
  `get_db_session` and the ORM engine was never wired into `main.py` lifespan.

**Live journey (API-level, curl/Invoke-RestMethod):**

| Step | Result |
|---|---|
| POST /auth/register | 201, user created |
| POST /auth/login (form) | token OK |
| GET /vocabulary/topics | 10 topics (API previously dead — now live) |
| POST /notebook (new) | **201** |
| POST /notebook (duplicate) | **200**, no second row (idempotent) |
| GET /notebook | total=1, rich fields returned (pronunciation/POS/definition_en) |
| POST /dictionary/lookup `porn` | **422** — children-safety gate live |
| POST /dictionary/lookup `!!!` | **422** — charset/injection defense live |
| POST /dictionary/lookup `elephant` | **503** — designed degradation (LLM cascade unavailable locally); works where `TOKENROUTER_API_KEY` is configured |

**Verification level reached:** CODE_VERIFIED ✓ · RUNTIME_VERIFIED ✓ (API
level) · DEVICE_BROWSER_VERIFIED = **responsive emulation only** (headless
Chromium 390px, 5/5 pass, network-mocked). A real Chrome-Android/Safari-iOS
pass against the deployed environment remains open for graduation acceptance.

## Known limitations / follow-ups

1. `Button` primitive style-drop trap (ISSUE-007) — app-wide a11y risk; needs
   its own task with visual QA across consumers.
2. Floating `AIChatBuddy` overlaps right-edge text at 390px on dictionary
   pages (pre-existing global chrome).
3. Live LLM lookup returns 503 where the model cascade has no reachable key —
   verify on the deployed environment with `TOKENROUTER_API_KEY`.
4. Dictionary lookup LLM path untested end-to-end with a real model response
   in this environment; unit tests cover the contract with mocked LLM.
5. Pre-existing backend collection errors: `tests/test_profile_service.py`,
   `tests/test_promote_cat_vertical_slice_assets.py` (import errors, out of scope).

## LLM provider health + B.AI fallback (2026-08-30 increment)

Product owner request: verify LLM lookup with a real key and add B.AI as a
provider, with a quick ping at startup/before calls to protect UX.

- `services/llm_health.py` (new): provider registry, `GET {base}/models`
  ping (no token burn), `probe_all()` at startup, `record()` from real call
  outcomes, `is_cascade_ready()` cooldown skip, masked `snapshot()`.
- `llm_clients.py`: `get_bai_llm()` factory; cascade order =
  TokenRouter primary → TokenRouter fallbacks → **B.AI `glm-5.3-flash`**;
  providers marked unhealthy inside `LLM_HEALTH_RECHECK_SECONDS` (60s) are
  skipped instantly instead of burning the caller's timeout.
- `main.py` lifespan: startup ping (non-fatal). `GET /api/v1/ai/llm-health`
  (auth) exposes masked statuses. Fixes: `ai_router` was never mounted in
  `main.py` (pre-existing gap — quiz/pronunciation AI endpoints were dead).
- Live evidence (local run with real keys): startup ping
  `tokenrouter=healthy(844ms), bai=healthy(530ms)`; `GET /ai/llm-health` 200
  (both providers healthy, keys masked `***24WW` / `***v6xm`);
  `POST /dictionary/lookup {"word":"elephant"}` → **200**
  (`vi=con voi`, wiki summary present — previously 503);
  `{"word":"sunflower"}` → 200 (`vi=hoa hướng dương`).
- Tests: `test_llm_health.py` (9) + cascade tests in `test_llm_clients.py`
  (4) — combined suite 30 passed; backend focused total now **112**.
- `BAI_API_KEY` added to local `.env` (never committed).

## UX fix round 2 (2026-08-30): Button merge + FAB clearance

- **ISSUE-007 closed** (`b2ef43e`): `Button` now merges variant styles as
  defaults with caller `style` overrides per-property (previously caller
  style replaced the variant object, wiping contrast-critical `color`).
  Audit found only 2 `style`-passing callers; `NotificationSettingsPage`
  neonTeal CTA gained explicit `color: colors.deepSlate` (white on
  `#14B8A6` was ~2.5:1). Tests: `Button.test.tsx` (3).
- **FAB overlap** (`1c2197d`, `e9bb9b8`): dictionary result cards
  (DefinitionCard, SentenceTranslateCard) get mobile right-clearance
  (`pr-[5.5rem]` under 420px) so text never runs under the floating Lexi
  FAB; `DictionaryPage` bottom padding raised to `pb-44` so the save CTA
  clears the FAB zone at max scroll.
- ⚠️ Concurrent-session hazard: another session reset the branch
  (`reset --hard origin/10-days-quick-run` in reflog), orphaning `327ef1c`
  (recovered via cherry-pick as `b2ef43e`) and overwriting
  `AIChatBuddy.tsx` with their own FAB work (`0bb187d fix(chat): reveal
  Lexi mobile FAB`). The FAB component itself is left to that session;
  this fix targets the content side, sized to their clamp-based FAB.

## Scope guard

Full frontend suite failures and the two backend collection errors pre-date
this work and are excluded from this task's acceptance. Deployment phase
skipped by product owner directive; documentation limited to this progress
file plus plan/spec checkbox updates, per directive.
