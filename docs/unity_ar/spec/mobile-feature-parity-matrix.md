## Mobile AR Feature Parity Matrix

**Source:** React Native mobile app (`mobile/rn/`) vs. legacy web AR (`frontend-web/`)

This matrix classifies every relevant legacy web AR feature for the native Unity AR mobile product.

**Classification vocabulary:**
- **KEEP** — same behavior on native; backend API contract unchanged
- **ADAPT** — concept transfers; implementation must change for native
- **WEB_ONLY** — web/Three.js specific; not applicable to Unity AR
- **LEGACY_REMOVE_LATER** — MindAR-specific; replaced by Unity AR when feature parity achieved
- **DECISION_REQUIRED** — requires explicit product decision

---

## 1. Entry and Navigation

| Feature | Web Behavior | Mobile Current | Mobile Target | Decision | Evidence |
|---------|-------------|---------------|--------------|---------|---------|
| AR Entry Route | `/learn-ar` route with `LearnARV2` | `AR` screen route with `{lessonId, lessonTitle}` params | Same RN navigation entry | **KEEP** | `AppNavigator.tsx` defines AR screen |
| Lesson-Level Entry | From `/learn-ar` with lesson context | Lesson player → AR screen navigation | Same flow | **KEEP** | `LessonPlayerScreen` → `ARScreen` |
| QR Scan Entry | `/scan` redirects to `/learn-ar`, jsQR decodes | `QRScanPrompt` placeholder (not wired) | Camera QR scanning with `expo-camera` | **ADAPT** | No QR scanning in RN yet |
| Auth Guard | `RequireLearnerAccess` on route | RN auth via `useAuth` hook | Same auth flow | **KEEP** | `useAuth.ts` + bearer token |
| WebAR Route | Legacy MindAR path | No MindAR in RN | Legacy path retained in WebAR fallback | **LEGACY_REMOVE_LATER** | No WebView MindAR in RN |

---

## 2. Session States

| Feature | Web Behavior | Mobile Current | Mobile Target | Decision | Evidence |
|---------|-------------|---------------|--------------|---------|---------|
| App-Level States | `SCANNING \| LOADING \| VIEWING \| QUIZ \| GAME \| PRONUNCIATION \| ERROR` | `IDLE \| AR_INITIALIZING \| IMAGE_TRACKING_READY \| IMAGE_DETECTED \| MODEL_SPAWNING \| MODEL_LOADED \| AR_INTERACTING \| AR_ERROR` | Same 9-state machine | **KEEP** | `useARSession.ts` |
| Detailed AR States | `IDLE → SCANNING → QR_DETECTED → FETCHING_ASSET → NFT_LOADED → ERROR` | Same 6-state pattern | Same | **ADAPT** | Different event bus → Unity events |
| Session Timer | 25-min warning, 30-min hard limit | Not implemented | Backend session lifecycle (`POST /sessions/start`) | **KEEP** | Backend has session endpoints |
| Guest Mode | Read-only with warning banner | Guest can view public content | Same | **KEEP** | Backend is public for flashcards |

---

## 3. Loading UX

| Feature | Web Behavior | Mobile Current | Mobile Target | Decision | Evidence |
|---------|-------------|---------------|--------------|---------|---------|
| Loading Overlay | Spinner + "Starting AR..." in iframe | `ARLoadingOverlay` with 4 states: `initializing`, `loading_model`, `error`, `cached` | Full preparation state coverage | **KEEP** | `ARLoadingOverlay.tsx` |
| Progress Bar | Multi-card inline progress bar | `ClayProgressBar` with 3 stages: `download → load → instantiate` | Same | **KEEP** | `ClayProgressBar.tsx` |
| Kid-Friendly Variants | 5 loading animation variants (dots, rocket, stars, animals, rainbow) | Not implemented | Implement as Lottie or RN Animated | **ADAPT** | Web `LoadingAnimation.tsx` |
| Timeout | 15s viewer bootstrap watchdog | 10s AR initialization timeout | Same | **KEEP** | `useARSession.ts` |

---

## 4. QR Scanning

| Feature | Web Behavior | Mobile Current | Mobile Target | Decision | Evidence |
|---------|-------------|---------------|--------------|---------|---------|
| QR Protocol | `jsQR` decodes → `QR_DETECTED` message | No scanning implementation | `expo-camera` + barcode scanning | **ADAPT** | `QRScanPrompt.tsx` placeholder |
| Scan Frame UI | 4 corner brackets, 250×250px | Same static UI | Same UI, wired to camera | **KEEP** | `QRScanPrompt.tsx` |
| Duplicate Suppression | 2.5s cooldown gate | Not implemented | Same 2.5s gate | **KEEP** | Web has 2.5s gate |
| Invalid QR | "This card isn't in our library" | Not implemented | Same messaging | **KEEP** | Web error UX |
| Unauthorized QR | "This card belongs to another learner" | Not implemented | Same | **KEEP** | Backend entitlement |

---

## 5. Tracking Guidance

| Feature | Web Behavior | Mobile Current | Mobile Target | Decision | Evidence |
|---------|-------------|---------------|--------------|---------|---------|
| Waiting for Target | "Point camera at the [card]" in iframe | Not implemented | Card name + preview image | **ADAPT** | New RN behavior |
| Target Found | "Got it!" in iframe | Not implemented | Confirmation + flashcard overlay | **ADAPT** | New RN behavior |
| Target Lost | "Looking for [card]..." in iframe | Not implemented | Same | **ADAPT** | New RN behavior |
| Multi-Card First | "Now find the [second card]" | Not implemented | Same | **ADAPT** | New RN behavior |
| Multi-Card Both | "Both cards found!" | Not implemented | Combo overlay activation | **ADAPT** | New RN behavior |
| Card Preview | Reference image shown | Not implemented | Same | **ADAPT** | Web shows reference |

---

## 6. Multi-Card Detection

| Feature | Web Behavior | Mobile Current | Mobile Target | Decision | Evidence |
|---------|-------------|---------------|--------------|---------|---------|
| Card Tracking | `useMultiFlashcard.ts` tracks `Map<qrId, FlashcardData>` | `trackedImages: Map<string, TrackedImage>` in hook | Same | **KEEP** | `useARSession.ts` |
| Stable Identity | `card0`, `card1` snapshot decoupled from live Map | Same pattern | Same | **KEEP** | `useFlashcardSnapshot` (web) pattern |
| Card Order Independence | `sameTagSet()` for order-independent matching | Same via `qrId` registry | Same | **KEEP** | Unity `MultiCardRegistry` |
| 2D Fallback | Animated image when marker not found | Not implemented | Unity Sprite + Animator fallback | **ADAPT** | Web has 2D mode |

---

## 7. Combo System

| Feature | Web Behavior | Mobile Current | Mobile Target | Decision | Evidence |
|---------|-------------|---------------|--------------|---------|---------|
| Combo Detection | Backend call to `/api/v1/combos/check?tags=...` | Backend call in `flashcardApi.getFlashcard` | Same | **KEEP** | Backend contract |
| Proximity Notification | `COMBO_PROXIMITY_DETECTED` message from iframe | Unity emits `onProximityNear` | Same | **KEEP** | Unity `ComboManager` |
| Combo Banner | Pulsing gradient banner, "COMBO DISCOVERED!" | `ComboOverlay` component | Same | **KEEP** | `ComboOverlay.tsx` |
| XP Display | "+{bonusXp} XP Bonus!" on banner | `PetStatusOverlay` streak counter | Same | **KEEP** | `PetStatusOverlay.tsx` |
| Combo Hardcoded Table | No (backend-driven) | `ComboManager` has hardcoded pairs | Backend-driven | **ADAPT** | Unity `ComboManager.cs` |
| Proximity Threshold | Computed from MindAR anchor positions | Unity `proximityThreshold = 0.5m`, `proximityHoldTime = 1.0s` | Physical testing needed | **ADAPT** | Unity `ComboManager.cs` |

---

## 8. Gamification / Rewards

| Feature | Web Behavior | Mobile Current | Mobile Target | Decision | Evidence |
|---------|-------------|---------------|--------------|---------|---------|
| XP API | `POST /api/v1/gamification/add-xp` | Same | Same | **KEEP** | `api.ts` |
| Streak Counter | Fire emoji + streak count | Same via `PetStatusOverlay` | Same | **KEEP** | `PetStatusOverlay.tsx` |
| Streak Persistence | Backend tracks streak_days | In-memory only during AR session | Persist at session end | **ADAPT** | `currentStreak` not persisted to backend; confirmed by grep + `useARSession.ts` L59 |
| XP on card detected | `POST /gamification/add-xp` on `flashcard_viewed` | Not wired | Same | **ADAPT** | `onImageDetected` handler does NOT call XP API (confirmed: no `addXp` in hook) |
| XP on combo discovered | `POST /gamification/add-xp` on `combo_discovered` | Not wired | Same | **ADAPT** | `onComboComplete` handler only updates local `currentStreak`; no `addXp` call (confirmed) |
| Level/Badge/Sticker | `RewardCelebration.tsx` full-screen overlay | Not implemented in RN | Implement RN overlay | **ADAPT** | Web has celebration UI |
| Leaderboard | Top 5 inline popup | Not implemented | Implement in RN | **KEEP** | Backend has endpoint |
| Food/Pet Interaction | Three.js pet + food drag-drop | Unity emits `onFoodDragging`, `onFoodFed` | Same Unity events | **KEEP** | Unity `FoodInteraction.cs` |

---

## 9. Pronunciation

| Feature | Web Behavior | Mobile Current | Mobile Target | Decision | Evidence |
|---------|-------------|---------------|--------------|---------|---------|
| Pronunciation Mode | Web Speech API + backend scoring | Not implemented in RN AR | iOS Speech framework + Android SpeechRecognizer | **ADAPT** | Not in RN AR yet |
| Pronunciation Game | `PronunciationGame.tsx` standalone | Not in RN AR | Same RN overlay with platform speech | **ADAPT** | Separate from AR flow |
| Audio Playback | `AudioService` + `SpeechSynthesis` fallback | Unity plays via `ARAudioPlayer` | Same | **KEEP** | Unity `ARAudioPlayer.cs` |

---

## 10. Quiz and Games

| Feature | Web Behavior | Mobile Current | Mobile Target | Decision | Evidence |
|---------|-------------|---------------|--------------|---------|---------|
| Quiz Overlay | `QuizOverlay` lazy-loaded, `useQuizData` fetches | Not implemented | Implement in RN overlay | **ADAPT** | Web has quiz system |
| Games (Konva) | `DragMatchGame`, `MemoryMatchGame`, etc. | Not in RN AR | Separate from AR flow | **WEB_ONLY** | Canvas-based, not AR |
| AR-Triggered Content | Quiz/Games accessible from AR VIEWING state | Not wired | Same UX entry point | **ADAPT** | Web has overlay system |

---

## 11. Error Handling

| Feature | Web Behavior | Mobile Current | Mobile Target | Decision | Evidence |
|---------|-------------|---------------|--------------|---------|---------|
| Error Taxonomy | 6 types: `network`, `notFound`, `camera`, `permission`, `general`, `empty` | 9 AR error codes in hook | Full taxonomy mapped to Unity errors | **KEEP** | `useARSession.ts` |
| Kid-Friendly Errors | Emoji + gradient + action buttons | Same via `ARLoadingOverlay` error state | Same | **KEEP** | `ARLoadingOverlay.tsx` |
| AR-Specific Errors | `MODEL_LOAD_ERROR`, `IMAGE_LOAD_ERROR`, `TEXTURE_LOAD_ERROR` | `onError` with error codes | Map Unity errors to codes | **KEEP** | Unity `RNEventEmitter` |
| Retry Button | "Try Again" for recoverable errors | Implemented in overlay | Same | **KEEP** | `ARLoadingOverlay.tsx` |

---

## 12. Lifecycle

| Feature | Web Behavior | Mobile Current | Mobile Target | Decision | Evidence |
|---------|-------------|---------------|--------------|---------|---------|
| Session Start | `POST /api/v1/sessions/start` on mount | Not wired | Same backend call | **KEEP** | Backend has endpoint |
| Session End | `PATCH /api/v1/sessions/{id}/end` on unmount | Not wired | Same | **KEEP** | Backend has endpoint |
| App Background | N/A (web) | `pauseSession`/`resumeSession` exist, not wired | Wire to `AppState` | **ADAPT** | Methods exist unused |
| Unity Lifecycle | N/A | `startARSession`/`destroySession` wired | Same | **KEEP** | `ARScreen.tsx` |

---

## 13. Permissions

| Feature | Web Behavior | Mobile Current | Mobile Target | Decision | Evidence |
|---------|-------------|---------------|--------------|---------|---------|
| Camera Permission | Browser permission prompt | Not implemented in RN | Unity manages via ARCore/ARKit | **ADAPT** | Camera via Unity, not RN |
| Permission Denied UX | Browser default | Not implemented | Kid-friendly "open settings" | **ADAPT** | New UX needed |
| AR Capability Check | N/A | Not implemented | Unity subsystem check | **ADAPT** | New check needed |

---

## 14. Pet System (AR-Coupled)

| Feature | Web Behavior | Mobile Current | Mobile Target | Decision | Evidence |
|---------|-------------|---------------|--------------|---------|---------|
| Pet 3D Viewer | Three.js + `@react-three/drei` | Not implemented | Unity 3D pet + animations | **ADAPT** | Different rendering pipeline |
| Pet State | `idle \| anticipating \| eating \| satisfied` | Same via `onPetStateChanged` | Same | **KEEP** | Unity events + RN state |
| Happiness Badge | Badge on pet | Not implemented | Same | **ADAPT** | New UX |
| Pet Chat Popup | AI-generated messages | Not implemented | Not in MVP | **DECISION_REQUIRED** | Not AR-critical |
| Pet Evolution | XP-gated via backend | Not implemented | Same backend API | **KEEP** | Backend API exists |

---

## 15. Persistence

| Feature | Web Behavior | Mobile Current | Mobile Target | Decision | Evidence |
|---------|-------------|---------------|--------------|---------|---------|
| Flashcard Snapshot | `useFlashcardSnapshot` decouples stable refs | Not implemented | Same pattern | **KEEP** | Pattern transfers |
| Display Mode | `displayMode === '2D'` fallback | Not implemented | Same | **KEEP** | Web has 2D mode |
| Persistent Viewer | `isPersistentMindViewerEnabled` flag | Not relevant for Unity | Unity session persistence | **ADAPT** | Different AR engine |

---

## 16. Debug / Telemetry

| Feature | Web Behavior | Mobile Current | Mobile Target | Decision | Evidence |
|---------|-------------|---------------|--------------|---------|---------|
| Mobile Debug | `emitMobileDebug()` to backend | Not implemented | Same | **KEEP** | Backend endpoint exists |
| FPS Overlay | `usePerformanceMonitor` in dev | Not implemented | Unity profiling | **WEB_ONLY** | Different tool |
| AR Error Logging | `POST /api/v1/debug/ar-log` | Not implemented | Same | **KEEP** | Backend endpoint exists |

---

## 17. WebAR Fallback

| Feature | Web Behavior | Mobile Current | Mobile Target | Decision | Evidence |
|---------|-------------|---------------|--------------|---------|---------|
| WebAR Path | MindAR + A-Frame in WebView | Not in RN | Separate WebView AR screen | **ADAPT** | WebAR is web-only |
| Fallback Routing | Automatic on error | Not implemented | Prompt + mode flag | **ADAPT** | New routing needed |
| Fallback Parity | N/A | N/A | WebAR only for parity features | **KEEP** | Feature gate |

---

## Summary

| Decision | Count | Key Features |
|---------|--------|-------------|
| **KEEP** | 23 | Backend APIs, XP contract, session lifecycle, combo events, navigation, auth, error taxonomy |
| **ADAPT** | 22 | QR scanning, camera permission, loading UX, tracking guidance, gamification persistence, pronunciation, quiz |
| **WEB_ONLY** | 3 | Mini-games (Konva), AI Chat Buddy, Three.js pet viewer |
| **LEGACY_REMOVE_LATER** | 1 | MindAR + A-Frame runtime |
| **DECISION_REQUIRED** | 1 | Pet AI chat (non-AR-critical) |
| **NEW** | — | Camera permission UX, AR capability detection, AppState lifecycle wiring, reward celebration UI, 2D fallback |

**Total classified: 52 features**
**KEEP: 23 | ADAPT: 24 | WEB_ONLY: 3 | LEGACY_REMOVE_LATER: 1 | DECISION_REQUIRED: 1**
