# Lesson Player Media Fallback — Progress

**Date:** 2026-09-19
**Scope:** `meet-the-elephant` mobile lesson flow at `390x844`
**Status:** Implemented and verified; changes remain uncommitted and unpushed.

## Change

- Added a RED regression test proving vocabulary preview must remain inside the cinema stage when video is unavailable.
- Moved the existing vocabulary preview thumbnails into the tilted cinema stage, immediately after the video/fallback content and before the stage closing container.
- Added `data-testid="lesson-video-stage"` and `data-testid="video-vocabulary-preview"` only for deterministic behavior verification.
- Preserved existing video fallback card and progression CTA; no lesson redesign or unrelated cleanup.

## Verification

- Focused Vitest: `27 passed` in `src/__tests__/features/LessonPlayerBehaviorBugs.test.tsx`.
- RED phase confirmed before production edit: new preview-placement assertion failed because preview was outside the stage.
- Frontend build: passed (`tsc -b && vite build`). Existing warnings remain for `three-mesh-bvh` export and large chunks.
- Playwright: `npm --prefix frontend run test:e2e -- tests/e2e/lesson-player-mobile-390.spec.ts --project=chromium` — `1 passed`.
- Browser artifact refreshed: `frontend/test-artifacts/video-fixed.png`; preview thumbnails render inside purple cinema stage and CTA remains visible.
- Existing test stderr includes expected jsdom microphone limitations and friendly-error-path logs; no test failures.

## Files touched for this task

- `frontend/src/features/courses/components/lesson/LessonVideoSection.tsx`
- `frontend/src/__tests__/features/LessonPlayerBehaviorBugs.test.tsx`
- `frontend/test-artifacts/video-fixed.png`

## 2026-09-20 follow-up

- YouTube sources now render a poster-first card with `▶ Xem video`; the `youtube-nocookie` iframe mounts only after that gesture.
- Poster fallback order: YouTube thumbnail, lesson thumbnail, resolved vocabulary image, then emoji/media fallback. A blocked iframe shows retry and external YouTube actions while the existing Continue CTA remains available.
- Existing server recording fallback was retained. Capability-selected WebM, OGG, and MP4 recordings now upload with a matching filename extension.
- RED evidence: poster-first test initially failed because the iframe mounted on first render; MP4 upload test initially failed because the file name was `recording.webm`.
- Verification: 63 focused lesson/media/audio/speech tests passed; frontend build passed. Existing build warnings remain for `three-mesh-bvh`, dynamic/static `PetViewer3D`, and large chunks.
- E2E remains blocked: backend startup reached settings validation after installing declared `langchain-openai`, then failed because local `backend/.env` lacks `SECRET_KEY`, `SUPABASE_PROJECT_URL`, and `DEFAULT_FRONTEND_ORIGIN`. No backend code or configuration was changed.

## Final 2026-09-20 verification

- Video: YouTube lessons use a poster-first experience. The fallback chain is YouTube thumbnail, lesson thumbnail, vocabulary visual, then emoji. The normalized `youtube-nocookie` iframe mounts only after an explicit `▶ Xem video` gesture; Supabase media URLs resolve through the existing asset resolver. Retry and external-link fallback remain available without blocking lesson progression, and the vocabulary preview remains inside `lesson-video-stage`.
- Audio / Nghe mẫu: pronunciation playback uses `getAssetCandidateUrls(item.audio)[0]`; the image/audio mapping defect is fixed, existing `AudioService` fallback behavior is retained, and repeated playback is controlled.
- Pronunciation: opening, listening/recording, and processing states remain distinct. Friendly speech-error mapping and event-listener cleanup are in place. Existing server pronunciation fallback remains available, and MediaRecorder uploads use a filename extension matching the selected MP4, OGG, or WebM MIME type.
- Mobile: Lexi chatbot offset prevents overlap, guest-mode protected calls are handled, and the `390x844` lesson flow is verified.
- Playwright final run: `tests/e2e/lesson-player-mobile-390.spec.ts` at `390x844` — `1 passed` in `23.3s`.
- Unit regression final run: `32 passed` in `src/__tests__/features/LessonPlayerBehaviorBugs.test.tsx`. The earlier `63` focused-test result remains separate evidence from the preceding verification run.
- Build final run: `tsc -b && vite build` — passed.
- Environment: frontend and backend development servers were stopped by the system because of low RAM after verification completed; this is not a test failure.
