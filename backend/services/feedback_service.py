# backend/services/feedback_service.py
"""
Feedback Service - Dynamic kid-friendly feedback generation

Generates pronunciation feedback using database-driven templates.
Supports placeholder substitution for personalized messages.
Falls back to defaults if no templates are found.
"""
from typing import Optional
from repositories.feedback_template_repository import (
    FeedbackTemplateRepository,
    get_feedback_template_repository,
)
from models.feedback_template import (
    GeneratedFeedback,
    get_score_category,
    score_to_stars,
    DEFAULT_ENCOURAGEMENTS,
)
import random
import logging

logger = logging.getLogger(__name__)


class FeedbackService:
    """
    Service for generating dynamic, kid-friendly pronunciation feedback.
    
    Uses database templates with placeholders like {word}, {score}, {stars}.
    Falls back to defaults if templates aren't available.
    """

    def __init__(self, repository: FeedbackTemplateRepository):
        self.repo = repository

    async def generate_feedback(
        self,
        word: str,
        score: int,
        attempt_number: int = 1,
        language: str = "en",
    ) -> GeneratedFeedback:
        """
        Generate kid-friendly feedback based on pronunciation score.

        Args:
            word: The word that was practiced
            score: Pronunciation score 0-100
            attempt_number: How many times the child has tried this word
            language: Language code for templates (default: "en")

        Returns:
            GeneratedFeedback with message, emoji, stars, category, and encouragement
        """
        category = get_score_category(score)
        stars = score_to_stars(score)

        # Try to get a template from the database
        template_doc = await self.repo.get_template_for_score(
            score=score,
            language=language,
        )

        if template_doc:
            # Render the template with placeholders
            message = self._render_template(
                template=template_doc.get("template", ""),
                word=word,
                score=score,
                stars=stars,
                attempt_number=attempt_number,
            )
            emoji = template_doc.get("emoji", "⭐")
        else:
            # Fallback to default message
            logger.warning(
                f"[Feedback] No template found for score={score}, using fallback"
            )
            message = self._get_fallback_message(word, category)
            emoji = "⭐"

        # Get additional encouragement
        encouragement = self._get_encouragement(category)

        return GeneratedFeedback(
            message=message,
            emoji=emoji,
            stars=stars,
            category=category,
            encouragement=encouragement,
        )

    def _render_template(
        self,
        template: str,
        word: str,
        score: int,
        stars: int,
        attempt_number: int,
    ) -> str:
        """
        Replace placeholders in template with actual values.

        Supported placeholders:
        - {word}: The word being practiced
        - {score}: The pronunciation score
        - {stars}: Star rating (1-5)
        - {attempt_number}: Number of attempts
        """
        try:
            return template.format(
                word=word,
                score=score,
                stars=stars,
                attempt_number=attempt_number,
            )
        except KeyError as e:
            logger.warning(f"[Feedback] Unknown placeholder in template: {e}")
            # Return template with unfilled placeholders replaced by word
            return template.replace("{", "").replace("}", "")

    def _get_fallback_message(self, word: str, category: str) -> str:
        """Generate a fallback message when no templates are available."""
        fallbacks = {
            "excellent": f"Amazing job saying '{word}'!",
            "good": f"Good effort with '{word}'! Keep practicing!",
            "needs_practice": f"Great try with '{word}'! Let's practice more!",
        }
        return fallbacks.get(category, f"Nice work with '{word}'!")

    def _get_encouragement(self, category: str) -> str:
        """Get a random encouragement message for the category."""
        encouragements = DEFAULT_ENCOURAGEMENTS.get(category, [])
        if encouragements:
            return random.choice(encouragements)
        return "Keep up the great work!"

    async def get_feedback_stats(self, language: str = "en") -> dict:
        """
        Get statistics about available feedback templates.
        Useful for admin dashboard or debugging.
        """
        excellent_count = await self.repo.count_by_category("excellent", language)
        good_count = await self.repo.count_by_category("good", language)
        needs_practice_count = await self.repo.count_by_category("needs_practice", language)

        return {
            "language": language,
            "total_templates": excellent_count + good_count + needs_practice_count,
            "by_category": {
                "excellent": excellent_count,
                "good": good_count,
                "needs_practice": needs_practice_count,
            },
        }


def get_feedback_service() -> FeedbackService:
    """Factory function for FastAPI dependency injection."""
    return FeedbackService(repository=get_feedback_template_repository())
