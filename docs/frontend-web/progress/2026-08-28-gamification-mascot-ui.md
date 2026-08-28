# Gamification Mascot UI Progress

**Date:** 2026-08-28
**Status:** Complete
**Scope:** `Leaderboard` and `StreakBadge` web UI only.

## Approved decision

Lexi is the gamification mascot. Reuse the existing `CodexPetSprite` and Lexi spritesheet for animated mascot visuals. Use one semantic inline SVG medal per podium rank instead of restoring emoji icons.

## Evidence gathered

- `50c641f` used emoji and `animate-pulse` in `StreakBadge`.
- `708bc78` replaced the streak emoji with inline SVG and `motion-safe:animate-pulse`.
- `5687027` added a rank emoji to the podium avatar fallback and another medal overlay, creating duplicate medal text for ranks two and three.
- `d711d9c` moved the component path during frontend organization; it did not introduce the behavior mismatch.
- Existing asset: `frontend/public/assets/pets/lexi/spritesheet.webp`.
- Existing animation component: `frontend/src/features/pets/components/CodexPetSprite.tsx`; supported states include `idle`, `waving`, `jumping`, and `waiting`, with reduced-motion handling.
- `ui-ux-pro-max` design-system search recommends vibrant block-based claymorphism, Nunito headings, DM Sans body text, blue/purple/gold contrast, visible focus, and reduced-motion support.

## TDD checklist

- [x] Approved design and scope.
- [x] Spec written at `docs/frontend-web/spec/2026-08-28-gamification-mascot-ui.md`.
- [x] Plan written at `docs/frontend-web/plan/2026-08-28-gamification-mascot-ui.md`.
- [x] Focused contract tests updated and observed RED.
- [x] Leaderboard production change implemented and GREEN.
- [x] StreakBadge production change implemented and GREEN.
- [x] TypeScript/build gate passed.
- [x] Lint and whitespace checks passed.

## Verification log

The TDD RED phase exposed the stale emoji/selector assertions and a shared `CodexPetSprite` test-environment edge case where `matchMedia()` could return `undefined`. The sprite now safely no-ops for that unavailable media-query result.

Verification completed on 2026-08-28:

- Leaderboard focused suite: `1` file, `27/27` tests passed.
- StreakBadge focused suite: `1` file, `30/30` tests passed.
- Combined focused suite: `2` files, `57/57` tests passed.
- TypeScript: `tsc -b --pretty false`, exit `0`.
- Production bundle: `vite build`, exit `0`, `1467` modules transformed, `✓ built in 44.16s`.
- Lint: `eslint . --quiet`, exit `0`.
- Whitespace: `git diff --check`, exit `0`.
- Non-blocking existing build warnings remain for `three-mesh-bvh`/`BatchedMesh`, a dynamic-vs-static `PetViewer3D` import, and large chunks.

The full frontend suite was not rerun because the workspace already contains unrelated UI, AR, Sentry, and session assertion failures outside this scoped change.

## Scope guard

The full frontend suite contains unrelated existing UI, AR, Sentry, and session assertion failures. This task will report the focused gamification results separately and will not rewrite those unrelated tests.
