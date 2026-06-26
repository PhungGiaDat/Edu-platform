# MongoDB Admin Schema Design - Edu-platform

**Document Version:** 1.0  
**Date:** 2026-06-26  
**Database:** MongoDB (edu_platform)  
**ODM:** Beanie (PyMongo)

---

## Executive Summary

This document defines the MongoDB schema design for the Edu-platform Admin features. The design follows existing patterns established in the codebase (Beanie ODM, embedded documents for nested structures, separate collections for scalable data), while providing comprehensive data models for Flashcards, Student Learning Tracking, Course Management, and Teacher/Admin profiles.

---

## 1. Collection Overview

| Collection | Purpose | Pattern |
|------------|---------|---------|
| `flashcard_decks` | Organized flashcard deck containers | **Reference** |
| `flashcard_cards` | Individual flashcard content | **Reference** (to decks) |
| `flashcard_categories` | Category taxonomy for organization | **Embedded** (in decks) |
| `student_enrollments` | Course/class enrollments | **Reference** |
| `student_progress` | Per-user, per-course progress | **Reference** |
| `lesson_attempts` | Detailed attempt history | **Reference** |
| `course_templates` | Course template definitions | **Reference** |
| `course_lessons` | Individual lesson content | **Reference** (to templates) |
| `lesson_resources` | Resources attached to lessons | **Reference** (to lessons) |
| `teacher_profiles` | Teacher user profiles | **Reference** |
| `admin_profiles` | Admin user profiles | **Reference** |

---

## 2. Flashcards Schema Design

### 2.1 Collection: `flashcard_decks`

Container for organizing flashcards into decks/categories.

```python
# backend/models/admin/flashcard_deck.py

from beanie import Document, Indexed, Link
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum


class DeckStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class FlashcardDeck(Document):
    """
    Flashcard Deck Document - MongoDB collection: flashcard_decks
    
    Embeds categories for quick access; references cards for scalability.
    """
    deck_id: Indexed(str, unique=True)  # e.g., "deck_fruits_001"
    name: str
    description: Optional[str] = None
    
    # Organization
    category_path: List[str] = Field(
        default_factory=list,
        description="Hierarchical path: ['language', 'english', 'vocabulary']"
    )
    tags: List[str] = Field(default_factory=list)
    language_pair: Dict[str, str] = Field(
        default={"source": "en", "target": "vi"},
        description="Source and target language codes"
    )
    
    # Target audience
    age_range_min: int = Field(default=5, ge=3)
    age_range_max: int = Field(default=8, le=18)
    
    # Stats (denormalized for dashboard queries)
    total_cards: int = 0
    total_mastered: int = 0
    total_learners: int = 0
    
    # Metadata
    status: DeckStatus = DeckStatus.DRAFT
    created_by: Indexed(str)  # teacher_id or admin_id
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    # Categories embedded for quick filtering
    categories: List["DeckCategory"] = Field(default_factory=list)
    
    class Settings:
        name = "flashcard_decks"
        indexes = [
            "deck_id",
            "status",
            "category_path",
            "tags",
            ("created_by", "status"),
            ("category_path", "status"),
        ]
    
    class Config:
        json_schema_extra = {
            "example": {
                "deck_id": "deck_fruits_001",
                "name": "Fruits Vocabulary",
                "description": "Learn common fruits in English",
                "category_path": ["language", "english", "vocabulary", "fruits"],
                "tags": ["beginner", "vocabulary", "flashcards"],
                "language_pair": {"source": "en", "target": "vi"},
                "age_range_min": 5,
                "age_range_max": 8,
                "status": "published",
                "created_by": "teacher_001",
                "categories": [
                    {"name": "Fruits", "icon": "apple", "color": "#FF6B6B"},
                    {"name": "Colors", "icon": "palette", "color": "#4ECDC4"}
                ]
            }
        }


class DeckCategory(BaseModel):
    """Embedded category within a deck"""
    name: str
    icon: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    order: int = 0
```

### 2.2 Collection: `flashcard_cards`

Individual flashcard content with versioning support.

```python
# backend/models/admin/flashcard_card.py

from beanie import Document, Indexed
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime


class CardStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    INACTIVE = "inactive"
    FLAGGED = "flagged"


class CardDifficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class FlashcardCard(Document):
    """
    Flashcard Card Document - MongoDB collection: flashcard_cards
    
    References deck for organization; embeds all content for fast reads.
    """
    card_id: Indexed(str, unique=True)  # e.g., "card_apple_001"
    deck_id: Indexed(str)  # Reference to flashcard_decks.deck_id
    
    # Core content
    word: str
    pronunciation: Optional[str] = None  # IPA or phonetic guide
    translation: Dict[str, str] = Field(
        ...,
        description="Translations keyed by language code"
    )
    definition: Optional[str] = None
    
    # Media
    image_url: Optional[str] = None
    audio_url: Optional[str] = None  # Native speaker pronunciation
    video_url: Optional[str] = None  # Optional context video
    
    # Example usage
    example_sentence: Optional[Dict[str, str]] = Field(
        default_factory=dict,
        description="Example sentences by language"
    )
    example_audio_url: Optional[str] = None
    
    # AR/3D
    ar_tag: Optional[str] = None  # AR marker reference
    model_3d_url: Optional[str] = None  # 3D model for AR
    
    # AI/ML
    vector_embedding: Optional[List[float]] = Field(
        default=None,
        description="Semantic embedding for similarity search"
    )
    
    # Difficulty & metadata
    difficulty: CardDifficulty = CardDifficulty.EASY
    status: CardStatus = CardStatus.ACTIVE
    version: int = 1
    previous_versions: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Statistics (denormalized)
    times_viewed: int = 0
    times_mastered: int = 0
    avg_success_rate: float = 0.0
    
    # Timestamps
    created_by: Indexed(str)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    class Settings:
        name = "flashcard_cards"
        indexes = [
            "card_id",
            "deck_id",
            "status",
            "difficulty",
            ("deck_id", "status"),
            ("deck_id", "difficulty"),
            ("created_by", "status"),
            ("word", "text"),  # Text index for search
        ]
    
    class Config:
        json_schema_extra = {
            "example": {
                "card_id": "card_apple_001",
                "deck_id": "deck_fruits_001",
                "word": "apple",
                "pronunciation": "/ˈæpəl/",
                "translation": {"en": "apple", "vi": "quả táo", "zh": "苹果"},
                "definition": "A round fruit with red, green, or yellow skin",
                "image_url": "https://cdn.eduplatform.com/cards/apple.png",
                "audio_url": "https://cdn.eduplatform.com/audio/apple.mp3",
                "example_sentence": {
                    "en": "I eat an apple every day.",
                    "vi": "Tôi ăn một quả táo mỗi ngày."
                },
                "difficulty": "easy",
                "status": "active"
            }
        }


class FlashcardCardCreate(BaseModel):
    """Schema for creating a flashcard card"""
    card_id: str
    deck_id: str
    word: str
    pronunciation: Optional[str] = None
    translation: Dict[str, str]
    definition: Optional[str] = None
    image_url: Optional[str] = None
    audio_url: Optional[str] = None
    video_url: Optional[str] = None
    example_sentence: Optional[Dict[str, str]] = None
    example_audio_url: Optional[str] = None
    ar_tag: Optional[str] = None
    model_3d_url: Optional[str] = None
    difficulty: CardDifficulty = CardDifficulty.EASY


class FlashcardCardUpdate(BaseModel):
    """Schema for updating a flashcard card"""
    word: Optional[str] = None
    pronunciation: Optional[str] = None
    translation: Optional[Dict[str, str]] = None
    definition: Optional[str] = None
    image_url: Optional[str] = None
    audio_url: Optional[str] = None
    video_url: Optional[str] = None
    example_sentence: Optional[Dict[str, str]] = None
    example_audio_url: Optional[str] = None
    ar_tag: Optional[str] = None
    model_3d_url: Optional[str] = None
    difficulty: Optional[CardDifficulty] = None
    status: Optional[CardStatus] = None
```

---

## 3. Student Learning Tracking Schema Design

### 3.1 Collection: `student_enrollments`

Track which students are enrolled in which courses/decks.

```python
# backend/models/admin/student_enrollment.py

from beanie import Document, Indexed
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class EnrollmentStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    EXPIRED = "expired"


class StudentEnrollment(Document):
    """
    Student Enrollment Document - MongoDB collection: student_enrollments
    
    Tracks enrollment state for students in courses or flashcard decks.
    """
    enrollment_id: Indexed(str, unique=True)
    student_id: Indexed(str)  # Reference to users._id
    target_type: str  # "course" or "deck"
    target_id: Indexed(str)  # course_id or deck_id
    
    # Enrollment details
    status: EnrollmentStatus = EnrollmentStatus.ACTIVE
    enrolled_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    
    # Progress summary (denormalized)
    progress_percent: float = 0.0
    lessons_completed: int = 0
    total_lessons: int = 0
    cards_mastered: int = 0
    total_cards: int = 0
    
    # Time tracking
    total_time_spent_minutes: int = 0
    last_activity_at: Optional[datetime] = None
    
    # Teacher assignment
    assigned_teacher_id: Optional[str] = None
    
    # Custom goals
    personal_goals: Optional[Dict[str, Any]] = Field(default_factory=dict)
    
    class Settings:
        name = "student_enrollments"
        indexes = [
            "enrollment_id",
            "student_id",
            ("student_id", "status"),
            ("target_id", "target_type"),
            ("assigned_teacher_id", "status"),
            ("enrolled_at", "status"),
        ]
    
    class Config:
        json_schema_extra = {
            "example": {
                "enrollment_id": "enroll_student1_course1",
                "student_id": "student_001",
                "target_type": "course",
                "target_id": "course_001",
                "status": "active",
                "progress_percent": 45.5,
                "lessons_completed": 5,
                "total_lessons": 11,
                "assigned_teacher_id": "teacher_001"
            }
        }
```

### 3.2 Collection: `student_progress`

Detailed progress tracking per student per course/deck.

```python
# backend/models/admin/student_progress.py

from beanie import Document, Indexed
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class LessonProgress(BaseModel):
    """Progress for a single lesson"""
    lesson_id: str
    status: str = "not_started"  # not_started, in_progress, completed
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    best_score: int = 0
    attempts: int = 0
    time_spent_minutes: int = 0
    

class CardProgress(BaseModel):
    """Progress for a single flashcard"""
    card_id: str
    mastery_level: int = Field(default=0, ge=0, le=5)
    times_seen: int = 0
    times_correct: int = 0
    times_incorrect: int = 0
    last_seen_at: Optional[datetime] = None
    mastered_at: Optional[datetime] = None


class StudentProgress(Document):
    """
    Student Progress Document - MongoDB collection: student_progress
    
    One document per student per course/deck enrollment.
    Embeds lesson and card progress for fast reads.
    """
    progress_id: Indexed(str, unique=True)
    enrollment_id: Indexed(str)  # Reference to student_enrollments
    student_id: Indexed(str)
    target_type: str  # "course" or "deck"
    target_id: str
    
    # Overall status
    status: str = "active"  # active, paused, completed
    current_lesson_id: Optional[str] = None
    progress_percent: float = 0.0
    
    # Gamification (denormalized)
    total_xp: int = 0
    streak_days: int = 0
    longest_streak: int = 0
    badges_earned: List[str] = Field(default_factory=list)
    stickers_earned: List[str] = Field(default_factory=list)
    
    # Embedded progress arrays
    lesson_progress: List[LessonProgress] = Field(default_factory=list)
    card_progress: List[CardProgress] = Field(default_factory=list)
    
    # Mastery summary
    total_cards_mastered: int = 0
    average_mastery: float = 0.0
    
    # Time tracking
    total_time_spent_minutes: int = 0
    last_activity_at: Optional[datetime] = None
    
    # Timestamps
    started_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    class Settings:
        name = "student_progress"
        indexes = [
            "progress_id",
            "enrollment_id",
            "student_id",
            ("student_id", "target_type"),
            ("target_id", "student_id"),
            ("status", "updated_at"),
            ("total_xp", -1),  # For leaderboard queries
        ]
    
    class Config:
        json_schema_extra = {
            "example": {
                "progress_id": "prog_student1_course1",
                "enrollment_id": "enroll_student1_course1",
                "student_id": "student_001",
                "target_type": "course",
                "target_id": "course_001",
                "status": "active",
                "progress_percent": 45.5,
                "total_xp": 1250,
                "streak_days": 7,
                "lesson_progress": [
                    {
                        "lesson_id": "lesson_001",
                        "status": "completed",
                        "best_score": 95,
                        "attempts": 1
                    }
                ],
                "card_progress": [
                    {
                        "card_id": "card_apple_001",
                        "mastery_level": 4,
                        "times_seen": 10,
                        "times_correct": 9
                    }
                ]
            }
        }
```

### 3.3 Collection: `lesson_attempts`

Detailed attempt history for analytics and mastery calculation.

```python
# backend/models/admin/lesson_attempt.py

from beanie import Document, Indexed
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class AttemptType(str, Enum):
    QUIZ = "quiz"
    PRACTICE = "practice"
    PRONUNCIATION = "pronunciation"
    GAME = "game"
    READING = "reading"


class AttemptResult(str, Enum):
    PASS = "pass"
    FAIL = "fail"
    INCOMPLETE = "incomplete"


class StepAttempt(BaseModel):
    """Individual step/question attempt within a lesson"""
    step_id: str
    step_type: str  # quiz, activity, pronunciation, etc.
    attempt_number: int = 1
    score: int = Field(default=0, ge=0, le=100)
    result: AttemptResult = AttemptResult.INCOMPLETE
    time_spent_seconds: int = 0
    response_data: Dict[str, Any] = Field(default_factory=dict)
    correct_answers: List[str] = Field(default_factory=list)
    incorrect_answers: List[str] = Field(default_factory=list)
    attempted_at: datetime = Field(default_factory=datetime.utcnow)


class LessonAttempt(Document):
    """
    Lesson Attempt Document - MongoDB collection: lesson_attempts
    
    Stores detailed attempt history for analytics and mastery tracking.
    """
    attempt_id: Indexed(str, unique=True)
    enrollment_id: Indexed(str)
    student_id: Indexed(str)
    lesson_id: Indexed(str)
    target_type: str  # "course" or "deck"
    target_id: str
    
    # Attempt metadata
    attempt_type: AttemptType = AttemptType.QUIZ
    attempt_number: int = 1
    result: AttemptResult = AttemptResult.INCOMPLETE
    
    # Scores
    raw_score: int = Field(default=0, ge=0, le=100)
    weighted_score: int = Field(default=0, ge=0, le=100)
    
    # Timing
    started_at: datetime
    completed_at: Optional[datetime] = None
    time_spent_seconds: int = 0
    
    # Detailed steps
    step_attempts: List[StepAttempt] = Field(default_factory=list)
    
    # XP earned
    xp_earned: int = 0
    bonus_xp: int = 0
    
    # Mastery updates triggered
    mastery_updates: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Metadata
    device_info: Optional[Dict[str, Any]] = Field(default_factory=dict)
    session_id: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "lesson_attempts"
        indexes = [
            "attempt_id",
            "enrollment_id",
            "student_id",
            "lesson_id",
            ("student_id", "lesson_id"),
            ("lesson_id", "created_at"),
            ("enrollment_id", "attempt_type"),
            ("student_id", "result"),
            ("created_at", -1),
        ]
```

---

## 4. Course Management Schema Design

### 4.1 Collection: `course_templates`

Course template definitions (extends existing `courses` collection pattern).

```python
# backend/models/admin/course_template.py

from beanie import Document, Indexed
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class CourseStatus(str, Enum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class CourseTemplate(Document):
    """
    Course Template Document - MongoDB collection: course_templates
    
    Template for creating course instances. Contains metadata and
    lesson references; actual content lives in course_lessons.
    """
    template_id: Indexed(str, unique=True)
    title: str
    title_vi: str = ""  # Vietnamese translation
    description: Optional[str] = None
    description_vi: Optional[str] = None
    
    # Categorization
    category_key: str
    category_label: str = ""
    tags: List[str] = Field(default_factory=list)
    
    # Target audience
    age_range: str = "5-8"
    level: str = "beginner"  # beginner, intermediate, advanced
    
    # Theme/branding
    theme: str = "default"
    thumbnail_url: Optional[str] = None
    cover_image_url: Optional[str] = None
    
    # Content structure
    lesson_ids: List[str] = Field(default_factory=list)
    total_lessons: int = 0
    estimated_duration_minutes: int = 0
    
    # Pricing/access
    is_premium: bool = False
    access_tiers: List[str] = Field(default_factory=list)
    
    # Review workflow
    status: CourseStatus = CourseStatus.DRAFT
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_notes: Optional[str] = None
    
    # Statistics
    total_enrollments: int = 0
    average_rating: float = 0.0
    completion_rate: float = 0.0
    
    # Ownership
    created_by: Indexed(str)
    updated_by: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    
    class Settings:
        name = "course_templates"
        indexes = [
            "template_id",
            "status",
            "category_key",
            ("status", "category_key"),
            ("created_by", "status"),
            ("level", "status"),
            ("title", "text"),
        ]
```

### 4.2 Collection: `course_lessons`

Individual lesson content (extends existing `courses.lessons` pattern).

```python
# backend/models/admin/course_lesson.py

from beanie import Document, Indexed
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class LessonStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    HIDDEN = "hidden"
    DEPRECATED = "deprecated"


class LessonSection(BaseModel):
    """A section within a lesson (vocabulary, activity, quiz, etc.)"""
    section_id: str
    type: str  # video, vocabulary, activity, quiz, pronunciation, reading
    title: str
    title_vi: str = ""
    order: int
    is_required: bool = True
    is_skippable: bool = False
    
    # Content reference (resource_id or embedded content)
    content_ref: Optional[str] = None  # Reference to lesson_resources
    embedded_content: Optional[Dict[str, Any]] = None
    
    # Scoring
    passing_score: int = Field(default=70, ge=0, le=100)
    max_score: int = 100
    weight: float = 1.0  # Weight in overall lesson score
    
    # Timing
    estimated_duration_seconds: int = 180  # 3 minutes default
    
    # Rewards
    xp_reward: int = 50
    sticker_reward: Optional[Dict[str, str]] = None
    
    # AI content generation
    generation_status: str = "pending"  # pending, generating, ready, failed
    generation_prompt: Optional[str] = None


class CourseLesson(Document):
    """
    Course Lesson Document - MongoDB collection: course_lessons
    
    Individual lesson content with sections and resources.
    """
    lesson_id: Indexed(str, unique=True)
    template_id: Indexed(str)  # Reference to course_templates
    title: str
    title_vi: str = ""
    description: Optional[str] = None
    description_vi: Optional[str] = None
    
    # Structure
    order: int
    sections: List[LessonSection] = Field(default_factory=list)
    total_sections: int = 0
    
    # Media
    thumbnail_url: Optional[str] = None
    preview_video_url: Optional[str] = None
    
    # Requirements
    prerequisites: List[str] = Field(default_factory=list)  # lesson_ids
    unlocks_lesson_ids: List[str] = Field(default_factory=list)
    
    # Timing
    estimated_duration_minutes: int = 5
    
    # Status
    status: LessonStatus = LessonStatus.DRAFT
    
    # Statistics (denormalized)
    total_attempts: int = 0
    average_score: float = 0.0
    completion_rate: float = 0.0
    
    # Ownership
    created_by: Indexed(str)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    
    class Settings:
        name = "course_lessons"
        indexes = [
            "lesson_id",
            "template_id",
            ("template_id", "order"),
            "status",
            ("created_by", "status"),
            ("order", "status"),
        ]
```

### 4.3 Collection: `lesson_resources`

Media and content resources attached to lessons.

```python
# backend/models/admin/lesson_resource.py

from beanie import Document, Indexed
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum


class ResourceType(str, Enum):
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    MODEL_3D = "model_3d"
    TEXTURE = "texture"
    DOCUMENT = "document"
    INTERACTIVE = "interactive"


class ResourceStatus(str, Enum):
    PENDING = "pending"
    UPLOADING = "uploading"
    READY = "ready"
    FAILED = "failed"


class LessonResource(Document):
    """
    Lesson Resource Document - MongoDB collection: lesson_resources
    
    Stores metadata for media assets used in lessons.
    """
    resource_id: Indexed(str, unique=True)
    lesson_id: Indexed(str)
    section_id: Optional[str] = None
    
    # Content
    type: ResourceType
    name: str
    description: Optional[str] = None
    
    # Storage
    bucket: str = "learnar-assets"
    storage_path: str
    public_url: Optional[str] = None
    
    # Status
    status: ResourceStatus = ResourceStatus.PENDING
    file_size_bytes: int = 0
    mime_type: Optional[str] = None
    
    # Metadata
    width: Optional[int] = None  # For images/videos
    height: Optional[int] = None
    duration_seconds: Optional[int] = None  # For audio/video
    checksum: Optional[str] = None
    
    # AI generation
    is_generated: bool = False
    generation_prompt: Optional[str] = None
    generation_model: Optional[str] = None
    
    # Usage tracking
    used_in_lessons: int = 0
    last_used_at: Optional[datetime] = None
    
    # Ownership
    uploaded_by: Indexed(str)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    class Settings:
        name = "lesson_resources"
        indexes = [
            "resource_id",
            "lesson_id",
            ("lesson_id", "section_id"),
            "type",
            ("uploaded_by", "type"),
            ("bucket", "storage_path"),
            ("status", "type"),
        ]
```

---

## 5. Teacher/Admin Profiles Schema Design

### 5.1 Collection: `teacher_profiles`

Extended profile for users with teacher role.

```python
# backend/models/admin/teacher_profile.py

from beanie import Document, Indexed
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class TeacherStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"


class StudentAssignment(BaseModel):
    """Student assigned to teacher"""
    student_id: str
    enrollment_id: str
    assigned_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "active"  # active, graduated, transferred


class TeacherProfile(Document):
    """
    Teacher Profile Document - MongoDB collection: teacher_profiles
    
    Extended profile for users with teacher role.
    """
    teacher_id: Indexed(str, unique=True)  # Links to users._id
    user_id: Indexed(str, unique=True)
    
    # Professional info
    display_name: str
    title: Optional[str] = None  # e.g., "English Teacher"
    bio: Optional[str] = None
    bio_vi: Optional[str] = None
    
    # Specializations
    subjects: List[str] = Field(default_factory=list)
    grade_levels: List[str] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=list)
    
    # Contact
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    social_links: Dict[str, str] = Field(default_factory=dict)
    
    # Media
    avatar_url: Optional[str] = None
    cover_image_url: Optional[str] = None
    
    # Status
    status: TeacherStatus = TeacherStatus.ACTIVE
    verified_at: Optional[datetime] = None
    verification_notes: Optional[str] = None
    
    # Teaching stats
    total_students: int = 0
    total_courses: int = 0
    average_rating: float = 0.0
    total_reviews: int = 0
    
    # Embedded assignments
    student_assignments: List[StudentAssignment] = Field(default_factory=list)
    
    # Courses created
    course_ids: List[str] = Field(default_factory=list)
    deck_ids: List[str] = Field(default_factory=list)
    
    # Settings
    settings: Dict[str, Any] = Field(default_factory=dict)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    class Settings:
        name = "teacher_profiles"
        indexes = [
            "teacher_id",
            "user_id",
            "status",
            ("status", "total_students"),
            ("subjects", "status"),
        ]
```

### 5.2 Collection: `admin_profiles`

Extended profile for users with admin role.

```python
# backend/models/admin/admin_profile.py

from beanie import Document, Indexed
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class AdminRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    CONTENT_ADMIN = "content_admin"
    USER_ADMIN = "user_admin"
    ANALYTICS_ADMIN = "analytics_admin"
    SUPPORT_ADMIN = "support_admin"


class AdminPermission(BaseModel):
    """Permission granted to admin"""
    permission: str
    granted_at: datetime = Field(default_factory=datetime.utcnow)
    granted_by: Optional[str] = None
    expires_at: Optional[datetime] = None


class AuditLogEntry(BaseModel):
    """Audit log entry for admin actions"""
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)
    ip_address: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class AdminProfile(Document):
    """
    Admin Profile Document - MongoDB collection: admin_profiles
    
    Extended profile for users with admin role.
    """
    admin_id: Indexed(str, unique=True)  # Links to users._id
    user_id: Indexed(str, unique=True)
    
    # Professional info
    display_name: str
    title: Optional[str] = None
    department: Optional[str] = None
    
    # Role & permissions
    role: AdminRole = AdminRole.CONTENT_ADMIN
    permissions: List[AdminPermission] = Field(default_factory=list)
    
    # Access scope
    managed_teacher_ids: List[str] = Field(default_factory=list)  # For content admins
    managed_categories: List[str] = Field(default_factory=list)
    
    # Activity tracking
    last_activity_at: Optional[datetime] = None
    total_actions: int = 0
    
    # Audit log (embedded, recent only)
    recent_audit_log: List[AuditLogEntry] = Field(default_factory=list)
    
    # Settings
    settings: Dict[str, Any] = Field(default_factory=dict)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    class Settings:
        name = "admin_profiles"
        indexes = [
            "admin_id",
            "user_id",
            "role",
            ("role", "user_id"),
        ]
```

---

## 6. Relationship Patterns

### 6.1 Embedding vs Referencing Decision Matrix

| Data Pattern | Strategy | Rationale |
|--------------|----------|-----------|
| **Categories in decks** | **Embed** | Small array, frequently accessed together, rarely queried alone |
| **Lesson progress in student_progress** | **Embed** | Need fast reads for active students, bounded array size |
| **Step attempts in lesson_attempts** | **Embed** | Small array, immutable after creation, analytics-friendly |
| **Cards in decks** | **Reference** | Large arrays, need pagination, cards belong to one deck |
| **Resources in lessons** | **Reference** | Shared resources, need asset management |
| **Student assignments in teacher** | **Embed** | Bounded size, teacher's student list is manageable |
| **Recent audit logs** | **Embed** | Fixed-size rolling window, no growth concerns |

### 6.2 Reference Patterns

```python
# Example: Linking cards to deck via deck_id
flashcard_card = await FlashcardCard.find_one(FlashcardCard.card_id == "card_apple_001")
deck = await FlashcardDeck.find_one(FlashcardDeck.deck_id == flashcard_card.deck_id)

# Example: Finding all cards in a deck
cards = await FlashcardCard.find(FlashcardCard.deck_id == "deck_fruits_001").to_list()

# Example: Aggregation to get deck with card count
pipeline = [
    {"$match": {"deck_id": "deck_fruits_001"}},
    {"$lookup": {
        "from": "flashcard_cards",
        "let": {"deck_id": "$deck_id"},
        "pipeline": [
            {"$match": {"$expr": {"$eq": ["$deck_id", "$$deck_id"]}}},
            {"$count": "total"}
        ],
        "as": "card_count"
    }},
    {"$unwind": {"path": "$card_count", "preserveNullAndEmptyArrays": True}}
]
```

---

## 7. Aggregation Pipeline Examples

### 7.1 Student Progress Report

```javascript
// Get comprehensive progress report for a student
db.student_progress.aggregate([
    // Match the student's progress
    { $match: { student_id: "student_001" } },
    
    // Lookup enrollment details
    {
        $lookup: {
            from: "student_enrollments",
            localField: "enrollment_id",
            foreignField: "enrollment_id",
            as: "enrollment"
        }
    },
    { $unwind: "$enrollment" },
    
    // Lookup target (course or deck) info
    {
        $lookup: {
            from: "course_templates",
            let: { target_id: "$target_id" },
            pipeline: [
                { $match: { $expr: { $eq: ["$template_id", "$$target_id"] } } }
            ],
            as: "target"
        }
    },
    { $unwind: { path: "$target", "preserveNullAndEmptyArrays": true } },
    
    // Calculate statistics
    {
        $addFields: {
            mastery_percentage: {
                $cond: {
                    if: { $gt: ["$total_cards_mastered", 0] },
                    then: {
                        $multiply: [
                            { $divide: ["$total_cards_mastered", { $max: ["$enrollment.total_cards", 1] }] },
                            100
                        ]
                    },
                    else: 0
                }
            },
            average_daily_time: {
                $cond: {
                    if: { $gt: ["$streak_days", 0] },
                    then: { $divide: ["$total_time_spent_minutes", "$streak_days"] },
                    else: 0
                }
            }
        }
    },
    
    // Project final fields
    {
        $project: {
            _id: 0,
            student_id: 1,
            target_type: 1,
            target_title: "$target.title",
            progress_percent: 1,
            mastery_percentage: 1,
            total_xp: 1,
            streak_days: 1,
            longest_streak: 1,
            average_daily_time: 1,
            badges_earned: { $size: "$badges_earned" },
            stickers_earned: { $size: "$stickers_earned" },
            lesson_completion: {
                completed: "$enrollment.lessons_completed",
                total: "$enrollment.total_lessons"
            },
            last_activity: "$last_activity_at",
            enrolled_at: "$enrollment.enrolled_at"
        }
    }
])
```

### 7.2 Course Analytics Dashboard

```javascript
// Get analytics for a course
db.course_templates.aggregate([
    // Match course
    { $match: { template_id: "course_001" } },
    
    // Get enrollments
    {
        $lookup: {
            from: "student_enrollments",
            pipeline: [
                { $match: { target_id: "course_001", target_type: "course" } }
            ],
            as: "enrollments"
        }
    },
    
    // Get all progress for enrolled students
    {
        $lookup: {
            from: "student_progress",
            pipeline: [
                { $match: { target_id: "course_001", target_type: "course" } }
            ],
            as: "progress"
        }
    },
    
    // Get all lesson attempts
    {
        $lookup: {
            from: "lesson_attempts",
            pipeline: [
                { $match: { target_id: "course_001" } }
            ],
            as: "attempts"
        }
    },
    
    // Calculate enrollment stats
    {
        $addFields: {
            total_enrollments: { $size: "$enrollments" },
            active_enrollments: {
                $size: {
                    $filter: {
                        input: "$enrollments",
                        cond: { $eq: ["$$this.status", "active"] }
                    }
                }
            },
            completed_enrollments: {
                $size: {
                    $filter: {
                        input: "$enrollments",
                        cond: { $eq: ["$$this.status", "completed"] }
                    }
                }
            },
            
            // Average progress
            avg_progress: {
                $avg: {
                    $map: {
                        input: "$progress",
                        in: "$$this.progress_percent"
                    }
                }
            },
            
            // Completion rate
            completion_rate: {
                $cond: {
                    if: { $gt: [{ $size: "$enrollments" }, 0] },
                    then: {
                        $multiply: [
                            { $divide: [
                                { $size: { $filter: { input: "$enrollments", cond: { $eq: ["$$this.status", "completed"] } } } },
                                { $size: "$enrollments" }
                            ]},
                            100
                        ]
                    },
                    else: 0
                }
            },
            
            // Average score from attempts
            avg_lesson_score: {
                $avg: {
                    $map: {
                        input: "$attempts",
                        in: "$$this.weighted_score"
                    }
                }
            },
            
            // Pass rate
            pass_rate: {
                $cond: {
                    if: { $gt: [{ $size: "$attempts" }, 0] },
                    then: {
                        $multiply: [
                            { $divide: [
                                { $size: { $filter: { input: "$attempts", cond: { $eq: ["$$this.result", "pass"] } } } },
                                { $size: "$attempts" }
                            ]},
                            100
                        ]
                    },
                    else: 0
                }
            },
            
            // Most common badges
            top_badges: {
                $slice: [
                    {
                        $sortArray: {
                            input: {
                                $reduce: {
                                    input: "$progress",
                                    initialValue: [],
                                    in: { $concatArrays: ["$$value", "$$this.badges_earned"] }
                                }
                            },
                            sortBy: { count: -1 }
                        }
                    },
                    5
                ]
            }
        }
    },
    
    // Lesson-level breakdown
    {
        $lookup: {
            from: "course_lessons",
            let: { template_id: "$template_id" },
            pipeline: [
                { $match: { $expr: { $eq: ["$template_id", "$$template_id"] } } },
                { $sort: { order: 1 } }
            ],
            as: "lessons"
        }
    },
    
    // Calculate per-lesson stats
    {
        $addFields: {
            lesson_stats: {
                $map: {
                    input: "$lessons",
                    as: "lesson",
                    in: {
                        lesson_id: "$$lesson.lesson_id",
                        title: "$$lesson.title",
                        total_attempts: {
                            $size: {
                                $filter: {
                                    input: "$attempts",
                                    cond: { $eq: ["$$this.lesson_id", "$$lesson.lesson_id"] }
                                }
                            }
                        },
                        avg_score: {
                            $avg: {
                                $map: {
                                    input: {
                                        $filter: {
                                            input: "$attempts",
                                            cond: { $eq: ["$$this.lesson_id", "$$lesson.lesson_id"] }
                                        }
                                    },
                                    in: "$$this.weighted_score"
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    
    // Final projection
    {
        $project: {
            _id: 0,
            template_id: 1,
            title: 1,
            status: 1,
            total_enrollments: 1,
            active_enrollments: 1,
            completed_enrollments: 1,
            completion_rate: 1,
            avg_progress: 1,
            avg_lesson_score: 1,
            pass_rate: 1,
            lesson_stats: 1,
            top_badges: 1
        }
    }
])
```

### 7.3 Flashcard Mastery Statistics

```javascript
// Get mastery stats for a deck
db.flashcard_decks.aggregate([
    // Match deck
    { $match: { deck_id: "deck_fruits_001" } },
    
    // Get all cards in deck
    {
        $lookup: {
            from: "flashcard_cards",
            localField: "deck_id",
            foreignField: "deck_id",
            as: "cards"
        }
    },
    
    // Get progress for all cards across all students
    {
        $lookup: {
            from: "student_progress",
            pipeline: [
                { $unwind: "$card_progress" },
                {
                    $lookup: {
                        from: "flashcard_cards",
                        localField: "card_progress.card_id",
                        foreignField: "card_id",
                        as: "card_info"
                    }
                },
                { $unwind: { path: "$card_info", "preserveNullAndEmptyArrays": true } },
                {
                    $match: {
                        "card_info.deck_id": "deck_fruits_001"
                    }
                },
                {
                    $group: {
                        _id: "$card_progress.card_id",
                        total_students: { $addToSet: "$student_id" },
                        avg_mastery: { $avg: "$card_progress.mastery_level" },
                        times_seen: { $sum: "$card_progress.times_seen" },
                        times_correct: { $sum: "$card_progress.times_correct" },
                        mastered_count: {
                            $sum: {
                                $cond: [{ $gte: ["$card_progress.mastery_level", 4] }, 1, 0]
                            }
                        }
                    }
                }
            ],
            as: "card_stats"
        }
    },
    
    // Calculate deck-level statistics
    {
        $addFields: {
            total_cards: { $size: "$cards" },
            total_students: { $size: { $setUnion: "$card_stats.total_students" } },
            avg_mastery_score: { $avg: "$card_stats.avg_mastery" },
            total_views: { $sum: "$card_stats.times_seen" },
            overall_success_rate: {
                $cond: {
                    if: { $gt: ["$card_stats.total_views", 0] },
                    then: {
                        $multiply: [
                            { $divide: [
                                { $sum: "$card_stats.times_correct" },
                                { $sum: "$card_stats.times_seen" }
                            ]},
                            100
                        ]
                    },
                    else: 0
                }
            },
            cards_mastered: { $size: { $filter: { input: "$card_stats", cond: { $gte: ["$$this.mastery_count", 1] } } } },
            mastery_rate: {
                $cond: {
                    if: { $gt: [{ $size: "$cards" }, 0] },
                    then: {
                        $multiply: [
                            { $divide: [
                                { $size: { $filter: { input: "$card_stats", cond: { $gte: ["$$this.mastery_count", 1] } } } },
                                { $size: "$cards" }
                            ]},
                            100
                        ]
                    },
                    else: 0
                }
            }
        }
    },
    
    // Per-card breakdown
    {
        $addFields: {
            card_difficulty_distribution: {
                easy: {
                    $size: {
                        $filter: {
                            input: "$cards",
                            cond: { $eq: ["$$this.difficulty", "easy"] }
                        }
                    }
                },
                medium: {
                    $size: {
                        $filter: {
                            input: "$cards",
                            cond: { $eq: ["$$this.difficulty", "medium"] }
                        }
                    }
                },
                hard: {
                    $size: {
                        $filter: {
                            input: "$cards",
                            cond: { $eq: ["$$this.difficulty", "hard"] }
                        }
                    }
                }
            },
            per_card_stats: {
                $map: {
                    input: "$cards",
                    as: "card",
                    in: {
                        card_id: "$$card.card_id",
                        word: "$$card.word",
                        difficulty: "$$card.difficulty",
                        mastery_level: {
                            $ifNull: [
                                { $arrayElemAt: [
                                    { $map: {
                                        input: {
                                            $filter: {
                                                input: "$card_stats",
                                                cond: { $eq: ["$$this._id", "$$card.card_id"] }
                                            }
                                        },
                                        in: "$$this.avg_mastery"
                                    }},
                                    0
                                ]},
                                0
                            ]
                        },
                        times_seen: { $ifNull: [
                            { $arrayElemAt: [
                                { $map: {
                                    input: { $filter: { input: "$card_stats", cond: { $eq: ["$$this._id", "$$card.card_id"] } } },
                                    in: "$$this.times_seen"
                                }},
                                0
                            ]},
                            0
                        ]},
                        student_count: { $size: { $ifNull: [
                            { $arrayElemAt: [
                                { $map: { input: { $filter: { input: "$card_stats", cond: { $eq: ["$$this._id", "$$card.card_id"] } } }, in: "$$this.total_students" } },
                                0
                            ]},
                            []
                        ]}}
                    }
                }
            }
        }
    },
    
    // Final projection
    {
        $project: {
            _id: 0,
            deck_id: 1,
            name: 1,
            total_cards: 1,
            total_students: 1,
            avg_mastery_score: 1,
            total_views: 1,
            overall_success_rate: 1,
            mastery_rate: 1,
            card_difficulty_distribution: 1,
            per_card_stats: 1
        }
    }
])
```

### 7.4 Student Activity Timeline

```javascript
// Get activity timeline for a student
db.lesson_attempts.aggregate([
    // Match student
    { $match: { student_id: "student_001" } },
    
    // Sort by time
    { $sort: { created_at: -1 } },
    
    // Limit recent
    { $limit: 50 },
    
    // Lookup lesson info
    {
        $lookup: {
            from: "course_lessons",
            localField: "lesson_id",
            foreignField: "lesson_id",
            as: "lesson"
        }
    },
    { $unwind: { path: "$lesson", "preserveNullAndEmptyArrays": true } },
    
    // Lookup course info
    {
        $lookup: {
            from: "course_templates",
            let: { target_id: "$target_id" },
            pipeline: [
                { $match: { $expr: { $eq: ["$template_id", "$$target_id"] } } }
            ],
            as: "course"
        }
    },
    { $unwind: { path: "$course", "preserveNullAndEmptyArrays": true } },
    
    // Project timeline entry
    {
        $project: {
            _id: 0,
            type: "lesson_attempt",
            timestamp: "$created_at",
            lesson_id: 1,
            lesson_title: "$lesson.title",
            course_title: "$course.title",
            attempt_type: 1,
            result: 1,
            raw_score: 1,
            xp_earned: 1,
            time_spent_seconds: 1,
            step_count: { $size: "$step_attempts" }
        }
    },
    
    // Union with progress updates
    {
        $unionWith: {
            coll: "student_progress",
            pipeline: [
                { $match: { student_id: "student_001" } },
                { $unwind: "$lesson_progress" },
                {
                    $project: {
                        _id: 0,
                        type: "lesson_completed",
                        timestamp: "$lesson_progress.completed_at",
                        lesson_id: "$lesson_progress.lesson_id",
                        status: "$lesson_progress.status",
                        best_score: "$lesson_progress.best_score"
                    }
                },
                { $match: { timestamp: { $ne: null } } }
            ]
        }
    },
    
    // Combine and sort
    { $sort: { timestamp: -1 } },
    { $limit: 100 }
])
```

---

## 8. Index Recommendations

### 8.1 Index Strategy by Collection

#### `flashcard_decks`
```javascript
// Primary query patterns:
// 1. Find decks by status and category
// 2. Find decks created by a teacher
// 3. Full-text search on name/description

db.flashcard_decks.createIndex({ "status": 1, "category_path": 1 })
db.flashcard_decks.createIndex({ "created_by": 1, "status": 1 })
db.flashcard_decks.createIndex({ "deck_id": 1 }, { unique: true })
db.flashcard_decks.createIndex(
    { "name": "text", "description": "text" },
    { weights: { "name": 10, "description": 1 } }
)
```

#### `flashcard_cards`
```javascript
// Primary query patterns:
// 1. Find all cards in a deck
// 2. Find cards by difficulty
// 3. Search cards by word
// 4. Find cards created by teacher

db.flashcard_cards.createIndex({ "deck_id": 1, "status": 1 })
db.flashcard_cards.createIndex({ "deck_id": 1, "difficulty": 1 })
db.flashcard_cards.createIndex({ "card_id": 1 }, { unique: true })
db.flashcard_cards.createIndex({ "word": 1 })
db.flashcard_cards.createIndex(
    { "word": "text", "translation.en": "text", "translation.vi": "text" }
)
db.flashcard_cards.createIndex({ "created_by": 1, "status": 1 })

// For vector similarity search (if using vector embeddings)
db.flashcard_cards.createIndex({ "vector_embedding": "2dsphere" })
```

#### `student_enrollments`
```javascript
// Primary query patterns:
// 1. Find all enrollments for a student
// 2. Find all enrollments for a course
// 3. Find enrollments assigned to a teacher
// 4. Find expired/enrollment by date

db.student_enrollments.createIndex({ "student_id": 1, "status": 1 })
db.student_enrollments.createIndex({ "target_id": 1, "target_type": 1 })
db.student_enrollments.createIndex({ "assigned_teacher_id": 1, "status": 1 })
db.student_enrollments.createIndex({ "enrolled_at": 1, "status": 1 })
db.student_enrollments.createIndex({ "enrollment_id": 1 }, { unique: true })
```

#### `student_progress`
```javascript
// Primary query patterns:
// 1. Find progress for student and course
// 2. Find all progress for a student
// 3. Leaderboard: top students by XP
// 4. Find progress needing updates

db.student_progress.createIndex({ "student_id": 1, "target_id": 1 }, { unique: true })
db.student_progress.createIndex({ "enrollment_id": 1 }, { unique: true })
db.student_progress.createIndex({ "student_id": 1, "target_type": 1 })
db.student_progress.createIndex({ "total_xp": -1 })  // For leaderboard
db.student_progress.createIndex({ "status": 1, "updated_at": -1 })
```

#### `lesson_attempts`
```javascript
// Primary query patterns:
// 1. Get attempts for a lesson
// 2. Get attempts for a student
// 3. Analytics by date range
// 4. Find attempts for grading

db.lesson_attempts.createIndex({ "student_id": 1, "lesson_id": 1 })
db.lesson_attempts.createIndex({ "lesson_id": 1, "created_at": -1 })
db.lesson_attempts.createIndex({ "enrollment_id": 1, "attempt_type": 1 })
db.lesson_attempts.createIndex({ "student_id": 1, "result": 1 })
db.lesson_attempts.createIndex({ "created_at": -1 })
db.lesson_attempts.createIndex({ "attempt_id": 1 }, { unique: true })
```

#### `course_templates`
```javascript
// Primary query patterns:
// 1. Find published courses by category
// 2. Find courses by teacher
// 3. Search courses by title
// 4. Courses pending review

db.course_templates.createIndex({ "status": 1, "category_key": 1 })
db.course_templates.createIndex({ "created_by": 1, "status": 1 })
db.course_templates.createIndex({ "level": 1, "status": 1 })
db.course_templates.createIndex(
    { "title": "text", "description": "text", "title_vi": "text" }
)
db.course_templates.createIndex({ "template_id": 1 }, { unique: true })
```

#### `course_lessons`
```javascript
// Primary query patterns:
// 1. Get all lessons for a course (ordered)
// 2. Find lessons by teacher
// 3. Find lessons needing content generation

db.course_lessons.createIndex({ "template_id": 1, "order": 1 })
db.course_lessons.createIndex({ "created_by": 1, "status": 1 })
db.course_lessons.createIndex({ "lesson_id": 1 }, { unique: true })
db.course_lessons.createIndex({ "status": 1, "order": 1 })
```

#### `teacher_profiles` & `admin_profiles`
```javascript
// teacher_profiles
db.teacher_profiles.createIndex({ "user_id": 1 }, { unique: true })
db.teacher_profiles.createIndex({ "teacher_id": 1 }, { unique: true })
db.teacher_profiles.createIndex({ "status": 1, "total_students": -1 })
db.teacher_profiles.createIndex({ "subjects": 1, "status": 1 })

// admin_profiles
db.admin_profiles.createIndex({ "user_id": 1 }, { unique: true })
db.admin_profiles.createIndex({ "admin_id": 1 }, { unique: true })
db.admin_profiles.createIndex({ "role": 1 })
```

### 8.2 Compound Indexes for Common Queries

```javascript
// Dashboard: Recent activity for a student
db.student_progress.createIndex({ "student_id": 1, "updated_at": -1 })

// Dashboard: Active students in a course
db.student_enrollments.createIndex({ "target_id": 1, "status": 1, "last_activity_at": -1 })

// Analytics: Attempts over time
db.lesson_attempts.createIndex({ "target_id": 1, "created_at": -1 })

// Search: Published content by category
db.course_templates.createIndex({ "status": 1, "category_key": 1, "created_at": -1 })

// Search: Active decks by language
db.flashcard_decks.createIndex({ "status": 1, "language_pair.source": 1, "language_pair.target": 1 })
```

### 8.3 Partial Indexes for Optimization

```javascript
// Only index published content
db.course_templates.createIndex(
    { "category_key": 1 },
    { partialFilterExpression: { "status": "published" } }
)

db.flashcard_decks.createIndex(
    { "deck_id": 1 },
    { partialFilterExpression: { "status": "published" } }
)

// Only index active enrollments
db.student_enrollments.createIndex(
    { "enrolled_at": 1 },
    { partialFilterExpression: { "status": "active" } }
)

// Only index failed attempts for retry analysis
db.lesson_attempts.createIndex(
    { "student_id": 1, "result": 1 },
    { partialFilterExpression: { "result": "fail" } }
)
```

---

## 9. Implementation Notes

### 9.1 Model Organization

```
backend/models/
├── admin/
│   ├── __init__.py
│   ├── flashcard_deck.py
│   ├── flashcard_card.py
│   ├── student_enrollment.py
│   ├── student_progress.py
│   ├── lesson_attempt.py
│   ├── course_template.py
│   ├── course_lesson.py
│   ├── lesson_resource.py
│   ├── teacher_profile.py
│   └── admin_profile.py
```

### 9.2 Repository Pattern

```python
# backend/repositories/admin/flashcard_deck_repository.py
from backend.repositories.base_repo import BaseRepository

class FlashcardDeckRepository(BaseRepository):
    def __init__(self):
        super().__init__("flashcard_decks")
    
    async def get_with_card_count(self, deck_id: str) -> Dict[str, Any]:
        pipeline = [
            {"$match": {"deck_id": deck_id}},
            {"$lookup": {
                "from": "flashcard_cards",
                "localField": "deck_id",
                "foreignField": "deck_id",
                "as": "cards"
            }},
            {"$addFields": {"card_count": {"$size": "$cards"}}},
            {"$project": {"cards": 0}}  # Exclude full card array
        ]
        return await self.aggregate_one(pipeline)
```

### 9.3 Migration Strategy

1. **Phase 1:** Create new collections with Beanie documents
2. **Phase 2:** Write migration scripts to copy existing data
3. **Phase 3:** Update API endpoints to use new repositories
4. **Phase 4:** Remove legacy collections after validation

---

## 10. Summary

This schema design provides:

1. **4 main collection groups:** Flashcards, Student Tracking, Course Management, User Profiles
2. **Clear embedding vs referencing decisions** based on access patterns
3. **Comprehensive indexes** for dashboard and analytics queries
4. **Aggregation pipelines** for common reporting needs
5. **Follows existing codebase patterns** using Beanie ODM

**Next Steps:**
1. Review and approve schema structure
2. Create Beanie document classes in `backend/models/admin/`
3. Create repository classes in `backend/repositories/admin/`
4. Write migration scripts for existing data
5. Implement API endpoints
