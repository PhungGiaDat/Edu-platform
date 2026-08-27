# UX Audit Report: Daily Challenge & Leaderboard Pages

**Date:** 2026-08-25  
**Auditor:** UX Audit Agent  
**Scope:** Daily Challenge Page (`/daily-challenge`) and Leaderboard Page (`/leaderboard`)  
**Files Analyzed:**
- `frontend/src/pages/DailyChallengePage.tsx`
- `frontend/src/pages/Leaderboard.tsx`
- `frontend/src/styles/claymorphic-utilities.css`

---

## Executive Summary

Both pages are functional but fall short of their approved design specs in several key areas. The Daily Challenge page is missing its core feature (Today's Lessons with Start CTAs) and the Claim Reward action. The Leaderboard page has filter tabs that don't actually filter data, and several mobile responsiveness and accessibility gaps. Neither page implements the window-focus refetch strategy specified in the design docs.

---

## 1. Daily Challenge Page Audit

### 1.1 Current State Analysis

**What exists:**
- Header with title, subtitle, and refresh button
- Challenge title card with emoji icon
- Progress bar with percentage
- Reward preview section
- Two action buttons (Go to Courses, View Progress)
- Loading skeleton, error state, empty state

**What's missing (per spec):**
- "Today's Lessons" section with 3 lessons and Start CTAs
- Claim Reward button with locked/ready/claimed states
- Window focus listener for stale data refresh
- Optimistic progress increment
- Confetti animation on claim

### 1.2 UX Issues Identified

| # | Issue | Severity | Category | Description |
|---|-------|----------|----------|-------------|
| 1 | **Missing Today's Lessons** | HIGH | Information Architecture | The spec explicitly requires a "Today's Lessons" list with 3 actionable lesson rows and Start CTAs. This is the primary driver of challenge completion. Without it, users have no clear path to progress. |
| 2 | **No Claim Reward Action** | HIGH | Interaction Design | The spec calls for a Claim Reward button with three states: locked (disabled), ready (enabled when complete), and claimed (badge + confetti). Currently, the reward section is display-only. |
| 3 | **Confusing Progress Message** | MEDIUM | Visual Hierarchy | Line 182 shows `{target - progress} more to go` — when progress equals target, this shows "0 more to go" which is unclear. Should say "Ready to claim!" when complete (which is already shown, but the 0 remaining text can be confusing). |
| 4 | **No Auto-Refresh on Focus** | MEDIUM | Data Freshness | Spec §4.4 requires a window focus listener to refetch `/api/v1/profile/me` so progress is fresh when users return from a lesson. Not implemented. |
| 5 | **Reward Copy Inconsistency** | LOW | Content | Line 209 says "Complete a lesson to claim your reward!" even when `isComplete` is true. This message should reflect the actual state — the complete state already shows a green badge. |
| 6 | **No Sticky Claim Button** | MEDIUM | Mobile UX | Spec §5.2 calls for a sticky Claim button at the bottom on mobile when the challenge is complete. Not implemented. |
| 7 | **Refresh Button No Loading State** | LOW | Interaction Feedback | The refresh button doesn't show a loading spinner. It does have `animate-spin` on the Leaderboard refresh button but DailyChallenge doesn't. |

### 1.3 Accessibility Issues

| # | Issue | Severity | WCAG | Description |
|---|-------|----------|------|-------------|
| 1 | Missing `role` and `aria-valuenow` on progress bar | MEDIUM | 4.1.2 | The progress bar (`div.h-5`) has no ARIA attributes for screen readers. Should have `role="progressbar"`, `aria-valuenow={percent}`, `aria-valuemin={0}`, `aria-valuemax={100}`, `aria-label="Daily challenge progress"`. |
| 2 | Emoji-only refresh button label | LOW | 2.4.6 | Line 113 has `aria-label="Refresh challenge"` — this is good, but the emoji button text (🔄) provides no semantic meaning on its own. Label is adequate but the visual design should also convey meaning. |
| 3 | No skip link to main content | LOW | 2.4.1 | No skip-to-content link for keyboard/screen reader users navigating past the header. |

### 1.4 Mobile Responsiveness

| # | Issue | Severity | Description |
|---|-------|----------|-------------|
| 1 | Cards use fixed padding on mobile | LOW | Progress section uses `p-5` which becomes cramped on very small screens (320px). Consider `p-4` on mobile. |
| 2 | CTA buttons stack awkwardly | LOW | Both CTAs are full-width blocks stacked vertically. The spec shows them as side-by-side on wider mobile (sm: breakpoint). Current implementation uses `space-y-3` which is correct for mobile but could be improved. |

### 1.5 Visual Design Issues

| # | Issue | Severity | Description |
|---|-------|----------|-------------|
| 1 | Progress bar height inconsistent | LOW | Line 163 uses `h-5` (20px). The claymorphic system uses 8px/12px rhythm. Consider using `h-6` (24px) for better visual weight matching the card's `rounded-3xl` corners. |
| 2 | No shimmer animation on progress | LOW | The claymorphic system has `.clay-shimmer` for progress bars but it's not applied here. Adding it would make the bar feel more alive and communicate "working progress." |
| 3 | Header uses inline gradient | LOW | Line 101-102 uses inline `style={{ background: 'linear-gradient(...)' }}` instead of a utility class. Consider adding a `.clay-bg-coral` to the claymorphic utilities for consistency. |

---

## 2. Leaderboard Page Audit

### 2.1 Current State Analysis

**What exists:**
- Header with title, subtitle, and refresh button (with loading spinner)
- Time filter tabs (Daily / Weekly / All)
- Top 3 podium visualization
- User ranking card (when not in top 3)
- Scrollable leaderboard list
- CTA section

**What's missing (per spec):**
- Tab filtering is **visual only** — no actual data filtering
- "Demo data" badge for Daily/Weekly tabs
- Sticky tab strip on scroll
- Sticky "Your rank" card on scroll
- Proper mobile podium (1-column for #1, then #2 and #3 side by side)

### 2.2 UX Issues Identified

| # | Issue | Severity | Category | Description |
|---|-------|----------|----------|-------------|
| 1 | **Filter Tabs Do Nothing** | HIGH | Interaction Design | Lines 245-259 implement tab switching UI but `GamificationService.getLeaderboard()` is called once with no period parameter. The `timeFilter` state is set but never used. This is a broken interaction — users see three tabs and clicking them appears to do nothing. |
| 2 | **Missing Demo Data Badge** | MEDIUM | Information Architecture | Per spec §4.3, Daily/Weekly tabs should show a "Demo data — Daily/Weekly" badge explaining that values are derived. Without this, users may think the data is real-time. |
| 3 | **Your Ranking Card Position Varies** | MEDIUM | Visual Hierarchy | The "Your Ranking" card (lines 264-285) appears above the content when not in top 3, but there's no consistent sticky behavior. On long lists, the user loses sight of their ranking. Spec calls for a sticky card. |
| 4 | **No Sticky Tab Strip** | MEDIUM | Mobile UX | The tab strip should be sticky below the header on scroll. Currently it scrolls away with content, making period switching inconvenient on mobile. |
| 5 | **Inconsistent Podium Height Classes** | MEDIUM | Visual Design | Line 87 uses `sm:w-18 sm:h-18` which is invalid Tailwind (18 is not a standard size). Should be `sm:w-16 sm:h-16` or `sm:w-20 sm:h-20`. |
| 6 | **No Rank Change Indicators** | LOW | Information Architecture | Spec §2 Non-Goals says no rank-change animations, but even static indicators (↑↓) would help users see their movement. Currently users see only static position. |
| 7 | **User Rank Redundancy** | LOW | Visual Hierarchy | Lines 158-159 show "Your rank: #N" inside the LeaderboardRow AND lines 271-273 show it again in the separate "Your Ranking" card. Double information creates visual clutter. |
| 8 | **Refresh Spinner Disorienting** | LOW | Interaction Feedback | The refresh button shows a spinning 🔄 emoji during loading (line 240). Emoji rotation can be disorienting; a CSS spinner would be clearer. |

### 2.3 Accessibility Issues

| # | Issue | Severity | WCAG | Description |
|---|-------|----------|------|-------------|
| 1 | Tab buttons missing `role="tablist"` and `role="tab"` | MEDIUM | 4.1.2 | Lines 245-259 wrap tabs in `div` not `role="tablist"`, and buttons lack `role="tab"` and `aria-selected`. Screen readers won't understand the tab interface. |
| 2 | Podium avatars lack alt text | MEDIUM | 1.1.1 | Line 91 has `alt={entry.username}` — good. But line 93's fallback `👤` avatar has no alt text. Should be `alt=""` with `aria-hidden="true"` on the emoji div. |
| 3 | No live region for data updates | LOW | 4.1.3 | When leaderboard data changes or tabs are clicked, there's no `aria-live` region to announce changes to screen readers. |
| 4 | Filter tabs have small touch targets | LOW | 2.5.5 | Tab buttons are `px-4 py-2` (~44px wide, ~36px tall). While height is acceptable, width varies. Should ensure minimum 44×44px on all tabs. |

### 2.4 Mobile Responsiveness

| # | Issue | Severity | Description |
|---|-------|----------|-------------|
| 1 | Podium breaks on narrow screens | HIGH | Podium uses `gap-3 sm:gap-6` with fixed `w-20 sm:w-28` podium blocks. On 320px screens, three podium blocks exceed viewport width, causing horizontal scroll or overflow. |
| 2 | "Your Ranking" card not sticky | MEDIUM | On mobile, the ranking card scrolls away. Spec says it should be sticky. |
| 3 | Leaderboard rows too tall for mobile | LOW | Rows use `p-3 sm:p-4` with avatar `w-10 h-10 sm:w-12 sm:h-12`. On small screens, each row is ~64px tall. For a long leaderboard, this creates excessive scrolling. |
| 4 | No horizontal scroll containment | MEDIUM | On very small screens, the podium can overflow the container. The page should use `overflow-x-hidden` or `max-w-full` on the podium container. |

### 2.5 Visual Design Issues

| # | Issue | Severity | Description |
|---|-------|----------|-------------|
| 1 | Podium medal colors hardcoded | LOW | Line 76 hardcodes hex values for gold/silver/bronze. Consider using CSS custom properties from the claymorphic system for consistency. |
| 2 | Gradient on podium block may not be visible | LOW | Line 105 uses `medalColor` at 20% and 40% opacity — very subtle. The gradient may not be perceptible on smaller podium blocks. Consider stronger opacity (30%/60%). |
| 3 | Rank badge colors inconsistent | LOW | Line 125 uses `bg-yellow-400`, `bg-gray-300`, `bg-orange-300` but these don't match the podium medal colors (#FFD700 gold, #C0C0C0 silver, #CD7F32 bronze). Should be consistent. |
| 4 | "Other Rankings" heading confusing | LOW | Line 309 shows "Other Rankings" when podium exists. This is fine for English but might confuse translations. Consider "Rankings 4+" or "Remaining Rankings". |

---

## 3. Cross-Cutting Issues (Both Pages)

| # | Issue | Severity | Description |
|---|-------|----------|-------------|
| 1 | No `RequireUserAuth` guard | HIGH | Neither page implements authentication gating. Guests can access these pages. Per specs, both should redirect to `/login` for unauthenticated users. |
| 2 | Sidebar nav not verified | MEDIUM | The spec calls for sidebar entries with TrophyIcon/TargetIcon. Not verified in this audit — check `Sidebar.tsx` for nav item presence. |
| 3 | No page title management | MEDIUM | Neither page sets `document.title`. Should set "Daily Challenge — EduPlatform" and "Leaderboard — EduPlatform" for browser tabs and screen readers. |
| 4 | No focus management on route change | LOW | When navigating between pages, focus isn't managed. Screen reader users may lose context. Consider focusing the page heading on route change. |
| 5 | Claymorphic animations not reduced-motion aware | LOW | The `clay-bg-playful` gradient animation runs continuously. Users with `prefers-reduced-motion` will see a moving background that may be distracting. The claymorphic CSS has reduced-motion support but the gradient animation is inline Tailwind, not a utility class. |
| 6 | No skeleton for initial data load | MEDIUM | Both pages show skeletons during loading, but neither shows a skeleton for individual data sections (e.g., podium skeleton while list loads). |

---

## 4. Priority Recommendations

### Critical (Fix Immediately)

1. **Leaderboard: Implement actual tab filtering** — The filter tabs are the primary navigation mechanism. Without filtering, the three-tab UI is misleading and deceptive. Either implement real filtering or remove the tabs.

2. **Daily Challenge: Add Today's Lessons section** — This is the spec's primary feature. Without lesson shortcuts, the page offers no path to progress.

3. **Both Pages: Add `RequireUserAuth` guard** — Guests should not access gamification pages without authentication.

### High Priority

4. **Leaderboard: Fix podium mobile overflow** — The podium breaks layout on small screens. Implement responsive podium (1-column for #1, then #2/#3 side by side).

5. **Daily Challenge: Add Claim Reward functionality** — The claim action is a key gamification moment. Without it, completing the challenge has no payoff.

6. **Both Pages: Add ARIA tab interface** — The leaderboard tabs are a tablist but lack proper ARIA roles. The progress bar lacks ARIA attributes on Daily Challenge.

### Medium Priority

7. **Leaderboard: Add sticky "Your Ranking" card** — Users should always see their rank while scrolling.

8. **Leaderboard: Add sticky tab strip on scroll** — Period switching should be accessible without scrolling back up.

9. **Daily Challenge: Implement window focus refetch** — Progress should be fresh when users return from lessons.

10. **Both Pages: Add demo data badge to derived tabs** — Users should know when data is computed vs. real.

### Low Priority

11. **Daily Challenge: Add shimmer to progress bar** — Use existing `.clay-shimmer` class for visual polish.

12. **Leaderboard: Unify rank badge colors** — Consistent gold/silver/bronze across podium and list.

13. **Both Pages: Add `document.title` management** — Better browser tab UX and screen reader context.

14. **Both Pages: Handle reduced motion for gradient animation** — The `clay-bg-playful` animation should respect `prefers-reduced-motion`.

---

## 5. Summary Scorecard

| Page | Visual Hierarchy | Navigation | Mobile UX | Accessibility | Information Architecture | Interaction Design | Overall |
|------|-----------------|-----------|-----------|---------------|------------------------|-------------------|---------|
| Daily Challenge | ★★★☆☆ | ★★★☆☆ | ★★★☆☆ | ★★★☆☆ | ★★☆☆☆ | ★★☆☆☆ | **2.7/5** |
| Leaderboard | ★★★☆☆ | ★★☆☆☆ | ★★☆☆☆ | ★★☆☆☆ | ★★★☆☆ | ★★☆☆☆ | **2.5/5** |

**Scale:** ★★★★★ = Excellent, ★☆☆☆☆ = Poor

---

## 6. Appendix: Quick Fix Checklist

### Daily Challenge (`DailyChallengePage.tsx`)

```tsx
// Line 163-175: Add ARIA to progress bar
<div
  role="progressbar"
  aria-valuenow={percent}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="Daily challenge progress"
  className="h-5 overflow-hidden rounded-full clay-shimmer"
  style={{ background: 'rgba(255,107,107,0.15)' }}
>
  <div
    className="h-full rounded-full transition-all duration-700"
    style={{ width: `${percent}%`, background: isComplete ? 'linear-gradient(90deg, #22c55e, #4ade80)' : 'linear-gradient(90deg, #FF6B6B, #FF8E8E)' }}
  />
</div>

// Add to useEffect for window focus refetch
useEffect(() => {
  const handleFocus = () => fetchChallenge();
  window.addEventListener('focus', handleFocus);
  return () => window.removeEventListener('focus', handleFocus);
}, [fetchChallenge]);
```

### Leaderboard (`Leaderboard.tsx`)

```tsx
// Lines 244-259: Add ARIA to tabs
<div role="tablist" aria-label="Leaderboard time period" className="flex gap-2 mt-4">
  {(['all', 'weekly', 'daily'] as TimeFilter[]).map((filter) => (
    <button
      key={filter}
      role="tab"
      aria-selected={timeFilter === filter}
      onClick={() => setTimeFilter(filter)}
      // ... existing classes
    >
      {filter.charAt(0).toUpperCase() + filter.slice(1)}
    </button>
  ))}
</div>

// Fix invalid Tailwind class (line 87)
// Change: sm:w-18 sm:h-18 → sm:w-16 sm:h-16

// Add responsive podium wrapper with overflow handling
<div className="overflow-x-auto max-w-full">
  <TopThreePodium entries={topThree} currentUserId={user?.id} />
</div>
```

---

*End of UX Audit Report*
