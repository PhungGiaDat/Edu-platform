"""
MongoDB Schema for Enhanced Lessons
Duolingo-inspired lesson system with video, gallery, and progress tracking
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class DifficultyLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class TargetLanguage(str, Enum):
    VIETNAMESE = "vi"
    ENGLISH = "en"
    CHINESE = "zh"


class SectionType(str, Enum):
    INTRODUCTION = "introduction"
    VOCABULARY = "vocabulary"
    PRACTICE = "practice"
    REVIEW = "review"
    QUIZ = "quiz"


class AssetType(str, Enum):
    VIDEO = "video"
    AUDIO = "audio"
    IMAGE = "image"
    STICKER = "sticker"


class AssetStatus(str, Enum):
    PENDING = "pending"
    GENERATING = "generating"
    READY = "ready"
    FAILED = "failed"


# ============================================
# Asset Models
# ============================================

class AssetReference(BaseModel):
    """Reference to a file stored in Supabase Bucket"""
    bucket: str = "learnar-assets"
    path: str
    type: AssetType = AssetType.IMAGE
    status: AssetStatus = AssetStatus.READY
    public_url: Optional[str] = None


class VideoCaption(BaseModel):
    """Caption track for video content"""
    caption_id: str = Field(default_factory=lambda: f"caption-{datetime.now().timestamp()}")
    language: str = "vi"  # vi, en, zh
    label: str  # Display name for caption
    content: str  # VTT format content
    is_default: bool = False


class VideoChapterMarker(BaseModel):
    """Chapter marker for video navigation"""
    title: str
    start_time: int = 0  # seconds
    end_time: Optional[int] = None
    related_vocabulary: List[str] = []


class VideoContent(BaseModel):
    """Video content with captions and chapters"""
    video_id: str = Field(default_factory=lambda: f"video-{datetime.now().timestamp()}")
    title: str
    description: Optional[str] = None
    duration_seconds: int = 0
    primary_source: AssetReference
    thumbnail: AssetReference
    captions: List[VideoCaption] = []
    chapter_markers: List[VideoChapterMarker] = []
    learning_objectives: List[str] = []
    transcript: Optional[str] = None


class GalleryImage(BaseModel):
    """Single image in a gallery"""
    image_id: str = Field(default_factory=lambda: f"img-{datetime.now().timestamp()}")
    asset: AssetReference
    alt_text: str
    caption: Optional[str] = None
    attribution: Optional[str] = None
    dimensions: Optional[Dict[str, int]] = None  # {width, height}
    file_size: Optional[int] = None


class GalleryCategory(BaseModel):
    """Category for organizing gallery images"""
    category_id: str = Field(default_factory=lambda: f"cat-{datetime.now().timestamp()}")
    name: str
    icon: str  # emoji or icon class
    description: Optional[str] = None
    images: List[GalleryImage] = []


class ImageGallery(BaseModel):
    """Image gallery for vocabulary learning"""
    gallery_id: str = Field(default_factory=lambda: f"gallery-{datetime.now().timestamp()}")
    title: str
    description: Optional[str] = None
    cover_image: AssetReference
    preview_images: List[GalleryImage] = []
    all_images: List[GalleryImage] = []
    categories: List[GalleryCategory] = []
    images_per_page: int = 12
    enable_zoom: bool = True
    enable_slideshow: bool = True
    slideshow_interval: int = 5  # seconds


# ============================================
# Vocabulary Models
# ============================================

class VocabularyItemEnhanced(BaseModel):
    """Enhanced vocabulary item with images and audio"""
    word_id: str = Field(default_factory=lambda: f"word-{datetime.now().timestamp()}")
    word_en: str
    word_vi: str
    phonetic: Optional[str] = None  # IPA pronunciation
    emoji: str = "📚"
    image: AssetReference
    audio: AssetReference
    sticker: Optional[AssetReference] = None
    example_sentence_en: str
    example_sentence_vi: str
    part_of_speech: Optional[str] = None  # noun, verb, adjective, etc.
    difficulty: str = "easy"  # easy, medium, hard


# ============================================
# Quiz Models
# ============================================

class QuizOption(BaseModel):
    """Quiz answer option"""
    option_id: str
    label: str
    image: Optional[AssetReference] = None
    is_correct: bool = False


class QuizQuestion(BaseModel):
    """Quiz question"""
    question_id: str = Field(default_factory=lambda: f"q-{datetime.now().timestamp()}")
    type: str = "multiple_choice"  # multiple_choice, true_false, fill_blank
    question: str
    question_vi: str
    image: Optional[AssetReference] = None
    options: List[QuizOption] = []
    correct_answer: Optional[str] = None  # for fill_blank type
    points: int = 10
    explanation: Optional[str] = None


class QuizSection(BaseModel):
    """Quiz section with questions"""
    questions: List[QuizQuestion] = []
    pass_score: int = 70
    show_answers_after_submit: bool = True
    randomize_questions: bool = False


# ============================================
# Practice Models
# ============================================

class PracticeItem(BaseModel):
    """Practice exercise item"""
    item_id: str = Field(default_factory=lambda: f"practice-{datetime.now().timestamp()}")
    prompt: str
    prompt_vi: str
    image: Optional[AssetReference] = None
    audio_prompt: Optional[AssetReference] = None
    options: List[QuizOption] = []
    correct_answer: Optional[str] = None
    feedback_correct: str = "Great job!"
    feedback_incorrect: str = "Try again!"


class PracticeSection(BaseModel):
    """Practice section"""
    practice_type: str = "listening"  # listening, speaking, reading, matching
    instruction_vi: str
    instruction_en: str
    items: List[PracticeItem] = []
    pass_score: int = 70
    max_attempts: int = 3
    immediate_feedback: bool = True


# ============================================
# Lesson Section Models
# ============================================

class LessonSection(BaseModel):
    """Individual section within a lesson"""
    section_id: str = Field(default_factory=lambda: f"section-{datetime.now().timestamp()}")
    type: SectionType = SectionType.VOCABULARY
    title: str
    subtitle: Optional[str] = None
    estimated_time_seconds: Optional[int] = None
    order: int = 0
    
    # Content varies by type - use discriminated union in actual implementation
    video_content: Optional[VideoContent] = None
    image_gallery: Optional[ImageGallery] = None
    vocabulary_items: List[VocabularyItemEnhanced] = []
    practice_section: Optional[PracticeSection] = None
    quiz_section: Optional[QuizSection] = None
    
    # Completion requirements
    completion_type: str = "manual"  # watch_complete, images_viewed, words_practiced, quiz_passed, manual
    completion_threshold: int = 100  # percentage or count


# ============================================
# Progress Models
# ============================================

class SectionProgress(BaseModel):
    """Progress for a single lesson section"""
    section_id: str
    section_type: str
    progress: int = 0  # 0-100
    time_spent: int = 0  # seconds
    is_completed: bool = False
    best_score: Optional[int] = None
    attempts: int = 0
    completed_at: Optional[datetime] = None


class VocabularyMastery(BaseModel):
    """Vocabulary mastery tracking"""
    word_id: str
    mastery_level: int = 0  # 0-5
    correct_attempts: int = 0
    incorrect_attempts: int = 0
    last_practiced_at: Optional[datetime] = None
    is_mastered: bool = False  # True if level >= 4


class QuizScore(BaseModel):
    """Quiz attempt record"""
    attempted_at: datetime = Field(default_factory=datetime.now)
    score: int  # percentage
    correct_count: int
    total_questions: int
    time_taken: int  # seconds


class EarnedBadge(BaseModel):
    """Badge earned by user"""
    badge_id: str
    name: str
    icon: str
    earned_at: datetime = Field(default_factory=datetime.now)
    description: str


class LessonSession(BaseModel):
    """Active lesson session"""
    session_id: str = Field(default_factory=lambda: f"session-{datetime.now().timestamp()}")
    lesson_id: str
    user_id: str
    started_at: datetime = Field(default_factory=datetime.now)
    current_section_index: int = 0
    answers_so_far: Dict[str, str] = {}  # question_id -> answer
    status: str = "in_progress"  # in_progress, completed, abandoned


class LessonProgress(BaseModel):
    """User's overall progress for a lesson"""
    lesson_id: str
    user_id: str
    overall_progress: int = 0  # 0-100
    section_progress: List[SectionProgress] = []
    total_time_spent: int = 0  # seconds
    quiz_scores: List[QuizScore] = []
    vocabulary_mastery: List[VocabularyMastery] = []
    earned_badges: List[EarnedBadge] = []
    completed_sections: List[str] = []
    current_session: Optional[LessonSession] = None
    last_accessed_at: datetime = Field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    
    class Config:
        arbitrary_types_allowed = True


# ============================================
# Main Lesson Model
# ============================================

class Lesson(BaseModel):
    """Enhanced lesson with video, gallery, and progress tracking"""
    id: str = Field(default_factory=lambda: f"lesson-{datetime.now().timestamp()}")
    course_id: str
    title_en: str
    title_vi: str
    description_en: Optional[str] = None
    description_vi: Optional[str] = None
    order: int = 0
    duration_minutes: int = 10
    xp_reward: int = 20
    difficulty: DifficultyLevel = DifficultyLevel.BEGINNER
    target_language: TargetLanguage = TargetLanguage.VIETNAMESE
    
    # Introduction video (optional)
    introduction_video: Optional[VideoContent] = None
    
    # Vocabulary gallery (optional)
    vocabulary_gallery: Optional[ImageGallery] = None
    
    # Lesson sections
    sections: List[LessonSection] = []
    
    # Final quiz (optional)
    quiz: Optional[QuizSection] = None
    
    # Reward configuration
    reward: Optional[Dict[str, Any]] = None  # xp, badge, sticker
    
    # Metadata
    tags: List[str] = []
    prerequisites: List[str] = []  # lesson IDs
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    is_published: bool = False
    
    class Config:
        arbitrary_types_allowed = True


# ============================================
# MongoDB Document Helpers
# ============================================

def lesson_to_document(lesson: Lesson) -> Dict[str, Any]:
    """Convert Lesson model to MongoDB document"""
    return lesson.model_dump(mode="json")


def document_to_lesson(doc: Dict[str, Any]) -> Lesson:
    """Convert MongoDB document to Lesson model"""
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return Lesson(**doc)


# ============================================
# Index Definitions for MongoDB
# ============================================

LESSON_INDEXES = [
    # Primary lookup
    {"keys": [("id", 1)], "unique": True},
    # Course lessons lookup
    {"keys": [("course_id", 1), ("order", 1)]},
    # Tag-based search
    {"keys": [("tags", 1)]},
    # Difficulty filter
    {"keys": [("difficulty", 1)]},
    # Published lessons
    {"keys": [("is_published", 1)]},
    # Created date for sorting
    {"keys": [("created_at", -1)]},
]

PROGRESS_INDEXES = [
    # User-lesson progress lookup
    {"keys": [("user_id", 1), ("lesson_id", 1)], "unique": True},
    # User's overall progress
    {"keys": [("user_id", 1), ("overall_progress", -1)]},
    # Recently accessed
    {"keys": [("user_id", 1), ("last_accessed_at", -1)]},
]

SESSION_INDEXES = [
    # Session lookup
    {"keys": [("session_id", 1)], "unique": True},
    # Active sessions by user
    {"keys": [("user_id", 1), ("status", 1)]},
]
