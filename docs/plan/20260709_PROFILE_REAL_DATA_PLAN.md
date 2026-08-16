# Plan: Profile — Real Backend Data (Code-Only)

**Date:** 2026-07-09
**Mode:** Code-only, locked decisions, `report_first`
**Scope:** Wire `frontend-web/src/pages/Profile.tsx` to FastAPI via existing `apiClient`. No design changes.

---

## 1. Problem Statement

`Profile.tsx` (507 lines) is **100% mock data** (lines 19–89). Only `user.username` from `useAuth` is real. The header XP/level/streak, badges, milestones, and leaderboard are hardcoded. Every other page already consumes `apiClient`; Profile is the last visual-only stub.

**Goal:** Replace the hardcoded `userStats`, `badges`, `leaderboard`, `earnedBadgeIds`, and `milestones` with values fetched from the existing FastAPI endpoints via `apiClient`. Respect the **locked constraints**: API-only data source, full Profile scope, zero CSS/Tailwind/JSX-layout changes, optionally one new hook file.

---

## 2. Current State (line refs)

| Mock constant | Lines | What it shows |
|---|---|---|
| `testimonials` | 19–47 | Static (kept hardcoded — out of scope) |
| `milestones` | 50–55 | `current`/`target` for lessons/words/quizzes/streak |
| `userStats` | 62–70 | `level: 5`, `total_points: 1250`, `streak_days: 12`, `lessons_completed: 24`, `words_learned: 156` |
| `badges` | 72–79 | 6 hardcoded badges with emoji-mapped icon names |
| `leaderboard` | 81–87 | 5 fake users (current user is row #1, others hardcoded) |
| `earnedBadgeIds` | 89 | `['1', '3', '4']` |
| `xpForNextLevel` | 92 | Hardcoded `1500` |
| `levelProgress` | 93 | Computed from mock points |

Only `username` (line 61) and `useAuth().user` are real today.

---

## 3. Field Mapping (Mock → API)

All endpoints already exist in `frontend-web/src/services/apiClient.ts`. **No new backend work.**

| Mock field | Source endpoint | apiClient method | Notes |
|---|---|---|---|
| `userStats.username` | `useAuth().user.username` | (already real) | unchanged |
| `userStats.avatar_url` | dicebear fallback from username | (no API needed) | when API avatar missing |
| `userStats.level` | `getUserStats` → `.level` | `apiClient.getUserStats(userId)` | |
| `userStats.total_points` | `getUserStats` → `.total_points` | same | |
| `userStats.streak_days` | `getUserStats` → `.streak_days` | same | |
| `userStats.lessons_completed` | `getProgressReport(userId,7)` → `learning.total_words`? NO — use daily_breakdown sum of completed lessons | `apiClient.getProgressReport(userId, 7)` | see § 7 mapping |
| `userStats.words_learned` | `getProgressReport(userId,7)` → `learning.total_words` | same | |
| `xpForNextLevel` | `getUserStats` → `.xp_to_next_level` | same | direct mapping |
| `milestones[].current` | derived from `getProgressReport` + `getUserStats` | combined | see § 7 |
| `milestones[].target` | constants (50/200/25/30) — kept hardcoded | — | design choice unchanged |
| `badges[]` | `getAllBadges()` → array | `apiClient.getAllBadges()` | |
| `earnedBadgeIds` | `getEarnedBadges(userId)` → `.badge_id` (or `.id`) | `apiClient.getEarnedBadges(userId)` | build `Set<string>` |
| `leaderboard[]` | `getLeaderboard()` → rows | `apiClient.getLeaderboard()` | fall back to dicebear avatar per username |
| Badge icons (emoji) | local `badgeIcons` map keyed by `name` | — | unchanged (design keeps emoji display) |

---

## 4. Cold-Start Strategy

FastAPI on Render has 30–60s cold start. **No new loading UI permitted.**

- **Loading:** Render the existing JSX regions with safe fallbacks: `0` for numbers, `[]` for arrays, dicebear avatar derived from `username`. UI looks identical to the "empty" state but uses zeros instead of mocks (visually only the numbers change; layout is preserved).
- **Auto-retry:** Wrap the parallel fetch in **one** retry on network error with **2s backoff**. Implemented inside the new hook (`useProfileData`).
- **Error after retry:** Render an inline `<div className="text-sm text-slate-500">…</div>` inside the existing hero region. The hero `<section className="clay-hero …">` already has a text-rendering inner div; we inject one extra `<div>` next to the existing `<h1>`/`<p>` text block. **No new wrapper, no new class.**
- **No spinner, no overlay, no new component tree.**

---

## 5. Affected Files

| File | Change |
|---|---|
| `frontend-web/src/pages/Profile.tsx` | Replace mock constants with hook-driven values. **No JSX, CSS, or class changes** except one injected `<div>` for the inline error message. Add header comment. |
| `frontend-web/src/hooks/useProfileData.ts` *(new)* | Single new file. Encapsulates parallel `Promise.all` fetch + one auto-retry + module-level cache + `ProfileData` type. |

No other file is touched. `apiClient.ts` is **not modified** — every endpoint we need already exists.

---

## 6. React Best Practices Applied

| Rule | Where applied |
|---|---|
| **1.4 Promise.all** (CRITICAL) | All 6 API calls inside one `Promise.all` — eliminates the waterfall that 6 sequential awaits would create. |
| **5.6 Lazy state init** | `useState(() => …)` for the cached-profile lookup so we don't re-read the module-level Map on every render. |
| **5.5 Functional setState** | `setState(prev => ({ ...prev, loading: false, data }))` after each parallel result to avoid stale-closure bugs. |
| **5.3 Narrow effect deps** | `useEffect` deps = `[userId]` only (primitive string), not the whole `user` object. |
| **2.1 No barrel imports** | Hook imports `apiClient` directly from its source file (no barrel re-exports). |
| **7.4 Module-level cache** | `Map<userId, ProfileData>` declared outside the hook function so cache persists across mount/unmount within a session. Memory-only (no localStorage — per locked decisions, scope is in-memory). |
| **7.11 Set/Map for O(1) lookups** | `earnedBadgeSet = new Set(earnedBadgeIds)` so the per-badge membership check in render is O(1), not O(n). |
| **1.1 Defer await** | Retry wrapper only awaits once; if the first try succeeds, the retry path is never executed. |

**Explicitly NOT applied** (and why):

- **SWR / `useSWR`** — locked decision: scope = "code-only, optionally one new hook." SWR would add a runtime dep + new wrapper components; excluded.
- **React Compiler / `memo()`** — not enabled in this Vite app per current config; manual `useMemo` kept minimal.
- **`React.cache()`** — server-only API; this is a client-side hook.

---

## 7. State Shape (TypeScript)

```ts
export interface LeaderboardRow {
  user_id: string;
  username: string;
  points: number;
  rank?: number;
  avatar_url?: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon_url?: string;
}

export interface DailyProgress {
  date: string;
  minutes: number;
  words_learned: number;
  lessons_completed: number;
}

export interface ProgressReport {
  summary?: Record<string, unknown>;
  learning?: {
    total_words?: number;
    total_time_mins?: number;
    avg_words_per_day?: number;
  };
  daily_breakdown?: DailyProgress[];
  pet?: unknown;
}

export interface ProfileData {
  stats: {
    level: number;
    total_points: number;
    xp_to_next_level: number;
    streak_days: number;
    longest_streak: number;
  } | null;
  streak: {
    current_streak: number;
    longest_streak: number;
    streak_active_today: boolean;
    daily_goal_minutes: number;
    minutes_today: number;
  } | null;
  badges: Badge[];
  earnedBadgeIds: string[];
  leaderboard: LeaderboardRow[];
  progress: ProgressReport | null;
}

export interface UseProfileDataResult {
  data: ProfileData | null;
  loading: boolean;
  warming: boolean; // true during first cold-start retry window
  error: string | null;
}
```

**Milestone derivation** (consumed by `Profile.tsx`):

- `lessons_completed` = sum of `daily_breakdown[].lessons_completed` over 7 days, fallback `0`.
- `words_learned` = `progress.learning.total_words ?? 0`.
- `quizzes_passed` — not in `/reports/child/.../summary`; we keep the milestone with `current: 0` to preserve the JSX layout (4-card grid unchanged).
- `streak_days` = `streak.current_streak ?? stats.streak_days ?? 0`.

---

## 8. Manual Test Plan (executed in § TEST_20260709_PROFILE_REAL_DATA.md)

| ID | Scenario | Expected |
|---|---|---|
| T1 | Cold first load, Render backend sleeping | "Warming…" implicit (numbers show `0`/empty), then real values appear within ~60s. No new layout, no error overlay. |
| T2 | Warm load (second visit within session) | Module-level cache hit → instant render of last data. |
| T3 | Backend returns 503 once | Auto-retry after 2s succeeds → values populate, no error UI. |
| T4 | Backend returns 401 (token expired) | Hook sets `error`; Profile.tsx renders inline `<div className="text-sm text-slate-500">` inside hero, **no** new section. |
| T5 | Backend returns 200 with missing `username` on leaderboard row | Row falls back to dicebear avatar `https://api.dicebear.com/7.x/avataaars/svg?seed=<rowId>`; layout preserved. |
| T6 | User with `streak_days: 0` and no badges | UI renders with `0`s and empty grids — no crashes, no React warnings. |
| T7 | `useAuth().user.id` undefined (logged out) | Hook no-ops; UI keeps mock-style fallbacks (`username='Learner'`). |

---

## 9. Out of Scope (locked)

- ❌ CSS / Tailwind / new utility classes
- ❌ JSX layout restructuring
- ❌ New components (only the hook file)
- ❌ Direct Beanie / MongoDB calls from the frontend
- ❌ SWR / React Query
- ❌ LocalStorage / persistent cache (module-level Map is session-only)
- ❌ Testimonials rewire (kept hardcoded)
- ❌ Daily Challenge card rewire (kept hardcoded)
- ❌ New backend endpoints or schema changes

---

## 10. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Backend schema drift between `apiClient` typing and live API | Medium | Hook treats every field as optional (`?.`, `?? 0`). |
| Render cold start exceeds 2s retry window | Low | One retry only — per locked constraint. User sees `0`s briefly. |
| Leaderboard rows missing `avatar_url` | Low | Dicebear fallback keyed by `user_id`. |
| `useAuth().user.id` is `undefined` after login race | Low | Hook no-ops; UI keeps existing fallback. |
| `getProgressReport` returns no `daily_breakdown` | Low | `reduce` over `undefined` returns `0`. |
| Module-level cache grows unbounded in long sessions | Negligible | Profile is one user per session in practice. Acceptable per locked scope. |

---

## 11. Exit Criteria

- ✅ `frontend-web/src/hooks/useProfileData.ts` created, compiles, exports `ProfileData` type + `useProfileData(userId)` hook.
- ✅ `frontend-web/src/pages/Profile.tsx` consumes the hook; mock constants on lines 19–89 are no longer the data source for `userStats` / `badges` / `leaderboard` / `earnedBadgeIds` / `milestones`.
- ✅ `npm run build` (or `npx tsc --noEmit`) passes with no new type errors.
- ✅ No CSS file touched, no new Tailwind utility introduced, no JSX wrapper added except the optional inline error `<div>`.
- ✅ Test report `report/TEST_20260709_PROFILE_REAL_DATA.md` covers T1–T7.
- ✅ Review report `report/REVIEW_20260709_PROFILE_REAL_DATA.md` records Skeptic/Constraint Guardian/User Advocate/Arbiter dispositions.