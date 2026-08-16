---
name: 2026-08-16-root-cause-p3-editmode-tests
description: "P3 root cause found: List<CardDto> silently null in JsonUtility; CardDto[] fix applied"
metadata:
  type: project
---

# 2026-08-16 — P3 EditMode Test Root Cause + Fix

## Root cause identified

### Symptom
`DEBUG_StartImageTrackingMulti_CallsRegisterFlashcard` FAILS:
- `_registry.Count` stays 0 after `_handler.StartImageTrackingMulti(json)`
- `parseResult.HasValidCards` = True (parsing works)
- `parseResult.Valid.Count` = 1 (card accepted)
- BUT `parseResult.Payloads` dict is EMPTY → `RegisterFlashcard` never called

### Investigation steps
1. `CardTrackingRequest.Parse` called → `HasValidCards=True, Valid=1` ✅
2. `MultiCardRegistry.RegisterFlashcard` called directly ✅ → Count becomes 1
3. `StartImageTrackingMulti` → Count stays 0 → code path between Parse and Register broken
4. Added debug log to `StartImageTrackingMulti` → `[DEBUG] Parse complete: HasValidCards=True, Valid=1, Rejected=0`
5. Added debug log to `CardTrackingRequest.Parse` → `[CardTrackingRequest] Validate: Valid.Add(cat-meow)` **DID NOT APPEAR**
6. Conclusion: `Validate()` was NOT being called → `dto.cards` was null

### Root cause
`PayloadDto.cards` declared as `List<CardDto>`. `JsonUtility.FromJson<PayloadDto>(json)` cannot deserialize nested `List<T>` from JSON when the DTO structure contains an array field.

Specifically, `JsonUtility.FromJson` has known limitations with `List<T>` in nested DTOs — the `List` field silently stays null even when the JSON contains a valid array.

### Fix applied
```csharp
// BEFORE (broken):
public List<CardDto> cards;

// AFTER (fixed):
public CardDto[] cards;
```
Also updated null/empty check: `dto.cards.Count == 0` → `dto.cards.Length == 0`

## Files changed
- `mobile/unity/Assets/AR/CardTrackingRequest.cs` — `List<CardDto>` → `CardDto[]`

## Still pending
- [ ] Run `ARExperienceHandlerTests` after Unity restart to verify fix
- [ ] Remove debug log from `CardTrackingRequest.cs` line 75 (`[CardTrackingRequest] Parse: dto.cards.Length=...`)
- [ ] Remove debug tests from `ARExperienceHandlerTests.cs`:
  - `DEBUG_RegistryFound_AfterSetup`
  - `DEBUG_CardTrackingRequest_ParsesCorrectly`
  - `DEBUG_DirectRegisterFlashcard_Works`
  - `DEBUG_StartImageTrackingMulti_CallsRegisterFlashcard`
- [ ] Remove debug log from `ARExperienceHandler.cs` line 379 (`[DEBUG] Parse complete: HasValidCards=...`)
- [ ] Run full EditMode test suite after cleanup

## Phase status
- P2: ✅ Complete (ele123 populated, null-width path verified end-to-end)
- P3: ⚠️ Partial — fix applied, awaiting test verification
- P4: ⚠️ Partial — MultiCardRegistry wired, awaiting P3 test to verify
- P5: ⚠️ Partial — ComboManager wired, blocked on P4 verification
