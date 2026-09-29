# Course navigation, quiz audio and sentence practice

Implementation date: 2026-09-28. Branch: `10-days-quick-run`. Commit and push authorized on 2026-09-29; production verification follows the deployment.

## Delivered behavior

- Catalog cards and their Start/Continue buttons open the existing `/courses/:id` page. Learners choose one of its lesson cards before entering LessonPlayer.
- Quiz playback uses the authored vocabulary audio when its English question text exactly matches a vocabulary word. Sentences retain full-text TTS; questions without English audio text use the Vietnamese prompt. Pending playback blocks repeated taps; failure shows a retry message.
- Functional lesson icons use the existing `Msr` component with Material Symbols Rounded. Artwork and vocabulary illustrations remain. The font is bundled at `frontend/public/fonts/material-symbols-rounded.woff2`, with its Apache 2.0 license, and preloaded from the app origin. Browser CDN requests were denied by the local environment; this was not evidence of an upstream Google Fonts defect. Self-hosting follows [Google's Material Symbols guidance](https://developers.google.com/fonts/docs/material_symbols).
- Vocabulary shows “Bé hãy phát âm theo câu sau” beside the existing animated Lexi sprite. Sample playback, recognition and logged `target_text` use the same trimmed sentence; items without a sentence retain word practice. Lexi reacts to playback, listening and success. Audio and microphone actions cannot overlap.
- Sentence similarity no longer admits an isolated target word as the full sentence. Whole-token matching remains relaxed for single-word practice. Example: `butterfly` for `It is a butterfly.` scores 25 and fails; the complete sentence scores 100. This remains a transcript similarity heuristic, not a phoneme-level pronunciation assessment.
- The global floating chat buddy is hidden on lesson routes to prevent it covering lesson actions. It remains available on course pages; lesson Lexi guides remain visible.

## Verification

- TDD: navigation and sentence tests failed before implementation; quiz audio tests reproduced missing asset playback/error behavior; sentence scoring reproduced partial-sentence admission. Browser regression reproduced the global chat buddy covering the vocabulary Continue action before the route guard.
- Focused Vitest: 93/93 passed across eight course, lesson, quiz and pronunciation test files.
- Final build: `npm.cmd run build` passed (`tsc -b && vite build`). Existing large-chunk warnings remain. The built font matches the source SHA-256; `git diff --check` passes.
- Responsive Playwright: 2/2 passed, Chromium and WebKit (`Mobile Safari` project), at 390×844. Ordinary clicks were used without forced clicks or reduced-motion changes. Safari needed a 120-second total test budget. Font loading and screenshot inspection confirm rendered Material glyphs; the course page has six selectable lesson cards, sentence practice sends the full target, the chat buddy cannot cover lesson actions, and a fresh quiz-audio click invokes the authored Mom recording. Vocabulary and quiz have no horizontal overflow.
- Scoped code review: no remaining issues after fixing partial-sentence scoring and bundling the font.

Commands run from `frontend/`:

```powershell
npm.cmd run build
node node_modules/vitest/vitest.mjs run src/__tests__/features/CourseDetailTheme.test.tsx src/__tests__/features/LessonPlayerBehaviorBugs.test.tsx src/__tests__/features/LessonPlayerFlow.test.tsx src/__tests__/features/LessonPlayerMobile390.test.tsx src/__tests__/features/QuizAudio.test.tsx src/__tests__/pages/CourseDetail.test.tsx src/__tests__/pages/CourseList.test.tsx src/__tests__/services/PronunciationService.test.ts --reporter=json --outputFile=test-artifacts/focused-polish-results.json
node node_modules/vitest/vitest.mjs run --reporter=json --outputFile=test-artifacts/unit-polish-results.json
node node_modules/@playwright/test/cli.js test tests/e2e/course-lesson-polish.spec.ts --workers=1 --reporter=line
```

Browser screenshots (generated local artifacts):

- [Chromium course selection](../../../frontend/test-artifacts/polish-chromium-course.png), [sentence practice](../../../frontend/test-artifacts/polish-chromium-pronunciation.png), [quiz](../../../frontend/test-artifacts/polish-chromium-quiz.png).
- [Mobile Safari course selection](../../../frontend/test-artifacts/polish-mobile-safari-course.png), [sentence practice](../../../frontend/test-artifacts/polish-mobile-safari-pronunciation.png), [quiz](../../../frontend/test-artifacts/polish-mobile-safari-quiz.png).

Evidence level: **CODE_VERIFIED** and **RUNTIME_VERIFIED** for the mocked-boundary responsive browser flow; device-browser emulation passed. Physical-device audio/microphone acceptance remains separate.

## Existing full-suite failures

The final complete Vitest run passed 706/716 tests in 84 files, with the same 10 failures in eight files as the initial run (704/714 before two additional sentence-scoring cases). The failed test files and their owning production modules were compared with HEAD; the assertions concern pre-existing behavior outside this task. No unrelated test expectations or AR implementations were changed to make this suite green.

| Test file | Failures | Current mismatch |
| --- | ---: | --- |
| `assetRecovery.test.ts` | 2 | Regular-handler `preventDefault` expectations differ from current AR suppression rules. |
| `ARContainerV2.persistentViewer.test.tsx` | 2 | Current iframe model fallback differs from the expected query/stability contract. |
| `debugOverlayContract.test.ts` | 1 | Legacy Telegram label differs from current “Send diagnostics”. |
| `frontendDependencyBoundary.test.ts` | 1 | Postinstall now vendors 8thwall as well as jsqr. |
| `GlobalSessionWatcher.test.tsx` | 1 | Raw translation-key expectation differs from localized copy. |
| `LearnAR8thWall.transitionUX.test.tsx` | 1 | Legacy scanning-log label differs from current “Send diagnostics”. |
| `persistentMindViewerConfig.test.ts` | 1 | Exact legacy source-string guard differs from the current implementation. |
| `sentryMonitoringService.test.ts` | 1 | Test assumes no DSN initialization without clearing the environment DSN. |

## Evidence limits

Browser tests exercise the running app and real client services with API, media playback and speech-recognition boundaries simulated. They verify routing, sentence targets, outgoing pronunciation payloads, quiz audio selection, icon font loading and mobile layout. Audible playback, a physical microphone, live backend mutation, Android Chrome and iOS Safari on hardware remain unverified. No deployment was performed.

## Follow-up: native quiz playback click

At the user's request, Playwright Chromium clicked “Nghe câu hỏi” in the running app at 390×844 with native HTML audio playback (no `play()` mock). The browser loaded `hello-family/audio/mom.wav` with HTTP 206 and `audio/wav`, emitted `playing`, advanced to 1.449433 seconds and emitted `ended`. The button was disabled while playing and re-enabled after completion; a second click completed another native playback. No page JavaScript errors were recorded.

The configured local backend at `127.0.0.1:8000` was offline (`ERR_CONNECTION_REFUSED`). Only read-only course/lesson GET data was supplied from the repository seed for this check. This confirms decoding/playback and the quiz button against the actual bundled audio; live backend connectivity and physical speaker output are not claimed. External brand-font/telemetry requests were blocked by the browser environment; the bundled icon font rendered correctly.

Artifacts: [playback screenshot](../../../frontend/test-artifacts/quiz-live-playing.png), [after replay](../../../frontend/test-artifacts/quiz-live-after-replay.png), [native events and network result](../../../frontend/test-artifacts/quiz-live-result.json). Re-run from `frontend/` while the dev app runs at port 5174: `node test-artifacts/quiz-live-click.mjs` (generated local capture harness).

## Production follow-up: edu-platform-dev.vercel.app

Playwright Chromium tested the deployed site at 390×844 with real API responses and native audio/speech synthesis. No API/media mocks or account login were used. The UI guest-entry button was clicked, and the lesson was subsequently opened directly to continue the quiz check after the catalog redirect.

- Live course API returned 200 and four courses (the three Momo courses each have six lessons). Course and `hello-family` lesson endpoints returned 200.
- Guest catalog entry returned to `/login` after `/api/v1/users/guest-learner/progress` returned 401. The complete catalog-to-lesson flow did not pass in guest mode.
- The deployed vocabulary page does not show “Bé hãy phát âm theo câu sau”, and lesson controls still use emoji. The deployed quiz does not show the new pending label or disable its playback button. These observations show the requested UI changes are not present on this deployment; no deployment revision was inferred.
- Clicking the actual quiz “Nghe câu hỏi” button requested `/api/v1/pronunciation/tts/stream/Mom?language=en`. A direct read of this endpoint returned 503, `application/json`, and `{"detail":"TTS service is not available"}`. Chromium reported `ERR_BLOCKED_BY_ORB` and native audio error 4 for this non-audio response.
- The real browser speech-synthesis fallback then emitted `speak`, `start` and `end` for `Mom` in `en-US` (three installed voices). Quiz playback completed through this fallback in the tested browser, despite backend TTS failing. This does not establish fallback availability on Android/iOS hardware.
- The authored production `hello-family/audio/mom.wav` is available: HTTP 200, `audio/wave`, 63,966 bytes, valid RIFF signature. The deployed quiz did not request this file. The local quiz patch already prefers this asset for exact vocabulary matches.
- No page JavaScript errors were recorded. No production code, deployment or authoritative learner progression was changed.

Production verdict: **partial runtime success, release check not fully passed**. Quiz speech fallback succeeds, while guest navigation and backend TTS are broken; the requested UI changes are absent from the deployment.

Artifacts: [quiz after click](../../../frontend/test-artifacts/production-quiz-playing.png), [vocabulary](../../../frontend/test-artifacts/production-pronunciation.png), [browser events/network](../../../frontend/test-artifacts/production-quiz-result.json), [TTS and authored-audio HTTP checks](../../../frontend/test-artifacts/production-audio-http.json). Generated harnesses: `node test-artifacts/production-quiz-click.mjs` and `node test-artifacts/production-audio-http.mjs` from `frontend/` (network access required).
