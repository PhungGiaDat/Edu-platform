# Gamification Mascot UI Contract

**Status:** Approved by the product owner on 2026-08-28.

## Context

The web gamification UI has two related regressions:

1. `Leaderboard` renders rank medals in both the podium avatar fallback and the medal overlay. This makes `🥈` and `🥉` appear more than once and makes the visual hierarchy ambiguous.
2. `StreakBadge` tests still assert the emoji contract from commit `50c641f`, while commit `708bc78` intentionally replaced those emojis with inline SVG icons. The structural migration commit `d711d9c` only moved the file and is not the source of the behavior mismatch.

The product mascot is Lexi. The existing `CodexPetSprite` component already renders the Lexi spritesheet with `idle`, `waving`, `jumping`, and `waiting` animation states and honors `prefers-reduced-motion`.

## Decision

Use Lexi as the animated visual anchor for gamification surfaces, and use a dedicated semantic SVG for rank medals. Do not restore emoji icons merely to satisfy stale tests.

### Leaderboard

- Render Lexi in the leaderboard header and empty state with `CodexPetSprite`.
- Render exactly one SVG medal for each podium rank.
- Keep the crown as a decorative SVG for first place; it is not a second rank medal.
- Use a neutral SVG user icon for missing avatars. A missing avatar must never render a rank medal.
- Give each medal a unique accessible name: `1st place medal`, `2nd place medal`, or `3rd place medal`.
- Replace emoji-only controls and fallback icons touched by this change with inline SVG icons.
- When fewer than three entries exist, render those entries in the normal list so the page does not silently hide them.

### StreakBadge

- Preserve the existing API calls, fallback endpoint, response mapping, streak threshold, and public props.
- Render Lexi through `CodexPetSprite` using this state mapping:
  - loading or zero streak: `waiting`
  - active streak below seven days: `idle`
  - hot streak at seven days or above: `jumping`
- Keep the claymorphic card, blue cold-state gradient, orange-red hot-state gradient, and hot-state motion class.
- Expose the mascot meaning through an accessible label rather than visible emoji text.
- Expose the selected streak animation state on the icon container for deterministic tests and diagnostics.
- Keep the milestone star as a decorative SVG and preserve its seven-day threshold.

## Visual system

The implementation follows the `ui-ux-pro-max` design-system search for an education learner dashboard:

- Style: vibrant, block-based claymorphism with bold, playful contrast.
- Primary: `#2563EB`.
- Secondary: `#7C3AED`.
- Accent/CTA: `#F59E0B`.
- Background: `#EFF6FF`.
- Foreground: `#0F172A`.
- Heading font: Nunito; body font: DM Sans.
- Interaction transitions: 150–300ms, with visible focus states.
- Animation must stop or reduce under `prefers-reduced-motion: reduce`.
- Emoji must not be used as a UI icon when an SVG or mascot asset is available.

## Boundaries

- Do not change the gamification API, `LeaderboardEntry`, authentication, routing, or reward semantics.
- Do not modify paused React Native or Unity surfaces.
- Keep the change limited to the leaderboard/streak UI, the existing Lexi sprite usage, their tests, and the frontend-web documentation.
- Do not rewrite unrelated red tests from the full suite.

## Test contract

The focused tests must verify behavior rather than implementation-era emoji markup:

- Leaderboard tests query unique medal accessible names and assert exactly three podium medals for a three-or-more-entry dataset.
- Leaderboard tests verify Lexi is present in the empty state and that one- and two-entry datasets remain visible.
- Streak tests query Lexi's accessible label, the `data-animation-state` contract, hot/cold classes, and the SVG milestone indicator.
- The focused tests must pass before the TypeScript build and lint gates are evaluated.

## Verification gates

1. Observe the focused regression tests fail against the old markup.
2. Implement the smallest production change that satisfies this contract.
3. Run the focused tests again and require zero failures.
4. Run `npm.cmd run build` and `npm.cmd run lint -- --quiet` from `frontend/`.
5. Record exact results in `docs/frontend-web/progress/`.
