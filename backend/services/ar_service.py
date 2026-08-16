"""
AR Service - Business logic for AR experience orchestration
"""
import logging
from typing import Optional, Dict, Any

from repositories.flashcard_repository import FlashcardRepository, get_flashcard_repository
from repositories.ar_object_repository import ARObjectRepository, get_ar_object_repository
from repositories.ar_combination_repository import ARCombinationRepository, get_ar_combination_repository
from models.ar_combination import serialize_ar_combination

logger = logging.getLogger(__name__)


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
            raw_combos = await self.ar_combination_repo.find_by_tag(ar_tag)
            related_combos = [serialize_ar_combination(combo) for combo in raw_combos]
        
        tracking_target = await self.ar_object_repo.get_tracking_target(qr_id)
        # Legacy test doubles and older repository implementations may not
        # expose a tracking-target lookup. Treat that as native-unavailable,
        # never as an object from which metadata can be inferred.
        if not isinstance(tracking_target, dict):
            tracking_target = None
        translation = flashcard.get("translation") or {}
        # Flat fields serve current RN. Nested members preserve the legacy Web
        # contract. Missing native fields stay NULL/unavailable by design.
        return {
            "qr_id": qr_id,
            "word": flashcard.get("word", ""),
            "translation_vi": translation.get("vi", flashcard.get("word", "")) if isinstance(translation, dict) else str(translation),
            "audio_url": flashcard.get("audio_url"),
            "model_url": ar_object.get("model_3d_url") if ar_object else "",
            "animation_type": ar_object.get("animation_type", "none") if ar_object else "none",
            "glb_size": ar_object.get("glb_size", 1) if ar_object else 1,
            "position": ar_object.get("position", "0 0 0") if ar_object else "0 0 0",
            "rotation": ar_object.get("rotation", "0 0 0") if ar_object else "0 0 0",
            "scale": ar_object.get("scale", "1 1 1") if ar_object else "1 1 1",
            "reference_image_url": tracking_target.get("reference_image_url") if tracking_target else None,
            "physical_width_m": float(tracking_target["physical_width_m"]) if tracking_target and tracking_target.get("physical_width_m") is not None else None,
            "flashcard": flashcard,
            "target": ar_object,
            "related_combos": related_combos,
            "tracking_target": tracking_target,
        }
    
    async def check_combo(self, ar_tags: list[str]) -> Optional[Dict[str, Any]]:
        """
        Check if a set of AR tags form a valid combo.

        Args:
            ar_tags: List of ar_tag identifiers

        Returns:
            Combo document if found, None otherwise

        Rules:
        1. Combo must exist with matching required_tags
        2. If cross_category_allowed=False, all flashcards must have same category
        3. Combo must be active
        """
        if len(ar_tags) < 2:
            return None

        combos = await self.ar_combination_repo.find_by_tags(ar_tags)
        if not combos:
            return None

        # Sort by priority (higher first) and select best match
        combos.sort(key=lambda x: x.get("priority", 0), reverse=True)
        combo = combos[0]

        # Validate categories if cross_category_allowed is False
        # Handle None/missing field as False (backward compatibility)
        cross_category_allowed = combo.get("cross_category_allowed", False)
        if not cross_category_allowed:
            # Fetch flashcards to check their categories
            flashcards = []
            for tag in ar_tags:
                fc = await self.flashcard_repo.get_by_ar_tag(tag)
                if fc:
                    flashcards.append(fc)

            if flashcards:
                categories = set(
                    fc.get("category") for fc in flashcards
                    if fc.get("category")
                )
                # If multiple categories found and cross_category not allowed, reject
                if len(categories) > 1:
                    logger.info(
                        f"[ARService] Combo {combo.get('combo_id')} rejected: "
                        f"different categories {categories}, cross_category_allowed=False"
                    )
                    return None

        return combo
    
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

