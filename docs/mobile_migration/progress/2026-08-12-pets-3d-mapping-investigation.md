# PetsScreen 3D Mapping — Investigation Note

## Session
2026-08-12 (evening), agent: Cursor (Claude), branch: MindAR-Update

## Goal of this note
Document findings before any code is written. Mapping `frontend-web/src/components/Gamification/Pet3D.tsx` (React Three Fiber) into `mobile/rn/src/screens/PetsScreen.tsx` raises hard architectural questions that must be resolved before implementation.

## Inputs Re-read
- `frontend-web/src/components/Gamification/Pet3D.tsx` (R3F + drei: `Float`, `RoundedBox`, `MeshWobbleMaterial`, `useFrame`)
- `mobile/rn/src/screens/PetsScreen.tsx` (already wired to backend: `usePets`, `useUser`, `petsApi.getPetCareState`, `petsApi.setActivePet`)
- `docs/mobile_migration/progress/2026-08-11-pets-active-pet-care-state.md` (Phase-0 of pet work already shipped)
- `docs/mobile_migration/progress/2026-08-12-rn-ui-premium-clay-redesign.md` (HomeScreen redesign added `CodexPetSprite` — spritesheet webp — for the pet peek)
- `docs/mobile_migration/spec/interactive-3d-model-spec.md` (3D interaction is scoped to **Unity / AR Foundation**, NOT RN)
- `docs/mobile_migration/spec/learner-product-spec.md` MOB-PET-REQ-002 / 003 / 005 / 007 (RN pet responsibilities: collection, active pet, care actions, evolution — NO 3D viewer requirement)
- `AGENTS.md` mobile-first execution policy (frontend-web is LEGACY; do not 1:1 port Web decoration into RN unless spec'd)

## Findings

### Finding 1 — Runtime mismatch (BLOCKING)
`Pet3D.tsx` is React Three Fiber. R3F depends on the DOM `<canvas>` element and the browser's WebGL stack. React Native has no DOM, no `<canvas>`, and ships its own GPU stack via `expo-gl` / `react-native-webgpu` / native GL views. The three.js skills attached to this request (`threejs-animation`, `threejs-loaders`, `threejs-postprocessing`) are all browser Three.js APIs. They are not callable from inside an RN component without a native bridge that the project does not currently have.

### Finding 2 — PetsScreen already has the correct mobile surface
PetsScreen already implements the MOB-PET-REQ-001..008 scope in claymorphic primitives:
- `usePets()` hook → real `Pet` list
- `useUser().activePet` + `petsApi.setActivePet` → active pet wiring
- `petsApi.getPetCareState(userId)` → happiness / energy / hunger / xpEarned / stage / mood
- `PetSelector`, `PetGrid`, `PetCard`, `PetCareStats`, `PetUnlockModal` → already composing on clay
- Backing i18n keys in `en.json` + `vi.json`

The 3D model viewer from web is NOT in the MOB-PET-REQ set. It is web decoration.

### Finding 3 — Project has already chosen a 2D-sprite pet rendering for RN
The 2026-08-12 HomeScreen redesign added `components/pets/CodexPetSprite.tsx` plus `mobile/rn/assets/pets/lexi/spritesheet.webp`. The mood/stage signals are conveyed by sprite frames (not WebGL meshes) with `expo-linear-gradient` + `react-native-reanimated` for the bob/breathe effect. This is the in-house decision for "how to render a pet in RN" — and it lines up with the MOB-PET-REQ set.

### Finding 4 — 3D interaction belongs to Unity, not RN
Per `interactive-3d-model-spec.md` and `native-ar-integration.md`:
- Touch → raycast → hotspot → animation → audio → `onModelInteraction` is **Unity** code paths
- RN's MOB-ARINT-REQ-* are entry/navigation only — they receive the event, do NOT render 3D
- The Cat-as-first-fixture pipeline assumes AR Foundation runtime, not RN

### Finding 5 — Attached skills do not apply to RN
The three attached skills (`threejs-animation`, `threejs-loaders`, `threejs-postprocessing`) are all browser-Three.js content. They would apply to:
- A Web rewrite of `Pet3D.tsx` → out of scope (legacy surface)
- A Unity AR Foundation scene authoring task → orthogonal (not in PetsScreen)
- A new RN component that talks to a 3D engine through a native module → requires backend/Unity work this workspace does not own

## Options requiring user decision

| Option | What it produces | Spec backing | Cost |
|---|---|---|---|
| A | Add a small 2D animated pet sprite (similar to `CodexPetSprite`) to PetsScreen detail card, mirroring mood/stage from `PetCareState` | Within MOB-PET-REQ-002 (detail) | Low |
| B | Open a new Unity-bridged 3D viewer route from PetsScreen that hands off to AR Foundation | Requires MOB-3DINT-REQ-* + native module work | High |
| C | Port Pet3D.tsx using browser Three.js bundled into a WebView inside RN | Anti-pattern: contradicts AGENTS.md "no Web parity while mobile READY work remains" | High, fragile |
| D | Do nothing — PetsScreen already meets the MOB-PET-REQ set; this task is a "Web decoration" that was not speced for RN | Matches current state | Zero |

## Not Verified
- Whether `docs/mobile_migration/plans/` has any open task explicitly requesting 3D pet in RN — initial grep found none
- Whether the current branch has any in-progress work that depends on a 3D pet in RN — none observed

## Blockers Raised
- **ARCHITECTURAL_DECISION_REQUIRED**: 1:1 port of Pet3D.tsx into PetsScreen.tsx is not feasible on RN runtime. User must pick A / B / C / D (or alternative) before any code is written.

## Next
- Wait for user choice.
- Once chosen, write a fresh progress entry per chosen path.
- If option A: implement sprite pet card on PetsScreen detail. Stay within MOB-PET-REQ-002.
- If option B: STOP and raise as a spec change — requires planning task in `plans/` and AR module work, NOT a PetsScreen patch.
- If option C: refuse per AGENTS.md policy.
- If option D: confirm task is closed.