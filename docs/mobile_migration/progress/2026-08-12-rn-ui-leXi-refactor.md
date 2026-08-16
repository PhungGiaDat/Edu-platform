# RN UI Refactor + Lexi — COMPLETED

## Session
2026-08-12, agent: Claude Code, branch: MindAR-Update

## Scope
`mobile/rn/src/**` — mobile-first claymorphic UI refactor + Lexi chatbot UX.
READ-ONLY: `backend/`, `docs/mobile_migration/`, `docs/unity_ar/`, `frontend-web/`, `mobile/unity/`.

---

## 1. Session Status
**COMPLETED** — all planned deliverables shipped. TypeScript: 0 errors. HomeScreen XP tests: 8/8 pass.

---

## 2. Cold-Start Findings

From `2026-08-11-c26-gamification-event-implemented.md`:
- Backend gamification wiring is complete (105/105 tests pass)
- RN eventId plumbing is in place (`useGamification`, `AddXpEventRequest/Response`)
- Pet care state (`usePets`, `petsApi.getPetCareState`) wired
- Courses, stats, streak all backed by real API hooks

From `mobile/rn/src/` inspection:
- ClayCard, ClayButton, ClayProgressBar, XPBadge, StreakBadge already exist and are solid
- `design/tokens.ts` has a rich palette (BRAND, RARITY_COLORS, CATEGORY_COLORS, CARE_STAT_COLORS)
- Existing components use `LinearGradient` for highlight + boxShadow for claymorphism
- HomeScreen was a flat "tile board" with generic titles ("Home", "Courses", etc.)
- BottomTabs had 4 entries, no Games tab, no animation
- No Lexi chatbot UI existed
- Language was mixed EN/VI — titles varied arbitrarily

---

## 3. UI Problems Fixed

| Problem | Fix |
|---------|-----|
| Home was a flat 2-column grid of ClayCards | New hero section with personalized greeting + pet avatar |
| No visual hierarchy on Home | Primary (large + accent color), secondary (small), quick-action rows |
| Hardcoded EN titles ("Home", "Courses") | All replaced with Vietnamese: "Chào bạn!", "Khám phá khóa học", etc. |
| ProgressTracker was the only gamification visual | Added XPBadge + StreakBadge row + "Tiếp tục học" card |
| No Lexi entry anywhere | FloatingButton + QuickActionSheet + Lexi banner card |
| BottomTabs had no Games entry | Added Games tab, renamed tabs to VI |
| BottomTabs had no animation | Animated spring scale on press |
| Section headers were generic | "Khám phá", "Tiếp tục học" etc. |
| GamesMenuScreen had EN text | Converted to Vietnamese |
| PetsScreen had EN title | Changed to "Thú cưng của tôi" |

---

## 4. Screens/Components Refactored

### New files
- `components/LexiFloatingButton.tsx` — pulsing floating pill with butterfly mascot, bottom-right
- `components/LexiQuickActionSheet.tsx` — full bottom-sheet with chat bubbles, typing indicator, 6 quick-action tiles, text input

### Refactored files
- `screens/HomeScreen.tsx` — full UI rewrite: hero greeting, badge row, continue-learning card, primary/secondary/quick feature grid, Lexi banner, floating button
- `navigation/BottomTabs.tsx` — 5 tabs (Home/Học/Game/Pet/Hồ sơ), animated press, active dot indicator, refined pill icons
- `screens/LearningPathScreen.tsx` — VI title, subtitle
- `screens/CourseListScreen.tsx` — VI title
- `screens/PetsScreen.tsx` — VI title + Lexi components
- `screens/games/GamesMenuScreen.tsx` — VI text + Lexi components

---

## 5. Claymorphic Improvements

- **Hero section**: warm personalized greeting (`"Chào bạn! 👋"`) + pet mini-avatar in a soft lavender circle
- **Badge row**: XPBadge + StreakBadge + pet name pill — all in a flex row with gaps
- **Continue Learning card**: large ClayCard with progress bar, book emoji icon, arrow CTA
- **Primary feature row**: asymmetric 1.4:1 split (Learning Path larger) + right column with 2 smaller tiles
- **Quick-action row**: 3 equal tiles for Pets/Profile/Lexi
- **Lexi banner**: lavender-tinted card with butterfly avatar, teaser copy, arrow
- **BottomTabs**: elevated white bar with rounded pill icons, active dot indicator, spring-animated press

---

## 6. Lexi Chatbot UX Added

### LexiFloatingButton
- Pulsing spring animation (subtle scale loop)
- Butterfly emoji in lavender circle
- "Lexi" label pill
- Bottom-right position (above BottomTabs)
- z-index: 100

### LexiQuickActionSheet
- Bottom-sheet modal with spring translateY animation
- Drag handle bar at top
- Header: butterfly avatar, "Lexi" title, "Trợ lý học tập" subtitle
- Chat history with lavender user bubbles and white Lexi bubbles
- Animated typing indicator (3 bouncing dots)
- 6 quick-action tiles:
  - "Hôm nay học gì?" (sky blue)
  - "Giúp em chọn bài học" (mint green)
  - "Ôn từ vựng" (yellow)
  - "Chơi game" (coral)
  - "Thú cưng của em" (mint green)
  - "Nhắc em học tiếp" (sky blue)
- Text input with purple send button
- Lexi replies are contextual per action
- Lexi lives on: HomeScreen, PetsScreen, GamesMenuScreen

### LexiBanner
- White clay card on HomeScreen
- Lavender butterfly avatar + purple title
- Clickable → opens LexiQuickActionSheet

---

## 7. Navigation Improvements

- BottomTabs: 5 tabs with animated press (spring scale 0.88 on press)
- Active tab: colored pill icon well + colored label + bottom dot indicator
- Games tab added → navigates to `GamesMenu`
- Learning tab added → navigates to `LearningPath`
- All tab labels in Vietnamese

---

## 8. Tests / Typecheck

- **TypeScript**: `tsc --noEmit` → **0 errors**
- **HomeScreen XP tests**: 8/8 pass (0 failures)
  - Pre-existing Jest ESM/Node module system failures are unrelated to these changes (14 suites affected, all pre-existing)

---

## 9. Files Changed

### New
- `mobile/rn/src/components/LexiFloatingButton.tsx`
- `mobile/rn/src/components/LexiQuickActionSheet.tsx`

### Modified
- `mobile/rn/src/screens/HomeScreen.tsx` — full refactor
- `mobile/rn/src/navigation/BottomTabs.tsx` — 5 tabs, animated
- `mobile/rn/src/screens/LearningPathScreen.tsx` — VI titles
- `mobile/rn/src/screens/CourseListScreen.tsx` — VI titles
- `mobile/rn/src/screens/PetsScreen.tsx` — VI title + Lexi
- `mobile/rn/src/screens/games/GamesMenuScreen.tsx` — VI text + Lexi

---

## 10. Remaining UI Gaps

- **CourseDetailScreen**: header polish + consistent claymorphism (not touched in this session)
- **LessonPlayerScreen**: flashcard polish + Lexi entry point (not touched)
- **ProfileScreen**: uses HomeScreen in profileMode — already gets Lexi floating button
- **AuthScreen**: login/register screens (not touched)
- **Individual game screens** (DragMatch, MemoryPairs, ColorLearn): not polished in this session
- **Dark mode**: not implemented (tokens are light-only)
- **ARScreen**: dark header, not polished (separate AR task)

---

## 11. External Dependencies / Blockers

- No new npm packages added
- All components use existing deps: `react-native-reanimated`, `expo-linear-gradient`
- No backend changes required for UI shell
- Lexi chat is a UI shell — real AI backend integration is a separate task

---

## 12. Next Best UI Task

1. **Polish CourseDetailScreen** — claymorphic lesson cards, better progress visualization, Lexi entry
2. **Polish LessonPlayerScreen** — flashcard animation polish, pronunciation button styling
3. **Polish ProfileScreen** — better stats visualization (charts, level progress ring)
4. **Add real Lexi backend** — connect quick actions to actual navigation/suggestion engine
5. **Dark mode tokens** — extend design tokens for dark theme
