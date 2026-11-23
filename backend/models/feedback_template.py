# backend/models/feedback_template.py
"""
Feedback Template Models - PostgreSQL via repositories

Dynamic, kid-friendly feedback templates for pronunciation scoring.
Templates are categorized by score range (excellent, good, needs_practice)
and can include placeholders like {word}, {score}, {attempt_number}.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime


# ========== Score Categories ==========

ScoreCategory = Literal["excellent", "good", "needs_practice"]

SCORE_RANGES = {
    "excellent": (80, 100),
    "good": (50, 79),
    "needs_practice": (0, 49),
}


def get_score_category(score: int) -> ScoreCategory:
    if score >= 80:
        return "excellent"
    elif score >= 50:
        return "good"
    else:
        return "needs_practice"


# ========== API Schemas ==========

class FeedbackTemplateCreate(BaseModel):
    category: ScoreCategory
    template: str = Field(..., min_length=5, max_length=500)
    emoji: str = "⭐"
    weight: int = Field(default=1, ge=1, le=10)
    language: str = "en"
    is_active: bool = True


class FeedbackTemplateUpdate(BaseModel):
    category: Optional[ScoreCategory] = None
    template: Optional[str] = Field(None, min_length=5, max_length=500)
    emoji: Optional[str] = None
    weight: Optional[int] = Field(None, ge=1, le=10)
    language: Optional[str] = None
    is_active: Optional[bool] = None


class FeedbackTemplateResponse(BaseModel):
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
    message: str
    emoji: str
    stars: int
    category: str
    encouragement: str


def score_to_stars(score: int) -> int:
    if score >= 90:
        return 5
    elif score >= 75:
        return 4
    elif score >= 60:
        return 3
    elif score >= 40:
        return 2
    else:
        return 1


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
