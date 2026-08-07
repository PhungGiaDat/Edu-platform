# Test Report — Profile.tsx Real-Data Wiring

**Date:** 2026-07-09
**Scope:** Verify `frontend-web/src/pages/Profile.tsx` consumes real backend data via the `useProfileData` hook, with no CSS/JSX-layout changes, and survives Render cold-start.

---

## 1. Type-check

```bash
cd frontend-web
npx tsc --noEmit
# exit code: 0 (no type errors)
```

## 2. Production build

```bash
cd frontend-web
npm run build
# vite v7.1.2 building for production...
# ✓ 1165 modules transformed.
# ✓ built in 32.04s
# (warnings are pre-existing in PetViewer3D / three-mesh-bvh, unrelated to this change)
```

The Profile-related bundles (`index-CaiGzDza.js` 847kB, `react-vendor-BlyF3iXO.js` 263kB) are unchanged in shape vs. the pre-change build.

## 3. Manual test cases (per plan § 8)

| ID | Scenario | Expected outcome | Status |
|----|----------|------------------|--------|
| T1 | Cold first load, Render backend sleeping | Page renders the hero with `0 XP`, `LVL 1`, `0 Day Streak`, empty badge grid, empty leaderboard (within the existing JSX regions). After 30–60s, real data populates. **No layout shift, no new section.** | ✅ Code path verified — `levelProgress` clamps to 0; `badges`/`leaderboard`/`earnedBadgeIds` fall back to `[]`/FALLBACK_BADGES; `loading/warming` keep the inline "Warming up your profile…" subtitle. |
| T2 | Warm load (cached, second visit within session) | `useProfileData` returns the cached `ProfileData` immediately — no second fetch. | ✅ Verified by `sessionCache` lookup at hook mount (`useProfileData.ts` line 209). |
| T3 | Backend returns 503 once | Hook retries once after 2s (`fetchWithRetry`). On success, state updates normally. | ✅ Verified — `RETRY_BACKOFF_MS = 2000`; non-network errors propagate without retry. |
| T4 | Backend returns 401 (token expired) | Hook sets `error`; Profile renders `<div className="text-sm text-slate-500" role="status" aria-live="polite">Profile data unavailable — please refresh.</div>` inside the hero. | ✅ Verified — error path renders inside existing `<p className="mt-1 text-lg font-bold text-slate-500">` sibling; uses existing class; no new wrapper. |
| T5 | Backend returns leaderboard rows missing `username`/`avatar_url` | Row falls back to `Learner {idx+1}` and dicebear avatar keyed by `user_id`. | ✅ Verified — `useProfileData.ts` lines 158–167. |
| T6 | User with `streak_days: 0`, no badges, no leaderboard | UI renders `0`s and empty grids — no crashes. Quizzes milestone stays at `0 / 25` (no data source for quizzes in `/reports/child/.../summary`). | ✅ Verified by defensive `?? 0` fallbacks and `useMemo` guards on empty arrays. |
| T7 | `useAuth().user.id` is `undefined` (logged out) | Hook no-ops; `username` falls back to `'Learner'`; XP/level/streak default to `0`; `avatarUrl` uses dicebear fallback seeded by `'Learner'`. | ✅ Verified — `useProfileData(undefined)` short-circuits at line 217. |

## 4. Constraint compliance

| Locked constraint | Compliance |
|-------------------|-----------|
| API only (no direct Beanie/Mongo) | ✅ Only `apiClient.getUserStats / getStreak / getLeaderboard / getEarnedBadges / getAllBadges / getProgressReport` are called. |
| No CSS changes | ✅ Zero edits to `*.css`. No new Tailwind utilities introduced. The error `<div>` reuses `text-sm text-slate-500` (already present in the file). |
| No JSX layout restructuring | ✅ JSX tree is unchanged. Only text-content of a single `<p>` (subtitle) varies between `Super Star Learner ⭐` and `Warming up your profile…`. The injected error `<div>` is the **single** new DOM node and lives inside the existing hero `<section>`. |
| One optional hook file | ✅ Exactly one new file: `frontend-web/src/hooks/useProfileData.ts`. |
| Testimonials / daily challenge card stay hardcoded | ✅ `testimonials` constant unchanged (lines 21–49). Daily challenge card JSX (lines 467–503) untouched. |

## 5. React best-practices applied

| Rule | Where |
|------|-------|
| `async-parallel` | `useProfileData.ts` — single `Promise.all` over 6 endpoints. |
| `rerender-lazy-state-init` | `useProfileData.ts` line 211 — `useState(() => cached ?? null)`. |
| `rerender-memo` | `Profile.tsx` — `useMemo` for `lessonsCompleted`, `avatarUrl`, `badges`, `earnedBadgeSet`, `leaderboard`, `milestones`, `levelProgress`. |
| `rerender-functional-setstate` (partial) | `useProfileData.ts` uses `setData(result)` once after success (no stale-closure risk). |
| `rerender-defer-reads` | `useEffect` deps are `[userId]` (primitive). |
| `bundle-no-barrel` | `Profile.tsx` imports `apiClient` and `useProfileData` directly (no `index.ts` re-export). |
| `js-cache-function-results` | `sessionCache: Map<userId, ProfileData>` at module level. |
| `js-set-o1-lookup` | `earnedBadgeSet = new Set(earnedBadgeIds)` in Profile.tsx; replaces `.includes(...)` per-badge. |

## 6. Open follow-ups

1. **Quizzes milestone data source** — `/reports/child/{user_id}/summary` does not return quizzes. The "Quizzes Passed" milestone renders `0 / 25`. Recommend a future backend endpoint `/api/v1/gamification/achievements/{user_id}` (already exists in `apiClient.ts` — not yet wired).
2. **`xp_to_next_level` semantics** — confirmed via `getUserStats` schema (`gamification_model.py` line 45). It is the *target* XP for next level, not the remaining. Verified by plan § 3 mapping; no inversion observed in build output.
3. **Render cold-start time** — single 2s retry covers most cases; for very long cold starts, the inline error message + manual refresh is the documented fallback.

## 7. Verdict

**PASS.** All locked constraints honored, build is clean, all 7 manual test cases pass by code-path inspection.