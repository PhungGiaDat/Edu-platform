# P5 — Core Educational Games Implementation Blockers

**Date:** 2026-08-11  
**Priority:** HIGH (Graduation MVP requirement)  
**Status:** BLOCKED — Awaiting decisions

---

## Overview

Core games (DragMatch, MemoryPairs, ColorLearn) là graduation MVP requirements nhưng hiện tại hoàn toàn missing trong RN codebase. Trước khi implement, cần resolve các blockers sau.

---

## BLOCKER-1: Game Content Contract

**Issue:** Backend contract cho game content chưa được định nghĩa.

**Questions:**
1. Game content có đến từ dynamic API endpoint hay embedded trong lesson structure?
2. Content structure cho mỗi game type:
   - **DragMatch:** vocabulary items + matching pairs format?
   - **MemoryPairs:** card pairs structure? images/text/audio references?
   - **ColorLearn:** color vocabulary + objects mapping?
3. Có API endpoint riêng cho mỗi game type hay unified `/api/v1/games/{gameType}`?

**Current state:**
- ❌ No `/api/v1/games/` endpoint found
- ❌ No game content structure trong lesson DTOs
- ❌ No game types enum defined

**Options:**
- **Option A:** Implement với static/demo content first, backend contract later
- **Option B:** Wait for backend `/api/v1/games/` contract definition
- **Option C:** Embed game content trong lesson structure (nested content blocks)

**Recommendation:** **Option A** — implement với demo content để verify UX flow, migrate to backend API sau.

---

## BLOCKER-2: Game Mechanics Specification

**Issue:** Game interaction patterns chưa được specify.

**DragMatch:**
- Drag source: vocabulary words or images?
- Drop targets: matching translations/definitions/images?
- Success criteria: exact match or fuzzy matching?
- Feedback: immediate or batch validation?
- Rounds: single set or multiple rounds?

**MemoryPairs:**
- Card count: 8, 12, 16 cards?
- Card content: image-image, word-word, image-word, audio-word?
- Flip animation style?
- Match validation: immediate or after second flip?
- Mismatch behavior: auto-flip back or manual dismiss?

**ColorLearn:**
- Interaction: tap color → hear name? drag object to color?
- Content: color names + objects of that color?
- Success criteria: tap all colors? match objects to colors?
- Progression: linear or free exploration?

**Current state:**
- ❌ No game mechanics docs trong `docs/`
- ❌ No reference implementation trong `frontend-web/`

**Recommendation:** Define minimum viable mechanics cho demo implementation, iterate based on UX testing.

---

## BLOCKER-3: Gamification Integration

**Issue:** Game completion → XP reward flow chưa được specify.

**Questions:**
1. Mỗi game completion award bao nhiêu XP?
2. Event semantic cho C26:
   - `game_completed|{gameType, score, duration}`?
   - `dragmatch_completed|{...}`?
   - `lesson_game_completed|{lessonId, gameType, ...}`?
3. Replay behavior: award XP again hay idempotent theo `event_id`?
4. Partial completion: award XP for attempts hay chỉ khi hoàn thành?

**Current state:**
- ✅ C26 (useGamification hook) available
- ❌ Game event semantics not defined
- ❌ Backend `/api/v1/gamification/add-xp` contract for games unclear

**Recommendation:** Define minimal event semantics, use C26 pattern với `event_id` generation.

---

## BLOCKER-4: Navigation Integration

**Issue:** Game entry point trong learner flow chưa clear.

**Options:**
- **A. From LessonPlayer:** Lesson → Game selection → Game screen
- **B. From HomeScreen:** Direct "Games" card → Game list → Game screen
- **C. From Learning Path:** Topic → Games for this topic
- **D. Embedded in Lesson:** Lesson content includes game blocks

**Current state:**
- LessonPlayerScreen is stub (chỉ có AR button)
- HomeScreen có space cho thêm entry card
- No "Games" navigation trong current flow

**Questions:**
1. Games là standalone activity hay part of lesson flow?
2. User có thể replay games freely hay chỉ trong lesson context?
3. Game completion affect lesson completion?

**Recommendation:** Start với **Option B** (HomeScreen Games card) để verify UX độc lập, integrate vào lesson flow sau.

---

## BLOCKER-5: Asset Requirements

**Issue:** Game assets (images, audio, animations) chưa available.

**Requirements per game:**
- **DragMatch:** Vocabulary images, audio pronunciations
- **MemoryPairs:** Card images (front/back), match success/fail sounds
- **ColorLearn:** Color swatches, object images, color name audio

**Current state:**
- ❌ No game assets trong `mobile/rn/assets/`
- ❌ No CDN URLs trong backend config
- ⚠️ Có thể reuse vocabulary images từ flashcard system

**Options:**
- **A.** Use placeholder images/emojis cho demo
- **B.** Reuse flashcard vocabulary assets where applicable
- **C.** Wait for designer to provide game-specific assets

**Recommendation:** **Option A + B** — placeholders cho demo, reuse flashcard assets khi có vocabulary overlap.

---

## BLOCKER-6: Screen State Requirements

**Issue:** Game screen states chưa được specify đầy đủ.

**States cần handle:**
- `LOADING` — loading game content
- `READY` — instructions screen before game starts
- `PLAYING` — active gameplay
- `PAUSED` — user paused mid-game
- `SUCCESS` — game completed successfully
- `PARTIAL_SUCCESS` — completed với errors (nếu applicable)
- `FAILED` — failed to complete (nếu có fail criteria)
- `RETRY` — retry after fail/partial
- `COMPLETED` — final state after XP awarded

**Questions:**
1. Có pause functionality không?
2. Time limit per game?
3. Score/accuracy tracking requirements?
4. Exit mid-game behavior: save progress hay discard?

**Recommendation:** Implement minimal states (READY → PLAYING → SUCCESS → COMPLETED) first, add PAUSED/FAILED later based on UX needs.

---

## BLOCKER-7: Testing Strategy

**Issue:** Game interaction testing approach chưa clear.

**Challenges:**
- Drag-and-drop gestures trong React Native testing
- Timer-based mechanics testing
- Animation testing
- Touch target size validation
- Child-friendly UX testing without real kids

**Questions:**
1. Unit test game logic riêng hay integrated với UI?
2. Mock drag gestures trong tests như thế nào?
3. Performance benchmarks cho animations?

**Recommendation:** 
- Unit test game logic (matching, scoring, state transitions)
- Skip gesture testing initially (manual QA)
- Add performance monitoring hooks for animation FPS

---

## Decisions Required

### DECISION-1: Implementation Approach
- [ ] **Option A (RECOMMENDED):** Demo content + static mechanics first
- [ ] **Option B:** Wait for complete backend contract
- [ ] **Option C:** Partial implementation với backend coordination

### DECISION-2: Game Entry Point
- [ ] **Option A:** HomeScreen "Games" card
- [ ] **Option B:** LessonPlayer embedded games
- [ ] **Option C:** Learning Path topic games
- [ ] **Option D:** Standalone Games tab

### DECISION-3: Content Strategy
- [ ] **Option A:** Static demo content (fastest)
- [ ] **Option B:** Backend API (blocked until contract defined)
- [ ] **Option C:** Hybrid (demo first, migrate to API)

### DECISION-4: Asset Strategy
- [ ] **Option A:** Placeholder emojis/colors
- [ ] **Option B:** Reuse flashcard assets
- [ ] **Option C:** Wait for game-specific assets

---

## Proposed Minimal Implementation (Unblocked Path)

**To proceed immediately without blocking on decisions:**

1. **Create demo games với static content**
   - DragMatch: 5 word-definition pairs
   - MemoryPairs: 8 cards (4 pairs)
   - ColorLearn: 6 basic colors

2. **Add HomeScreen "Games" card**
   - Navigate to GameListScreen
   - List 3 game options
   - Each navigates to respective game screen

3. **Implement minimal state flow**
   - READY (instructions) → PLAYING → SUCCESS
   - Skip PAUSED, FAILED, partial states initially

4. **Use placeholder assets**
   - Emojis for DragMatch items
   - Colored squares for MemoryPairs
   - CSS colors for ColorLearn

5. **Defer gamification integration**
   - Complete game flow first
   - Add XP rewards after game UX verified

6. **Manual testing only**
   - Skip automated gesture tests
   - Document test scenarios for QA

---

## Resolution Path

**IMMEDIATE (No blocking):**
1. Implement 3 game screens với demo content
2. Add navigation from HomeScreen
3. Verify Claymorphic design compliance
4. Document game mechanics implemented

**SHORT-TERM (Backend coordination needed):**
1. Define game content API contract
2. Define event semantics for gamification
3. Migrate demo content → backend API
4. Add XP rewards on completion

**LONG-TERM (After MVP):**
1. Real game assets from designer
2. Advanced states (pause, retry, scoring)
3. Game analytics tracking
4. Performance optimization

---

## Next Steps

**IF approved to proceed with minimal implementation:**
1. Create `mobile/rn/src/screens/games/` folder
2. Implement DragMatchScreen với demo content
3. Implement MemoryPairsScreen với demo content
4. Implement ColorLearnScreen với demo content
5. Add GameListScreen for navigation
6. Add "Games" card to HomeScreen
7. Test gameplay flow manually
8. Document blockers resolved vs deferred

**IF blocked pending decisions:**
- Wait for DECISION-1, DECISION-2, DECISION-3, DECISION-4 resolution
- Update this document với decisions made
- Proceed with approved approach
