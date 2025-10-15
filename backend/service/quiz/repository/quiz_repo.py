# backend/service/quiz/repository/quiz_repo.py

from database.base_repo import BaseRepository

class QuizRepository(BaseRepository):
    """
    Repository for quiz questions CRUD operations
    Inherits from BaseRepository for consistent MongoDB operations
    """
    
    def __init__(self):
        super().__init__("quiz_questions")
    
    async def get_by_flashcard_qr_id(self, qr_id: str):
        """
        Get quiz questions by flashcard QR ID
        
        Args:
            qr_id: Flashcard QR ID (e.g., 'ele123')
            
        Returns:
            dict: Quiz data with questions array or None if not found
        """
        print(f"[QUIZ_REPO] Fetching quiz for flashcard: {qr_id}")
        result = await self.collection.find_one({"flashcard_qr_id": qr_id})
        
        if result:
            # Convert ObjectId to string for JSON serialization
            if "_id" in result:
                result["_id"] = str(result["_id"])
            print(f"[QUIZ_REPO] Found {len(result.get('questions', []))} questions")
        else:
            print(f"[QUIZ_REPO] No quiz found for QR ID: {qr_id}")
        
        return result