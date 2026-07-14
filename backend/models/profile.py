"""Typed persistence and API contracts for the learner profile page."""
from datetime import datetime
from typing import List, Optional

from beanie import Document, Indexed
from pydantic import BaseModel, Field


class ProfileTestimonial(BaseModel):
    id: str
    name: str
    age: int
    avatar: str
    quote: str
    rating: int = Field(default=5, ge=1, le=5)
    color: str = "coral"


class ProfileCta(BaseModel):
    title: str
    description: str
    label: str
    href: str = "/courses"


class ProfileContentSettings(BaseModel):
    key: str = "default"
    hero_subtitle: str
    testimonials_heading: str
    testimonials: List[ProfileTestimonial] = Field(default_factory=list)
    cta: ProfileCta
    daily_challenge_title: str = "Complete 3 Lessons"
    daily_challenge_target: int = Field(default=3, ge=1)
    daily_challenge_reward: str = "50 XP + Mystery Badge"
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ProfileContentDocument(Document):
    """Editable copy for the profile; one ``default`` document is seeded lazily."""
    key: Indexed(str, unique=True) = "default"
    hero_subtitle: str
    testimonials_heading: str
    testimonials: List[ProfileTestimonial] = Field(default_factory=list)
    cta: ProfileCta
    daily_challenge_title: str = "Complete 3 Lessons"
    daily_challenge_target: int = Field(default=3, ge=1)
    daily_challenge_reward: str = "50 XP + Mystery Badge"
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "profile_content"


class ProfileIdentity(BaseModel):
    id: str
    email: str
    username: str
    full_name: Optional[str] = None
    avatar_url: str
    role: str
    is_superuser: bool


class ProfileSummary(BaseModel):
    level: int = 1
    total_points: int = 0
    xp_to_next_level: int = 100
    streak_days: int = 0
    lessons_completed: int = 0
    words_learned: int = 0
    quizzes_passed: int = 0


class ProfileBadge(BaseModel):
    id: str
    name: str
    description: str
    emoji: str = ""
    icon_url: str = ""
    earned: bool = False


class ProfileMilestone(BaseModel):
    label: str
    current: int
    target: int
    icon: str
    color: str


class ProfileLeaderboardEntry(BaseModel):
    user_id: str
    username: str
    points: int = 0
    rank: int
    avatar_url: str


class ProfileDailyChallenge(BaseModel):
    title: str
    progress: int = 0
    target: int = 3
    reward: str


class ProfileContent(BaseModel):
    hero_subtitle: str
    testimonials_heading: str
    testimonials: List[ProfileTestimonial]
    cta: ProfileCta


class ProfileMeta(BaseModel):
    partial_sections: List[str] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class ProfileResponse(BaseModel):
    identity: ProfileIdentity
    summary: ProfileSummary
    badges: List[ProfileBadge]
    milestones: List[ProfileMilestone]
    leaderboard: List[ProfileLeaderboardEntry]
    daily_challenge: ProfileDailyChallenge
    content: ProfileContent
    meta: ProfileMeta


def default_profile_content() -> ProfileContentSettings:
    return ProfileContentSettings(
        key="default",
        hero_subtitle="Super Star Learner ⭐",
        testimonials_heading="What Other Learners Say ✨",
        testimonials=[
            ProfileTestimonial(
                id="emma",
                name="Emma",
                age=10,
                avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=Emma&backgroundColor=b6e3f4",
                quote="Learning here is so fun! I love collecting pets and earning badges. My English got so much better!",
                rating=5,
                color="coral",
            ),
            ProfileTestimonial(
                id="lucas",
                name="Lucas",
                age=12,
                avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas&backgroundColor=c0aede",
                quote="The games make studying feel like playing! I actually look forward to my lessons now.",
                rating=5,
                color="mint",
            ),
            ProfileTestimonial(
                id="sofia",
                name="Sofia",
                age=9,
                avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=Sofia&backgroundColor=ffd5dc",
                quote="I've learned so many new words! My pet dragon is the coolest and I'm on a 30-day streak!",
                rating=5,
                color="sky",
            ),
        ],
        cta=ProfileCta(
            title="Ready for More?",
            description="Keep learning and unlock amazing rewards!",
            label="Continue Learning →",
            href="/courses",
        ),
        daily_challenge_title="Complete 3 Lessons",
        daily_challenge_target=3,
        daily_challenge_reward="50 XP + Mystery Badge",
    )
