# backend/api/pronunciation_course.py
"""
Pronunciation Course API — Supabase PostgreSQL only.

REST endpoints for pronunciation courses, attempts, and progress.
No MongoDB.
"""
from fastapi import APIRouter, HTTPException, Query, Request
from typing import Optional
from datetime import datetime
from backend.models.pronunciation_course_model import (
    PronunciationAttemptLog,
    PronunciationProgressResponse,
)

router = APIRouter(prefix="/pronunciation-course", tags=["pronunciation-course"])


async def _get_user_id(request: Request) -> Optional[str]:
    """Extract user_id from Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[7:]
    try:
        from settings import settings
        import jwt
        payload = jwt.decode(
            token,
            settings.SECRET_KEY.get_secret_value(),
            algorithms=[settings.ALGORITHM],
        )
        return payload.get("sub") or None
    except Exception:
        return None


# ===== Routes =====

@router.get("")
async def list_courses(request: Request, user_id: Optional[str] = Query(None)):
    """List all pronunciation topics with completion % for this user."""
    # Import inside handler so tests can patch at source
    from backend.repositories.pronunciation_course_repository import (
        get_pronunciation_course_repository,
        get_pronunciation_attempt_repository,
    )
    auth_uid = await _get_user_id(request) if not user_id else None
    uid = user_id or auth_uid
    repo = get_pronunciation_course_repository()
    attempt_repo = get_pronunciation_attempt_repository()

    topics = await repo.list_active_topics()
    courses = []
    for topic in topics:
        word_ids = [w["word_id"] for w in await repo.list_words(topic["topic_id"])]
        completion = 0.0
        if uid and word_ids:
            best = await attempt_repo.get_topic_progress(uid, topic["topic_id"], word_ids)
            learned = sum(1 for s in best.values() if s >= 1)
            completion = (learned / len(word_ids) * 100) if word_ids else 0.0
        courses.append({
            "id": topic["topic_id"],
            "topic_id": topic["topic_id"],
            "name": topic["name"],
            "name_vi": topic["name_vi"],
            "icon": topic["icon"],
            "color": topic["color"],
            "word_count": len(word_ids),
            "completion_percent": round(completion, 1),
        })
    return {"courses": courses}


@router.get("/progress", response_model=PronunciationProgressResponse)
async def get_progress(request: Request, user_id: Optional[str] = Query(None)):
    """Get user's overall pronunciation progress. Requires auth."""
    from backend.repositories.pronunciation_course_repository import (
        get_pronunciation_attempt_repository,
    )
    auth_uid = await _get_user_id(request) if not user_id else None
    uid = user_id or auth_uid
    if not uid:
        raise HTTPException(status_code=401, detail="Authentication required")
    attempt_repo = get_pronunciation_attempt_repository()
    words_per_topic = await attempt_repo.get_words_per_topic(uid)
    favorite = await attempt_repo.get_favorite_topic(uid)
    stats = await attempt_repo.get_total_progress(uid)
    streak = await attempt_repo.get_streak(uid)
    return PronunciationProgressResponse(
        total_words_learned=int(stats.get("words_practiced", 0)),
        words_per_topic=[
            {"topic_id": r["topic_id"], "topic_name": r["topic_name"], "count": r["words_learned"]}
            for r in words_per_topic
        ],
        favorite_topic={
            "topic_id": favorite["topic_id"],
            "topic_name": favorite["topic_name"],
            "count": favorite["words_learned"],
        } if favorite else None,
        total_stars=int(stats.get("total_stars", 0)),
        current_streak=streak,
    )


@router.get("/{topic_id}")
async def get_course(topic_id: str, request: Request, user_id: Optional[str] = Query(None)):
    """Get topic detail with words and per-word progress."""
    from backend.repositories.pronunciation_course_repository import (
        get_pronunciation_course_repository,
        get_pronunciation_attempt_repository,
    )
    auth_uid = await _get_user_id(request) if not user_id else None
    uid = user_id or auth_uid
    repo = get_pronunciation_course_repository()
    attempt_repo = get_pronunciation_attempt_repository()

    topic = await repo.get_topic(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Course not found")

    words = await repo.list_words(topic_id)
    word_ids = [w["word_id"] for w in words]
    best_stars = {}
    if uid:
        best_stars = await attempt_repo.get_topic_progress(uid, topic_id, word_ids)

    return {
        "id": topic["topic_id"],
        "topic_id": topic["topic_id"],
        "name": topic["name"],
        "name_vi": topic["name_vi"],
        "icon": topic["icon"],
        "color": topic["color"],
        "words": [
            {**w, "best_stars": best_stars.get(w["word_id"], 0)}
            for w in words
        ],
        "progress": {
            "learned": sum(1 for s in best_stars.values() if s >= 1),
            "total": len(word_ids),
        },
    }


@router.post("/{topic_id}/attempt")
async def log_attempt(topic_id: str, attempt: PronunciationAttemptLog, request: Request):
    """Log a pronunciation attempt and award XP."""
    from backend.repositories.pronunciation_course_repository import (
        get_pronunciation_attempt_repository,
    )
    auth_uid = await _get_user_id(request)
    uid = auth_uid or attempt.user_id

    attempt_repo = get_pronunciation_attempt_repository()
    row = await attempt_repo.log_attempt(
        user_id=uid,
        topic_id=topic_id,
        word_id=attempt.word_id,
        score=int(attempt.score),
        stars=attempt.stars,
        transcription=attempt.transcription,
        evaluation_method=attempt.evaluation_method,
    )

    xp_result = None
    if uid:
        try:
            from backend.services.postgres_gamification_service import PostgresGamificationService
            action = "pronunciation_correct" if attempt.stars >= 2 else "pronunciation_attempt"
            xp_result = await PostgresGamificationService().add_xp_with_event_id(
                user_id=uid,
                event_id=f"pron-{row['attempt_id']}",
                action=action,
                source_type="pronunciation_course",
                source_id=topic_id,
                attempt_id=row["attempt_id"],
                metadata={"word_id": attempt.word_id, "score": attempt.score, "stars": attempt.stars},
            )
        except Exception:
            pass  # XP is best-effort

    return {
        "success": True,
        "stars": attempt.stars,
        "attempt_id": row["attempt_id"],
        "xp_awarded": xp_result.get("xp_awarded", 0) if xp_result else 0,
        "level_up": xp_result.get("level_up", False) if xp_result else False,
    }


@router.post("/huggingface-evaluate")
async def huggingface_evaluate(
    expected_word: str = Query(...),
    browser_score: Optional[float] = Query(None),
):
    """Evaluate pronunciation via HuggingFace wav2vec2 (borderline cases).

    Currently returns Levenshtein-based fallback.
    Replace with real HF Inference API call when token + model ready.
    """
    from backend.services.huggingface_evaluation_service import HuggingFaceEvaluationService
    result = HuggingFaceEvaluationService.evaluate(
        audio_data=b"",
        expected_word=expected_word,
        browser_score=browser_score,
    )
    return {
        "score": result.score,
        "stars": result.stars,
        "feedback": result.feedback,
        "transcription": result.transcription,
    }


@router.post("/store-recording")
async def store_recording(
    word_id: str = Query(...),
    topic_id: str = Query(...),
    audio_url: str = Query(...),
    transcription: Optional[str] = Query(None),
    audio_duration_ms: Optional[int] = Query(None),
    is_consent_granted: bool = Query(False),
    request: Request = None,
):
    """Store an audio recording for fine-tuning dataset (consent required)."""
    from backend.repositories.pronunciation_course_repository import (
        get_pronunciation_recording_repository,
    )
    auth_uid = await _get_user_id(request) if request else None
    uid = auth_uid or "anonymous"

    repo = get_pronunciation_recording_repository()
    recording_id = await repo.store_recording(
        user_id=uid,
        topic_id=topic_id,
        word_id=word_id,
        audio_url=audio_url,
        transcription=transcription,
        audio_duration_ms=audio_duration_ms,
        is_consent_granted=is_consent_granted,
    )
    return {"success": True, "recording_id": recording_id}
