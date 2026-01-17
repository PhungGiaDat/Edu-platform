"""
User Repository - Data Access Layer
Handles user CRUD operations with MongoDB
"""
from typing import Optional, Dict, Any
from database.base_repo import BaseRepository
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)


class UserRepository(BaseRepository):
    """Repository for users collection"""
    
    def __init__(self):
        super().__init__("users")
    
    async def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ObjectId"""
        try:
            return await self.find_one({"_id": ObjectId(user_id)})
        except Exception:
            return None
    
    async def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        return await self.find_one({"email": email})
    
    async def get_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user by username"""
        return await self.find_one({"username": username})
    
    async def update_profile(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update user profile fields"""
        try:
            return await self.collection.find_one_and_update(
                {"_id": ObjectId(user_id)},
                {"$set": updates},
                return_document=True
            )
        except Exception:
            return None


def get_user_repository() -> UserRepository:
    return UserRepository()
