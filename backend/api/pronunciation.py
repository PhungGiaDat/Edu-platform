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
  POST /pronunciation/tts            — Generate TTS audio for word pronunciation
  POST /pronunciation/evaluate        — Full AI pronunciation evaluation
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List
import logging
import io

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
from repositories.postgres_user_repository import PostgresUser
from services.gamification_service import GamificationService, get_gamification_service
from services.ai_service import get_ai_service
from services.feedback_service import FeedbackService, get_feedback_service
from services.speech_processing_service import (
    SpeechProcessingService,
    get_speech_processing_service,
    TranscriptionError,
    RateLimitError,
)
from services.tts_service import TTSService, get_tts_service, TTSError, TTSUnavailableError
from services.pronunciation_evaluator import (
    PronunciationEvaluator,
    get_pronunciation_evaluator,
    EvaluationError,
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


# ── TTS Request / Response Models ──────────────────────────────────────────────

class TTSRequest(BaseModel):
    """Request to generate TTS audio for a word."""
    text: str = Field(..., min_length=1, max_length=500, description="Text to convert to speech")
    language: str = Field(default="en", description="Language code (en, vi)")
    speed: float = Field(default=0.9, ge=0.5, le=2.0, description="Speech speed (0.5-2.0)")


class TTSResponse(BaseModel):
    """Response with TTS generation metadata."""
    success: bool
    text: str
    language: str
    duration_seconds: float
    source: str  # 'xtts', 'google', 'cache'


class EvaluationRequest(BaseModel):
    """Request for full AI pronunciation evaluation."""
    audio_data: Optional[str] = Field(None, description="Base64-encoded audio data")
    target_text: str = Field(..., min_length=1, description="Expected text to be pronounced")
    transcribed_text: Optional[str] = Field(None, description="Pre-transcribed text (if available)")
    language: str = Field(default="en", description="Language code (en, vi)")
    confidence: float = Field(default=1.0, ge=0, le=1, description="Transcription confidence")


class PhonemeAnalysisResponse(BaseModel):
    """Individual phoneme analysis result."""
    expected: str
    spoken: str
    is_match: bool
    confidence: float
    suggestion: Optional[str] = None


class EvaluationResponse(BaseModel):
    """Full pronunciation evaluation result."""
    score: int  # 0-100
    grade: str  # 'excellent', 'good', 'needs_practice'
    stars: int  # 1-3
    transcription: str
    confidence: float
    feedback: str
    feedback_emoji: str
    phoneme_analysis: List[PhonemeAnalysisResponse]
    areas_for_improvement: List[str]
    strengths: List[str]
    suggestions: List[str]
    language: str
    source: str


@router.post("/attempt", response_model=PronunciationAttemptResponse, status_code=201)
async def log_pronunciation_attempt(
    payload: PronunciationAttemptCreate,
    repo: PronunciationRepository = Depends(get_pronunciation_repository),
    gamification_service: GamificationService = Depends(get_gamification_service),
):
    """
    Log a single pronunciation attempt and award XP.

    - Inserts a document into pronunciation_attempts.
    - Awards XP via gamification_service using idempotent add_xp_with_event_id.
    - Uses attempt_id as event_id for exactly-once semantics.
    - Checks if the user has hit 5 total attempts → awards pronunciation_pro_5 badge.
    - Returns the saved attempt plus xp_awarded.
    """
    logger.info(
        f"[Pronunciation] Attempt from user={payload.user_id} "
        f"word={payload.flashcard_qr_id} score={payload.score}"
    )

    # Persist attempt FIRST (this generates the attempt_id)
    doc_data = payload.model_dump()
    attempt = await repo.create_attempt(doc_data)
    attempt_id = attempt["attempt_id"]

    # Award XP with idempotency using attempt_id as event_id
    xp_result = await gamification_service.add_xp_with_event_id(
        user_id=payload.user_id,
        event_id=attempt_id,  # Use attempt_id for idempotency
        action="pronunciation_attempt",
        source_type="pronunciation",
        source_id=payload.flashcard_qr_id,
        attempt_id=attempt_id,
        session_id=payload.session_id,
        metadata={"score": payload.score, "flashcard_qr_id": payload.flashcard_qr_id},
    )

    # Get XP awarded (handle both legacy and idempotent responses)
    xp_awarded = xp_result.get("xp_awarded") or xp_result.get("xp_added", 0)
    if xp_result.get("success"):
        await repo.set_xp_awarded(attempt_id, int(xp_awarded))

    # Badge check: pronunciation_pro awarded exactly on the 5th attempt.
    # Using == 5 (not >= 5) so the badge call fires only once, not on every
    # subsequent attempt, regardless of whether award_badge is idempotent.
    total = await repo.count_attempts_for_user(payload.user_id)
    if total == 5:
        await gamification_service.award_badge(payload.user_id, BADGE_PRONUNCIATION_PRO)
        logger.info(f"[Pronunciation] Badge '{BADGE_PRONUNCIATION_PRO}' awarded to {payload.user_id}")

    return PronunciationAttemptResponse(
        id=attempt_id,
        attempt_id=attempt_id,
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
        status="completed" if xp_result.get("success") else "pending",
        attempted_at=attempt["attempted_at"],
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


# ══════════════════════════════════════════════════════════════════════════════
# NEW TTS ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════


@router.post("/tts", response_model=TTSResponse)
async def generate_tts_audio(
    payload: TTSRequest,
    tts_service: TTSService = Depends(get_tts_service),
):
    """
    Generate AI-powered Text-to-Speech audio for pronunciation practice.
    
    Uses Coqui XTTS v2 (offline, high quality) with Google Cloud TTS as fallback.
    Supports Vietnamese language with natural, kid-friendly voices.
    
    The audio is returned directly in the response with appropriate content-type.
    """
    logger.info(
        f"[TTS] Generating speech for text='{payload.text[:50]}...' "
        f"language={payload.language} speed={payload.speed}"
    )
    
    try:
        result = await tts_service.generate_speech(
            text=payload.text,
            language=payload.language,
            speed=payload.speed,
        )
        
        return TTSResponse(
            success=True,
            text=result.text,
            language=payload.language,
            duration_seconds=result.duration_seconds,
            source=result.source,
        )
        
    except TTSUnavailableError as e:
        logger.error(f"[TTS] Service unavailable: {e}")
        raise HTTPException(
            status_code=503,
            detail="TTS service is not available. Please try again later."
        )
    except TTSError as e:
        logger.error(f"[TTS] Generation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"TTS generation failed: {str(e)}"
        )


@router.get("/tts/stream/{word}")
async def stream_tts_audio(
    word: str,
    language: str = "en",
    speed: float = 0.9,
    tts_service: TTSService = Depends(get_tts_service),
):
    """
    Stream TTS audio directly for a word.
    
    Returns audio in WAV format for web playback.
    Optimized for low latency with caching.
    """
    logger.info(f"[TTS Stream] Word='{word}' language={language}")
    
    try:
        result = await tts_service.generate_speech(
            text=word,
            language=language,
            speed=speed,
        )
        
        # Return audio as streaming response
        return Response(
            content=result.audio_data,
            media_type="audio/wav",
            headers={
                "Content-Length": str(len(result.audio_data)),
                "X-Duration": str(result.duration_seconds),
                "X-Source": result.source,
            },
        )
        
    except TTSUnavailableError as e:
        raise HTTPException(
            status_code=503,
            detail="TTS service is not available"
        )
    except TTSError as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@router.get("/tts/status")
async def get_tts_status(
    tts_service: TTSService = Depends(get_tts_service),
):
    """
    Check TTS service status and capabilities.
    
    Returns:
    - Service availability
    - Available providers (Coqui XTTS, Google TTS)
    - Supported languages
    - Cache status
    """
    status = await tts_service.get_status()
    return status


@router.post("/tts/clear-cache")
async def clear_tts_cache(
    tts_service: TTSService = Depends(get_tts_service),
):
    """
    Clear the TTS audio cache.
    
    Useful for:
    - Freeing up disk space
    - Ensuring fresh audio generation
    """
    count = await tts_service.clear_cache()
    return {"success": True, "files_cleared": count}


# ══════════════════════════════════════════════════════════════════════════════
# NEW AI EVALUATION ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════


@router.post("/evaluate", response_model=EvaluationResponse)
async def evaluate_pronunciation(
    payload: EvaluationRequest,
    evaluator: PronunciationEvaluator = Depends(get_pronunciation_evaluator),
):
    """
    Perform full AI-powered pronunciation evaluation.
    
    This endpoint combines:
    - Speech-to-text transcription (if audio provided)
    - Phonetic analysis
    - Score calculation (0-100)
    - Kid-friendly feedback generation
    
    Either provide audio_data (base64) for automatic transcription,
    or provide transcribed_text if you already have the transcription.
    
    Returns detailed evaluation with:
    - Score and star rating
    - Transcription of what was said
    - Phoneme-level analysis
    - Strengths and areas for improvement
    - Suggestions for practice
    """
    logger.info(
        f"[Evaluate] target='{payload.target_text}' "
        f"language={payload.language} "
        f"has_audio={payload.audio_data is not None}"
    )
    
    try:
        if payload.audio_data:
            # Decode base64 audio and evaluate
            import base64
            
            audio_bytes = base64.b64decode(payload.audio_data)
            
            evaluation = await evaluator.evaluate_from_audio(
                audio_data=audio_bytes,
                target_text=payload.target_text,
                language=payload.language,
            )
        else:
            # Evaluate from pre-transcribed text
            if not payload.transcribed_text:
                raise HTTPException(
                    status_code=400,
                    detail="Either audio_data or transcribed_text must be provided"
                )
            
            evaluation = await evaluator.evaluate_from_transcription(
                transcribed_text=payload.transcribed_text,
                target_text=payload.target_text,
                confidence=payload.confidence,
                language=payload.language,
            )
        
        # Convert to response model
        return EvaluationResponse(
            score=evaluation.score,
            grade=evaluation.grade,
            stars=evaluation.stars,
            transcription=evaluation.transcription,
            confidence=evaluation.confidence,
            feedback=evaluation.feedback,
            feedback_emoji=evaluation.feedback_emoji,
            phoneme_analysis=[
                PhonemeAnalysisResponse(
                    expected=p.expected,
                    spoken=p.spoken,
                    is_match=p.is_match,
                    confidence=p.confidence,
                    suggestion=p.suggestion,
                )
                for p in evaluation.phoneme_analysis
            ],
            areas_for_improvement=evaluation.areas_for_improvement,
            strengths=evaluation.strengths,
            suggestions=evaluation.suggestions,
            language=evaluation.language,
            source=evaluation.source,
        )
        
    except EvaluationError as e:
        logger.error(f"[Evaluate] Evaluation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Pronunciation evaluation failed: {str(e)}"
        )
    except Exception as e:
        logger.error(f"[Evaluate] Unexpected error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Evaluation error: {str(e)}"
        )


@router.get("/evaluate/status")
async def get_evaluation_status(
    evaluator: PronunciationEvaluator = Depends(get_pronunciation_evaluator),
):
    """
    Check pronunciation evaluator service status.
    
    Returns:
    - Service availability
    - Model status
    - Supported languages
    """
    status = await evaluator.get_status()
    return status
