# Learn Vocabulary & Notebook — Feature Spec

> **Status**: draft
> **Date**: 2026-08-20
> **Branch**: 10-days-quick-run
> **Targets**: Web (`frontend/`) + React Native (`mobile/rn/`)
> **Owner**: Backend + Frontend (Web + Mobile)
> **UI Style**: Three.js + Claymorphism + Vibrant

## 1. Overview

Four new features for vocabulary learning with "golden moment" spaced repetition:

1. **Sổ tay (Notebook)** — Save words from AI translation or flashcard swipe to personal vocabulary notebook
2. **Tra từ (Dictionary)** — AI-powered contextual translation using existing Qdrant wiki knowledge
3. **TikTok Flashcards** — Vertical swipe flashcard interface for vocabulary review, organized by conversation topics and IELTS bands
4. **Thời điểm vàng (Golden Moment)** — Push notification triggered quiz system based on spaced repetition algorithm

---

## 2. Sổ tay (Notebook)

### 2.1 User Flow
```
[Discover word via AI translation OR flashcard swipe]
         ↓
[Tap "Lưu vào Sổ tay" / "Save to Notebook"]
         ↓
[Word saved with: word, translation, context, topic, difficulty]
         ↓
[Appears in Notebook → reviewable via TikTok swipe]
```

### 2.2 Word Entry Schema
```typescript
interface NotebookEntry {
  id: string;                    // UUID
  userId: string;
  word: string;                  // English word
  translation: {
    vi: string;                  // Vietnamese translation
    en?: string;                 // English synonym (optional)
  };
  context?: string;              // Sentence context where word was discovered
  source: 'ai_translation' | 'flashcard' | 'manual';
  topic: string;                 // animals, food, travel, ielts-band-5, etc.
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: Date;
  lastReviewedAt?: Date;
  reviewCount: number;           // Spaced repetition: times reviewed
  easeFactor: number;            // SM-2 algorithm: default 2.5
  interval: number;              // Days until next review
  nextReviewAt?: Date;
}
```

### 2.3 Notebook UI
- **Screen**: Vertical list OR grid view toggle
- **Filter tabs**: All | By Topic | By Difficulty | Needs Review
- **Search**: Full-text search on word + translation
- **Actions**: Edit | Delete | Move to Flashcard Practice

---

## 3. Tra từ (AI Dictionary)

### 3.1 Translation Flow
```
[User enters English sentence or phrase]
         ↓
[AI Translation with context]
[Uses Qdrant wiki context for accurate, child-safe translations]
         ↓
[Display: Original | Translation | Context explanation]
[Word breakdown: pronunciation, parts of speech]
         ↓
[Action buttons: Save to Notebook | Practice | AR Learn]
```

### 3.2 API Contract
```typescript
// POST /api/v1/dictionary/translate
interface TranslateRequest {
  text: string;           // English text to translate
  context?: string;       // Optional context (sentence, paragraph)
  targetLang: 'vi';       // Target language (Vietnamese)
}

interface TranslateResponse {
  original: string;
  translation: {
    vi: string;
    literalTranslation?: string;
    contextualNote?: string;   // AI explanation
  };
  wordBreakdown?: Array<{
    word: string;
    pronunciation: string;
    partOfSpeech: string;
    translation: string;
  }>;
  relatedWords?: Array<{
    word: string;
    translation: string;
  }>;
}
```

---

## 4. TikTok Flashcards

### 4.1 Vertical Swipe Interface
```
[Card displays: Word | Image | Translation]
         ↓
[Swipe UP → Next card]
[Swipe LEFT → Don't know (review again)]
[Swipe RIGHT → Know it (increase interval)]
[Tap → Flip card (show answer)]
```

### 4.2 Topic Organization
```typescript
interface VocabularyTopic {
  slug: string;           // 'animals', 'ielts-6'
  name: string;           // 'Animals', 'IELTS Band 6.0-6.5'
  nameVi: string;         // 'Động vật', 'IELTS Band 6.0-6.5'
  icon: string;           // emoji
  color: string;          // hex color
  isIELTS: boolean;
  ieltsBand?: string;
}
```

### 4.3 Default Topics
- Animals, Food & Drinks, Family, School, Nature, Travel, Daily Conversation
- IELTS 5.0-5.5, IELTS 6.0-6.5, IELTS 7.0+

---

## 5. Thời điểm vàng (Golden Moment)

### 5.1 Spaced Repetition System
Based on SM-2 algorithm:
- New cards: review after 1 day
- First review: review after 6 days
- Subsequent: interval × ease_factor

### 5.2 Notification Schedule
```typescript
interface ReviewSchedule {
  enabled: boolean;
  timezone: string;           // 'Asia/Ho_Chi_Minh'
  windows: Array<{
    hour: number;              // 0-23
    days: number[];            // [0,1,2,3,4,5,6] = every day
  }>;
}
```

### 5.3 Notification Types
- Hourly reminders (configurable)
- Daily review at preferred times
- Weekly progress summary
- Monthly streak celebration

---

## 6. Technical Architecture

### 6.1 Backend API
```
POST   /api/v1/notebook                    # Create entry
GET    /api/v1/notebook                    # List entries
GET    /api/v1/notebook/:id                # Get entry
PUT    /api/v1/notebook/:id                # Update entry
DELETE /api/v1/notebook/:id                # Delete entry
GET    /api/v1/notebook/due                # Get cards due for review

POST   /api/v1/notebook/review             # Submit review (SM-2)

POST   /api/v1/dictionary/translate        # AI translation
GET    /api/v1/vocabulary/topics            # List topics

GET    /api/v1/notebook/schedule            # Get user's schedule
PUT    /api/v1/notebook/schedule            # Update schedule
```

### 6.2 Database Schema
```sql
-- notebook_entries, review_schedules, review_history, vocabulary_topics
-- See: backend/database/postgres/migrations/20260820_01_notebook_tables.sql
```

### 6.3 Frontend Components
```
Web:
  src/pages/NotebookPage.tsx
  src/pages/DictionaryPage.tsx
  src/pages/FlashcardsPage.tsx (TikTok swipe)

Mobile (RN):
  src/screens/NotebookScreen.tsx
  src/screens/DictionaryScreen.tsx
  src/screens/SwipeFlashcardsScreen.tsx
```

---

## 7. UI/UX Design

### 7.1 Design System
- **Style**: Claymorphism + Vibrant palette
- **Colors**: sunshineYellow, skyBlue, mintGreen, coralPink, lavender
- **3D**: Three.js for animated mascot (Lexi)
- **Animation**: react-spring, Framer Motion

### 7.2 PWA Support
- Web manifest for "Add to Home Screen"
- Service Worker for offline + push notifications
- iOS: Safari share → Add to Home Screen
- Android: Chrome menu → Install app

---

## 8. Dependencies

### Backend
- QdrantRAGService (existing)
- SM-2 algorithm (in migration)

### Frontend Web
- react-spring
- @react-three/fiber
- react-swipeable (or framer-motion)

### Frontend Mobile (RN)
- react-native-gesture-handler
- react-native-reanimated
- @react-three/fiber

### Notifications
- Web: Service Worker + Web Push API
- Mobile: Expo Notifications
