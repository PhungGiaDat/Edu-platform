# Learn Vocabulary & Notebook — Feature Spec

> **Status**: draft
> **Date**: 2026-08-20
> **Branch**: web_enhanced (from main)
> **Targets**: Web (`frontend/`) + React Native (`mobile/rn/`)
> **Owner**: Backend + Frontend (Web + Mobile)
> **UI Style**: Three.js + Claymorphism + Vibrant

## 1. Overview

Three new web features for vocabulary learning with "golden moment" spaced repetition:

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
  easeFactor: number;             // SM-2 algorithm: default 2.5
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
  relatedWords?: Array<{    // From Qdrant wiki context
    word: string;
    topic: string;
    relevance: number;
  }>;
  contextSources?: Array<{  // Wiki articles used
    docId: string;
    snippet: string;
  }>;
}
```

### 3.3 Wiki Context Integration
- Use existing **QdrantRAGService** (`qdrant_rag_service.py`)
- Query with translation text → get relevant animal/learning context
- Filter by `safety_label: "clean"` (already implemented)
- Limit to 3 context snippets per translation

---

## 4. TikTok Flashcards

### 4.1 Swipe Interaction
```
[Card shows]
┌─────────────────────────┐
│  🐱 CAT                 │
│  /kæt/                  │
│                         │
│     [3D Clay Model]     │
│                         │
│  con mèo                │
│                         │
│  "The cat sleeps."      │
└─────────────────────────┘
        ↓ SWIPE UP
[Next card: dog]
        ↓ SWIPE UP  
[Next card: bird]
```

### 4.2 Swipe Actions
| Direction | Action | Effect |
|-----------|--------|--------|
| **Swipe Up** | Know it | Mark as "LEARNED", decrease review frequency |
| **Swipe Down** | Don't know | Mark as "REVIEWING", increase review frequency |
| **Swipe Left** | Skip | No state change, move to next |
| **Swipe Right** | Add to Notebook | Save to personal notebook |
| **Tap** | Hear pronunciation | Play audio + animate card |

### 4.3 Topic Organization
```typescript
interface VocabularyTopic {
  id: string;
  name: string;              // "Animals" | "Food" | "IELTS Band 5"
  nameVi: string;            // "Động vật" | "Đồ ăn" | "IELTS Band 5"
  icon: string;              // Emoji or icon name
  color: string;             // Brand color for topic
  cardCount: number;
  difficultyRange: string;   // "easy" | "easy-medium" | "all"
}

// Predefined Topics
const TOPICS: VocabularyTopic[] = [
  { id: 'animals', name: 'Animals', nameVi: 'Động vật', icon: '🐾', color: 'mintGreen', cardCount: 50 },
  { id: 'food', name: 'Food', nameVi: 'Đồ ăn', icon: '🍎', color: 'coralPink', cardCount: 40 },
  { id: 'nature', name: 'Nature', nameVi: 'Thiên nhiên', icon: '🌳', color: 'skyBlue', cardCount: 30 },
  { id: 'travel', name: 'Travel', nameVi: 'Du lịch', icon: '✈️', color: 'lavender', cardCount: 35 },
  { id: 'school', name: 'School', nameVi: 'Trường học', icon: '📚', color: 'vibrantOrange', cardCount: 25 },
  { id: 'family', name: 'Family', nameVi: 'Gia đình', icon: '👨‍👩‍👧', color: 'bubblePink', cardCount: 20 },
  { id: 'ielts-5', name: 'IELTS Band 5', nameVi: 'IELTS Band 5', icon: '🎯', color: 'electricPurple', cardCount: 100 },
  { id: 'ielts-6', name: 'IELTS Band 6', nameVi: 'IELTS Band 6', icon: '🎯', color: 'neonTeal', cardCount: 100 },
  { id: 'ielts-7', name: 'IELTS Band 7+', nameVi: 'IELTS Band 7+', icon: '🏆', color: 'sunshineYellow', cardCount: 80 },
];
```

### 4.4 Card Content
```typescript
interface SwipeFlashcard {
  id: string;
  word: string;
  pronunciation: string;       // IPA phonetic
  translation: string;         // Vietnamese
  imageUrl?: string;          // 3D model or illustration
  audioUrl?: string;          // Pronunciation audio
  exampleSentence: string;    // English example with word
  exampleTranslation: string;  // Vietnamese translation
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  wordType: 'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase';
}
```

---

## 5. Thời điểm vàng (Golden Moment) — Spaced Repetition

### 5.1 Algorithm: SM-2 (SuperMemo 2)
```typescript
interface ReviewResult {
  quality: 0 | 1 | 2 | 3 | 4 | 5;  // 0-2 = fail, 3-5 = pass
  
  // Mapping:
  // 0: Complete blackout
  // 1: Incorrect, remembered on seeing answer
  // 2: Incorrect, easy to recall after seeing answer
  // 3: Correct with difficulty
  // 4: Correct after hesitation
  // 5: Perfect response
}

function calculateNextReview(entry: NotebookEntry, quality: number): {
  easeFactor: number;
  interval: number;        // days
  repetitions: number;
  nextReviewAt: Date;
} {
  let { easeFactor, interval, reviewCount } = entry;
  
  if (quality < 3) {
    // Failed: reset
    repetitions = 0;
    interval = 1;
  } else {
    // Passed
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  }
  
  // Update ease factor
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  easeFactor = Math.max(1.3, easeFactor); // Minimum 1.3
  
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + interval);
  
  return { easeFactor, interval, repetitions, nextReviewAt };
}
```

### 5.2 Notification Schedule
```typescript
interface ReviewSchedule {
  userId: string;
  enabled: boolean;
  timezone: string;           // User's timezone
  
  // Notification windows (local time)
  windows: Array<{
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
    time?: string;            // HH:mm format for daily/weekly/monthly
    dayOfWeek?: number;       // 0-6 for weekly (Sunday = 0)
    dayOfMonth?: number;       // 1-31 for monthly
    maxCards: number;          // Max cards per notification
  }>;
  
  // Quiet hours
  quietHoursStart?: string;   // HH:mm
  quietHoursEnd?: string;      // HH:mm
}

// Default schedule
const DEFAULT_SCHEDULE: ReviewSchedule = {
  windows: [
    { frequency: 'hourly', maxCards: 5 },           // Quick review
    { frequency: 'daily', time: '09:00', maxCards: 15 },  // Morning
    { frequency: 'daily', time: '19:00', maxCards: 15 },  // Evening
    { frequency: 'weekly', time: '10:00', dayOfWeek: 0, maxCards: 30 }, // Sunday
  ],
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
};
```

### 5.3 Notification Content
```typescript
interface ReviewNotification {
  title: string;              // "📚 Time to review!"
  body: string;              // "You have 12 words waiting for review"
  data: {
    type: 'vocabulary_review';
    cardCount: number;
    estimatedTime: number;    // minutes
    urgentCards: number;      // Overdue cards
  };
  actions: Array<{
    id: string;
    title: string;            // "Start Review" | "Remind Later"
  }>;
}
```

### 5.4 Notification API
```typescript
// POST /api/v1/notifications/schedule
interface ScheduleNotificationRequest {
  enabled: boolean;
  schedule: ReviewSchedule;
}

// GET /api/v1/notifications/due
interface DueCardsResponse {
  cards: NotebookEntry[];     // Cards due for review
  totalCount: number;
  urgentCount: number;        // Overdue
}

// POST /api/v1/notifications/submit-review
interface SubmitReviewRequest {
  cardId: string;
  quality: 0 | 1 | 2 | 3 | 4 | 5;
}
```

---

## 6. UI Components

### 6.1 Screen Flow
```
┌─────────────────┐
│  HomeScreen     │
│  [Sổ tay]       │──→ NotebookScreen
│  [Tra từ]       │──→ DictionaryScreen
│  [Luyện từ]     │──→ SwipeFlashcardsScreen
└─────────────────┘
```

### 6.2 Component List
| Component | Purpose | UI Style |
|-----------|---------|----------|
| `NotebookCard` | Word entry display | ClayCard with topic color |
| `SwipeCard` | TikTok-style flashcard | ClayCard + 3D model area |
| `SwipeableStack` | Gesture handler | react-native-gesture-handler |
| `TranslationResult` | AI translation display | Vibrant gradient card |
| `WordBreakdown` | Word details | Expandable section |
| `ReviewNotification` | Push notification | System notification |
| `GoldenMomentBadge` | "Time to review" indicator | Vibrant pulsing badge |
| `ProgressRing3D` | Review progress | Three.js animated ring |

### 6.3 Three.js Elements
- **3D Vocabulary Models**: Replace static images with clay-style 3D models
- **Animated Progress Ring**: Spinning ring during quiz
- **Particle Effects**: Confetti on correct answers
- **Swipe Trail**: 3D card shadow trail on swipe

---

## 7. Backend Changes

### 7.1 New Tables (PostgreSQL)
```sql
-- Notebook entries
CREATE TABLE notebook_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  word VARCHAR(255) NOT NULL,
  translation_vi TEXT NOT NULL,
  translation_en TEXT,
  context TEXT,
  source VARCHAR(50) NOT NULL,
  topic VARCHAR(100),
  difficulty VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  last_reviewed_at TIMESTAMP,
  review_count INTEGER DEFAULT 0,
  ease_factor DECIMAL(3,2) DEFAULT 2.5,
  interval_days INTEGER DEFAULT 0,
  next_review_at TIMESTAMP,
  UNIQUE(user_id, word)
);

-- Review schedules
CREATE TABLE review_schedules (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  schedule JSONB NOT NULL,
  timezone VARCHAR(50) DEFAULT 'Asia/Ho_Chi_Minh',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Review history
CREATE TABLE review_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  card_id UUID REFERENCES notebook_entries(id) ON DELETE CASCADE,
  quality INTEGER NOT NULL,
  reviewed_at TIMESTAMP DEFAULT NOW()
);
```

### 7.2 New API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/dictionary/translate` | AI translation with wiki context |
| GET | `/api/v1/notebook` | List user's notebook entries |
| POST | `/api/v1/notebook` | Save word to notebook |
| PUT | `/api/v1/notebook/{id}` | Update notebook entry |
| DELETE | `/api/v1/notebook/{id}` | Delete entry |
| GET | `/api/v1/notebook/topics` | Get available topics |
| GET | `/api/v1/vocabulary/topics` | Get vocabulary topics with counts |
| GET | `/api/v1/vocabulary/topic/{topicId}` | Get flashcards by topic |
| GET | `/api/v1/notifications/due` | Get cards due for review |
| POST | `/api/v1/notifications/submit-review` | Submit review result |
| GET | `/api/v1/notifications/schedule` | Get user's notification schedule |
| PUT | `/api/v1/notifications/schedule` | Update notification schedule |

---

## 8. Implementation Priority

| Phase | Feature | Complexity | Priority |
|-------|---------|------------|----------|
| 1 | Notebook CRUD | Low | P0 |
| 2 | SwipeFlashcards UI | Medium | P0 |
| 3 | Dictionary API + UI | Medium | P1 |
| 4 | Spaced Repetition Logic | Medium | P1 |
| 5 | Push Notifications | High | P2 |
| 6 | Three.js 3D Models | Medium | P2 |

---

## 9. Dependencies

### Frontend (RN)
- `react-native-gesture-handler` — Swipe gestures
- `react-native-reanimated` — Smooth animations
- `@react-native-async-storage/async-storage` — Local card cache
- `expo-notifications` — Push notifications
- `@react-three/fiber` + `@react-three/drei` — Three.js integration

### Backend
- Existing: QdrantRAGService, Supabase, PostgreSQL
- New: SM-2 algorithm in Python service
