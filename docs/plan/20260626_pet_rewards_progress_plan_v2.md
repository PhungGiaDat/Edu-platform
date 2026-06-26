# Pet Rewards & Progress Reporting — Structured Plan v2

**Date:** 2026-06-26
**Status:** Draft for Review
**Mode:** YOLO — Execute after approval
**Authors:** Planner + Researcher Subagents

---

## 1. Goal

Fix four critical gamification bugs and build a Duolingo-inspired pet companion + sticker reward system for kids aged 5-7, using the existing claymorphic design system — replacing mock progress data with real MongoDB aggregations throughout.

---

## 2. Design Philosophy: Duolingo for Ages 5-7

### Core Principles Adapted from Duolingo

| Duolingo Pattern | Kids Adaptation (Ages 5-7) | Implementation |
|-----------------|---------------------------|---------------|
| **Streaks** | Fire emoji streak counter on home screen | `backend/gamification_service.py` streak logic + `frontend-web/src/components/StreakBadge.tsx` |
| **XP & Levels** | Large XP bubbles with bounce animations | Clay XP pill (`clay-xp-pulse`) + level-up modal |
| **Immediate Feedback** | Green checkmarks, confetti, sounds | HapticService + SoundEffectService on reward events |
| **Hearts/Lives** | Pet hunger meter as "health" — caring feeds the pet | Pet mood = engagement proxy; care actions = positive reinforcement |
| **Daily Goal** | "3 lessons today!" with progress ring | Daily learning path with `clay-progress-ring` |
| **League/Ranking** | Pet stage evolution: baby → child → teen → adult | Pet XP → stage transitions in `gamification_service.py` |
| **Sticker Collection** | Duolingo's "Artifact" album, adapted for kids | Sticker gallery page with rarity sparkle effects |
| **Reward Chests** | "Open your treasure!" after completing lessons | XP/coin award chest animation after each lesson |
| **Character Mascot** | Pet is the companion, not just a stat display | 3D pet viewer, pet reacts to lesson completion |

### Claymorphic Design Tokens (Existing)

All UI components reuse existing tokens from `claymorphic-utilities.css`:

- **Cards:** `.clay-card`, `.clay-card-sm`, `.clay-card-lg`
- **Buttons:** `.clay-btn-yellow`, `.clay-btn-green`, `.clay-btn-pink`, `.clay-btn-blue`
- **Progress:** `.clay-progress-ring`, `.clay-shimmer`
- **Animations:** `.clay-float`, `.clay-xp-pulse`, `.clay-reveal`
- **Badges:** `.clay-badge-yellow`, `.clay-badge-green`

---

## 3. Phases and Sprints

### Phase 1: Foundation — Critical Bug Fixes (3 sprints)

**Goal:** Eliminate the four root-cause bugs blocking all gamification features.

#### Sprint 1A — Pet Feed & Play Direction Fixes
- **Deliverable:** `PetsPage.tsx` line 292 direction corrected; play energy aligned with backend
- **Files:** `frontend-web/src/pages/PetsPage.tsx`
- **Verification:** Manual test: feed pet → hunger decreases; play → energy decreases by ~15

#### Sprint 1B — Sticker Collection UI (Backend Verified)
- **Deliverable:** `StickersPage.tsx` with collect button wired to `POST /gamification/stickers/collect`
- **Files:** `frontend-web/src/pages/StickersPage.tsx`, `frontend-web/src/services/apiClient.ts`
- **Backend:** `GET /gamification/stickers/catalog` endpoint + `get_sticker_catalog()` service method

#### Sprint 1C — Progress Report Real Aggregation
- **Deliverable:** `reports.py` lines 27–55 replaced with real MongoDB aggregation from `SessionLogDocument` and `LearningProgressDocument`
- **Files:** `backend/api/reports.py`, `backend/repositories/gamification_repository.py`

#### Sprint 1D — Daily Progress from Session Logs
- **Deliverable:** `learning_path.py` `/progress` endpoint aggregates from session logs instead of echoing client input
- **Files:** `backend/api/learning_path.py`, `backend/models/session_log.py`

---

### Phase 2: Core Features — Pet System + Stickers + Progress (4 sprints)

**Goal:** Ship the full pet companion experience, sticker collection, and live progress dashboard.

#### Sprint 2A — Pet Stage Evolution & XP System
- **Deliverable:** Pets evolve through baby → child → teen → adult stages based on accumulated pet XP
- **Files:** `backend/services/gamification_service.py` (add `evolve_pet` + stage thresholds), `frontend-web/src/pages/PetsPage.tsx` (stage display + evolution modal)
- **Trigger:** Pet XP earned from feeding, playing, lesson completion

#### Sprint 2B — Sticker Gallery with Rarity Effects
- **Deliverable:** Full sticker page with collected/uncollected states, rarity sparkle CSS, "Collect" button
- **Files:** `frontend-web/src/pages/StickersPage.tsx`, `frontend-web/src/components/Gamification/StickerCollection.tsx`
- **Backend:** `GET /gamification/stickers/{user_id}` list endpoint

#### Sprint 2C — Progress Dashboard with Clay UI
- **Deliverable:** `ProgressDashboard.tsx` showing streak, XP, level, topics, weekly chart — all real data
- **Files:** `frontend-web/src/pages/ProgressDashboard.tsx`, `frontend-web/src/hooks/useProgressReport.ts`
- **Wire to:** `GET /reports/user/{user_id}/summary` (fixed in Sprint 1C)

#### Sprint 2D — Reward Chest Animation on Lesson Complete
- **Deliverable:** XP award chest animation plays after each lesson via `HapticService` + `SoundEffectService`
- **Files:** `frontend-web/src/pages/LessonPlayer.tsx` (lesson complete handler), `frontend-web/src/services/HapticService.ts`

---

### Phase 3: Polish — Gamification Hooks + Dashboard UX (2 sprints)

**Goal:** Connect gamification to the learning loop; polish the daily progress experience.

#### Sprint 3A — Gamification Hook Into Lesson Flow
- **Deliverable:** Lesson completion calls `track_learning()` → awards XP + checks sticker rewards
- **Files:** `backend/services/course_service.py` (after lesson complete), `backend/api/courses.py` (XP metadata)
- **Side effect:** Pet XP increases; sticker auto-awarded if threshold reached

#### Sprint 3B — Daily Streak & Goal Setting UI
- **Deliverable:** Home screen shows streak badge, daily goal progress ring, next lesson prompt
- **Files:** `frontend-web/src/pages/Home.tsx` (or dashboard), `frontend-web/src/components/DailyGoalRing.tsx`
- **Backend:** `GET /gamification/streak/{user_id}` endpoint

---

## 4. Work Breakdown Structure (WBS)

### Phase 1: Foundation — Bug Fixes

#### 1.1 Pet Feed Bug Fix
- **1.1.1** Fix `handleFeed` direction — `PetsPage.tsx:292`
  - Change `Math.min(100, prev.hunger + 16)` → `Math.max(0, prev.hunger - 16)`
  - File: `frontend-web/src/pages/PetsPage.tsx`
- **1.1.2** Align `handlePlay` energy decay — `PetsPage.tsx:324`
  - Change `Math.max(0, prev.energy - 8)` → `Math.max(0, prev.energy - 15)` to match backend
  - File: `frontend-web/src/pages/PetsPage.tsx`

#### 1.2 Sticker Collection Frontend
- **1.2.1** Add `GET /gamification/stickers/catalog` endpoint
  - File: `backend/api/gamification.py` (new route)
  - File: `backend/services/gamification_service.py` (add `get_sticker_catalog()`)
- **1.2.2** Add user sticker list endpoint `GET /gamification/stickers/{user_id}`
  - File: `backend/api/gamification.py`
- **1.2.3** Create `StickersPage.tsx` with catalog display + collect button
  - File: `frontend-web/src/pages/StickersPage.tsx`
  - Wire to: `apiClient.post('/api/v1/gamification/stickers/collect')`
- **1.2.4** Add sticker endpoints to `apiClient.ts`
  - File: `frontend-web/src/services/apiClient.ts`

#### 1.3 Progress Report Real Aggregation
- **1.3.1** Rewrite `get_user_progress_summary` — `reports.py:15-55`
  - Aggregate from `SessionLogDocument`, `LearningProgressDocument`, `UserPoints`
  - File: `backend/api/reports.py`
- **1.3.2** Add `get_daily_stats_v2()` repository method
  - File: `backend/repositories/gamification_repository.py`
- **1.3.3** Add `words_learned`, `games_played`, `pronunciation_attempts` to `SessionLogDocument`
  - File: `backend/models/session_log.py`
- **1.3.4** Add `mastered_at` to `LearningProgressDocument`
  - File: `backend/models/learning_path.py` or `backend/models/user_mongo.py`

#### 1.4 Daily Progress from Session Logs
- **1.4.1** Rewrite `track_daily_progress` endpoint — `learning_path.py:174-201`
  - Aggregate from `SessionLogDocument` instead of echoing client input
  - File: `backend/api/learning_path.py`
- **1.4.2** Update `LessonPlayer.tsx` to call progress tracking on complete
  - File: `frontend-web/src/pages/LessonPlayer.tsx`

---

### Phase 2: Core Features

#### 2.1 Pet Stage Evolution
- **2.1.1** Add `evolve_pet()` service method with stage thresholds
  - File: `backend/services/gamification_service.py`
- **2.1.2** Add stage display + evolution celebration modal to `PetsPage.tsx`
  - File: `frontend-web/src/pages/PetsPage.tsx`
- **2.1.3** Add `get_pet_xp()` and `get_pet_stage()` endpoints
  - File: `backend/api/gamification.py`

#### 2.2 Sticker Gallery
- **2.2.1** Enhance `StickersPage.tsx` with rarity sparkle effects (CSS)
  - File: `frontend-web/src/pages/StickersPage.tsx`
- **2.2.2** Add sticker count badge to home screen
  - File: `frontend-web/src/pages/Home.tsx`

#### 2.3 Progress Dashboard
- **2.3.1** Wire `ProgressDashboard.tsx` to real `/reports/user/{user_id}/summary`
  - File: `frontend-web/src/pages/ProgressDashboard.tsx`
- **2.3.2** Add streak display component
  - File: `frontend-web/src/components/StreakBadge.tsx` (new)
- **2.3.3** Add weekly activity chart (from `reports.py` `/weekly`)
  - File: `frontend-web/src/pages/ProgressDashboard.tsx`

#### 2.4 Reward Chest Animation
- **2.4.1** Add chest open animation in `LessonPlayer.tsx` on lesson complete
  - File: `frontend-web/src/pages/LessonPlayer.tsx`
- **2.4.2** Integrate `HapticService` + `SoundEffectService` on reward events
  - File: `frontend-web/src/services/HapticService.ts`

---

### Phase 3: Polish

#### 3.1 Lesson Flow Gamification Hooks
- **3.1.1** Call `track_learning()` after lesson completion
  - File: `backend/services/course_service.py`
- **3.1.2** Pass `words_learned` and `time_mins` in XP metadata
  - File: `backend/api/courses.py`

#### 3.2 Daily Streak & Goal UI
- **3.2.1** Add streak badge to home/dashboard
  - File: `frontend-web/src/pages/Home.tsx`
- **3.2.2** Add daily goal progress ring component
  - File: `frontend-web/src/components/DailyGoalRing.tsx` (new)
- **3.2.3** Add `GET /gamification/streak/{user_id}` endpoint
  - File: `backend/api/gamification.py`

---

## 5. Risks

| ID | Category | Risk | Likelihood | Impact | Mitigation |
|----|----------|------|------------|--------|------------|
| **R1** | Technical | Pet state stored in `user_points.pet` (embedded). Concurrent session updates could cause race conditions on pet stats. | Medium | Medium | Use MongoDB `$inc` for atomic stat updates in `gamification_repository.py` |
| **R2** | Technical | `SessionLogDocument` not populated by frontend in all lesson flows. Progress aggregation may return zeros. | High | High | Audit all lesson completion paths in `LessonPlayer.tsx` and `course_service.py`; ensure session logs are written |
| **R3** | Technical | `track_learning()` in `gamification_service.py` (line 514) exists but is never called. Risk: even after fix, it may have hidden bugs. | Medium | High | Write unit tests for `track_learning()` before connecting to lesson flow |
| **R4** | Schedule | Sticker images at `/assets/stickers/*.png` may not exist in frontend. Gallery would show broken images. | Medium | Low | Use emoji fallbacks as primary display; treat image URLs as progressive enhancement |
| **R5** | Quality | Kids (ages 5-7) cannot read progress numbers. Dashboard stats must be purely visual (icons, colors, animations). | High | High | Replace all numeric labels with icon-based progress (stars, hearts, pet moods) |
| **R6** | Quality | Duplicate sticker collection calls could award stickers twice if frontend retries. | Medium | Medium | Backend uses `$addToSet` in `collect_sticker` — idempotent. Ensure frontend handles 409 Conflict gracefully |
| **R7** | Technical | Whisper cold-start (identified in v1 plan) is out of scope for v2 but remains a UX issue. | Low | Medium | Document as separate backlog item; does not block gamification |

---

## 6. Estimates

### Effort by Phase

| Phase | Sprint | Tasks | Estimated Hours |
|-------|--------|-------|----------------|
| **Phase 1** | 1A — Pet Feed Fix | 2 | 1 hr |
| | 1B — Sticker UI | 4 | 4 hrs |
| | 1C — Progress Aggregation | 4 | 5 hrs |
| | 1D — Daily Progress | 2 | 3 hrs |
| **Phase 1 Subtotal** | | **12** | **13 hrs** |
| **Phase 2** | 2A — Pet Evolution | 3 | 5 hrs |
| | 2B — Sticker Gallery | 2 | 3 hrs |
| | 2C — Progress Dashboard | 3 | 4 hrs |
| | 2D — Reward Chest | 2 | 3 hrs |
| **Phase 2 Subtotal** | | **10** | **15 hrs** |
| **Phase 3** | 3A — Gamification Hooks | 2 | 3 hrs |
| | 3B — Streak & Goals UI | 3 | 4 hrs |
| **Phase 3 Subtotal** | | **5** | **7 hrs** |
| **Buffer (testing, review)** | | | **5 hrs** |
| **Total** | | **27** | **40 hrs** |

### Critical Path (Phase 1 must complete before Phase 2)

```
1A → 1B (sticker API needed for 2B)
1C → 2C (real data needed for dashboard)
1D → 3A (session aggregation needed for XP tracking)
```

---

## 7. File Change Summary

### Backend Files

| File | Change Type | Phase |
|------|-------------|-------|
| `backend/api/gamification.py` | Add catalog + streak endpoints | 1B, 3B |
| `backend/api/reports.py` | Rewrite aggregation | 1C |
| `backend/api/learning_path.py` | Rewrite daily progress | 1D |
| `backend/services/gamification_service.py` | Add `get_sticker_catalog()`, `evolve_pet()`, fix `track_learning()` call site | 1B, 2A, 3A |
| `backend/repositories/gamification_repository.py` | Add `get_daily_stats_v2()` | 1C |
| `backend/models/session_log.py` | Add fields | 1C |
| `backend/models/learning_path.py` | Add `mastered_at` | 1C |
| `backend/services/course_service.py` | Call `track_learning()` | 3A |
| `backend/api/courses.py` | Pass XP metadata | 3A |

### Frontend Files

| File | Change Type | Phase |
|------|-------------|-------|
| `frontend-web/src/pages/PetsPage.tsx` | Fix feed/play direction, add evolution | 1A, 2A |
| `frontend-web/src/pages/StickersPage.tsx` | New sticker gallery page | 1B, 2B |
| `frontend-web/src/services/apiClient.ts` | Add sticker endpoints | 1B |
| `frontend-web/src/pages/ProgressDashboard.tsx` | Wire real data, add charts | 2C |
| `frontend-web/src/pages/LessonPlayer.tsx` | Reward chest, progress tracking | 1D, 2D |
| `frontend-web/src/components/StreakBadge.tsx` | New streak display | 2C, 3B |
| `frontend-web/src/components/DailyGoalRing.tsx` | New progress ring | 3B |
| `frontend-web/src/pages/Home.tsx` | Add sticker count, streak badge | 2B, 3B |
| `frontend-web/src/services/HapticService.ts` | Reward event integration | 2D |

---

## 8. Open Questions Requiring Decisions

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| **Q1** | Sticker collection: auto-award only or manual collect button? | A) Auto only (current design) B) Manual button C) Hybrid | **Option B** — manual collect button in gallery provides tangible reward moment |
| **Q2** | Words learned threshold: `mastery_level >= 1`, `>= 3`, or `== 5`? | `>= 1` (any engagement), `>= 3` (confident), `== 5` (mastered) | **>= 3** — counts "learning" as meaningful progress, not just first touch |
| **Q3** | Favorite topic algorithm: most session time or most mastered words? | A) Session time B) Mastered word count | **Hybrid** — show topic with most mastered words; fall back to session time if tie |
| **Q4** | Pet stat persistence: embedded in `user_points` or separate `user_pets` collection? | A) Keep embedded (current) B) Separate collection | **Keep embedded** — `user_points.pet` is fine; unlock/unlocked_pets already split in `UserDocument` |
| **Q5** | Daily stats strategy: `$push` accumulates or upsert-per-day? | A) Push-once per day B) Upsert-per-day | **Upsert-per-day** — cleaner aggregation; push approach risks duplicate entries |

---

## 9. Verification Criteria

Each task must be verified by the stated test:

| Task | Verification |
|------|-------------|
| 1.1.1 Feed direction | Feed pet → hunger stat decreases in UI |
| 1.1.2 Play energy | Play with pet → energy bar visibly drops ~15 points |
| 1.2.1 Sticker catalog API | `GET /gamification/stickers/catalog` returns full `STICKER_CATALOG` JSON |
| 1.2.3 Sticker collect | Click collect → sticker appears in gallery, API returns 200 |
| 1.3.1 Progress aggregation | `GET /reports/user/{id}/summary` returns non-zero `total_words_learned` after session log exists |
| 1.4.1 Daily progress | `POST /learning-path/progress` with session logs returns aggregated time ≠ client input |
| 2.1.1 Pet evolution | Feed/play pet → pet XP increases; at threshold → stage upgrade modal appears |
| 2.3.1 Dashboard real data | ProgressDashboard shows streak count matching `user_points.streak_days` |

---

## 10. Quality Gates

1. **Phase 1 Complete when:**
   - All 4 critical bugs verified fixed (see Verification Criteria)
   - No linter errors introduced
   - Backend unit tests pass for `gamification_service.py`

2. **Phase 2 Complete when:**
   - Sticker gallery renders with real collected stickers
   - Pet evolution modal triggers at correct XP thresholds
   - Progress Dashboard shows non-mock data for test user

3. **Phase 3 Complete when:**
   - Lesson completion awards XP and updates pet
   - Streak badge visible and accurate on home screen
   - Daily goal ring animates to correct percentage

---

**Prepared by:** SDLC Orchestrator
**Contributors:** Planner Subagent, Researcher Subagent
**Date:** 2026-06-26
**Next Action:** User approval → Begin Phase 1 Sprint 1A (Pet Feed Fix)
