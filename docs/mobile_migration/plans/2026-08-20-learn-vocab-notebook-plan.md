# Learn Vocabulary & Notebook — Implementation Plan

> **Branch:** web_enhanced (from main)
> **Targets:** Web (`frontend/`) + React Native (`mobile/rn/`)

**Goal:** Implement 4 features: Sổ tay (Notebook), Tra từ (AI Dictionary), TikTok Flashcards, Thời điểm vàng (Spaced Repetition Notifications)

**Architecture:** 
- **Web:** React + Claymorphism + Three.js (Vite build)
- **Mobile:** React Native + Claymorphism + Three.js
- **Backend:** FastAPI with existing Qdrant RAG integration
- **Database:** PostgreSQL (Supabase)
- **Notifications:** Expo Notifications (RN) + Service Workers (Web)

**Tech Stack:** 
- **Web:** TypeScript, React, react-spring, @react-three/fiber, Tailwind CSS
- **Mobile:** TypeScript, React Native, react-native-gesture-handler, react-native-reanimated, @react-three/fiber
- **Backend:** Python, FastAPI, QdrantRAGService, SM-2 algorithm
- **Database:** PostgreSQL (Supabase), MongoDB

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

#### Task 1: Database Schema Migration

**Files:**
- Create: `backend/database/postgres/migrations/20260820_01_notebook_tables.sql`
- Modify: `backend/database/postgres/import_mongo_live.py` (optional, for future migration)

**Interfaces:**
- Consumes: PostgreSQL connection via `settings.DATABASE_URL`
- Produces: `notebook_entries`, `review_schedules`, `review_history` tables

- [ ] **Step 1: Create migration SQL file**

```sql
-- notebook_entries table
CREATE TABLE IF NOT EXISTS notebook_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word VARCHAR(255) NOT NULL,
  translation_vi TEXT NOT NULL,
  translation_en TEXT,
  context TEXT,
  source VARCHAR(50) NOT NULL CHECK (source IN ('ai_translation', 'flashcard', 'manual')),
  topic VARCHAR(100),
  difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  review_count INTEGER DEFAULT 0,
  ease_factor DECIMAL(3,2) DEFAULT 2.5,
  interval_days INTEGER DEFAULT 0,
  next_review_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, word)
);

-- review_schedules table
CREATE TABLE IF NOT EXISTS review_schedules (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  schedule JSONB NOT NULL DEFAULT '{"windows":[]}',
  timezone VARCHAR(50) DEFAULT 'Asia/Ho_Chi_Minh',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- review_history table
CREATE TABLE IF NOT EXISTS review_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES notebook_entries(id) ON DELETE CASCADE,
  quality INTEGER NOT NULL CHECK (quality >= 0 AND quality <= 5),
  reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notebook_user ON notebook_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_notebook_next_review ON notebook_entries(user_id, next_review_at);
CREATE INDEX IF NOT EXISTS idx_notebook_topic ON notebook_entries(topic);
CREATE INDEX IF NOT EXISTS idx_review_history_card ON review_history(card_id);
```

- [ ] **Step 2: Run migration**

```bash
cd backend
python -c "
from databases import Database
from settings import settings
import asyncio

async def migrate():
    db = Database(settings.DATABASE_URL)
    await db.connect()
    
    migration_sql = open('database/postgres/migrations/20260820_01_notebook_tables.sql').read()
    await db.execute(migration_sql)
    
    await db.disconnect()
    print('Migration complete')

asyncio.run(migrate())
"
```

- [ ] **Step 3: Verify tables exist**

```bash
psql "$DATABASE_URL" -c "\dt notebook_entries review_schedules review_history"
```

#### Task 2: Notebook CRUD API

**Files:**
- Create: `backend/models/notebook_entry.py`
- Create: `backend/repositories/notebook_repository.py`
- Create: `backend/services/notebook_service.py`
- Create: `backend/api/notebook.py`
- Modify: `backend/api/__init__.py`

**Interfaces:**
- Consumes: PostgreSQL `notebook_entries` table
- Produces: `GET /api/v1/notebook`, `POST /api/v1/notebook`, `PUT /api/v1/notebook/{id}`, `DELETE /api/v1/notebook/{id}`

- [ ] **Step 1: Create Pydantic model**

```python
# backend/models/notebook_entry.py
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

class NotebookEntryCreate(BaseModel):
    word: str = Field(..., min_length=1, max_length=255)
    translation_vi: str = Field(..., min_length=1)
    translation_en: Optional[str] = None
    context: Optional[str] = None
    source: str = Field(..., pattern="^(ai_translation|flashcard|manual)$")
    topic: Optional[str] = None
    difficulty: Optional[str] = Field(None, pattern="^(easy|medium|hard)$")

class NotebookEntryUpdate(BaseModel):
    word: Optional[str] = None
    translation_vi: Optional[str] = None
    translation_en: Optional[str] = None
    context: Optional[str] = None
    topic: Optional[str] = None
    difficulty: Optional[str] = None

class NotebookEntry(BaseModel):
    id: UUID
    user_id: UUID
    word: str
    translation_vi: str
    translation_en: Optional[str]
    context: Optional[str]
    source: str
    topic: Optional[str]
    difficulty: Optional[str]
    created_at: datetime
    last_reviewed_at: Optional[datetime]
    review_count: int
    ease_factor: float
    interval_days: int
    next_review_at: Optional[datetime]

class NotebookEntryResponse(BaseModel):
    entries: list[NotebookEntry]
    total: int
```

- [ ] **Step 2: Create repository**

```python
# backend/repositories/notebook_repository.py
from typing import Optional
from uuid import UUID
from databases import Database
from backend.models.notebook_entry import NotebookEntryCreate, NotebookEntryUpdate

class NotebookRepository:
    def __init__(self, db: Database):
        self.db = db
    
    async def get_by_user(
        self, 
        user_id: UUID, 
        topic: Optional[str] = None,
        search: Optional[str] = None,
        needs_review: bool = False,
        limit: int = 50,
        offset: int = 0
    ) -> tuple[list[dict], int]:
        query = "SELECT * FROM notebook_entries WHERE user_id = :user_id"
        count_query = "SELECT COUNT(*) FROM notebook_entries WHERE user_id = :user_id"
        params = {"user_id": str(user_id), "limit": limit, "offset": offset}
        
        if topic:
            query += " AND topic = :topic"
            count_query += " AND topic = :topic"
            params["topic"] = topic
        
        if search:
            query += " AND (word ILIKE :search OR translation_vi ILIKE :search)"
            count_query += " AND (word ILIKE :search OR translation_vi ILIKE :search)"
            params["search"] = f"%{search}%"
        
        if needs_review:
            query += " AND next_review_at <= NOW()"
            count_query += " AND next_review_at <= NOW()"
        
        query += " ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
        
        rows = await self.db.fetch_all(query, params)
        count = await self.db.fetch_val(count_query, {"user_id": str(user_id), "topic": topic, "search": f"%{search}%" if search else None})
        
        return [dict(row) for row in rows], count
    
    async def create(self, user_id: UUID, entry: NotebookEntryCreate) -> dict:
        query = """
            INSERT INTO notebook_entries (user_id, word, translation_vi, translation_en, context, source, topic, difficulty)
            VALUES (:user_id, :word, :translation_vi, :translation_en, :context, :source, :topic, :difficulty)
            ON CONFLICT (user_id, word) DO UPDATE SET
                translation_vi = EXCLUDED.translation_vi,
                translation_en = COALESCE(EXCLUDED.translation_en, notebook_entries.translation_en),
                context = COALESCE(EXCLUDED.context, notebook_entries.context),
                difficulty = COALESCE(EXCLUDED.difficulty, notebook_entries.difficulty)
            RETURNING *
        """
        row = await self.db.fetch_one(query, {
            "user_id": str(user_id),
            **entry.model_dump()
        })
        return dict(row)
    
    async def update(self, entry_id: UUID, user_id: UUID, update: NotebookEntryUpdate) -> Optional[dict]:
        set_clauses = []
        params = {"id": str(entry_id), "user_id": str(user_id)}
        
        for field, value in update.model_dump(exclude_unset=True).items():
            if value is not None:
                set_clauses.append(f"{field} = :{field}")
                params[field] = value
        
        if not set_clauses:
            return await self.get_by_id(entry_id, user_id)
        
        query = f"""
            UPDATE notebook_entries 
            SET {', '.join(set_clauses)}
            WHERE id = :id AND user_id = :user_id
            RETURNING *
        """
        row = await self.db.fetch_one(query, params)
        return dict(row) if row else None
    
    async def delete(self, entry_id: UUID, user_id: UUID) -> bool:
        query = "DELETE FROM notebook_entries WHERE id = :id AND user_id = :user_id"
        result = await self.db.execute(query, {"id": str(entry_id), "user_id": str(user_id)})
        return result > 0
    
    async def get_by_id(self, entry_id: UUID, user_id: UUID) -> Optional[dict]:
        query = "SELECT * FROM notebook_entries WHERE id = :id AND user_id = :user_id"
        row = await self.db.fetch_one(query, {"id": str(entry_id), "user_id": str(user_id)})
        return dict(row) if row else None
```

- [ ] **Step 3: Create service with SM-2 algorithm**

```python
# backend/services/notebook_service.py
from uuid import UUID
from typing import Optional
from backend.models.notebook_entry import NotebookEntryCreate, NotebookEntryUpdate

class SM2Result:
    def __init__(self, ease_factor: float, interval_days: int, repetitions: int):
        self.ease_factor = ease_factor
        self.interval_days = interval_days
        self.repetitions = repetitions

def calculate_sm2(
    ease_factor: float,
    interval_days: int,
    repetitions: int,
    quality: int  # 0-5
) -> SM2Result:
    """SM-2 Spaced Repetition Algorithm"""
    if quality < 3:
        # Failed: reset
        return SM2Result(
            ease_factor=max(1.3, ease_factor),
            interval_days=1,
            repetitions=0
        )
    
    # Passed
    if repetitions == 0:
        new_interval = 1
    elif repetitions == 1:
        new_interval = 6
    else:
        new_interval = round(interval_days * ease_factor)
    
    # Update ease factor
    new_ease = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    new_ease = max(1.3, new_ease)
    
    return SM2Result(
        ease_factor=new_ease,
        interval_days=new_interval,
        repetitions=repetitions + 1
    )

class NotebookService:
    def __init__(self, repository):
        self.repository = repository
    
    async def get_entries(self, user_id: UUID, **kwargs):
        return await self.repository.get_by_user(user_id, **kwargs)
    
    async def create_entry(self, user_id: UUID, entry: NotebookEntryCreate):
        return await self.repository.create(user_id, entry)
    
    async def update_entry(self, entry_id: UUID, user_id: UUID, update: NotebookEntryUpdate):
        return await self.repository.update(entry_id, user_id, update)
    
    async def delete_entry(self, entry_id: UUID, user_id: UUID):
        return await self.repository.delete(entry_id, user_id)
    
    async def submit_review(self, entry_id: UUID, user_id: UUID, quality: int):
        entry = await self.repository.get_by_id(entry_id, user_id)
        if not entry:
            return None
        
        result = calculate_sm2(
            entry["ease_factor"],
            entry["interval_days"],
            entry["review_count"],
            quality
        )
        
        from datetime import datetime, timedelta
        next_review = datetime.utcnow() + timedelta(days=result.interval_days)
        
        update = NotebookEntryUpdate(
            last_reviewed_at=datetime.utcnow(),
            review_count=result.repetitions,
            ease_factor=result.ease_factor,
            interval_days=result.interval_days,
            next_review_at=next_review
        )
        
        return await self.repository.update(entry_id, user_id, update)
```

- [ ] **Step 4: Create API router**

```python
# backend/api/notebook.py
from fastapi import APIRouter, Depends, HTTPException, Query
from uuid import UUID
from backend.models.notebook_entry import (
    NotebookEntryCreate, NotebookEntryUpdate, NotebookEntry
)
from backend.services.notebook_service import NotebookService
from backend.repositories.notebook_repository import NotebookRepository
from backend.database import get_database

router = APIRouter(prefix="/api/v1/notebook", tags=["notebook"])

def get_notebook_service(db=Depends(get_database)) -> NotebookService:
    return NotebookService(NotebookRepository(db))

@router.get("")
async def list_entries(
    topic: str = None,
    search: str = None,
    needs_review: bool = False,
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    current_user_id: UUID = None,  # From auth middleware
    service: NotebookService = Depends(get_notebook_service)
):
    entries, total = await service.get_entries(
        current_user_id,
        topic=topic,
        search=search,
        needs_review=needs_review,
        limit=limit,
        offset=offset
    )
    return {"entries": entries, "total": total}

@router.post("")
async def create_entry(
    entry: NotebookEntryCreate,
    current_user_id: UUID = None,
    service: NotebookService = Depends(get_notebook_service)
):
    return await service.create_entry(current_user_id, entry)

@router.put("/{entry_id}")
async def update_entry(
    entry_id: UUID,
    update: NotebookEntryUpdate,
    current_user_id: UUID = None,
    service: NotebookService = Depends(get_notebook_service)
):
    result = await service.update_entry(entry_id, current_user_id, update)
    if not result:
        raise HTTPException(404, "Entry not found")
    return result

@router.delete("/{entry_id}")
async def delete_entry(
    entry_id: UUID,
    current_user_id: UUID = None,
    service: NotebookService = Depends(get_notebook_service)
):
    success = await service.delete_entry(entry_id, current_user_id)
    if not success:
        raise HTTPException(404, "Entry not found")
    return {"success": True}

@router.post("/{entry_id}/review")
async def submit_review(
    entry_id: UUID,
    quality: int = Query(..., ge=0, le=5),
    current_user_id: UUID = None,
    service: NotebookService = Depends(get_notebook_service)
):
    result = await service.submit_review(entry_id, current_user_id, quality)
    if not result:
        raise HTTPException(404, "Entry not found")
    return result
```

#### Task 3: Dictionary Translation API

**Files:**
- Create: `backend/models/dictionary.py`
- Create: `backend/api/dictionary.py`
- Modify: `backend/api/__init__.py` (add dictionary router)

**Interfaces:**
- Consumes: QdrantRAGService, existing animal wiki dataset
- Produces: `POST /api/v1/dictionary/translate`

- [ ] **Step 1: Create request/response models**

```python
# backend/models/dictionary.py
from pydantic import BaseModel, Field
from typing import Optional

class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)
    context: Optional[str] = Field(None, max_length=1000)
    target_lang: str = Field("vi", pattern="^(vi|en)$")

class WordBreakdown(BaseModel):
    word: str
    pronunciation: str
    part_of_speech: str
    translation: str

class RelatedWord(BaseModel):
    word: str
    topic: str
    relevance: float

class ContextSource(BaseModel):
    doc_id: str
    snippet: str

class TranslateResponse(BaseModel):
    original: str
    translation: dict
    word_breakdown: Optional[list[WordBreakdown]] = None
    related_words: Optional[list[RelatedWord]] = None
    context_sources: Optional[list[ContextSource]] = None
```

- [ ] **Step 2: Create API with Qdrant integration**

```python
# backend/api/dictionary.py
from fastapi import APIRouter, HTTPException
from backend.models.dictionary import TranslateRequest, TranslateResponse
from backend.services.qdrant_rag_service import QdrantRAGService, QdrantRAGUnavailable
from backend.services.llm_clients import get_tokenrouter_client

router = APIRouter(prefix="/api/v1/dictionary", tags=["dictionary"])

async def translate_with_ai(text: str, context: str, target_lang: str) -> dict:
    """Use TokenRouter for AI translation"""
    client = get_tokenrouter_client()
    
    system_prompt = """You are a professional translator specializing in English-Vietnamese translation for children's educational content.
    Provide accurate, child-safe translations with contextual explanations.
    
    Respond in JSON format:
    {
        "translation": "...",
        "literal_translation": "...", 
        "contextual_note": "...",
        "word_breakdown": [
            {"word": "...", "pronunciation": "...", "part_of_speech": "...", "translation": "..."}
        ]
    }"""
    
    user_prompt = f"Translate to {'Vietnamese' if target_lang == 'vi' else 'English'}: {text}"
    if context:
        user_prompt += f"\n\nContext: {context}"
    
    response = await client.chat.completions.create(
        model="deepseek/deepseek-v4-pro-0813-free",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.3,
        max_tokens=500
    )
    
    import json
    content = response.choices[0].message.content
    # Try to parse as JSON
    try:
        return json.loads(content)
    except:
        return {"translation": content}

@router.post("/translate", response_model=TranslateResponse)
async def translate(request: TranslateRequest):
    try:
        # Get wiki context from Qdrant
        qdrant = QdrantRAGService()
        context_results = await qdrant.retrieve(request.text)
        context_sources = [
            {"doc_id": r.get("doc_id", ""), "snippet": r.get("text", "")[:200]}
            for r in context_results[:3]
        ]
    except QdrantRAGUnavailable:
        context_sources = []
    
    # AI translation
    translation_data = await translate_with_ai(
        request.text,
        request.context or "",
        request.target_lang
    )
    
    return TranslateResponse(
        original=request.text,
        translation={
            "vi": translation_data.get("translation", ""),
            "literal_translation": translation_data.get("literal_translation"),
            "contextual_note": translation_data.get("contextual_note")
        },
        word_breakdown=[{
            "word": w["word"],
            "pronunciation": w["pronunciation"],
            "part_of_speech": w["part_of_speech"],
            "translation": w["translation"]
        } for w in translation_data.get("word_breakdown", [])],
        related_words=None,
        context_sources=context_sources if context_sources else None
    )
```

#### Task 4: Vocabulary Topics API

**Files:**
- Create: `backend/api/vocabulary.py`
- Modify: `backend/api/__init__.py`

**Interfaces:**
- Consumes: Existing flashcards.json + new topic definitions
- Produces: `GET /api/v1/vocabulary/topics`, `GET /api/v1/vocabulary/topic/{topic_id}`

- [ ] **Step 1: Create vocabulary topics data**

```python
# backend/data/vocabulary_topics.py
VOCABULARY_TOPICS = [
    {
        "id": "animals",
        "name": "Animals",
        "name_vi": "Động vựng",
        "icon": "🐾",
        "color": "mintGreen",
        "card_count": 50,
        "difficulty_range": "easy-medium"
    },
    {
        "id": "food",
        "name": "Food",
        "name_vi": "Đồ ăn",
        "icon": "🍎",
        "color": "coralPink",
        "card_count": 40,
        "difficulty_range": "easy"
    },
    {
        "id": "nature",
        "name": "Nature",
        "name_vi": "Thiên nhiên",
        "icon": "🌳",
        "color": "skyBlue",
        "card_count": 30,
        "difficulty_range": "easy-medium"
    },
    {
        "id": "travel",
        "name": "Travel",
        "name_vi": "Du lịch",
        "icon": "✈️",
        "color": "lavender",
        "card_count": 35,
        "difficulty_range": "medium"
    },
    {
        "id": "school",
        "name": "School",
        "name_vi": "Trường học",
        "icon": "📚",
        "color": "vibrantOrange",
        "card_count": 25,
        "difficulty_range": "easy"
    },
    {
        "id": "family",
        "name": "Family",
        "name_vi": "Gia đình",
        "icon": "👨‍👩‍👧",
        "color": "bubblePink",
        "card_count": 20,
        "difficulty_range": "easy"
    },
    {
        "id": "ielts-5",
        "name": "IELTS Band 5",
        "name_vi": "IELTS Band 5",
        "icon": "🎯",
        "color": "electricPurple",
        "card_count": 100,
        "difficulty_range": "easy-medium"
    },
    {
        "id": "ielts-6",
        "name": "IELTS Band 6",
        "name_vi": "IELTS Band 6",
        "icon": "🎯",
        "color": "neonTeal",
        "card_count": 100,
        "difficulty_range": "medium"
    },
    {
        "id": "ielts-7",
        "name": "IELTS Band 7+",
        "name_vi": "IELTS Band 7+",
        "icon": "🏆",
        "color": "sunshineYellow",
        "card_count": 80,
        "difficulty_range": "hard"
    },
]
```

- [ ] **Step 2: Create vocabulary API**

```python
# backend/api/vocabulary.py
from fastapi import APIRouter
from backend.data.vocabulary_topics import VOCABULARY_TOPICS
from backend.repositories.flashcard_repository import FlashcardRepository

router = APIRouter(prefix="/api/v1/vocabulary", tags=["vocabulary"])

@router.get("/topics")
async def get_topics():
    """Get all vocabulary topics"""
    return {"topics": VOCABULARY_TOPICS}

@router.get("/topic/{topic_id}")
async def get_topic_cards(topic_id: str):
    """Get flashcard content for a topic"""
    repo = FlashcardRepository()
    
    # Map topic_id to category
    topic_category_map = {
        "animals": "animals",
        "food": "food",
        "nature": "nature",
        "travel": "vehicles",
        "school": "school",
        "family": "family",
    }
    
    category = topic_category_map.get(topic_id, topic_id)
    cards = await repo.get_by_category(category, limit=50)
    
    # Add pronunciation placeholder (would use TTS in production)
    for card in cards:
        card["pronunciation"] = f"/{card['word']}/"
    
    return {
        "topic_id": topic_id,
        "cards": cards
    }
```

### Phase 2: Frontend — Notebook & Dictionary UI

#### Task 5: NotebookScreen Component

**Files:**
- Create: `mobile/rn/src/screens/NotebookScreen.tsx`
- Create: `mobile/rn/src/components/notebook/NotebookCard.tsx`
- Create: `mobile/rn/src/hooks/useNotebook.ts`
- Modify: `mobile/rn/src/navigation/AppNavigator.tsx`

**Interfaces:**
- Consumes: `GET /api/v1/notebook`, `POST /api/v1/notebook`, etc.
- Produces: NotebookScreen with CRUD operations

- [ ] **Step 1: Create useNotebook hook**

```typescript
// mobile/rn/src/hooks/useNotebook.ts
import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';

export interface NotebookEntry {
  id: string;
  word: string;
  translation_vi: string;
  translation_en?: string;
  context?: string;
  source: 'ai_translation' | 'flashcard' | 'manual';
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  created_at: string;
  review_count: number;
  next_review_at?: string;
}

interface UseNotebookReturn {
  entries: NotebookEntry[];
  loading: boolean;
  error: string | null;
  fetchEntries: (filters?: { topic?: string; search?: string; needsReview?: boolean }) => Promise<void>;
  addEntry: (entry: Omit<NotebookEntry, 'id' | 'created_at' | 'review_count'>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  submitReview: (id: string, quality: number) => Promise<void>;
}

export function useNotebook(): UseNotebookReturn {
  const { token } = useAuth();
  const [entries, setEntries] = useState<NotebookEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async (filters?: { topic?: string; search?: string; needsReview?: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters?.topic) params.append('topic', filters.topic);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.needsReview) params.append('needs_review', 'true');
      
      const response = await fetch(`${API_BASE}/api/v1/notebook?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setEntries(data.entries);
    } catch (e) {
      setError('Failed to fetch notebook entries');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const addEntry = useCallback(async (entry: Omit<NotebookEntry, 'id' | 'created_at' | 'review_count'>) => {
    await fetch(`${API_BASE}/api/v1/notebook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(entry)
    });
    await fetchEntries();
  }, [token, fetchEntries]);

  const deleteEntry = useCallback(async (id: string) => {
    await fetch(`${API_BASE}/api/v1/notebook/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    setEntries(prev => prev.filter(e => e.id !== id));
  }, [token]);

  const submitReview = useCallback(async (id: string, quality: number) => {
    await fetch(`${API_BASE}/api/v1/notebook/${id}/review?quality=${quality}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
  }, [token]);

  return { entries, loading, error, fetchEntries, addEntry, deleteEntry, submitReview };
}
```

- [ ] **Step 2: Create NotebookCard component**

```typescript
// mobile/rn/src/components/notebook/NotebookCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ClayCard } from '../clay/ClayCard';
import { BRAND, FONT } from '../../design/tokens';

interface NotebookCardProps {
  entry: {
    word: string;
    translation_vi: string;
    topic?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    review_count: number;
    next_review_at?: string;
  };
  onPress: () => void;
  onLongPress?: () => void;
}

const difficultyColors = {
  easy: BRAND.mintGreen,
  medium: BRAND.vibrantOrange,
  hard: BRAND.coralPink,
};

export const NotebookCard: React.FC<NotebookCardProps> = ({ entry, onPress, onLongPress }) => {
  const isDue = entry.next_review_at && new Date(entry.next_review_at) <= new Date();
  
  return (
    <ClayCard
      size="md"
      color="warmWhite"
      style={styles.card}
      onClick={onPress}
    >
      <View style={styles.header}>
        <Text style={styles.word}>{entry.word}</Text>
        {entry.difficulty && (
          <View style={[styles.badge, { backgroundColor: difficultyColors[entry.difficulty] }]}>
            <Text style={styles.badgeText}>{entry.difficulty}</Text>
          </View>
        )}
        {isDue && <Text style={styles.dueBadge}>📚</Text>}
      </View>
      
      <Text style={styles.translation}>{entry.translation_vi}</Text>
      
      {entry.topic && (
        <Text style={styles.topic}>{entry.topic}</Text>
      )}
      
      <Text style={styles.reviewCount}>
        Reviewed: {entry.review_count}x
      </Text>
    </ClayCard>
  );
};

const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  word: { ...FONT.sizes.xl, ...FONT.weights.bold, color: BRAND.deepSlate },
  translation: { ...FONT.sizes.md, color: BRAND.mediumGray, marginTop: 4 },
  topic: { ...FONT.sizes.sm, color: BRAND.skyBlue, marginTop: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { ...FONT.sizes.xs, ...FONT.weights.bold, color: '#FFF' },
  dueBadge: { fontSize: 16 },
  reviewCount: { ...FONT.sizes.xs, color: BRAND.lightGray, marginTop: 8 },
});
```

- [ ] **Step 3: Create NotebookScreen**

```typescript
// mobile/rn/src/screens/NotebookScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useNotebook, NotebookEntry } from '../hooks/useNotebook';
import { NotebookCard } from '../components/notebook/NotebookCard';
import { ClayCard } from '../components/clay/ClayCard';
import { BRAND, FONT, SPACING } from '../design/tokens';

const TOPICS = ['All', 'Animals', 'Food', 'Nature', 'Travel'];

export const NotebookScreen: React.FC = () => {
  const { entries, loading, fetchEntries, deleteEntry } = useNotebook();
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchEntries({ topic: selectedTopic === 'All' ? undefined : selectedTopic });
  }, [selectedTopic]);

  const filteredEntries = entries.filter(entry => 
    entry.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.translation_vi.includes(searchQuery)
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📓 Sổ tay</Text>
        <Text style={styles.subtitle}>Your vocabulary collection</Text>
      </View>

      {/* Search */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search words..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* Topic Filter */}
      <FlatList
        horizontal
        data={TOPICS}
        keyExtractor={item => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.topicChip, selectedTopic === item && styles.topicChipActive]}
            onPress={() => setSelectedTopic(item)}
          >
            <Text style={[styles.topicChipText, selectedTopic === item && styles.topicChipTextActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
        showsHorizontalScrollIndicator={false}
        style={styles.topicList}
      />

      {/* Word List */}
      <FlatList
        data={filteredEntries}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <NotebookCard
            entry={item}
            onPress={() => {/* Navigate to detail */}}
            onLongPress={() => deleteEntry(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No words saved yet</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.backgroundBase, padding: SPACING.base },
  header: { marginBottom: SPACING.lg },
  title: { ...FONT.sizes.xxl, ...FONT.weights.black, color: BRAND.deepSlate },
  subtitle: { ...FONT.sizes.md, color: BRAND.mediumGray },
  searchInput: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: SPACING.md },
  topicList: { marginBottom: SPACING.md },
  topicChip: { backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  topicChipActive: { backgroundColor: BRAND.skyBlue },
  topicChipText: { ...FONT.sizes.sm, color: BRAND.mediumGray },
  topicChipTextActive: { color: '#FFF', ...FONT.weights.bold },
  list: { paddingBottom: 100 },
  emptyText: { textAlign: 'center', color: BRAND.lightGray, marginTop: 40 },
});
```

#### Task 6: DictionaryScreen Component

**Files:**
- Create: `mobile/rn/src/screens/DictionaryScreen.tsx`
- Create: `mobile/rn/src/components/dictionary/TranslationResult.tsx`
- Create: `mobile/rn/src/hooks/useTranslation.ts`
- Modify: `mobile/rn/src/navigation/AppNavigator.tsx`

**Interfaces:**
- Consumes: `POST /api/v1/dictionary/translate`
- Produces: DictionaryScreen with AI translation

- [ ] **Step 1: Create useTranslation hook**

```typescript
// mobile/rn/src/hooks/useTranslation.ts
import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';

export interface TranslationResult {
  original: string;
  translation: {
    vi: string;
    literalTranslation?: string;
    contextualNote?: string;
  };
  wordBreakdown?: Array<{
    word: string;
    pronunciation: string;
    partOfSpeech: string;
    translation: string;
  }>;
  contextSources?: Array<{ docId: string; snippet: string }>;
}

export function useTranslation() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const translate = useCallback(async (text: string, context?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/v1/dictionary/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text, context, target_lang: 'vi' })
      });
      
      if (!response.ok) throw new Error('Translation failed');
      const data = await response.json();
      setResult(data);
    } catch (e) {
      setError('Could not translate. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  return { translate, result, loading, error };
}
```

- [ ] **Step 2: Create TranslationResult component**

```typescript
// mobile/rn/src/components/dictionary/TranslationResult.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ClayCard } from '../clay/ClayCard';
import { BRAND, FONT } from '../../design/tokens';

interface TranslationResultProps {
  result: {
    original: string;
    translation: {
      vi: string;
      literalTranslation?: string;
      contextualNote?: string;
    };
    wordBreakdown?: Array<{
      word: string;
      pronunciation: string;
      partOfSpeech: string;
      translation: string;
    }>;
  };
  onSaveToNotebook?: () => void;
}

export const TranslationResult: React.FC<TranslationResultProps> = ({ result, onSaveToNotebook }) => {
  return (
    <ClayCard size="lg" color="warmWhite" style={styles.card}>
      {/* Original */}
      <View style={styles.section}>
        <Text style={styles.label}>English</Text>
        <Text style={styles.originalText}>{result.original}</Text>
      </View>

      {/* Translation */}
      <View style={[styles.section, styles.translationSection]}>
        <Text style={styles.label}>Tiếng Việt</Text>
        <Text style={styles.translationText}>{result.translation.vi}</Text>
      </View>

      {/* Literal Translation */}
      {result.translation.literalTranslation && (
        <View style={styles.section}>
          <Text style={styles.label}>Literal</Text>
          <Text style={styles.literalText}>{result.translation.literalTranslation}</Text>
        </View>
      )}

      {/* Context Note */}
      {result.translation.contextualNote && (
        <View style={styles.section}>
          <Text style={styles.label}>💡 Note</Text>
          <Text style={styles.noteText}>{result.translation.contextualNote}</Text>
        </View>
      )}

      {/* Word Breakdown */}
      {result.wordBreakdown && result.wordBreakdown.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>📖 Word Breakdown</Text>
          {result.wordBreakdown.map((word, index) => (
            <View key={index} style={styles.wordRow}>
              <Text style={styles.wordText}>{word.word}</Text>
              <Text style={styles.phoneticText}>{word.pronunciation}</Text>
              <Text style={styles.posText}>({word.partOfSpeech})</Text>
              <Text style={styles.wordTransText}>{word.translation}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      {onSaveToNotebook && (
        <TouchableOpacity style={styles.saveButton} onPress={onSaveToNotebook}>
          <Text style={styles.saveButtonText}>📓 Save to Notebook</Text>
        </TouchableOpacity>
      )}
    </ClayCard>
  );
};

const styles = StyleSheet.create({
  card: { padding: 16, marginTop: 16 },
  section: { marginBottom: 12 },
  translationSection: { backgroundColor: BRAND.skyBlueLight + '30', padding: 12, borderRadius: 12 },
  label: { ...FONT.sizes.xs, ...FONT.weights.bold, color: BRAND.mediumGray, marginBottom: 4 },
  originalText: { ...FONT.sizes.lg, ...FONT.weights.bold, color: BRAND.deepSlate },
  translationText: { ...FONT.sizes.xl, ...FONT.weights.bold, color: BRAND.skyBlue },
  literalText: { ...FONT.sizes.sm, color: BRAND.mediumGray, fontStyle: 'italic' },
  noteText: { ...FONT.sizes.sm, color: BRAND.deepSlate },
  wordRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  wordText: { ...FONT.sizes.md, ...FONT.weights.bold, color: BRAND.deepSlate },
  phoneticText: { ...FONT.sizes.sm, color: BRAND.lightGray },
  posText: { ...FONT.sizes.xs, color: BRAND.mediumGray },
  wordTransText: { ...FONT.sizes.sm, color: BRAND.mintGreen },
  saveButton: { backgroundColor: BRAND.sunshineYellow, padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  saveButtonText: { ...FONT.sizes.md, ...FONT.weights.bold, color: BRAND.deepSlate },
});
```

- [ ] **Step 3: Create DictionaryScreen**

```typescript
// mobile/rn/src/screens/DictionaryScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from '../hooks/useTranslation';
import { useNotebook } from '../hooks/useNotebook';
import { TranslationResult } from '../components/dictionary/TranslationResult';
import { ClayCard } from '../components/clay/ClayCard';
import { BRAND, FONT, SPACING } from '../design/tokens';

export const DictionaryScreen: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [contextText, setContextText] = useState('');
  const { translate, result, loading, error } = useTranslation();
  const { addEntry } = useNotebook();

  const handleTranslate = () => {
    if (inputText.trim()) {
      translate(inputText, contextText || undefined);
    }
  };

  const handleSaveToNotebook = () => {
    if (result) {
      addEntry({
        word: result.original,
        translation_vi: result.translation.vi,
        source: 'ai_translation',
        context: result.translation.contextualNote,
        topic: 'ai-saved',
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🔤 Tra từ</Text>
        <Text style={styles.subtitle}>AI-powered contextual translation</Text>
      </View>

      {/* Input */}
      <ClayCard size="md" color="warmWhite" style={styles.inputCard}>
        <Text style={styles.inputLabel}>English text</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter word or sentence..."
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        
        <Text style={styles.inputLabel}>Context (optional)</Text>
        <TextInput
          style={styles.contextInput}
          placeholder="Add context for better translation..."
          value={contextText}
          onChangeText={setContextText}
          multiline
        />

        <TouchableOpacity
          style={[styles.translateButton, !inputText.trim() && styles.translateButtonDisabled]}
          onPress={handleTranslate}
          disabled={!inputText.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.translateButtonText}>Translate ✨</Text>
          )}
        </TouchableOpacity>
      </ClayCard>

      {/* Error */}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {/* Result */}
      {result && (
        <TranslationResult
          result={result}
          onSaveToNotebook={handleSaveToNotebook}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.backgroundBase, padding: SPACING.base },
  header: { marginBottom: SPACING.lg },
  title: { ...FONT.sizes.xxl, ...FONT.weights.black, color: BRAND.deepSlate },
  subtitle: { ...FONT.sizes.md, color: BRAND.mediumGray },
  inputCard: { padding: 16 },
  inputLabel: { ...FONT.sizes.sm, ...FONT.weights.bold, color: BRAND.mediumGray, marginBottom: 4, marginTop: 8 },
  textInput: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, minHeight: 80, textAlignVertical: 'top' },
  contextInput: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, minHeight: 60, textAlignVertical: 'top' },
  translateButton: { backgroundColor: BRAND.electricPurple, padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  translateButtonDisabled: { backgroundColor: BRAND.lightGray },
  translateButtonText: { ...FONT.sizes.md, ...FONT.weights.bold, color: '#FFF' },
  errorText: { color: BRAND.coralPink, marginTop: 8, textAlign: 'center' },
});
```

#### Task 7: SwipeFlashcardsScreen Component

**Files:**
- Create: `mobile/rn/src/screens/SwipeFlashcardsScreen.tsx`
- Create: `mobile/rn/src/components/flashcards/SwipeCard.tsx`
- Create: `mobile/rn/src/components/flashcards/SwipeableStack.tsx`
- Create: `mobile/rn/src/hooks/useVocabularyTopics.ts`
- Modify: `mobile/rn/src/navigation/AppNavigator.tsx`

**Interfaces:**
- Consumes: `GET /api/v1/vocabulary/topics`, `GET /api/v1/vocabulary/topic/{topic_id}`
- Produces: TikTok-style vertical swipe flashcards

- [ ] **Step 1: Create useVocabularyTopics hook**

```typescript
// mobile/rn/src/hooks/useVocabularyTopics.ts
import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';

export interface VocabularyTopic {
  id: string;
  name: string;
  name_vi: string;
  icon: string;
  color: string;
  card_count: number;
  difficulty_range: string;
}

export interface SwipeFlashcard {
  id: string;
  word: string;
  pronunciation: string;
  translation: string;
  image_url?: string;
  audio_url?: string;
  example_sentence: string;
  example_translation: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  word_type: string;
}

export function useVocabularyTopics() {
  const { token } = useAuth();
  const [topics, setTopics] = useState<VocabularyTopic[]>([]);
  const [cards, setCards] = useState<SwipeFlashcard[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTopics = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/vocabulary/topics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setTopics(data.topics);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchCards = useCallback(async (topicId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/vocabulary/topic/${topicId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setCards(data.cards);
    } finally {
      setLoading(false);
    }
  }, [token]);

  return { topics, cards, loading, fetchTopics, fetchCards };
}
```

- [ ] **Step 2: Create SwipeCard component**

```typescript
// mobile/rn/src/components/flashcards/SwipeCard.tsx
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { ClayCard } from '../clay/ClayCard';
import { BRAND, FONT } from '../../design/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;

interface SwipeCardProps {
  card: {
    word: string;
    pronunciation: string;
    translation: string;
    image_url?: string;
    example_sentence: string;
    example_translation: string;
    difficulty: 'easy' | 'medium' | 'hard';
  };
  onTap: () => void;
}

const difficultyColors = {
  easy: BRAND.mintGreen,
  medium: BRAND.vibrantOrange,
  hard: BRAND.coralPink,
};

export const SwipeCard: React.FC<SwipeCardProps> = ({ card, onTap }) => {
  const handlePress = () => {
    // Play audio if available
    onTap();
  };

  return (
    <ClayCard
      size="lg"
      color="warmWhite"
      style={styles.card}
      onClick={handlePress}
    >
      {/* Topic Badge */}
      <View style={[styles.difficultyBadge, { backgroundColor: difficultyColors[card.difficulty] }]}>
        <Text style={styles.difficultyText}>{card.difficulty}</Text>
      </View>

      {/* Main Word */}
      <Text style={styles.word}>{card.word}</Text>
      <Text style={styles.pronunciation}>{card.pronunciation}</Text>

      {/* 3D Model Placeholder - would use Three.js in production */}
      <View style={styles.imageContainer}>
        {card.image_url ? (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>3D Model</Text>
          </View>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.emoji}>🐾</Text>
          </View>
        )}
      </View>

      {/* Translation */}
      <Text style={styles.translation}>{card.translation}</Text>

      {/* Example */}
      <View style={styles.exampleContainer}>
        <Text style={styles.exampleSentence}>{card.example_sentence}</Text>
        <Text style={styles.exampleTranslation}>{card.example_translation}</Text>
      </View>

      {/* Swipe Hints */}
      <View style={styles.hints}>
        <Text style={styles.hint}>⬆️ Know it</Text>
        <Text style={styles.hint}>⬇️ Review</Text>
        <Text style={styles.hint}>➡️ Save</Text>
      </View>
    </ClayCard>
  );
};

const styles = StyleSheet.create({
  card: { width: CARD_WIDTH, padding: 24, alignItems: 'center' },
  difficultyBadge: { position: 'absolute', top: 16, right: 16, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  difficultyText: { ...FONT.sizes.xs, ...FONT.weights.bold, color: '#FFF' },
  word: { ...FONT.sizes.xxxxl, ...FONT.weights.black, color: BRAND.deepSlate, marginTop: 40 },
  pronunciation: { ...FONT.sizes.lg, color: BRAND.mediumGray, marginTop: 4 },
  imageContainer: { width: '100%', height: 200, marginVertical: 24 },
  imagePlaceholder: { flex: 1, backgroundColor: BRAND.skyBlueLight + '40', borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  imagePlaceholderText: { ...FONT.sizes.sm, color: BRAND.skyBlue },
  emoji: { fontSize: 80 },
  translation: { ...FONT.sizes.xxl, ...FONT.weights.bold, color: BRAND.skyBlue },
  exampleContainer: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginTop: 16, width: '100%' },
  exampleSentence: { ...FONT.sizes.md, color: BRAND.deepSlate, fontStyle: 'italic' },
  exampleTranslation: { ...FONT.sizes.sm, color: BRAND.mediumGray, marginTop: 4 },
  hints: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 16 },
  hint: { ...FONT.sizes.sm, color: BRAND.lightGray },
});
```

- [ ] **Step 3: Create SwipeFlashcardsScreen**

```typescript
// mobile/rn/src/screens/SwipeFlashcardsScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { useVocabularyTopics, SwipeFlashcard } from '../hooks/useVocabularyTopics';
import { SwipeCard } from '../components/flashcards/SwipeCard';
import { useNotebook } from '../hooks/useNotebook';
import { ClayCard } from '../components/clay/ClayCard';
import { BRAND, FONT, SPACING } from '../design/tokens';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 100;

export const SwipeFlashcardsScreen: React.FC = () => {
  const { topics, cards, loading, fetchTopics, fetchCards } = useVocabularyTopics();
  const { addEntry } = useNotebook();
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    fetchTopics();
  }, []);

  const currentCard = cards[currentIndex];

  const handleSwipe = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!currentCard) return;

    if (direction === 'right') {
      // Save to notebook
      addEntry({
        word: currentCard.word,
        translation_vi: currentCard.translation,
        source: 'flashcard',
        topic: currentCard.topic,
      });
    } else if (direction === 'up') {
      // Mark as known (quality 4)
      // submitReview with quality 4
    } else if (direction === 'down') {
      // Mark for review (quality 2)
      // submitReview with quality 2
    }

    // Move to next card
    setCurrentIndex(prev => prev + 1);
  }, [currentCard, addEntry]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (Math.abs(event.translationY) > SWIPE_THRESHOLD) {
        const direction = event.translationY < 0 ? 'up' : 'down';
        runOnJS(handleSwipe)(direction);
      } else if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        const direction = event.translationX > 0 ? 'right' : 'left';
        runOnJS(handleSwipe)(direction);
      }
      
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${translateX.value / 20}deg` },
    ],
  }));

  const handleTopicSelect = (topicId: string) => {
    fetchCards(topicId);
    setCurrentIndex(0);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📚 Luyện từ</Text>
        <Text style={styles.subtitle}>Swipe to learn vocabulary</Text>
      </View>

      {/* Topic Selector */}
      {cards.length === 0 && (
        <FlatList
          data={topics}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.topicCard]}
              onPress={() => handleTopicSelect(item.id)}
            >
              <ClayCard size="sm" color="warmWhite" style={styles.topicInner}>
                <Text style={styles.topicIcon}>{item.icon}</Text>
                <Text style={styles.topicName}>{item.name}</Text>
                <Text style={styles.topicCount}>{item.card_count} cards</Text>
              </ClayCard>
            </TouchableOpacity>
          )}
          style={styles.topicList}
          contentContainerStyle={styles.topicListContent}
        />
      )}

      {/* Flashcard Stack */}
      {cards.length > 0 && currentIndex < cards.length && (
        <View style={styles.cardContainer}>
          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.cardWrapper, animatedStyle]}>
              <SwipeCard
                card={cards[currentIndex]}
                onTap={() => {/* Play audio */}}
              />
            </Animated.View>
          </GestureDetector>

          {/* Progress */}
          <View style={styles.progress}>
            <Text style={styles.progressText}>
              {currentIndex + 1} / {cards.length}
            </Text>
          </View>
        </View>
      )}

      {/* Empty State */}
      {cards.length > 0 && currentIndex >= cards.length && (
        <View style={styles.completeContainer}>
          <Text style={styles.completeEmoji}>🎉</Text>
          <Text style={styles.completeTitle}>Complete!</Text>
          <Text style={styles.completeSubtitle}>You've reviewed all cards in this topic</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => setCards([])}>
            <Text style={styles.backButtonText}>Choose Another Topic</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.backgroundBase },
  header: { padding: SPACING.base, paddingTop: 60 },
  title: { ...FONT.sizes.xxl, ...FONT.weights.black, color: BRAND.deepSlate },
  subtitle: { ...FONT.sizes.md, color: BRAND.mediumGray },
  topicList: { maxHeight: 140 },
  topicListContent: { paddingHorizontal: SPACING.base },
  topicCard: { marginRight: 12 },
  topicInner: { width: 120, padding: 12, alignItems: 'center' },
  topicIcon: { fontSize: 32, marginBottom: 8 },
  topicName: { ...FONT.sizes.sm, ...FONT.weights.bold, color: BRAND.deepSlate, textAlign: 'center' },
  topicCount: { ...FONT.sizes.xs, color: BRAND.mediumGray, marginTop: 4 },
  cardContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardWrapper: { alignItems: 'center' },
  progress: { marginTop: 16 },
  progressText: { ...FONT.sizes.md, color: BRAND.mediumGray },
  completeContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  completeEmoji: { fontSize: 80 },
  completeTitle: { ...FONT.sizes.xxl, ...FONT.weights.bold, color: BRAND.deepSlate, marginTop: 16 },
  completeSubtitle: { ...FONT.sizes.md, color: BRAND.mediumGray, marginTop: 8 },
  backButton: { backgroundColor: BRAND.skyBlue, padding: 16, borderRadius: 16, marginTop: 24 },
  backButtonText: { ...FONT.sizes.md, ...FONT.weights.bold, color: '#FFF' },
});
```

### Phase 3: Golden Moment Notifications

#### Task 8: Push Notification System

**Files:**
- Create: `mobile/rn/src/services/NotificationService.ts`
- Create: `mobile/rn/src/hooks/useNotificationSchedule.ts`
- Modify: `mobile/rn/src/App.tsx` (add notification permissions)

**Interfaces:**
- Consumes: Expo Notifications API
- Produces: Scheduled local notifications for vocabulary review

- [ ] **Step 1: Create NotificationService**

```typescript
// mobile/rn/src/services/NotificationService.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface NotificationSchedule {
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  time?: string;        // HH:mm
  dayOfWeek?: number;  // 0-6
  dayOfMonth?: number; // 1-31
  maxCards: number;
}

export class NotificationService {
  private static instance: NotificationService;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  }

  async scheduleVocabularyReminder(
    cardCount: number,
    urgentCards: number
  ): Promise<string | null> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return null;

    // Cancel existing vocabulary notifications
    await this.cancelVocabularyNotifications();

    const content: Notifications.NotificationContentInput = {
      title: '📚 Time to review!',
      body: urgentCards > 0
        ? `You have ${urgentCards} overdue words to review!`
        : `${cardCount} words are waiting for review`,
      data: { type: 'vocabulary_review', cardCount, urgentCards },
      sound: true,
    };

    const trigger: Notifications.NotificationTriggerInput = {
      seconds: 60 * 60, // 1 hour from now (would use actual schedule in production)
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    };

    const notificationId = await Notifications.scheduleNotificationAsync({
      content,
      trigger,
    });

    return notificationId;
  }

  async cancelVocabularyNotifications(): Promise<void> {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      if (notification.content.data?.type === 'vocabulary_review') {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  }

  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.EventSubscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.EventSubscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }
}

export const notificationService = NotificationService.getInstance();
```

- [ ] **Step 2: Create useNotificationSchedule hook**

```typescript
// mobile/rn/src/hooks/useNotificationSchedule.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { notificationService } from '../services/NotificationService';

interface ReviewSchedule {
  enabled: boolean;
  timezone: string;
  windows: Array<{
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
    time?: string;
    dayOfWeek?: number;
    maxCards: number;
  }>;
}

interface DueCards {
  totalCount: number;
  urgentCount: number;
  cards: Array<{
    id: string;
    word: string;
    translation_vi: string;
    next_review_at: string;
  }>;
}

export function useNotificationSchedule() {
  const { token } = useAuth();
  const [schedule, setSchedule] = useState<ReviewSchedule | null>(null);
  const [dueCards, setDueCards] = useState<DueCards | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch schedule from backend
  const fetchSchedule = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/notifications/schedule`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setSchedule(data);
    } catch (e) {
      console.error('Failed to fetch schedule:', e);
    }
  }, [token]);

  // Fetch due cards
  const fetchDueCards = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/notifications/due`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setDueCards(data);
      
      // Schedule notification if there are cards due
      if (data.totalCount > 0) {
        await notificationService.scheduleVocabularyReminder(
          data.totalCount,
          data.urgentCount
        );
      }
    } catch (e) {
      console.error('Failed to fetch due cards:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Update schedule
  const updateSchedule = useCallback(async (newSchedule: ReviewSchedule) => {
    try {
      await fetch(`${API_BASE}/api/v1/notifications/schedule`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newSchedule)
      });
      setSchedule(newSchedule);
    } catch (e) {
      console.error('Failed to update schedule:', e);
    }
  }, [token]);

  // Toggle notifications
  const toggleNotifications = useCallback(async (enabled: boolean) => {
    if (!schedule) return;
    
    if (!enabled) {
      await notificationService.cancelVocabularyNotifications();
    }
    
    await updateSchedule({ ...schedule, enabled });
  }, [schedule, updateSchedule]);

  useEffect(() => {
    fetchSchedule();
    fetchDueCards();

    // Set up notification response listener
    const subscription = notificationService.addNotificationResponseListener((response) => {
      if (response.notification.request.content.data?.type === 'vocabulary_review') {
        // Navigate to review screen
        // navigation.navigate('SwipeFlashcards');
      }
    });

    return () => subscription.remove();
  }, [fetchSchedule, fetchDueCards]);

  return {
    schedule,
    dueCards,
    loading,
    fetchDueCards,
    updateSchedule,
    toggleNotifications,
  };
}
```

---

## Summary

| Task | Description | Complexity |
|------|-------------|------------|
| 1 | Database Schema Migration | Low |
| 2 | Notebook CRUD API | Medium |
| 3 | Dictionary Translation API | Medium |
| 4 | Vocabulary Topics API | Low |
| 5 | NotebookScreen Component | Medium |
| 6 | DictionaryScreen Component | Medium |
| 7 | SwipeFlashcardsScreen | High |
| 8 | Push Notification System | Medium |

**Total: 8 tasks**

Each task is self-contained and can be verified independently.
