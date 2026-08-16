## Session
2026-08-15, agent: claude, branch: MindAR-Update

## Goal
P2-FAST-UNBLOCK: Audit backend native AR fields, identify usable reference images, update architecture to include Unity QR discovery, update specs to reflect nullable width semantics, remove BLOCKED_ON_CONTENT as P2 implementation blocker.

## Audit Results

### Backend ar_tracking_targets (PostgreSQL)
- **Total cards**: 24
- **`reference_image_url`**: 0 populated, 24 NULL
- **`physical_width_m`**: 0 populated, 24 NULL
- Native AR fields (`reference_image_url`, `physical_width_m`) **already exist** in the `ar_tracking_targets` PostgreSQL table — they were added in a prior session
- Schema contract is READY — no migration needed

### Storage images (Supabase AR_models bucket)
**Confirmed matches — 16/24:**
```
ele123          → AR_models/images/flashcards/ele123_card.png
palm01          → AR_models/images/flashcards/palm01_card.png
apple01         → AR_models/images/flashcards/apple01_card.png
banana01        → AR_models/images/flashcards/banana01_card.png
cake01          → AR_models/images/flashcards/cake01_card.png
birthday01      → AR_models/images/flashcards/birthday01_card.png
car01           → AR_models/images/flashcards/car01_card.png
suv01           → AR_models/images/flashcards/suv01_card.png
truck01         → AR_models/images/flashcards/truck01_card.png
tree01          → AR_models/images/flashcards/tree01_card.png
flower01        → AR_models/images/flashcards/flower01_card.png
mushroom01      → AR_models/images/flashcards/mushroom01_card.png
cactus01        → AR_models/images/flashcards/cactus01_card.png
jungle01        → AR_models/images/flashcards/jungle01_card.png
hama001         → AR_models/images/flashcards/hama.jpg
huucaoco001     → AR_models/images/flashcards/huucaoco.jpg
```

**Unconfirmed — 5/24 (need product verification):**
```
cat001          → AR_models/images/flashcards/cats.jpg       (generic cat photo)
catcow001       → AR_models/images/flashcards/cats.jpg       (generic cat photo)
fredcat001      → AR_models/images/flashcards/cats.jpg       (generic cat photo)
giraffe001      → AR_models/images/flashcards/elephant_card.png (WRONG - elephant image)
hippo001        → AR_models/images/flashcards/elephant_card.png (WRONG - elephant image)
```

**No match — 3/24:**
```
combo_ele_jungle  (combo target, no individual card image needed)
dog123             (no existing image found)
britishshorthair001 (no existing image found)
```

### Width semantics — NOT mutated
- `physical_width_m` remains NULL for all 24 cards
- No guessed/placeholder widths were written
- Contract preserves nullable `Optional[float]`

## Architecture Change: Unity QR Discovery

### Before (RN-only QR)
```
React Native Camera → QR Scanner (ZXing/ML Kit)
→ "ele123" (qrId string)
→ GET /api/v1/flashcard/{qrId}
→ Unity startImageTracking([{qrId, imageUrl, width}])
→ Unity download reference image
```

### After (Unity QR Discovery + RN resolution)
```
Unity ARScene active
→ AR Foundation camera (ARCameraManager)
→ throttled XRCpuImage capture (e.g., every 0.5s)
→ ZXing QR decode → qrId
→ if qrId not in knownQrIds:
    → Unity emits onQrDecoded({qrId})
    → RN receives event
    → RN calls GET /api/v1/flashcard/{qrId}
    → RN sends tracking payload to Unity
    → Unity adds reference image to MutableRuntimeReferenceImageLibrary
    → AR Foundation detects printed card
    → ARTrackedImage fires for that qrId
```

### QR ≠ AR tracking target
| Concept | What | Where |
|---------|------|--------|
| QR decode | Camera → pixel → string (qrId) | Unity (AR Foundation camera + ZXing) |
| AR tracking target | Reference image → feature match | Unity (MutableRuntimeReferenceImageLibrary + ARTrackedImageManager) |
| QR resolver | `/api/v1/flashcard/{qrId}` → metadata | React Native → Backend |

### State machine (Unity-side QR)
```
UNKNOWN
→ SCANNING (AR Foundation camera active)
→ QR_DETECTED (QR string decoded)
→ RESOLVING (onQrDecoded emitted to RN)
→ REGISTERING (reference image added to library)
→ TRACKING (ARTrackedImage fires)
```

- Throttle: conservative interval (e.g., every 0.5–1.0s) to avoid per-frame decode
- Dedup: `knownQrIds` set suppresses repeated backend requests
- XRCpuImage: released immediately after processing (no holding resources)
- New qrId during active session: fully supported (add to pending set, resolve, register)

## Contract Changes

### Backend (verified READY)
- `reference_image_url`: nullable string in `ar_tracking_targets` table ✅
- `physical_width_m`: nullable float in `ar_tracking_targets` table ✅
- No schema migration needed — fields existed from prior session

### RN DTO (needs update)
- `CardDescriptorRN` in `mobile-ar-product-spec.md` already defines `imageUrl` + `physicalWidthMeters` ✅
- `ARExperienceMapper.ts` needs to pass these through to Unity
- Backend response: `ARExperienceResponseSchema` already has `reference_image_url` + `physical_width_m` ✅

### Unity CardDescriptor (needs update)
- `ARExperiencePayloadDto` in `ARPayloadMapper.cs` **lacks** `imageUrl` + `physicalWidthMeters` fields — update needed
- `ARExperiencePayload` struct needs `ImageUrl` + `PhysicalWidthMeters` fields
- `CardImageLibraryBuilder` needs to accept null width and use ARFoundation's unknown-size registration path

## Runtime Width Behavior

### AR Foundation 6.3.5 + ARCore 6.3.5

**Known width path:**
```
ScheduleAddImageWithValidationJob(texture, name, physicalWidthMeters)
```

**Unknown width path:**
```
ScheduleAddImageWithValidationJob(texture, name, widthMeters: 0f)
```
ARCore AR Foundation accepts `widthMeters = 0f` for unknown size (runtime inference). This is supported on ARCore. The exact behavior may vary — device uses camera intrinsics to estimate.

**Unity-side semantic model:**
| reference image | width known | Registration path |
|---|---|---|
| YES | YES | `ScheduleAddImageWithValidationJob(tex, name, w)` |
| YES | NO | `ScheduleAddImageWithValidationJob(tex, name, 0f)` or use placeholder |
| NO | ANY | TARGET_UNAVAILABLE — card not registrable yet |

**No `DEFAULT_PHYSICAL_WIDTH_M` constant added.**

## Docs Updated

### 1. `docs/unity_ar/spec/architecture-specification.md`
Added new section "Unity QR Discovery Flow" documenting the AR Foundation camera → ZXing → RN → backend → reference image registration pipeline. QR decode is Unity-owned while ARScene is active.

### 2. `docs/unity_ar/spec/requirements-baseline.md`
Added `TRACK-REQ-012 [TARGET][MUST]`: "Unity ARScene MUST own QR code discovery via AR Foundation camera + ZXing while ARScene is active. React Native MAY retain QR scanning for non-AR flows."

### 3. `docs/unity_ar/spec/mobile-ar-product-spec.md`
Updated Section B (QR Scanning) note to clarify: "Unity QR discovery is the native AR path. RN QR scanning remains available for non-AR flows (e.g., navigation to non-AR screens)."

### 4. `docs/unity_ar/spec/backend-contract.md`
Updated BQ-3 default width answer: "nullable — `physical_width_m = NULL` is acceptable when physical measurements are not final. Unity handles unknown-size registration."

### 5. `docs/unity_ar/plans/2026-08-09-unity-ar-migration-plan.md`
- P2 dependencies: removed `BACKEND-T001` as blocking — schema is READY
- P2 scope: narrowed to "populate reference_image_url from existing storage images (16 confirmed), leave physical_width_m NULL, update Unity bridge DTOs"
- P2 acceptance gate: updated to reflect actual state
- Open question OQ-2: marked resolved (nullable width confirmed)

## Specs Touched
- `docs/unity_ar/spec/architecture-specification.md` — added QR discovery section
- `docs/unity_ar/spec/requirements-baseline.md` — added TRACK-REQ-012
- `docs/unity_ar/spec/mobile-ar-product-spec.md` — QR scanning ownership clarification
- `docs/unity_ar/spec/backend-contract.md` — BQ-3 width default answer
- `docs/unity_ar/plans/2026-08-09-unity-ar-migration-plan.md` — P2 dependency correction

## Blockers Raised
None for P2 technical contract. P2 is no longer monolithic BLOCKED_ON_CONTENT.

## P2 Status (Truthful)

| Aspect | Status |
|--------|--------|
| Backend schema (reference_image_url, physical_width_m) | READY ✅ |
| Backend API response (ARExperienceResponseSchema) | READY ✅ |
| Native tracking development contract | READY — 16/24 cards have usable images |
| reference_image_url coverage | 16/24 (confirmed), 5/24 (unconfirmed), 3/24 (none) |
| physical_width_m final coverage | 0/24 (authoritative measurements not available) |
| Production physical-card metadata | BLOCKED_ON_FINAL_CONTENT |
| Native AR implementation | NOT BLOCKED BY FINAL CARD DESIGN |

## Next
- Unity-side: Update `ARExperiencePayloadDto` + `ARExperiencePayload` to include `imageUrl` + `physicalWidthMeters`
- Unity-side: Update `ARPayloadMapper.ParseCardDescriptors()` for multi-card path
- Unity-side: Add ZXing QR scanner inside ARScene (Unity AR Foundation camera source)
- Unity-side: Implement `onQrDecoded` bridge event to RN
- Backend: Upload confirmed reference images (16) to `reference_image_url` column
- Backend: Leave `physical_width_m` as NULL (dev path supports unknown size)
- Product: Verify 5 unconfirmed images and provide correct art for dog123, britishshorthair001
- Physical: Measure physical card widths when artwork finalized
