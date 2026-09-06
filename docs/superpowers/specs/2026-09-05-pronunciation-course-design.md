# Pronunciation Course System — Design Spec

**Date:** 2026-09-05
**Status:** Draft — pending approval
**Stack:** Extend existing backend (FastAPI) + frontend (React/Vite) claymorphic

---

## 1. Overview

Xây dựng hệ thống **pronunciation course** cho trẻ em học phát âm từ vựng theo chủ đề. Dùng hybrid approach: Web Speech API (client-side fuzzy) → borderline cases → HuggingFace wav2vec2 fine-tuned (server-side).

**Not a rebuild.** Tận dụng:
- `PronunciationService.ts`, `AIPronunciationService.ts` (frontend)
- `speech_processing_service.py`, `pronunciation_evaluator.py` (backend)
- Claymorphic design system
- Gamification (XP, badges, streaks)

---

## 2. Components

### 2.1 Course Structure

```
PronunciationCourse
├── Topics (e.g., Animals, Food, Family, Nature)
│   ├── Words (5-10 per topic)
│   ├── Difficulty: easy / medium / hard
│   └── IsFavorite (tracked per user)
├── PronunciationEngine (shared component)
│   ├── TTS playback (Coqui XTTS v2)
│   ├── Recording + waveform
│   ├── Browser fuzzy match (Levenshtein)
│   └── Server evaluation (borderline only)
└── ProgressTracker
    ├── Words learned count
    ├── Favorite topic
    └── Stars per word (1-3)
```

### 2.2 Pages

| Route | Purpose |
|---|---|
| `/pronunciation-courses` | Course list (topics grid) |
| `/pronunciation-courses/:topicId` | Topic detail (word list + practice) |
| `/pronunciation-courses/progress` | Progress report (words learned, favorite topic) |
| `/pronunciation-courses/standalone/:wordId` | Single word practice (embeddable) |

### 2.3 API Endpoints

```
GET    /api/v1/pronunciation-courses              # List all topics
GET    /api/v1/pronunciation-courses/{id}        # Topic detail + words
GET    /api/v1/pronunciation-courses/{id}/progress  # User progress per topic
POST   /api/v1/pronunciation-courses/{id}/attempt  # Log attempt
GET    /api/v1/pronunciation-courses/progress    # Global progress report
POST   /api/v1/pronunciation-courses/huggingface-evaluate  # wav2vec2 eval
```

---

## 3. Data Models

### 3.1 MongoDB Collections

**`pronunciation_courses`**
```json
{
  "_id": "ObjectId",
  "topic_id": "string",
  "name": "string",
  "name_vi": "string",
  "icon": "string (emoji or icon name)",
  "color": "string (tailwind class)",
  "words": [
    {
      "word_id": "string",
      "word": "string",
      "phonetic": "string",
      "difficulty": "easy | medium | hard",
      "audio_url": "string (optional TTS cache)"
    }
  ],
  "order": 1
}
```

**`pronunciation_attempts`** (extend existing)
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId",
  "topic_id": "string",
  "word_id": "string",
  "score": "number (0-100)",
  "stars": "number (1-3)",
  "transcription": "string",
  "evaluation_method": "browser | huggingface",
  "created_at": "datetime"
}
```

### 3.2 Progress Report Schema

```json
{
  "total_words_learned": 42,
  "words_per_topic": [
    { "topic_id": "animals", "topic_name": "Động vật", "count": 15 }
  ],
  "favorite_topic": { "topic_id": "food", "topic_name": "Thức ăn", "count": 20 },
  "total_stars": 87,
  "current_streak": 5
}
```

---

## 4. AI Evaluation Flow

### 4.1 Hybrid Pipeline

```
User speaks → Web Speech API transcription
    ↓
Browser: Levenshtein similarity score
    ↓
Score >= 70 → ✅ instant feedback (no server call)
Score 50-69 → borderline → POST /huggingface-evaluate
Score < 50 → ❌ retry prompt
```

### 4.2 HuggingFace wav2vec2

- Model: fine-tuned `facebook/wav2vec2-base` on Vietnamese children's pronunciation
- Endpoint: HuggingFace Inference API or self-hosted
- Input: audio blob (webm/wav)
- Output: score + phoneme analysis + encouraging feedback
- Data for fine-tuning: in-app recordings + guided sessions (see Section 5)

### 4.3 Feedback Tiers

| Stars | Score | Message |
|---|---|---|
| ⭐⭐⭐ | 85-100 | "Tuyệt vời! Phát âm hoàn hảo!" |
| ⭐⭐ | 70-84 | "Tốt lắm! Cố gắng thêm một chút nhé!" |
| ⭐ | 50-69 | "Đang tiến bộ! Nghe lại và thử lại nào!" |
| ❌ | < 50 | "Thử lại nhé! Nhấn loa để nghe mẫu." |

---

## 5. Data Collection Pipeline

### 5.1 In-App (Scale)

- Prompt parent consent on first pronunciation attempt
- Store audio + transcription + word metadata in `pronunciation_recordings` collection
- Label: user_id, word_id, topic_id, transcription, audio_url, is_consent_granted, quality_rating

### 5.2 Guided Sessions (Gold Standard)

- Structured prompts: "Say the word: [word]" in Vietnamese
- Parent-assisted recording via dedicated `/record` page
- Manual quality annotation by teachers/parents
- High-quality subset used for wav2vec2 fine-tuning

### 5.3 Synthetic Augmentation

- TTS-generated variations (different speeds, pitches)
- Add noise, room acoustics simulation
- Expand training set without more recordings

---

## 6. Frontend Components

### 6.1 New Components

```
src/features/pronunciation-course/
├── components/
│   ├── CourseList.tsx          # Topic grid (claymorphic cards)
│   ├── CourseDetail.tsx        # Word list + practice CTA
│   ├── PronunciationEngine.tsx  # Shared: TTS + record + evaluate
│   ├── WordCard.tsx            # Single word with stars + status
│   ├── ProgressReport.tsx      # Stats: words learned, favorite topic
│   ├── RecordingButton.tsx     # Claymorphic mic button + waveform
│   └── FeedbackDisplay.tsx      # Stars + encouraging message
├── hooks/
│   ├── usePronunciationCourse.ts
│   └── usePronunciationEngine.ts
└── pages/
    ├── PronunciationCoursesPage.tsx
    ├── PronunciationCourseDetailPage.tsx
    └── PronunciationProgressPage.tsx
```

### 6.2 Integration Points

- `PronunciationEngine` shared với existing `PronunciationGame.tsx`
- Course page reuse `PronunciationPractice.tsx` pattern
- Progress data from existing gamification service + new `pronunciation_attempts`

---

## 7. Design (Claymorphic Vibrant)

### 7.1 Colors per Topic

| Topic | Primary | Accent |
|---|---|---|
| Animals | Sky Blue `#6EB9FF` | Mint Green `#B4E197` |
| Food | Coral Pink `#FF9F9F` | Sunshine Yellow `#FFD93D` |
| Family | Lavender `#A78BFA` | Bubble Pink `#F472B6` |
| Nature | Mint Green `#B4E197` | Sky Blue `#6EB9FF` |

### 7.2 Key UI Elements

- **Course cards:** claymorphic with topic color, icon, word count, completion %
- **Word cards:** claymorphic with word, phonetic, star rating, difficulty badge
- **Recording button:** large claymorphic mic with pulse animation while recording
- **Waveform:** canvas-based, topic accent color
- **Progress report:** claymorphic dashboard with topic bars + favorite star

---

## 8. Gamification

- `pronunciation_attempt`: 15 XP per attempt, 35 XP if perfect (3 stars)
- Badges: `pronunciation_starter` (5 words), `pronunciation_pro` (20 words), `topic_master` (all words in topic)
- Streak: tracked via existing `DailyProgressSchema`

---

## 9. Files to Modify/Create

### Backend (extend existing)
- `backend/api/pronunciation_course.py` (new router)
- `backend/models/pronunciation_course_model.py` (new models)
- `backend/services/huggingface_evaluation_service.py` (new)
- `backend/services/data_collection_service.py` (new)
- `backend/database/seed/pronunciation_courses_seed.py` (seed data)

### Frontend (new feature module)
- `frontend/src/features/pronunciation-course/` (full module)
- `frontend/src/features/pronunciation-course/pages/PronunciationCoursesPage.tsx` → add to `App.tsx` routing

### No changes to
- Existing pronunciation services (reuse as-is)
- Gamification service (extend only)
- Design tokens (already claymorphic)

---

## 10. Open Questions (for user decision)

1. **Initial topics:** Bắt đầu với bao nhiêu topics? (recommend: 4-5 matching existing course topics)
2. **HuggingFace model hosting:** Self-hosted (local GPU) hay Inference API?
3. **Words per topic:** 5, 10, hay 15 words?
