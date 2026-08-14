# Web → React Native Feature Inventory

## Status
draft

## Goal
Raw inventory of every learner-facing feature in `frontend-web/` with its current mobile/rn state and backend endpoint surface. Ground truth for parity decisions.

## Inventory Format

Each feature entry:
```
### [ID] — Feature name
- **Web file**: `frontend-web/src/...`
- **Web behavior**: what the feature does (one sentence)
- **Current RN state**: existing | stub | none
- **RN file(s)**: `mobile/rn/src/...` (if any)
- **Backend endpoints**: list of endpoint paths used
- **Notes**: any caveats
```

---

## A. AUTH / APP SHELL

### A1 — Login
- **Web file**: `frontend-web/src/pages/Login.tsx`
- **Web behavior**: Email+password form → POST /api/v1/auth/login → JWT stored in localStorage → redirect
- **Current RN state**: existing
- **RN file(s)**: `mobile/rn/src/screens/AuthScreen.tsx`, `mobile/rn/src/hooks/useAuth.ts`
- **Backend endpoints**: `POST /api/v1/auth/login`, `GET /api/v1/auth/me`
- **Notes**: AuthScreen.tsx is login-only (no register tab)

### A2 — Register
- **Web file**: `frontend-web/src/pages/Register.tsx`
- **Web behavior**: Email+password+name form → POST /api/v1/auth/register → auto-login → redirect
- **Current RN state**: none
- **RN file(s)**: —
- **Backend endpoints**: `POST /api/v1/auth/register`
- **Notes**: AuthScreen.tsx has no register path; R1 must add it

### A3 — Token / session restore
- **Web file**: `frontend-web/src/hooks/useAuth.ts` (context-based)
- **Web behavior**: On load, read token from localStorage, validate via /auth/me
- **Current RN state**: existing
- **RN file(s)**: `mobile/rn/src/hooks/useAuth.ts` (SecureStore-based)
- **Backend endpoints**: `GET /api/v1/auth/me`
- **Notes**: RN uses SecureStore instead of localStorage (correct for mobile)

### A4 — Guest mode
- **Web file**: `frontend-web/src/middleware/RequireLearnerAccess.tsx` + `RequireLearnerAccess` wrapper
- **Web behavior**: Routes wrapped in RequireLearnerAccess show read-only content with banner; unauthed users can view catalog/flashcards
- **Current RN state**: none
- **RN file(s)**: —
- **Backend endpoints**: none (public endpoints only)
- **Notes**: DQ-9 open — product must decide guest scope; default: read-only catalog/flashcards

### A5 — Protected learner routes
- **Web file**: React Router with auth-context guard
- **Web behavior**: Authenticated routes redirect to /login if no token
- **Current RN state**: existing
- **RN file(s)**: `mobile/rn/src/navigation/AppNavigator.tsx` (conditional Auth vs Home stack)
- **Backend endpoints**: —
- **Notes**: RN navigator conditionally renders AuthScreen vs authenticated screens

### A6 — Logout
- **Web file**: `frontend-web/src/components/LogoutButton.tsx`
- **Web behavior**: Clear token from localStorage, redirect to /login
- **Current RN state**: existing
- **RN file(s)**: via `useAuth.clearToken()` in `HomeScreen`
- **Backend endpoints**: —
- **Notes**: Works via clearToken callback in App.tsx

---

## B. COURSES

### B1 — Course catalog list
- **Web file**: `frontend-web/src/pages/CourseList.tsx`
- **Web behavior**: Hero section, path cards (beginner/intermediate/advanced), stats grid (streak/XP/lessons), course grid with filters
- **Current RN state**: existing (partial)
- **RN file(s)**: `mobile/rn/src/screens/CourseListScreen.tsx`
- **Backend endpoints**: `GET /api/v1/courses/`
- **Notes**: RN has course list but missing hero + path cards + stats grid (R2 task)

### B2 — Category/level/path filtering
- **Web file**: `frontend-web/src/pages/CourseList.tsx`
- **Web behavior**: Filter chips for category, level, path; query params on /courses/
- **Current RN state**: stub (filters not wired)
- **RN file(s)**: `mobile/rn/src/screens/CourseListScreen.tsx`
- **Backend endpoints**: `GET /api/v1/courses/` with query params
- **Notes**: Backend supports filtering via query params; RN wiring is R2 task

### B3 — Course detail
- **Web file**: `frontend-web/src/pages/CourseDetail.tsx`
- **Web behavior**: Course hero, description, lesson list with progress indicators, enrollment/start/continue CTA, AR entry
- **Current RN state**: existing
- **RN file(s)**: `mobile/rn/src/screens/CourseDetailScreen.tsx`
- **Backend endpoints**: `GET /api/v1/courses/{course_id}`, `GET /api/v1/users/{id}/progress`
- **Notes**: AR entry button navigates to LessonPlayer then AR screen

### B4 — Course enrollment / start
- **Web file**: `frontend-web/src/pages/CourseDetail.tsx` (enroll button)
- **Web behavior**: POST /courses/{id}/start on enroll; updates progress
- **Current RN state**: stub (button wired but POST not confirmed)
- **RN file(s)**: `mobile/rn/src/screens/CourseDetailScreen.tsx`
- **Backend endpoints**: `POST /api/v1/courses/{course_id}/start`
- **Notes**: R2 task to wire enrollment API call

### B5 — Lesson navigation
- **Web file**: `frontend-web/src/pages/CourseDetail.tsx` (lesson cards)
- **Web behavior**: Click lesson → navigate to LessonPlayer
- **Current RN state**: existing
- **RN file(s)**: `mobile/rn/src/screens/CourseDetailScreen.tsx` → `LessonPlayerScreen`
- **Backend endpoints**: `GET /api/v1/courses/{course_id}/lessons/{lesson_id}`
- **Notes**: Navigation works; lesson content is stub (see B6)

### B6 — Continue / resume
- **Web file**: `frontend-web/src/pages/CourseDetail.tsx`
- **Web behavior**: Shows "Continue" with current lesson when progress exists; "Start" when none
- **Current RN state**: stub (CTA exists but resume logic not wired)
- **RN file(s)**: `mobile/rn/src/screens/CourseDetailScreen.tsx`
- **Backend endpoints**: `GET /api/v1/users/{id}/progress`
- **Notes**: R2 task to wire progress check and show correct CTA

---

## C. LEARNING PATH

### C1 — Topic selection
- **Web file**: `frontend-web/src/pages/LearningPathSetup.tsx`
- **Web behavior**: Grid of topic tiles; multi-select; POST /learning-path/preferences
- **Current RN state**: none
- **RN file(s)**: —
- **Backend endpoints**: `GET /api/v1/learning-path/{user_id}`, `POST /api/v1/learning-path/preferences`
- **Notes**: R3 task

### C2 — Daily goals
- **Web file**: `frontend-web/src/components/Gamification/DailyGoalRing.tsx`
- **Web behavior**: Circular progress ring showing today's XP vs goal
- **Current RN state**: none
- **RN file(s)**: —
- **Backend endpoints**: `GET /api/v1/learning-path/{user_id}/today`
- **Notes**: R3 task

### C3 — Saved preferences
- **Web file**: `frontend-web/src/pages/LearningPathSetup.tsx`
- **Web behavior**: Load saved prefs on mount; POST changes
- **Current RN state**: none
- **RN file(s)**: —
- **Backend endpoints**: `GET /api/v1/learning-path/{user_id}`, `POST /api/v1/learning-path/goals`, `POST /api/v1/learning-path/progress`
- **Notes**: R3 task

### C4 — Learner onboarding
- **Web file**: `frontend-web/src/pages/LearningPathSetup.tsx`
- **Web behavior**: First-time user sees onboarding flow (topics → daily goal → start)
- **Current RN state**: none
- **RN file(s)**: —
- **Backend endpoints**: `GET /api/v1/learning-path/{user_id}`
- **Notes**: R3 task; check if backend has `is_onboarded` flag

---

## D. LESSON PLAYER

### D1 — Lesson session engine
- **Web file**: `frontend-web/src/pages/LessonPlayer.tsx`
- **Web behavior**: Session start → step-by-step flow → complete; tracks progress per step
- **Current RN state**: stub
- **RN file(s)**: `mobile/rn/src/screens/LessonPlayerScreen.tsx`
- **Backend endpoints**: `POST /api/v1/courses/{course_id}/lessons/{lesson_id}/session/start`, `GET /api/v1/courses/{course_id}/lessons/{lesson_id}/session`, `POST /api/v1/courses/{course_id}/lessons/{lesson_id}/steps/attempt`, `POST /api/v1/lessons/{lesson_id}/complete`
- **Notes**: R4 task; RN already has course-scoped session API adapted

### D2 — Step: Intro / Watch
- **Web file**: `frontend-web/src/pages/LessonPlayer.tsx` (stepId: intro/watch)
- **Web behavior**: Show lesson intro + media (video or image gallery); progress step
- **Current RN state**: stub
- **RN file(s)**: `mobile/rn/src/screens/LessonPlayerScreen.tsx`
- **Backend endpoints**: `GET /api/v1/courses/{course_id}/lessons/{lesson_id}/media`
- **Notes**: R4 task; `LessonMedia` component not yet in RN

### D3 — Step: Story / Media
- **Web file**: `frontend-web/src/components/SceneViewer.tsx`
- **Web behavior**: Display scene images and narratives; AR-enabled lessons show scene viewer
- **Current RN state**: stub (only placeholder AR button)
- **RN file(s)**: `mobile/rn/src/screens/LessonPlayerScreen.tsx`
- **Backend endpoints**: `GET /api/v1/courses/{course_id}/lessons/{lesson_id}/media`
- **Notes**: R4 task

### D4 — Step: Game
- **Web file**: inline in `frontend-web/src/pages/LessonPlayer.tsx` (stepId: game)
- **Web behavior**: Launch embedded mini-game activity
- **Current RN state**: stub
- **RN file(s)**: —
- **Backend endpoints**: `GET /api/v1/game/{qr_id}`
- **Notes**: R4+R6; game content lives in R6 mini-games

### D5 — Step: Vocabulary
- **Web file**: `frontend-web/src/components/courses/CourseLearningBlocks.tsx` (vocab blocks)
- **Web behavior**: Word cards with audio, translation, emoji, simple sentence
- **Current RN state**: none
- **RN file(s)**: —
- **Backend endpoints**: `GET /api/v1/courses/{course_id}/lessons/{lesson_id}` (vocabulary field)
- **Notes**: R4 task; vocabulary is part of the lesson response

### D6 — Step: Reading
- **Web file**: `frontend-web/src/pages/LessonPlayer.tsx` (stepId: read)
- **Web behavior**: Display reading passage with highlighted vocabulary
- **Current RN state**: none
- **RN file(s)**: —
- **Backend endpoints**: (from lesson data)
- **Notes**: R4 task

### D7 — Step: Pronunciation
- **Web file**: `frontend-web/src/components/game/PronunciationGame.tsx`
- **Web behavior**: Record → transcribe → score → feedback loop
- **Current RN state**: none
- **RN file(s)**: —
- **Backend endpoints**: `POST /api/v1/pronunciation/attempt`, `POST /api/v1/pronunciation/transcribe`, `POST /api/v1/pronunciation/feedback`, `POST /api/v1/pronunciation/tts`
- **Notes**: R4+R7; DQ-3 on pronunciation endpoint choice; native speech API required

### D8 — Step: Quiz
- **Web file**: `frontend-web/src/components/Quiz.tsx`
- **Web behavior**: Multiple-choice questions; submit → score → feedback
- **Current RN state**: none
- **RN file(s)**: —
- **Backend endpoints**: `POST /api/v1/quizzes/{lesson_id}/submit`
- **Notes**: R4 task; quiz data in lesson response

### D9 — Step: Finish / Reward
- **Web file**: `frontend-web/src/components/Gamification/RewardCelebration.tsx`
- **Web behavior**: Show XP earned, sticker, badge; confetti animation; navigate home
- **Current RN state**: stub (basic placeholder)
- **RN file(s)**: `mobile/rn/src/screens/LessonPlayerScreen.tsx`
- **Backend endpoints**: `POST /api/v1/lessons/{lesson_id}/complete`, `POST /api/v1/gamification/add-xp`
- **Notes**: R4 task; RewardCelebration not yet in RN

---

## E. ANIMALS COURSE (duplicate implementations — see DQ-1)

### E1 — AnimalsCourse (standalone)
- **Web file**: `frontend-web/src/pages/AnimalsCourse.tsx`
- **Web behavior**: Dedicated Animals Adventure course page with 5 animal lessons (cat/dog/bird/fish/rabbit), hero, mascot tiles, lesson list with progress
- **Current RN state**: none
- **RN file(s)**: —
- **Classification**: LEGACY (older standalone implementation with hardcoded mascot tiles)
- **Notes**: Has its own lesson data; partially mock data

### E2 — AnimalsAdventure (with hooks)
- **Web file**: `frontend-web/src/pages/AnimalsAdventure.tsx`
- **Web behavior**: Same Animals Adventure course but using `useAnimalsCourse`/`useAnimalsProgress` hooks; fallback course data
- **Current RN state**: none
- **RN file(s)**: —
- **Classification**: MERGE_SOURCE (more data-driven; uses hooks; correct course_id: `animals-adventure-en-5-7`)
- **Notes**: Preferred as canonical; has proper API integration pattern

### E3 — AnimalsLessonPlayer
- **Web file**: `frontend-web/src/pages/AnimalsLessonPlayer.tsx`
- **Web behavior**: 7-section lesson player (warmup, vocabulary, listen, match, games, quiz, reward); standalone mock data
- **Current RN state**: none
- **RN file(s)**: —
- **Classification**: DECISION_REQUIRED — targets `animals-course` (mock id) vs `animals-adventure-en-5-7` (real id)
- **Notes**: DQ-1 decision determines canonical source; likely MERGE_SOURCE from AnimalsAdventure

### E4 — Standard LessonPlayer (lesson-scoped)
- **Web file**: `frontend-web/src/pages/LessonPlayer.tsx`
- **Web behavior**: Standard lesson player with stepId-based sections (intro/watch/story/game/words/read/say/quiz/finish); uses course-scoped session API
- **Current RN state**: stub
- **RN file(s)**: `mobile/rn/src/screens/LessonPlayerScreen.tsx`
- **Classification**: CANONICAL (for non-animals lessons)
- **Notes**: DQ-2 selects this as canonical for standard courses; AnimalsLessonPlayer is animals-specific

---

## F. FLASHCARDS

### F1 — Flashcard list / category
- **Web file**: `frontend-web/src/pages/FlashcardPage.tsx`
- **Web behavior**: Browse flashcards by category; search; tap to practice
- **Current RN state**: none
- **RN file(s)**: —
- **Backend endpoints**: `GET /api/v1/flashcard/category/{category}`, `GET /api/v1/flashcard/search/{query}`
- **Notes**: R5 task; `GET /api/v1/flashcard` list exists

### F2 — Flashcard practice
- **Web file**: `frontend-web/src/pages/FlashcardPage.tsx` (practice mode)
- **Web behavior**: Show word/translation/audio; tap to flip; mark known/unknown
- **Current RN state**: AR overlay stub
- **RN file(s)**: `mobile/rn/src/components/FlashcardOverlay.tsx`
- **Backend endpoints**: `GET /api/v1/flashcard/{qr_id}`
- **Notes**: R5 task; FlashcardOverlay is AR-context only today; need general practice screen

### F3 — Flashcard audio / pronunciation
- **Web file**: `frontend-web/src/pages/FlashcardPage.tsx`
- **Web behavior**: Play audio on card reveal; pronunciation check button
- **Current RN state**: AR overlay has audio playback
- **RN file(s)**: `mobile/rn/src/components/FlashcardOverlay.tsx`
- **Backend endpoints**: audio URL from flashcard response + `POST /api/v1/pronunciation/tts`
- **Notes**: R5 task

### F4 — Flashcard game launch
- **Web file**: `frontend-web/src/pages/FlashcardPage.tsx`
- **Web behavior**: "Play Game" CTA on card → launch game for that qr_id
- **Current RN state**: none
- **RN file(s)**: —
- **Backend endpoints**: `GET /api/v1/game/{qr_id}`, `GET /api/v1/quiz/{qr_id}`
- **Notes**: R5+R6 task; game launcher needs to navigate to game screen

### F5 — QR entry
- **Web file**: `frontend-web/src/pages/FlashcardPage.tsx` + QR scanner
- **Web behavior**: Camera QR scan → fetch flashcard by qr_id → show card
- **Current RN state**: existing (AR path)
- **RN file(s)**: `mobile/rn/src/services/api.ts` (flashcardApi.getFlashcard), `QRScanPrompt.tsx`
- **Backend endpoints**: `GET /api/v1/flashcard/{qr_id}`
- **Notes**: Already wired for AR path; product-level QR entry is R5

---

## G. MINI-GAMES

### G1 — DragMatchGame
- **Web file**: `frontend-web/src/components/game/DragMatchGame.tsx`
- **Web behavior**: Drag vocabulary words onto matching images; drag-and-drop DOM
- **Current RN state**: none
- **Classification**: DECISION_REQUIRED (DQ-5)
- **Notes**: R6 task

### G2 — MemoryMatchGame
- **Web file**: `frontend-web/src/components/game/MemoryMatchGame.tsx`
- **Web behavior**: Flip-card memory game; match pairs
- **Current RN state**: none
- **Classification**: KEEP (likely)
- **Notes**: R6 task; well-suited for RN

### G3 — PronunciationGame
- **Web file**: `frontend-web/src/components/game/PronunciationGame.tsx`
- **Web behavior**: Pronunciation check as game; microphone-based
- **Current RN state**: none
- **Classification**: DECISION_REQUIRED (DQ-5) — may overlap with D7 pronunciation step
- **Notes**: R6+R7 task

### G4 — CatchWordGame
- **Web file**: `frontend-web/src/components/game/CatchWordGame.tsx`
- **Web behavior**: Catch falling words game; canvas-based
- **Current RN state**: none
- **Classification**: DECISION_REQUIRED (DQ-5)
- **Notes**: R6 task; complex DOM canvas game

### G5 — WordScrambleGame
- **Web file**: `frontend-web/src/components/game/WordScrambleGame.tsx`
- **Web behavior**: Scrambled letters → reorder to form word
- **Current RN state**: none
- **Classification**: KEEP (likely)
- **Notes**: R6 task; well-suited for RN

### G6 — ColoringGame
- **Web file**: `frontend-web/src/components/game/ColoringGame.tsx`
- **Web behavior**: Tap-to-color SVG canvas; color palette
- **Current RN state**: none
- **Classification**: DEFER (canvas complexity; low-priority)
- **Notes**: R6 task; complex SVG/canvas

---

## H. PRONUNCIATION

### H1 — Recording / input UX
- **Web file**: `frontend-web/src/services/PronunciationService.ts`
- **Web behavior**: Web Speech API → transcribe → score; server fallback with MediaRecorder
- **Current RN state**: none
- **Classification**: DECISION_REQUIRED (DQ-3)
- **Notes**: R7 task; RN must use native speech (iOS Speech framework / Android SpeechRecognizer)

### H2 — Assessment API
- **Web file**: `frontend-web/src/services/PronunciationService.ts`
- **Web behavior**: Score accuracy via Levenshtein similarity + kid bonus; dynamic feedback
- **Current RN state**: none
- **Backend endpoints**: `POST /api/v1/pronunciation/evaluate` (original) vs `POST /api/v1/pronunciation/transcribe` (enhanced)
- **Notes**: DQ-3 selects canonical endpoint

### H3 — Feedback / retry
- **Web file**: `frontend-web/src/services/PronunciationService.ts`
- **Web behavior**: Show score + emoji + encouragement; retry button
- **Current RN state**: none
- **Backend endpoints**: `POST /api/v1/pronunciation/feedback`
- **Notes**: R7 task

### H4 — Permissions / fallback
- **Web file**: `frontend-web/src/services/PronunciationService.ts`
- **Web behavior**: On mic-denied: show fallback message; offer skip
- **Current RN state**: none
- **Notes**: R7 task; native permissions UX different from browser

---

## I. GAMIFICATION

### I1 — XP system
- **Web file**: `frontend-web/src/services/GamificationService.ts`
- **Web behavior**: Award XP on actions; display in header; levels from XP thresholds
- **Current RN state**: existing (partial)
- **RN file(s)**: `mobile/rn/src/services/api.ts` (coursesApi.addXp), `mobile/rn/src/hooks/useGamification.ts`
- **Backend endpoints**: `POST /api/v1/gamification/add-xp`, `GET /api/v1/gamification/user/{user_id}`
- **Notes**: Hook exists but unused in screens; R8 task to wire UI

### I2 — Levels
- **Web file**: `frontend-web/src/components/Gamification/Leaderboard.tsx` (level badges)
- **Web behavior**: Level based on XP thresholds; display current level
- **Current RN state**: none
- **RN file(s)**: —
- **Backend endpoints**: `GET /api/v1/gamification/user/{user_id}` (level in response)
- **Notes**: R8 task

### I3 — Streaks
- **Web file**: `frontend-web/src/components/Gamification/StreakBadge.tsx`
- **Web behavior**: Show current streak count + fire icon; broken streak warning
- **Current RN state**: existing
- **RN file(s)**: `mobile/rn/src/components/StreakBadge.tsx`, `mobile/rn/src/screens/HomeScreen.tsx`
- **Backend endpoints**: `GET /api/v1/gamification/streak/{user_id}`
- **Notes**: HomeScreen shows streak via useUser hook; R8 to formalize

### I4 — Badges
- **Web file**: `frontend-web/src/components/Gamification/BadgeList.tsx`
- **Web behavior**: Grid of earned badges; tap for detail
- **Current RN state**: none
- **RN file(s)**: —
- **Backend endpoints**: `GET /api/v1/gamification/badges`, `POST /api/v1/gamification/award-badge`
- **Notes**: R8 task

### I5 — Stickers
- **Web file**: `frontend-web/src/components/Gamification/StickerCollection.tsx`, `frontend-web/src/pages/StickersPage.tsx`
- **Web behavior**: Collectible sticker gallery; tap to view; earned vs locked
- **Current RN state**: none
- **RN file(s)**: —
- **Backend endpoints**: `GET /api/v1/gamification/stickers/*`, `POST /api/v1/gamification/stickers/collect`
- **Notes**: R8 task

### I6 — Rewards / celebration
- **Web file**: `frontend-web/src/components/Gamification/RewardCelebration.tsx`
- **Web behavior**: Modal with confetti + XP + sticker + message on lesson complete
- **Current RN state**: stub
- **RN file(s)**: `mobile/rn/src/screens/LessonPlayerScreen.tsx`
- **Backend endpoints**: (XP via add-xp on lesson complete)
- **Notes**: R4+R8 task

### I7 — Event tracking
- **Web file**: `frontend-web/src/services/GamificationService.ts`
- **Web behavior**: Track lesson events → send to backend for XP calculation
- **Current RN state**: partial (addXp hook exists)
- **RN file(s)**: `mobile/rn/src/services/api.ts`
- **Backend endpoints**: `POST /api/v1/gamification/add-xp`
- **Notes**: R8 task; shared XP idempotency contract with AR lane

### I8 — Leaderboard
- **Web file**: `frontend-web/src/components/Gamification/Leaderboard.tsx`
- **Web behavior**: Weekly leaderboard; top 3 + user position
- **Current RN state**: none
- **RN file(s)**: —
- **Backend endpoints**: `GET /api/v1/gamification/leaderboard`
- **Notes**: R8 task

---

## J. PROFILE / PROGRESS

### J1 — Learner profile
- **Web file**: `frontend-web/src/pages/Profile.tsx`
- **Web behavior**: Avatar, name, email, level, XP, streak, member since
- **Current RN state**: existing (partial)
- **RN file(s)**: `mobile/rn/src/screens/ProfileScreen.tsx`
- **Backend endpoints**: `GET /api/v1/auth/me`, `GET /api/v1/gamification/user/{user_id}`
- **Notes**: R8+R9 task to complete profile screen

### J2 — Progress dashboard
- **Web file**: `frontend-web/src/pages/ProgressDashboard.tsx`
- **Web behavior**: Weekly progress chart, XP history, lesson completion stats
- **Current RN state**: none
- **RN file(s)**: —
- **Backend endpoints**: `GET /api/v1/users/{id}/progress`, `GET /api/v1/gamification/user/{id}`
- **Notes**: R8 task

### J3 — Achievements
- **Web file**: `frontend-web/src/components/Gamification/BadgeList.tsx`
- **Web behavior**: Achievement badges with descriptions; earned vs locked
- **Current RN state**: none
- **RN file(s)**: —
- **Backend endpoints**: `GET /api/v1/gamification/badges`
- **Notes**: R8 task

---

## K. PETS

### K1 — Pet collection
- **Web file**: `frontend-web/src/pages/PetsPage.tsx`, `frontend-web/src/components/pets/PetGrid.tsx`
- **Web behavior**: Grid of owned pets; lock/unlock indicators
- **Current RN state**: existing (partial)
- **RN file(s)**: `mobile/rn/src/screens/PetsScreen.tsx`, `mobile/rn/src/components/PetGrid.tsx`
- **Backend endpoints**: `GET /api/v1/pets`, `GET /api/v1/pets/{id}`
- **Notes**: PetsScreen shows hardcoded care stats; R9 task to wire API

### K2 — Active pet
- **Web file**: `frontend-web/src/components/pets/PetSelector.tsx`
- **Web behavior**: Set active pet; shown in header/buddy
- **Current RN state**: stub
- **RN file(s)**: `mobile/rn/src/components/PetSelector.tsx`
- **Backend endpoints**: `GET /api/v1/pets/active/current`, `PUT /api/v1/pets/active`, `DELETE /api/v1/pets/active`
- **Notes**: R9 task

### K3 — Pet unlock
- **Web file**: `frontend-web/src/components/pets/PetUnlockModal.tsx`
- **Web behavior**: Unlock modal with pet preview + cost + confirm
- **Current RN state**: stub
- **RN file(s)**: `mobile/rn/src/components/PetUnlockModal.tsx`
- **Backend endpoints**: `POST /api/v1/pets/{id}/unlock`
- **Notes**: R9 task

### K4 — Pet care (feed/play)
- **Web file**: `frontend-web/src/components/Gamification/VirtualPet.tsx`
- **Web behavior**: Feed/play buttons → XP reward; care state tracking
- **Current RN state**: none
- **RN file(s)**: —
- **Backend endpoints**: `GET /api/v1/gamification/pet/{user_id}`, `POST /api/v1/gamification/pet/feed`, `POST /api/v1/gamification/pet/play`
- **Notes**: R9 task; care stats are hardcoded in RN PetsScreen

### K5 — Pet outfit
- **Web file**: `frontend-web/src/components/Gamification/VirtualPet.tsx` (outfit selection)
- **Web behavior**: Change pet outfit/accessories
- **Current RN state**: none
- **RN file(s)**: —
- **Backend endpoints**: `POST /api/v1/gamification/pet/outfit`
- **Notes**: R9 task

### K6 — Pet evolution
- **Web file**: `frontend-web/src/components/Gamification/VirtualPetEvolved.tsx`
- **Web behavior**: Pet evolves at XP threshold; show evolution animation
- **Current RN state**: none
- **RN file(s)**: —
- **Backend endpoints**: `GET /api/v1/gamification/pet-xp/{user_id}` (evolution stage)
- **Notes**: R9 task; evolution UI needs design

### K7 — Pet model / viewer
- **Web file**: `frontend-web/src/components/Gamification/Buddy3D.tsx`, `frontend-web/src/components/pets/PetViewer3D.tsx`
- **Web behavior**: 3D pet viewer using React Three Fiber; 2D sprite fallback
- **Current RN state**: 2D (PetCard/PetGrid use emoji thumbnails)
- **RN file(s)**: `mobile/rn/src/components/PetCard.tsx`, `mobile/rn/src/components/PetGrid.tsx`
- **Classification**: DECISION_REQUIRED (DQ-6)
- **Notes**: DQ-6 decides 2D-first vs 3D viewer; Unity AR has its own pet viewer

### K8 — Pet reward notifications
- **Web file**: `frontend-web/src/components/Gamification/RewardCelebration.tsx` (pet XP toast)
- **Web behavior**: Toast notification on pet care XP award
- **Current RN state**: none
- **RN file(s)**: —
- **Backend endpoints**: (from feed/play response)
- **Notes**: R9 task

---

## L. SESSION MANAGEMENT

### L1 — Session start/end
- **Web file**: `frontend-web/src/session/sessionBreakState.ts`
- **Web behavior**: beginLearningSession → active state with elapsed timer
- **Current RN state**: none
- **RN file(s)**: —
- **Backend endpoints**: `POST /api/v1/sessions/start`, `PATCH /api/v1/sessions/{id}/end`, `GET /api/v1/sessions/{user_id}/active`
- **Notes**: R10 task; AppState-based (not browser tab-visibility)

### L2 — Session timer
- **Web file**: `frontend-web/src/hooks/useSessionTimer.ts`
- **Web behavior**: 30-minute window timer; ticks up on active route
- **Current RN state**: none
- **RN file(s)**: —
- **Notes**: R10 task; RN uses AppState for background/foreground

### L3 — Idle detection
- **Web file**: `frontend-web/src/hooks/useSessionTimer.ts`
- **Web behavior**: Track last activity; pause timer on idle
- **Current RN state**: none
- **RN file(s)**: —
- **Notes**: R10 task

### L4 — Warning / hard limit
- **Web file**: `frontend-web/src/session/sessionBreakState.ts` (SESSION_WARNING_SECS = 25min, SESSION_LIMIT_SECS = 30min)
- **Web behavior**: Warning toast at 25min; hard stop modal at 30min
- **Current RN state**: none
- **RN file(s)**: —
- **Notes**: R10 task; constants from web config

### L5 — Break / cooldown
- **Web file**: `frontend-web/src/session/sessionBreakState.ts` (SESSION_BREAK_SECS = 5min)
- **Web behavior**: 5-minute cooldown after limit reached; cannot resume learning
- **Current RN state**: none
- **RN file(s)**: —
- **Backend endpoints**: `POST /api/v1/session-lock/*`
- **Notes**: R10 task; AppState must survive background/foreground across cooldown

### L6 — App background / foreground
- **Web file**: `frontend-web/src/hooks/useSessionTimer.ts` (tab visibility)
- **Web behavior**: Pause timer when tab hidden; resume on focus
- **Current RN state**: none
- **RN file(s)**: —
- **Notes**: R10 task; RN uses AppState API; must preserve break state across background

---

## M. AI CHAT

### M1 — Chat UI
- **Web file**: `frontend-web/src/components/ChatInterface.tsx`
- **Web behavior**: Message thread with AI tutor; send → get RAG response
- **Current RN state**: none
- **Classification**: DECISION_REQUIRED (DQ-7 — default: later phase)
- **Backend endpoints**: `POST /api/v1/chat/rag`, `POST /api/v1/chat/message`
- **Notes**: DQ-7 must resolve before R11; default: WEB_ONLY or R11

### M2 — RAG context
- **Web file**: `frontend-web/src/services/ChatService.ts`
- **Web behavior**: RAG pipeline for lesson context in chat responses
- **Current RN state**: none
- **Notes**: DQ-7; if DEFERRED, not in initial RN scope

---

## N. AR LEARNING

### N1 — AR entry from lesson
- **Web file**: `frontend-web/src/pages/LearnARV2.tsx`
- **Web behavior**: "Practice in AR" → navigate to AR experience with lessonId/qrCode
- **Current RN state**: existing (stub)
- **RN file(s)**: `mobile/rn/src/screens/LessonPlayerScreen.tsx` (Open AR button → AR screen)
- **Notes**: MOB-ARINT-REQ-001; R12 task

### N2 — AR capability gating
- **Web file**: N/A (web always has camera)
- **Web behavior**: N/A
- **Current RN state**: stub (placeholder text)
- **RN file(s)**: `mobile/rn/src/screens/ARScreen.tsx`
- **Notes**: MOB-ARINT-REQ-002; R12 task

### N3 — AR completion → XP handoff
- **Web file**: AR detection events → GamificationService
- **Web behavior**: onComboComplete → add XP with idempotency
- **Current RN state**: existing (RN bridge)
- **RN file(s)**: `mobile/rn/src/bridge/arMessages.ts`
- **Notes**: Shared XP contract; Unity lane owns MOB-GAME-REQ

---

## O. PUBLIC / ADMIN FEATURES

### O1 — Marketing landing page
- **Web file**: `frontend-web/src/pages/LandingPage.tsx`
- **Classification**: WEB_ONLY
- **Notes**: Not for mobile; public marketing lives on web

### O2 — Public flashcard viewer
- **Web file**: `frontend-web/src/pages/FlashcardPage.tsx` (public mode)
- **Classification**: DEFERRED (mobile-native QR entry serves this use case differently)
- **Notes**: Mobile uses QR scanning; public web viewer is separate

### O3 — Admin dashboard
- **Web file**: `frontend-web/src/pages/AdminDashboard.tsx` (assumed)
- **Classification**: WEB_ONLY
- **Notes**: Admin tools stay on web; not in RN scope

---

## Open Questions

| ID | Question | Blocks |
|----|----------|--------|
| DQ-1 | Animals course: AnimalsCourse vs AnimalsAdventure vs AnimalsLessonPlayer — which is canonical? | R2 |
| DQ-2 | Lesson player: standard LessonPlayer.tsx (stepId-based) vs AnimalsLessonPlayer (7-section)? | R4 |
| DQ-3 | Pronunciation: `/pronunciation/evaluate` vs `/pronunciation/transcribe`? | R7 |
| DQ-4 | Flashcard systems: which is learner canonical? | R5 |
| DQ-5 | Mini-games per-game KEEP/ADAPT/DEFER? | R6 |
| DQ-6 | Pet 3D viewer: 2D-first vs R3F/3D? | R9 |
| DQ-7 | AI Chat: initial parity, later phase, or web-only? | R11 |
| DQ-8 | Cutover: auto at 100% or product-owner approval? | R15 |
| DQ-9 | Guest mode scope: read-only catalog/flashcards only, or also preview lessons? | R1 |
| DQ-10 | Session break: keep web constants (30/25/5) or adjust for mobile? | R10 |
