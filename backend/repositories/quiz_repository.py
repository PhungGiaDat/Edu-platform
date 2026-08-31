# backend/repositories/quiz_repository.py
"""
Quiz Repository - Data Access Layer for quiz questions

De-Mongo Wave 2: PostgreSQL is the sole persistence path.  The
``postgres_core_enabled()`` runtime gate has been removed; there is no Mongo
fallback in this repository anymore.
"""
from typing import Optional, List, Dict, Any
from database.postgres_connection import postgres_pool
import logging
import json

logger = logging.getLogger(__name__)


class QuizRepository:
    """
    Repository for quiz_questions table
    Handles quiz data and questions
    """
    
    async def get_by_flashcard_qr_id(self, qr_id: str) -> Optional[Dict[str, Any]]:
        """
        Get quiz session by flashcard QR ID
        
        Args:
            qr_id: Flashcard QR identifier (e.g., 'ele123')
            
        Returns:
            Quiz session document with questions or None
        """
        logger.debug(f"🔍 [SEARCH] Quiz for flashcard: {qr_id}")
        rows = await postgres_pool().fetch(
            """SELECT q.id, q.question_id, q.question_text, q.question_type,
                      q.correct_answer, q.explanation, q.time_limit, q.passing_score,
                      coalesce(jsonb_agg(o.value ORDER BY o.option_order)
                               FILTER (WHERE o.value IS NOT NULL), '[]'::jsonb) AS options
               FROM public.quiz_questions q
               LEFT JOIN public.quiz_question_options o ON o.question_id=q.id
               WHERE q.flashcard_qr_id=$1 GROUP BY q.id ORDER BY q.id""",
            qr_id,
        )
        if not rows:
            return None
        questions = []
        for row in rows:
            value = dict(row)
            options = value["options"]
            if isinstance(options, str):
                options = json.loads(options)
            questions.append({
                "id": value["question_id"], "type": value["question_type"],
                "question_text": value["question_text"], "options": list(options or []),
                "correct_answer": value["correct_answer"] or "", "explanation": value["explanation"],
            })
        return {"flashcard_qr_id": qr_id, "questions": questions,
                "time_limit": rows[0]["time_limit"], "passing_score": rows[0]["passing_score"]}
    
    async def get_by_difficulty(
        self,
        difficulty: str,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get quiz sessions by difficulty level
        
        Note: The quiz_questions table has no difficulty column, so this
        always returns an empty list.  Difficulty-based filtering is handled
        by the service layer through AI-generated quiz content.
        
        Args:
            difficulty: Difficulty level ('easy', 'medium', 'hard')
            skip: Number to skip
            limit: Max number to return
            
        Returns:
            List of quiz session documents (always empty)
        """
        return []
    
    async def count_questions(self, qr_id: str) -> int:
        """
        Count number of questions in a quiz
        
        Args:
            qr_id: Flashcard QR identifier
            
        Returns:
            Number of questions
        """
        quiz = await self.get_by_flashcard_qr_id(qr_id)
        if quiz and "questions" in quiz:
            return len(quiz["questions"])
        return 0


def get_quiz_repository() -> QuizRepository:
    """Factory function for dependency injection"""
    return QuizRepository()