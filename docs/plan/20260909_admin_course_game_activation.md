# Implementation Plan: Admin Course & Game Creation Activation

**Spec:** `docs/superpowers/specs/2026-09-09-admin-course-game-design.md`
**Branch:** `10-days-quick-run` (work directly; no reset; `git fetch` before commit; commit only our files — user WIP exists)
**Mode:** YOLO
**Status:** ✅ COMPLETED 2026-09-09 — commits 1f930ed2 / 729b45e7 / a4aca756 / 12f659f7; progress: `docs/mobile_migration/progress/2026-09-09-admin-course-game-activation.md`

## Tasks

### Stream BE — Backend (backend-specialist)
- [ ] BE1. Alembic migration: `game_topics`, `games`, `game_vocab_items` tables + `courses.is_template` column + seed 4 hardcoded topics (animals, home, nature, school_food)
- [ ] BE2. Course persistence fixes in `admin_repository.py`: write `video` JSONB + `media` JSONB on create/update; replace DELETE+INSERT update with per-lesson upsert (ON CONFLICT) preserving learner progress; persist `is_template`; fix learning-goals `user_id` → body param (`admin.py`)
- [ ] BE3. Admin games API: CRUD `/admin/games` + `/admin/games/topics` + vocab endpoints + upload-media (Supabase, pattern = flashcards upload-image); slug derive + 409; pydantic config validation per game_type
- [ ] BE4. Learner endpoints: `GET /games/catalog` (published only); extend `GET /games/vocab` to prefer `game_vocab_items` with fallback to legacy logic
- [ ] BE5. Teacher role: `POST /admin/users/{user_id}/role` (superuser-only)

### Stream FE — Frontend (frontend-specialist)
- [ ] FE1. Route `/admin/courses/:courseId` (redirect to edit); overlay suppress for `/admin/*`; `.env.local` port 8000; RequireTeacherRole "no permission" message
- [ ] FE2. `lessonToSession`/`sessionToLesson` round-trip for video JSONB/media JSONB shape (match BE2)
- [ ] FE3. `adminGamesApi` service + `GameManager.tsx` + `GameEditor.tsx` (meta/topic/vocab/tuning per game_type/publish) + routes + AdminLayout nav + i18n en/vi
- [ ] FE4. GamesPage dynamic catalog via `GET /games/catalog` with hardcoded fallback; derive daily-ceiling copy from catalog
- [ ] FE5. CourseManager error banner + Retry (replace console.error)

### Stream QA — after both streams
- [ ] QA1. Backend pytest: games CRUD auth/slug/config; vocab fallback regression; course update no-500 with progress; media round-trip; migration up/down
- [ ] QA2. Frontend vitest: GameEditor validation/payload; GamesPage fallback; CourseEditor media round-trip
- [ ] QA3. Reviewer pass + fixes
- [ ] QA4. Docs: progress file + report

## Contract (source of truth = spec §3.2)
Admin: `GET|POST /admin/games`, `PUT|DELETE /admin/games/{id}`, `GET|POST /admin/games/topics`, `PUT /admin/games/topics/{id}`, `GET|POST /admin/games/topics/{id}/vocab`, `PUT|DELETE /admin/games/vocab/{itemId}`, `POST /admin/games/upload-media`
Learner: `GET /games/catalog`, `GET /games/vocab?topic=&limit=` (extended)
game_type enum v1: `drag_match|catch_word|word_scramble|memory_match` (coloring NOT admin-configurable)
Config schemas: drag_match{pair_count≤8,timer_seconds} · catch_word{fall_speed,spawn_interval} · word_scramble{word_count,hint_letters} · memory_match{pair_count,flip_duration_ms}
