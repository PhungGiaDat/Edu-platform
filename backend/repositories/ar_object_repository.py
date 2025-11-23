# backend/database/repositories/ar_object_repository.py
"""
AR Object Repository - Data Access Layer for AR targets/markers
"""
from typing import Optional, List, Dict, Any
from core.base_repository import BaseRepository
import logging

logger = logging.getLogger(__name__)


class ARObjectRepository(BaseRepository):
    """
    Repository for ar_objects collection
    Handles AR markers, targets, and 3D models data
    """
    
    def __init__(self):
        super().__init__("ar_objects")
    
    async def get_by_tag(self, ar_tag: str) -> Optional[Dict[str, Any]]:
        """
        Find AR object by tag
        
        Args:
            ar_tag: AR tracking tag (e.g., 'elephant', 'dog')
            
        Returns:
            AR object document or None
        """
        logger.debug(f"🔍 [SEARCH] AR Object by tag: {ar_tag}")
        return await self.find_one({"ar_tag": ar_tag})
    
    async def get_by_marker_type(
        self,
        marker_type: str
    ) -> List[Dict[str, Any]]:
        """
        Get AR objects by marker type (e.g., 'NFT', 'HIRO', 'KANJI')
        
        Args:
            marker_type: Type of AR marker
            
        Returns:
            List of AR object documents
        """
        return await self.find_many(
            filter={"marker_type": marker_type}
        )


def get_ar_object_repository() -> ARObjectRepository:
    """Factory function for dependency injection"""
    return ARObjectRepository()
    
    async def get_all_tags(self) -> List[str]:
        """
        Get list of all unique AR tags
        
        Returns:
            List of AR tag names
        """
        return await self.collection.distinct("ar_tag")
