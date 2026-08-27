# Leaderboard Page Extraction — Design Spec

**Date:** 2026-08-24
**Status:** Approved — pending implementation plan
**Author:** Cursor (brainstorming session)
**Scope:** Frontend-only

---

## 1. Problem

The Profile page (`/profile`) currently hosts a leaderboard inline in the right column. The card is large (top 5–8 entries, "You" highlight, full row layout) and dominates the profile viewport on mobile and desktop. As gamification grows, the leaderboard wants to:

- Show **all** users, not just top 5–8
- Support **multiple time periods** (Daily / Weekly / All-time) like Duolingo
- Highlight **top 3 with a podium** for visual delight
- Stand on its own URL so it can be linked, shared, deep-linked

Goal: extract the leaderboard into a dedicated `/leaderboard` page that reuses the existing clay design tokens, and shrink the inline Profile version to a compact "Your Rank" summary.

## 2. Non-Goals (YAGNI)

- Real backend `/api/v1/leaderboard?period=...` — Phase 2. Phase 1 mocks Daily/Weekly client-side from existing data.
- Pagination — total users fit in one list (~20–50).
- Friend invites, follow / unfollow other users — Duolingo features, defer.
- Rank-change animations or celebrations.
- Avatar upload from leaderboard context.
- Heavy empty-state CTA graphics — text-only.

## 3. User Decisions (captured from brainstorming)

| Question | Answer |
|---|---|
| Who can view? | Logged-in users only (`RequireUserAuth`). Guests are redirected to `/login`. |
| Route path | `/leaderboard` |
| Navigation entry | Sidebar (desktop collapsed + expanded + mobile bottom nav). New `TrophyIcon`. |
| `/profile` post-extraction | Replace the full leaderboard card with a compact "Your Rank" summary card that links to `/leaderboard`. |
| Page features | Tabs (Daily / Weekly / All-time), Top-3 podium (visible on All-time), scrollable full list. |

## 4. Architecture

### 4.1 File Layout

```
frontend/src/pages/Leaderboard.tsx                       # new route component (default export)
frontend/src/components/Gamification/
  LeaderboardTabs.tsx                                   # period selector (Daily / Weekly / All-time)
  LeaderboardPodium.tsx                                 # top-3 cards with 2nd-1st-3rd layout
  LeaderboardRow.tsx                                    # one list row (avatar + rank + name + XP)
  YourRankSummary.tsx                                   # compact card used on /profile
frontend/src/styles/
  leaderboard.css                                       # new page-specific layout (podium, tabs)
frontend/src/components/Sidebar.tsx                     # edit: add nav item + TrophyIcon
frontend/src/App.tsx                                    # edit: add /leaderboard route
frontend/src/pages/Profile.tsx                           # edit: replace inline leaderboard with <YourRankSummary>
frontend/tests/e2e/leaderboard.spec.ts                  # new e2e test
```

### 4.2 Data Flow

```
<LeaderboardPage> on mount
    → useProfileData() returns { profile, isLoading, error }
    → profile.leaderboard is array<LeaderboardEntry>
    → Local state: activeTab ('daily' | 'weekly' | 'alltime')
    → Derived entries: useMemo on (profile.leaderboard, activeTab)
        - 'alltime' → entries as-is
        - 'daily' / 'weekly' → deterministic client-side mock
    → Render <LeaderboardTabs>, <LeaderboardPodium> (if alltime), <LeaderboardRow list>
```

### 4.3 Client-side Mock for Daily/Weekly

To avoid the zero-data tab problem without a backend change, derive values deterministically:

```ts
function derivePointsForPeriod(basePoints: number, userId: string, period: 'daily' | 'weekly'): number {
    const hash = Array.from(userId).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const dailyFactor = (0.3 + (hash % 7) * 0.1);   // 0.30 .. 0.90
    const weeklyFactor = (0.6 + (hash % 5) * 0.1);  // 0.60 .. 0.95
    const factor = period === 'daily' ? dailyFactor : weeklyFactor;
    return Math.max(0, Math.round(basePoints * factor));
}
```

Each tab shows **distinct ordering** with consistent-looking values. A small badge "Demo data — Daily/Weekly" appears under the tab strip on those tabs.

## 5. UI Spec

### 5.1 `/leaderboard` Page

```
Header band
┌──────────────────────────────────────────────────────────┐
│ 🏆 Leaderboard                                            │
│ Compete with friends and learners in English              │
└──────────────────────────────────────────────────────────┘

Tab strip (sticky to top of `<main>` on scroll past it)
┌──────────────────────────────────────────────────────────┐
│  [Daily]  [Weekly]  [All-time]                           │
└──────────────────────────────────────────────────────────┘

Top-3 Podium (visible only when activeTab === 'alltime')
┌──────────────────────────────────────────────────────────┐
│  ┌─#2─┐  ┌─#1─┐  ┌─#3─┐                                │
│  │ 🥈 │  │ 🥇 │  │ 🥉 │   heights: 80% / 100% / 70%    │
│  │ nm │  │ nm │  │ nm │                                │
│  │ XP │  │ XP │  │ XP │                                │
│  └────┘  └────┘  └────┘                                │
└──────────────────────────────────────────────────────────┘

Your Rank sticky card
┌──────────────────────────────────────────────────────────┐
│  🏆 Your rank: #5                                          │
│     1,200 XP                                              │
└──────────────────────────────────────────────────────────┘

Full list (scrollable, fills remaining height)
┌──────────────────────────────────────────────────────────┐
│  #1  user_a  1,555 XP                                    │
│  #2  user_b    15 XP                                     │
│  #3  user_c    15 XP                                     │
│  ...                                                      │
└──────────────────────────────────────────────────────────┘
```

Empty list state (no entries at all):
> "Be the first to join the leaderboard!"  → button `[Start a course]`

Loading state: skeleton rows (3 placeholder bars, no spinner — matches existing clay style).

### 5.2 `/profile` — Your Rank Summary card

Replaces the existing 4-line leaderboard card with a compact 1-row card:

```
┌──────────────────────────────────────────┐
│ 🏆 Your Rank                               │
│     #5 • 1,200 XP                         │
│                          [View all →]     │
└──────────────────────────────────────────┘
```

Tap "View all →" navigates to `/leaderboard`. Card uses `clay-card-sunshine` so the yellow theme stays.

### 5.3 Sidebar nav addition

`fullNavItems` gains:

```ts
{ path: '/leaderboard', label: 'Leaderboard', shortLabel: '🏆', iconKey: 'leaderboard' }
```

- `iconComponents.leaderboard = TrophyIcon` (new SVG, simple trophy).
- Mobile bottom nav + desktop collapsed + expanded all use the entry.
- Guest filter: **excluded** (logged-in only, like `/profile`).
- `isRouteActive('/leaderboard', ...)` works via existing helper.

## 6. Component Contracts

### 6.1 `<LeaderboardPage />` (default export from `Leaderboard.tsx`)

| Prop | Type | Required |
|---|---|---|
| (none) | | |

- Internal state: `activeTab`, `entries` (derived).
- Effects: none on mount; data sourced via `useProfileData`.
- Renders: Header, Tabs, optional Podium, YourRankSticky, Rows list, empty/loading/error states.

### 6.2 `<LeaderboardTabs />`

| Prop | Type |
|---|---|
| `value` | `'daily' \| 'weekly' \| 'alltime'` |
| `onChange` | `(next: Period) => void` |

### 6.3 `<LeaderboardPodium />`

| Prop | Type |
|---|---|
| `entries` | `LeaderboardEntry[]` (slice first 3) |

### 6.4 `<LeaderboardRow />`

| Prop | Type |
|---|---|
| `entry` | `LeaderboardEntry` |
| `index` | `number` (0-based rank) |
| `isYou` | `boolean` |

### 6.5 `<YourRankSummary />`

| Prop | Type |
|---|---|
| `currentUserId` | `string \| undefined` |
| `entries` | `LeaderboardEntry[]` |

## 7. CSS Strategy

Reuse existing tokens — no new design system:

- `clay-card-sunshine` — page outer card and Profile summary card.
- `clay-tab` + `clay-tab-active` — same as Profile's Badges/Progress tabs.
- `clay-bg-playful` — page wrapper background (same as Profile).
- `clay-stat-card` — Your Rank sticky card.

New CSS in `leaderboard.css`:

```css
.leaderboard-tabs             /* tab strip wrapper, gap + sticky */
.leaderboard-podium           /* 3-column grid: [2nd][1st][3rd] */
.leaderboard-podium__slot     /* height scaling 80% / 100% / 70% */
.leaderboard-row              /* list item: rank | avatar | name | XP */
.leaderboard-row--you         /* highlight current user (yellow ring) */
.leaderboard-empty            /* empty state */
.leaderboard-skeleton-row     /* loading state */
@media (max-width: 640px)     /* mobile: 1-column podium, sticky tabs */
```

CSS values follow the existing claymorphic pattern (4–8 px borders, soft shadows, pastel backgrounds). No hardcoded colors that aren't already in `:root` CSS variables.

## 8. Error & Edge Cases

| Condition | Behavior |
|---|---|
| `profile.leaderboard` is undefined / loading | Show 3 skeleton rows. |
| `profile.leaderboard` is empty array, not loading | Show empty state: "Be the first to join the leaderboard!" + Start a course button. |
| `profile.leaderboard` has only 1 entry (the user themselves) | Show the row plus the empty CTA. |
| Tab switched mid-fetch | Local derivation only; no re-fetch. |
| Network error from `useProfileData` | Show inline error banner; do not crash page. |

## 9. Testing

### 9.1 E2E (`frontend/tests/e2e/leaderboard.spec.ts`, Chromium only)

1. `/leaderboard` route renders for a logged-in user with seeded auth.
   - Seed: `localStorage.setItem('guestMode', 'false')` + `authToken` + `user` (or use a logged-in test fixture).
2. Tabs: click "Weekly" → list reorders.
3. "Your rank" summary on `/profile` shows user's rank; "View all →" link navigates to `/leaderboard`.
4. Sidebar shows Leaderboard item in both desktop collapsed and mobile bottom nav.
5. Guest users (`guestMode === 'true'`) accessing `/leaderboard` get redirected to `/login`.

### 9.2 Unit

Not required. Components are presentation-only; data is sourced through existing `useProfileData` hook which already has tests.

## 10. Migration / Rollback

- No backend change. Rollback = git revert.
- The previously inline `<section className="clay-card-sunshine ...">` block in `Profile.tsx` (lines 346–390) is replaced wholesale with `<YourRankSummary />`. If rollback needed, restore the inline block.

## 11. Open Questions

None — all decisions captured.

---

## Appendix A — Wireframe (text)

### `/leaderboard` desktop (1280×800)

```
┌──────────────────────────────────────────────────────────────────┐
│ 🏆 Leaderboard                                                     │
│ Compete with friends and learners in English                       │
│                                                                    │
│ [Daily] [Weekly] [All-time]                                       │
│                                                                    │
│     ┌────┐  ┌────┐  ┌────┐                                       │
│     │ #2 │  │ #1 │  │ #3 │   ← podium heights 80/100/70%         │
│     │ XP │  │ XP │  │ XP │                                       │
│     └────┘  └────┘  └────┘                                       │
│                                                                    │
│ Your rank: #5 • 1,200 XP                                           │
│ ─────────────────────────────────────────                         │
│ #1  user_a     1,555 XP                                           │
│ #2  user_b       15 XP                                            │
│ #3  user_c       15 XP                                            │
│ ...                                                                │
└──────────────────────────────────────────────────────────────────┘
```

### `/leaderboard` mobile (390×844)

```
┌──────────────────────────┐
│ 🏆 Leaderboard          │
│ Compete with friends...  │
│                          │
│ [D] [W] [All]            │
│                          │
│ ┌──────┐                 │
│ │ #1   │  ← 1-col podium │
│ │ XP   │                 │
│ └──────┘                 │
│ ┌──────┐ ┌──────┐       │
│ │ #2   │ │ #3   │       │
│ └──────┘ └──────┘       │
│                          │
│ Your rank: #5 • 1,200 XP │
│ ────────────────────────│
│ #1  user_a  1,555 XP   │
│ #2  user_b    15 XP   │
│ ...                     │
└──────────────────────────┘
```