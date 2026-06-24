# Plan — Simultaneous Dual-Card AR Rendering (v4)

Date: 2026-06-23
Mode: Human Interactive
Phase: 5 (Testing)

## Objective
Implement non-combo dual-card tracking by merging two existing single-target MindAR v2 `.mind` files in-browser, while preserving existing combo and proximity behavior.

## Confirmed Current Architecture
- `useMultiFlashcard` owns combo lookup and lifecycle (`/api/v1/combos/check`, preflight, commit/reject).
- `LearnARV2` controls viewer commitment timing using tracking-settle logic (700ms + 900ms idle).
- `ARContainerV2` passes `mindUrl` and ordered target assets through the query-string pipeline.
- `ar-viewer.js` already supports multi-target bindings and per-target found/lost handling.

## Gap to Fix
In non-combo MULTI mode, page passes two model configs but only one single-target `mindUrl`, so target index 1 never tracks.

## Implementation Scope (v4)
1. Add combo resolution state and deterministic `comboKey` behavior in `useMultiFlashcard`.
2. Expose `shouldPrepareIndependentMulti` for terminal non-combo outcomes.
3. Add in-browser Mind merge utility for two v2 single-target buffers.
4. In `LearnARV2`, prepare merged bytes with:
   - single `AbortController`
   - operation-id stale result protection
   - validation and merge
   - model/fallback preflight
   - deterministic target ordering
5. Transfer merged bytes to the iframe with `MIND_BUFFER_REQUEST` / `MIND_BUFFER`; the iframe owns and revokes the Blob URL used by MindAR.
6. Commit merged multi viewer only after tracking-settle invariant.
7. Preserve viewer source precedence:
   1) committed combo
   2) committed merged multi
   3) first-card single-target mind
8. Add recoverable UI for prepare failure (retry/remove second card).
9. Add required debug events for preparation, commit, failure, and revocation.

## Constraints
- Exactly 2 cards max for this page.
- No backend schema/API migration.
- No raw-image compile flow.
- Do not change combo/proximity architecture.

## Deliverables
- Updated `useMultiFlashcard.ts`
- Updated `LearnARV2.tsx`
- New `mergeMindTargets.ts`
- `@msgpack/msgpack` dependency in frontend

## Gate 1 Browser Finding

A Blob URL created by the React parent failed MindAR's iframe fetch. The implementation therefore transfers the merged bytes to the iframe and creates the Blob URL inside the viewer's own execution context. Headless Chrome confirmed that this path reaches the real viewer target-lookup stage.
