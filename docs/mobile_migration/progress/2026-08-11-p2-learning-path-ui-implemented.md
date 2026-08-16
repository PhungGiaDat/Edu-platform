# P2 — Learning Path UI Implementation

**Date:** 2026-08-11  
**Phase:** P2 (Learning Path UI)  
**Verification:** CODE_VERIFIED

---

## Summary

Implemented complete Learning Path screen với Claymorphic design, topic/unit progression visualization, và full state handling (LOCKED/AVAILABLE/CURRENT/COMPLETED).

---

## Features Implemented

### 1. LearningPathScreen Component
**File:** `mobile/rn/src/screens/LearningPathScreen.tsx`

**Functionality:**
- Topic grid với progression states
- StatusBadge component cho visual indicators
- TopicCard với dynamic color mapping
- Progress bar cho incomplete topics
- Loading/error/empty/refresh states
- Navigation to CourseDetail on topic press

**UI States:**
- LOCKED: gray badge 🔒, disabled interaction
- AVAILABLE: yellow card, blue badge ✨
- CURRENT: blue card, green badge ▶️, progress bar
- COMPLETED: green card, coral badge ✓

**Data:**
- Uses `useCourses()` hook
- Mock progression logic (first 6 courses)
- Maps courses → learning topics with status/progress

**Claymorphic Reuse:**
- ClayCard with variant="lg"
- ClayButton for actions
- BRAND colors (skyBlue, mintGreen, coralPink)
- COLORS, FONT, SPACING, RADIUS tokens
- SHADOWS.claySm

### 2. Navigation Integration
**Files:**
- `mobile/rn/src/navigation/AppNavigator.tsx`
- `mobile/rn/src/screens/HomeScreen.tsx`

**Changes:**
- Added `LearningPath: undefined` to `RootStackParamList`
- Added `LearningPathScreen` to Stack.Navigator
- Added "Learning Path" entry card on HomeScreen (top-left position)
- Reordered home grid: Learning Path → Courses → Pets → Profile

**Navigation Flow:**
```
Home
  → Learning Path (new)
     → Course Detail (on topic press)
        → Lesson Player
```

---

## Files Changed

### Created
1. `mobile/rn/src/screens/LearningPathScreen.tsx` (259 lines)

### Modified
1. `mobile/rn/src/navigation/AppNavigator.tsx`
   - Added `LearningPath` route + screen
2. `mobile/rn/src/screens/HomeScreen.tsx`
   - Added Learning Path entry card
   - Reordered navigation grid

---

## Verification

### TypeScript
```bash
npx tsc --noEmit --skipLibCheck
```
**Result:** PASS (1 pre-existing error in ClayButton.tsx unrelated to this work)

### Tests
Not run — focused on implementation completion per IMPLEMENTATION-FIRST RULE.

### Runtime
Not verified — requires Expo dev environment.

**Verification Level:** CODE_VERIFIED

---

## Claymorphic Compliance

✅ Reused existing ClayCard/ClayButton primitives  
✅ Used BRAND colors (skyBlue, mintGreen, coralPink)  
✅ Used design tokens (COLORS, SPACING, RADIUS, SHADOWS)  
✅ Child-friendly: large touch targets, clear visual hierarchy  
✅ Soft/rounded/tactile feel maintained  
✅ No new design system introduced

---

## Navigation Quality

✅ Real path from Home → Learning Path  
✅ Learning Path → Course Detail on press  
✅ Back button functional (goBack)  
✅ No orphan screens  
✅ Header configured with proper title/styling

---

## Screen State Completeness

✅ LOADING (ActivityIndicator during initial fetch)  
✅ SUCCESS (topic grid with data)  
✅ EMPTY (empty state with emoji + retry button)  
✅ ERROR (error banner with retry button)  
✅ REFRESH (RefreshControl on pull-down)  
✅ DISABLED (locked topics not interactive)

---

## Backend Integration

**Endpoints Used:**
- `/api/v1/courses/` (via `useCourses()` hook)

**Data Flow:**
```
useCourses()
  → courses[]
  → learningTopics (transformed with mock progression)
  → TopicCard rendering
```

**Mock Data:**
- Progression states (LOCKED/AVAILABLE/CURRENT/COMPLETED) are demo logic
- Uses first 6 courses only
- Progress percentages hardcoded (0%, 45%, 100%)
- Backend does not yet provide authoritative unlock/progression

**No Persistence Coupling:** RN only consumes FastAPI DTOs, does not depend on MongoDB/PostgreSQL internals.

---

## Remaining Gaps

### Learning Path Screen
✅ COMPLETE — all states, navigation, Claymorphic styling

### Dependencies for Full Vertical Slice
1. **Lesson Player UI (P3)** — currently placeholder
2. **Interactive Flashcards (P4)** — C14 complete, needs surrounding flow
3. **Backend progression contract** — unlock rules, authoritative state

---

## Next READY Task

**P5: Core Educational Games (RECOMMENDED)**

**Status:** BLOCKED — See `docs/mobile_migration/blockers/2026-08-11-p5-core-games-blockers.md`

**Blockers identified:**
1. Game content contract (API endpoint vs static)
2. Game mechanics specification (interaction patterns)
3. Gamification integration (event semantics, XP awards)
4. Navigation integration (entry point trong learner flow)
5. Asset requirements (images, audio, placeholders)
6. Screen state requirements (READY/PLAYING/SUCCESS flow)
7. Testing strategy (gesture testing approach)

**Decisions required:**
- Implementation approach: demo content first vs wait for backend
- Game entry point: HomeScreen card vs LessonPlayer embedded
- Content strategy: static demo vs backend API
- Asset strategy: placeholders vs real assets

**Proposed unblocked path:**
- Implement với static demo content
- Add HomeScreen "Games" card
- Minimal state flow (READY → PLAYING → SUCCESS)
- Placeholder assets (emojis, colors)
- Defer gamification integration
- Manual testing only

**Alternative:** **P3: Lesson Player UI** — also blocked on lesson content structure contract.

---

## External Blockers

**Backend:**
- No authoritative topic unlock rules
- No progression state endpoint
- Mock data used for demo

**Unity:**
- None (AR is later in priority)

**ML:**
- None

---

## Notes

- Learning Path screen prioritizes child-friendly UX per requirements
- Follows MOBILE-FIRST policy (no Web parity work)
- Progression logic is demo-only; backend contract needed for production
- All Claymorphic primitives reused; no new components added
- TypeScript clean except pre-existing ClayButton issue
