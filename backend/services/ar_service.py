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
    
    async def check_combo(self, ar_tags: list[str]) -> Optional[Dict[str, Any]]:
        """
        Check if a set of AR tags form a valid combo.
        
        Args:
            ar_tags: List of ar_tag identifiers
            
        Returns:
            Combo document if found, None otherwise
        """
        if len(ar_tags) < 2:
            return None
        
        combos = await self.ar_combination_repo.find_by_tags(ar_tags)
        return combos[0] if combos else None
    
    async def get_combo_by_id(self, combo_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a combo by its combo_id.
        
        Args:
            combo_id: Combo identifier
            
        Returns:
            Combo document if found, None otherwise
        """
        return await self.ar_combination_repo.get_by_combo_id(combo_id)
    
    async def list_combos(self, skip: int = 0, limit: int = 20) -> list[Dict[str, Any]]:
        """
        List all combos with pagination.
        
        Args:
            skip: Number of documents to skip
            limit: Maximum number to return
            
        Returns:
            List of combo documents
        """
        return await self.ar_combination_repo.find_many(
            filter={},
            skip=skip,
            limit=limit
        )


def get_ar_service() -> ARService:
    """Factory function for dependency injection"""
    flashcard_repo = get_flashcard_repository()
    ar_object_repo = get_ar_object_repository()
    ar_combination_repo = get_ar_combination_repository()
    return ARService(flashcard_repo, ar_object_repo, ar_combination_repo)

