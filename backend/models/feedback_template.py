# backend/models/feedback_template.py
"""
Feedback Template Models - Beanie Document + API Schemas

Dynamic, kid-friendly feedback templates stored in MongoDB.
Templates are categorized by score range (excellent, good, needs_practice)
and can include placeholders like {word}, {score}, {attempt_number}.

This replaces hardcoded feedback strings with database-driven templates
that can be updated without code changes.
"""
from beanie import Document, Indexed
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime


# ========== Score Categories ==========

ScoreCategory = Literal["excellent", "good", "needs_practice"]

# Score ranges for each category (inclusive)
SCORE_RANGES = {
    "excellent": (80, 100),      # 80-100: Great job!
    "good": (50, 79),            # 50-79: Good effort!
    "needs_practice": (0, 49),   # 0-49: Keep trying!
}


def get_score_category(score: int) -> ScoreCategory:
    """Map a 0-100 score to its feedback category."""
    if score >= 80:
        return "excellent"
    elif score >= 50:
        return "good"
    else:
        return "needs_practice"


# ========== Beanie Document (MongoDB) ==========

class FeedbackTemplateDocument(Document):
    """
    Feedback template stored in MongoDB.
    Collection: feedback_templates

    Templates support placeholders:
    - {word}: The word being practiced
    - {score}: The pronunciation score (0-100)
    - {stars}: Star rating (1-5 based on score)
    - {attempt_number}: How many times the child has tried this word

    Example template: "Wow! You said '{word}' like a superstar! ⭐"
    """
    # Category determines when this template is used
    category: Indexed(str)  # excellent | good | needs_practice

    # The actual feedback message with placeholders
    template: str

    # Optional emoji to display alongside feedback
    emoji: str = "⭐"

    # Weight for random selection (higher = more likely)
    # Allows some templates to appear more frequently
    weight: int = Field(default=1, ge=1, le=10)

    # Language code for internationalization (future-proofing)
    language: str = Field(default="en")

    # Active flag to enable/disable templates without deletion
    is_active: bool = True

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "feedback_templates"
        indexes = [
            "category",
            "language",
            "is_active",
            [("category", 1), ("language", 1), ("is_active", 1)],
        ]


# ========== API Schemas ==========

class FeedbackTemplateCreate(BaseModel):
    """Request body to create a new feedback template."""
    category: ScoreCategory
    template: str = Field(..., min_length=5, max_length=500)
    emoji: str = "⭐"
    weight: int = Field(default=1, ge=1, le=10)
    language: str = "en"
    is_active: bool = True


class FeedbackTemplateUpdate(BaseModel):
    """Request body to update an existing feedback template."""
    category: Optional[ScoreCategory] = None
    template: Optional[str] = Field(None, min_length=5, max_length=500)
    emoji: Optional[str] = None
    weight: Optional[int] = Field(None, ge=1, le=10)
    language: Optional[str] = None
    is_active: Optional[bool] = None


class FeedbackTemplateResponse(BaseModel):
    """Response schema for a feedback template."""
    id: Optional[str] = Field(None, alias="_id")
    category: str
    template: str
    emoji: str
    weight: int
    language: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True


class GeneratedFeedback(BaseModel):
    """
    Response from the feedback generation service.
    Contains the final rendered feedback with placeholders filled in.
    """
    message: str           # The rendered feedback message
    emoji: str             # Emoji to display
    stars: int             # Star rating 1-5
    category: str          # Which category was selected
    encouragement: str     # Additional encouragement for kids


# ========== Helper Functions ==========

def score_to_stars(score: int) -> int:
    """Convert a 0-100 score to a 1-5 star rating (always at least 1 star!)."""
    if score >= 90:
        return 5
    elif score >= 75:
        return 4
    elif score >= 60:
        return 3
    elif score >= 40:
        return 2
    else:
        return 1  # Everyone gets at least 1 star - it's for kids!


# Default encouragement messages by category (fallback if DB is empty)
DEFAULT_ENCOURAGEMENTS = {
    "excellent": [
        "You're amazing! 🌟",
        "Super duper! 🎉",
        "You rock! 🚀",
    ],
    "good": [
        "Great effort! 💪",
        "You're getting better! 📈",
        "Keep it up! 🌈",
    ],
    "needs_practice": [
        "Practice makes perfect! 🎯",
        "You can do it! 💫",
        "Try again, superstar! ⭐",
    ],
}
