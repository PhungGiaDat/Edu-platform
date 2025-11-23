"""
AR Service - Business logic for AR experience orchestration
"""
from typing import Optional, Dict, Any

from repositories.flashcard_repository import FlashcardRepository, get_flashcard_repository
from repositories.ar_object_repository import ARObjectRepository, get_ar_object_repository
from repositories.ar_combination_repository import ARCombinationRepository, get_ar_combination_repository


class ARService:
    """Service handling AR experience orchestration"""
    
    def __init__(
        self,
        flashcard_repo: FlashcardRepository,
        ar_object_repo: ARObjectRepository,
        ar_combination_repo: ARCombinationRepository
    ):
        self.flashcard_repo = flashcard_repo
        self.ar_object_repo = ar_object_repo
        self.ar_combination_repo = ar_combination_repo
    
    async def get_ar_experience(self, qr_id: str) -> Optional[Dict[str, Any]]:
        """
        Get complete AR experience data by QR ID
        Orchestrates data from flashcard, AR object, and combinations
        
        Returns ARExperienceResponseSchema format:
        {
            "flashcard": FlashcardSchema,
            "target": ArObjectSchema,
            "related_combos": List[ArCombinationSchema]
        }
        """
        # Get flashcard by QR ID
        flashcard = await self.flashcard_repo.get_by_qr_id(qr_id)
        if not flashcard:
            return None
        
        # Get AR target image (marker)
        ar_tag = flashcard.get("ar_tag")
        ar_object = None
        if ar_tag:
            ar_object = await self.ar_object_repo.get_by_tag(ar_tag)
        
        # Get AR combinations for this tag
        related_combos = []
        if ar_tag:
            related_combos = await self.ar_combination_repo.find_by_tag(ar_tag)
        
        # Build complete AR experience response (must match ARExperienceResponseSchema)
        return {
            "flashcard": flashcard,
            "target": ar_object,
            "related_combos": related_combos
        }


def get_ar_service() -> ARService:
    """Factory function for dependency injection"""
    flashcard_repo = get_flashcard_repository()
    ar_object_repo = get_ar_object_repository()
    ar_combination_repo = get_ar_combination_repository()
    return ARService(flashcard_repo, ar_object_repo, ar_combination_repo)
