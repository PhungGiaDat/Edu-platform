"""
Flashcard Service - Business logic for flashcard operations
"""
from typing import Optional, List, Dict, Any
import numpy as np
from pyzbar.pyzbar import decode

from repositories.flashcard_repository import FlashcardRepository, get_flashcard_repository


class FlashcardService:
    """Service handling flashcard business logic"""
    
    def __init__(self, flashcard_repo: FlashcardRepository):
        self.flashcard_repo = flashcard_repo
    
    async def get_by_qr_id(self, qr_id: str) -> Optional[Dict[str, Any]]:
        """Get flashcard by QR ID"""
        return await self.flashcard_repo.get_by_qr_id(qr_id)
    
    async def get_by_category(self, category: str) -> List[Dict[str, Any]]:
        """Get flashcards by category"""
        return await self.flashcard_repo.get_by_category(category)
    
    async def search(self, query: str) -> List[Dict[str, Any]]:
        """Search flashcards by word"""
        return await self.flashcard_repo.search_by_word(query)


def get_flashcard_service() -> FlashcardService:
    """Factory function for dependency injection"""
    flashcard_repo = get_flashcard_repository()
    return FlashcardService(flashcard_repo)


# def detect_qr_code(image: np.ndarray) -> Optional[Dict[str, str]]:
#     """
#     Detect QR code from image frame
    
#     Args:
#         image: BGR image as numpy array
    
#     Returns:
#         Dict with QR data or None if no QR detected
#     """
#     if image is None:
#         return None
    
#     # Decode QR codes from image
#     decoded_objects = decode(image)
    
#     if not decoded_objects:
#         return None
    
#     # Return first QR code found
#     qr_data = decoded_objects[0].data.decode('utf-8')
#     return {"data": qr_data}
