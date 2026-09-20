# Explicit Debug Session Isolation

Date: 2026-09-20

## Scope

Debug tooling (Eruda console) now requires an explicit `?debug=true` or `?eruda=true` query. Two leaks were closed:

1. `frontend/public/ar-xr.html` implicitly enabled Eruda whenever `location.hostname === 'localhost'`, regardless of query.
2. Eruda mounted from `frontend/index.html` on a `?debug`/`?eruda` hard-load persisted across SPA navigation, leaking its console DOM into every subsequent non-debug route.

## Changed files

- `frontend/public/ar-xr.html`
- `frontend/src/App.tsx`
- `frontend/src/__tests__/debugOverlayContract.test.ts`

No QRScanner, DeviceMotion, TABLETOP, XR targeting, model transforms, smoothing, target-loss grace, target catalogue, `LearnAR8thWall` operator gating, `mobile-debug.js`, or backend code changed.

## Root cause

- The XR viewer Eruda loader condition carried a `|| location.hostname === 'localhost'` fallback, activating the debug console on any localhost load even without an explicit query.
- `index.html` mounts Eruda into `[data-eruda-root]` on a debug/eruda hard-load. React Router client-side navigation never reloads that document, so the mounted `#eruda` and `[data-eruda-root]` nodes survived into non-debug routes with no teardown owner.

## Fix

- `ar-xr.html`: removed the localhost bypass from the Eruda loader condition. It now activates only for explicit `eruda=true` or `debug=true`.
- `App.tsx`: added a `useLocation()`-driven effect that, on any route lacking explicit `debug=true`/`eruda=true`, calls `window.eruda?.destroy?.()` (best-effort) and removes all `[data-eruda-root]` and `#eruda` DOM roots.

## Verification

- RED: `npm --prefix frontend test -- src/__tests__/debugOverlayContract.test.ts` failed on the two new Fix 2 contracts (XR loader still allowed localhost; App.tsx had no cleanup). Three pre-existing stale assertions (removed `data-copy-all-logs`, `XR_CONSOLE_`, renamed `canUseOperatorControls`→`showOperatorTools`) were corrected to match current source in the same pass.
- GREEN: `npm --prefix frontend test -- src/__tests__/debugOverlayContract.test.ts src/__tests__/LearnAR8thWall.transitionUX.test.tsx` passed: 30 tests.
- `npx tsc --noEmit -p frontend/tsconfig.app.json` reported no errors for `App.tsx`.
- `git diff --check` clean for all three changed files.
- Reviewer subagent was infra-blocked (all models failed: haiku model-ID ambiguity, sonnet 429 rate-limit, opus 401 credits exhausted). Manual review substituted with explicit user approval: confirmed no other implicit Eruda activation remains in the `ar-xr.html` loader block, the cleanup effect no-ops on debug routes and is idempotent (no unmount cleanup needed), and `LearnAR8thWall` `showOperatorTools` gating is untouched.

## Physical retest

1. Open a clean normal URL (no query); verify no Eruda console and no Telegram operator controls.
2. Scan a valid QR and confirm transition to XR with no debug tooling.
3. Open an explicit `?debug=true` route as an authorized operator; verify Eruda and operator tooling appear.
4. Navigate in the same tab to a normal query-free route; verify the Eruda root and console no longer exist in the DOM.
