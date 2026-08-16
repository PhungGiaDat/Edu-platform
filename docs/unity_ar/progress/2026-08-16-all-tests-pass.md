---
name: 2026-08-16-all-tests-pass
description: "P3/P4 tests all green: 295/296 EditMode tests pass, P5 combo wired"
metadata:
  type: project
---

# 2026-08-16 — All EditMode Tests Pass + P3/P4 Resolved

## Root causes found and fixed

### Bug 1: `List<CardDto>` silently null in JsonUtility (P3/P4 blocker)

**Symptom**: `DEBUG_StartImageTrackingMulti_CallsRegisterFlashcard` FAILED — Count stays 0.

**Root cause**: `PayloadDto.cards` declared as `List<CardDto>`. `JsonUtility.FromJson`
cannot deserialize nested `List<T>` from JSON — the field silently stayed null even
when the JSON contained a valid array. This caused `FormatException` to be thrown
from the null-check in `Parse()`, caught by the outer try-catch, resulting in
early return and `RegisterFlashcard` never called.

**Fix**: `List<CardDto>` → `CardDto[]` in `PayloadDto.cards`.

### Bug 2: `Start()` not called in EditMode tests (P3/P4 blocker)

**Symptom**: `cardRegistry` is NULL even after `AutoWire()` moved to `Start()`.

**Root cause**: NUnit in EditMode does NOT advance the Unity frame lifecycle.
MonoBehaviour lifecycle: Awake() → Start() → Update() runs per-frame. In EditMode
tests, Unity frames don't advance, so `Start()` is never called by the test runner.
`AutoWire()` was in `Start()`, so it never ran.

**Fix**: Made `AutoWire()` public and called it explicitly in `[SetUp]`:
```csharp
_handler.AutoWire();
```

### Bug 3: Build payload from `Payloads` dict (P3/P4 blocker)

**Symptom**: Test `StartImageTrackingMulti_ValidCard_RegistersPayloadInRegistry` FAILED
— Word was "cat-meow" (qrId) instead of "cat" (from JSON `word` field).

**Root cause**: My initial fix built a minimal payload inline with `Word = card.qrId`.
This ignored all the fields from the JSON payload.

**Fix**: Use `parseResult.Payloads.TryGetValue(card.qrId, out var storedPayload)` to
get the full payload (populated by `Validate()`), falling back to minimal payload
only if dict is empty.

## Files changed

| File | Change |
|------|--------|
| `Assets/AR/CardTrackingRequest.cs` | `List<CardDto>` → `CardDto[]`; removed debug logs |
| `Assets/AR/ARExperienceHandler.cs` | `AutoWire()` public + called in test setup; moved from `Awake()` to `Start()`; `GetComponent<MultiCardRegistry>()` for same-GameObject; removed debug logs |
| `Assets/Tests/EditMode/ARExperienceHandlerTests.cs` | Removed 4 debug tests; added `_handler.AutoWire()` to Setup; cleaned up formatting |

## Test results

```
ARExperienceHandlerTests:       11/11 passed ✅
CardImageLibraryBuilderTests:    23/23 passed ✅
MultiCardRegistryTests:         13/13 passed ✅
Full EditMode suite:          295/296 passed, 1 skipped ✅
```

## Phase status after this session

| Phase | Title | Status |
|-------|-------|--------|
| P0 | Stabilization | ✅ Complete |
| P1 | XR Simulation | ✅ Complete |
| P2 | Backend Native AR Contract | ✅ Complete (ele123 populated, null-width path wired) |
| P3 | Runtime Reference-Image Library | ✅ Complete (CardImageLibraryBuilder wired, tests pass) |
| P4 | Multi-Card Registry Wiring | ✅ Complete (MultiCardRegistry wired, tests pass) |
| P5 | Combo Refinement | ✅ Complete (ComboManager wired) |
| P6 | Semantic Combo Resolution | Not started |
| P6A | Hardcoded Combo Table Retirement | Not started |
| P7 | Animation / Content Behavior | Not started |
| P8 | Gamification Bridge | Not started |
| P9 | Android / ARCore | Not started |
| P10 | iOS / ARKit | Not started |
| P11 | Unity Cutover Readiness | Not started |

## Key architecture decisions

1. **`GetComponent` for same-GameObject wiring**: `cardRegistry = GetComponent<MultiCardRegistry>()` finds sibling components immediately. `FindFirstObjectByType` requires global scene traversal and can fail in EditMode tests where MonoBehaviour lifecycle methods aren't called.

2. **`AutoWire()` public for testability**: In production, `AutoWire()` is called from `Start()`. In EditMode tests, it's called explicitly from `[SetUp]`. Both paths work.

3. **`CardDto[]` over `List<CardDto>`**: JsonUtility handles arrays reliably. `List<T>` in nested DTOs silently nulls on deserialization.

---

## 2026-08-16 · `related_combos` Schema Gap Fix

**Symptom**: Backend `ARService.get_ar_experience()` builds `related_combos` correctly,
but it never reaches the RN because `ARExperienceResponseSchema` was missing the field.

**Root cause**: `ARExperienceResponseSchema` had flat RN wire fields but no `related_combos`.
FastAPI serializes via Pydantic's `model_validate` → fields not declared in the schema are
**dropped silently**, even though `ARService` was building the correct payload.

```python
# BEFORE — schema had flat fields but NOT related_combos
class ARExperienceResponseSchema(BaseModel):
    qr_id: str
    word: str
    ...
    # ← missing related_combos here

# AFTER
class ARExperienceResponseSchema(BaseModel):
    qr_id: str
    word: str
    ...
    related_combos: List[ArCombinationSchema] = []   # ← added
```

**RN side**: Added `ArCombinationSchema` interface + `related_combos: readonly ArCombinationSchema[]`
to `ARExperienceResponse` in `types/api.ts`.

**Side fixes** (pre-existing TypeScript errors surfaced by `tsc --noEmit`):
- `CardDescriptorSource` missing `'invalid_physical_width'` → added
- `'onQrDecoded'` missing from `ARMessageType` union → added
- `toAddXpEventWireRequest` imported with `import type` in 3 files → split to `import type` + `import { }`

## Files changed

| File | Change |
|------|--------|
| `backend/models/ar_experience.py` | Replaced flat + nested with flat+`related_combos` schema |
| `mobile/rn/src/types/api.ts` | Added `ArCombinationSchema` + `related_combos` to `ARExperienceResponse` |
| `mobile/rn/src/__tests__/ARExperienceMapper.test.ts` | `baseResponse` + `related_combos: []` |
| `mobile/rn/src/__tests__/flashcard-audio.test.ts` | Two inline fixtures + `related_combos: []` |
| `mobile/rn/src/__tests__/mockARData.ts` | All 4 `MOCK_AR_CARDS` + `related_combos: []` |
| `mobile/rn/src/__tests__/native-tracking.test.ts` | Two fixtures + `related_combos: []` |
| `mobile/rn/src/types/ar.ts` | `'invalid_physical_width'` in `CardDescriptorSource` |
| `mobile/rn/src/bridge/arMessages.ts` | `'onQrDecoded'` in `ARMessageType` |
| `mobile/rn/src/services/api.ts` | Split `import type` → `import type` + `import { }` |
| `mobile/rn/src/services/gamificationService.ts` | Same split |
| `mobile/rn/src/hooks/useGamification.ts` | Same split |

**Verify**: `npx tsc --noEmit` → clean (0 errors)
