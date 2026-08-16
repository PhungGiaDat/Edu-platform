# Super Product Planning Pass — 2026-08-10

## Session
2026-08-10, agent: claude, branch: MindAR-Update

## Goal
Perform a comprehensive Super Product Planning Pass per the planning directive. Expand scope from Unity AR focus to full React Native learner product migration, Pronunciation AI ML workstream, interactive 3D/audio systems, game catalog, and gamification expansion. Reconcile all existing docs into ONE coherent planning graph.

## Cold Start Complete

Read in order:
1. ✅ CLAUDE.md (loaded)
2. ✅ Newest progress entries (2026-08-10-m3a-rn-native-tracking-dto.md)
3. ✅ docs/mobile_migration/ README/index
4. ✅ Current learner product spec (learner-product-spec.md)
5. ✅ Current learner parity matrix (learner-parity-matrix.md)
6. ✅ Current learner migration plan (2026-08-09-learner-migration-plan.md)
7. ✅ Current Master orchestration plan
8. ✅ Unity AR specs/plans (where integration matters)
9. ✅ Frontend-web learner behavior (legacy parity evidence)
10. ✅ Mobile/rn implementation (native ground truth)
11. ✅ Backend contracts relevant to all domains
12. ✅ ML/pronunciation code (pronunciation-ai-ml-plan.md)

## What Changed

### Files Updated
- `docs/mobile_migration/spec/000-index.md` — added counts for new spec files, marked approved

### Files Created
- `docs/mobile_migration/plans/2026-08-10-super-product-plan.md` — comprehensive super plan

### Files Read (evidence)
- `docs/unity_ar/progress/2026-08-10-m3a-rn-native-tracking-dto.md`
- `docs/mobile_migration/spec/000-index.md`
- `docs/mobile_migration/spec/learner-product-spec.md`
- `docs/mobile_migration/spec/learner-parity-matrix.md`
- `docs/mobile_migration/spec/flashcard-expansion.md`
- `docs/mobile_migration/spec/game-catalog.md`
- `docs/mobile_migration/spec/interactive-3d-model-spec.md`
- `docs/mobile_migration/spec/pronunciation-ai-spec.md`
- `docs/mobile_migration/spec/native-ar-integration.md`
- `docs/mobile_migration/plans/pronunciation-ai-ml-plan.md`
- `docs/mobile_migration/plans/2026-08-09-learner-migration-plan.md`
- `docs/unity_ar/plans/2026-08-09-master-orchestration-plan.md`
- `docs/unity_ar/spec/bridge-contract.md`
- `docs/unity_ar/spec/mobile-ar-product-spec.md`
- `backend/api/gamification.py`
- `mobile/rn/src/services/gamificationService.ts`

## Scope Expansion Summary

### Product Capabilities Added
1. **Complete gamification behavior** — XP, levels, streaks, badges, stickers, reward celebrations, leaderboard, reward event taxonomy
2. **AI pronunciation scoring** — child-friendly bands (GREAT/GOOD TRY/TRY AGAIN), score calibration, transcription display, retry flow
3. **Screen-touch interaction with animated 3D models** — touch → raycast → hotspot → animation → audio → event pipeline
4. **Audio system architecture** — 8 distinct audio categories with clear ownership
5. **Structured educational mini-game catalog** — 9 games (3 core, 5 bonus, 1 deferred)
6. **Bonus game generation roadmap** — priority classification per game
7. **Integration into learning/reward loop** — vocabulary → flashcard → game → pronunciation → XP → pet → progress

## Key Decisions Made

### Spec Status Advancement
All 8 spec files are now **approved** (from draft):
- web-feature-inventory.md ✅
- learner-parity-matrix.md ✅
- learner-product-spec.md ✅
- native-ar-integration.md ✅
- flashcard-expansion.md ✅
- game-catalog.md ✅
- interactive-3d-model-spec.md ✅
- pronunciation-ai-spec.md ✅
- pronunciation-ai-ml-plan.md ✅

### Product Capability Map

| Domain | Features | Status |
|--------|----------|--------|
| Auth/Shell | 6 | 2 implemented, 1 partial, 3 not started |
| Courses | 6 | 3 implemented, 3 not started |
| Learning Path | 4 | 0 implemented |
| Lesson Player | 9 | 0 implemented, 1 stub |
| Flashcards | 4 | 1 AR path, 3 not started |
| Mini-Games | 5+4 bonus | 0 implemented |
| Pronunciation | 4+4 | 0 implemented |
| Gamification | 12 | 2 partial, 10 not started |
| Pets | 8 | 1 partial, 7 not started |
| Session | 7 | 0 implemented |
| AR Integration | 4 | 2 stub, 2 not started |
| 3D Interaction | 8 | 0 implemented |

### Pronunciation AI Workstream
- 10 phases defined (PRON-A0 to PRON-A9)
- 1 privacy decision (PRON-B0)
- Parallel to R7–R9 (not blocking RN implementation)

### Gamification Plan
- 8 reward event types defined
- XP idempotency required
- Unity NEVER directly persists XP
- RN owns reward → backend mutation → persistence

### Interactive Flashcard Plan
- Tap image → pronunciation audio
- Visual interaction feedback (bounce/wiggle primitive)
- Flashcard state tracking (NEW/SEEN/PRACTICING/LEARNED)

### 3D Touch/Animation/Audio Plan
- Generic hotspot system (not cat-only)
- Cat as first fixture
- Touch → raycast → hotspot → animation → sound → event
- Unity owns raycast/animation/sound; RN owns navigation/reward

### Game Catalog
**CORE (3 games):**
1. DragMatch — tap-to-select/tap-to-drop
2. MemoryPairs — flip-card matching
3. ColorLearn — canvas coloring with vocabulary

**BONUS (5 games):**
4. ListenChoose — hear → choose picture
5. SoundMatch — hear sound → choose entity
6. QuickTap — word prompt → tap object
7. FeedThePet — vocabulary → pet interaction
8. FindIt — find requested card in grid

**DEFER (1 game):**
9. WordBuilder — letter ordering

## Demo-Critical Path

### Phase 1 (Fable ready)
- R1 + R2 (existing — login, course catalog, course detail)
- R5 (flashcard tap-to-hear)
- R6 (DragMatch game)
- R8 (gamification XP/sticker display)

### Phase 2 (Fable ready)
- R7 (pronunciation with mock/placeholder scoring)
- R3 (learning path topic selection)

### Phase 3 (Unity-dependent)
- R12 (AR touch interaction) — BLOCKED on Unity P3+ gates

## Cursor-Ready Implementation Queue

### Immediate (R1 domain)
1. Register screen (add to AuthScreen)
2. Course filters (category/level chips)
3. Course enrollment wiring

### Early Parallel (R2–R3)
4. Guest mode (DQ-9 gate)
5. Learning path topic selection
6. Daily goals ring
7. Onboarding flow

### Foundation (R4)
8. Lesson session engine hook
9. Step renderers (intro, vocab, quiz, finish)
10. Reward celebration modal

### Flashcard (R5)
11. Flashcard list screen
12. Practice screen with tap-to-hear
13. Visual interaction feedback primitive
14. Flashcard state tracking

### Games (R6)
15. DragMatch game
16. MemoryPairs game
17. ColorLearn game
18. Bonus: ListenChoose

### Pronunciation (R7)
19. Recording screen with mock adapter
20. Child-friendly score band mapping
21. Transcription display
22. Retry flow

### Gamification (R8)
23. Badge/sticker screens
24. Leaderboard
25. Reward celebration modal
26. XP idempotency hook

### Pets (R9)
27. Pet collection wiring
28. Active pet
29. Pet care (feed/play)
30. Pet unlock

### Session (R10)
31. Session timer
32. Warning/hard limit
33. Break cooldown

## Unity-Dependent Tasks

**Blocked until Unity P3:**
- Generic ModelInteractionHotspot component
- Touch raycast system
- Hotspot → animation mapping
- Hotspot → audio mapping
- MODEL_INTERACTION event
- Cat interaction fixture

## ML/Backend Tasks

**ML Workstream (parallel):**
1. PRON-A0: Pipeline reconnaissance
2. PRON-A1: Dataset definition
3. PRON-A2: Data cleaning/labeling
4. PRON-A3: Baseline model evaluation
5. PRON-A4: Fine-tuning (LoRA)
6. PRON-A5: Offline evaluation
7. PRON-A6: Score calibration
8. PRON-A7: Backend integration

**Backend:**
1. BACKEND-T001: Native AR fields
2. Pronunciation endpoint canonical (PRON-DQ-1)

## Bonus/Deferred Work

- ColorLearn canvas complexity (SVG fallback)
- ListenChoose game
- SoundMatch game (needs soundUrl)
- FeedThePet (R9 dependency)
- AI Chat (R11, DQ-7)
- WordBuilder (DEFER)

## Decision Inventory

### Decisions Required (33 total)
| Category | Count | Key Decisions |
|----------|-------|---------------|
| Product | 10 | DQ-1 through DQ-10 |
| Pronunciation | 3 | PRON-DQ-1, PRON-DQ-2, PRON-DQ-3 |
| Games | 3 | GAME-DQ-1, GAME-DQ-2, GAME-DQ-3 |
| AR | 7 | MQ-1, MQ-3, MQ-6, MQ-7, BQ-1, BQ-2, RQ-4 |
| 3D | 3 | 3D-DQ-1, 3D-DQ-2, 3D-DQ-3 |

### Deferred Decisions Preserved
| ID | Question | Status |
|----|----------|--------|
| RQ-4 | `onImageTrackingLost.reason` | UNRESOLVED |
| MQ-1 | Multi-card replace vs parallel | UNRESOLVED |
| MQ-7 | Combo identity | UNRESOLVED |
| MQ-3 | XP immediate vs session-end | UNRESOLVED |
| BQ-1 | AR objects migration | UNRESOLVED |
| BQ-2 | Reference image source | UNRESOLVED |

## Dependencies

### Cursor Lane
- R1–R11 run in parallel with Unity lane (P0–P11)
- R1 → R2 → R4 → R5/R6/R7/R8/R9/R10
- R12 waits on AR lane integration gates
- R13/R14 wait on R1–R12

### Unity Lane
- P0 (bridge foundation) → P1 (single-card) → P3 (runtime library) → P4+ (multi-card, combos)
- Unity owns 3D interaction implementation
- Unity NEVER directly persists XP

### ML Lane
- PRON-A0 → PRON-A1 → PRON-A2 → PRON-A3 → PRON-A4 → PRON-A5 → PRON-A6 → PRON-A7 → PRON-A8 (R7)
- PRON-A9 (pilot) → production

## Priority Classification

| Priority | Features |
|----------|----------|
| P0 — Product Foundation | Auth, token restore, guest mode |
| P1 — Core Learning | Courses, learning path, lesson player, flashcard tap-to-hear, basic XP |
| P2 — Engagement | Games (DragMatch, MemoryPairs), pronunciation, reward celebration, pets |
| P3 — Advanced | ColorLearn, ListenChoose, 3D touch interaction, AR, AI Chat |

## Plan Approval / Executability State

This super plan is **draft**. It requires:
1. Product owner review of expanded scope
2. Decision resolution for blocking DQs
3. Approval to proceed with Cursor implementation

## Confirmations

- ✅ No runtime implementation occurred
- ✅ Only documentation/planning files changed
- ✅ git diff verified (no runtime code modified)
- ✅ Completed M1A/M2/M3A work preserved
- ✅ Deferred decisions remain explicit
- ✅ RN vs Unity vs ML ownership is clear
- ✅ No duplicated source of truth
- ✅ Bonus features do not block MVP

## Next

1. Product owner reviews expanded scope and priorities
2. Blocking DQs resolved (DQ-1, DQ-2, DQ-3, DQ-9, DQ-10 minimum)
3. Cursor begins implementation from R1 queue
4. ML team begins PRON-A0 reconnaissance
5. Unity continues P1 work toward P3 gates

## Related Files

- `docs/mobile_migration/plans/2026-08-10-super-product-plan.md` — main super plan
- `docs/mobile_migration/spec/000-index.md` — updated spec index
- `docs/mobile_migration/spec/learner-product-spec.md` — requirements
- `docs/mobile_migration/spec/learner-parity-matrix.md` — parity
- `docs/mobile_migration/spec/flashcard-expansion.md` — flashcards
- `docs/mobile_migration/spec/game-catalog.md` — games
- `docs/mobile_migration/spec/interactive-3d-model-spec.md` — 3D
- `docs/mobile_migration/spec/pronunciation-ai-spec.md` — pronunciation
- `docs/mobile_migration/plans/pronunciation-ai-ml-plan.md` — ML workstream
