# C27 — Home XP Header Display

## Session
2026-08-10, agent: Claude Code, branch: MindAR-Update

## Goal
Implement C27: show backend-driven XP and level in the React Native Home screen header using the existing gamification/user stats contract and existing claymorphic UI primitives.

## Inputs Re-read
- `docs/mobile_migration/plans/2026-08-10-final-super-product-plan.md` — C27 marked READY_NOW
- `docs/mobile_migration/progress/2026-08-10-c14-tap-to-hear-flashcard-audio.md`
- `docs/mobile_migration/progress/2026-08-10-c15-flashcard-state-tracking-hook.md`
- `mobile/rn/src/screens/HomeScreen.tsx`
- `mobile/rn/src/components/StreakBadge.tsx`
- `mobile/rn/src/hooks/useUser.ts`
- `mobile/rn/src/types/gamification.ts`
- `frontend-web/` learner context for existing product direction

## Backend Contract Consumed
No new backend field.

C27 reuses the existing RN user/gamification surface already backed by backend endpoints:
- `stats.total_points` → XP value shown in header
- `stats.level` → level shown in header
- `streak.current_streak` → existing streak badge remains beside XP badge

No MongoDB direct access. No Supabase privileged credential use. No new API endpoint. No mutation contract added.

## Architecture

```text
backend gamification/user stats
  → useUser()
  → HomeScreen
    → xpCurrent = stats?.total_points ?? 0
    → level = stats?.level ?? 1
    → streakDays = streak?.current_streak ?? 0
  → header badge row
    → XPBadge(xpCurrent, level)
    → StreakBadge(streakDays)
```

## Changed

### `mobile/rn/src/components/XPBadge.tsx` (NEW)
- Added a dedicated claymorphic XP badge component.
- Uses existing `ClayCard` and design tokens only.
- Props: `xp`, `level`, optional `size`, optional `style`.
- Visual contract:
  - yellow clay card
  - star icon
  - explicit `XP` label
  - `Lv.{level}` text
- No hard-coded lesson/game data.
- No backend logic inside the component.

### `mobile/rn/src/screens/HomeScreen.tsx` (MODIFIED)
- Imported `XPBadge`.
- Replaced the old single-badge header row with a shared badge row.
- Header now renders:
  - `XPBadge xp={xpCurrent} level={level}`
  - `StreakBadge days={streakDays}`
- Reused existing derived values from `useUser()`.
- Added/renamed `badgeRow` style for horizontal wrap layout.

### `mobile/rn/src/__tests__/home-screen-xp.test.ts` (NEW)
- Added a focused Node `node:test` source-contract test.
- Verifies:
  1. `HomeScreen` imports `XPBadge`
  2. `xpCurrent` derives from `stats?.total_points ?? 0`
  3. `level` derives from `stats?.level ?? 1`
  4. Header renders `XPBadge` next to `StreakBadge`
  5. `XPBadge` keeps the claymorphic prop/render contract

## Verified

### Read-only verification completed
- Confirmed `HomeScreen.tsx` contains:
  - `import { XPBadge } from '../components/XPBadge';`
  - `const xpCurrent = useMemo(() => stats?.total_points ?? 0, [stats?.total_points]);`
  - `const level = useMemo(() => stats?.level ?? 1, [stats?.level]);`
  - `<XPBadge xp={xpCurrent} level={level} />`
  - `<StreakBadge days={streakDays} />`
  - `badgeRow` layout style
- Confirmed `XPBadge.tsx` contains:
  - required props `xp` and `level`
  - `ClayCard` with `variant="sm"` and `color="yellow"`
  - rendered XP value, `XP` label, and `Lv.{level}` text

## Not Verified

The environment blocked Bash execution repeatedly, so these checks could not be run in this session:
- `node --test ... src/__tests__/home-screen-xp.test.ts`
- `npx tsc --noEmit`
- full RN regression suite

Harness error observed repeatedly:
- `claude-opus-4-8 is temporarily unavailable, so auto mode cannot determine the safety of Bash right now`

Therefore C27 is **implemented** and **source-verified**, but command-based verification is still pending.

## Spec/Plan Corrections from Implementation Evidence
None.

C27 matched the approved plan cleanly:
- backend-driven XP already available through `useUser()` ✓
- no extra contract needed ✓
- header display is UI-only ✓

## Blockers Raised
- **ENVIRONMENT_BLOCKER:** Bash safety classifier unavailable, preventing test/typecheck execution.
- This is a tooling/runtime blocker, not a product or backend blocker.

## Confirmations
- ✅ No Unity source modified
- ✅ No `docs/unity_ar/**` modified
- ✅ No backend runtime modified
- ✅ No frontend-web source modified
- ✅ No direct MongoDB access added
- ✅ No privileged Supabase access added
- ✅ No hard-coded XP values introduced
- ✅ Existing streak badge preserved
- ✅ Claymorphic UI language preserved via `ClayCard` + existing tokens
- ✅ Surgical change scope only

## Next
- Record the C26 backend idempotency gap as a dedicated progress/blocker artifact.
- Re-run C27 test + typecheck once Bash execution becomes available again.
