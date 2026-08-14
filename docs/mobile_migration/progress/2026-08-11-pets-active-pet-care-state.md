# Task #6 — Pets Active-Pet + Care-State Wiring (RN)

## Session
2026-08-11, agent: Claude Code, branch: MindAR-Update

## Goal
Replace PetsScreen placeholder selection/stat behavior with the real backend-supported active-pet and care-state flows already exposed by the RN API layer.

## Backend Contract Confirmed (read-only)
- `PUT /pets/active` via `petsApi.setActivePet(petId)`
  - request body: `{ pet_id }`
  - returns the active `Pet`
- `GET /pets/active/current` via `useUser()` / `petsApi.getActivePet()`
  - establishes the learner's current active pet
- `GET /gamification/pet/{user_id}` via `petsApi.getPetCareState(userId)`
  - returns `PetCareState` with `happiness`, `energy`, `hunger`, `xpEarned`, `stage`, `mood`

So this is a real implementation, NOT a `BACKEND_DEPENDENCY` — the persistence and care-state contracts already existed.

## Inputs Re-read
- `mobile/rn/src/screens/PetsScreen.tsx`
- `mobile/rn/src/hooks/usePets.ts`
- `mobile/rn/src/hooks/useUser.ts`
- `mobile/rn/src/services/api.ts`
- `mobile/rn/src/services/mappers.ts`
- `mobile/rn/src/types/pet.ts`
- `mobile/rn/src/types/petCare.ts`
- `mobile/rn/src/components/{PetSelector,PetGrid,PetCard,PetCareStats,PetUnlockModal}.tsx`
- `mobile/rn/src/i18n/{en,vi}.json`

## Changed

### `mobile/rn/src/hooks/usePets.ts`
- Added `petsApi` import.
- Extended `UsePetsResult` with `setActivePet(petId)`.
- Implemented `setActivePet` using `petsApi.setActivePet(petId)`.
- Updated local `pets` state so exactly one `pet.is_active` matches the persisted backend response.

### `mobile/rn/src/screens/PetsScreen.tsx`
- Added `useUser()` so the screen seeds from the real `activePet` and reads `userId`.
- Added `petsApi.getPetCareState(userId)` effect.
- Replaced placeholder `buildStats(pet)` logic with `buildStats(careState)` from real backend values.
- Added `careState`, `careStateError`, and `isSelectingPet` state.
- Rewired pet selection to call `setActivePet(pet.pet_id)` and then refresh the selected pet payload.
- Localized section labels and active-pet CTA states.
- Kept the existing claymorphic layout and reused the existing `PetUnlockModal` instead of introducing a new detail component.

### `mobile/rn/src/i18n/en.json` + `vi.json`
- Added under `pets`: `yourPets`, `allPets`, `activePetCta`, `updatingActivePet`, `careLoadFailed`, `activePetFailed`.

### `mobile/rn/src/__tests__/pets-screen-active-pet.test.ts` (NEW)
- Source-contract coverage for:
  1. seeding from `useUser().activePet`
  2. loading care state from `petsApi.getPetCareState(userId)`
  3. persisting selection via `usePets().setActivePet`
  4. deriving stats from real `PetCareState` fields
  5. using localized pet copy for sections/error/CTA states

## Verified
### Source-verified (read-only)
- `PetsScreen.tsx` now imports `useUser` and `petsApi`.
- `PetsScreen.tsx` calls `petsApi.getPetCareState(userId)`.
- `usePets.ts` now exposes `setActivePet` and calls `petsApi.setActivePet(petId)`.
- New pet i18n keys are present in both locales.
- Placeholder all-1 stats are removed from `PetsScreen`.

## Not Verified
Command-based verification remains blocked by the same environment issue seen earlier in this session:
- `node --test ... pets-screen-active-pet.test.ts`
- `npx tsc --noEmit`

If the Bash classifier allows commands later in-session, these should be re-run.

## Spec/Plan Corrections from Implementation Evidence
None. The screen now aligns with the already-existing RN API surface and backend contracts.

## Blockers Raised
- **ENVIRONMENT_BLOCKER:** Bash classifier may still block automated test/typecheck execution.

## Confirmations
- ✅ No Unity source modified (`mobile/unity/**` untouched)
- ✅ No `docs/unity_ar/**` modified
- ✅ No backend runtime modified (read-only inspection only)
- ✅ No Master plan doc edited
- ✅ No direct MongoDB access, no privileged Supabase credentials
- ✅ No hard-coded product data
- ✅ Reused existing Claymorphic primitives and screen structure
- ✅ No unrelated refactor outside the pet hook/screen/i18n/test boundary

## Next
- Re-run `node --test` + `npx tsc --noEmit` once the Bash classifier recovers.
- Continue with the next READY RN task.
