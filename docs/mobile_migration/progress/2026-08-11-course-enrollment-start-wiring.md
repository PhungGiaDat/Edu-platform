# Task #4 — Course Enrollment / Start-Course Wiring (RN)

## Session
2026-08-11, agent: Claude Code, branch: MindAR-Update

## Goal
Wire the RN `CourseDetailScreen` footer CTA to the existing backend course-start
contract so a learner can start/continue a course from the app, mirroring the
already-shipped frontend-web behavior. No new backend or service code — reuse
the existing `coursesApi.startCourse` wrapper.

## Backend Contract Confirmed (read-only)
- `POST /courses/{course_id}/start` — `backend/api/courses.py:142`
  - body: `StartCourseRequest { user_id }`
  - handler: `CourseService.start_course(user_id, course_id)` — `backend/services/course_service.py:295`
  - returns `UserProgress` (includes `current_lesson_id`, `completed_lessons`)
  - no `get_current_user` dependency on this route
- RN already had a matching typed wrapper:
  - `coursesApi.startCourse(courseId, userId)` → `api.post<UserProgress>('/courses/${courseId}/start', { user_id: userId })`
    (`mobile/rn/src/services/api.ts`)

So this is a real implementation, NOT a `BACKEND_DEPENDENCY` — the contract and
the client wrapper both pre-existed. Only screen-level wiring was missing.

## Reference (read-only)
- `frontend-web/src/pages/CourseDetail.tsx` + `frontend-web/src/services/CourseService.ts`
  - established the approved behavior: call `startCourse`, store returned
    progress, navigate to `current_lesson_id` (fallback: first lesson),
    show a starting state and a start/continue label swap.

## Inputs Re-read
- `mobile/rn/src/screens/CourseDetailScreen.tsx`
- `mobile/rn/src/services/api.ts`
- `mobile/rn/src/hooks/useUser.ts`
- `mobile/rn/src/hooks/useCourseDetail.ts`
- `mobile/rn/src/types/course.ts` (+ `types/session.ts` `UserProgress`)
- `mobile/rn/src/navigation/AppNavigator.tsx`
- `mobile/rn/src/i18n/{en,vi}.json`, `i18n/index.ts`, `i18n/useLocale.ts`
- `mobile/rn/src/__tests__/home-screen-xp.test.ts` (test pattern)

## Changed

### `mobile/rn/src/screens/CourseDetailScreen.tsx`
- Added imports: `useMemo`, `useState`, `useUser`, `coursesApi`, `UserProgress`.
- Added `userId` via `useUser()`.
- Added local state: `startError`, `isStarting`, `progress`.
- Added `startButtonLabel` memo:
  - `isStarting` → `courses.openingLesson`
  - completed lessons present → `courses.continueLearning`
  - otherwise → `courses.startLearning`
- Added `handleStartCourse` callback:
  - guards on `course`/`userId` (sets localized error if missing)
  - calls `coursesApi.startCourse(course.course_id, userId)`
  - stores returned `UserProgress`
  - navigates to `current_lesson_id` (fallback first lesson) via existing `onLessonPress`
  - localized error on failure, `isStarting` reset in `finally`
- Added a `startError` banner next to the existing `error` banner (reused `errorBanner` style).
- Rewired the `ListFooterComponent` `ClayButton`:
  - `onPress={() => void handleStartCourse()}` (was `onLessonPress(lessons[0])`)
  - `disabled={isStarting}`
  - label `{startButtonLabel}` (was hardcoded `t('courses.expand')`)

### `mobile/rn/src/i18n/en.json` + `vi.json`
- Added under `courses`: `startLearning`, `continueLearning`, `openingLesson`, `startCourseFailed`.

### `mobile/rn/src/__tests__/course-detail-start-course.test.ts` (NEW)
- Source-contract coverage for the wiring:
  1. reads `userId` from `useUser`
  2. calls `coursesApi.startCourse(course.course_id, userId)`
  3. stores progress + resolves lesson from `current_lesson_id` with first-lesson fallback
  4. CTA copy derives from `isStarting` / completed lessons
  5. footer CTA wired to `handleStartCourse`, disabled while starting, renders `startButtonLabel`
  6. localized `startError` banner path

## Verified
### Source-verified (read-only)
- `CourseDetailScreen.tsx` footer now calls `handleStartCourse`, disabled while starting, renders `startButtonLabel`.
- Both `en.json` and `vi.json` are valid JSON (missing comma after the `courses` block was introduced during editing and then corrected — re-read confirms `},` before `"pets"`).
- All four new i18n keys present in both locales.

## Not Verified
Command-based verification remains blocked by the same environment issue as
C15/C26/C27:
- `node --test ... course-detail-start-course.test.ts`
- `npx tsc --noEmit`

Blocked by harness error:
- `claude-opus-4-8 is temporarily unavailable, so auto mode cannot determine the safety of Bash right now`

So this is **implemented and source-verified**, but automated test/typecheck
execution is still pending.

## Spec/Plan Corrections from Implementation Evidence
None. This mirrors the approved frontend-web start-course behavior exactly and
uses the pre-existing backend contract + RN API wrapper. No contract gap found.

## Blockers Raised
- **ENVIRONMENT_BLOCKER:** Bash classifier unavailable, preventing automated test/typecheck execution.

## Confirmations
- ✅ No Unity source modified (`mobile/unity/**` untouched)
- ✅ No `docs/unity_ar/**` modified
- ✅ No backend runtime modified (read-only inspection only)
- ✅ No Master plan doc edited
- ✅ Reused existing `coursesApi.startCourse` — no new service/API code
- ✅ No direct MongoDB access, no privileged Supabase credentials
- ✅ No hard-coded product data
- ✅ Reused existing Claymorphic primitives (`ClayButton`, `ClayCard`, tokens, `errorBanner` style)
- ✅ No unrelated refactor outside the screen/i18n/test boundary

## Next
- Re-run `node --test` + `npx tsc --noEmit` once the Bash classifier recovers.
- Continue with the next READY RN task.
