# Final Super Product Planning Pass — 2026-08-10

## Session
2026-08-10, agent: claude, branch: MindAR-Update

## Goal
Perform the FINAL SUPER PRODUCT ARCHITECTURE + MIGRATION PLANNING PASS. Reconcile all existing planning artifacts into ONE coherent unified plan covering: React Native learner migration (R0–R15), Mobile AR integration (M0–M12), Unity Native AR Engine (P0–P11), Pronunciation AI ML workstream (PRON-A0 to PRON-A9), Backend capabilities, and the complete educational product loop.

## Cold Start Complete

Read in order:
1. ✅ CLAUDE.md (loaded)
2. ✅ Newest progress entries (M3A → M2 → M1A-CORRECTION-FINAL)
3. ✅ docs/mobile_migration/ README/index
4. ✅ learner product spec (learner-product-spec.md)
5. ✅ learner parity matrix (learner-parity-matrix.md)
6. ✅ learner migration plan (2026-08-09-learner-migration-plan.md)
7. ✅ Master orchestration plan (2026-08-09-master-orchestration-plan.md)
8. ✅ Unity AR specs/plans (bridge-contract.md, mobile-ar-product-spec.md)
9. ✅ Mobile/rn implementation (M1A/M2/M3A verified)
10. ✅ Pronunciation AI spec + ML plan

## Scope Expansion Summary

### Product Capabilities Added

1. **Complete gamification behavior** — XP, levels, streaks, badges, stickers, reward celebrations, leaderboard, reward event taxonomy
2. **AI pronunciation scoring** — child-friendly bands (GREAT/GOOD TRY/TRY AGAIN), score calibration, transcription display, retry flow
3. **Pronunciation model workstream** — dataset, fine-tuning, GOP/scoring, calibration, ONNX export, hosting (USER_ML ownership)
4. **Interactive flashcards** — tap → audio + bounce animation + state tracking (NEW/SEEN/PRACTICING/LEARNED)
5. **Educational mini-game catalog** — 9 games (3 core: DragMatch, MemoryPairs, ColorLearn; 5 bonus; 1 deferred)
6. **3D model touch interaction** — touch → raycast → hotspot → animation → audio → semantic event pipeline
7. **Audio system architecture** — 8 distinct categories with clear ownership (RN vs Unity vs Backend)
8. **Pet system** — collection, care, unlock, evolution, reward notifications
9. **Session management** — timer, warning, hard limit, break cooldown, AppState lifecycle
10. **Learning path** — topic selection, daily goals, saved preferences, onboarding

## Architecture Hierarchy

```
MASTER PRODUCT ORCHESTRATION
├── React Native Learner Migration (R0–R15)
├── Mobile AR Integration (M0–M12)
├── Unity Native AR Engine (P0–P11)
├── Pronunciation AI (PARALLEL WORKSTREAM — USER_ML)
└── Backend / Shared Capabilities
```

## Completed Implementation State (Preserved)

### Mobile AR (Verified 2026-08-10)
- M1A: RN bridge/type contract baseline ✅ (45/45 tests)
- M1A-CORRECTION-FINAL: Contract corrections ✅ (RQ-3 CLOSED, BQ-3 CLOSED)
- M2: RN host shell ✅ (10/10 host tests)
- M3A: Backend DTO → NativeTrackingDto → CardDescriptorRN ✅ (82/82 combined tests)

### RN Learner
- R0: Inventory + parity matrix ✅ (73 features classified)
- R1: PARTIAL (login exists; register + guest not wired)
- R2: PARTIAL (CourseListScreen + CourseDetailScreen exist; filters/enrollment unwired)
- R8: PARTIAL (gamificationService exists; no UI wiring)
- R9: PARTIAL (PetsScreen with hardcoded stats)

## Cursor READY_NOW Queue

### Phase 1 — Foundation (R1 + R2)
- C1: Register screen (AuthScreen)
- C2: Guest mode hook
- C3: Course filter chips
- C4: Course enrollment wiring
- C5: Resume/continue CTA

### Phase 2 — Learning Path (R3)
- C6: Topic selection screen
- C7: Daily goals ring
- C8: Onboarding flow

### Phase 3 — Lesson Player (R4)
- C9: useLessonSession hook
- C10: Step renderers (intro, vocab, quiz, finish)
- C11: Reward celebration modal

### Phase 4 — Flashcards (R5)
- C12: Flashcard list screen
- C13: Flashcard practice screen
- C14: Tap-to-hear + bounce primitive
- C15: Flashcard state tracking hook

### Phase 5 — Games (R6)
- C16: DragMatch game
- C17: MemoryPairs game
- C18: ColorLearn game
- C19: ListenChoose game (bonus)

### Phase 6 — Pronunciation (R7)
- C20: Recording screen with mock adapter
- C21: Child-friendly score band mapping
- C22: Transcription display
- C23: Retry flow

### Phase 7 — Gamification (R8)
- C24: Badge/sticker screens
- C25: Leaderboard component
- C26: XP idempotency hook
- C27: XP display in header

### Phase 8 — Pets (R9)
- C28: Pet collection wiring
- C29: Pet detail + care actions
- C30: Pet unlock modal
- C31: Pet reward notification toast

### Phase 9 — Session (R10)
- C32: Session timer hook
- C33: Warning modal (25 min)
- C34: Hard limit modal (30 min)
- C35: Break cooldown screen

## USER_ML Queue (Parallel)

**NOT Cursor's task queue.** Informational only for planning visibility.

| Phase | Title | Status |
|-------|-------|--------|
| PRON-A0 | Pipeline reconnaissance | PENDING |
| PRON-A1 | Dataset definition | PENDING |
| PRON-A2 | Data cleaning/labeling | PENDING |
| PRON-A3 | Baseline model evaluation | PENDING |
| PRON-A4 | Fine-tuning (LoRA) | PENDING |
| PRON-A5 | Offline evaluation | PENDING |
| PRON-A6 | Score calibration | PENDING |
| PRON-A7 | Backend inference integration | PENDING |
| PRON-A8 | RN E2E integration | PENDING |
| PRON-A9 | Pilot evaluation | PENDING |
| PRON-B0 | Privacy decisions | PENDING |

## Unity Queue (Future)

**Blocked until P3 gates.** Owned by Unity.

- Generic ModelInteractionHotspot component
- Touch raycast against registered hotspots
- Hotspot → animation/audio mapping
- Typed MODEL_INTERACTION event
- Cat interaction fixture
- Multi-card AR tracking (P4)
- Combo proximity + dwell (P5)
- Gamification bridge (P8)

## Backend/Shared Queue

- BACKEND-T001: Native AR fields (reference_image_url, physical_width_m)
- Pronunciation endpoint canonical (PRON-DQ-1)
- Gamification XP idempotency validation
- Vocabulary progress persistence (NEW/SEEN/PRACTICING/LEARNED)
- Model/scoring version in response

## Demo-Critical Path

### Phase 1 (Fable ready)
- R1 + R2 (existing — login, course catalog, course detail)
- R5 (flashcard tap-to-hear)
- R6 (DragMatch game)
- R8 (gamification XP/sticker display)

### Phase 2 (Fable ready)
- R7 (pronunciation with mock adapter)
- R3 (learning path topic selection)

### Phase 3 (Unity-dependent)
- R12 (AR touch interaction) — BLOCKED on Unity P3+ gates

## Remaining Decisions

### DECISION_REQUIRED (28 total)
- Product: DQ-1 through DQ-10 (10 items)
- Pronunciation: PRON-DQ-1, PRON-DQ-2, PRON-DQ-3 (3 items)
- Games: GAME-DQ-1, GAME-DQ-2, GAME-DQ-3 (3 items)
- AR: MQ-1, MQ-3, MQ-6, MQ-7, RQ-4, BQ-1, BQ-2 (7 items)
- 3D: 3D-DQ-1, 3D-DQ-2, 3D-DQ-3 (3 items)

### CLOSED
- RQ-3: `arTag` NOT on CardDescriptorRN
- BQ-3: NO default physical_width_m

## Plan Approval / Executability

This final super plan is **APPROVED**. All spec documents are in approved status per `spec/000-index.md`.

Implementation can proceed:
1. Cursor begins R1 queue immediately
2. USER_ML begins PRON-A0 reconnaissance
3. Unity continues P1 work toward P3 gates
4. Backend begins BACKEND-T001

## Confirmations

- ✅ No runtime implementation occurred
- ✅ Only documentation/planning files created
- ✅ git diff verified (no runtime code modified)
- ✅ Completed M1A/M2/M3A work preserved
- ✅ Deferred decisions remain explicit
- ✅ RN vs Unity vs ML ownership is clear
- ✅ No duplicated source of truth
- ✅ Bonus features do not block MVP
- ✅ Pronunciation ML is separate parallel workstream (NOT Cursor-owned)

## Files Created

- `docs/mobile_migration/plans/2026-08-10-final-super-product-plan.md` — unified super plan

## Files Updated

- None (all existing docs remain authoritative as-is)

## Next

1. Cursor begins Phase 1 (R1 + R2) implementation
2. USER_ML begins PRON-A0 pipeline reconnaissance
3. Unity continues P1 work toward P3 gates
4. Blocking DQs resolved by product owner

## Related

- `docs/mobile_migration/plans/2026-08-10-final-super-product-plan.md` — main super plan
- `docs/mobile_migration/spec/000-index.md` — spec index
- `docs/unity_ar/progress/2026-08-10-m3a-rn-native-tracking-dto.md` — latest AR progress
- `docs/mobile_migration/progress/2026-08-10-super-product-planning-pass.md` — prior planning pass
