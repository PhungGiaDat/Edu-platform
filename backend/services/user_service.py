"""
User Service - Business Logic Layer
Handles user profile and settings operations
"""
from typing import Optional, Dict, Any
from repositories.user_repository import UserRepository, get_user_repository
import logging

logger = logging.getLogger(__name__)


class UserService:
    """Service for user-related business logic"""
    
    def __init__(self, repo: UserRepository):
        self.repo = repo
    
    async def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user profile by ID.
        Returns user data or None if not found.
        """
        user = await self.repo.get_by_id(user_id)
        if not user:
            return None
        
        # Transform to safe response (remove sensitive fields)
        return self._to_profile_response(user)
    
    async def update_profile(
        self, 
        user_id: str, 
        full_name: Optional[str] = None,
        avatar_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Update user profile.
        Returns result with success status and updated user.
        """
        updates = {}
        
        if full_name is not None:
            updates["full_name"] = full_name
        if avatar_url is not None:
            updates["avatar_url"] = avatar_url
        
        if not updates:
            return {"success": False, "error": "No fields to update"}
        
        updated_user = await self.repo.update_profile(user_id, updates)
        
        if not updated_user:
            return {"success": False, "error": "User not found"}
        
        logger.info(f"Updated profile for user {user_id}")
        
        return {
            "success": True,
            "message": "Profile updated",
            "user": self._to_profile_response(updated_user)
        }
    
    def _to_profile_response(self, user: Dict[str, Any]) -> Dict[str, Any]:
        """Transform user document to safe profile response"""
        value = user.__dict__ if hasattr(user, "__dict__") else user
        return {
            "id": str(value.get("id", "")), "email": value.get("email", ""),
            "username": value.get("username", ""), "full_name": value.get("full_name", ""),
            "avatar_url": value.get("avatar_url"), "is_active": value.get("is_active", True),
            "is_verified": value.get("is_verified", False), "created_at": value.get("created_at"),
        }


def get_user_service() -> UserService:
    repo = get_user_repository()
    return UserService(repo)
