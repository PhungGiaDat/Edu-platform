from fastapi import APIRouter, HTTPException
from typing import List
from backend.models.pronunciation_course_model import (
    PronunciationCourseDocument,
    PronunciationCourseListResponse,
    PronunciationCourseDetailResponse,
    PronunciationAttemptLog,
    PronunciationProgressResponse,
    PronunciationWord,
)

router = APIRouter(prefix="/pronunciation-course", tags=["pronunciation-course"])

# In-memory store for demo (replace with MongoDB in production)
_courses_db: dict[str, PronunciationCourseDocument] = {}

# Pre-populate with seed data
ANIMALS_WORDS = [
    PronunciationWord(word_id="cat", word="cat", phonetic="/kæt/", difficulty="easy"),
    PronunciationWord(word_id="dog", word="dog", phonetic="/dɔːɡ/", difficulty="easy"),
    PronunciationWord(word_id="elephant", word="elephant", phonetic="/ˈelɪfənt/", difficulty="medium"),
    PronunciationWord(word_id="giraffe", word="giraffe", phonetic="/dʒɪˈrɑːf/", difficulty="hard"),
    PronunciationWord(word_id="monkey", word="monkey", phonetic="/ˈmʌŋki/", difficulty="easy"),
    PronunciationWord(word_id="rabbit", word="rabbit", phonetic="/ˈræbɪt/", difficulty="medium"),
    PronunciationWord(word_id="tiger", word="tiger", phonetic="/ˈtaɪɡər/", difficulty="easy"),
    PronunciationWord(word_id="lion", word="lion", phonetic="/ˈlaɪən/", difficulty="easy"),
]

FOOD_WORDS = [
    PronunciationWord(word_id="apple", word="apple", phonetic="/ˈæpəl/", difficulty="easy"),
    PronunciationWord(word_id="banana", word="banana", phonetic="/bəˈnɑːnə/", difficulty="easy"),
    PronunciationWord(word_id="bread", word="bread", phonetic="/bred/", difficulty="easy"),
    PronunciationWord(word_id="cheese", word="cheese", phonetic="/tʃiːz/", difficulty="medium"),
    PronunciationWord(word_id="chicken", word="chicken", phonetic="/ˈtʃɪkɪn/", difficulty="medium"),
    PronunciationWord(word_id="egg", word="egg", phonetic="/eɡ/", difficulty="easy"),
    PronunciationWord(word_id="rice", word="rice", phonetic="/raɪs/", difficulty="easy"),
    PronunciationWord(word_id="water", word="water", phonetic="/ˈwɔːtər/", difficulty="easy"),
]

FAMILY_WORDS = [
    PronunciationWord(word_id="mom", word="mom", phonetic="/mɑːm/", difficulty="easy"),
    PronunciationWord(word_id="dad", word="dad", phonetic="/dæd/", difficulty="easy"),
    PronunciationWord(word_id="brother", word="brother", phonetic="/ˈbrʌðər/", difficulty="medium"),
    PronunciationWord(word_id="sister", word="sister", phonetic="/ˈsɪstər/", difficulty="medium"),
    PronunciationWord(word_id="grandma", word="grandma", phonetic="/ˈɡrænmɑː/", difficulty="easy"),
    PronunciationWord(word_id="grandpa", word="grandpa", phonetic="/ˈɡrænpɑː/", difficulty="easy"),
    PronunciationWord(word_id="baby", word="baby", phonetic="/ˈbeɪbi/", difficulty="easy"),
    PronunciationWord(word_id="friend", word="friend", phonetic="/frend/", difficulty="medium"),
]

NATURE_WORDS = [
    PronunciationWord(word_id="tree", word="tree", phonetic="/triː/", difficulty="easy"),
    PronunciationWord(word_id="flower", word="flower", phonetic="/ˈflaʊər/", difficulty="medium"),
    PronunciationWord(word_id="sun", word="sun", phonetic="/sʌn/", difficulty="easy"),
    PronunciationWord(word_id="moon", word="moon", phonetic="/muːn/", difficulty="easy"),
    PronunciationWord(word_id="star", word="star", phonetic="/stɑːr/", difficulty="easy"),
    PronunciationWord(word_id="river", word="river", phonetic="/ˈrɪvər/", difficulty="medium"),
    PronunciationWord(word_id="mountain", word="mountain", phonetic="/ˈmaʊntən/", difficulty="hard"),
    PronunciationWord(word_id="rainbow", word="rainbow", phonetic="/ˈreɪnboʊ/", difficulty="medium"),
]

_courses_db = {
    "animals": PronunciationCourseDocument(
        topic_id="animals",
        name="Animals",
        name_vi="Động vật",
        icon="🐾",
        color="sky-blue",
        words=ANIMALS_WORDS,
        order=1,
    ),
    "food": PronunciationCourseDocument(
        topic_id="food",
        name="Food",
        name_vi="Thức ăn",
        icon="🍎",
        color="coral-pink",
        words=FOOD_WORDS,
        order=2,
    ),
    "family": PronunciationCourseDocument(
        topic_id="family",
        name="Family",
        name_vi="Gia đình",
        icon="👨‍👩‍👧",
        color="lavender",
        words=FAMILY_WORDS,
        order=3,
    ),
    "nature": PronunciationCourseDocument(
        topic_id="nature",
        name="Nature",
        name_vi="Thiên nhiên",
        icon="🌳",
        color="mint-green",
        words=NATURE_WORDS,
        order=4,
    ),
}


@router.get("", response_model=dict)
async def list_courses():
    """List all pronunciation courses with basic info."""
    courses = [
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
    return {"courses": courses}


@router.get("/{topic_id}", response_model=dict)
async def get_course(topic_id: str):
    """Get course detail with words."""
    course = _courses_db.get(topic_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return {
        "id": str(abs(hash(topic_id)) % 100000),
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
async def get_progress(user_id: str = ""):
    """Get user's overall pronunciation progress."""
    # TODO: query from MongoDB based on user_id
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
