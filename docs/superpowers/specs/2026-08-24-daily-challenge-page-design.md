# Daily Challenge Page Extraction — Design Spec

**Date:** 2026-08-24
**Status:** Approved — pending implementation plan
**Author:** Cursor (brainstorming session)
**Scope:** Frontend-only (with one new frontend service call wrapping an existing backend endpoint)

---

## 1. Problem

The Profile page (`/profile`) currently hosts a small Daily Challenge card at the bottom of the right column (lines 425–462). The card shows title, progress bar, and reward text in a compact coral tile (~164px tall). On a desktop layout the card is fine; on mobile it forces the right column to extend below the fold. As gamification grows, the Daily Challenge wants to:

- Stand on its own URL (`/daily-challenge`) so it can be linked, shared, deep-linked
- Show today's lessons with one-click "Start" CTAs to specific lessons
- Reward users with an explicit claim action (currently reward is just text)
- Provide larger progress visualization (bigger bar, animation when complete)

Goal: extract the Daily Challenge into a dedicated `/daily-challenge` page that reuses the existing clay design tokens, expose a Claim Reward action, and surface the 3 daily lessons as actionable shortcuts. The inline Profile card stays but becomes a click-through summary.

## 2. Non-Goals (YAGNI)

- Multiple challenges per day (morning/afternoon slots) — single daily challenge only.
- Streak multipliers on reward (just base XP + badge).
- Push notifications for daily challenge.
- Personalized AI-generated challenges.
- Sharing with friends / referral.
- Animation library (framer-motion) — pure CSS keyframes only.
- Editable challenge difficulty.

## 3. User Decisions (captured from brainstorming)

| Question | Answer |
|---|---|
| Who can view? | Logged-in users only (`RequireUserAuth`). Guests redirect to `/login`. |
| Route path | `/daily-challenge` |
| Navigation entry | Sidebar (desktop collapsed + expanded + mobile bottom nav). New `TargetIcon`. |
| `/profile` post-extraction | **Keep the full card** as-is, but wrap in `<Link to="/daily-challenge">` so the entire card is clickable; add small chevron arrow top-right. |
| Page features | Hero (large progress + reward) + Today's Lessons list (3 lessons with "Start" CTAs) + Claim Reward button on completion. |
| Claim action | Yes — POST to `/api/v1/gamification/daily-rewards/claim` when `progress >= target` and not yet claimed today. |

## 4. Architecture

### 4.1 File Layout

```
frontend/src/pages/DailyChallenge.tsx                       # new route component (default export)
frontend/src/components/Gamification/
  DailyChallengeHero.tsx                                   # large coral hero with progress + reward summary
  DailyLessonList.tsx                                      # today's 3 lessons, one row each, "Start" CTA
  DailyChallengeClaim.tsx                                  # claim button + reward preview + claimed badge
frontend/src/styles/
  daily-challenge.css                                      # page-specific styles
frontend/src/services/apiClient.ts                          # edit: add/verify getDailyLessons, claimDailyReward
frontend/src/components/Sidebar.tsx                         # edit: add nav item + TargetIcon
frontend/src/App.tsx                                       # edit: add /daily-challenge route
frontend/src/pages/Profile.tsx                             # edit: wrap inline card in Link to /daily-challenge
frontend/tests/e2e/daily-challenge.spec.ts                  # new e2e test
```

### 4.2 Data Sources

| Source | Path Used | Shape | Owner |
|---|---|---|---|
| `profile.daily_challenge` | `/api/v1/profile/me` | `{ title, progress, target, reward }` | Backend (existing) |
| Daily lessons | `/api/v1/learning-path/daily?user_id=...` | `{ lessons: DailyLesson[] }` | Backend (existing route, may need re-confirm shape) |
| Daily reward state | `/api/v1/gamification/daily-rewards/{userId}` | `{ day_claimed: boolean, last_claimed_date: string \| null, xp: number, badge: BadgeRef }` | Backend (existing) |
| Claim action | POST `/api/v1/gamification/daily-rewards/claim` | `{ user_id, day }` → updated reward state | Backend (existing) |

`DailyLesson` shape (frontend assumption; will validate against backend in plan):

```ts
interface DailyLesson {
  id: string;
  title: string;
  topic: string;
  emoji: string;
  duration_minutes: number;
  href: string;          // e.g., /courses/{courseId}/lessons/{lessonId}
  completed: boolean;
}
```

If `/api/v1/learning-path/daily` does not return the expected shape, **fallback strategy**: derive 3 lessons from `profile.summary.lessons_completed + courses` heuristically (or display "Today's lessons will appear after backend support lands" placeholder). Real lesson list is required for actionable CTAs.

### 4.3 Data Flow

```
<DailyChallengePage> on mount
    → useAuth() to get user
    → useProfileData() returns { profile, isLoading, error }
    → challenge = profile?.daily_challenge
    → fetch: apiClient.getDailyLessons(userId)        // daily lesson list
    → fetch: apiClient.getDailyRewards(userId)        // claim state + reward preview
    → Local state:
        - lessons: DailyLesson[]
        - reward: DailyReward | null
        - claimPending: boolean
        - claimError: string | null
    → On lesson complete (lesson navigation + return):
        - optimistic increment: challenge.progress += 1
        - if challenge.progress >= challenge.target → re-fetch reward (to unlock Claim)
    → On claim click:
        - setClaimPending(true)
        - POST apiClient.claimDailyReward(userId)
        - on success → reward.day_claimed = true; setClaimPending(false)
        - on error → setClaimError(msg); setClaimPending(false)
```

### 4.4 Optimistic Progress

When user navigates from a Daily Lesson (`/courses/.../lessons/...`) back to `/daily-challenge`, the `challenge.progress` may be stale. Strategy:

- On page focus (window focus listener) → re-fetch `/api/v1/profile/me` to refresh.
- After successful lesson completion, the user is redirected to `/daily-challenge?completed=<lessonId>`, which triggers an explicit refetch.

## 5. UI Spec

### 5.1 `/daily-challenge` Desktop (1280×800)

```
┌──────────────────────────────────────────────────────────────────┐
│ 🎯 Daily Challenge                                                 │
│ Complete 3 lessons today to earn your reward                      │
│                                                                     │
│ ┌────────────────────────────┐  ┌─────────────────────────────┐ │
│ │ 🎯  Daily Challenge         │  │ 🎁 Today's Reward            │ │
│ │  Complete 3 Lessons         │  │  +50 XP                      │ │
│ │  Progress 1/3               │  │  + Mystery Badge 🏅          │ │
│ │  ▓▓▓░░░░░░░░░░░░░ 33%       │  │                              │ │
│ │  Reward: 50 XP + Badge      │  │  [Claim Reward]  ← disabled  │ │
│ │                              │  │             until complete    │ │
│ └────────────────────────────┘  └─────────────────────────────┘ │
│                                                                     │
│ Today's Lessons                                                     │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ 1.  🐱 Animals — Vocabulary                                   │ │
│ │                              [Start →]                       │ │
│ ├──────────────────────────────────────────────────────────────┤ │
│ │ 2.  🎨 Colors — Quiz                                          │ │
│ │                              [Start →]                       │ │
│ ├──────────────────────────────────────────────────────────────┤ │
│ │ 3.  🌳 Nature — Video                                         │ │
│ │                              [Start →]                       │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### 5.2 `/daily-challenge` Mobile (390×844)

```
┌──────────────────────────┐
│ 🎯 Daily Challenge       │
│ Complete 3 lessons       │
│                          │
│ ┌──────────────────────┐ │
│ │ 🎯 1/3 ▓▓░░░░ 33%    │ │
│ │ Reward: 50 XP + Badge│ │
│ └──────────────────────┘ │
│                          │
│ ┌──────────────────────┐ │
│ │ 🎁 +50 XP             │ │
│ │ + Mystery Badge 🏅   │ │
│ │ [Claim Reward]       │ │
│ └──────────────────────┘ │
│                          │
│ Today's Lessons          │
│ ┌──────────────────────┐ │
│ │ 1. 🐱 Animals       │ │
│ │           [Start →] │ │
│ ├──────────────────────┤ │
│ │ 2. 🎨 Colors        │ │
│ │           [Start →] │ │
│ ├──────────────────────┤ │
│ │ 3. 🌳 Nature        │ │
│ │           [Start →] │ │
│ └──────────────────────┘ │
└──────────────────────────┘
```

Sticky Claim button at bottom on mobile when complete.

### 5.3 /profile — Card becomes clickable

Current card (lines 425-462) stays visually identical, but:
- Wrapped in `<Link to="/daily-challenge">` so entire card is tappable
- Small chevron `›` icon added at top-right
- Hover state: subtle lift (translate-y-1) and brighter shadow

```jsx
<Link to="/daily-challenge" className="block clay-card-coral p-5 transition-transform hover:-translate-y-1">
    {/* existing card content unchanged */}
    <span className="absolute right-3 top-3 text-2xl text-white/60">›</span>
</Link>
```

### 5.4 Sidebar Nav Addition

`fullNavItems` gains:

```ts
{ path: '/daily-challenge', label: 'Daily Challenge', shortLabel: 'Daily', iconKey: 'dailyChallenge' }
```

- `iconComponents.dailyChallenge = TargetIcon` (new SVG, simple bullseye).
- Mobile bottom nav + desktop collapsed + expanded all use the entry.
- Guest filter: **excluded** (logged-in only, like `/profile` and `/leaderboard`).
- `isRouteActive('/daily-challenge', ...)` works via existing helper.

## 6. Component Contracts

### 6.1 `<DailyChallengePage />` (default export from `DailyChallenge.tsx`)

| Prop | Type | Required |
|---|---|---|
| (none) | | |

- Internal state: `lessons`, `reward`, `claimPending`, `claimError`.
- Effects: window focus listener to re-fetch profile.
- Renders: Header band, DailyChallengeHero, DailyChallengeClaim, DailyLessonList, empty/loading/error states.

### 6.2 `<DailyChallengeHero />`

| Prop | Type |
|---|---|
| `challenge` | `DailyChallenge \| null` (the `profile.daily_challenge` shape) |
| `isLoading` | `boolean` |

Renders the coral card with title, progress bar (large), reward text.

### 6.3 `<DailyLessonList />`

| Prop | Type |
|---|---|
| `lessons` | `DailyLesson[]` |
| `isLoading` | `boolean` |
| `error` | `string \| null` |

Renders list rows, each with emoji + title + topic + Start CTA. Empty state: "Today's lessons will appear soon."

### 6.4 `<DailyChallengeClaim />`

| Prop | Type |
|---|---|
| `reward` | `DailyReward \| null` |
| `isComplete` | `boolean` |
| `pending` | `boolean` |
| `error` | `string \| null` |
| `onClaim` | `() => void` |

States:
- **Locked** (`isComplete=false`): button disabled, hint text "Complete today's lessons to unlock".
- **Ready** (`isComplete=true && !reward.day_claimed`): button enabled, calls `onClaim`.
- **Claimed** (`reward.day_claimed=true`): button replaced with "✓ Claimed today" badge; subtle confetti CSS animation plays once on transition.

## 7. CSS Strategy

Reuse existing tokens — no new design system:

- `clay-card-coral` — hero card (same as Profile's existing card).
- `clay-bg-playful` — page wrapper background.
- `clay-cta-primary`, `clay-cta-secondary` — buttons.
- `clay-card` — for lesson list rows.

New CSS in `daily-challenge.css`:

```css
.daily-challenge-hero            /* hero layout: icon + content + reward summary */
.daily-challenge-progress        /* large progress bar (height: 12px vs default 4px) */
.daily-challenge-claim           /* claim button + reward preview panel */
.daily-challenge-claim--locked   /* disabled state */
.daily-challenge-claim--ready    /* enabled + glow */
.daily-challenge-claim--claimed  /* claimed badge */
.daily-challenge-lessons         /* list wrapper */
.daily-challenge-lesson          /* single row */
.daily-challenge-lesson--done    /* completed state (strikethrough + green check) */
@keyframes confetti              /* simple CSS confetti for claimed state */
@media (max-width: 640px)         /* mobile: full-width stack, sticky claim button */
```

CSS values follow existing claymorphic pattern (4–8 px borders, soft shadows, pastel backgrounds). No hardcoded colors that aren't already in `:root` CSS variables.

## 8. Error & Edge Cases

| Condition | Behavior |
|---|---|
| `profile.daily_challenge` undefined / loading | Show hero skeleton (1 placeholder bar). |
| `getDailyLessons` fails | Show error banner with "Retry" button; lesson list shows "Couldn't load today's lessons." |
| `getDailyRewards` fails | Show "Reward preview unavailable" placeholder; claim still works when complete (degrades gracefully). |
| Daily challenge complete but reward fetch incomplete | Show "Loading reward…" instead of button. |
| Already claimed today | Button replaced with "✓ Claimed today" badge + confetti plays once. |
| User completes a lesson mid-session | Optimistic increment; window focus listener re-syncs from server. |
| Date rollover (midnight) | Page shows "Today's challenge has refreshed" toast on focus; data refetched. |
| Guest user navigates to `/daily-challenge` | Redirected to `/login` (via `RequireUserAuth`). |

## 9. Testing

### 9.1 E2E (`frontend/tests/e2e/daily-challenge.spec.ts`, Chromium only)

1. `/daily-challenge` route renders for logged-in user with seeded auth.
2. Today's lessons list shows 3 items, each with a "Start" button.
3. Clicking "Start" on lesson #1 navigates to `/courses/.../lessons/...`.
4. Progress bar matches `challenge.progress / target` (visual width %).
5. When `progress < target`, Claim button is disabled.
6. When `progress >= target`, Claim button is enabled; clicking POSTs to `/api/v1/gamification/daily-rewards/claim`.
7. After successful claim, button shows "✓ Claimed today" badge; subsequent reload shows same state.
8. Sidebar in desktop collapsed + mobile bottom nav shows "Daily" entry with TargetIcon.
9. Guest users (`guestMode === 'true'`) accessing `/daily-challenge` redirect to `/login`.
10. `/profile` Daily Challenge card is now wrapped in `<Link>`; clicking anywhere navigates to `/daily-challenge`.

### 9.2 Unit

Not required. Page is presentation + service orchestration. `apiClient` already tested.

## 10. Migration / Rollback

- No backend change (uses existing routes). Rollback = git revert.
- The inline `<section className="clay-card-coral p-5">` block in `Profile.tsx` (lines 425-462) is wrapped in `<Link>` and gets a chevron. If rollback needed, restore the standalone `<section>`.
- Sidebar nav addition is additive; rollback = remove the nav entry from `fullNavItems`.

## 11. Open Questions

None — all decisions captured.

---

## Appendix A — Wireframe (text)

### `/daily-challenge` desktop (1280×800)

```
┌──────────────────────────────────────────────────────────────────┐
│ 🎯 Daily Challenge                                                 │
│ Complete 3 lessons today to earn your reward                      │
│                                                                     │
│ ┌────────────────────────────┐  ┌─────────────────────────────┐ │
│ │ 🎯  Daily Challenge         │  │ 🎁 Today's Reward            │ │
│ │  Complete 3 Lessons         │  │  +50 XP                      │ │
│ │  Progress 1/3               │  │  + Mystery Badge 🏅          │ │
│ │  ▓▓▓░░░░░░░░░░░░░ 33%       │  │                              │ │
│ │  Reward: 50 XP + Badge      │  │  [Claim Reward]  ← disabled  │ │
│ │                              │  │             until complete    │ │
│ └────────────────────────────┘  └─────────────────────────────┘ │
│                                                                     │
│ Today's Lessons                                                     │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ 1.  🐱 Animals — Vocabulary                                   │ │
│ │                              [Start →]                       │ │
│ ├──────────────────────────────────────────────────────────────┤ │
│ │ 2.  🎨 Colors — Quiz                                          │ │
│ │                              [Start →]                       │ │
│ ├──────────────────────────────────────────────────────────────┤ │
│ │ 3.  🌳 Nature — Video                                         │ │
│ │                              [Start →]                       │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### `/daily-challenge` mobile (390×844)

```
┌──────────────────────────┐
│ 🎯 Daily Challenge       │
│ Complete 3 lessons       │
│                          │
│ ┌──────────────────────┐ │
│ │ 🎯 1/3 ▓▓░░░░ 33%    │ │
│ │ Reward: 50 XP + Badge│ │
│ └──────────────────────┘ │
│                          │
│ ┌──────────────────────┐ │
│ │ 🎁 +50 XP             │ │
│ │ + Mystery Badge 🏅   │ │
│ │ [Claim Reward]       │ │
│ └──────────────────────┘ │
│                          │
│ Today's Lessons          │
│ ┌──────────────────────┐ │
│ │ 1. 🐱 Animals       │ │
│ │           [Start →] │ │
│ ├──────────────────────┤ │
│ │ 2. 🎨 Colors        │ │
│ │           [Start →] │ │
│ ├──────────────────────┤ │
│ │ 3. 🌳 Nature        │ │
│ │           [Start →] │ │
│ └──────────────────────┘ │
│                          │
│ ┌──────────────────────┐ │
│ │ 🎁 Claim Reward      │ │ ← sticky bottom when complete
│ └──────────────────────┘ │
└──────────────────────────┘
```

### `/profile` Daily Challenge card after change

```
┌──────────────────────────────────────┐  ← wrapped in Link
│ 🎯 Daily Challenge                ›  │  ← chevron top-right
│  Complete 3 Lessons                  │
│  Progress 1/3                        │
│  ▓▓▓░░░░░░░░░░░░░ 33%                │
│  Reward: 50 XP + Mystery Badge       │
└──────────────────────────────────────┘
```