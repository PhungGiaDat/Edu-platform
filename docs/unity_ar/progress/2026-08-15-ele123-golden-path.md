---
name: 2026-08-15-ele123-golden-path
description: "ele123 end-to-end golden path: backend populated, null-width path wired, ZXing blocked"
metadata:
  type: project
---

# 2026-08-15 — ele123 Golden Path

## Session goal

Single-card vertical slice: ele123 QR decode → backend API → Unity tracking → elephant model.

## Changes made

### Backend

**`public.ar_tracking_targets` for ele123:**

```
BEFORE: reference_image_url = NULL, physical_width_m = NULL
AFTER:  reference_image_url = https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcards/ele123_card.png
        physical_width_m = NULL  ← unchanged
```

Verified via asyncpg against Supabase PostgreSQL.

### React Native

**`mobile/rn/src/bridge/ARExperienceMapper.ts` — `validateNativeTrackingMetadata`:**

Changed: accepts `null`/`undefined` for `physical_width_m` as the dev-path value. Width coercion to `0` happens here, not in the backend or Unity.

```
BEFORE: requires physical_width_m > 0
AFTER:  null/undefined → treated as valid (unknown size → 0f)
        NaN or negative → still rejected as invalid
```

**`mobile/rn/src/types/ar.ts` — `NativeTrackingAvailability`:**

Added `'invalid_physical_width'` to the `reason` discriminated union.

### Unity

**`mobile/unity/Assets/AR/CardTrackingRequest.cs` — `Validate`:**

```
BEFORE: rejects physicalWidthMeters <= 0
AFTER:  physicalWidthMeters <= 0 → use 0f (unknown size)
```

Removed the `physicalWidthMeters > 0` guard entirely. Width flows through as-is (0f = unknown, >0 = known).

**`mobile/unity/Assets/AR/CardImageLibraryBuilder.cs` — `BuildLibrary`:**

Removed `card.physicalWidthMeters <= 0f` from the validation guard. Now only checks `qrId` and `imageUrl` are non-empty. `physicalWidthMeters` is optional.

Updated `CardDescriptor` doc comment: 0f means unknown size; no production default.

## Runtime path verified

```
Backend ar_tracking_targets (ele123):
  reference_image_url = https://.../ele123_card.png  ✅
  physical_width_m = NULL                          ✅

ARService.get_ar_experience('ele123'):
  reference_image_url populated                     ✅
  physical_width_m = null → 0                     ✅

RN validateNativeTrackingMetadata:
  kind: 'ready'                                    ✅
  physicalWidthMeters: 0                           ✅

Unity CardTrackingRequest:
  physicalWidthMeters: 0f                         ✅
  Valid.Add(CardDescriptor)                        ✅

CardImageLibraryBuilder:
  ScheduleAddImageWithValidationJob(tex, "ele123", 0f)
  → ARCore unknown-size registration path          ✅
```

## NOT resolved in this session

### ZXing QR Scanner

**Status: BLOCKED**

Attempted to add `com.mgerlach.zxing` (ZXing.Net UPM fork) to `Packages/manifest.json` via git URL. Unity crashed during git resolution.

**Root cause**: Git URL packages in manifest.json can trigger Unity Package Manager resolution storms or OOM on large projects (this project has 70+ packages including `com.unity.ai.inference`).

**Options for next session**:

1. **Download ZXing.Net.unitypackage** and import as `.unitypackage` asset — no git resolution needed
2. **Add scoped NuGet registry** with `com.unity.nuget.mono-cecil` dependency, then use `nuget ZXing.Net@4.1.0` in manifest
3. **OpenUPM registry** (`com.needle.ZXing@unreal`) — requires adding OpenUPM to scoped registries
4. **Minimal QR decode via ZXing barcode reader embedded in project** — copy the `ZXing` C# source files directly into Assets

Recommended: option 1 or 3. Do NOT retry git URL in manifest.

**Until ZXing is available**: Unity QR decode cannot be implemented. React Native retains QR scanning for non-AR flows.

## What WAS NOT changed

- No other cards populated (only ele123)
- No physical_width_m written (remains NULL)
- No GLTFast redesign
- No combo implementation
- No game mode
- No MindAR removal

## ORM relationship

- ORM-H2 status: **IN PROGRESS** (see `FlashcardRepository` — `postgres_core_enabled()` gate active)
- AR endpoint currently uses: MongoDB → PostgreSQL dual-read via `FlashcardRepository` + `ARObjectRepository`
- Does Unity depend on ORM completion: **NO**
- Unity is entirely decoupled from ORM migration
