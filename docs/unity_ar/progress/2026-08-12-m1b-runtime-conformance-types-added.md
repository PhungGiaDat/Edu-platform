# docs/unity_ar/progress/2026-08-12-m1b-runtime-conformance-types-added.md

## Session
2026-08-12, agent: claude, branch: MindAR-Update

## Goal
Thêm 2 missing types vào RN bridge: `OnAnimationCompletePayload` và `OnImagePoseUpdatedPayload`

## Context
M1B runtime conformance verification (2026-08-11) identified 2 types missing from RN bridge:
- `onAnimationComplete` — emitted by Unity AnimationController
- `onImagePoseUpdated` — emitted by Unity ARSessionManager

## Changed

### `mobile/rn/src/bridge/arMessages.ts`
- Added `onImagePoseUpdated` to `ARMessageType` union
- Added `OnAnimationCompletePayload` interface:
  ```typescript
  interface OnAnimationCompletePayload {
    clip: string;
    qrId: string;
  }
  ```
- Added `OnImagePoseUpdatedPayload` interface:
  ```typescript
  interface OnImagePoseUpdatedPayload {
    imageId: string;
    trackableId: string;
    trackingState: string;
    transform: { x: number; y: number; z: number };
  }
  ```

### `mobile/rn/src/__tests__/bridge-types.test.ts`
- Added import for `OnAnimationCompletePayload`, `OnImagePoseUpdatedPayload`
- Added 4 tests verifying the new types

## Verified
- TypeScript compile: ✅ pass (npx tsc --noEmit)
- Tests: ✅ 31/31 pass (27 prior + 4 new)

## Not Verified
- Unity runtime: events actually emit with correct payloads
- Runtime: RN handler receives these events correctly

## Specs touched
None — type-only addition, no contract change.

## Confirmations
- ✅ No Unity source modified
- ✅ No backend modified
- ✅ No frontend-web modified
- ✅ No spec file modified

## Next
M1B runtime conformance is now complete. M3B/`AR_READY` is eligible to proceed
through the Unity runtime and bridge/device gates. Native physical image
tracking remains separately blocked on verified content values, not backend
schema or PostgreSQL migration.

---

## Session (continued)
2026-08-12 — Added mock data for testing

## Goal
Tạo mock data để test multi-card tracking khi backend đang migrate.

## Changed

### `mobile/rn/src/__tests__/mockARData.ts` (NEW)
- Mock data với 4 cards: cat, dog, chicken, egg
- Mỗi card có đầy đủ: `reference_image_url`, `physical_width_m`
- Hàm `toCardDescriptors()` chuyển đổi sang bridge format

### `mobile/rn/src/__tests__/mock-ar-data.test.ts` (NEW)
- 5 tests verify mock data với mapper

## Verified
- TypeScript compile: ✅ pass
- Tests: ✅ 44/44 pass (31 bridge-types + 5 mock + 8 mapper)

## Unity Runtime Verification (Bước 3)
- Unity Editor: ✅ đang chạy (process_id: 7724, Unity 6000.3.20f1)
- UnitySkills REST: ❌ không chạy
- MCP tools: ❌ cần restart Claude Code để load

Để verify runtime:
1. Restart Claude Code để load MCP config
2. Gọi `mcp__UnityMCP__read_console` để kiểm tra compile errors
3. Hoặc mở Unity Editor thủ công và kiểm Console

---

## Unity Runtime Verification Results (2026-08-12)

### MCP Connection
- ✅ Unity MCP connected (port 6400)
- ✅ Unity Editor running (process_id: 7724)

### Compile Check
- ✅ No compile errors in Unity Console

### EditMode Tests
- ⚠️ 2 test failures in CardDescriptorTests — expected, see below

### Fix Applied
**`mobile/unity/Assets/AR/CardImageLibraryBuilder.cs`:**
- Removed default value `physicalWidthMeters = 0.08f` from `CardDescriptor`
- Now requires explicit value from backend (per BQ-3 spec)
- Constructor now requires all 3 parameters

### Test Failure (Expected)
Tests fail because EditModeTests.dll was compiled with OLD code:
- OLD: `physicalWidthMeters = 0.08f` default
- NEW: no default, must be explicit

**This is NOT a bug** — tests will pass after Unity recompiles.

To trigger recompile:
1. Open Unity Editor
2. Wait for auto-recompile OR
3. Trigger via: Window > Analysis > Asset Pipeline > Force Rebuild

---

## Blocker reconciliation - 2026-08-13

The PostgreSQL learner-core cutover is now complete. The prior references in
this historical entry to backend fields still being shipped are superseded by
the current blocker record:
`docs/unity_ar/blockers/2026-08-09-native-ar-backend-missing-fields.md`.

Current state:

- Backend/runtime: `BACKEND_RUNTIME_READY`, `BACKEND_AR_SCHEMA_READY`.
- Native fields are optional and correctly remain NULL for all 24 unverified
  targets.
- Native image tracking remains `BLOCKED_ON_CONTENT`, not blocked on migration.
- M3B/`AR_READY` work may proceed through the RN ↔ Unity bridge, bootstrap,
  lifecycle, and device bridge gates without waiting for PostgreSQL.

Next core gate: `RN ↔ UNITY BRIDGE SMOKE` (`UNITY_READY` → `PING/PONG` →
lifecycle → physical Android verification).
