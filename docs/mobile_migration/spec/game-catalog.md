# Educational Mini-Game Catalog

## Status
approved — learner-domain reconciliation applied 2026-08-14

## Goal
Catalog and specify every educational mini-game in the React Native learner product. Each game entry specifies: learning objective, input content, interaction pattern, audio behavior, scoring, reward event, difficulty, target phase, and platform implementation owner.

---

## Game Architecture Principles

### Content Reuse
One `VocabularyItem` feeds ALL games and flashcard activities — not duplicated per game:
```
VocabularyItem { word, translation, audioUrl, imageUrl, emoji }
    ↓
    ├── Flashcard (R5)
    ├── DragMatch (R6)
    ├── MemoryPairs (R6)
    ├── ColorLearn (R6)
    ├── ListenChoose (R6 — CORE bonus)
    ├── Pronunciation (R7)
    └── AR content (R12)
```

### Shared Abstractions
```
GameRound       — one round of gameplay (e.g., one drag-drop)
GameResult      — round outcome (correct/incorrect/skipped)
GameRun         — one in-memory run with multiple rounds; not a LearningSession
RewardEvent    — emitted on completion (type, metadata)
AudioPrompt     — what audio plays when
ChoiceOption    — selectable options in a game
```

### Reusable mechanic and configured Course Game

- `game_type` names the reusable mechanic (`drag_match`, `memory_match`, `coloring`). It is a discriminated contract implemented by RN, not a database template marketplace.
- Existing PostgreSQL `mini_game_items` rows are configured Course Game content. Shared columns carry identity/type/difficulty; `payload` is validated by `game_type` and carries mechanic-specific choices, pairs, prompts, or coloring configuration.
- A Lesson's typed `learning_blocks.activities[]` entry selects one or more configured items and vocabulary identities. No `GameTemplate`, `GameInstance`, or `LessonActivity` table is required for MVP.
- A Course Game runs in the ordinary RN Course/Lesson flow without a camera. An AR Game runs in Unity while the camera/AR experience remains active. They may share a mechanic label, but never the same configured row, runtime state, tracking image, or asset ownership.
- Game completion returns a normalized result to the surrounding Learning Session. The game does not own lesson position or persistent XP.

The chosen persistence tradeoff is the existing hybrid model: relational identity/filter columns plus typed JSONB payload. Fully normalized per-game tables would multiply schema/API work for little MVP value; unvalidated arbitrary JSON would make RN rendering unsafe.

### Reward Events (Taxonomy)
| Event | Emitted | XP Awarded |
|-------|---------|-------------|
| `GAME_COMPLETED` | All rounds done | yes |
| `GAME_ROUND_CORRECT` | Each correct answer | no (only on completion) |
| `GAME_ROUND_INCORRECT` | Each wrong answer | no |
| `GAME_PERFECT` | Zero mistakes | bonus XP |
| `GAME_SPEED_BONUS` | Fast completion | bonus XP |

---

## CORE Games (Required — R6)

### GAME-1 — DragMatch

**Learning objective**: Match vocabulary words to corresponding images (and vice versa).

**Input content**: `VocabularyItem[]` (min 3, max 6 per round). One image + N words.

**Interaction pattern**:
1. Show image → tap to select word → tap image to confirm drop
2. OR: Show word → tap to select → tap correct image
3. Correct match → green highlight + audio + proceed
4. Incorrect → orange highlight + try again (no penalty)

**Audio behavior**:
- On correct match: vocabulary word pronunciation
- On completion: "Great job!" + reward sound

**Scoring**: 1 point per correct match. No negative scoring. Perfect = all correct.

**Reward event**: `GAME_COMPLETED` → award XP. `GAME_PERFECT` → bonus XP.

**Difficulty**: 3–4 options for ages 4–6; 5–6 options for ages 7+.

**Implementation owner**: React Native (R6). Reference web: `frontend-web/src/components/game/DragMatchGame.tsx` (tap-to-select → tap-to-drop; touch-friendly grid layout).

**Acceptance criteria**:
- [ ] Correct match → green feedback + audio plays
- [ ] Incorrect → try again (no XP penalty)
- [ ] Game completes when all matched
- [ ] XP awarded on completion
- [ ] Vocabulary audio plays on match

---

### GAME-2 — MemoryPairs

**Learning objective**: Find matching image ↔ word pairs by memory.

**Input content**: `VocabularyItem[]` (min 4, max 8 per game — even number). Creates N pairs.

**Interaction pattern**:
1. Grid of face-down cards (N×4 grid: 4 cols for 8 cards, 3 cols for 6, 2 cols for 4)
2. Tap card → flip face-up (show image or word)
3. Tap second card → flip face-up
4. Match: both stay up + success sound + score
5. No match: flip back after 1 second
6. Game ends when all pairs found

**Audio behavior**:
- On pair match: vocabulary word pronunciation
- On game completion: celebration sound + XP notification

**Scoring**: Track number of moves. Fewer moves = better. No penalty per se (kids game).

**Reward event**: `GAME_COMPLETED` → award XP. `GAME_PERFECT` → bonus if matched in minimum moves (N moves for N pairs).

**Difficulty**: 4 pairs (8 cards) for ages 4–5; 6 pairs (12 cards) for ages 6+.

**Implementation owner**: React Native (R6). Reference web: `frontend-web/src/components/game/MemoryMatchGame.tsx` (flip animation, match logic, shuffle on reset).

**Acceptance criteria**:
- [ ] Cards flip on tap with animation
- [ ] Matched pair stays face-up + correct audio
- [ ] Non-match flips back after 1s
- [ ] Game completes when all pairs found
- [ ] Move counter shown
- [ ] XP awarded on completion
- [ ] Shuffle button resets game

---

### GAME-3 — ColorLearn

**Learning objective**: Color an animal/object while learning vocabulary + color words.

**Input content**: Line art outline of animal/object (`image_url` with transparent background). Color palette.

**Interaction pattern**:
1. Show line art outline (e.g., elephant outline)
2. Show color palette (8 colors: red, blue, green, yellow, orange, cyan, sky, brown)
3. Select color → tap canvas to paint
4. Touch-drag to color larger areas
5. Track colored percentage (pixels ≠ white)
6. Complete when ≥ 25% colored → trigger success
7. Optional: speak color name → system pronounces it

**Audio behavior**:
- On color select: color name pronunciation ("red", "xanh dương")
- On object completion: object name + "You colored the elephant!"

**Scoring**: Completion-based (≥25% colored = success). No penalty. Optional: speed bonus.

**Reward event**: `GAME_COMPLETED` → award XP. Vocabulary: object name + color vocabulary.

**Difficulty**: Single-color fills for ages 4–5; multi-color for ages 6+.

**Implementation owner**: React Native (R6) with Canvas API. Reference web: `frontend-web/src/components/game/ColoringGame.tsx` (HTML Canvas, `touchAction: none`, percentage tracking, 8-color palette).

**Note**: Web uses HTML Canvas. RN implementation should use `react-native-skia` or equivalent canvas library. If canvas library is unavailable, SVG-based coloring with `<Path>` elements is an alternative (higher complexity).

**Acceptance criteria**:
- [ ] Line art renders correctly
- [ ] Color palette shows 8 colors
- [ ] Paint with touch-drag
- [ ] Percentage tracked and shown
- [ ] ≥25% colored → completion triggered
- [ ] Color vocabulary audio plays on select
- [ ] Object vocabulary audio plays on completion
- [ ] XP awarded on completion

---

## BONUS Games (R6+ / DEFER)

### GAME-4 — ListenChoose

**Learning objective**: Hear a word → choose the correct picture from N options.

**Priority**: CORE candidate (synergistic with pronunciation R7).

**Input content**: `VocabularyItem` (target word) + N-1 distractor images.

**Interaction pattern**:
1. Play word pronunciation (TTS or recorded)
2. Show N image options (4 for ages 4–6, 6 for ages 7+)
3. Tap correct image → success + reward
4. Tap wrong image → try again (encouraging)

**Audio behavior**: Target word pronunciation plays on round start + on success.

**Reward event**: `GAME_COMPLETED` (all words done), `GAME_ROUND_CORRECT`.

**Status**: BONUS / CORE candidate.

---

### GAME-5 — SoundMatch

**Learning objective**: Hear an animal/object sound → choose the correct entity.

**Priority**: BONUS.

**Input content**: `VocabularyItem` with `soundUrl` (animal sound or object sound).

**Interaction pattern**:
1. Play sound
2. Show N image options
3. Tap correct → success
4. Tap wrong → try again

**Audio behavior**: Sound plays on round start.

**Reward event**: `GAME_COMPLETED`.

**Status**: BONUS. Depends on content having `soundUrl` for vocabulary items.

---

### GAME-6 — QuickTap

**Learning objective**: See a word prompt → tap the matching object in a scene of multiple objects.

**Priority**: BONUS.

**Input content**: `VocabularyItem` + scene image with multiple objects.

**Interaction pattern**:
1. Show word prompt + scene image
2. Tap correct object → success
3. Tap wrong → try again

**Reward event**: `GAME_COMPLETED`.

**Status**: BONUS.

---

### GAME-7 — WordBuilder

**Learning objective**: Order letters or syllables to form a word.

**Priority**: DEFER (complex for target age range 4–8; requires reading/writing).

**Input content**: Scrambled letters of a target word.

**Interaction pattern**:
1. Show scrambled letters
2. Drag/tap to reorder
3. Submit → check
4. Correct → proceed
5. Wrong → try again

**Reward event**: `GAME_COMPLETED`.

**Status**: DEFER. May be appropriate for ages 6+ with parent guidance.

---

### GAME-8 — FeedThePet

**Learning objective**: Hear/see vocabulary → choose correct food/item → pet reacts.

**Priority**: BONUS (connects with pets R9).

**Input content**: Pet care items (food vocabulary) + active pet.

**Interaction pattern**:
1. Show active pet with hunger stat
2. Present food options (each is a vocabulary word)
3. Select correct food → pet eats + happiness increases
4. Pet reacts (animation + sound via Unity if 3D pet; RN animation if 2D)

**Audio behavior**: Food vocabulary pronunciation + pet eating sound + pet reaction sound.

**Reward event**: `PET_CARE_FEED` → award XP + pet happiness restored. Also counts toward `GAME_COMPLETED`.

**Integration with R9**: Active pet display, care stats, feeding action. 2D pet viewer in RN first; Unity pet scene as separate lane.

**Status**: BONUS.

---

### GAME-9 — FindIt

**Learning objective**: Find the requested vocabulary item among a grid of cards.

**Priority**: BONUS.

**Input content**: `VocabularyItem` (target) + distractor cards (images).

**Interaction pattern**:
1. Show prompt ("Find the cat!")
2. Display grid of face-up cards
3. Tap correct → success
4. Tap wrong → encouraging try-again

**Reward event**: `GAME_COMPLETED`.

**Status**: BONUS.

---

## Game Implementation Map

| Game | Priority | Phase | Owner | Status |
|------|----------|-------|-------|--------|
| DragMatch | CORE | R6 | RN | not started |
| MemoryPairs | CORE | R6 | RN | not started |
| ColorLearn | CORE | R6 | RN | not started (canvas complexity) |
| ListenChoose | BONUS/CORE | R6 | RN | not started |
| SoundMatch | BONUS | R6+ | RN | not started (needs soundUrl) |
| QuickTap | BONUS | R6+ | RN | not started |
| WordBuilder | DEFER | — | — | deferred |
| FeedThePet | BONUS | R9 | RN + Unity | not started (R9 dependency) |
| FindIt | BONUS | R6+ | RN | not started |

---

## Session / Game Economy

- Game completion emits semantic result/event data with a stable retry-safe `event_id` when reward-eligible.
- Backend policy decides authoritative XP, perfect-completion bonuses, and any speed bonus; the catalog does not hardcode amounts.
- Games are not punitive — wrong answers show encouraging feedback, no XP deduction
- Max 3 retries per round before showing hint

---

## Open Decisions

| # | Decision | Blocks | Owner |
|---|----------|--------|-------|
| GAME-DQ-1 | Canvas library for ColorLearn (react-native-skia vs SVG vs alternative) | GAME-3 | Architect |
| GAME-DQ-2 | Sound assets for SoundMatch — who creates/provides? | GAME-5 | Content |
| GAME-DQ-3 | Game difficulty auto-adjustment (easier after N failures) | All games | Product |
