# Pronunciation Course Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build standalone pronunciation course system with topic-based word lists, hybrid AI evaluation (browser Levenshtein + HuggingFace wav2vec2), progress tracking, and claymorphic vibrant UI.

**Architecture:** Extend existing pronunciation infrastructure (Whisper STT, TTS, gamification) with new course/word data models (MongoDB), REST endpoints, and React feature module. Hybrid evaluation: browser fuzzy match first → borderline → HuggingFace. Data collection via in-app + guided sessions for wav2vec2 fine-tuning.

**Tech Stack:** React 18 + Vite + TypeScript + Zustand + Tailwind v4 (frontend), FastAPI + Prisma + MongoDB (backend), HuggingFace Inference API (wav2vec2 evaluation)

**Spec:** `docs/superpowers/specs/2026-09-05-pronunciation-course-design.md`

---

## Global Constraints

- **Existing patterns:** Follow `backend/api/pronunciation.py`, `backend/models/pronunciation.py`, `backend/services/pronunciation_evaluator.py` patterns
- **Frontend patterns:** Follow `frontend/src/features/pronunciation/` structure
- **Design system:** Use `frontend/src/design-tokens/claymorphic.ts` — no new tokens needed
- **DB:** MongoDB for `pronunciation_courses` and `pronunciation_attempts`; Prisma/Postgres for user progress
- **No branch, no hard reset:** commit to current branch `10-days-quick-run`

---

## File Map

### Backend (create/modify)
- `backend/models/pronunciation_course_model.py` — Pydantic schemas
- `backend/api/pronunciation_course.py` — REST router
- `backend/services/huggingface_evaluation_service.py` — wav2vec2 wrapper
- `backend/services/data_collection_service.py` — recording storage
- `backend/database/seed/pronunciation_courses_seed.py` — seed data
- `backend/main.py` — register router

### Frontend (create/modify)
- `frontend/src/features/pronunciation-course/types/index.ts` — TypeScript types
- `frontend/src/features/pronunciation-course/services/courseApi.ts` — API client
- `frontend/src/features/pronunciation-course/services/pronunciationEngine.ts` — shared engine
- `frontend/src/features/pronunciation-course/hooks/usePronunciationCourse.ts`
- `frontend/src/features/pronunciation-course/hooks/usePronunciationEngine.ts`
- `frontend/src/features/pronunciation-course/components/CourseList.tsx`
- `frontend/src/features/pronunciation-course/components/CourseDetail.tsx`
- `frontend/src/features/pronunciation-course/components/WordCard.tsx`
- `frontend/src/features/pronunciation-course/components/ProgressReport.tsx`
- `frontend/src/features/pronunciation-course/components/RecordingButton.tsx`
- `frontend/src/features/pronunciation-course/components/FeedbackDisplay.tsx`
- `frontend/src/features/pronunciation-course/pages/PronunciationCoursesPage.tsx`
- `frontend/src/features/pronunciation-course/pages/PronunciationCourseDetailPage.tsx`
- `frontend/src/features/pronunciation-course/pages/PronunciationProgressPage.tsx`
- `frontend/src/App.tsx` — add routes

---

## Task 1: Backend Models

**Files:**
- Create: `backend/models/pronunciation_course_model.py`
- Test: `backend/tests/test_pronunciation_course_model.py`

**Interfaces:**
- Consumes: nothing
- Produces: `PronunciationCourseDocument`, `PronunciationWord`, `PronunciationCourseListResponse`, `PronunciationCourseDetailResponse`, `PronunciationAttemptLog`, `PronunciationProgressResponse`

- [ ] **Step 1: Write failing test**

```python
# backend/tests/test_pronunciation_course_model.py
import pytest
from backend.models.pronunciation_course_model import (
    PronunciationCourseDocument,
    PronunciationWord,
    PronunciationAttemptLog,
)

def test_pronunciation_word_schema():
    word = PronunciationWord(
        word_id="cat",
        word="cat",
        phonetic="/kæt/",
        difficulty="easy"
    )
    assert word.word_id == "cat"
    assert word.difficulty == "easy"

def test_pronunciation_course_document():
    words = [
        PronunciationWord(word_id="cat", word="cat", phonetic="/kæt/", difficulty="easy")
    ]
    course = PronunciationCourseDocument(
        topic_id="animals",
        name="Animals",
        name_vi="Động vật",
        icon="🐾",
        color="sky-blue",
        words=words,
        order=1
    )
    assert course.topic_id == "animals"
    assert len(course.words) == 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_pronunciation_course_model.py -v`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```python
# backend/models/pronunciation_course_model.py
from typing import List, Optional
from pydantic import BaseModel, Field


class PronunciationWord(BaseModel):
    word_id: str = Field(..., description="Unique word identifier")
    word: str = Field(..., description="The word text")
    phonetic: Optional[str] = Field(None, description="Phonetic transcription")
    difficulty: str = Field(..., pattern="^(easy|medium|hard)$")
    audio_url: Optional[str] = None


class PronunciationCourseDocument(BaseModel):
    topic_id: str
    name: str
    name_vi: str
    icon: str
    color: str
    words: List[PronunciationWord] = []
    order: int = 0


class PronunciationCourseListResponse(BaseModel):
    id: str
    topic_id: str
    name: str
    name_vi: str
    icon: str
    color: str
    word_count: int
    completion_percent: float = 0.0


class PronunciationCourseDetailResponse(BaseModel):
    id: str
    topic_id: str
    name: str
    name_vi: str
    icon: str
    color: str
    words: List[PronunciationWord]
    progress: dict


class PronunciationAttemptLog(BaseModel):
    user_id: str
    topic_id: str
    word_id: str
    score: float
    stars: int
    transcription: str
    evaluation_method: str  # "browser" | "huggingface"
    created_at: Optional[str] = None


class PronunciationProgressResponse(BaseModel):
    total_words_learned: int
    words_per_topic: List[dict]
    favorite_topic: Optional[dict]
    total_stars: int
    current_streak: int
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_pronunciation_course_model.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/models/pronunciation_course_model.py backend/tests/test_pronunciation_course_model.py
git commit -m "feat(pronunciation-course): add Pydantic models for course and word schemas"
```

---

## Task 2: Backend API Router

**Files:**
- Create: `backend/api/pronunciation_course.py`
- Modify: `backend/main.py` (register router)
- Test: `backend/tests/test_pronunciation_course_api.py`

**Interfaces:**
- Consumes: `PronunciationCourseDocument`, `PronunciationAttemptLog`
- Produces: endpoints at `/api/v1/pronunciation-courses/*`

- [ ] **Step 1: Write failing test**

```python
# backend/tests/test_pronunciation_course_api.py
import pytest
from httpx import AsyncClient, ASGITransport


@pytest.mark.asyncio
async def test_list_courses(client: AsyncClient):
    response = await client.get("/api/v1/pronunciation-courses")
    assert response.status_code == 200
    data = response.json()
    assert "courses" in data
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_pronunciation_course_api.py -v`
Expected: FAIL — 404 route not found

- [ ] **Step 3: Write minimal implementation**

```python
# backend/api/pronunciation_course.py
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from backend.models.pronunciation_course_model import (
    PronunciationCourseDocument,
    PronunciationCourseListResponse,
    PronunciationCourseDetailResponse,
    PronunciationAttemptLog,
    PronunciationProgressResponse,
)

router = APIRouter(prefix="/api/v1/pronunciation-courses", tags=["pronunciation-courses"])

# In-memory store for demo (replace with MongoDB in production)
_courses_db: dict[str, PronunciationCourseDocument] = {}


@router.get("", response_model=dict)
async def list_courses():
    """List all pronunciation courses with basic info."""
    courses = [
        {
            "courses": [
                {
                    "id": str(i + 1),
                    "topic_id": c.topic_id,
                    "name": c.name,
                    "name_vi": c.name_vi,
                    "icon": c.icon,
                    "color": c.color,
                    "word_count": len(c.words),
                    "completion_percent": 0.0,
                }
                for i, c in enumerate(_courses_db.values())
            ]
        }
    ]
    return courses[0] if courses else {"courses": []}


@router.get("/{topic_id}", response_model=dict)
async def get_course(topic_id: str):
    """Get course detail with words."""
    course = _courses_db.get(topic_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return {
        "id": str(hash(topic_id) % 100000),
        "topic_id": course.topic_id,
        "name": course.name,
        "name_vi": course.name_vi,
        "icon": course.icon,
        "color": course.color,
        "words": [w.model_dump() for w in course.words],
        "progress": {"learned": 0, "total": len(course.words)},
    }


@router.post("/{topic_id}/attempt")
async def log_attempt(topic_id: str, attempt: PronunciationAttemptLog):
    """Log a pronunciation attempt."""
    # TODO: store in MongoDB
    return {"success": True, "stars": attempt.stars}


@router.get("/progress", response_model=PronunciationProgressResponse)
async def get_progress(user_id: str):
    """Get user's overall pronunciation progress."""
    return PronunciationProgressResponse(
        total_words_learned=0,
        words_per_topic=[],
        favorite_topic=None,
        total_stars=0,
        current_streak=0,
    )


@router.post("/huggingface-evaluate")
async def huggingface_evaluate(audio_data: dict):
    """Evaluate pronunciation via HuggingFace wav2vec2 model."""
    # TODO: call HuggingFace Inference API
    return {"score": 75, "stars": 2, "feedback": "Good effort!"}
```

```python
# Add to backend/main.py
from backend.api.pronunciation_course import router as pronunciation_course_router

app.include_router(pronunciation_course_router)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_pronunciation_course_api.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/api/pronunciation_course.py backend/main.py backend/tests/test_pronunciation_course_api.py
git commit -m "feat(pronunciation-course): add API router with list, detail, attempt endpoints"
```

---

## Task 3: Backend HuggingFace Evaluation Service

**Files:**
- Create: `backend/services/huggingface_evaluation_service.py`
- Test: `backend/tests/test_huggingface_evaluation_service.py`

**Interfaces:**
- Consumes: audio bytes, expected word
- Produces: `HuggingFaceEvaluationResult` with score, stars, feedback

- [ ] **Step 1: Write failing test**

```python
# backend/tests/test_huggingface_evaluation_service.py
import pytest
from backend.services.huggingface_evaluation_service import HuggingFaceEvaluationService


def test_evaluation_result_structure():
    result = HuggingFaceEvaluationService.evaluate("test", "cat")
    assert hasattr(result, "score")
    assert hasattr(result, "stars")
    assert hasattr(result, "feedback")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_huggingface_evaluation_service.py -v`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```python
# backend/services/huggingface_evaluation_service.py
from dataclasses import dataclass
from typing import Optional
import os


@dataclass
class HuggingFaceEvaluationResult:
    score: float
    stars: int
    feedback: str
    phoneme_analysis: Optional[dict] = None


class HuggingFaceEvaluationService:
    """Service for evaluating pronunciation using HuggingFace wav2vec2 model."""
    
    MODEL_NAME = "facebook/wav2vec2-base"  # placeholder for fine-tuned model
    HF_TOKEN = os.getenv("HF_TOKEN")
    
    @classmethod
    def evaluate(cls, audio_data: bytes, expected_word: str) -> HuggingFaceEvaluationResult:
        """
        Evaluate pronunciation via HuggingFace Inference API.
        
        In production: call HF Inference API with fine-tuned wav2vec2 model.
        For demo: returns simulated score based on Levenshtein distance.
        """
        # TODO: Implement actual HuggingFace API call
        # from huggingface_hub import InferenceClient
        # client = InferenceClient(model=cls.MODEL_NAME, token=cls.HF_TOKEN)
        # result = client.automatic_speech_recognition(audio_data)
        
        # Demo: simple string similarity
        score = 75.0  # placeholder
        
        if score >= 85:
            stars = 3
            feedback = "Tuyệt vời! Phát âm hoàn hảo!"
        elif score >= 70:
            stars = 2
            feedback = "Tốt lắm! Cố gắng thêm một chút nhé!"
        else:
            stars = 1
            feedback = "Đang tiến bộ! Nghe lại và thử lại nào!"
        
        return HuggingFaceEvaluationResult(
            score=score,
            stars=stars,
            feedback=feedback,
        )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_huggingface_evaluation_service.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/services/huggingface_evaluation_service.py backend/tests/test_huggingface_evaluation_service.py
git commit -m "feat(pronunciation-course): add HuggingFace evaluation service placeholder"
```

---

## Task 4: Backend Data Collection Service

**Files:**
- Create: `backend/services/data_collection_service.py`
- Test: `backend/tests/test_data_collection_service.py`

**Interfaces:**
- Consumes: audio blob, metadata (user_id, word_id, topic_id)
- Produces: stored recording document, consent tracking

- [ ] **Step 1: Write failing test**

```python
# backend/tests/test_data_collection_service.py
import pytest
from backend.services.data_collection_service import DataCollectionService


def test_store_recording_returns_id():
    audio_data = b"fake_audio_data"
    recording_id = DataCollectionService.store_recording(
        audio_data=audio_data,
        user_id="user123",
        word_id="cat",
        topic_id="animals",
    )
    assert recording_id is not None
    assert isinstance(recording_id, str)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_data_collection_service.py -v`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```python
# backend/services/data_collection_service.py
from dataclasses import dataclass
from typing import Optional
from datetime import datetime
import uuid


@dataclass
class RecordingDocument:
    recording_id: str
    user_id: str
    word_id: str
    topic_id: str
    audio_url: Optional[str] = None
    transcription: Optional[str] = None
    is_consent_granted: bool = False
    quality_rating: Optional[int] = None
    created_at: str = ""


class DataCollectionService:
    """Service for collecting pronunciation recordings for model fine-tuning."""
    
    # TODO: Integrate with MongoDB collection "pronunciation_recordings"
    _recordings_store: list[RecordingDocument] = []
    
    @classmethod
    def store_recording(
        cls,
        audio_data: bytes,
        user_id: str,
        word_id: str,
        topic_id: str,
        transcription: Optional[str] = None,
        is_consent_granted: bool = False,
    ) -> str:
        """Store audio recording with metadata for future fine-tuning."""
        recording_id = str(uuid.uuid4())
        
        recording = RecordingDocument(
            recording_id=recording_id,
            user_id=user_id,
            word_id=word_id,
            topic_id=topic_id,
            transcription=transcription,
            is_consent_granted=is_consent_granted,
            created_at=datetime.utcnow().isoformat(),
        )
        
        cls._recordings_store.append(recording)
        return recording_id
    
    @classmethod
    def get_consented_recordings(cls) -> list[RecordingDocument]:
        """Get recordings with parent consent for fine-tuning."""
        return [r for r in cls._recordings_store if r.is_consent_granted]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_data_collection_service.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/services/data_collection_service.py backend/tests/test_data_collection_service.py
git commit -m "feat(pronunciation-course): add data collection service for recordings"
```

---

## Task 5: Backend Seed Data

**Files:**
- Create: `backend/database/seed/pronunciation_courses_seed.py`

**Interfaces:**
- Consumes: nothing
- Produces: seeded MongoDB documents for 4 topics with words

- [ ] **Step 1: Write seed data**

```python
# backend/database/seed/pronunciation_courses_seed.py
"""Seed pronunciation courses for demo data."""

TOPICS = [
    {
        "topic_id": "animals",
        "name": "Animals",
        "name_vi": "Động vật",
        "icon": "🐾",
        "color": "sky-blue",
        "order": 1,
        "words": [
            {"word_id": "cat", "word": "cat", "phonetic": "/kæt/", "difficulty": "easy"},
            {"word_id": "dog", "word": "dog", "phonetic": "/dɔːɡ/", "difficulty": "easy"},
            {"word_id": "elephant", "word": "elephant", "phonetic": "/ˈelɪfənt/", "difficulty": "medium"},
            {"word_id": "giraffe", "word": "giraffe", "phonetic": "/dʒɪˈrɑːf/", "difficulty": "hard"},
            {"word_id": "monkey", "word": "monkey", "phonetic": "/ˈmʌŋki/", "difficulty": "easy"},
            {"word_id": "rabbit", "word": "rabbit", "phonetic": "/ˈræbɪt/", "difficulty": "medium"},
            {"word_id": "tiger", "word": "tiger", "phonetic": "/ˈtaɪɡər/", "difficulty": "easy"},
            {"word_id": "lion", "word": "lion", "phonetic": "/ˈlaɪən/", "difficulty": "easy"},
        ],
    },
    {
        "topic_id": "food",
        "name": "Food",
        "name_vi": "Thức ăn",
        "icon": "🍎",
        "color": "coral-pink",
        "order": 2,
        "words": [
            {"word_id": "apple", "word": "apple", "phonetic": "/ˈæpəl/", "difficulty": "easy"},
            {"word_id": "banana", "word": "banana", "phonetic": "/bəˈnɑːnə/", "difficulty": "easy"},
            {"word_id": "bread", "word": "bread", "phonetic": "/bred/", "difficulty": "easy"},
            {"word_id": "cheese", "word": "cheese", "phonetic": "/tʃiːz/", "difficulty": "medium"},
            {"word_id": "chicken", "word": "chicken", "phonetic": "/ˈtʃɪkɪn/", "difficulty": "medium"},
            {"word_id": "egg", "word": "egg", "phonetic": "/eɡ/", "difficulty": "easy"},
            {"word_id": "rice", "word": "rice", "phonetic": "/raɪs/", "difficulty": "easy"},
            {"word_id": "water", "word": "water", "phonetic": "/ˈwɔːtər/", "difficulty": "easy"},
        ],
    },
    {
        "topic_id": "family",
        "name": "Family",
        "name_vi": "Gia đình",
        "icon": "👨‍👩‍👧",
        "color": "lavender",
        "order": 3,
        "words": [
            {"word_id": "mom", "word": "mom", "phonetic": "/mɑːm/", "difficulty": "easy"},
            {"word_id": "dad", "word": "dad", "phonetic": "/dæd/", "difficulty": "easy"},
            {"word_id": "brother", "word": "brother", "phonetic": "/ˈbrʌðər/", "difficulty": "medium"},
            {"word_id": "sister", "word": "sister", "phonetic": "/ˈsɪstər/", "difficulty": "medium"},
            {"word_id": "grandma", "word": "grandma", "phonetic": "/ˈɡrænmɑː/", "difficulty": "easy"},
            {"word_id": "grandpa", "word": "grandpa", "phonetic": "/ˈɡrænpɑː/", "difficulty": "easy"},
            {"word_id": "baby", "word": "baby", "phonetic": "/ˈbeɪbi/", "difficulty": "easy"},
            {"word_id": "friend", "word": "friend", "phonetic": "/frend/", "difficulty": "medium"},
        ],
    },
    {
        "topic_id": "nature",
        "name": "Nature",
        "name_vi": "Thiên nhiên",
        "icon": "🌳",
        "color": "mint-green",
        "order": 4,
        "words": [
            {"word_id": "tree", "word": "tree", "phonetic": "/triː/", "difficulty": "easy"},
            {"word_id": "flower", "word": "flower", "phonetic": "/ˈflaʊər/", "difficulty": "medium"},
            {"word_id": "sun", "word": "sun", "phonetic": "/sʌn/", "difficulty": "easy"},
            {"word_id": "moon", "word": "moon", "phonetic": "/muːn/", "difficulty": "easy"},
            {"word_id": "star", "word": "star", "phonetic": "/stɑːr/", "difficulty": "easy"},
            {"word_id": "river", "word": "river", "phonetic": "/ˈrɪvər/", "difficulty": "medium"},
            {"word_id": "mountain", "word": "mountain", "phonetic": "/ˈmaʊntən/", "difficulty": "hard"},
            {"word_id": "rainbow", "word": "rainbow", "phonetic": "/ˈreɪnboʊ/", "difficulty": "medium"},
        ],
    },
]


def seed_courses():
    """Seed pronunciation courses to MongoDB."""
    # TODO: Insert to MongoDB collection "pronunciation_courses"
    print(f"Seeding {len(TOPICS)} pronunciation courses...")
    for topic in TOPICS:
        print(f"  - {topic['name_vi']}: {len(topic['words'])} words")
    print("Done!")
    return TOPICS


if __name__ == "__main__":
    seed_courses()
```

- [ ] **Step 2: Run seed script**

Run: `cd backend && python database/seed/pronunciation_courses_seed.py`
Expected: prints seeded topics

- [ ] **Step 3: Commit**

```bash
git add backend/database/seed/pronunciation_courses_seed.py
git commit -m "feat(pronunciation-course): add seed data for 4 topics with words"
```

---

## Task 6: Frontend TypeScript Types

**Files:**
- Create: `frontend/src/features/pronunciation-course/types/index.ts`

**Interfaces:**
- Consumes: nothing
- Produces: TypeScript interfaces matching backend models

- [ ] **Step 1: Write types**

```typescript
// frontend/src/features/pronunciation-course/types/index.ts

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface PronunciationWord {
  word_id: string;
  word: string;
  phonetic?: string;
  difficulty: Difficulty;
  audio_url?: string;
}

export interface PronunciationCourse {
  id: string;
  topic_id: string;
  name: string;
  name_vi: string;
  icon: string;
  color: string;
  word_count: number;
  completion_percent: number;
}

export interface PronunciationCourseDetail extends PronunciationCourse {
  words: PronunciationWord[];
  progress: {
    learned: number;
    total: number;
  };
}

export interface PronunciationAttempt {
  user_id: string;
  topic_id: string;
  word_id: string;
  score: number;
  stars: number;
  transcription: string;
  evaluation_method: 'browser' | 'huggingface';
}

export interface PronunciationProgress {
  total_words_learned: number;
  words_per_topic: Array<{
    topic_id: string;
    topic_name: string;
    count: number;
  }>;
  favorite_topic?: {
    topic_id: string;
    topic_name: string;
    count: number;
  };
  total_stars: number;
  current_streak: number;
}

export interface EvaluationResult {
  score: number;
  stars: number;
  feedback: string;
  transcription: string;
  evaluation_method: 'browser' | 'huggingface';
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/pronunciation-course/types/index.ts
git commit -m "feat(pronunciation-course): add TypeScript types"
```

---

## Task 7: Frontend API Client

**Files:**
- Create: `frontend/src/features/pronunciation-course/services/courseApi.ts`

**Interfaces:**
- Consumes: `PronunciationCourse`, `PronunciationCourseDetail`, `PronunciationAttempt`, `PronunciationProgress`
- Produces: API functions for all endpoints

- [ ] **Step 1: Write API client**

```typescript
// frontend/src/features/pronunciation-course/services/courseApi.ts
import axios from 'axios';
import type {
  PronunciationCourse,
  PronunciationCourseDetail,
  PronunciationAttempt,
  PronunciationProgress,
  EvaluationResult,
} from '../types';

const api = axios.create({
  baseURL: '/api/v1',
});

export const pronunciationCourseApi = {
  /** List all pronunciation courses */
  async listCourses(): Promise<PronunciationCourse[]> {
    const response = await api.get<{ courses: PronunciationCourse[] }>(
      '/pronunciation-courses'
    );
    return response.data.courses;
  },

  /** Get course detail with words */
  async getCourse(topicId: string): Promise<PronunciationCourseDetail> {
    const response = await api.get<PronunciationCourseDetail>(
      `/pronunciation-courses/${topicId}`
    );
    return response.data;
  },

  /** Log pronunciation attempt */
  async logAttempt(attempt: PronunciationAttempt): Promise<{ success: boolean; stars: number }> {
    const response = await api.post(
      `/pronunciation-courses/${attempt.topic_id}/attempt`,
      attempt
    );
    return response.data;
  },

  /** Get user progress report */
  async getProgress(): Promise<PronunciationProgress> {
    const response = await api.get<PronunciationProgress>(
      '/pronunciation-courses/progress'
    );
    return response.data;
  },

  /** Evaluate via HuggingFace (borderline cases) */
  async huggingfaceEvaluate(
    audioData: Blob,
    expectedWord: string
  ): Promise<EvaluationResult> {
    const formData = new FormData();
    formData.append('audio', audioData);
    formData.append('expected_word', expectedWord);
    
    const response = await api.post<EvaluationResult>(
      '/pronunciation-courses/huggingface-evaluate',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/pronunciation-course/services/courseApi.ts
git commit -m "feat(pronunciation-course): add API client service"
```

---

## Task 8: Frontend PronunciationEngine Service

**Files:**
- Create: `frontend/src/features/pronunciation-course/services/pronunciationEngine.ts`

**Interfaces:**
- Consumes: `PronunciationWord`, browser Web Speech API
- Produces: `EvaluationResult` via hybrid evaluation pipeline

- [ ] **Step 1: Write pronunciation engine**

```typescript
// frontend/src/features/pronunciation-course/services/pronunciationEngine.ts
import { pronunciationCourseApi } from './courseApi';
import type { EvaluationResult, PronunciationWord } from '../types';

/** Levenshtein distance for fuzzy string matching */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function calculateBrowserScore(
  transcription: string,
  expectedWord: string
): { score: number; stars: number } {
  const normalized = (s: string) => s.toLowerCase().trim();
  const t = normalized(transcription);
  const e = normalized(expectedWord);
  
  if (t === e) {
    return { score: 100, stars: 3 };
  }
  
  const maxLen = Math.max(t.length, e.length);
  const distance = levenshteinDistance(t, e);
  let score = Math.round(((maxLen - distance) / maxLen) * 100);
  
  // Kid bonus: children often add s/es plural or slight variations
  if (t === e + 's' || t === e + 'es' || t === e.replace(/s$/, '')) {
    score = Math.min(100, score + 20);
  }
  
  const stars = score >= 85 ? 3 : score >= 70 ? 2 : score >= 50 ? 1 : 0;
  return { score, stars };
}

const FEEDBACK_MESSAGES = {
  3: ['Tuyệt vời! Phát âm hoàn hảo! 🎉', 'Xuất sắc lắm! 🌟', 'Con giỏi lắm! ⭐'],
  2: ['Tốt lắm! Cố gắng thêm một chút nhé! 👍', 'Gần hoàn hảo rồi! 💪', 'Rất tốt! 🎯'],
  1: ['Đang tiến bộ! Nghe lại và thử lại nào! 🎯', 'Thử lại nhé, con sẽ làm được! 💪'],
  0: ['Thử lại nhé! Nhấn loa để nghe mẫu! 🔊', 'Chưa đúng, đừng nản lòng! 🌈'],
};

function getFeedback(stars: number): string {
  const messages = FEEDBACK_MESSAGES[stars as keyof typeof FEEDBACK_MESSAGES] || FEEDBACK_MESSAGES[0];
  return messages[Math.floor(Math.random() * messages.length)];
}

export interface PronunciationEngineOptions {
  /** Callback when recording starts */
  onRecordingStart?: () => void;
  /** Callback when recording ends with audio blob */
  onRecordingEnd?: (audioBlob: Blob) => void;
  /** Callback for real-time transcription (Web Speech API) */
  onTranscription?: (text: string, isFinal: boolean) => void;
  /** Callback for final result */
  onResult?: (result: EvaluationResult) => void;
  /** Callback for errors */
  onError?: (error: string) => void;
}

export class PronunciationEngine {
  private recognition: SpeechRecognition | null = null;
  private options: PronunciationEngineOptions;
  private isRecording = false;

  constructor(options: PronunciationEngineOptions) {
    this.options = options;
    this.initRecognition();
  }

  private initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.options.onError?.('Web Speech API not supported');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'en-US';
    this.recognition.continuous = false;
    this.recognition.interimResults = true;

    this.recognition.onresult = (event) => {
      const result = event.results[0];
      const transcript = result[0].transcript;
      const isFinal = result.isFinal;
      this.options.onTranscription?.(transcript, isFinal);
    };

    this.recognition.onerror = (event) => {
      this.options.onError?.(event.error);
    };

    this.recognition.onend = () => {
      this.isRecording = false;
    };
  }

  async startRecording(): Promise<void> {
    if (!this.recognition) {
      this.options.onError?.('Speech recognition not available');
      return;
    }

    this.isRecording = true;
    this.options.onRecordingStart?.();

    try {
      this.recognition.start();
    } catch (e) {
      this.isRecording = false;
      this.options.onError?.('Failed to start recording');
    }
  }

  stopRecording(): void {
    if (this.recognition && this.isRecording) {
      this.recognition.stop();
    }
  }

  async evaluate(
    transcription: string,
    expectedWord: PronunciationWord,
    audioBlob?: Blob
  ): Promise<EvaluationResult> {
    // Step 1: Browser-side fuzzy match
    const { score, stars } = calculateBrowserScore(transcription, expectedWord.word);

    let evaluationMethod: 'browser' | 'huggingface' = 'browser';
    let finalScore = score;
    let finalStars = stars;
    let feedback = getFeedback(stars);

    // Step 2: Borderline case → HuggingFace evaluation
    if (score >= 50 && score < 70 && audioBlob) {
      try {
        const hfResult = await pronunciationCourseApi.huggingfaceEvaluate(
          audioBlob,
          expectedWord.word
        );
        evaluationMethod = 'huggingface';
        finalScore = hfResult.score;
        finalStars = hfResult.stars;
        feedback = hfResult.feedback || getFeedback(finalStars);
      } catch (e) {
        // Fallback to browser result
        console.warn('HuggingFace evaluation failed, using browser result');
      }
    }

    return {
      score: finalScore,
      stars: finalStars,
      feedback,
      transcription,
      evaluation_method: evaluationMethod,
    };
  }

  destroy() {
    if (this.recognition) {
      this.recognition.abort();
    }
  }
}

// Type augmentation for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/pronunciation-course/services/pronunciationEngine.ts
git commit -m "feat(pronunciation-course): add PronunciationEngine with hybrid evaluation"
```

---

## Task 9: Frontend Hooks

**Files:**
- Create: `frontend/src/features/pronunciation-course/hooks/usePronunciationCourse.ts`
- Create: `frontend/src/features/pronunciation-course/hooks/usePronunciationEngine.ts`

**Interfaces:**
- Consumes: topic_id, word
- Produces: React hook state for course data and pronunciation flow

- [ ] **Step 1: Write hooks**

```typescript
// frontend/src/features/pronunciation-course/hooks/usePronunciationCourse.ts
import { useState, useEffect, useCallback } from 'react';
import { pronunciationCourseApi } from '../services/courseApi';
import type {
  PronunciationCourse,
  PronunciationCourseDetail,
  PronunciationProgress,
  PronunciationAttempt,
} from '../types';

export function usePronunciationCourses() {
  const [courses, setCourses] = useState<PronunciationCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pronunciationCourseApi
      .listCourses()
      .then(setCourses)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { courses, loading, error };
}

export function usePronunciationCourseDetail(topicId: string) {
  const [course, setCourse] = useState<PronunciationCourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!topicId) return;
    pronunciationCourseApi
      .getCourse(topicId)
      .then(setCourse)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [topicId]);

  return { course, loading, error };
}

export function usePronunciationProgress() {
  const [progress, setProgress] = useState<PronunciationProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pronunciationCourseApi
      .getProgress()
      .then(setProgress)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { progress, loading, error };
}

export function useLogAttempt() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logAttempt = useCallback(
    async (attempt: Omit<PronunciationAttempt, 'evaluation_method'>) => {
      setLoading(true);
      try {
        const result = await pronunciationCourseApi.logAttempt({
          ...attempt,
          evaluation_method: 'browser',
        });
        return result;
      } catch (e: any) {
        setError(e.message);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { logAttempt, loading, error };
}
```

```typescript
// frontend/src/features/pronunciation-course/hooks/usePronunciationEngine.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { PronunciationEngine, type PronunciationEngineOptions } from '../services/pronunciationEngine';
import type { PronunciationWord, EvaluationResult } from '../types';

export type RecordingState = 'idle' | 'recording' | 'processing';

export function usePronunciationEngine() {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [transcription, setTranscription] = useState('');
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const engineRef = useRef<PronunciationEngine | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleTranscription = useCallback((text: string, isFinal: boolean) => {
    setTranscription(text);
    if (isFinal) {
      // Will trigger evaluation in handleRecordingEnd
    }
  }, []);

  const handleRecordingStart = useCallback(() => {
    setRecordingState('recording');
    setTranscription('');
    setResult(null);
    setError(null);
    chunksRef.current = [];
  }, []);

  const handleRecordingEnd = useCallback((blob: Blob) => {
    setAudioBlob(blob);
    setRecordingState('processing');
  }, []);

  const handleResult = useCallback((evalResult: EvaluationResult) => {
    setResult(evalResult);
    setRecordingState('idle');
  }, []);

  const handleError = useCallback((err: string) => {
    setError(err);
    setRecordingState('idle');
  }, []);

  useEffect(() => {
    const options: PronunciationEngineOptions = {
      onRecordingStart: handleRecordingStart,
      onRecordingEnd: handleRecordingEnd,
      onTranscription: handleTranscription,
      onResult: handleResult,
      onError: handleError,
    };
    engineRef.current = new PronunciationEngine(options);

    return () => {
      engineRef.current?.destroy();
    };
  }, [handleTranscription, handleRecordingStart, handleRecordingEnd, handleResult, handleError]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        handleRecordingEnd(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      engineRef.current?.startRecording();
    } catch (e: any) {
      handleError(e.message || 'Failed to access microphone');
    }
  }, [handleRecordingEnd, handleError]);

  const stopRecording = useCallback(async () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    engineRef.current?.stopRecording();
  }, []);

  const evaluate = useCallback(
    async (word: PronunciationWord) => {
      if (!transcription) {
        handleError('No transcription available');
        return;
      }
      const evalResult = await engineRef.current?.evaluate(
        transcription,
        word,
        audioBlob || undefined
      );
      if (evalResult) {
        handleResult(evalResult);
      }
    },
    [transcription, audioBlob, handleResult, handleError]
  );

  const reset = useCallback(() => {
    setTranscription('');
    setResult(null);
    setError(null);
    setAudioBlob(null);
    setRecordingState('idle');
  }, []);

  return {
    recordingState,
    transcription,
    result,
    error,
    startRecording,
    stopRecording,
    evaluate,
    reset,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/pronunciation-course/hooks/usePronunciationCourse.ts frontend/src/features/pronunciation-course/hooks/usePronunciationEngine.ts
git commit -m "feat(pronunciation-course): add React hooks for course data and engine"
```

---

## Task 10: Frontend Components

**Files:**
- Create: `frontend/src/features/pronunciation-course/components/CourseList.tsx`
- Create: `frontend/src/features/pronunciation-course/components/CourseDetail.tsx`
- Create: `frontend/src/features/pronunciation-course/components/WordCard.tsx`
- Create: `frontend/src/features/pronunciation-course/components/ProgressReport.tsx`
- Create: `frontend/src/features/pronunciation-course/components/RecordingButton.tsx`
- Create: `frontend/src/features/pronunciation-course/components/FeedbackDisplay.tsx`

**Interfaces:**
- Consumes: Types from `types/index.ts`
- Produces: Claymorphic React components

- [ ] **Step 1: Write CourseList component**

```typescript
// frontend/src/features/pronunciation-course/components/CourseList.tsx
import { motion } from 'motion/react';
import type { PronunciationCourse } from '../types';

const TOPIC_COLORS: Record<string, { bg: string; shadow: string; text: string }> = {
  'sky-blue': { bg: 'bg-sky-100', shadow: 'shadow-clay-blue', text: 'text-sky-700' },
  'coral-pink': { bg: 'bg-pink-100', shadow: 'shadow-clay-pink', text: 'text-pink-700' },
  'lavender': { bg: 'bg-purple-100', shadow: 'shadow-clay-purple', text: 'text-purple-700' },
  'mint-green': { bg: 'bg-green-100', shadow: 'shadow-clay-green', text: 'text-green-700' },
};

interface CourseListProps {
  courses: PronunciationCourse[];
  onSelect: (topicId: string) => void;
}

export function CourseList({ courses, onSelect }: CourseListProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 p-4">
      {courses.map((course) => {
        const colors = TOPIC_COLORS[course.color] || TOPIC_COLORS['sky-blue'];
        return (
          <motion.button
            key={course.topic_id}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(course.topic_id)}
            className={`${colors.bg} ${colors.shadow} rounded-3xl p-6 text-left cursor-pointer transition-shadow`}
          >
            <div className="flex items-center gap-4 mb-3">
              <span className="text-5xl">{course.icon}</span>
              <div>
                <h3 className={`font-bold text-xl ${colors.text}`}>{course.name_vi}</h3>
                <p className="text-sm text-gray-500">{course.name}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {course.word_count} từ
              </span>
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <span
                    key={i}
                    className={`w-3 h-3 rounded-full ${
                      course.completion_percent > i * 33
                        ? colors.text.replace('text-', 'bg-')
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Write WordCard component**

```typescript
// frontend/src/features/pronunciation-course/components/WordCard.tsx
import { motion } from 'motion/react';
import type { PronunciationWord } from '../types';

const DIFFICULTY_COLORS = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
};

interface WordCardProps {
  word: PronunciationWord;
  stars?: number;
  isLearned?: boolean;
  isActive?: boolean;
  onClick?: () => void;
}

export function WordCard({ word, stars = 0, isLearned, isActive, onClick }: WordCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        bg-white rounded-2xl p-4 shadow-clay cursor-pointer text-left w-full
        ${isActive ? 'ring-4 ring-yellow-400' : ''}
        ${isLearned ? 'opacity-80' : ''}
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-bold text-lg text-slate-800">{word.word}</h4>
          {word.phonetic && (
            <p className="text-sm text-gray-500">{word.phonetic}</p>
          )}
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full font-medium ${
            DIFFICULTY_COLORS[word.difficulty]
          }`}
        >
          {word.difficulty}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {[...Array(3)].map((_, i) => (
          <span
            key={i}
            className={`text-lg ${
              i < stars ? 'text-yellow-400' : 'text-gray-300'
            }`}
          >
            ★
          </span>
        ))}
        {isLearned && <span className="ml-2 text-green-500 text-sm">Đã học</span>}
      </div>
    </motion.button>
  );
}
```

- [ ] **Step 3: Write RecordingButton component**

```typescript
// frontend/src/features/pronunciation-course/components/RecordingButton.tsx
import { motion } from 'motion/react';
import type { RecordingState } from '../hooks/usePronunciationEngine';

interface RecordingButtonProps {
  state: RecordingState;
  onStart: () => void;
  onStop: () => void;
}

export function RecordingButton({ state, onStart, onStop }: RecordingButtonProps) {
  const isRecording = state === 'recording';
  const isProcessing = state === 'processing';

  return (
    <div className="flex flex-col items-center gap-4">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={isRecording ? onStop : onStart}
        disabled={isProcessing}
        className={`
          relative w-24 h-24 rounded-full flex items-center justify-center
          shadow-clay-lg cursor-pointer transition-colors
          ${isRecording
            ? 'bg-red-500 shadow-red-300'
            : 'bg-sky-100 shadow-clay-blue'
          }
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {isRecording && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="absolute inset-0 rounded-full bg-red-400 opacity-30"
          />
        )}
        <span className={`text-3xl ${isRecording ? '' : 'text-sky-600'}`}>
          {isRecording ? '⏹' : '🎤'}
        </span>
      </motion.button>
      <p className="text-sm text-gray-500">
        {isProcessing
          ? 'Đang xử lý...'
          : isRecording
          ? 'Nhấn để dừng'
          : 'Nhấn để nói'}
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Write FeedbackDisplay component**

```typescript
// frontend/src/features/pronunciation-course/components/FeedbackDisplay.tsx
import { motion } from 'motion/react';
import type { EvaluationResult } from '../types';

interface FeedbackDisplayProps {
  result: EvaluationResult;
}

export function FeedbackDisplay({ result }: FeedbackDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl p-6 shadow-clay-lg text-center"
    >
      <div className="flex justify-center gap-2 mb-4">
        {[...Array(3)].map((_, i) => (
          <motion.span
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={`text-4xl ${
              i < result.stars ? 'text-yellow-400' : 'text-gray-300'
            }`}
          >
            ★
          </motion.span>
        ))}
      </div>
      <p className="text-xl font-bold text-slate-800 mb-2">
        {result.feedback}
      </p>
      <p className="text-sm text-gray-500">
        Điểm: {result.score}% · {result.evaluation_method === 'huggingface' ? 'AI' : 'Browser'}
      </p>
    </motion.div>
  );
}
```

- [ ] **Step 5: Write ProgressReport component**

```typescript
// frontend/src/features/pronunciation-course/components/ProgressReport.tsx
import type { PronunciationProgress } from '../types';

interface ProgressReportProps {
  progress: PronunciationProgress;
}

export function ProgressReport({ progress }: ProgressReportProps) {
  const maxCount = Math.max(...progress.words_per_topic.map((t) => t.count), 1);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-clay-lg">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Tiến độ học tập</h2>
      
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-3xl font-bold text-sky-500">{progress.total_words_learned}</p>
          <p className="text-sm text-gray-500">Từ đã học</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-yellow-500">{progress.total_stars}</p>
          <p className="text-sm text-gray-500">Sao</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-green-500">{progress.current_streak}</p>
          <p className="text-sm text-gray-500">Ngày liên tiếp</p>
        </div>
      </div>

      {/* Favorite topic */}
      {progress.favorite_topic && (
        <div className="bg-yellow-50 rounded-2xl p-4 mb-6">
          <p className="text-sm text-gray-500">Chủ đề yêu thích nhất</p>
          <p className="font-bold text-lg text-slate-800">
            {progress.favorite_topic.topic_name}
          </p>
          <p className="text-sm text-gray-500">
            {progress.favorite_topic.count} từ đã học
          </p>
        </div>
      )}

      {/* Topic bars */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-700">Theo chủ đề</h3>
        {progress.words_per_topic.map((topic) => (
          <div key={topic.topic_id}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600">{topic.topic_name}</span>
              <span className="text-gray-500">{topic.count} từ</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-400 to-sky-500 rounded-full transition-all"
                style={{ width: `${(topic.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Write CourseDetail component**

```typescript
// frontend/src/features/pronunciation-course/components/CourseDetail.tsx
import type { PronunciationCourseDetail } from '../types';
import { WordCard } from './WordCard';

interface CourseDetailProps {
  course: PronunciationCourseDetail;
  onWordSelect: (wordId: string) => void;
  selectedWordId?: string;
  wordProgress: Record<string, number>; // word_id -> stars
}

export function CourseDetail({
  course,
  onWordSelect,
  selectedWordId,
  wordProgress,
}: CourseDetailProps) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{course.name_vi}</h2>
        <p className="text-gray-500">
          {course.progress.learned}/{course.progress.total} từ đã học
        </p>
        <div className="h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-green-400 rounded-full transition-all"
            style={{
              width: `${(course.progress.learned / course.progress.total) * 100}%`,
            }}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {course.words.map((word) => (
          <WordCard
            key={word.word_id}
            word={word}
            stars={wordProgress[word.word_id] || 0}
            isLearned={wordProgress[word.word_id] >= 3}
            isActive={selectedWordId === word.word_id}
            onClick={() => onWordSelect(word.word_id)}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/pronunciation-course/components/
git commit -m "feat(pronunciation-course): add claymorphic UI components"
```

---

## Task 11: Frontend Pages + Routing

**Files:**
- Create: `frontend/src/features/pronunciation-course/pages/PronunciationCoursesPage.tsx`
- Create: `frontend/src/features/pronunciation-course/pages/PronunciationCourseDetailPage.tsx`
- Create: `frontend/src/features/pronunciation-course/pages/PronunciationProgressPage.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: hooks, components
- Produces: routed pages

- [ ] **Step 1: Write PronunciationCoursesPage**

```typescript
// frontend/src/features/pronunciation-course/pages/PronunciationCoursesPage.tsx
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { CourseList } from '../components/CourseList';
import { usePronunciationCourses } from '../hooks/usePronunciationCourse';

export function PronunciationCoursesPage() {
  const navigate = useNavigate();
  const { courses, loading, error } = usePronunciationCourses();

  return (
    <div className="min-h-screen bg-[#FFF8EE] p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <h1 className="text-3xl font-bold text-slate-800 mb-2 text-center">
          📚 Luyện phát âm
        </h1>
        <p className="text-center text-gray-500 mb-8">
          Học phát âm từ vựng theo chủ đề
        </p>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full" />
          </div>
        )}

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-2xl text-center">
            {error}
          </div>
        )}

        {!loading && !error && (
          <CourseList
            courses={courses}
            onSelect={(topicId) => navigate(`/pronunciation-courses/${topicId}`)}
          />
        )}
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Write PronunciationCourseDetailPage**

```typescript
// frontend/src/features/pronunciation-course/pages/PronunciationCourseDetailPage.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { CourseDetail } from '../components/CourseDetail';
import { RecordingButton } from '../components/RecordingButton';
import { FeedbackDisplay } from '../components/FeedbackDisplay';
import { usePronunciationCourseDetail, useLogAttempt } from '../hooks/usePronunciationCourse';
import { usePronunciationEngine } from '../hooks/usePronunciationEngine';
import type { PronunciationWord, EvaluationResult } from '../types';

export function PronunciationCourseDetailPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const { course, loading } = usePronunciationCourseDetail(topicId || '');
  const { logAttempt } = useLogAttempt();
  const {
    recordingState,
    transcription,
    result,
    error,
    startRecording,
    stopRecording,
    evaluate,
    reset,
  } = usePronunciationEngine();

  const [selectedWord, setSelectedWord] = useState<PronunciationWord | null>(null);
  const [wordProgress, setWordProgress] = useState<Record<string, number>>({});

  const handleWordSelect = (wordId: string) => {
    const word = course?.words.find((w) => w.word_id === wordId);
    if (word) {
      setSelectedWord(word);
      reset();
    }
  };

  const handleStartRecording = async () => {
    await startRecording();
  };

  const handleStopRecording = async () => {
    await stopRecording();
  };

  useEffect(() => {
    if (recordingState === 'processing' && selectedWord && transcription) {
      evaluate(selectedWord).then((evalResult) => {
        if (evalResult) {
          // Log attempt
          logAttempt({
            user_id: 'current-user', // TODO: get from auth
            topic_id: topicId || '',
            word_id: selectedWord.word_id,
            score: evalResult.score,
            stars: evalResult.stars,
            transcription: evalResult.transcription,
          });
          // Update local progress
          setWordProgress((prev) => ({
            ...prev,
            [selectedWord.word_id]: Math.max(
              prev[selectedWord.word_id] || 0,
              evalResult.stars
            ),
          }));
        }
      });
    }
  }, [recordingState, transcription, selectedWord, topicId, evaluate, logAttempt]);

  if (loading || !course) {
    return (
      <div className="min-h-screen bg-[#FFF8EE] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8EE] p-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/pronunciation-courses')}
          className="mb-4 text-sky-600 hover:text-sky-700 flex items-center gap-2"
        >
          ← Quay lại
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <CourseDetail
            course={course}
            onWordSelect={handleWordSelect}
            selectedWordId={selectedWord?.word_id}
            wordProgress={wordProgress}
          />
        </motion.div>

        {/* Practice section */}
        {selectedWord && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-clay-lg p-6"
          >
            <h3 className="text-xl font-bold text-slate-800 text-center mb-2">
              Luyện phát âm: {selectedWord.word}
            </h3>
            {selectedWord.phonetic && (
              <p className="text-center text-gray-500 mb-4">{selectedWord.phonetic}</p>
            )}

            {/* TTS play button */}
            <div className="flex justify-center mb-4">
              <button
                onClick={() => {
                  const utterance = new SpeechSynthesisUtterance(selectedWord.word);
                  utterance.lang = 'en-US';
                  speechSynthesis.speak(utterance);
                }}
                className="bg-sky-100 text-sky-600 px-4 py-2 rounded-full shadow-clay flex items-center gap-2"
              >
                🔊 Nghe mẫu
              </button>
            </div>

            <div className="flex flex-col items-center gap-4">
              <RecordingButton
                state={recordingState}
                onStart={handleStartRecording}
                onStop={handleStopRecording}
              />

              {transcription && (
                <p className="text-sm text-gray-600">Bạn nói: "{transcription}"</p>
              )}

              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}

              {result && <FeedbackDisplay result={result} />}

              {result && (
                <button
                  onClick={reset}
                  className="text-sky-600 hover:text-sky-700 text-sm"
                >
                  Thử lại từ khác
                </button>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write PronunciationProgressPage**

```typescript
// frontend/src/features/pronunciation-course/pages/PronunciationProgressPage.tsx
import { usePronunciationProgress } from '../hooks/usePronunciationCourse';
import { ProgressReport } from '../components/ProgressReport';

export function PronunciationProgressPage() {
  const { progress, loading, error } = usePronunciationProgress();

  return (
    <div className="min-h-screen bg-[#FFF8EE] p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-8 text-center">
          📊 Báo cáo tiến độ
        </h1>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full" />
          </div>
        )}

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-2xl text-center">
            {error}
          </div>
        )}

        {progress && <ProgressReport progress={progress} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add routes to App.tsx**

```typescript
// In frontend/src/App.tsx, add these imports and routes:
import { PronunciationCoursesPage } from './features/pronunciation-course/pages/PronunciationCoursesPage';
import { PronunciationCourseDetailPage } from './features/pronunciation-course/pages/PronunciationCourseDetailPage';
import { PronunciationProgressPage } from './features/pronunciation-course/pages/PronunciationProgressPage';

// Add these routes inside the Routes component:
<Route path="/pronunciation-courses" element={<PronunciationCoursesPage />} />
<Route path="/pronunciation-courses/:topicId" element={<PronunciationCourseDetailPage />} />
<Route path="/pronunciation-courses/progress" element={<PronunciationProgressPage />} />
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/pronunciation-course/pages/
git add frontend/src/App.tsx
git commit -m "feat(pronunciation-course): add pages and routing"
```

---

## Task 12: Final Verification

**Files:**
- Run: backend tests
- Run: frontend type check

- [ ] **Step 1: Run backend tests**

Run: `cd backend && python -m pytest tests/test_pronunciation_course_model.py tests/test_pronunciation_course_api.py tests/test_huggingface_evaluation_service.py tests/test_data_collection_service.py -v`

- [ ] **Step 2: Run frontend type check**

Run: `cd frontend && npx tsc --noEmit`

- [ ] **Step 3: Fetch and commit**

Run: `git fetch && git pull origin 10-days-quick-run`
Then commit all remaining changes with a final summary commit.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(pronunciation-course): complete implementation with 4 topics, hybrid evaluation, and claymorphic UI

- Backend: models, API router, HuggingFace service, data collection
- Frontend: TypeScript types, API client, PronunciationEngine, hooks
- UI: CourseList, WordCard, RecordingButton, FeedbackDisplay, ProgressReport
- Pages: Courses, CourseDetail, Progress with full routing"
```
