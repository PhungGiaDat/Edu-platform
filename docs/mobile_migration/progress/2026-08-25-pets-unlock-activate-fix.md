# Pets Unlock Popup → Activate Fix

## Session
2026-08-25, agent: Cursor, branch: MindAR-Update

## Goal
Fix the RN pets flow where the unlock popup appeared but the selected pet was not persisted as the user's active pet.

## Root Cause
`mobile/rn/src/screens/PetsScreen.tsx` opened `PetUnlockModal` directly from the detail-card CTA without calling `setActivePet(activePet.pet_id)`. The selector/grid path did persist activation, but `useUser().activePet` was not refreshed after a successful activation, so the screen could drift from the backend source of truth.

## Changed
- Updated the detail-card CTA to call `setActivePet(activePet.pet_id)` before showing the unlock celebration modal.
- Kept the existing active-pet fast path: if the displayed pet is already active, the modal opens without another API mutation.
- Added activation loading/error handling to the CTA path.
- Refreshes `useUser().activePet` after successful activation from both the CTA and selector/grid selection paths.
- Extended `pets-screen-active-pet.test.ts` with source-contract checks for CTA activation, modal display, loading guard, and user refresh.
- Relaxed the existing `useUser()` assertion so it checks the contract rather than a formatting-specific one-line destructuring shape.

## Verified
### CODE_VERIFIED
- `npx tsc --noEmit` passed with 0 TypeScript errors.
- `node --test src/__tests__/pets-screen-active-pet.test.ts` passed: 8/8 tests.

### Not Verified
- `RUNTIME_VERIFIED` pending: the native Expo app was not launched in this session.
- `DEVICE_VERIFIED` pending: no physical device test was run.

## Notes
- Node reported the existing `MODULE_TYPELESS_PACKAGE_JSON` warning for the source-contract test; it did not affect the result.
- No backend, Unity, or RN↔Unity bridge files were changed.
