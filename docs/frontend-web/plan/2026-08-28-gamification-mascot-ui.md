# Gamification Mascot UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the Leaderboard medal duplication and StreakBadge emoji/SVG test mismatch while making Lexi the animated mascot for the web gamification UI.

**Architecture:** Reuse the existing `CodexPetSprite`/Lexi spritesheet for mascot animation and keep rank identity in a single semantic inline SVG medal component. Leaderboard data flow, StreakBadge API calls, fallback mapping, and public props remain unchanged; only presentation contracts, focused tests, and the targeted short-list rendering bug change.

**Tech Stack:** React 18, TypeScript 5.8, Vite, Vitest, Testing Library, Tailwind utility classes, existing CSS claymorphism utilities.

## Global Constraints

- Preserve `GamificationService`, `LeaderboardEntry`, authentication, routes, API endpoints, fallback behavior, and reward semantics.
- Use the existing `frontend/src/features/pets/components/CodexPetSprite.tsx` and `/assets/pets/lexi/spritesheet.webp`; do not create a competing mascot asset.
- Use SVG or Lexi for UI visuals; do not restore emoji icons to satisfy stale tests.
- Preserve vibrant claymorphism with `#2563EB`, `#7C3AED`, `#F59E0B`, rounded surfaces, tactile shadows, visible focus, and reduced-motion support.
- Keep React Native, Unity, AR, and unrelated failing frontend suites out of scope.
- Work in the existing non-main checkout and preserve unrelated dirty changes; do not stage or commit files in this task.
- Follow TDD: update the failing contract tests, observe RED, implement one focused change, then observe GREEN.

---

### Task 1: Establish the approved visual and accessibility contracts with failing tests

**Files:**
- Modify: `frontend/src/__tests__/Leaderboard.test.tsx`
- Modify: `frontend/src/__tests__/components/StreakBadge.test.tsx`
- Read: `docs/frontend-web/spec/2026-08-28-gamification-mascot-ui.md`

**Interfaces:**
- Leaderboard tests rely on `Leaderboard` from `frontend/src/pages/Leaderboard.tsx` and `GamificationService.getLeaderboard`.
- Streak tests rely on `StreakBadge` from `frontend/src/features/gamification/components/StreakBadge.tsx` and the existing mocked `apiClient`/`AuthContext`.

- [x] **Step 1: Replace Leaderboard's emoji-specific assertions with the approved semantic contract**

In `frontend/src/__tests__/Leaderboard.test.tsx`, update the medal test to assert one accessible medal for each rank and three medals total:

```tsx
it('shows one semantic SVG medal for each podium rank', async () => {
  vi.mocked(GamificationService.getLeaderboard).mockResolvedValue(mockLeaderboardEntries);

  render(<Leaderboard />, { wrapper: TestWrapper });

  await waitFor(() => {
    expect(screen.getByRole('img', { name: '1st place medal' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '2nd place medal' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '3rd place medal' })).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: /place medal$/i })).toHaveLength(3);
  });
});
```

Update the empty-state test to expect Lexi instead of an emoji trophy:

```tsx
it('shows Lexi in the empty state', async () => {
  vi.mocked(GamificationService.getLeaderboard).mockResolvedValue([]);

  render(<Leaderboard />, { wrapper: TestWrapper });

  await waitFor(() => {
    expect(screen.getByRole('img', { name: 'Lexi, your leaderboard companion' })).toBeInTheDocument();
  });
});
```

Update the filter assertions to the existing visible labels/classes and add the short-list contract:

```tsx
expect(screen.getByText('All Time')).toBeInTheDocument();
expect(screen.getByRole('tab', { name: /All Time/i })).toHaveClass('leaderboard-filter-btn-active');
expect(screen.getByRole('tab', { name: /Weekly/i })).toHaveClass('leaderboard-filter-btn-active');

it('keeps one entry visible in the normal ranking list', async () => {
  vi.mocked(GamificationService.getLeaderboard).mockResolvedValue([
    { user_id: 'user-1', username: 'Solo', points: 100, rank: 1 },
  ]);

  render(<Leaderboard />, { wrapper: TestWrapper });

  await waitFor(() => {
    expect(screen.getByText('Solo')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '1st place medal' })).toBeInTheDocument();
  });
});
```

Replace the old exact trophy assertion in the single-entry test with the same `1st place medal` semantic assertion, and retain the large-number assertion after the short-list fix.

- [x] **Step 2: Replace StreakBadge's emoji and selector assertions with the Lexi state contract**

In `frontend/src/__tests__/components/StreakBadge.test.tsx`, use the following assertions:

```tsx
it('shows Lexi cheering when streak > 0', async () => {
  vi.mocked(apiClient.get).mockResolvedValue({
    current_streak: 5,
    longest_streak: 10,
    last_activity: '2024-01-15',
    streak_active_today: true,
  });

  render(<StreakBadge />);

  await waitFor(() => {
    expect(screen.getByRole('img', { name: 'Lexi cheering your learning streak' })).toBeInTheDocument();
  });
});

it('shows Lexi waiting when streak is 0', async () => {
  vi.mocked(apiClient.get).mockResolvedValue({
    current_streak: 0,
    longest_streak: 0,
    last_activity: null,
    streak_active_today: false,
  });

  render(<StreakBadge />);

  await waitFor(() => {
    expect(screen.getByRole('img', { name: 'Lexi waiting for your next streak' })).toBeInTheDocument();
  });
});
```

Replace the hot animation test with deterministic state assertions:

```tsx
expect(container.querySelector('[data-animation-state="jumping"]')).toBeInTheDocument();
expect(container.querySelector('.clay-streak-icon--hot')).toHaveClass('motion-safe:animate-pulse');
```

Replace the cold animation test with:

```tsx
expect(container.querySelector('[data-animation-state="jumping"]')).toBeNull();
expect(container.querySelector('.clay-streak-icon--cold')).not.toHaveClass('motion-safe:animate-pulse');
```

Replace the star emoji assertion with:

```tsx
expect(container.querySelector('.clay-streak-star svg')).toBeInTheDocument();
```

- [x] **Step 3: Run the focused tests and verify the expected RED state**

Run from `frontend/`:

```powershell
npm.cmd test -- --run src/__tests__/Leaderboard.test.tsx src/__tests__/components/StreakBadge.test.tsx
```

Expected: the tests fail because the current Leaderboard has duplicate emoji/fallback medals and no Lexi empty-state contract, while the current StreakBadge has no Lexi labels or `data-animation-state` values. Existing API/data tests should continue to run.

### Task 2: Make Leaderboard render one semantic medal and Lexi mascot visuals

**Files:**
- Modify: `frontend/src/pages/Leaderboard.tsx`
- Modify: `frontend/src/styles/claymorphic-utilities.css`
- Test: `frontend/src/__tests__/Leaderboard.test.tsx`

**Interfaces:**
- Consume `LeaderboardEntry` and `CodexPetSprite` without changing their public types.
- Produce one `role="img"` medal named `1st place medal`, `2nd place medal`, or `3rd place medal` for each rendered top-three rank.
- Produce Lexi images with stable labels `Lexi cheering for the leaderboard` and `Lexi, your leaderboard companion`.

- [x] **Step 1: Add the smallest SVG visual primitives and Lexi import**

Add the existing sprite import:

```tsx
import { CodexPetSprite } from '@/features/pets/components/CodexPetSprite';
```

Add a typed rank-medal component whose wrapper is the only accessible medal node:

```tsx
type PodiumRank = 1 | 2 | 3;

const RankMedalIcon: React.FC<{ rank: PodiumRank; className?: string }> = ({ rank, className = '' }) => {
  const label = rank === 1 ? '1st place medal' : rank === 2 ? '2nd place medal' : '3rd place medal';
  const colors = rank === 1
    ? { ribbon: '#F59E0B', fill: '#FDE68A', stroke: '#B45309' }
    : rank === 2
      ? { ribbon: '#94A3B8', fill: '#E2E8F0', stroke: '#475569' }
      : { ribbon: '#C2410C', fill: '#FED7AA', stroke: '#9A3412' };

  return (
    <span className={`leaderboard-rank-medal leaderboard-rank-medal-${rank} ${className}`} role="img" aria-label={label}>
      <svg aria-hidden="true" viewBox="0 0 48 56" fill="none">
        <path d="M15 4h7l3 13-6 4-6-4L15 4Z" fill={colors.ribbon} />
        <path d="M26 4h7l3 13-6 4-6-4L26 4Z" fill={colors.ribbon} />
        <circle cx="24" cy="36" r="15" fill={colors.fill} stroke={colors.stroke} strokeWidth="3" />
        <text x="24" y="42" textAnchor="middle" fontSize="16" fontWeight="800" fill={colors.stroke}>{rank}</text>
      </svg>
    </span>
  );
};
```

Add a neutral `UserAvatarIcon`, `RefreshIcon`, `CalendarIcon`, `BoltIcon`, and `AlertIcon` in the same page file as small `aria-hidden="true"` inline SVGs. These replace emoji-only icons touched in this page without introducing a new icon dependency.

- [x] **Step 2: Remove duplicate rank content and add Lexi to the leaderboard surfaces**

In `TopThreePodium`:

- Keep `CrownIcon` as the first-place decorative visual.
- Add exactly one `RankMedalIcon` for each of the three podium entries.
- Replace the rank emoji avatar fallback with `UserAvatarIcon`.
- Do not render rank text or emoji inside the avatar.

Use this shape for the first-place decoration:

```tsx
{isFirst && (
  <div className="leaderboard-crown-container">
    <CrownIcon className="leaderboard-crown" />
    <RankMedalIcon rank={1} className="leaderboard-podium-medal" />
  </div>
)}
```

Use this shape for second and third place:

```tsx
{!isFirst && (
  <RankMedalIcon rank={actualRank as 2 | 3} className="leaderboard-podium-medal" />
)}
```

Replace the no-avatar branch with:

```tsx
<UserAvatarIcon className="h-8 w-8 text-slate-400" />
```

Replace the existing emoji-only refresh, filter, user-card, XP, and error visuals with the new SVG primitives. Keep all existing text, buttons, routes, and service calls unchanged.

Render Lexi in the header and empty state:

```tsx
<div className="leaderboard-mascot-container">
  <CodexPetSprite animationState="waving" label="Lexi cheering for the leaderboard" size={68} />
</div>
```

```tsx
<div className="leaderboard-empty-icon">
  <CodexPetSprite animationState="waving" label="Lexi, your leaderboard companion" size={112} />
</div>
```

- [x] **Step 3: Keep short leaderboards visible**

After calculating `topThree` and `restEntries`, add:

```tsx
const listEntries = topThree.length < 3 ? entries : restEntries;
```

Use `listEntries` for the normal list and its count. Use `index + 1` when `topThree.length < 3`, otherwise use `index + 4`:

```tsx
{listEntries.map((entry, index) => (
  <LeaderboardRow
    key={entry.user_id}
    entry={entry}
    position={topThree.length < 3 ? index + 1 : index + 4}
    isCurrentUser={entry.user_id === user?.id}
  />
))}
```

Render `RankMedalIcon` in `LeaderboardRow` for positions one through three and numeric text for later positions.

- [x] **Step 4: Add claymorphic mascot and medal styling with reduced-motion support**

Add to `frontend/src/styles/claymorphic-utilities.css`:

```css
.leaderboard-mascot-container {
  width: 68px;
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 24px;
  background: linear-gradient(145deg, #dbeafe, #ede9fe);
  border: 3px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 6px 0 rgba(91, 141, 239, 0.22), inset 0 2px 0 rgba(255, 255, 255, 0.9);
}

.leaderboard-rank-medal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.leaderboard-rank-medal svg {
  width: 42px;
  height: 49px;
  filter: drop-shadow(0 4px 0 rgba(15, 23, 42, 0.14));
}

.leaderboard-podium-medal {
  position: absolute;
  right: -10px;
  bottom: -10px;
  animation: medal-bounce 1.5s ease-in-out infinite;
}

.leaderboard-row-medal svg {
  width: 28px;
  height: 33px;
}

@media (prefers-reduced-motion: reduce) {
  .leaderboard-podium-medal {
    animation: none;
  }
}
```

- [x] **Step 5: Run the Leaderboard focused tests and verify GREEN**

Run:

```powershell
npm.cmd test -- --run src/__tests__/Leaderboard.test.tsx
```

Expected: all Leaderboard tests pass, including unique medal names, Lexi empty state, and one-entry visibility.

### Task 3: Make StreakBadge use Lexi animation states without changing its data behavior

**Files:**
- Modify: `frontend/src/features/gamification/components/StreakBadge.tsx`
- Modify: `frontend/src/__tests__/components/StreakBadge.test.tsx`

**Interfaces:**
- Consume the current `useAuth` and `apiClient` contracts unchanged.
- Produce a `CodexPetSprite` role image with the approved label and a parent `data-animation-state` of `waiting`, `idle`, or `jumping`.

- [x] **Step 1: Replace the generic streak icons with a typed Lexi state mapping**

Import the existing sprite:

```tsx
import { CodexPetSprite, type CodexPetAnimationState } from '@/features/pets/components/CodexPetSprite';
```

After loading state has been resolved, derive:

```tsx
const mascotAnimation: CodexPetAnimationState = isHotStreak
  ? 'jumping'
  : hasStreak
    ? 'idle'
    : 'waiting';

const mascotLabel = isHotStreak
  ? 'Lexi celebrating your hot streak'
  : hasStreak
    ? 'Lexi cheering your learning streak'
    : 'Lexi waiting for your next streak';
```

For loading, use `waiting` with label `Lexi preparing your streak`.

- [x] **Step 2: Preserve card styling and expose deterministic animation state**

Replace the current Fire/Snowflake icon block with:

```tsx
<div
  className={`clay-streak-icon ${isHotStreak ? 'clay-streak-icon--hot' : 'clay-streak-icon--cold'} ${isHotStreak ? 'motion-safe:animate-pulse' : ''}`}
  data-animation-state={mascotAnimation}
>
  <CodexPetSprite
    animationState={mascotAnimation}
    label={mascotLabel}
    size={40}
    className="drop-shadow-sm"
  />
</div>
```

The loading block uses the same wrapper with `data-animation-state="waiting"`, `clay-streak-icon--hot`, and a `CodexPetSprite animationState="waiting" label="Lexi preparing your streak"` child. Keep the existing number gradients, `Day Streak` label, seven-day threshold, and decorative star SVG.

Remove the now-unused FireIcon and SnowflakeIcon definitions. Keep the milestone StarIcon as an aria-hidden SVG.

- [x] **Step 3: Run the StreakBadge focused tests and verify GREEN**

Run:

```powershell
npm.cmd test -- --run src/__tests__/components/StreakBadge.test.tsx
```

Expected: all StreakBadge tests pass with Lexi accessible labels, `waiting`/`idle`/`jumping` state coverage, hot/cold styling, fallback API behavior, and the SVG milestone indicator.

### Task 4: Run quality gates and record evidence

**Files:**
- Modify: `docs/frontend-web/progress/2026-08-28-gamification-mascot-ui.md`
- Read: `docs/frontend-web/spec/2026-08-28-gamification-mascot-ui.md`
- Read: `docs/frontend-web/plan/2026-08-28-gamification-mascot-ui.md`

- [x] **Step 1: Run the combined focused regression suite**

Run:

```powershell
npm.cmd test -- --run src/__tests__/Leaderboard.test.tsx src/__tests__/components/StreakBadge.test.tsx
```

Expected: zero failures in both files.

- [x] **Step 2: Run the TypeScript/build gate**

Run:

```powershell
npm.cmd run build
```

Expected: `tsc -b` and `vite build` exit with code 0. Existing non-blocking Vite dependency/chunk warnings may remain.

- [x] **Step 3: Run lint and whitespace checks**

Run:

```powershell
npm.cmd run lint -- --quiet
git diff --check
```

Expected: lint and whitespace checks exit with code 0.

- [x] **Step 4: Audit scope and update progress**

Run:

```powershell
rg -n "🥇|🥈|🥉|🔥|❄️|⭐|🔄|👤" frontend/src/pages/Leaderboard.tsx frontend/src/features/gamification/components/StreakBadge.tsx
git status --short
```

Expected: no emoji-only UI icons remain in the two modified production components; status shows only the scoped source/test/docs changes plus any pre-existing unrelated changes. Record exact test/build/lint results and any warnings in the progress file. Do not stage or commit files.
