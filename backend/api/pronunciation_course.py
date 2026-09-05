# backend/api/pronunciation_course.py
"""
Pronunciation Course API - MongoDB via Motor

REST endpoints for pronunciation courses, attempts, and progress.
"""
from fastapi import APIRouter, HTTPException, Query, Request
from typing import Optional
from datetime import datetime
from database.connection import get_database
from backend.models.pronunciation_course_model import (
    PronunciationAttemptLog,
    PronunciationProgressResponse,
)

router = APIRouter(prefix="/pronunciation-course", tags=["pronunciation-course"])


def _coll(name: str):
    return get_database()[name]


# ===== Seed data =====

_TOPICS_SEED = {
    "animals": {
        "topic_id": "animals", "name": "Animals", "name_vi": "Động vật",
        "icon": "🐾", "color": "sky-blue", "order": 1,
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
    "food": {
        "topic_id": "food", "name": "Food", "name_vi": "Thức ăn",
        "icon": "🍎", "color": "coral-pink", "order": 2,
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
    "family": {
        "topic_id": "family", "name": "Family", "name_vi": "Gia đình",
        "icon": "👨‍👩‍👧", "color": "lavender", "order": 3,
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
    "nature": {
        "topic_id": "nature", "name": "Nature", "name_vi": "Thiên nhiên",
        "icon": "🌳", "color": "mint-green", "order": 4,
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
}


async def _get_optional_user(request: Request) -> Optional[str]:
    """Extract user_id from Authorization header. Returns None if no valid auth."""
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


# ===== Routes (specific paths MUST come before /{topic_id} wildcard) =====

@router.get("")
async def list_courses(request: Request, user_id: Optional[str] = Query(None)):
    """List all pronunciation courses with basic info."""
    auth_uid = await _get_optional_user(request) if not user_id else None
    uid = user_id or auth_uid
    try:
        coll = _coll("pronunciation_courses")
        courses = []
        async for doc in coll.find({"is_active": True}).sort("order"):
            completion = 0.0
            if uid:
                attempts_coll = _coll("pronunciation_attempts")
                word_ids = [w["word_id"] for w in doc.get("words", [])]
                learned = await attempts_coll.count_documents({
                    "user_id": uid, "topic_id": doc["topic_id"],
                    "stars": {"$gte": 1}, "word_id": {"$in": word_ids},
                })
                total = len(word_ids)
                completion = (learned / total * 100) if total > 0 else 0.0
            courses.append({
                "id": str(doc.get("_id", "")),
                "topic_id": doc["topic_id"],
                "name": doc["name"],
                "name_vi": doc["name_vi"],
                "icon": doc["icon"],
                "color": doc["color"],
                "word_count": len(doc.get("words", [])),
                "completion_percent": round(completion, 1),
            })
        return {"courses": courses}
    except RuntimeError:
        return {"courses": [
            {**t, "id": str(i + 1), "completion_percent": 0.0}
            for i, t in enumerate(_TOPICS_SEED.values())
        ]}


@router.get("/progress", response_model=PronunciationProgressResponse)
async def get_progress(request: Request, user_id: Optional[str] = Query(None)):
    """Get user's overall pronunciation progress. Requires auth."""
    auth_uid = await _get_optional_user(request) if not user_id else None
    uid = user_id or auth_uid
    if not uid:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        coll = _coll("pronunciation_attempts")
        topics_coll = _coll("pronunciation_courses")

        topic_pipeline = [
            {"$match": {"user_id": uid}},
            {"$sort": {"stars": -1, "created_at": -1}},
            {"$group": {
                "_id": {"topic_id": "$topic_id", "word_id": "$word_id"},
                "best_stars": {"$first": "$stars"},
            }},
            {"$group": {
                "_id": "$_id.topic_id",
                "words_learned": {"$sum": {"$cond": [{"$gte": ["$best_stars", 1]}, 1, 0]}},
                "total_stars": {"$sum": "$best_stars"},
            }},
        ]
        topic_stats = {}
        total_words = 0
        total_stars = 0
        async for row in coll.aggregate(topic_pipeline):
            topic_stats[row["_id"]] = {
                "words_learned": row["words_learned"],
                "total_stars": row["total_stars"],
            }
            total_words += row["words_learned"]
            total_stars += row["total_stars"]

        words_per_topic = []
        favorite_topic_id = None
        favorite_count = 0
        async for course_doc in topics_coll.find({"is_active": True}).sort("order"):
            tid = course_doc["topic_id"]
            stats = topic_stats.get(tid, {"words_learned": 0, "total_stars": 0})
            words_per_topic.append({
                "topic_id": tid,
                "topic_name": course_doc["name_vi"],
                "count": stats["words_learned"],
            })
            if stats["words_learned"] > favorite_count:
                favorite_count = stats["words_learned"]
                favorite_topic_id = tid

        favorite_topic = None
        if favorite_topic_id:
            async for course_doc in topics_coll.find({"topic_id": favorite_topic_id}):
                favorite_topic = {
                    "topic_id": favorite_topic_id,
                    "topic_name": course_doc["name_vi"],
                    "count": favorite_count,
                }

        from datetime import date
        today = date.today()
        streak_pipeline = [
            {"$match": {"user_id": uid}},
            {"$group": {"_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}}}},
            {"$sort": {"_id": -1}},
            {"$limit": 30},
        ]
        streak = 0
        prev_date = None
        async for row in coll.aggregate(streak_pipeline):
            d = datetime.fromisoformat(row["_id"]).date()
            if prev_date is None:
                if (today - d).days > 1:
                    break
                streak = 1
            elif (prev_date - d).days == 1:
                streak += 1
            else:
                break
            prev_date = d

        return PronunciationProgressResponse(
            total_words_learned=total_words,
            words_per_topic=words_per_topic,
            favorite_topic=favorite_topic,
            total_stars=total_stars,
            current_streak=streak,
        )
    except RuntimeError:
        return PronunciationProgressResponse(
            total_words_learned=0,
            words_per_topic=[],
            favorite_topic=None,
            total_stars=0,
            current_streak=0,
        )


@router.post("/huggingface-evaluate")
async def huggingface_evaluate(
    expected_word: str = Query(...),
    browser_score: Optional[float] = Query(None),
):
    """Evaluate pronunciation via HuggingFace wav2vec2 (borderline cases)."""
    from backend.services.huggingface_evaluation_service import HuggingFaceEvaluationService
    result = HuggingFaceEvaluationService.evaluate(
        audio_data=b"", expected_word=expected_word, browser_score=browser_score,
    )
    return {
        "score": result.score,
        "stars": result.stars,
        "feedback": result.feedback,
        "transcription": result.transcription,
    }


@router.get("/{topic_id}")
async def get_course(
    topic_id: str,
    request: Request,
    user_id: Optional[str] = Query(None),
):
    """Get course detail with words."""
    auth_uid = await _get_optional_user(request) if not user_id else None
    uid = user_id or auth_uid
    try:
        coll = _coll("pronunciation_courses")
        doc = await coll.find_one({"topic_id": topic_id, "is_active": True})
        if not doc:
            raise HTTPException(status_code=404, detail="Course not found")

        word_ids = [w["word_id"] for w in doc.get("words", [])]
        progress = {"learned": 0, "total": len(word_ids)}
        if uid:
            attempts_coll = _coll("pronunciation_attempts")
            pipeline = [
                {"$match": {"user_id": uid, "topic_id": topic_id, "word_id": {"$in": word_ids}}},
                {"$sort": {"stars": -1, "created_at": -1}},
                {"$group": {"_id": "$word_id", "best_stars": {"$first": "$stars"}}},
            ]
            best_stars = {}
            async for row in attempts_coll.aggregate(pipeline):
                best_stars[row["_id"]] = row["best_stars"]
            progress["learned"] = sum(1 for s in best_stars.values() if s >= 1)

        return {
            "id": str(doc.get("_id", "")),
            "topic_id": doc["topic_id"],
            "name": doc["name"],
            "name_vi": doc["name_vi"],
            "icon": doc["icon"],
            "color": doc["color"],
            "words": doc.get("words", []),
            "progress": progress,
        }
    except RuntimeError:
        seed = _TOPICS_SEED.get(topic_id)
        if not seed:
            raise HTTPException(status_code=404, detail="Course not found")
        return {**seed, "id": "seed", "progress": {"learned": 0, "total": len(seed["words"])}}


@router.post("/{topic_id}/attempt")
async def log_attempt(topic_id: str, attempt: PronunciationAttemptLog, request: Request):
    """Log a pronunciation attempt and award XP."""
    auth_uid = await _get_optional_user(request)
    uid = auth_uid or attempt.user_id

    # Award XP if user authenticated
    xp_result = None
    if uid:
        try:
            from backend.services.postgres_gamification_service import PostgresGamificationService
            action = "pronunciation_correct" if attempt.stars >= 2 else "pronunciation_attempt"
            xp_result = await PostgresGamificationService().add_xp_with_event_id(
                user_id=uid,
                event_id=f"pron-{uid}-{topic_id}-{attempt.word_id}-{datetime.utcnow().timestamp()}",
                action=action,
                source_type="pronunciation_course",
                source_id=topic_id,
                metadata={"word_id": attempt.word_id, "score": attempt.score, "stars": attempt.stars},
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Could not award XP: {e}")

    try:
        coll = _coll("pronunciation_attempts")
        doc = {
            "user_id": uid,
            "topic_id": topic_id,
            "word_id": attempt.word_id,
            "score": attempt.score,
            "stars": attempt.stars,
            "transcription": attempt.transcription,
            "evaluation_method": attempt.evaluation_method,
            "created_at": datetime.utcnow(),
        }
        await coll.insert_one(doc)
        try:
            await coll.create_index("user_id")
            await coll.create_index([("user_id", 1), ("topic_id", 1)])
            await coll.create_index([("user_id", 1), ("word_id", 1)])
            await coll.create_index([("user_id", 1), ("topic_id", 1), ("word_id", 1)])
        except Exception:
            pass
        response = {"success": True, "stars": attempt.stars, "attempt_id": str(doc.get("_id", ""))}
        if xp_result:
            response["xp_awarded"] = xp_result.get("xp_awarded", 0)
            response["level_up"] = xp_result.get("level_up", False)
        return response
    except RuntimeError:
        return {"success": True, "stars": attempt.stars, "attempt_id": "mock"}
