"""
Enhanced Lesson API Routes
Duolingo-inspired lesson system with video, gallery, and progress tracking
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import uuid4

router = APIRouter(prefix="/api/v1/lessons", tags=["lessons"])

# ============================================
# Pydantic Models for Enhanced Lessons
# ============================================

class AssetReference(BaseModel):
    bucket: str
    path: str
    type: str  # video, audio, image, sticker
    status: str = "ready"

class VideoCaption(BaseModel):
    caption_id: str
    language: str
    label: str
    content: str
    is_default: bool = False

class VideoChapterMarker(BaseModel):
    title: str
    start_time: int
    end_time: Optional[int] = None
    related_vocabulary: Optional[List[str]] = None

class VideoContent(BaseModel):
    video_id: str
    title: str
    description: Optional[str] = None
    duration_seconds: int
    primary_source: AssetReference
    thumbnail: AssetReference
    captions: List[VideoCaption] = []
    chapter_markers: List[VideoChapterMarker] = []
    learning_objectives: Optional[List[str]] = None
    transcript: Optional[str] = None

class GalleryImage(BaseModel):
    image_id: str
    asset: AssetReference
    alt_text: str
    caption: Optional[str] = None
    attribution: Optional[str] = None
    dimensions: Optional[Dict[str, int]] = None

class GalleryCategory(BaseModel):
    category_id: str
    name: str
    icon: str
    description: Optional[str] = None
    images: List[GalleryImage]

class ImageGallery(BaseModel):
    gallery_id: str
    title: str
    description: Optional[str] = None
    cover_image: AssetReference
    preview_images: List[GalleryImage]
    all_images: List[GalleryImage]
    categories: Optional[List[GalleryCategory]] = None
    images_per_page: int = 12
    enable_zoom: bool = True
    enable_slideshow: bool = True
    slideshow_interval: int = 5

class VocabularyItemEnhanced(BaseModel):
    word_id: str
    word_en: str
    word_vi: str
    phonetic: Optional[str] = None
    emoji: str
    image: AssetReference
    audio: AssetReference
    example_sentence_en: str
    example_sentence_vi: str
    part_of_speech: Optional[str] = None
    difficulty: str = "easy"

class QuizQuestionEnhanced(BaseModel):
    question_id: str
    type: str  # multiple_choice, true_false, fill_blank
    question: str
    question_vi: str
    options: List[Dict[str, Any]]
    points: int = 10
    explanation: Optional[str] = None

class QuizSection(BaseModel):
    questions: List[QuizQuestionEnhanced]
    pass_score: int = 70
    show_answers_after_submit: bool = True
    randomize_questions: bool = False

class SectionProgress(BaseModel):
    section_id: str
    section_type: str
    progress: int = 0
    time_spent: int = 0
    is_completed: bool = False
    best_score: Optional[int] = None
    attempts: int = 0

class VocabularyMastery(BaseModel):
    word_id: str
    mastery_level: int = 0
    correct_attempts: int = 0
    incorrect_attempts: int = 0
    last_practiced_at: Optional[str] = None
    is_mastered: bool = False

class EarnedBadge(BaseModel):
    badge_id: str
    name: str
    icon: str
    earned_at: str
    description: str

class LessonProgressEnhanced(BaseModel):
    lesson_id: str
    user_id: str
    overall_progress: int = 0
    section_progress: List[SectionProgress] = []
    total_time_spent: int = 0
    quiz_scores: List[Dict[str, Any]] = []
    vocabulary_mastery: List[VocabularyMastery] = []
    earned_badges: List[EarnedBadge] = []
    completed_sections: List[str] = []
    last_accessed_at: str

class LessonEnhanced(BaseModel):
    id: str
    course_id: str
    title_en: str
    title_vi: str
    description_en: Optional[str] = None
    description_vi: Optional[str] = None
    order: int
    duration_minutes: int
    xp_reward: int = 20
    difficulty: str = "beginner"
    target_language: str = "vi"
    introduction_video: Optional[VideoContent] = None
    vocabulary_gallery: Optional[ImageGallery] = None
    vocabulary: List[VocabularyItemEnhanced] = []
    quiz: Optional[QuizSection] = None
    tags: List[str] = []
    prerequisites: Optional[List[str]] = None
    created_at: str
    updated_at: str

# ============================================
# Request/Response Models
# ============================================

class StartLessonSessionRequest(BaseModel):
    user_id: str
    lesson_id: str

class StartLessonSessionResponse(BaseModel):
    session_id: str
    lesson: LessonEnhanced
    progress: LessonProgressEnhanced
    started_at: str

class SubmitSectionProgressRequest(BaseModel):
    user_id: str
    session_id: str
    section_id: str
    progress: int
    time_spent: int
    score: Optional[int] = None
    answers: Optional[Dict[str, str]] = None

class SubmitVocabularyPracticeRequest(BaseModel):
    user_id: str
    session_id: str
    word_id: str
    is_correct: bool
    transcript: Optional[str] = None

class CompleteLessonRequest(BaseModel):
    user_id: str
    session_id: str
    total_time_spent: int
    final_score: int
    vocabulary_learned: List[str] = []
    quiz_score: Optional[int] = None

class CompleteLessonResponse(BaseModel):
    success: bool
    xp_earned: int
    new_badges: List[EarnedBadge] = []
    updated_progress: LessonProgressEnhanced

# ============================================
# In-Memory Storage (replace with MongoDB)
# ============================================

# Sample Vietnamese lessons for kids
SAMPLE_LESSONS = {
    "lesson-vn-greetings-1": LessonEnhanced(
        id="lesson-vn-greetings-1",
        course_id="course-vn-basics",
        title_en="Greetings in Vietnamese",
        title_vi="Chào hỏi tiếng Việt",
        description_en="Learn basic Vietnamese greetings",
        description_vi="Học cách chào hỏi cơ bản bằng tiếng Việt",
        order=1,
        duration_minutes=10,
        xp_reward=20,
        difficulty="beginner",
        target_language="vi",
        tags=["greetings", "basics", "beginner"],
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat(),
        introduction_video=VideoContent(
            video_id="video-greetings-intro",
            title="Introduction to Vietnamese Greetings",
            description="A fun animated video introducing basic Vietnamese greetings",
            duration_seconds=120,
            primary_source=AssetReference(
                bucket="learnar-assets",
                path="vietnamese/lessons/greetings/intro-video.mp4",
                type="video"
            ),
            thumbnail=AssetReference(
                bucket="learnar-assets",
                path="vietnamese/lessons/greetings/intro-thumbnail.jpg",
                type="image"
            ),
            captions=[
                VideoCaption(
                    caption_id="caption-vi",
                    language="vi",
                    label="Tiếng Việt",
                    content="Xin chào! Hãy học cách chào hỏi bằng tiếng Việt!",
                    is_default=True
                ),
                VideoCaption(
                    caption_id="caption-en",
                    language="en",
                    label="English",
                    content="Hello! Let's learn how to greet in Vietnamese!"
                )
            ],
            chapter_markers=[
                VideoChapterMarker(
                    title="Introduction",
                    start_time=0,
                    related_vocabulary=["xin chào", "tạm biệt"]
                ),
                VideoChapterMarker(
                    title="Basic Greetings",
                    start_time=30,
                    related_vocabulary=["buổi sáng", "buổi trưa", "buổi tối"]
                ),
                VideoChapterMarker(
                    title="Practice",
                    start_time=90,
                    related_vocabulary=["xin chào", "cảm ơn", "tạm biệt"]
                )
            ],
            learning_objectives=[
                "Say hello in Vietnamese",
                "Ask and answer 'How are you?'",
                "Use appropriate greetings for different times of day"
            ]
        ),
        vocabulary_gallery=ImageGallery(
            gallery_id="gallery-greetings",
            title="Greetings Gallery",
            description="Practice vocabulary with images",
            cover_image=AssetReference(
                bucket="learnar-assets",
                path="vietnamese/lessons/greetings/gallery-cover.jpg",
                type="image"
            ),
            preview_images=[
                GalleryImage(
                    image_id="img-chao",
                    asset=AssetReference(
                        bucket="learnar-assets",
                        path="vietnamese/vocabulary/chao.jpg",
                        type="image"
                    ),
                    alt_text="Xin chào - Hello",
                    caption="Xin chào!",
                    dimensions={"width": 800, "height": 600}
                ),
                GalleryImage(
                    image_id="img-cam-on",
                    asset=AssetReference(
                        bucket="learnar-assets",
                        path="vietnamese/vocabulary/cam-on.jpg",
                        type="image"
                    ),
                    alt_text="Cảm ơn - Thank you",
                    caption="Cảm ơn bạn!"
                ),
                GalleryImage(
                    image_id="img-tam-biet",
                    asset=AssetReference(
                        bucket="learnar-assets",
                        path="vietnamese/vocabulary/tam-biet.jpg",
                        type="image"
                    ),
                    alt_text="Tạm biệt - Goodbye",
                    caption="Tạm biệt!"
                )
            ],
            all_images=[
                GalleryImage(
                    image_id="img-chao",
                    asset=AssetReference(
                        bucket="learnar-assets",
                        path="vietnamese/vocabulary/chao.jpg",
                        type="image"
                    ),
                    alt_text="Xin chào - Hello",
                    caption="Xin chào!",
                    dimensions={"width": 800, "height": 600}
                ),
                GalleryImage(
                    image_id="img-cam-on",
                    asset=AssetReference(
                        bucket="learnar-assets",
                        path="vietnamese/vocabulary/cam-on.jpg",
                        type="image"
                    ),
                    alt_text="Cảm ơn - Thank you",
                    caption="Cảm ơn bạn!"
                ),
                GalleryImage(
                    image_id="img-tam-biet",
                    asset=AssetReference(
                        bucket="learnar-assets",
                        path="vietnamese/vocabulary/tam-biet.jpg",
                        type="image"
                    ),
                    alt_text="Tạm biệt - Goodbye",
                    caption="Tạm biệt!"
                ),
                GalleryImage(
                    image_id="img-ban-khoe-khong",
                    asset=AssetReference(
                        bucket="learnar-assets",
                        path="vietnamese/vocabulary/ban-khoe-khong.jpg",
                        type="image"
                    ),
                    alt_text="Bạn khỏe không? - How are you?",
                    caption="Bạn khỏe không?",
                    dimensions={"width": 800, "height": 600}
                ),
                GalleryImage(
                    image_id="img-toi-khoe",
                    asset=AssetReference(
                        bucket="learnar-assets",
                        path="vietnamese/vocabulary/toi-khoe.jpg",
                        type="image"
                    ),
                    alt_text="Tôi khỏe - I'm fine",
                    caption="Tôi khỏe, cảm ơn bạn!"
                ),
                GalleryImage(
                    image_id="img-chao-buoi-sang",
                    asset=AssetReference(
                        bucket="learnar-assets",
                        path="vietnamese/vocabulary/chao-buoi-sang.jpg",
                        type="image"
                    ),
                    alt_text="Good morning",
                    caption="Chào buổi sáng!"
                )
            ],
            categories=[
                GalleryCategory(
                    category_id="cat-basic",
                    name="Basic Greetings",
                    icon="👋",
                    description="Essential greetings",
                    images=[]
                )
            ],
            enable_zoom=True,
            enable_slideshow=True,
            slideshow_interval=5
        ),
        vocabulary=[
            VocabularyItemEnhanced(
                word_id="word-xin-chao",
                word_en="Hello",
                word_vi="Xin chào",
                phonetic="/sin tɕaːw/",
                emoji="👋",
                image=AssetReference(
                    bucket="learnar-assets",
                    path="vietnamese/vocabulary/chao.jpg",
                    type="image"
                ),
                audio=AssetReference(
                    bucket="learnar-assets",
                    path="vietnamese/audio/xin-chao.mp3",
                    type="audio"
                ),
                example_sentence_en="Hello, my name is Anna.",
                example_sentence_vi="Xin chào, tên tôi là Anna.",
                part_of_speech="interjection",
                difficulty="easy"
            ),
            VocabularyItemEnhanced(
                word_id="word-cam-on",
                word_en="Thank you",
                word_vi="Cảm ơn",
                phonetic="/kaːm ɗɜn/",
                emoji="🙏",
                image=AssetReference(
                    bucket="learnar-assets",
                    path="vietnamese/vocabulary/cam-on.jpg",
                    type="image"
                ),
                audio=AssetReference(
                    bucket="learnar-assets",
                    path="vietnamese/audio/cam-on.mp3",
                    type="audio"
                ),
                example_sentence_en="Thank you for your help.",
                example_sentence_vi="Cảm ơn bạn đã giúp tôi.",
                part_of_speech="interjection",
                difficulty="easy"
            ),
            VocabularyItemEnhanced(
                word_id="word-tam-biet",
                word_en="Goodbye",
                word_vi="Tạm biệt",
                phonetic="/taːm ɓjet/",
                emoji="👋",
                image=AssetReference(
                    bucket="learnar-assets",
                    path="vietnamese/vocabulary/tam-biet.jpg",
                    type="image"
                ),
                audio=AssetReference(
                    bucket="learnar-assets",
                    path="vietnamese/audio/tam-biet.mp3",
                    type="audio"
                ),
                example_sentence_en="Goodbye, see you tomorrow!",
                example_sentence_vi="Tạm biệt, hẹn gặp lại ngày mai!",
                part_of_speech="interjection",
                difficulty="easy"
            ),
            VocabularyItemEnhanced(
                word_id="word-ban-khoe-khong",
                word_en="How are you?",
                word_vi="Bạn khỏe không?",
                phonetic="/ɓan xweː kʷn/",
                emoji="❓",
                image=AssetReference(
                    bucket="learnar-assets",
                    path="vietnamese/vocabulary/ban-khoe-khong.jpg",
                    type="image"
                ),
                audio=AssetReference(
                    bucket="learnar-assets",
                    path="vietnamese/audio/ban-khoe-khong.mp3",
                    type="audio"
                ),
                example_sentence_en="Hello! How are you?",
                example_sentence_vi="Xin chào! Bạn khỏe không?",
                part_of_speech="phrase",
                difficulty="medium"
            ),
            VocabularyItemEnhanced(
                word_id="word-toi-khoe",
                word_en="I'm fine",
                word_vi="Tôi khỏe",
                phonetic="/toj xweː/",
                emoji="😊",
                image=AssetReference(
                    bucket="learnar-assets",
                    path="vietnamese/vocabulary/toi-khoe.jpg",
                    type="image"
                ),
                audio=AssetReference(
                    bucket="learnar-assets",
                    path="vietnamese/audio/toi-khoe.mp3",
                    type="audio"
                ),
                example_sentence_en="I'm fine, thank you!",
                example_sentence_vi="Tôi khỏe, cảm ơn bạn!",
                part_of_speech="phrase",
                difficulty="easy"
            )
        ],
        quiz=QuizSection(
            questions=[
                QuizQuestionEnhanced(
                    question_id="q1",
                    type="multiple_choice",
                    question="How do you say 'Hello' in Vietnamese?",
                    question_vi="Bạn nói 'Hello' bằng tiếng Việt như thế nào?",
                    options=[
                        {"option_id": "a", "text": "Xin chào", "is_correct": True},
                        {"option_id": "b", "text": "Tạm biệt", "is_correct": False},
                        {"option_id": "c", "text": "Cảm ơn", "is_correct": False},
                        {"option_id": "d", "text": "Khỏe", "is_correct": False}
                    ],
                    points=10,
                    explanation="Xin chào means Hello in Vietnamese."
                ),
                QuizQuestionEnhanced(
                    question_id="q2",
                    type="multiple_choice",
                    question="How do you say 'Thank you' in Vietnamese?",
                    question_vi="Bạn nói 'Thank you' bằng tiếng Việt như thế nào?",
                    options=[
                        {"option_id": "a", "text": "Xin chào", "is_correct": False},
                        {"option_id": "b", "text": "Cảm ơn", "is_correct": True},
                        {"option_id": "c", "text": "Tạm biệt", "is_correct": False},
                        {"option_id": "d", "text": "Khỏe không", "is_correct": False}
                    ],
                    points=10,
                    explanation="Cảm ơn means Thank you in Vietnamese."
                ),
                QuizQuestionEnhanced(
                    question_id="q3",
                    type="multiple_choice",
                    question="What does 'Bạn khỏe không?' mean?",
                    question_vi="'Bạn khỏe không?' có nghĩa là gì?",
                    options=[
                        {"option_id": "a", "text": "Goodbye", "is_correct": False},
                        {"option_id": "b", "text": "How are you?", "is_correct": True},
                        {"option_id": "c", "text": "Thank you", "is_correct": False},
                        {"option_id": "d", "text": "Hello", "is_correct": False}
                    ],
                    points=10,
                    explanation="Bạn khỏe không? means How are you? in Vietnamese."
                )
            ],
            pass_score=70,
            show_answers_after_submit=True,
            randomize_questions=True
        )
    )
}

# In-memory session storage
lesson_sessions: Dict[str, LessonProgressEnhanced] = {}


# ============================================
# API Routes
# ============================================

@router.get("/{lesson_id}", response_model=LessonEnhanced)
async def get_lesson(lesson_id: str):
    """Get a lesson by ID"""
    if lesson_id not in SAMPLE_LESSONS:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return SAMPLE_LESSONS[lesson_id]


@router.get("/{lesson_id}/progress", response_model=LessonProgressEnhanced)
async def get_lesson_progress(lesson_id: str, user_id: str):
    """Get user's progress for a lesson"""
    session_key = f"{user_id}_{lesson_id}"
    if session_key not in lesson_sessions:
        # Return initial progress
        lesson = SAMPLE_LESSONS.get(lesson_id)
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")
        
        lesson_sessions[session_key] = LessonProgressEnhanced(
            lesson_id=lesson_id,
            user_id=user_id,
            overall_progress=0,
            section_progress=[],
            total_time_spent=0,
            quiz_scores=[],
            vocabulary_mastery=[],
            earned_badges=[],
            completed_sections=[],
            last_accessed_at=datetime.now().isoformat()
        )
    
    return lesson_sessions[session_key]


@router.post("/session/start", response_model=StartLessonSessionResponse)
async def start_lesson_session(request: StartLessonSessionRequest):
    """Start a new lesson session"""
    lesson = SAMPLE_LESSONS.get(request.lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    session_id = str(uuid4())
    now = datetime.now().isoformat()
    
    # Create initial progress
    progress = LessonProgressEnhanced(
        lesson_id=request.lesson_id,
        user_id=request.user_id,
        overall_progress=0,
        section_progress=[
            SectionProgress(
                section_id=f"section-{i}",
                section_type=section_type,
                progress=0,
                time_spent=0,
                is_completed=False,
                attempts=0
            )
            for i, section_type in enumerate(["introduction", "vocabulary", "quiz"])
        ],
        total_time_spent=0,
        quiz_scores=[],
        vocabulary_mastery=[
            VocabularyMastery(word_id=w.word_id)
            for w in lesson.vocabulary
        ],
        earned_badges=[],
        completed_sections=[],
        last_accessed_at=now
    )
    
    lesson_sessions[f"{request.user_id}_{request.lesson_id}"] = progress
    
    return StartLessonSessionResponse(
        session_id=session_id,
        lesson=lesson,
        progress=progress,
        started_at=now
    )


@router.post("/section/progress")
async def submit_section_progress(request: SubmitSectionProgressRequest):
    """Submit progress for a lesson section"""
    session_key = f"{request.user_id}_{request.lesson_id}"
    if session_key not in lesson_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    progress = lesson_sessions[session_key]
    
    # Update section progress
    for section in progress.section_progress:
        if section.section_id == request.section_id:
            section.progress = request.progress
            section.time_spent += request.time_spent
            if request.score:
                if section.best_score is None or request.score > section.best_score:
                    section.best_score = request.score
                if request.score >= 70:
                    section.is_completed = True
                    if request.section_id not in progress.completed_sections:
                        progress.completed_sections.append(request.section_id)
            section.attempts += 1
            break
    
    # Recalculate overall progress
    total_progress = sum(s.progress for s in progress.section_progress)
    progress.overall_progress = total_progress // len(progress.section_progress) if progress.section_progress else 0
    progress.last_accessed_at = datetime.now().isoformat()
    
    return {"success": True, "progress": progress}


@router.post("/vocabulary/practice")
async def submit_vocabulary_practice(request: SubmitVocabularyPracticeRequest):
    """Submit vocabulary practice attempt"""
    session_key = f"{request.user_id}_{request.lesson_id}"
    if session_key not in lesson_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    progress = lesson_sessions[session_key]
    
    # Update vocabulary mastery
    for mastery in progress.vocabulary_mastery:
        if mastery.word_id == request.word_id:
            if request.is_correct:
                mastery.correct_attempts += 1
                mastery.mastery_level = min(5, mastery.mastery_level + 1)
                if mastery.mastery_level >= 4:
                    mastery.is_mastered = True
            else:
                mastery.incorrect_attempts += 1
                mastery.mastery_level = max(0, mastery.mastery_level - 1)
                mastery.is_mastered = False
            mastery.last_practiced_at = datetime.now().isoformat()
            break
    
    progress.last_accessed_at = datetime.now().isoformat()
    
    return {"success": True, "mastery": progress.vocabulary_mastery}


@router.post("/complete", response_model=CompleteLessonResponse)
async def complete_lesson(request: CompleteLessonRequest):
    """Complete a lesson and award XP"""
    session_key = f"{request.user_id}_{request.lesson_id}"
    if session_key not in lesson_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    lesson = SAMPLE_LESSONS.get(request.lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    progress = lesson_sessions[session_key]
    progress.overall_progress = 100
    progress.total_time_spent = request.total_time_spent
    progress.last_accessed_at = datetime.now().isoformat()
    
    # Award XP
    xp_earned = lesson.xp_reward
    
    # Check for badges
    new_badges = []
    mastered_count = sum(1 for m in progress.vocabulary_mastery if m.is_mastered)
    
    if mastered_count == len(progress.vocabulary_mastery):
        new_badges.append(EarnedBadge(
            badge_id="badge-perfect-vocab",
            name="Perfect Vocabulary",
            icon="🏆",
            earned_at=datetime.now().isoformat(),
            description="Mastered all vocabulary in a lesson!"
        ))
        xp_earned += 10
    
    if request.quiz_score and request.quiz_score >= 90:
        new_badges.append(EarnedBadge(
            badge_id="badge-quiz-star",
            name="Quiz Star",
            icon="⭐",
            earned_at=datetime.now().isoformat(),
            description="Scored 90% or higher on the quiz!"
        ))
        xp_earned += 5
    
    progress.earned_badges.extend(new_badges)
    
    return CompleteLessonResponse(
        success=True,
        xp_earned=xp_earned,
        new_badges=new_badges,
        updated_progress=progress
    )


@router.get("/")
async def list_lessons():
    """List all available lessons"""
    return {
        "lessons": [
            {
                "id": lesson.id,
                "title_en": lesson.title_en,
                "title_vi": lesson.title_vi,
                "description_en": lesson.description_en,
                "duration_minutes": lesson.duration_minutes,
                "xp_reward": lesson.xp_reward,
                "difficulty": lesson.difficulty,
                "tags": lesson.tags
            }
            for lesson in SAMPLE_LESSONS.values()
        ]
    }
