# backend/database/repositories/ar_object_repository.py
"""
AR Object Repository - Data Access Layer for AR targets/markers
"""
from typing import Optional, List, Dict, Any
from core.base_repository import BaseRepository
from models.ar_object_contract import serialize_ar_object
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
        raw = await self.find_one({"ar_tag": ar_tag})
        if raw is None:
            return None
        return serialize_ar_object(raw)
    
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

    async def get_all_tags(self) -> List[str]:
        """
        Get list of all unique AR tags
        
        Returns:
            List of AR tag names
        """
        return await self.collection.distinct("ar_tag")


def get_ar_object_repository() -> ARObjectRepository:
    """Factory function for dependency injection"""
    return ARObjectRepository()


