# backend/api/pronunciation_enhanced.py
"""
Pronunciation Enhanced API - Extended pronunciation endpoints

Endpoints:
  POST /pronunciation/evaluate         — Submit audio for AI evaluation
  GET  /pronunciation/attempts/{user_id} — Get user's pronunciation attempts
  GET  /pronunciation/practice/{word}   — Get word data for pronunciation practice
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import logging

from models.pronunciation import PronunciationAttemptCreate, PronunciationAttemptResponse
from repositories.pronunciation_repository import (
    PronunciationRepository,
    get_pronunciation_repository,
)
from services.gamification_service import GamificationService, get_gamification_service
from services.speech_processing_service import (
    SpeechProcessingService,
    get_speech_processing_service,
    TranscriptionError,
    RateLimitError,
)
from services.ai_service import get_ai_service
from core.base_router import BaseAPIRouter

router = BaseAPIRouter(prefix="/pronunciation", tags=["Pronunciation Enhanced"])
logger = logging.getLogger(__name__)

MAX_AUDIO_SIZE = 10 * 1024 * 1024  # 10MB


# =============================================================================
# Request/Response Models
# =============================================================================

class PronunciationEvaluateRequest(BaseModel):
    """Request to evaluate pronunciation."""
    user_id: str
    word: str
    language: str = "en"
    course_id: Optional[str] = None
    lesson_id: Optional[str] = None
    section_id: Optional[str] = None
    session_id: Optional[str] = None


class PronunciationEvaluateResponse(BaseModel):
    """Response with evaluation results."""
    attempt_id: str
    word: str
    transcribed_text: str
    score: int = Field(ge=0, le=100)
    feedback: str
    stars: int = Field(ge=1, le=3)
    emoji: str
    xp_awarded: int = 0
    evaluated_at: datetime


class PracticeWordResponse(BaseModel):
    """Response with word data for practice."""
    word: str
    display_word: str
    audio_url: Optional[str] = None
    phonetic: Optional[str] = None
    example_sentence: Optional[str] = None
    difficulty: str = "medium"
    tips: List[str] = Field(default_factory=list)


class UserPronunciationSummary(BaseModel):
    """Summary of user's pronunciation history."""
    user_id: str
    total_attempts: int
    average_score: float
    best_score: int
    words_practiced: int
    total_xp: int
    recent_attempts: List[dict]


# =============================================================================
# Endpoints
# =============================================================================

@router.post("/evaluate", response_model=PronunciationEvaluateResponse, status_code=201)
async def evaluate_pronunciation(
    audio: UploadFile = File(..., description="Audio file for evaluation"),
    user_id: str = Form(..., description="User ID"),
    word: str = Form(..., description="Target word to pronounce"),
    language: str = Form(default="en", description="Language code"),
    course_id: Optional[str] = Form(None, description="Course ID"),
    lesson_id: Optional[str] = Form(None, description="Lesson ID"),
    section_id: Optional[str] = Form(None, description="Section ID"),
    session_id: Optional[str] = Form(None, description="Session ID"),
    pronunciation_repo: PronunciationRepository = Depends(get_pronunciation_repository),
    gamification_service: GamificationService = Depends(get_gamification_service),
    speech_service: SpeechProcessingService = Depends(get_speech_processing_service),
):
    """
    Submit audio for AI pronunciation evaluation.

    Uses Whisper for speech-to-text, then compares with target word.
    Returns score, feedback, and awards XP.
    """
    content = await audio.read()

    if len(content) > MAX_AUDIO_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Audio file too large. Maximum size: {MAX_AUDIO_SIZE // (1024*1024)}MB"
        )

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty audio file")

    filename = audio.filename or "audio.webm"
    extension = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ".webm"

    logger.info(
        f"[PronunciationEval] Evaluating: user={user_id} word={word} "
        f"size={len(content)} format={extension}"
    )

    try:
        transcribed_text, confidence = await speech_service.transcribe_audio(
            audio_data=content,
            file_extension=extension,
            language=language,
        )
    except RateLimitError:
        raise HTTPException(status_code=429, detail="Transcription service busy, try again")
    except TranscriptionError as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

    score = _calculate_similarity(word.lower(), transcribed_text.lower())

    feedback, stars, emoji = _generate_feedback(word, transcribed_text, score)

    attempt_data = {
        "user_id": user_id,
        "flashcard_qr_id": word,
        "spoken_text": transcribed_text,
        "score": score,
        "feedback": feedback,
        "audio_url": None,
        "course_id": course_id,
        "lesson_id": lesson_id,
        "section_id": section_id,
        "session_id": session_id,
        "target_text": word,
        "confidence": confidence,
        "attempted_at": datetime.utcnow(),
    }

    attempt_id = await pronunciation_repo.create_attempt(attempt_data)

    xp_result = await gamification_service.add_xp(
        user_id=user_id,
        action="pronunciation_evaluate",
        metadata={"word": word, "score": score},
    )
    xp_awarded = xp_result.get("xp_added", 0) if xp_result else 0

    return PronunciationEvaluateResponse(
        attempt_id=attempt_id,
        word=word,
        transcribed_text=transcribed_text,
        score=score,
        feedback=feedback,
        stars=stars,
        emoji=emoji,
        xp_awarded=xp_awarded,
        evaluated_at=datetime.utcnow(),
    )


@router.get("/attempts/{user_id}", response_model=UserPronunciationSummary)
async def get_user_pronunciation_attempts(
    user_id: str,
    limit: int = 50,
    pronunciation_repo: PronunciationRepository = Depends(get_pronunciation_repository),
):
    """
    Get all pronunciation attempts for a user.

    Returns summary statistics and recent attempts.
    """
    if limit > 100:
        limit = 100

    recent = await pronunciation_repo.get_recent_attempts(user_id, limit=limit)

    if not recent:
        return UserPronunciationSummary(
            user_id=user_id,
            total_attempts=0,
            average_score=0.0,
            best_score=0,
            words_practiced=0,
            total_xp=0,
            recent_attempts=[],
        )

    scores = [a.get("score", 0) for a in recent]
    words = set(a.get("flashcard_qr_id", "") for a in recent)

    return UserPronunciationSummary(
        user_id=user_id,
        total_attempts=len(recent),
        average_score=round(sum(scores) / len(scores), 1),
        best_score=max(scores) if scores else 0,
        words_practiced=len(words),
        total_xp=0,
        recent_attempts=[
            {
                "attempt_id": str(a.get("_id", "")),
                "word": a.get("flashcard_qr_id", ""),
                "spoken_text": a.get("spoken_text", ""),
                "score": a.get("score", 0),
                "feedback": a.get("feedback"),
                "attempted_at": a.get("attempted_at"),
            }
            for a in recent[:20]
        ],
    )


@router.get("/practice/{word}", response_model=PracticeWordResponse)
async def get_practice_word(
    word: str,
    language: str = "en",
):
    """
    Get word data for pronunciation practice.

    Returns display info, audio URL, phonetic spelling, and tips.
    """
    word_lower = word.lower().strip()

    phonetic_map = {
        "hello": "hə-ˈlō",
        "world": "wərld",
        "thanks": "θæŋks",
        "please": "plēz",
        "sorry": "ˈsôr-ē",
    }

    tips_map = {
        "hello": ["Say it like a greeting", "Relax your jaw", "Make the 'h' sound soft"],
        "world": ["Round your lips for 'w'", "Keep tongue low for 'or'", "End with 'ld' sound"],
        "thanks": ["Smile while saying it", "Keep tongue behind teeth", "Short 'a' sound"],
    }

    return PracticeWordResponse(
        word=word_lower,
        display_word=word.title(),
        audio_url=None,
        phonetic=phonetic_map.get(word_lower),
        example_sentence=f"The word '{word.title()}' is commonly used.",
        difficulty="medium",
        tips=tips_map.get(word_lower, ["Listen carefully to the audio", "Practice slowly first", "Speed up gradually"]),
    )


# =============================================================================
# Helper Functions
# =============================================================================

def _calculate_similarity(target: str, spoken: str) -> int:
    """
    Calculate pronunciation similarity score (0-100).
    Uses Levenshtein distance-based comparison.
    """
    if not target or not spoken:
        return 0

    if target == spoken:
        return 100

    target_clean = "".join(c for c in target if c.isalnum())
    spoken_clean = "".join(c for c in spoken if c.isalnum())

    if target_clean == spoken_clean:
        return 100

    target_clean = target_clean.lower()
    spoken_clean = spoken_clean.lower()

    if target_clean == spoken_clean:
        return 95

    max_len = max(len(target_clean), len(spoken_clean))
    if max_len == 0:
        return 0

    distance = _levenshtein_distance(target_clean, spoken_clean)
    similarity = max(0, int((1 - distance / max_len) * 100))

    return min(100, similarity)


def _levenshtein_distance(s1: str, s2: str) -> int:
    """Calculate Levenshtein distance between two strings."""
    if len(s1) < len(s2):
        return _levenshtein_distance(s2, s1)

    if len(s2) == 0:
        return len(s1)

    previous_row = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


def _generate_feedback(word: str, spoken: str, score: int):
    """Generate kid-friendly feedback based on score."""
    if score >= 90:
        return "Perfect! You said it exactly right! 🌟", 3, "🎉⭐🌟"
    elif score >= 75:
        return f"Great job! '{word.title()}' is almost perfect! 💪", 2, "⭐✨👍"
    elif score >= 60:
        return f"Good try! Keep practicing '{word.title()}' 🎯", 2, "💪🌈"
    elif score >= 40:
        return f"Nice effort! Let's try '{word.title()}' one more time 🎈", 1, "🎈🌟"
    else:
        return f"Don't worry! Practice makes perfect with '{word.title()}' 💖", 1, "💪🌈"
