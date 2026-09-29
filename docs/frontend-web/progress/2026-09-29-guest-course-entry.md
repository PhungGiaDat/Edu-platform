# Guest course entry without protected progress requests

Date: 2026-09-29. Branch: `10-days-quick-run`.

## Problem and fix

Clicking “Thử không cần tài khoản” previously loaded `/api/v1/users/guest-learner/progress`. That endpoint requires authentication and returned 401; the global API client redirected to login before the page's error fallback could run.

- The shared course service now returns empty account progress for the existing `guest-learner` preview identity without a network request. This covers catalog, course detail and the existing Animals overview callers. Authenticated learner requests retain their API path and response.
- CourseDetail honors explicit guest mode even if a user ID remains in state. Guest Start opens the first lesson directly, bypassing the authenticated course-start mutation. The existing authenticated enrollment/continuation behavior is preserved.
- Guest mode remains available. No backend authorization or global 401 handling was relaxed, and no saved account progress was fabricated.

## Verification before push

- Production RED: actual guest UI click returned to login after the protected guest progress GET returned 401.
- Unit RED: three expected failures reproduced the unwanted guest progress GET and course-start POST (null user and residual user ID).
- Focused GREEN: 15/15 tests passed across CourseServiceGuestProgress, CourseDetail and CourseList.
- `npm.cmd run build` passed. Existing three-mesh-bvh/large-chunk warnings remain.
- Playwright Chromium at 390×844: guest UI click → live-shaped course catalog → six lesson cards → first lesson via card; exit → first lesson via the course Start CTA → vocabulary. No protected progress/start request and no page JavaScript error. The local browser check supplies only public course data from the repository seed and makes a protected progress request return 401 if one is attempted; the latter route is never requested.
- Scoped review: no material blockers in this change.

Production is rechecked after automatic Vercel deployment; runtime artifacts live under `frontend/test-artifacts/guest-production-*`. This fix covers course entry and opening a lesson. Guest lesson completion, quiz persistence and pronunciation attempt persistence are separate existing behaviors; this task does not claim those flows are fixed. TTS is outside this scope.
