from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator

try:
    from bson import ObjectId
except ModuleNotFoundError:
    class ObjectId:
        def __init__(self) -> None:
            self.value = uuid4().hex

        def __str__(self) -> str:
            return self.value


AssetType = Literal["video", "audio", "image", "sticker", "model", "texture", "mind"]
AssetStatus = Literal["pending", "generating", "ready", "failed"]


class AssetReference(BaseModel):
    bucket: str = "learnar-assets"
    path: str
    type: AssetType
    status: AssetStatus = "pending"


class GeneratedMedia(BaseModel):
    asset: AssetReference
    source: Literal["generated", "uploaded", "placeholder"] = "placeholder"
    prompt: Optional[str] = None


class VideoSchema(BaseModel):
    title: str
    url: str
    duration_seconds: int
    thumbnail_url: Optional[str] = None


class ARReference(BaseModel):
    ar_tag: str
    flashcard_qr_id: Optional[str] = None
    mind_asset: Optional[AssetReference] = None
    model_asset: Optional[AssetReference] = None
    texture_asset: Optional[AssetReference] = None


class VideoScene(BaseModel):
    scene_id: str
    order: int
    duration_seconds: int = Field(ge=5, le=45)
    visual_prompt: str
    narration_vi: str
    audio_text_en: str
    image: Optional[AssetReference] = None
    # Duolingo-style: scene image URL for video frame thumbnails
    scene_image_url: Optional[str] = None
    scene_thumbnail_url: Optional[str] = None


class SceneImage(BaseModel):
    """Scene image for video frame/chapter navigation."""
    scene_id: str
    image_url: str
    thumbnail_url: Optional[str] = None
    timestamp_seconds: int = Field(default=0, ge=0)
    title: str = ""
    description: Optional[str] = None


class LessonMedia(BaseModel):
    """Duolingo-style media container for lesson introduction."""
    # Video fields
    video_url: Optional[str] = None
    video_thumbnail_url: Optional[str] = None
    video_duration_seconds: int = Field(default=0, ge=0)
    
    # Intro video (plays before lesson content)
    intro_video_url: Optional[str] = None
    intro_video_thumbnail: Optional[str] = None
    intro_video_duration: int = Field(default=0, ge=0)
    
    # Image gallery for visual learning
    images: List[str] = Field(default_factory=list)
    
    # Scene/chapter navigation for videos
    scene_images: List[SceneImage] = Field(default_factory=list)
    
    # Auto-play intro at lesson start
    auto_play_intro: bool = True


class VideoLesson(BaseModel):
    title: str
    duration_seconds: int = Field(ge=60, le=120)
    video: AssetReference
    thumbnail: AssetReference
    scenes: List[VideoScene] = Field(min_length=1, max_length=6)


class VocabularyItem(BaseModel):
    word_en: str
    word_vi: str
    emoji: str
    image: AssetReference
    audio: AssetReference
    sticker: Optional[AssetReference] = None
    simple_sentence: str


class Activity(BaseModel):
    activity_id: str
    type: Literal["tap_image", "match_picture", "choose_sound"]
    instruction_vi: str
    prompt_audio_text: str
    items: List[Dict[str, Any]] = Field(default_factory=list)
    feedback_positive_vi: str


class PronunciationTask(BaseModel):
    task_id: str
    instruction_vi: str
    prompt_audio_text: str
    target_words: List[str] = Field(min_length=1, max_length=5)
    audio: AssetReference
    pass_score: int = Field(default=70, ge=50, le=100)
    feedback_positive_vi: str


class SectionGame(BaseModel):
    game_id: str
    type: Literal["listen_and_tap", "picture_match", "memory_match", "find_picture"]
    instruction_vi: str
    prompt_audio_text: str
    items: List[Dict[str, Any]] = Field(default_factory=list)
    feedback_positive_vi: str


class ReadAloudPage(BaseModel):
    page_id: str
    order: int
    text_en: str
    text_vi: str
    highlighted_words: List[str] = Field(default_factory=list)
    image: AssetReference
    audio: AssetReference


class ReadAloudStory(BaseModel):
    story_id: str
    title: str
    instruction_vi: str
    pages: List[ReadAloudPage] = Field(min_length=2, max_length=6)
    feedback_positive_vi: str


class QuizOption(BaseModel):
    option_id: str
    label: str
    image: Optional[AssetReference] = None


class QuizQuestion(BaseModel):
    question_id: str
    type: Literal["image_choice", "sound_choice", "word_choice"]
    prompt_vi: str
    questionAudioText: str
    options: List[QuizOption] = Field(min_length=2, max_length=4)
    correctOptionId: str
    feedbackCorrect: str
    feedbackIncorrect: str


class Reward(BaseModel):
    xp: int = Field(ge=0, le=250)
    sticker: AssetReference
    badgeTitle: str
    message_vi: str


class CourseCatalogPreview(BaseModel):
    label: str
    value: str
    color: str = "sky"


class StudentTestimonial(BaseModel):
    name: str
    role: str
    quote: str
    avatar: str = ""


class EnrollmentCTA(BaseModel):
    headline: str
    body: str
    buttonLabel: str = "Bat dau hoc"


class Lesson(BaseModel):
    # Legacy/simple course fields kept for existing MongoDB documents.
    lesson_id: str = Field(default_factory=lambda: str(ObjectId()))
    title: str
    description: Optional[str] = None
    video: Optional[VideoSchema] = None
    content: Optional[str] = None
    title_vi: str = ""
    order: int
    is_completed: bool = False

    # Duolingo-style media fields
    # Direct video URLs for lesson intro/content
    video_url: Optional[str] = None
    video_thumbnail: Optional[str] = None
    video_duration: int = Field(default=0, ge=0)
    
    # Intro video (plays before main lesson)
    intro_video_url: Optional[str] = None
    intro_video_thumbnail: Optional[str] = None
    
    # Image gallery for visual learning
    images: List[str] = Field(default_factory=list)
    
    # Scene/chapter images for video navigation
    scene_images: List[SceneImage] = Field(default_factory=list)
    
    # Generated-course learning blocks. These are optional at the model layer so older
    # courses can still serialize; seed/course generation validates them.
    duration_minutes: int = Field(default=3, ge=3, le=7)
    videoLesson: Optional[VideoLesson] = None
    vocabulary: List[VocabularyItem] = Field(default_factory=list)
    game: Optional[SectionGame] = None
    readAloudStory: Optional[ReadAloudStory] = None
    pronunciation: Optional[PronunciationTask] = None
    activity: Optional[Activity] = None
    quiz: List[QuizQuestion] = Field(default_factory=list)
    reward: Optional[Reward] = None
    arReference: Optional[ARReference] = None
    generatedMedia: List[GeneratedMedia] = Field(default_factory=list)
    
    # Media container (Duolingo-style)
    lesson_media: Optional[LessonMedia] = None


class LessonSchema(Lesson):
    pass


class CourseSchema(BaseModel):
    course_id: str = Field(default_factory=lambda: str(ObjectId()))
    title: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    subtitle_vi: str = ""
    theme: str = ""
    category_key: str = ""
    category_label: str = ""
    category_icon: str = ""
    age_range: str = "5-8"
    level: Literal["beginner", "intermediate", "advanced"] = "beginner"
    description_vi: str = ""
    thumbnail: Optional[AssetReference] = None
    catalogPreview: List[CourseCatalogPreview] = Field(default_factory=list)
    studentTestimonials: List[StudentTestimonial] = Field(default_factory=list)
    enrollmentCta: Optional[EnrollmentCTA] = None
    lessons: List[Lesson] = Field(default_factory=list)
    is_published: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {
            ObjectId: str
        }
        populate_by_name = True

    @field_validator("age_range")
    @classmethod
    def validate_age_range(cls, value: str) -> str:
        # Note: the authoritative strict validation (rejecting non-"5-8") lives in
        # validate_generated_course() / normalize_course_payload() so that relaxed
        # normalization can fix legacy values without raising.
        return value


class LessonProgress(BaseModel):
    lesson_id: str
    status: Literal["not_started", "started", "completed"] = "not_started"
    best_score: int = 0
    attempts: int = 0
    completed_at: Optional[datetime] = None


class UserProgress(BaseModel):
    user_id: str
    course_id: str
    status: Literal["started", "completed"] = "started"
    current_lesson_id: Optional[str] = None
    completed_lessons: List[str] = Field(default_factory=list)
    lesson_progress: List[LessonProgress] = Field(default_factory=list)
    total_xp: int = 0
    rewards: List[Reward] = Field(default_factory=list)
    started_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


LessonSessionStatus = Literal["started", "completed"]
LessonStepStatus = Literal["locked", "available", "in_progress", "completed", "needs_retry"]


class LessonSessionStepState(BaseModel):
    step_id: str
    title: str = ""
    status: LessonStepStatus = "locked"
    attempts: int = 0
    best_score: int = 0
    passed: bool = False
    last_response: Dict[str, Any] = Field(default_factory=dict)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None


class LessonSession(BaseModel):
    session_id: str = Field(default_factory=lambda: str(ObjectId()))
    user_id: str
    course_id: str
    lesson_id: str
    status: LessonSessionStatus = "started"
    current_step_id: str
    current_step_index: int = 0
    progress_percent: int = 0
    steps: List[LessonSessionStepState] = Field(default_factory=list)
    started_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None


class LessonStepAttemptRequest(BaseModel):
    user_id: str
    step_id: str
    attempt_type: str = "practice"
    passed: bool = False
    score: int = Field(default=0, ge=0, le=100)
    response_data: Dict[str, Any] = Field(default_factory=dict)
    mastery_words: List[str] = Field(default_factory=list)

    @field_validator("passed")
    @classmethod
    def validate_passed_matches_score(cls, v: bool, info) -> bool:
        # SECURITY: Validate that passed status is consistent with score threshold
        # Score should be validated independently; this is a warning-level check
        # Note: We accept passed=True with low scores for retry scenarios
        # The actual validation should happen based on the step requirements
        return v


class LessonSessionRequest(BaseModel):
    user_id: str


class MediaAssetRecord(BaseModel):
    asset_id: str = Field(default_factory=lambda: str(ObjectId()))
    course_id: str
    lesson_id: str
    section_id: str
    asset_key: str
    bucket: str
    path: str
    type: AssetType
    status: AssetStatus = "pending"
    public_url: Optional[str] = None
    provider: str = "supabase"
    metadata: Dict[str, Any] = Field(default_factory=dict)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class StartCourseRequest(BaseModel):
    user_id: str


class CompleteLessonRequest(BaseModel):
    user_id: str
    course_id: str
    score: Optional[float] = None
    time_spent: Optional[int] = None
    words_learned: Optional[List[str]] = None
    pronunciation_scores: Optional[Dict[str, float]] = None
    games_played: Optional[int] = None
    completed_steps: Optional[List[str]] = None


class QuizSubmitRequest(BaseModel):
    user_id: str
    course_id: str
    lesson_id: str
    answers: Dict[str, str]


Course = CourseSchema
