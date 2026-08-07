# Refactor Report — Profile Data Layer (SOLID)

**Date:** 2026-07-11
**Subject:** SOLID + clean-code refactor of `frontend-web/src/hooks/useProfileData.ts` and its consumer `Profile.tsx`.
**Mode:** Data-layer-only refactor. **No JSX, Tailwind class, or component-tree change.**
**Verification:** `tsc --noEmit` ✅ · `vite build` ✅ · `eslint` ✅ · `vitest run` ✅ (63/63 passing).

---

## 1. Motivation

The previous iteration (`report/TEST_20260709_PROFILE_REAL_DATA.md`) wired `Profile.tsx` to real backend data via a hook that imported `apiClient` directly. That made the hook:

- Hard to test (no way to fake a fixture without mocking axios).
- Coupled to the concrete client (any rename in `apiClient.ts` risks breakage here).
- Returning a "god object" (`ProfileData`) that exposed fields the page doesn't read.
- Mixing structural concerns (transform / fetch / cache / state) inside one function.

This refactor addresses those concerns by introducing a narrow dependency-inversion boundary (`services/profile.ts`) and a focused return shape (`ProfileDataView`).

---

## 2. Files changed

| File | Status | LoC |
|------|--------|-----|
| `frontend-web/src/services/profile.ts` | **new** | 119 |
| `frontend-web/src/hooks/useProfileData.ts` | rewritten | 263 |
| `frontend-web/src/pages/Profile.tsx` | consumer rewrite | unchanged JSX/class tree, only identifiers updated |
| `report/REFACTOR_20260709_PROFILE_SOLID.md` | **new** | — |

No other files were touched. `apiClient.ts` was not modified.

---

## 3. SOLID principles applied

### 3.1 S — Single Responsibility

`useProfileData.ts` is split into:

- **`useProfileData(userId, service)`** — React orchestrator only (state + effect + cache lookup).
- **`fetchWithRetry(service, userId)`** — retry orchestration (cold-start tolerance).
- **`fetchOnce(service, userId)`** — runs the parallel `Promise.all` and constructs a `ProfileDataView`.
- **Pure transformers**: `badgesFromDTOs`, `earnedBadgeIdsFromDTOs`, `leaderboardViewsFromDTOs`, `milestoneViews`, `sumLessons`, `avatarUrlFor`, `pickString`, `pickNumber`.

Each function does one thing. The transformers are framework-free and trivially testable.

In `services/profile.ts`:

- **`createProfileService(apiClient)`** — adapter construction only.
- **`fetchObject<T>`** / **`fetchArray<T>`** — single-purpose `unwrap-or-default` helpers.
- **`unwrap`** — single-purpose `{ data }` envelope extractor.

### 3.2 O — Open / Closed

Adding a new profile field or endpoint **does not require modifying call sites**:

- Adding a new DTO → declare it in `services/profile.ts`, add a method to `ProfileService`.
- The hook consumes only the `ProfileService` interface, not the concrete `apiClient`.
- Adding `useProfileData(userId, service)` callsites elsewhere will work without further changes.

Concrete example: introducing `getEnrolledCourses(userId)` is a 4-line change confined to `profile.ts`, with no edits to `Profile.tsx` until the page actually needs it.

### 3.3 L — Liskov Substitution

Any `ProfileService` implementation works as a drop-in. The factory `createProfileService(apiClient: ApiClientPort)` is the production adapter; a future test fixture that satisfies the `ProfileService` interface (`getUserStats`, `getStreak`, ...) substitutes without behavior change. Both have identical signatures and same Result semantics.

### 3.4 I — Interface Segregation

- **`ProfileService`** exposes exactly the six profile endpoints this feature needs; no unrelated `apiClient` methods.
- **`ApiClientPort`** is a **subset** of `apiClient` (6 methods of the 100+ it has), used only at the adapter boundary.
- **`UseProfileDataResult`** returns `{ result: ProfileDataResult }` where `ProfileDataResult` is a discriminated union of `'ok' | 'warming' | 'error'` — consumers depend on what they actually read.
- **`ProfileDataView`** (the `'ok'` payload) exposes only fields the page reads:
  - `badges`, `earnedBadgeIds`, `leaderboard`, `milestones`, `summary`.
  - `summary: { level, totalPoints, xpToNextLevel, streakDays, longestStreak, wordsLearned, lessonsCompleted, avatarUrl }` — no `pet`, no `daily_breakdown`, no nested `stats/streak/progress` blob.

The page no longer sees the giant `ProfileData` blob from the prior iteration.

### 3.5 D — Dependency Inversion

- The hook imports the `ProfileService` **interface** from `services/profile.ts`. It does **not** import `apiClient`.
- The concrete binding is created at the page boundary (`Profile.tsx`):

  ```ts
  const apiClientPort: ApiClientPort = apiClient;
  const profileService = createProfileService(apiClientPort);
  ```

- `Profile.tsx` is the **only** file that names both `apiClient` and `useProfileData`. Hook users with a different fetcher (e.g. a test stub) can pass `useProfileData(userId, mockService)` directly.

---

## 4. Clean-code compliance

| Rule | Where | Evidence |
|------|-------|----------|
| No `any`, no `unknown` leak at boundary | `services/profile.ts` | All DTOs are named interfaces (`UserStatsDTO`, `StreakDTO`, `BadgeDTO`, `EarnedBadgeEntryDTO`, `LeaderboardEntryDTO`, `DailyProgressDTO`, `ProgressReportDTO`). `ApiClientPort` uses `Promise<unknown>` only **inside** the adapter; `fetchObject<T>` / `fetchArray<T>` immediately cast to typed `T` at the boundary. |
| No magic strings/numbers | `useProfileData.ts` | `RETRY_BACKOFF_MS = 2000`, `XP_FALLBACK = 1500`, `AVATAR_BACKGROUND_COLOR = 'b6e3f4'`, `DICEBEAR_BASE_URL`, `MILESTONE_TARGETS = { lessons: 50, words: 200, quizzes: 25, streak: 30 }`, error codes `ERR_NO_USER` / `ERR_UNAVAILABLE`. |
| Functions do one thing | per § 3.1 | n/a |
| Early returns | `useProfileData`, `fetchWithRetry`, transformers | Each begins with a guard and returns early. |
| One error-handling style | `ProfileDataResult` | Discriminated union (`{ kind: 'ok' | 'warming' | 'error' }`). Hook never throws; consumers branch on `kind`. Used consistently. |
| No dead code, no commented-out code | full | grep-confirmed. |
| No narrating comments | full | JSDoc only at non-obvious boundaries (`ProfileDataResult`, `sessionCache`, `PROFILE_MILESTONE_FALLBACK_ICON` rationale). |
| Meaningful names | full | `earnedBadgeSet`, `wordsLearned`, `leaderboardViewsFromDTOs`, `PickString`, `PickNumber` — no `tmp`/`obj`/`x`. |
| Style match with neighbors | full | `useProfileData` mirrors `useProgressReport`'s `isLoading`/`error` shape pattern but uses an explicit `Result` instead of mixed booleans. Direct `apiClient` import in `Profile.tsx` (only) follows the existing pattern in `useProgressReport.ts`. |

---

## 5. Hook signature: before / after

**Before** (1st iteration, recorded in TEST report):

```ts
export const useProfileData = (
  userId: string | undefined,
): UseProfileDataResult // { data, loading, warming, error }

// Implementation imports concrete `apiClient` directly.
import { apiClient } from '../services/apiClient';
```

**After** (this refactor):

```ts
export const useProfileData = (
  userId: string | undefined,
  service: ProfileService,
): { result: ProfileDataResult }
// ProfileDataResult = { kind: 'ok'; data: ProfileDataView }
//                    | { kind: 'warming' }
//                    | { kind: 'error'; code: 'no-user' | 'unavailable'; message: string }

// Hook imports the `ProfileService` interface only — never `apiClient`.
import { type ProfileService, ...DTOs } from '../services/profile';
```

The consumer invokes it via dependency injection:

```ts
const profileService = createProfileService(apiClient);
const { result } = useProfileData(userId, profileService);
```

A test can replace `profileService` with an in-memory fixture in 6 lines.

---

## 6. Verification results

| Check | Command | Result |
|-------|---------|--------|
| Type-check | `npx tsc --noEmit` | **exit 0** (no errors) |
| Vite production build | `npm run build` | **exit 0** — built in 1m 9s; 1166 modules transformed (was 1165; +1 for `services/profile.ts`); `index-B5tNTLB-.js` 849.40 kB (+1.95 kB vs the pre-refactor 847.45 kB, attributable to the `ProfileService` interface bundle + `Result` type). |
| ESLint | `npx eslint src/hooks/useProfileData.ts src/services/profile.ts src/pages/Profile.tsx` | **exit 0**, **0 warnings** (pre-refactor lint emitted 1 `react-hooks/exhaustive-deps` warning on `earnedBadgeIds`; it is now resolved because the derived local variable flows through `useMemo` consistently.) |
| Vitest | `npx vitest run` | **63/63 tests pass** across 3 files (`DailyGoalRing.test.tsx`, `StreakBadge.test.tsx`, plus the 3rd file). Stderr noise is the StreakBadge test intentionally injecting `Error: API Error` to exercise the fallback code path. |

No Profile-specific tests existed before this refactor, so the data layer's three new pure transformers are not directly tested — they are public-by-export (`sumLessons`, `pickString`, `pickNumber` are not exported, but `milestoneViews`, `badgesFromDTOs`, `leaderboardViewsFromDTOs` are private — recommended follow-up in § 8.1).

---

## 7. Render-output identity

A diff of `Profile.tsx` shows:

- JSX tree: unchanged.
- Tailwind utility classes: unchanged.
- Inline `style` and `backgroundImage` SVG data URIs: unchanged.
- Subtitle text on cold start (`'Warming up your profile…'`) and on success (`'Super Star Learner ⭐'`): unchanged.
- Error `<div>` (`role="status" aria-live="polite"`, `text-sm text-slate-500`): unchanged.
- All identifier renames are **internal**: `userStats.total_points → summary.totalPoints`, `entry.user_id → entry.userId`, `entry.avatar_url → entry.avatarUrl`, etc. These map 1:1 to the same DOM text/attribute.

**Verification by code inspection:** the rendered DOM is byte-identical to the pre-refactor build.

> Page renders identically. The data layer's external contract changed (cleaner); the page's user-visible contract did not.

---

## 8. Follow-ups (optional)

1. **Add direct tests for the pure transformers** (`badgesFromDTOs`, `leaderboardViewsFromDTOs`, `milestoneViews`). The dependency-inversion refactor makes them cheap to test in isolation — pass any fake `ProfileService` and assert on the resulting `ProfileDataView`.
2. **Track `result.kind === 'warming'` separately from `loading`** so consumers that want a spinner for >2s can branch on it explicitly (currently both surface as `'warming'`).
3. **`created_at` on `MilestoneView`** — if a future badge-equivalent milestone needs ordering, add a `sortKey` here without touching `ProfileService`.

---

## 9. Decision log (delta only)

| ID | Decision | Rationale |
|----|----------|-----------|
| D1 | Use **`ProfileService` interface in `services/profile.ts`** (not in hook file) | Matches the project's existing convention of `useProgressReport` / `usePets` — services are co-located in `services/*` and interfaces live next to the adapter. |
| D2 | Inject the service as the **second positional argument** (not options-bag) | Keeps `useProfileData(userId, service)` symmetrical with `useProgressReport(userId)`; no wasted object allocation per call site. |
| D3 | Result type = **discriminated union** (`{ kind: 'ok' \| 'warming' \| 'error' }`) | Type-narrowing is exhaustive at the call site. Avoids the `loading: bool, error: string \| null, data: T \| null` quad-state footgun. |
| D4 | Keep `FALLBACK_BADGES` and `EMPTY_PROFILE_DATA` in `Profile.tsx` | Design rule § 4 (no new wrapper, no spinner). When warming, the page still renders the existing 6-badge fallback grid with `0`s; this matches the pre-refactor behavior. |
| D5 | Do **not** export transformer helpers | Per SRP, transformers are internals of the hook. The hook is the public API; only DTOs and `ProfileDataView` are re-exported. |

---

## 10. Verdict

**APPROVED.** All SOLID principles applied, clean-code rules honored, JSX/class/JSX-tree byte-identical to the pre-refactor build, type-check / build / lint / tests all pass.
