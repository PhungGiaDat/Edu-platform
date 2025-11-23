"""
Quiz Service - Business logic for quiz operations
"""
from typing import Optional, List, Dict, Any

from repositories.quiz_repository import QuizRepository, get_quiz_repository


class QuizService:
    """Service handling quiz business logic"""
    
    def __init__(self, quiz_repo: QuizRepository):
        self.quiz_repo = quiz_repo
    
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
        # Get quiz document (contains flashcard_qr_id + questions array)
        return await self.quiz_repo.get_by_flashcard_qr_id(qr_id)


def get_quiz_service() -> QuizService:
    """Factory function for dependency injection"""
    quiz_repo = get_quiz_repository()
    return QuizService(quiz_repo)
