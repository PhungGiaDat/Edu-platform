# Learn Vocabulary & Notebook — Implementation Plan

> **Branch:** 10-days-quick-run
> **Targets:** Web (`frontend/`) + React Native (`mobile/rn/`)

**Goal:** Implement 4 features: Sổ tay (Notebook), Tra từ (AI Dictionary), TikTok Flashcards, Thời điểm vàng (Spaced Repetition Notifications)

**Architecture:** 
- **Web:** React + Claymorphism + Three.js (Vite build)
- **Mobile:** React Native + Claymorphism + Three.js
- **Backend:** FastAPI with existing Qdrant RAG integration
- **Database:** PostgreSQL (Supabase)
- **Notifications:** Expo Notifications (RN) + Service Workers (Web)

**Spec:** `docs/mobile_migration/spec/learn-vocab-notebook-spec.md`

**UI Style:** Claymorphism + Vibrant palette + Three.js 3D elements

---

## Global Constraints

### Web (`frontend/`)
- Use existing Claymorphism design tokens from `frontend/src/design-tokens/claymorphic.ts`
- Tailwind CSS for utility classes
- @react-three/fiber for 3D components
- react-spring for animations
- Service Workers for push notifications

### Mobile (`mobile/rn/`)
- Use existing Claymorphism design tokens from `mobile/rn/src/design/tokens.ts`
- react-native-gesture-handler + react-native-reanimated for swipe
- @react-three/fiber for 3D models
- Expo Notifications for push notifications

### Shared
- Use existing QdrantRAGService from `backend/services/qdrant_rag_service.py`
- All API responses use camelCase
- SM-2 spaced repetition algorithm for review scheduling
- Shared backend API endpoints for both platforms

---

## Task Decomposition

### Phase 1: Backend — Notebook & Dictionary API

#### Task 1: Database Schema Migration ✅ DONE

**Files:**
- `backend/database/postgres/migrations/20260820_01_notebook_tables.sql`

**Status:** Complete - Creates notebook_entries, review_schedules, review_history, vocabulary_topics tables with SM-2 function

---

#### Task 2: Notebook CRUD API

**Files:**
- Create: `backend/models/notebook_entry.py`
- Create: `backend/repositories/notebook_repository.py`
- Create: `backend/services/notebook_service.py`
- Create: `backend/api/notebook.py`

**Interfaces:**
- `POST /api/v1/notebook` - Create entry
- `GET /api/v1/notebook` - List entries (filter by topic, difficulty)
- `GET /api/v1/notebook/:id` - Get entry
- `PUT /api/v1/notebook/:id` - Update entry
- `DELETE /api/v1/notebook/:id` - Delete entry
- `GET /api/v1/notebook/due` - Get cards due for review
- `POST /api/v1/notebook/review` - Submit SM-2 review

---

#### Task 3: Dictionary Translation API

**Files:**
- Create: `backend/models/dictionary.py`
- Create: `backend/services/dictionary_service.py`
- Create: `backend/api/dictionary.py`

**Interfaces:**
- `POST /api/v1/dictionary/translate` - AI contextual translation

---

#### Task 4: Vocabulary Topics API

**Files:**
- Create: `backend/models/vocabulary_topic.py`
- Create: `backend/repositories/vocabulary_topic_repository.py`
- Create: `backend/api/vocabulary_topics.py`

**Interfaces:**
- `GET /api/v1/vocabulary/topics` - List all topics
- `GET /api/v1/vocabulary/topics/:slug` - Get topic by slug

---

### Phase 2: Frontend — Web Screens

#### Task 5: NotebookScreen (Web)

**Files:**
- Create: `frontend/src/pages/NotebookPage.tsx`
- Create: `frontend/src/components/NotebookEntryCard.tsx`
- Create: `frontend/src/services/notebookApi.ts`

**Features:**
- Grid/List view toggle
- Filter by topic, difficulty
- Search functionality
- Add/Edit/Delete entries

---

#### Task 6: DictionaryScreen (Web)

**Files:**
- Create: `frontend/src/pages/DictionaryPage.tsx`
- Create: `frontend/src/components/TranslationResult.tsx`
- Create: `frontend/src/services/dictionaryApi.ts`

**Features:**
- Text input for translation
- Word breakdown display
- Save to Notebook button
- Related words from Qdrant

---

#### Task 7: SwipeFlashcardsScreen (Web)

**Files:**
- Create: `frontend/src/pages/FlashcardsPage.tsx`
- Create: `frontend/src/components/SwipeableFlashcard.tsx`
- Create: `frontend/src/components/TopicSelector.tsx`

**Features:**
- Vertical swipe gesture (TikTok style)
- Tap to flip card
- Swipe left (don't know) / right (know)
- Topic filter chips

---

#### Task 8: Push Notification System (Web)

**Files:**
- Update: `frontend/src/main.tsx` (register SW)
- Create: `frontend/src/services/notificationService.ts`
- Create: `frontend/src/pages/NotificationSettings.tsx`

**Features:**
- Service Worker registration
- Notification permission request
- Schedule management UI
- Snooze/dismiss actions

---

## PWA Setup (Already Done)

| File | Description |
|------|-------------|
| `frontend/manifest.json` | PWA manifest với icons, shortcuts |
| `frontend/src/hooks/usePWAInstall.ts` | Hook xử lý install prompt |
| `frontend/src/components/PWAInstallButton.tsx` | UI button cho iOS/Android |
| `frontend/public/static/js/sw-notifications.js` | Service Worker cho notifications |

---

## Execution Order

1. Task 1: Database Migration ✅
2. Task 2: Notebook CRUD API
3. Task 3: Dictionary Translation API
4. Task 4: Vocabulary Topics API
5. Task 5: NotebookScreen (Web)
6. Task 6: DictionaryScreen (Web)
7. Task 7: SwipeFlashcardsScreen (Web)
8. Task 8: Push Notification System (Web)
9. Tasks 5-8: Mobile (RN) equivalents
