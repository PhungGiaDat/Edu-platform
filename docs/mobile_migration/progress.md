# Mobile UI/UX Redesign — Progress Ledger
# Format: Task N: status (description)

## Branch
10-days-quick-run (from main)

## Cross-reference
See `docs/unity_ar/progress/2026-08-18-migration-status-reconciliation.md` for full M0–M12 phase status vs. code evidence.

## ⚠️ Unity AR phases (M2–M12) — see `docs/unity_ar/`
This ledger covers **React Native UI/UX redesign** only.
Unity AR phases M2–M12 are tracked in `docs/unity_ar/progress/2026-08-18-migration-status-reconciliation.md`.

## Overview

Comprehensive visual redesign of the EduAR mobile app (Expo/React Native) into a **premium playful education platform** with:
- Claymorphism card system (multi-layer shadows + highlight gradients)
- Vibrant engaging color palette
- Course catalog preview with real data
- Student testimonials
- Enrollment CTA
- Animated progress rings and SVG level indicators

All 4 main screens redesigned, wired to real data via existing hooks.

---

## Task Progress

### LRN — Learn Vocabulary & Notebook (Web Enhanced) 📚

**Date:** 2026-08-20
**Branch:** 10-days-quick-run
**Targets:** Web (`frontend/`) + React Native (`mobile/rn/`)

#### Features
| Feature | Mô tả | Status |
|---------|--------|--------|
| Sổ tay (Notebook) | Save words từ AI translation/flashcard swipe | 📋 SPEC DONE |
| Tra từ (AI Dictionary) | AI contextual translation với Qdrant wiki | 📋 SPEC DONE |
| TikTok Flashcards | Vertical swipe flashcard, topic/IELTS | 📋 SPEC DONE |
| Thời điểm vàng | Spaced repetition push notifications | 📋 SPEC DONE |

#### Backend Tasks
| # | Task | Status | Files |
|---|------|--------|-------|
| 1 | Database Schema Migration | ✅ DONE | `migrations/20260820_01_notebook_tables.sql` |
| 2 | Notebook CRUD API | ✅ DONE | `models/notebook_entry.py`, `repositories/notebook_repository.py`, `services/notebook_service.py`, `api/notebook.py` |
| 3 | Dictionary Translation API | ✅ DONE | `models/dictionary.py`, `services/dictionary_service.py`, `api/dictionary.py` |
| 4 | Vocabulary Topics API | ✅ DONE | `models/vocabulary_topic.py`, `repositories/vocabulary_topic_repository.py`, `api/vocabulary_topics.py` |

#### Frontend Tasks
| # | Task | Platform | Status |
|---|------|----------|--------|
| 5 | NotebookScreen | Web + RN | ⏳ Pending |
| 6 | DictionaryScreen | Web + RN | ⏳ Pending |
| 7 | SwipeFlashcardsScreen | Web + RN | ⏳ Pending |
| 8 | Push Notification System | Web + RN | ⏳ Pending |

#### PWA Setup (Add to Home Screen)
| File | Description |
|------|-------------|
| `frontend/manifest.json` | PWA manifest với icons, shortcuts |
| `frontend/src/hooks/usePWAInstall.ts` | Hook xử lý install prompt |
| `frontend/src/components/PWAInstallButton.tsx` | UI button cho iOS/Android |
| `frontend/public/static/js/sw-notifications.js` | Service Worker cho notifications |
| `backend/database/postgres/migrations/20260820_01_notebook_tables.sql` | Schema với SM-2 algorithm |

#### Spec & Plan
- **Spec:** `docs/mobile_migration/spec/learn-vocab-notebook-spec.md`
- **Plan:** `docs/mobile_migration/plans/2026-08-20-learn-vocab-notebook-plan.md`

---

### Phase 1 — Design Tokens ✅
- Task 18: COMPLETE
  - Added vibrant color palette to `design/tokens.ts`:
    - `vibrantOrange` (#FF8C42) / Dark / Light
    - `electricPurple` (#A855F7) / Dark / Light
    - `neonTeal` (#14B8A6) / Dark / Light
    - `bubblePink` (#F472B6) / Dark / Light
  - Extended `COLOR_MAP` with orange, purple, teal, pink variants
  - Extended `CLAY_TONE_SHADOWS` for new tone families

### Phase 2 — New Components ✅
- Task 19: COMPLETE (6 components built)

| Component | File | Description |
|-----------|------|-------------|
| `TestimonialCard` | `components/TestimonialCard.tsx` | Avatar + star rating + quote + attribution in ClayCard wrapper |
| `ProgressRing` | `components/ProgressRing.tsx` | Animated circular SVG progress ring with customizable label/sublabel |
| `CategoryChip` | `components/CategoryChip.tsx` | Animated pill-shaped filter chip, active/inactive states |
| `CourseShowcaseCard` | `components/CourseShowcaseCard.tsx` | Hero card: gradient header, category badge, progress bar, CTA |
| `EnrollmentCTA` | `components/EnrollmentCTA.tsx` | Vibrant banner with shimmer animation, inline or compact variant |
| `StatsDemoCard` | `components/StatsDemoCard.tsx` | Aggregate platform stats: students, courses, avg rating |

### Phase 3 — HomeScreen Redesign ✅
- Task 20: COMPLETE
  - Full rewrite of `screens/HomeScreen.tsx`
  - Layout:
    1. Gradient hero banner (lavender→skyBlue) with confetti dots, LevelRing, streak badge
    2. StatsDemoCard (platform aggregate: 12,847 students, 36 courses, 4.8 rating)
    3. CourseShowcaseCard — featured course from real `useCourses()` data
    4. CategoryChip horizontal filter row (5 categories: All, Animals, Nature, School, Family)
    5. 2-column course grid (real data, filtered by category)
    6. TestimonialCard horizontal scroll (3 mock Vietnamese student reviews)
    7. EnrollmentCTA inline banner ("Bắt đầu hành trình học tập!")
    8. LexiOrb floating + BottomTabs fixed

### Phase 4 — CourseListScreen Redesign ✅
- Task 21: COMPLETE
  - Full rewrite of `screens/CourseListScreen.tsx`
  - Layout:
    1. Custom header (back arrow + title + sparkle search icon)
    2. CategoryChip filter rows (derived from real `useCourses()` data + 4 level chips)
    3. Featured CourseShowcaseCard hero (first matching course)
    4. FlatList of CourseRowCard items (accent bar, XP badge, arrow)
    5. Error banner (designed) + empty state
    6. LexiOrb floating

### Phase 5 — CourseDetailScreen + ProfileScreen Polish ✅
- Task 22: COMPLETE
  - `screens/CourseDetailScreen.tsx`: Added ProgressRing (neonTeal, lesson completion) + TestimonialCard side-by-side below hero
  - `screens/ProfileScreen.tsx`:
    - Replaced manual StatCard row → StatsDemoCard (compact)
    - Replaced weekly bar chart → ProgressRing + daily bar combo
    - Added TestimonialCard (student achievement)
    - Added EnrollmentCTA ("Mời bạn bè cùng học!")

---

## TypeScript Verification
```
cd mobile/rn && npx tsc --noEmit
# → Zero errors across all screens and components
```

---

## Files Modified / Created

### Design
- `src/design/tokens.ts` — extended with vibrant palette

### New Components
- `src/components/TestimonialCard.tsx`
- `src/components/ProgressRing.tsx`
- `src/components/CategoryChip.tsx`
- `src/components/CourseShowcaseCard.tsx`
- `src/components/EnrollmentCTA.tsx`
- `src/components/StatsDemoCard.tsx`

### Redesigned Screens
- `src/screens/HomeScreen.tsx` — full redesign
- `src/screens/CourseListScreen.tsx` — full redesign
- `src/screens/CourseDetailScreen.tsx` — add ProgressRing + TestimonialCard
- `src/screens/ProfileScreen.tsx` — add StatsDemoCard + EnrollmentCTA + TestimonialCard

---

## Design Language Summary

### Color Palette (key tokens)
| Token | Hex | Usage |
|-------|-----|-------|
| `BRAND.sunshineYellow` | #FFD93D | XP rewards, CTAs |
| `BRAND.skyBlue` | #6EB9FF | Courses, links |
| `BRAND.mintGreen` | #B4E197 | Completion, success |
| `BRAND.coralPink` | #FF9F9F | Streak, games |
| `BRAND.lavender` | #A78BFA | Lexi, badges |
| `BRAND.vibrantOrange` | #FF8C42 | Section eyebrows, CTA |
| `BRAND.electricPurple` | #A855F7 | Achievement highlights |
| `BRAND.neonTeal` | #14B8A6 | Progress rings, completion |
| `BRAND.bubblePink` | #F472B6 | Avatar accents |
| `COLORS.backgroundBase` | #FFF8EE | Page background |

### Typography
- Eyebrow labels: uppercase, letter-spaced, `FONT.sizes.xs`, weight 800
- Section headings: `FONT.sizes.xxl`, weight 900, letter-spacing -0.5
- Body: `FONT.sizes.md`, weight 500
- All via `FONT` from design tokens — no raw hex outside tokens.ts

### Claymorphism
- ClayCard: multi-layer shadow + top highlight gradient + spring press animation
- Press scale: 0.985, translateY: 2px, shadow opacity halved on press
- All spring configs from `CLAYMORPHIC_SPRINGS.buttonPress`

### Layout
- Page padding: `SPACING.base` (16px) horizontal
- Section gap: `SPACING.lg` (24px)
- Card gap: `SPACING.md` (12px)
- Border radius: `RADIUS.lg` (24px) cards, `RADIUS.xl` (32px) hero cards

---

## Data Hooks Used
- `useUser()` → `stats`, `streak` (XP, level, streak days, badges)
- `useCourses()` → `courses` (course catalog, category filter)
- `useCourseDetail(courseId)` → `course`, `lessons` (lesson list)
- `usePets()` → `pets` (pet list)
- `useLocale()` → `t`, `locale` (i18n)

---

## Notes
- All screens include LexiOrb floating above bottom tabs
- LexiBottomSheet accessible from every screen
- Mock testimonial data used (real testimonial API endpoint not yet wired)
- Weekly activity chart uses mock data (real `daily_progress` field exists on `UserStats`)
- ProfileScreen display_name not available on UserStats — used static "Học viên"
- Badge data from `stats.badges?.length` (array of badge codes)

---

## R10 — Unity as Library Integration ✅

**Date:** 2026-08-13
**Branch:** MindAR-Update

### Goal
Embed Unity runtime inside React Native Android app (not standalone APK).

### Architecture
```
RN App (Android)
├── app (React Native UI)
└── unityLibrary (Unity Runtime)
    ├── RNUnityPlayerActivity (custom Activity)
    ├── UnityPlayer.UnitySendMessage (JNI bridge)
    └── Assets/bin/Data/ (scenes, scripts)
```

### Key Files Created/Modified
| File | Action |
|------|--------|
| `mobile/unity/Builds/Android/unityLibrary/` | NEW — Unity library |
| `mobile/unity/Builds/.../RNUnityPlayerActivity.java` | NEW — Unity Activity |
| `mobile/rn/android/.../UnityBridgeModule.kt` | NEW — RN native module |
| `mobile/rn/android/.../UnityBridgePackage.kt` | NEW — React package |
| `mobile/rn/android/settings.gradle` | MODIFIED — include unityLibrary |
| `mobile/rn/android/app/build.gradle` | MODIFIED — add dependency |
| `mobile/rn/android/gradle.properties` | MODIFIED — minSdk=25, arm64-v8a |
| `mobile/unity/Assets/Plugins/Android/UnityBridgePlugin.cs` | NEW — Unity IPC |

### Build Output
```
mobile/rn/android/app/build/outputs/apk/debug/app-debug.apk
```

### Build Issues Resolved
| Issue | Solution |
|-------|----------|
| minSdk conflict (24 vs 25) | Set `android.minSdkVersion=25` |
| Windows 260-char path limit | Single arch `arm64-v8a` only |
| New Architecture required | Enabled (Reanimated dependency) |

### Next Steps
1. Install APK on Android device
2. Rebuild Unity scene with ARBootstrapScene
3. Verify UNITY_READY → PING/PONG flow
4. Test AR camera and image tracking

### Docs
See: `docs/unity_ar/progress/2026-08-13-unity-as-library-integration.md`
