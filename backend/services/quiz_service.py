"""
Quiz Service - Business logic for quiz operations
"""
from typing import Optional, List, Dict, Any
import asyncio
import logging

from repositories.quiz_repository import QuizRepository, get_quiz_repository
from repositories.flashcard_repository import FlashcardRepository, get_flashcard_repository
from services.ai_service import AIService, get_ai_service
from models import QuizQuestion
from settings import settings
from database.postgres_connection import postgres_core_enabled

logger = logging.getLogger(__name__)


class QuizService:
    """Service handling quiz business logic"""
    
    def __init__(
        self,
        quiz_repo: QuizRepository,
        flashcard_repo: FlashcardRepository,
        ai_service: Optional[AIService] = None,
    ):
        self.quiz_repo = quiz_repo
        self.flashcard_repo = flashcard_repo
        self.ai_service = ai_service

    async def _try_generate_quiz(
        self,
        flashcard: Dict[str, Any],
        difficulty: str,
    ) -> Optional[Dict[str, Any]]:
        if not settings.AI_DYNAMIC_CONTENT_ENABLED or not self.ai_service:
            return None

        attempts = max(1, settings.AI_CONTENT_RETRIES)
        timeout = max(1.0, settings.AI_CONTENT_TIMEOUT_SECONDS)

        for attempt in range(1, attempts + 1):
            try:
                raw_questions = await asyncio.wait_for(
                    self.ai_service.generate_quiz_from_manifest(
                        flashcard=flashcard,
                        difficulty=difficulty,
                        num_questions=3,
                    ),
                    timeout=timeout,
                )
                questions = [
                    QuizQuestion(**self._normalize_question(item, index)).model_dump(mode="json")
                    for index, item in enumerate(raw_questions[:3], start=1)
                ]
                if questions:
                    logger.info("[Quiz] Generated AI quiz for qr_id=%s", flashcard.get("qr_id"))
                    return {
                        "flashcard_qr_id": flashcard["qr_id"],
                        "questions": questions,
                        "time_limit": 60 if difficulty == "hard" else None,
                        "passing_score": max(1, len(questions) - 1),
                    }
            except Exception as exc:
                logger.warning(
                    "[Quiz] AI generation attempt %s/%s failed for qr_id=%s: %s",
                    attempt,
                    attempts,
                    flashcard.get("qr_id"),
                    exc,
                )

        return None

    def _normalize_question(self, item: Dict[str, Any], index: int) -> Dict[str, Any]:
        options = item.get("options") or []
        correct_answer = str(item.get("correct_answer") or "").strip()
        if correct_answer and correct_answer not in options:
            options = [correct_answer, *options]

        return {
            "id": str(item.get("id") or f"ai-q{index}"),
            "type": item.get("type") if item.get("type") in {"multiple_choice", "true_false"} else "multiple_choice",
            "question_text": str(item.get("question_text") or "Choose the correct answer."),
            "image_url": item.get("image_url"),
            "options": [str(option) for option in options[:4]] or ["Yes", "No"],
            "correct_answer": correct_answer or (str(options[0]) if options else "Yes"),
            "explanation": item.get("explanation") or "Nice thinking!",
        }

    def _local_fallback_quiz(self, flashcard: Dict[str, Any], difficulty: str) -> Dict[str, Any]:
        word = str(flashcard.get("word") or "word")
        translation_data = flashcard.get("translation") or {}
        translation = translation_data.get("vi") if isinstance(translation_data, dict) else str(translation_data)
        translation = translation or word
        category = str(flashcard.get("category") or "things")
        image_url = flashcard.get("image_url")

        questions = [
            QuizQuestion(
                id="fallback-q1",
                type="multiple_choice",
                question_text=f"What does '{word}' mean?",
                image_url=image_url,
                options=[translation, "another word", "a color", "a number"],
                correct_answer=translation,
                explanation=f"'{word}' means '{translation}'.",
            ).model_dump(mode="json"),
            QuizQuestion(
                id="fallback-q2",
                type="multiple_choice",
                question_text=f"Which word belongs to {category}?",
                image_url=image_url,
                options=[word, "table", "pencil", "window"],
                correct_answer=word,
                explanation=f"{word} is the flashcard word.",
            ).model_dump(mode="json"),
            QuizQuestion(
                id="fallback-q3",
                type="true_false",
                question_text=f"The word is '{word}'.",
                image_url=image_url,
                options=["True", "False"],
                correct_answer="True",
                explanation="Great job checking the flashcard word.",
            ).model_dump(mode="json"),
        ]

        return {
            "flashcard_qr_id": flashcard["qr_id"],
            "questions": questions,
            "time_limit": 60 if difficulty == "hard" else None,
            "passing_score": 2,
        }
    
    async def get_quiz_by_flashcard(
        self,
        qr_id: str,
        difficulty: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get quiz session for a flashcard by QR ID
        
        Args:
            qr_id: Flashcard QR ID
            difficulty: Optional difficulty filter (easy, medium, hard)
        
        Returns:
            Quiz session document with questions array
        """
        flashcard = await self.flashcard_repo.get_by_qr_id(qr_id)
        if not flashcard:
            logger.warning("[Quiz] Unknown qr_id=%s", qr_id)
            return None

        difficulty = difficulty or flashcard.get("difficulty") or "easy"

        generated = await self._try_generate_quiz(flashcard, difficulty)
        if generated:
            return generated

        fixed_quiz = await self.quiz_repo.get_by_flashcard_qr_id(qr_id)
        if fixed_quiz:
            logger.info("[Quiz] Using PostgreSQL configured quiz for qr_id=%s", qr_id)
            return fixed_quiz

        logger.info("[Quiz] Using local fallback for qr_id=%s", qr_id)
        return self._local_fallback_quiz(flashcard, difficulty)


def get_quiz_service() -> QuizService:
    """Factory function for dependency injection"""
    quiz_repo = get_quiz_repository()
    flashcard_repo = get_flashcard_repository()
    ai_service = None if postgres_core_enabled() else get_ai_service()
    return QuizService(quiz_repo, flashcard_repo, ai_service)
