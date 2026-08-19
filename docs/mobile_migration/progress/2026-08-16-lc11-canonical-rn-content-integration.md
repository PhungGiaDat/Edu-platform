# LC11 — Canonical React Native Learner Content Integration

## Status

- API integration: **PRODUCTION/API VERIFIED**
- Canonical Course visible through normal learner API: **YES**
- Canonical Lessons consumable through normal learner API: **5/5**
- Production schema-v2 Lessons: **5/5**
- Course cover consumption: **PASS**
- Vocabulary illustrations: **5/5 live read-only backend resolution plus fixture-safe RN consumption**
- Pronunciation audio: **5/5 live read-only backend resolution plus fixture-safe RN playback integration**
- Memory Match: **PASS in focused tests**
- Quiz: **PASS in focused tests**
- LearningSession activity dispatch: **PASS in focused tests**
- Representative Cat Lesson: **PRODUCTION/API SLICE PASS**
- Device runtime: **NOT VERIFIED**
- Expo Web: **LOCAL CORS + AUTH TRANSPORT VERIFIED; POST-LOGIN ACCEPTANCE IS NATIVE-ONLY**
- Playwright: **WEB LIMITATION ACCEPTED; CAT/ALL-FIVE FLOWS REQUIRE RN/NATIVE VALIDATION**
- Supabase Storage / `media_assets`: **UNCHANGED**
- AR / Unity / DQ-10: **UNCHANGED**

## Production canonical content gate

LC11-FK-OWNER created the four missing minimum learner flashcard owners atomically, verified 5/5 owners and 25/25 planned Quiz FKs in a fresh session, and proved a second reconciliation was all `NO_CHANGE`. The new owners contain only required learner fields and existing LC10 learner illustration URLs; no AR tracking rows, physical widths, reference images, models, or other AR metadata were created.

The existing Animals reconciler then published the Course and committed five canonical schema-v2 Lessons, 25 Questions, 50 Options, and five Memory Match items. Fresh readback and the final dry-run passed with zero remaining creates, updates, conflicts, or destructive operations. The generic FastAPI Course list and detail routes returned HTTP 200, exposed all five Lessons, and all 15 production-backed activity hydration requests returned HTTP 200. The verification supplied a read-only in-memory session view and explicitly prevented session persistence.

## Implemented integration

The existing backend DTO boundary now exposes `learn_vocabulary` hydration through authored vocabulary IDs plus LC5 semantic `vocabulary_illustration` and `pronunciation_audio` assets. It reuses `media_assets`, `LearnerAssetService`, the request-scoped `AsyncSession`, and the existing lesson session; no table, ORM mapping, or Alembic revision was added. Resolution prefers an exact Lesson binding, then reuses exactly one course-wide semantic vocabulary binding. This reconciles LC7's cross-Lesson vocabulary references with LC10's one-copy publication without duplicating media.

React Native now consumes backend `thumbnail_url` on Course cards/detail, enters the existing `LearningSessionScreen` for any schema-v2 Lesson, orders activities by backend `order`, starts the existing backend lesson session, and dispatches `learn_vocabulary`, `mini_game`, and `quiz`. The vocabulary renderer displays only the backend-resolved illustration URL, forwards only the backend-resolved audio URL to the existing `expo-av` hook, and submits the existing step-attempt contract after all items. Memory Match still prefers `asset.url` over its legacy content fallback. Quiz correctness remains backend-authoritative.

RN contains no Supabase client, bucket/path construction, filename guessing, or learner-to-AR fallback for these assets. Audio cleanup and repeated playback continue through the existing playback hook.

## Verification

- LC11 RN focused: **15 passed**.
- Relevant LC3/LC4 RN selection: **27 passed**, including all 15 LC11 checks.
- Relevant backend owner/seed/Lesson/Quiz/Game/asset/Course/session/transaction selection: **70 passed**.
- New LC11 TypeScript errors: **0**.
- Current focused TypeScript check: **PASS**.
- Device/runtime smoke: **NOT VERIFIED**.

## Expo Web E2E acceptance attempt — 2026-08-16

- Expo SDK: **54**.
- Web support: **YES** through the existing Expo Web workflow, `react-native-web`, and `react-dom`.
- Web command: `npx expo start --web --no-dev --minify --offline`.
- Bundle result: **PASS** at local `http://127.0.0.1:8081`; production mode renders the learner Auth screen instead of the development-only Unity bridge diagnostic.
- Browser preflight: **1 PASS** in project-local Playwright 1.62.1 Chromium; zero page errors and zero console errors.
- Cat vertical slice: **SKIPPED** because `LC11_WEB_EMAIL` and `LC11_WEB_PASSWORD` were not configured; no credentials were invented and no registration was performed against production.
- All-five smoke: **SKIPPED** for the same reason.
- Read-only production reachability: `/health` HTTP 200 and `/api/v1/courses` HTTP 200 from an escalated network check; authenticated learner UI traversal remains unproven.
- Web test artifacts: `mobile/rn/playwright.config.ts` and `mobile/rn/e2e/lc11-web.spec.ts`; no learner production component or backend code was changed.
- Physical Android: **NOT VERIFIED**; ADB remains at zero connected devices.

## Expo Web CORS checkpoint — 2026-08-17

- Normal Expo Web learner origin: `http://127.0.0.1:8081`.
- FastAPI CORS is configured in `backend/main.py` from `Settings.cors_origins`.
- Production origins come from `ALLOWED_ORIGINS` and `DEFAULT_FRONTEND_ORIGIN`; `DEV_ORIGINS` are included only when `DEBUG=true`.
- Neither `http://localhost:8081` nor `http://127.0.0.1:8081` is present in the checked-in production or development origin defaults. They are distinct CORS origins and would require separate explicit entries.
- Production CORS remains unchanged. For local E2E, the existing `DEBUG=true` backend configuration was given the single dev-only origin `http://127.0.0.1:8081` and Expo Web was run with a process-only `EXPO_PUBLIC_API_URL=http://127.0.0.1:8000` override.
- Local `OPTIONS /api/v1/auth/login` returned HTTP 200 with `Access-Control-Allow-Origin: http://127.0.0.1:8081`.
- The normal AuthScreen received a successful local backend login response. It then failed before navigation because `useAuth` calls `expo-secure-store` directly and Expo Web raised `setValueWithKeyAsync is not a function` while persisting the token.
- No Auth/token semantic change was made. The project accepts Expo Web's native-only SecureStore limitation; learner role, post-login route, CourseList, Cat, and all-five acceptance continue through the supported RN/native path.
- Course behavior, database schema, Storage, Unity, AR, and `frontend-web/**` were unchanged by this checkpoint.

## Safety

Authorized production mutation was limited to four flashcard owners and the canonical LC7 Course/Lesson/Quiz/Game content. Storage, `media_assets`, production schema, Alembic, user progress, sessions, attempts, gamification, AR metadata, Unity, and DQ-10 were not mutated.

## Gate

`LC11 DONE WITH ACCEPTED WEB E2E LIMITATION — RN/NATIVE ACCEPTANCE REMAINS PENDING`

Device runtime remains **NOT VERIFIED**.
