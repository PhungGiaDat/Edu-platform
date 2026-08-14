# R9 — Native Non-AR Pet GLB Viewer

## Session
2026-08-12, agent: Cursor, branch: MindAR-Update

## Goal
Render the selected active pet's backend-owned `model_url` as a native, non-camera GLB scene in `PetsScreen`, without using the Unity AR bridge and without embedding the legacy Web implementation in a WebView.

## Decision Resolved
**DQ-6 is resolved** in `docs/mobile_migration/plans/2026-08-09-learner-migration-plan.md`.

Approved direction:
- RN pet details own the native, non-camera GLB viewer.
- Renderer: `expo-gl` + `three` + `@react-three/fiber/native`.
- Asset source: the existing backend `Pet.model_url` contract.
- Cache: the existing `glbCache.downloadGLB(model_url)` utility.
- Failure behavior: use the pet's backend `thumbnail_url` if present, otherwise a neutral 2D pet marker.
- Unity stays the owner of AR-only tracking, placement, model interaction, and AR reward flows.

This is an RN R9 implementation decision. It does not modify the frozen RN ↔ Unity bridge contract.

## Inputs Re-read
- `frontend-web/src/components/Gamification/Pet3D.tsx`
- `mobile/rn/src/screens/PetsScreen.tsx`
- `mobile/rn/src/types/pet.ts`
- `mobile/rn/src/types/petCare.ts`
- `mobile/rn/src/utils/glbCache.ts`
- `mobile/rn/src/components/pets/CodexPetSprite.tsx`
- `docs/mobile_migration/plans/2026-08-09-learner-migration-plan.md`
- `docs/mobile_migration/spec/learner-product-spec.md`

## Implemented

### Dependencies
Added the native rendering dependencies under `mobile/rn/`:
- `expo-gl` `~16.0.10`
- `expo-asset` `~12.0.13` (required peer/config integration for native R3F)
- `three` `^0.185.1`
- `@react-three/fiber` `^9.7.0`
- `@types/three` `^0.185.4` (development declarations)

`npx expo install expo-gl expo-asset` added the `expo-asset` app configuration plugin. No `expo-three`, WebView, `@react-three/drei`, or Unity dependency was introduced.

### `mobile/rn/src/components/pets/PetModelViewer.tsx` (NEW)
- Uses `Canvas`, `useFrame`, and `useLoader` from `@react-three/fiber/native`.
- Downloads and caches the remote GLB using the existing `glbCache.downloadGLB(pet.model_url)` path.
- Loads the local GLB URI through Three.js `GLTFLoader`.
- Normalizes model bounds and centers/scales arbitrary pet assets before rendering.
- Plays the first embedded GLTF animation clip when available.
- Applies a light idle rotation when no interaction is occurring.
- Includes ambient, directional, and point lighting only; no post-processing effect was added because it would add multiple full-screen GPU render passes for a compact mobile card without an identified visual requirement.
- Converts model download/load/render failure into a 2D fallback that prioritizes `thumbnail_url`.

### `mobile/rn/src/screens/PetsScreen.tsx`
- Renders `<PetModelViewer pet={activePet} />` in the active-pet clay detail card above name, CTA, and care stats.
- Existing `useUser`, `usePets`, `petsApi.getPetCareState`, active-pet, and care-state work was preserved. Those were pre-existing workspace changes and outside this viewer task.

### `mobile/rn/src/__tests__/pets-screen-active-pet.test.ts`
- Extended existing source-contract coverage for native GLB viewer wiring:
  - viewer import and use in `PetsScreen`
  - R3F native renderer import
  - GLTFLoader use
  - `model_url` → existing GLB cache path
  - fallback branch and thumbnail fallback

## Verified

### CODE_VERIFIED
- `node --test src/__tests__/pets-screen-active-pet.test.ts` → **6/6 passed**.
- `npx tsc --noEmit` → **passed with 0 TypeScript errors**.
- `ReadLints` on changed RN source/test files → **no linter errors**.
- Verified R3F native entry point resolves:
  - `@react-three/fiber/native`
  - resolved to `node_modules/@react-three/fiber/native/dist/react-three-fiber-native.cjs.js`

## Not Verified

### RUNTIME_VERIFIED — pending
The GL view cannot be exercised in Node/typecheck. It requires an Expo native iOS build/simulator or physical iOS device with the newly installed `expo-gl` native module.

Required runtime acceptance check:
1. Build/run the native Expo app (Expo Go is insufficient if the runtime does not include the added native module).
2. Navigate Home → Pets.
3. Select a pet with a valid remote `model_url`.
4. Confirm model downloads once, is centered, visibly lit, rotates idly, and plays the first GLB clip if embedded.
5. Select a pet with a missing/broken GLB URL.
6. Confirm thumbnail/2D fallback displays with no app crash.
7. Repeat visit after relaunch to confirm cache reuse.

### DEVICE_VERIFIED — pending
Needs physical iOS device verification. Android is not a declared target for this mobile context.

## Boundaries Confirmed
- No `mobile/unity/**` sources changed by this task.
- No RN ↔ Unity bridge event/method changed.
- No camera or AR session started.
- No backend endpoint, persistence, or API contract changed.
- No fallback from `model_url` to AR reference image URL was introduced.
- Existing `model_url` remains the sole asset input for this native viewer.

## Known Risks
- GLB files with unsupported extensions, large textures, or unusually large geometry may fail or perform poorly on-device. The card will fall back on loading/render failure; asset optimization should be evaluated from actual device telemetry/screenshots before broad rollout.
- The generic bounds normalization is intentionally conservative. Individual pet assets may need catalog-supplied presentation metadata (camera distance/scale/rotation) only if device evidence demonstrates poor framing. Do not invent hard-coded model dimensions without that evidence.

## Next
1. Perform the RUNTIME_VERIFIED iOS native build check above.
2. If a model fails to load, capture the actual URL/device error before changing loader logic.
3. Add user rotation gesture only after the basic model visibility and framing are device-verified.
