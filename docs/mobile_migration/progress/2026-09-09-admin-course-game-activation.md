# Admin Course & Game Creation Activation — COMPLETED (API-verified)

**Date:** 2026-09-09
**Branch:** `10-days-quick-run` · **Commits:** `1f930ed2` (feat) · `729b45e7` (fix) · `a4aca756` (scripts) · `12f659f7` (course smoke)
**Spec:** `docs/superpowers/specs/2026-09-09-admin-course-game-design.md` (user-approved after UX revision) · **HTML spec:** `2026-09-09-admin-course-game-html-spec.html`
**Research:** `docs/research/20260909_admin_course_game_creation_research.md`

## Status: RUNTIME_VERIFIED (API-level E2E on Supabase) — DEVICE_BROWSER pending

## What shipped

### Course creation (was "chưa họa động" — 5-layer blocker chain)
| Blocker (research) | Fix | Verified |
|---|---|---|
| No teacher account possible via API | `PUT /admin/users/{id}/role` (superuser-only) + `scripts/create_admin_pg.py` | ✅ smoke superuser promoted/created |
| `/admin/courses/:courseId` route missing (blank page) | Route registered → redirects to edit | ✅ tsc pass |
| LexiTransitionOverlay blocked clicks ~1.6s on /admin | Suppressed for all `/admin/*` paths | ✅ overlay test suite passes |
| Port mismatch 8002 vs 8000 | `.env.local` → 8000 (gitignored, local only) | ✅ |
| Backend dropped video_url/images/is_template | Persist `video` JSONB (VideoSchema shape `{title,url,duration_seconds,thumbnail_url}`) + `media` JSONB (`{images:[...]}`) via `_upsert_lesson`; read-side `_lesson_row_for_admin` lifts back | ✅ E2E: round-trip True, images=2 |
| update_course DELETE-all → FK-500 | Per-lesson `INSERT..ON CONFLICT DO UPDATE`, delete only absent ids | ✅ E2E: update → 200 (was 500) |
| is_template silently dropped | Migration column + COURSE_COLUMNS + read default | ✅ E2E: is_template=True round-trip |
| learning-goals 422 (query vs body) | `user_id` moved into `LearningGoalCreate` body | ✅ router import + contract |
| CourseManager errors console-only | Error banner + Retry (load + delete) | ✅ tsc pass |

### Game management (did not exist on either side)
- **Migration** (applied to Supabase, idempotent): `game_topics` / `games` / `game_vocab_items` (+ created_at/updated_at) · `courses.is_template` · seed 4 topics matching frontend slugs exactly (`animals, home, nature, school_food`)
- **Backend API** (teacher-gated): full CRUD games/topics/vocab + base64 upload-media (Supabase `learnar-assets`, pattern = flashcards) · slug derive + 409 · per-game_type config validation (422)
- **Learner**: `GET /games/catalog` (published only) · `GET /games/vocab` prefers admin items (`source=admin`), legacy fallback intact
- **Frontend**: `gamesAdminApi.ts` · `GameManager.tsx` · `GameEditor.tsx` (difficulty presets Dễ/Vừa/Khó → config transform, "Nâng cao" override panel, dropzone upload, inline topic create, live preview) · routes `/admin/games*` · nav "Trò chơi" · i18n en/vi · GamesPage dynamic catalog with hardcoded fallback (never blank)

## Bugs caught by live E2E (would have been silent otherwise)
1. `/admin/games/topics` 404 — dynamic `/{game_id}` route captured "topics" → reordered static-first
2. `game_vocab_items.created_at` missing — service ORDER BY failed → vocab silently fell back to seed → migration repair pass

## Verification summary
- Backend pytest: **767 passed**, 2 skipped, 11 failed — all 11 verified pre-existing at clean HEAD (stash check; WIP areas: momo seed, beanie legacy, profile service, CI drift). 2 WIP test files excluded from collection (import errors unrelated).
- Frontend: `tsc --noEmit` exit 0 · vitest **11 new tests pass** (presets/catalog-fallback/media-roundtrip) · 6 pre-existing failures (AR/asset-recovery/sentry, untouched)
- **E2E games smoke 9/9 on Supabase**: login → topics(4) → create game 201 → dup 409 → vocab 201/409 → bad-config 422 → catalog shows game → vocab `source=admin` → delete 204
- **E2E course smoke 5/5 on Supabase**: create 201 → read-back video_url=True/images=2/is_template=True → update 200 (no FK-500) → delete 204

## Known gaps / next steps
- DEVICE_BROWSER_VERIFIED (mobile browser click-through of admin UI) not yet done — requires `npm run dev` + real browser session; API-level RUNTIME_VERIFIED complete
- Smoke superuser `smoke_admin` (email `smoke-admin@eduar.local`) exists in Supabase for testing — delete or repurpose at will
- `.env.local` port change is local-only (gitignored) — other devs need the same alignment or `start-dev.sh` fix
- coloring engine not admin-configurable in v1 (SVG asset pipeline, documented in spec)
