# backend/repositories/quiz_repository.py
"""
Quiz Repository - Data Access Layer for quiz questions
"""
from typing import Optional, List, Dict, Any
from database.base_repo import BaseRepository
import logging

logger = logging.getLogger(__name__)


class QuizRepository(BaseRepository):
    """
    Repository for quiz_questions collection
    Handles quiz data and questions
    """
    
    def __init__(self):
        super().__init__("quiz_questions")
    
    async def get_by_flashcard_qr_id(self, qr_id: str) -> Optional[Dict[str, Any]]:
        """
        Get quiz session by flashcard QR ID
        
        Args:
            qr_id: Flashcard QR identifier (e.g., 'ele123')
            
        Returns:
            Quiz session document with questions or None
        """
        logger.debug(f"🔍 [SEARCH] Quiz for flashcard: {qr_id}")
        result = await self.collection.find_one({"flashcard_qr_id": qr_id})
        if result and "_id" in result:
            result["_id"] = str(result["_id"])
        return result
    
    async def get_by_difficulty(
        self,
        difficulty: str,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get quiz sessions by difficulty level
        
        Args:
            difficulty: Difficulty level ('easy', 'medium', 'hard')
            skip: Number to skip
            limit: Max number to return
            
        Returns:
            List of quiz session documents
        """
        return await self.find_many(
            filter={"difficulty": difficulty},
            skip=skip,
            limit=limit
        )
    
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
