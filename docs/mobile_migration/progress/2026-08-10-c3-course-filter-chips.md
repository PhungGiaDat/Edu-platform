# C3 — Course Filter Chips (RN)

## Session
2026-08-10, agent: Claude Code, branch: MindAR-Update

## Goal
Add the next READY learner catalog slice by introducing client-side course filter chips on `CourseListScreen` using the real backend course fields already returned by `/courses`.

## Backend Contract Confirmed (read-only)
- `GET /courses` returns `CourseSchema`
- `CourseSchema` includes:
  - `category_key`
  - `category_label`
  - `level`
- Therefore C3 is an RN-only implementation, not a `BACKEND_DEPENDENCY`

## Inputs Re-read
- `mobile/rn/AGENTS.md`
- `backend/api/courses.py`
- `backend/models/course_model.py`
- `mobile/rn/src/screens/CourseListScreen.tsx`
- `mobile/rn/src/hooks/useCourses.ts`
- `mobile/rn/src/types/course.ts`
- `mobile/rn/src/components/CourseCard.tsx`
- `mobile/rn/src/design/tokens.ts`
- `mobile/rn/src/i18n/en.json`
- `mobile/rn/src/i18n/vi.json`

## Changed

### `mobile/rn/src/screens/CourseListScreen.tsx`
- Added local filter state for `selectedCategory` and `selectedLevel`
- Derived category options from real backend-backed `courses` data
- Added a fixed level option set matching the backend `CourseSchema` enum
- Added claymorphic horizontal filter chip rows for category and level
- Switched the `FlatList` data source from raw `courses` to derived `filteredCourses`
- Passed `category: item.category_key` into `CourseCard` so the existing badge keeps working with the canonical backend field

### `mobile/rn/src/i18n/en.json` + `vi.json`
- Added `courses.filterByCategory`
- Added `courses.filterByLevel`
- Added `courses.allCategories`
- Added `courses.allLevels`
- Added localized level labels for beginner/intermediate/advanced

### `mobile/rn/src/__tests__/course-list-filters.test.ts` (NEW)
- Source-contract coverage for:
  1. local category + level filter state
  2. deriving category chips from backend course fields
  3. filtering by backend `level`
  4. rendering `filteredCourses`
  5. localized filter labels in both locales

## Verified
### Source-verified
- `CourseListScreen.tsx` now keeps local category and level filter state
- filter chip UI is rendered above the course list
- category filters read `course.category_key` / `course.category_label`
- level filters read `course.level`
- `FlatList` now renders `filteredCourses`
- new course filter i18n keys exist in both locales

## Not Verified
Command-based verification remains blocked in this session:
- Expo v57 docs pre-read via `https://docs.expo.dev/versions/v57.0.0/`
- `node --test ... src/__tests__/course-list-filters.test.ts`
- `npx tsc --noEmit`

The Expo docs fetch failed again because the environment classifier reported `claude-opus-4-8 is temporarily unavailable`, so the AGENTS.md pre-read could not be completed through `WebFetch` in-session. This implementation stayed within already-used React Native primitives and existing project tokens only.

## Spec/Plan Corrections from Implementation Evidence
None. The approved learner plan already scoped C3 as client-side filter chips on `CourseListScreen`.

## Blockers Raised
- **ENVIRONMENT_BLOCKER:** WebFetch classifier unavailable prevented the required Expo v57 pre-read.
- **ENVIRONMENT_BLOCKER:** command execution verification may still be blocked.

## Confirmations
- ✅ No Unity source modified (`mobile/unity/**` untouched)
- ✅ No `docs/unity_ar/**` modified
- ✅ No backend runtime modified (read-only inspection only)
- ✅ No master orchestration plan edited
- ✅ No direct MongoDB access, no privileged Supabase credentials
- ✅ No mock data added to production path
- ✅ Reused existing Claymorphic tokens instead of adding a new design system surface
- ✅ No unrelated refactor outside the course list/i18n/test boundary

## Next
- Re-run the Expo v57 doc fetch once the classifier recovers
- Run the focused source-contract test
- Run `npx tsc --noEmit`
- Then continue with the next READY RN task
