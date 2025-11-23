# backend/database/repositories/ar_combination_repository.py
"""
AR Combination Repository - Data Access Layer for multi-marker combos
"""
from typing import Optional, List, Dict, Any
from core.base_repository import BaseRepository
import logging

logger = logging.getLogger(__name__)


class ARCombinationRepository(BaseRepository):
    """
    Repository for ar_combinations collection
    Handles multi-flashcard AR combos
    """
    
    def __init__(self):
        super().__init__("ar_combinations")
    
    async def get_by_combo_id(self, combo_id: str) -> Optional[Dict[str, Any]]:
        """
        Find AR combo by combo_id
        
        Args:
            combo_id: Combo identifier (e.g., 'elephant_lion_combo')
            
        Returns:
            AR combination document or None
        """
        logger.debug(f"🔍 [SEARCH] AR Combo by combo_id: {combo_id}")
        return await self.find_one({"combo_id": combo_id})
    
    async def find_by_tag(self, ar_tag: str) -> List[Dict[str, Any]]:
        """
        Find all combos that include a specific AR tag
        
        Args:
            ar_tag: AR tag to search for in required_tags
            
        Returns:
            List of AR combination documents
        """
        logger.debug(f"🔍 [SEARCH] AR Combos containing tag: {ar_tag}")
        return await self.find_many(
            filter={"required_tags": ar_tag}
        )
    
    async def find_by_tags(self, ar_tags: List[str]) -> List[Dict[str, Any]]:
        """
        Find combos that match ALL provided tags
        
        Args:
            ar_tags: List of AR tags
            
        Returns:
            List of AR combination documents
        """
        return await self.find_many(
            filter={"required_tags": {"$all": ar_tags}}
        )
    
    async def find_by_any_tag(self, ar_tags: List[str]) -> List[Dict[str, Any]]:
        """
        Find combos that contain ANY of the provided tags
        
        Args:
            ar_tags: List of AR tags
            
        Returns:
            List of AR combination documents
        """
        return await self.find_many(
            filter={"required_tags": {"$in": ar_tags}}
        )


def get_ar_combination_repository() -> ARCombinationRepository:
    """Factory function for dependency injection"""
    return ARCombinationRepository()
