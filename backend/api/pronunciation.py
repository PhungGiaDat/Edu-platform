# backend/api/pronunciation.py
"""
Pronunciation API - Controller layer

Endpoints:
  POST /pronunciation/attempt         — log attempt, award XP, check badges
  POST /pronunciation/ai-feedback     — Gemini AI encouragement for a pronunciation result
  POST /pronunciation/transcribe      — Server-side speech-to-text (Safari/Firefox fallback)
  POST /pronunciation/feedback        — Dynamic feedback from database templates
  GET  /pronunciation/transcribe/status — Check speech processing availability
  GET  /pronunciation/{user_id}/{flashcard_qr_id}/stats — stats + history
  GET  /pronunciation/{user_id}/recent                  — recent attempts
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import Optional
import logging

from models.pronunciation import (
    PronunciationAttemptCreate,
    PronunciationAttemptResponse,
    PronunciationStats,
    PronunciationHistoryItem,
)
from models.feedback_template import GeneratedFeedback
from repositories.pronunciation_repository import (
    PronunciationRepository,
    get_pronunciation_repository,
)
from services.gamification_service import GamificationService, get_gamification_service
from services.ai_service import get_ai_service
from services.feedback_service import FeedbackService, get_feedback_service
from services.speech_processing_service import (
    SpeechProcessingService,
    get_speech_processing_service,
    TranscriptionError,
    RateLimitError,
)

router = APIRouter(prefix="/pronunciation", tags=["Pronunciation"])
logger = logging.getLogger(__name__)

# Badge ID awarded after 5 total pronunciation attempts
BADGE_PRONUNCIATION_PRO = "pronunciation_pro_5"


# ── AI Feedback request / response models ──────────────────────────────────────

class AIFeedbackRequest(BaseModel):
    word: str            # target word the child should say
    spoken_text: str     # what the Web Speech API transcribed
    score: int           # local score 0-100 already computed on frontend


class AIFeedbackResponse(BaseModel):
    message: str         # encouraging sentence for the child
    emoji: str           # 1-3 relevant emojis
    stars: int           # 1-3


@router.post("/attempt", response_model=PronunciationAttemptResponse, status_code=201)
async def log_pronunciation_attempt(
    payload: PronunciationAttemptCreate,
    repo: PronunciationRepository = Depends(get_pronunciation_repository),
    gamification_service: GamificationService = Depends(get_gamification_service),
):
    """
    Log a single pronunciation attempt and award XP.

    - Inserts a document into pronunciation_attempts.
    - Awards XP via gamification_service (action: "pronunciation_attempt").
    - Checks if the user has hit 5 total attempts → awards pronunciation_pro_5 badge.
    - Returns the saved attempt plus xp_awarded.
    """
    logger.info(
        f"[Pronunciation] Attempt from user={payload.user_id} "
        f"word={payload.flashcard_qr_id} score={payload.score}"
    )

    # Persist attempt
    doc_data = payload.model_dump()
    doc_id = await repo.create_attempt(doc_data)

    # Award XP
    xp_result = await gamification_service.add_xp(
        user_id=payload.user_id,
        action="pronunciation_attempt",
        metadata={"flashcard_qr_id": payload.flashcard_qr_id, "score": payload.score},
    )
    xp_awarded = xp_result.get("xp_added", 0)

    # Badge check: pronunciation_pro awarded exactly on the 5th attempt.
    # Using == 5 (not >= 5) so the badge call fires only once, not on every
    # subsequent attempt, regardless of whether award_badge is idempotent.
    total = await repo.count_attempts_for_user(payload.user_id)
    if total == 5:
        await gamification_service.award_badge(payload.user_id, BADGE_PRONUNCIATION_PRO)
        logger.info(f"[Pronunciation] Badge '{BADGE_PRONUNCIATION_PRO}' awarded to {payload.user_id}")

    return PronunciationAttemptResponse(
        _id=doc_id,
        user_id=payload.user_id,
        flashcard_qr_id=payload.flashcard_qr_id,
        spoken_text=payload.spoken_text,
        score=payload.score,
        feedback=payload.feedback,
        audio_url=payload.audio_url,
        course_id=payload.course_id,
        lesson_id=payload.lesson_id,
        section_id=payload.section_id,
        session_id=payload.session_id,
        target_text=payload.target_text,
        attempted_at=doc_data.get("attempted_at"),
        xp_awarded=xp_awarded,
    )


@router.get("/{user_id}/{flashcard_qr_id}/stats", response_model=PronunciationStats)
async def get_pronunciation_stats(
    user_id: str,
    flashcard_qr_id: str,
    repo: PronunciationRepository = Depends(get_pronunciation_repository),
):
    """
    Aggregated stats and full attempt history for one (user, word) pair.
    Returns total_attempts=0 with empty history if no attempts yet.
    """
    stats = await repo.get_stats(user_id, flashcard_qr_id)
    attempts = await repo.get_attempts(user_id, flashcard_qr_id, limit=20)

    history = [
        PronunciationHistoryItem(
            id=a["_id"],
            spoken_text=a["spoken_text"],
            score=a["score"],
            feedback=a.get("feedback"),
            attempted_at=a["attempted_at"],
        )
        for a in attempts
    ]

    return PronunciationStats(
        flashcard_qr_id=flashcard_qr_id,
        total_attempts=stats["total_attempts"],
        best_score=stats["best_score"],
        average_score=stats["average_score"],
        last_attempted_at=stats["last_attempted_at"],
        history=history,
    )


@router.get("/{user_id}/recent")
async def get_recent_attempts(
    user_id: str,
    limit: int = 20,
    repo: PronunciationRepository = Depends(get_pronunciation_repository),
):
    """
    Most recent pronunciation attempts across all words for a user.
    Used by the Progress Report dashboard.
    """
    if limit > 100:
        limit = 100

    attempts = await repo.get_recent_attempts(user_id, limit=limit)
    return {"user_id": user_id, "attempts": attempts, "count": len(attempts)}


@router.post("/ai-feedback", response_model=AIFeedbackResponse)
async def get_ai_pronunciation_feedback(payload: AIFeedbackRequest):
    """
    Call Gemini to generate kid-friendly encouraging feedback for a pronunciation attempt.

    The frontend already computed a local Levenshtein score (0-100).
    Gemini receives the target word, what the child said, and the score,
    and returns a short encouraging message + emoji + star rating.

    Falls back to static messages when AI is unavailable.
    """
    logger.info(
        f"[Pronunciation AI] word='{payload.word}' spoken='{payload.spoken_text}' score={payload.score}"
    )

    # ── Determine star tier for fallback ──────────────────────────────────────
    if payload.score >= 90:
        stars_fallback, emoji_fallback, msg_fallback = 3, "🌟🎉", "Perfect! You're a star!"
    elif payload.score >= 70:
        stars_fallback, emoji_fallback, msg_fallback = 2, "⭐✨", "Great job! Keep it up!"
    elif payload.score >= 50:
        stars_fallback, emoji_fallback, msg_fallback = 1, "👍💪", "Good try! Practice makes perfect!"
    else:
        stars_fallback, emoji_fallback, msg_fallback = 1, "🌈💖", "Keep practicing — you can do it!"

    try:
        ai_service = get_ai_service()

        result = await ai_service.analyze_pronunciation(payload.word, payload.spoken_text, score=payload.score)
        raw = result.get("feedback", "")

        # Try to parse the JSON Gemini should return
        import json, re
        # Strip markdown fences if present
        cleaned = re.sub(r"```[a-z]*", "", raw).strip()
        parsed = json.loads(cleaned)

        message = parsed.get("message", msg_fallback)
        emoji = parsed.get("emoji", emoji_fallback)
        stars = max(1, min(3, int(parsed.get("stars", stars_fallback))))

        return AIFeedbackResponse(message=message, emoji=emoji, stars=stars)

    except Exception as e:
        logger.warning(f"[Pronunciation AI] Falling back to static feedback: {e}")
        return AIFeedbackResponse(
            message=msg_fallback,
            emoji=emoji_fallback,
            stars=stars_fallback,
        )


# ══════════════════════════════════════════════════════════════════════════════
# NEW ENDPOINTS: Server-side transcription and dynamic feedback
# ══════════════════════════════════════════════════════════════════════════════


class TranscribeResponse(BaseModel):
    """Response from server-side speech transcription."""
    text: str                          # Transcribed text
    confidence: float = Field(ge=0, le=1)  # Confidence score 0-1
    language: str = "en"               # Detected language


class DynamicFeedbackRequest(BaseModel):
    """Request for dynamic database-driven feedback."""
    word: str                          # The word being practiced
    score: int = Field(ge=0, le=100)   # Pronunciation score
    attempt_number: int = Field(default=1, ge=1)  # Which attempt this is
    language: str = "en"               # Feedback language


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(
    audio: UploadFile = File(..., description="Audio file (WebM, WAV, MP3, OGG, M4A, FLAC)"),
    language: str = Form(default="en", description="Expected language (en, vi, auto)"),
    speech_service: SpeechProcessingService = Depends(get_speech_processing_service),
):
    """
    Server-side speech-to-text transcription using Whisper.
    
    Use this endpoint when Web Speech API is unavailable (Safari, Firefox).
    Rate limited to 2 concurrent transcriptions.
    
    Accepts audio files up to 10MB in WebM, WAV, MP3, OGG, M4A, or FLAC format.
    """
    # Validate file size (10MB max)
    MAX_SIZE = 10 * 1024 * 1024  # 10MB
    content = await audio.read()
    
    if len(content) > MAX_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Audio file too large. Maximum size: 10MB"
        )
    
    if len(content) == 0:
        raise HTTPException(
            status_code=400,
            detail="Empty audio file"
        )
    
    # Get file extension from filename or content type
    filename = audio.filename or "audio.webm"
    extension = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ".webm"
    
    logger.info(
        f"[Transcribe] Received audio: {len(content)} bytes, "
        f"format={extension}, language={language}"
    )
    
    try:
        text, confidence = await speech_service.transcribe_audio(
            audio_data=content,
            file_extension=extension,
            language=language,
        )
        
        return TranscribeResponse(
            text=text,
            confidence=confidence,
            language=language,
        )
        
    except RateLimitError as e:
        logger.warning(f"[Transcribe] Rate limit exceeded: {e}")
        raise HTTPException(
            status_code=429,
            detail="Too many transcription requests. Please try again shortly."
        )
    except TranscriptionError as e:
        logger.error(f"[Transcribe] Transcription failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@router.get("/transcribe/status")
async def get_transcription_status(
    speech_service: SpeechProcessingService = Depends(get_speech_processing_service),
):
    """
    Check if server-side speech transcription is available.
    
    Returns service status including:
    - Whether Whisper model is loaded
    - Current number of active transcriptions
    - Supported audio formats
    """
    status = await speech_service.get_status()
    return status


@router.post("/feedback", response_model=GeneratedFeedback)
async def get_dynamic_feedback(
    payload: DynamicFeedbackRequest,
    feedback_service: FeedbackService = Depends(get_feedback_service),
):
    """
    Generate kid-friendly feedback using database templates.
    
    Returns personalized, encouraging feedback based on:
    - Score category (excellent/good/needs_practice)
    - Random template selection with weighted probabilities
    - Placeholder substitution ({word}, {score}, {stars})
    
    Falls back to default messages if no templates are available.
    """
    logger.info(
        f"[Feedback] Generating for word='{payload.word}' "
        f"score={payload.score} attempt={payload.attempt_number}"
    )
    
    feedback = await feedback_service.generate_feedback(
        word=payload.word,
        score=payload.score,
        attempt_number=payload.attempt_number,
        language=payload.language,
    )
    
    return feedback


@router.get("/feedback/stats")
async def get_feedback_stats(
    language: str = "en",
    feedback_service: FeedbackService = Depends(get_feedback_service),
):
    """
    Get statistics about available feedback templates.
    
    Useful for:
    - Admin dashboard
    - Debugging template availability
    - Verifying seed data was loaded
    """
    stats = await feedback_service.get_feedback_stats(language=language)
    return stats
