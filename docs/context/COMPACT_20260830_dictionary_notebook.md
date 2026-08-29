# Context Snapshot — 20260830 (Dictionary/Notebook feature wrap-up)

## Task
Tra từ & Sổ tay (Dictionary + Notebook + Wiki hybrid retrieval) — complete &
upgrade existing feature in `frontend/` + `backend/`; claymorphism vibrant;
mobile webapp; wiki content for ages 5–8.

## Mode
INTERACTIVE (Phases 1–2 gated) → YOLO (Phases 4–5) → deployment SKIPPED,
docs lightweight per product owner directive.

## Phase Progress
| Phase | Status | Key Outcome |
|-------|--------|-------------|
| 1 Planning | ✅ | spec + plan (14 TDD tasks) + research (live-verified wiki APIs) approved |
| 2 Design UI/UX | ✅ | UI design doc: wireframes, states, taste-skill adaptation (product-UI mode) |
| 3 Development | ✅ | Tasks 1–12 + QA pre-flight fixes, commit-per-task |
| 4 Code Review | ✅ | 10 issues found; 9 fixed (deferred ISSUE-007 Button style merge) |
| 5 Testing | ✅ | Backend 103 / Frontend 16 focused; migrations applied; API-level runtime journey verified |
| 6 Deployment | ⏭️ SKIPPED | product owner directive |
| 7 Documentation | ✅ | progress file + plan ticks (81) + spec/README status |

## Key Decisions
- Wiki chain: **simple.wikipedia → en.wikipedia → Wiktionary definitions** (ages 5–8 directive); `type == "standard"` gate; CC BY-SA attribution.
- Safety: plain-term blocklist + whole-word space-bypass matching; `<<<USER_CONTENT>>>` fences; word charset validation; reranker 0.6 vector + 0.4 lexical.
- Notebook save: idempotent (201 new / 200 duplicate / 422 unsafe); rich fields additive.
- ORM wiring: `database.orm_session.get_db_session` via FastAPI Depends; `connect_orm()` added to main.py lifespan (non-fatal).
- DB FKs retargeted `auth.users` → `public.users`, `user_id` UUID → VARCHAR (matches 13 existing domains).
- Models: agent fleet migrated to B.AI (glm-5.3-flash / deepseek-v4-flash / qwen3.8-flash / mimo-v2.5 by role).

## Files Changed (summary)
- Backend new: `services/{content_safety_service,prompt_guard,wikipedia_service,retrieval_reranker}.py` + tests
- Backend rewritten: `services/dictionary_service.py` (v2), `api/dictionary.py` (+/lookup), `api/notebook.py`, `api/vocabulary_topics.py`, `main.py` (ORM lifespan)
- Backend extended: `services/qdrant_rag_service.py`, `services/notebook_service.py`, `repositories/notebook_repository.py`, `models/{dictionary,notebook_entry}.py`, `settings.py`
- Migrations: `20260830_01_notebook_rich_fields.sql`, `20260830_02_notebook_fk_retarget.sql` (+ base 20260820_01 applied to Supabase `edu_platform`)
- Frontend: `types/dictionary.ts`, `services/dictionaryApi.ts`, `features/dictionary/**`, `features/notebook/**`, `pages/DictionaryPage.tsx` (rewrite), `pages/NotebookPage.tsx`, `app/components/Sidebar.tsx`, `contexts/LocaleContext.tsx`, `design-tokens/claymorphic.ts` (brandColors), `index.html`, `styles/claymorphic-utilities.css`
- Docs: `docs/frontend-web/{spec,plan,ui-design,progress}/2026-08-30-dictionary-notebook-wiki.md`, `docs/research/20260830_dictionary_notebook_wiki.md`, README index

## Current Phase
All phases complete (deployment skipped by directive).

## Active Issues / Blockers
- ISSUE-007 (Button `style` prop replaces variant styles) deferred — app-wide change, needs own task.
- `AIChatBuddy` overlaps right-edge text at 390px (pre-existing).
- Live LLM lookup 503 locally without reachable `TOKENROUTER_API_KEY` — verify on deployed env.
- DEVICE_BROWSER: emulation-only pass; real Chrome-Android/Safari-iOS pending for graduation gate.
- Pre-existing: 10 frontend suite failures (unrelated set), 2 backend collection errors (test_profile_service, test_promote_cat_vertical_slice_assets).

## Next Steps
1. Deploy backend with `TOKENROUTER_API_KEY` + run real-browser mobile pass (graduation acceptance).
2. Schedule ISSUE-007 Button fix task with visual QA across consumers.
3. Optional: AIChatBuddy 390px overlap fix.

---
*Auto-compacted 2026-08-30 after Phases 3–7 of the Dictionary/Notebook feature.*
