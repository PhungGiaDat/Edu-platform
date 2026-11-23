"""Compose the authenticated profile from independent persisted data sources."""
import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from models.gamification_model import BADGE_DEFINITIONS
from models.profile import (
    ProfileBadge,
    ProfileContent,
    ProfileDailyChallenge,
    ProfileIdentity,
    ProfileLeaderboardEntry,
    ProfileMeta,
    ProfileMilestone,
    ProfileResponse,
    ProfileSummary,
    default_profile_content,
)
from repositories.postgres_user_repository import PostgresUser, PostgresUserRepository

logger = logging.getLogger(__name__)


class ProfileService:
    """Build a profile while keeping failures isolated to their own section."""

    def __init__(
        self,
        gamification_service: Optional[Any] = None,
        course_repository: Optional[Any] = None,
    ):
        if gamification_service is None:
            from services.gamification_service import get_gamification_service

            gamification_service = get_gamification_service()
        if course_repository is None:
            from repositories.course_repository import get_course_repository

            course_repository = get_course_repository()
        self.gamification = gamification_service
        self.courses = course_repository
        self._user_repo = PostgresUserRepository()

    @staticmethod
    def _avatar(username: str, avatar_url: Optional[str] = None) -> str:
        from core.url_builders import default_avatar_url
        return avatar_url or default_avatar_url(username)

    @staticmethod
    def _is_today(value: Any) -> bool:
        if not value:
            return False
        if isinstance(value, str):
            try:
                value = datetime.fromisoformat(value.replace("Z", "+00:00"))
            except ValueError:
                return False
        if not isinstance(value, datetime):
            return False
        if value.tzinfo is not None:
            value = value.astimezone(timezone.utc).replace(tzinfo=None)
        return value.date() == datetime.utcnow().date()

    async def _learning_metrics(self, user_id: str) -> Tuple[int, int]:
        progress_documents = await self.courses.get_progress(user_id)
        completed: set[Tuple[str, str]] = set()
        completed_today: set[Tuple[str, str]] = set()
        for progress in progress_documents:
            course_id = str(progress.get("course_id", ""))
            timestamps: Dict[str, Any] = {
                str(item.get("lesson_id")): item.get("completed_at")
                for item in progress.get("lesson_progress", [])
                if item.get("status") == "completed" and item.get("lesson_id")
            }
            lesson_ids = set(progress.get("completed_lessons", [])) | set(timestamps)
            for lesson_id in lesson_ids:
                key = (course_id, str(lesson_id))
                completed.add(key)
                if self._is_today(timestamps.get(str(lesson_id))):
                    completed_today.add(key)
        return len(completed), len(completed_today)

    async def _words_learned(self, user_id: str) -> int:
        from database.postgres_connection import postgres_pool

        row = await postgres_pool().fetchval(
            "SELECT count(*) FROM public.word_mastery WHERE user_id=$1 AND mastery_level>0",
            user_id,
        )
        return int(row) if row else 0

    async def _quizzes_passed(self, user_id: str) -> int:
        from database.postgres_connection import postgres_pool

        row = await postgres_pool().fetchval(
            "SELECT count(*) FROM public.quiz_attempts WHERE user_id=$1 AND score>=70",
            user_id,
        )
        return int(row) if row else 0

    async def _profile_content(self) -> Dict[str, Any]:
        from database.postgres_connection import postgres_pool

        row = await postgres_pool().fetchrow(
            "SELECT * FROM public.profile_content WHERE key='default'"
        )
        if row:
            value = dict(row)
            if "testimonials" in value and isinstance(value["testimonials"], str):
                import json
                value["testimonials"] = json.loads(value["testimonials"])
            return value
        return default_profile_content().model_dump(exclude={"id"})

    async def _leaderboard(self) -> List[ProfileLeaderboardEntry]:
        raw_entries = await self.gamification.get_leaderboard()

        async def enrich(entry: Dict[str, Any], index: int) -> ProfileLeaderboardEntry:
            user_id = str(entry.get("user_id", ""))
            user: Optional[PostgresUser] = None
            if user_id:
                try:
                    user = await self._user_repo.get_by_id(user_id)
                except Exception:
                    pass
            username = (user.username if user else entry.get("username") or "Learner")
            avatar_url = self._avatar(
                username,
                user.avatar_url if user else entry.get("avatar_url"),
            )
            return ProfileLeaderboardEntry(
                user_id=user_id,
                username=username,
                points=int(entry.get("total_points", entry.get("points", 0)) or 0),
                rank=index + 1,
                avatar_url=avatar_url,
            )

        return list(await asyncio.gather(
            *(enrich(entry, index) for index, entry in enumerate(raw_entries[:10]))
        ))

    async def get_profile(self, user: PostgresUser) -> ProfileResponse:
        user_id = user.id
        partial: List[str] = []

        stats: Dict[str, Any] = {}
        try:
            stats = await self.gamification.get_user_stats(user_id)
        except Exception:
            logger.exception("Profile gamification source failed for user %s", user_id)
            partial.extend(["summary.gamification", "badges"])

        lessons_completed = 0
        lessons_today = 0
        try:
            lessons_completed, lessons_today = await self._learning_metrics(user_id)
        except Exception:
            logger.exception("Profile course progress source failed for user %s", user_id)
            partial.extend(["summary.lessons", "daily_challenge"])

        words_learned = 0
        try:
            words_learned = await self._words_learned(user_id)
        except Exception:
            logger.exception("Profile word mastery source failed for user %s", user_id)
            partial.append("summary.words")

        quizzes_passed = 0
        try:
            quizzes_passed = await self._quizzes_passed(user_id)
        except Exception:
            logger.exception("Profile quiz source failed for user %s", user_id)
            partial.append("summary.quizzes")

        leaderboard: List[ProfileLeaderboardEntry] = []
        try:
            leaderboard = await self._leaderboard()
        except Exception:
            logger.exception("Profile leaderboard source failed for user %s", user_id)
            partial.append("leaderboard")

        default_content = default_profile_content()
        content_data: Dict[str, Any] = default_content.model_dump()
        try:
            content_data = await self._profile_content()
        except Exception:
            logger.exception("Profile content source failed")
            partial.append("content")

        identity = ProfileIdentity(
            id=user_id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            avatar_url=self._avatar(user.username, user.avatar_url),
            role=user.role or "learner",
            is_superuser=user.is_superuser,
        )
        summary = ProfileSummary(
            level=int(stats.get("level", 1) or 1),
            total_points=int(stats.get("total_points", 0) or 0),
            xp_to_next_level=max(1, int(stats.get("xp_to_next_level", 100) or 100)),
            streak_days=int(stats.get("streak_days", 0) or 0),
            lessons_completed=lessons_completed,
            words_learned=words_learned,
            quizzes_passed=quizzes_passed,
        )

        earned_badges = set(stats.get("badges", []) or [])
        badges = [
            ProfileBadge(
                id=badge_id,
                name=definition["name"],
                description=definition["description"],
                emoji=definition.get("emoji", ""),
                icon_url=definition.get("icon_url", ""),
                earned=badge_id in earned_badges,
            )
            for badge_id, definition in BADGE_DEFINITIONS.items()
        ]

        target = max(1, int(content_data.get("daily_challenge_target", 3)))
        return ProfileResponse(
            identity=identity,
            summary=summary,
            badges=badges,
            milestones=[
                ProfileMilestone(label="Lessons Done", current=lessons_completed, target=50, icon="📖", color="#FF6B6B"),
                ProfileMilestone(label="Words Learned", current=words_learned, target=200, icon="💬", color="#4ECDC4"),
                ProfileMilestone(label="Quizzes Passed", current=quizzes_passed, target=25, icon="✅", color="#45B7D1"),
                ProfileMilestone(label="Days Streak", current=summary.streak_days, target=30, icon="🔥", color="#F7DC6F"),
            ],
            leaderboard=leaderboard,
            daily_challenge=ProfileDailyChallenge(
                title=content_data.get("daily_challenge_title", default_content.daily_challenge_title),
                progress=min(lessons_today, target),
                target=target,
                reward=content_data.get("daily_challenge_reward", default_content.daily_challenge_reward),
            ),
            content=ProfileContent(
                hero_subtitle=content_data.get("hero_subtitle", default_content.hero_subtitle),
                testimonials_heading=content_data.get("testimonials_heading", default_content.testimonials_heading),
                testimonials=content_data.get("testimonials", default_content.testimonials),
                cta=content_data.get("cta", default_content.cta),
            ),
            meta=ProfileMeta(partial_sections=list(dict.fromkeys(partial))),
        )


def get_profile_service() -> ProfileService:
    return ProfileService()
