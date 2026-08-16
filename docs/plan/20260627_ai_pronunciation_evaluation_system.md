# AI Pronunciation Evaluation System - Architecture Design

**Date:** 2026-06-27  
**Status:** Architecture Design  
**Mode:** YOLO

---

## Executive Summary

This document outlines a comprehensive architecture for an AI-powered pronunciation evaluation system that enables children to practice English pronunciation through interactive exercises. The system leverages text-to-speech (TTS) for audio prompts, speech-to-text (STT) for capturing user responses, and AI-powered scoring algorithms to provide real-time feedback with encouraging messages.

**Key Design Decisions:**
- **TTS:** Google Cloud TTS (primary) with Coqui XTTS v2 (offline fallback)
- **STT:** faster-whisper (server-side, already implemented) + Web Speech API (client-side)
- **Scoring:** Multi-factor algorithm combining similarity, confidence, and phoneme analysis
- **Integration:** Seamless connection with existing `CourseLesson` and `PronunciationTask` models

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React/TypeScript)                        │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐   │
│  │ Pronunciation   │  │ Audio Player     │  │ Score Display +         │   │
│  │ Practice Card   │  │ Component        │  │ Feedback Animation       │   │
│  └────────┬────────┘  └────────┬─────────┘  └───────────┬──────────────┘   │
│           │                     │                         │                  │
└───────────┼─────────────────────┼─────────────────────────┼──────────────────┘
            │                     │                         │
            │ REST API            │ Audio Stream            │ WebSocket
            ▼                     ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (FastAPI/Python)                           │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        PRONUNCIATION SERVICE                          │  │
│  │  ┌──────────────┐  ┌─────────────────┐  ┌────────────────────────┐  │  │
│  │  │ TTS Module   │  │ Scoring Engine  │  │ Feedback Generator      │  │  │
│  │  │ - Google TTS│  │ - Similarity    │  │ - AI (Gemini)           │  │  │
│  │  │ - Coqui XTTS │  │ - Phoneme Match │  │ - Template Fallback     │  │  │
│  │  └──────────────┘  └─────────────────┘  └────────────────────────┘  │  │
│  │                                                                      │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │                 SPEECH PROCESSING SERVICE                       │  │  │
│  │  │  ┌──────────────────┐  ┌───────────────────────────────────┐  │  │  │
│  │  │  │ faster-whisper    │  │ Audio Preprocessor                │  │  │  │
│  │  │  │ (Server STT)      │  │ - Format conversion              │  │  │  │
│  │  │  │                   │  │ - Noise reduction                │  │  │  │
│  │  │  │                   │  │ - VAD filter                     │  │  │  │
│  │  │  └──────────────────┘  └───────────────────────────────────┘  │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────────┐   │
│  │ MongoDB        │  │ Supabase       │  │ Redis Cache               │   │
│  │ - Attempts     │  │ Storage        │   │ - TTS Cache              │   │
│  │ - Progress     │  │ - Audio Files  │   │ - Session Data           │   │
│  └────────────────┘  └────────────────┘  └────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Specifications

### 2.1 TTS (Text-to-Speech) Integration

#### Option A: Google Cloud TTS (Primary)

**Pros:**
- High-quality neural voices
- Multiple languages and voice variants
- Streaming synthesis for low latency
- Reliable SLA

**Cons:**
- Requires API key and costs per character
- Network dependency

**Implementation:**
```python
# backend/services/tts_service.py
from google.cloud import texttospeech
from settings import settings

class TTSService:
    def __init__(self):
        self.client = texttospeech.TextToSpeechClient()
        
    async def synthesize_speech(
        self, 
        text: str, 
        language_code: str = "en-US",
        voice_name: str = "en-US-Neural2-F"
    ) -> bytes:
        synthesis_input = texttospeech.SynthesisInput(text=text)
        voice = texttospeech.VoiceSelectionParams(
            language_code=language_code,
            name=voice_name,
        )
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=0.85,  # Slower for kids
            pitch=0.0,
        )
        response = self.client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config,
        )
        return response.audio_content
```

**Cost Estimate:**
- Neural2 voices: $16/1M characters
- Free tier: 500K characters/month

#### Option B: Coqui XTTS v2 (Offline Fallback)

**Pros:**
- Self-hosted, no API costs
- Custom voice cloning possible
- Works offline

**Cons:**
- Higher CPU/memory usage
- Setup complexity
- Quality slightly below Google

**Implementation:**
```python
# backend/services/tts_service.py
from TTS.api import TTS

class CoquiTTSService:
    def __init__(self):
        self.tts = TTS(model_name="tts_models/multilingual/multi-dataset/xtts_v2")
        
    async def synthesize_speech(self, text: str, speaker_wav: str = None) -> bytes:
        # Use default English speaker if no custom voice
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            self.tts.tts_to_file(text=text, file_path=f.name)
            audio_bytes = f.read()
        return audio_bytes
```

#### Recommended Strategy

| Environment | Primary TTS | Fallback |
|-------------|-------------|----------|
| Production | Google Cloud TTS | Coqui XTTS |
| Development | Google Cloud TTS | Mock TTS |
| Offline Mode | Coqui XTTS | - |

---

### 2.2 Speech-to-Text (STT)

The system already has `SpeechProcessingService` using faster-whisper. Enhancement recommendations:

```python
# backend/services/speech_processing_service.py (Enhanced)

# Add language-specific models
MODELS = {
    "en": "base.en",      # English-optimized
    "vi": "base",         # Multilingual
    "auto": "tiny",       # Auto-detect (lightweight)
}

class EnhancedSpeechProcessingService:
    
    async def transcribe_with_phonemes(
        self, 
        audio_data: bytes,
        target_word: str,
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Enhanced transcription that also returns phoneme-level data.
        Useful for detailed pronunciation analysis.
        """
        # Standard transcription
        text, confidence = await self.transcribe_audio(audio_data, language)
        
        # Phoneme-level analysis (using phonemizer + audio analysis)
        phoneme_data = await self.analyze_phonemes(audio_data, target_word)
        
        return {
            "text": text,
            "confidence": confidence,
            "phonemes": phoneme_data,
            "target_phonemes": self.get_phonemes(target_word),
        }
```

---

### 2.3 Pronunciation Scoring Algorithm

The scoring system uses a multi-factor approach:

```python
# backend/services/scoring_service.py
from typing import Dict, Any, List
import re
from dataclasses import dataclass

@dataclass
class ScoreComponents:
    similarity_score: float      # Levenshtein/phonetic similarity
    confidence_score: float      # STT confidence
    completeness_score: float    # Did they say all words?
    bonus_score: float           # Kid-friendly adjustments

class PronunciationScoringService:
    """
    Multi-factor pronunciation scoring for children.
    
    Score Components:
    - Similarity (40%): Text matching with fuzzy matching
    - Confidence (20%): STT confidence score
    - Completeness (30%): All target words spoken
    - Bonus (10%): Kid-friendly adjustments
    """
    
    # Phonetic mappings for common substitutions
    PHONETIC_VARIATIONS = {
        "th": ["t", "d", "s", "z"],
        "r": ["l", "w"],
        "l": ["r", "ll"],
        "v": ["b", "w"],
        "w": ["v"],
        "sh": ["s", "ch", "sk"],
    }
    
    def calculate_score(
        self,
        target_text: str,
        spoken_text: str,
        stt_confidence: float,
        language: str = "en"
    ) -> Dict[str, Any]:
        components = ScoreComponents(
            similarity_score=self._calculate_similarity(target_text, spoken_text),
            confidence_score=stt_confidence,
            completeness_score=self._calculate_completeness(target_text, spoken_text),
            bonus_score=0.0
        )
        
        # Apply kid bonus for near-misses
        if 0.6 <= components.similarity_score < 0.8:
            components.bonus_score = 0.1  # +10% for trying
        
        # Weighted final score
        final_score = (
            components.similarity_score * 0.40 +
            components.confidence_score * 0.20 +
            components.completeness_score * 0.30 +
            components.bonus_score * 0.10
        )
        
        # Convert to 0-100 scale
        final_score = min(100, max(0, round(final_score * 100)))
        
        return {
            "score": final_score,
            "components": {
                "similarity": round(components.similarity_score * 100, 1),
                "confidence": round(components.confidence_score * 100, 1),
                "completeness": round(components.completeness_score * 100, 1),
                "bonus": round(components.bonus_score * 100, 1),
            },
            "grade": self._score_to_grade(final_score),
            "stars": self._score_to_stars(final_score),
        }
    
    def _calculate_similarity(self, target: str, spoken: str) -> float:
        """
        Calculate phonetic similarity between target and spoken text.
        Uses multiple methods for robustness.
        """
        target_lower = target.lower().strip()
        spoken_lower = spoken.lower().strip()
        
        # Exact match
        if target_lower == spoken_lower:
            return 1.0
        
        # Contains check (handles "the cat" vs "cat")
        if target_lower in spoken_lower or spoken_lower in target_lower:
            return 0.95
        
        # Levenshtein distance
        levenshtein_score = self._levenshtein_similarity(target_lower, spoken_lower)
        
        # Phonetic matching for common substitutions
        phonetic_score = self._phonetic_similarity(target_lower, spoken_lower)
        
        # Combine scores
        return max(levenshtein_score, phonetic_score)
    
    def _levenshtein_similarity(self, s1: str, s2: str) -> float:
        if not s1 or not s2:
            return 0.0
        
        # Simple word-level comparison
        words1 = set(s1.split())
        words2 = set(s2.split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = words1 & words2
        union = words1 | words2
        
        # Jaccard similarity at word level
        jaccard = len(intersection) / len(union) if union else 0
        
        # Length penalty
        len_ratio = min(len(s1), len(s2)) / max(len(s1), len(s2))
        
        return (jaccard * 0.6 + len_ratio * 0.4)
    
    def _phonetic_similarity(self, target: str, spoken: str) -> float:
        """
        Check for common phonetic substitutions.
        """
        score = 0.0
        count = 0
        
        for phoneme, variations in self.PHONETIC_VARIATIONS.items():
            for var in variations:
                # Check if substitution occurred
                if phoneme in target and var in spoken:
                    # Check if the position roughly matches
                    target_pos = target.find(phoneme)
                    spoken_pos = spoken.find(var)
                    if abs(target_pos - spoken_pos) <= 2:
                        score += 0.15
                        count += 1
                elif var in target and phoneme in spoken:
                    target_pos = target.find(var)
                    spoken_pos = spoken.find(phoneme)
                    if abs(target_pos - spoken_pos) <= 2:
                        score += 0.15
                        count += 1
        
        return min(1.0, score)
    
    def _calculate_completeness(self, target: str, spoken: str) -> float:
        """
        Check if all target words were spoken.
        """
        target_words = set(target.lower().split())
        spoken_words = set(spoken.lower().split())
        
        if not target_words:
            return 1.0
        
        matched = len(target_words & spoken_words)
        return matched / len(target_words)
    
    def _score_to_grade(self, score: int) -> str:
        if score >= 90: return "excellent"
        if score >= 75: return "good"
        if score >= 60: return "needs_practice"
        return "try_again"
    
    def _score_to_stars(self, score: int) -> int:
        if score >= 90: return 3
        if score >= 70: return 2
        return 1
```

---

### 2.4 AI Feedback Generator

The system already has `analyze_pronunciation` in `AIService`. Enhanced version:

```python
# backend/services/feedback_service.py (Enhanced)

class EnhancedFeedbackService:
    """
    AI-powered pronunciation feedback with fallback strategies.
    """
    
    # Prompt templates for different score ranges
    FEEDBACK_PROMPTS = {
        "excellent": """
        A child just scored {score}/100 on their English pronunciation!
        Target word: "{target}"
        They said: "{spoken}"
        
        Generate encouraging feedback:
        - 3 stars celebration
        - Mention what they did well
        - Keep it short and fun (under 20 words)
        - Use emoji
        
        Return ONLY valid JSON:
        {{"message": "...", "emoji": "..."}}
        """,
        "good": """
        A child scored {score}/100 on pronunciation.
        Target: "{target}"
        They said: "{spoken}"
        
        Generate supportive feedback:
        - 2 stars
        - Gentle encouragement
        - Maybe one specific tip
        - Keep under 20 words, use emoji
        
        Return ONLY valid JSON:
        {{"message": "...", "emoji": "..."}}
        """,
        "needs_practice": """
        A child scored {score}/100 on pronunciation.
        Target: "{target}"
        They said: "{spoken}"
        
        Generate encouraging feedback:
        - 1-2 stars
        - Don't criticize
        - Focus on what to try next
        - Short, positive, use emoji
        
        Return ONLY valid JSON:
        {{"message": "...", "emoji": "..."}}
        """
    }
    
    async def generate_feedback(
        self,
        target: str,
        spoken: str,
        score: int,
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Generate feedback using AI or templates.
        """
        # Determine category
        if score >= 90:
            category = "excellent"
        elif score >= 70:
            category = "good"
        else:
            category = "needs_practice"
        
        # Try AI first
        if settings.GOOGLE_API_KEY:
            try:
                return await self._generate_ai_feedback(
                    target, spoken, score, category
                )
            except Exception as e:
                logger.warning(f"AI feedback failed: {e}")
        
        # Fallback to templates
        return self._generate_template_feedback(target, spoken, score, category)
```

---

## 3. API Endpoints

### 3.1 Existing Endpoints (Already Implemented)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/pronunciation/attempt` | Log attempt + award XP |
| POST | `/pronunciation/ai-feedback` | Get AI feedback from Gemini |
| POST | `/pronunciation/transcribe` | Server-side STT |
| GET | `/pronunciation/transcribe/status` | Check STT availability |
| POST | `/pronunciation/feedback` | Get template-based feedback |
| GET | `/pronunciation/{user_id}/{flashcard_qr_id}/stats` | Get stats |
| GET | `/pronunciation/{user_id}/recent` | Get recent attempts |

### 3.2 New Endpoints (To Be Implemented)

```python
# backend/api/pronunciation.py (Extensions)

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional

router = APIRouter(prefix="/pronunciation", tags=["Pronunciation"])

# ═══════════════════════════════════════════════════════════════════════════
# TTS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

class TTSSynthesizeRequest(BaseModel):
    """Request to synthesize speech from text."""
    text: str = Field(..., max_length=500)
    language: str = Field(default="en-US")
    voice: str = Field(default="en-US-Neural2-F")
    speed: float = Field(default=0.85, ge=0.25, le=4.0)

class TTSSynthesizeResponse(BaseModel):
    """Response with audio URL and metadata."""
    audio_url: str
    duration_seconds: float
    format: str = "mp3"

@router.post("/tts/synthesize", response_model=TTSSynthesizeResponse)
async def synthesize_speech(
    payload: TTSSynthesizeRequest,
    tts_service: TTSService = Depends(get_tts_service),
    supabase: SupabaseStorage = Depends(get_supabase_storage)
):
    """
    Synthesize speech from text using TTS.
    
    - Caches generated audio for reuse
    - Returns public URL to audio file
    - Supports multiple voices and languages
    """
    # Generate cache key
    cache_key = hashlib.md5(
        f"{payload.text}:{payload.language}:{payload.voice}:{payload.speed}".encode()
    ).hexdigest()
    
    # Check cache
    cached = await supabase.get_cached_audio(cache_key)
    if cached:
        return TTSSynthesizeResponse(
            audio_url=cached,
            duration_seconds=0,
            format="mp3"
        )
    
    # Synthesize
    audio_bytes = await tts_service.synthesize_speech(
        text=payload.text,
        language_code=payload.language,
        voice_name=payload.voice,
        speaking_rate=payload.speed
    )
    
    # Upload to Supabase
    audio_url = await supabase.upload_audio(
        audio_bytes,
        f"tts/{cache_key}.mp3"
    )
    
    return TTSSynthesizeResponse(
        audio_url=audio_url,
        duration_seconds=len(audio_bytes) / 16000,  # Approximate
        format="mp3"
    )

# ═══════════════════════════════════════════════════════════════════════════
# ENHANCED EVALUATION ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════

class EvaluationRequest(BaseModel):
    """Complete pronunciation evaluation request."""
    user_id: str
    target_text: str
    flashcard_qr_id: Optional[str] = None
    language: str = Field(default="en")
    
    # Optional audio (for direct upload)
    audio_data: Optional[str] = None  # Base64 encoded
    audio_format: str = Field(default="webm")
    
    # Course context
    course_id: Optional[str] = None
    lesson_id: Optional[str] = None
    section_id: Optional[str] = None

class EvaluationResponse(BaseModel):
    """Complete evaluation response with all data."""
    # Transcription
    transcript: str
    confidence: float
    
    # Scoring
    score: int
    grade: str
    stars: int
    score_components: Dict[str, float]
    
    # Feedback
    feedback: str
    feedback_emoji: str
    improvement_tips: List[str]
    
    # Metadata
    audio_url: Optional[str] = None
    processing_time_ms: int

@router.post("/evaluate", response_model=EvaluationResponse)
async def evaluate_pronunciation(
    payload: EvaluationRequest,
    speech_service: SpeechProcessingService = Depends(get_speech_processing_service),
    scoring_service: PronunciationScoringService = Depends(get_scoring_service),
    feedback_service: EnhancedFeedbackService = Depends(get_feedback_service),
    repo: PronunciationRepository = Depends(get_pronunciation_repository),
    gamification_service: GamificationService = Depends(get_gamification_service),
):
    """
    Complete pronunciation evaluation pipeline.
    
    1. Transcribe audio (or use provided transcript)
    2. Calculate multi-factor score
    3. Generate AI feedback
    4. Log attempt and award XP
    5. Return comprehensive response
    
    This is the main endpoint for pronunciation practice.
    """
    start_time = time.time()
    
    # Step 1: Transcription
    if payload.audio_data:
        # Decode base64 audio
        audio_bytes = base64.b64decode(payload.audio_data)
        transcript, confidence = await speech_service.transcribe_audio(
            audio_bytes, 
            f".{payload.audio_format}"
        )
    else:
        transcript = ""
        confidence = 0.0
    
    # Step 2: Scoring
    score_result = scoring_service.calculate_score(
        target_text=payload.target_text,
        spoken_text=transcript,
        stt_confidence=confidence
    )
    
    # Step 3: Feedback
    feedback = await feedback_service.generate_feedback(
        target=payload.target_text,
        spoken=transcript,
        score=score_result["score"]
    )
    
    # Step 4: Save attempt
    attempt_data = {
        "user_id": payload.user_id,
        "flashcard_qr_id": payload.flashcard_qr_id,
        "spoken_text": transcript,
        "score": score_result["score"],
        "feedback": feedback.get("message"),
        "target_text": payload.target_text,
        "course_id": payload.course_id,
        "lesson_id": payload.lesson_id,
        "section_id": payload.section_id,
    }
    await repo.create_attempt(attempt_data)
    
    # Step 5: Award XP
    xp_result = await gamification_service.add_xp(
        user_id=payload.user_id,
        action="pronunciation_attempt",
        metadata={"score": score_result["score"]}
    )
    
    # Calculate processing time
    processing_time = int((time.time() - start_time) * 1000)
    
    return EvaluationResponse(
        transcript=transcript,
        confidence=confidence,
        score=score_result["score"],
        grade=score_result["grade"],
        stars=score_result["stars"],
        score_components=score_result["components"],
        feedback=feedback.get("message", ""),
        feedback_emoji=feedback.get("emoji", ""),
        improvement_tips=feedback.get("tips", []),
        processing_time_ms=processing_time
    )

# ═══════════════════════════════════════════════════════════════════════════
# LESSON INTEGRATION ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════

class LessonPronunciationRequest(BaseModel):
    """Pronunciation practice within a lesson context."""
    user_id: str
    lesson_id: str
    course_id: str
    section_id: str
    target_word: str
    attempt_number: int = 1
    
class LessonPronunciationResponse(BaseModel):
    """Response for lesson pronunciation practice."""
    # TTS audio for the word
    tts_audio_url: str
    
    # Word details from lesson
    word: str
    translation: Optional[str] = None
    image_url: Optional[str] = None
    
    # Scoring from previous attempt (if retry)
    previous_score: Optional[int] = None
    previous_attempts: int = 0
    
    # Task settings
    pass_score: int
    max_attempts: int = 3

@router.post("/lesson/practice", response_model=LessonPronunciationResponse)
async def get_lesson_pronunciation_practice(
    payload: LessonPronunciationRequest,
    course_service: CourseService = Depends(get_course_service),
    tts_service: TTSService = Depends(get_tts_service),
    repo: PronunciationRepository = Depends(get_pronunciation_repository),
):
    """
    Get pronunciation practice data for a lesson.
    
    Returns:
    - TTS audio URL for the target word
    - Word details (from lesson vocabulary)
    - Previous attempt stats
    - Pass criteria
    """
    # Get lesson and find the word
    lesson = await course_service.get_lesson(payload.lesson_id)
    
    # Find pronunciation task in lesson
    pron_task = None
    if lesson.pronunciation:
        pron_task = lesson.pronunciation
    else:
        # Look in vocabulary
        for vocab in lesson.vocabulary:
            if vocab.word_en.lower() == payload.target_word.lower():
                pron_task = vocab
                break
    
    if not pron_task:
        raise HTTPException(404, "Word not found in lesson")
    
    # Generate TTS audio
    audio_url = await tts_service.synthesize_and_cache(
        text=payload.target_word,
        language="en-US"
    )
    
    # Get previous attempts
    stats = await repo.get_stats(payload.user_id, payload.target_word)
    
    # Determine TTS audio
    if hasattr(pron_task, 'audio') and pron_task.audio:
        audio_url = pron_task.audio.path
    elif hasattr(pron_task, 'prompt_audio_text'):
        audio_url = await tts_service.synthesize_and_cache(
            text=pron_task.prompt_audio_text,
            language="vi-VN"  # Vietnamese instruction
        )
    
    return LessonPronunciationResponse(
        tts_audio_url=audio_url,
        word=payload.target_word,
        translation=getattr(pron_task, 'word_vi', None),
        image_url=getattr(pron_task, 'image', {}).get('path') if hasattr(pron_task, 'image') else None,
        previous_score=stats.get('best_score'),
        previous_attempts=stats.get('total_attempts', 0),
        pass_score=getattr(pron_task, 'pass_score', 70),
        max_attempts=3
    )
```

---

## 4. Database Schema

### 4.1 Existing Collections

**pronunciation_attempts** (Already exists)
```python
# backend/models/pronunciation.py
class PronunciationAttemptDocument(Document):
    user_id: Indexed(str)
    flashcard_qr_id: Indexed(str)
    spoken_text: str
    score: int  # 0-100
    feedback: Optional[str]
    audio_url: Optional[str]
    course_id: Optional[str]
    lesson_id: Optional[str]
    section_id: Optional[str]
    session_id: Optional[str]
    target_text: Optional[str]
    attempted_at: datetime
```

### 4.2 New Collections

```python
# backend/models/pronunciation.py (Add)

class PronunciationSessionDocument(Document):
    """
    Groups multiple pronunciation attempts within a lesson session.
    Collection: pronunciation_sessions
    """
    session_id: Indexed(str)
    user_id: Indexed(str)
    course_id: str
    lesson_id: str
    
    # Practice session stats
    total_attempts: int = 0
    passing_attempts: int = 0
    average_score: float = 0.0
    best_score: int = 0
    
    # Words practiced
    target_words: List[str] = Field(default_factory=list)
    
    # Timestamps
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    
    class Settings:
        name = "pronunciation_sessions"
        indexes = [
            "user_id",
            [("user_id", 1), ("course_id", 1)],
            [("user_id", 1), ("lesson_id", 1)],
        ]


class TTSCacheDocument(Document):
    """
    Caches TTS audio for reuse.
    Collection: tts_cache
    """
    cache_key: Indexed(str)
    text: str
    language: str
    voice: str
    speed: float
    
    # Audio data stored in Supabase
    audio_url: str
    duration_seconds: float
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    access_count: int = 0
    last_accessed: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "tts_cache"
        indexes = [
            "cache_key",
            [("created_at", 1)],
        ]


class PronunciationWordDocument(Document):
    """
    Master word list with phonetic data for pronunciation practice.
    Collection: pronunciation_words
    """
    word_id: Indexed(str)
    word: str
    language: str = "en"
    
    # Phonetic data
    ipa: str                           # IPA pronunciation
    phonemes: List[str] = Field(default_factory=list)
    syllable_count: int = 0
    
    # Difficulty
    difficulty: Literal["easy", "medium", "hard"] = "easy"
    
    # Audio (optional pre-recorded)
    audio_url: Optional[str] = None
    
    # Common mispronunciations
    common_errors: List[str] = Field(default_factory=list)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "pronunciation_words"
        indexes = [
            "word",
            "language",
            "difficulty",
        ]
```

---

## 5. CourseLesson Integration

### 5.1 Current Model Support

The existing `PronunciationTask` model already supports:

```python
# backend/models/course_model.py
class PronunciationTask(BaseModel):
    task_id: str
    instruction_vi: str
    prompt_audio_text: str
    target_words: List[str] = Field(min_length=1, max_length=5)
    audio: AssetReference
    pass_score: int = Field(default=70, ge=50, le=100)
    feedback_positive_vi: str
```

### 5.2 Integration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      LESSON FLOW                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. LESSON START                                                │
│     └─> Load PronunciationTask from lesson                       │
│         └─> Get target_words, pass_score                        │
│                                                                  │
│  2. WORD PRACTICE (for each word)                               │
│     │                                                            │
│     ├── Fetch TTS audio (cached or generate)                     │
│     │                                                            │
│     ├── User listens and repeats                                 │
│     │   └─> Web Speech API (Chrome) OR                           │
│     │       └─> Server Whisper (Safari/Firefox)                  │
│     │                                                            │
│     ├── Score calculation                                         │
│     │   └─> Multi-factor algorithm                               │
│     │                                                            │
│     ├── Feedback generation                                      │
│     │   └─> AI (Gemini) or template fallback                     │
│     │                                                            │
│     └── Log attempt to MongoDB                                   │
│                                                                  │
│  3. SECTION COMPLETE                                            │
│     └─> Check if all words passed (>= pass_score)                │
│         └─> Award XP and rewards                                 │
│         └─> Move to next section                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Data Flow

```
Frontend                          Backend
   │                                │
   │  POST /pronunciation/lesson/practice
   │  ──────────────────────────────────────>
   │     { lesson_id, target_word }
   │                                │
   │                                │  Fetch lesson data
   │                                │  Generate/get TTS URL
   │                                │  Check previous attempts
   │  <─────────────────────────────────────
   │     { tts_audio_url, word, pass_score, ... }
   │
│  User listens to TTS              │
│  Records their voice              │
│  ──────────────────────────────────────>
│     POST /pronunciation/evaluate  │
│     { target_text, audio_data }   │
│                                │
│                                │  Transcribe (Whisper)
│                                │  Score (Levenshtein + factors)
│                                │  Feedback (Gemini/template)
│                                │  Log attempt
│                                │  Award XP
│  <─────────────────────────────────────
│     { score, stars, feedback, ... }
│
│  Display result + next action
│  ──────────────────────────────────────>
│     POST /pronunciation/attempt (log)
```

---

## 6. Implementation Plan

### Phase 1: Core Infrastructure (Week 1)
- [ ] Implement `TTSService` with Google Cloud TTS
- [ ] Add Coqui XTTS as fallback option
- [ ] Create `PronunciationScoringService`
- [ ] Implement enhanced `EnhancedFeedbackService`
- [ ] Add new MongoDB collections

### Phase 2: API Extensions (Week 2)
- [ ] Add `/pronunciation/tts/synthesize` endpoint
- [ ] Add `/pronunciation/evaluate` endpoint
- [ ] Add `/pronunciation/lesson/practice` endpoint
- [ ] Add audio caching logic

### Phase 3: Frontend Integration (Week 3)
- [ ] Update `PronunciationService.ts` to use new endpoints
- [ ] Add TTS playback to `PronunciationPractice.tsx`
- [ ] Update `PronunciationGame.tsx` with new scoring
- [ ] Add retry logic and progress tracking

### Phase 4: Testing & Polish (Week 4)
- [ ] Load test TTS generation
- [ ] Benchmark scoring accuracy
- [ ] User acceptance testing
- [ ] Performance optimization

---

## 7. Dependencies

```txt
# requirements.txt additions

# TTS Services
google-cloud-texttospeech>=2.14.0
Coqui-TTS>=2.2.0  # Optional, for offline TTS

# Speech Processing (already present)
faster-whisper>=1.0.0

# AI Services (already present)
google-genai>=0.8.0
langchain-google-genai>=0.0.5

# Audio Processing
pydub>=0.25.0
soundfile>=0.12.0

# Caching
redis>=5.0.0
aioredis>=2.0.0
```

---

## 8. Environment Variables

```bash
# .env.example

# Google Cloud TTS
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
GOOGLE_TTS_ENABLED=true

# Coqui TTS (optional, for offline)
COQUI_TTS_MODEL=xtts_v2
COQUI_TTS_MODEL_PATH=/models/xtts_v2

# Supabase Storage
SUPABASE_TTS_BUCKET=tts-audio

# Redis Cache
REDIS_URL=redis://localhost:6379/1
TTS_CACHE_TTL_SECONDS=86400  # 24 hours

# Scoring
KID_BONUS_ENABLED=true
KID_BONUS_THRESHOLD=0.6
KID_BONUS_AMOUNT=0.1
```

---

## 9. Monitoring & Observability

```python
# Add metrics to pronunciation endpoints
from prometheus_client import Counter, Histogram, Gauge

# Metrics
pronunciation_attempts = Counter(
    'pronunciation_attempts_total',
    'Total pronunciation attempts',
    ['source', 'grade']
)

tts_requests = Histogram(
    'tts_synthesis_seconds',
    'TTS synthesis duration',
    ['provider']
)

scoring_latency = Histogram(
    'scoring_latency_seconds',
    'Scoring calculation latency'
)

active_sessions = Gauge(
    'active_pronunciation_sessions',
    'Number of active pronunciation sessions'
)
```

---

## 10. Security Considerations

1. **Audio Upload Validation**
   - Max file size: 10MB
   - Supported formats only: webm, wav, mp3, ogg, m4a
   - Content-type validation
   - Rate limiting: 10 requests/minute per user

2. **TTS Abuse Prevention**
   - Cache TTS results (text → audio mapping)
   - Rate limit synthesis: 20 requests/minute
   - Max text length: 500 characters

3. **User Data**
   - Audio files stored with user-scoped paths
   - Automatic cleanup after 30 days
   - GDPR-compliant deletion on user request

---

## 11. Cost Analysis

| Service | Free Tier | Estimated Cost |
|---------|-----------|----------------|
| Google TTS | 500K chars/month | ~$16/million chars |
| faster-whisper | Self-hosted | Server costs only |
| Supabase Storage | 1GB | $0.025/GB/month |
| MongoDB Atlas | 512MB | Free tier available |
| Gemini AI | 1M tokens | $0.125/1M tokens |

**Monthly Estimate (1,000 daily active users, 10 words each):**
- TTS: ~$5/month (150M chars)
- Storage: ~$0.50/month
- AI Feedback: ~$2/month

---

## Appendix A: Scoring Algorithm Deep Dive

### Multi-Factor Score Formula

```
Final_Score = (
    0.40 × Similarity +
    0.20 × Confidence +
    0.30 × Completeness +
    0.10 × Kid_Bonus
) × 100
```

### Score Components Explained

1. **Similarity (40%)**
   - Levenshtein distance at word level
   - Phonetic substitution detection
   - Contains/substring matching

2. **Confidence (20%)**
   - STT engine's confidence score
   - Penalizes unclear audio

3. **Completeness (30%)**
   - All target words spoken?
   - Extra words penalized slightly

4. **Kid Bonus (10%)**
   - +10% for scores between 60-80
   - Encourages retry without gaming

### Grade Thresholds

| Score Range | Grade | Stars | Message Category |
|-------------|-------|-------|------------------|
| 90-100 | excellent | 3 | Celebration |
| 75-89 | good | 2 | Encouragement |
| 60-74 | needs_practice | 1-2 | Tips |
| 0-59 | try_again | 1 | Motivation |

---

## Appendix B: Example API Flows

### Flow 1: Lesson Pronunciation Practice

```bash
# 1. Get practice data
curl -X POST https://api.example.com/pronunciation/lesson/practice \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "lesson_id": "lesson456",
    "course_id": "course789",
    "section_id": "section001",
    "target_word": "elephant"
  }'

# Response
{
  "tts_audio_url": "https://.../tts/elephant_en.mp3",
  "word": "elephant",
  "translation": "con voi",
  "image_url": "https://.../elephant.jpg",
  "previous_score": 75,
  "previous_attempts": 2,
  "pass_score": 70,
  "max_attempts": 3
}

# 2. Submit evaluation
curl -X POST https://api.example.com/pronunciation/evaluate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "target_text": "elephant",
    "flashcard_qr_id": "word123",
    "audio_data": "base64_encoded_audio...",
    "audio_format": "webm",
    "lesson_id": "lesson456",
    "course_id": "course789"
  }'

# Response
{
  "transcript": "elephant",
  "confidence": 0.95,
  "score": 92,
  "grade": "excellent",
  "stars": 3,
  "score_components": {
    "similarity": 95.0,
    "confidence": 95.0,
    "completeness": 100.0,
    "bonus": 0.0
  },
  "feedback": "Perfect pronunciation! You're a star!",
  "feedback_emoji": "🌟🎉",
  "improvement_tips": [],
  "processing_time_ms": 850
}

# 3. Log attempt (for XP tracking)
curl -X POST https://api.example.com/pronunciation/attempt \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "flashcard_qr_id": "word123",
    "spoken_text": "elephant",
    "score": 92,
    "feedback": "Perfect pronunciation!",
    "target_text": "elephant",
    "course_id": "course789",
    "lesson_id": "lesson456"
  }'
```

---

## Appendix C: Error Handling

| Error Code | HTTP Status | Description | User Message |
|------------|------------|-------------|--------------|
| TTS_001 | 503 | TTS service unavailable | "Audio loading failed. Please try again." |
| TTS_002 | 400 | Text too long | "This word is too long. Try a shorter word." |
| STT_001 | 429 | Rate limited | "Please wait a moment before trying again." |
| STT_002 | 400 | Unsupported format | "Audio format not supported." |
| SCORE_001 | 500 | Scoring failed | "Could not analyze pronunciation. Try again." |
| FEEDBACK_001 | 500 | AI unavailable | (Silent fallback to templates) |

---

**Document Version:** 1.0  
**Author:** AI Architecture Team  
**Last Updated:** 2026-06-27
