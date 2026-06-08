from typing import List, Optional, Dict, Any
from database.base_repo import BaseRepository
import logging
from datetime import datetime
from bson import ObjectId

logger = logging.getLogger(__name__)


class GamificationRepository(BaseRepository):
    """Repository for gamification data (Model-Repo-Service pattern)"""
    
    def __init__(self):
        super().__init__("user_points")

    async def get_by_user_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user gamification data"""
        return await self.find_one({"user_id": user_id})

    async def update_points(self, user_id: str, points: int) -> Dict[str, Any]:
        """Increment points for a user"""
        return await self.collection.find_one_and_update(
            {"user_id": user_id},
            {"$inc": {"total_points": points}, "$set": {"last_activity_date": datetime.utcnow()}},
            upsert=True,
            return_document=True
        )
    
    async def add_xp(self, user_id: str, xp_amount: int, new_level: int = None, new_xp_to_next: int = None) -> Dict[str, Any]:
        """Add XP with optional level update"""
        update_doc = {
            "$inc": {"total_points": xp_amount},
            "$set": {"last_activity_date": datetime.utcnow()}
        }
        if new_level is not None:
            update_doc["$set"]["level"] = new_level
        if new_xp_to_next is not None:
            update_doc["$set"]["xp_to_next_level"] = new_xp_to_next
            
        return await self.collection.find_one_and_update(
            {"user_id": user_id},
            update_doc,
            upsert=True,
            return_document=True
        )
    
    async def add_badge(self, user_id: str, badge_id: str) -> Dict[str, Any]:
        """Add badge to user's badges list"""
        return await self.collection.find_one_and_update(
            {"user_id": user_id},
            {"$addToSet": {"badges": badge_id}},
            upsert=True,
            return_document=True
        )
    
    async def update_streak(self, user_id: str, streak: int, longest: int) -> Dict[str, Any]:
        """Update streak data"""
        return await self.collection.find_one_and_update(
            {"user_id": user_id},
            {"$set": {
                "streak_days": streak,
                "longest_streak": longest,
                "last_activity_date": datetime.utcnow()
            }},
            upsert=True,
            return_document=True
        )
    
    async def get_leaderboard(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top users by points"""
        return await self.find_many(
            filter={},
            limit=limit,
            sort=[("total_points", -1)]
        )
    
    # ========== PET METHODS ==========
    
    def _default_pet(self) -> Dict[str, Any]:
        now = datetime.utcnow()
        return {
            "type": "bunny",
            "happiness": 50,
            "hunger": 45,
            "energy": 70,
            "mood": "content",
            "last_fed": None,
            "last_played": None,
            "last_care_at": now,
            "last_mood_update": now,
            "outfit": "none",
            "xp_earned": 0,
            "stage": "baby",
        }

    def _merge_pet_defaults(self, pet: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        merged = self._default_pet()
        if pet:
            merged.update(pet)
        return merged

    async def get_pet(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user's virtual pet data"""
        user = await self.find_one({"user_id": user_id})
        return user.get("pet") if user else None
    
    async def update_pet(self, user_id: str, pet_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update user's pet data"""
        return await self.collection.find_one_and_update(
            {"user_id": user_id},
            {"$set": {"pet": pet_data}},
            upsert=True,
            return_document=True
        )
    
    async def feed_pet(self, user_id: str, happiness_boost: int = 10) -> Dict[str, Any]:
        """Feed pet and increase happiness"""
        user = await self.find_one({"user_id": user_id})
        pet_data = self._merge_pet_defaults(user.get("pet") if user else None)
        now = datetime.utcnow()
        
        pet_data.update({
            "happiness": min(100, pet_data.get("happiness", 50) + happiness_boost),
            "hunger": max(0, pet_data.get("hunger", 45) - 35),
            "energy": min(100, pet_data.get("energy", 70) + 5),
            "mood": "happy",
            "last_fed": now,
            "last_care_at": now,
            "last_mood_update": now,
            "last_action": "feed",
            "animation_clip": "feed",
        })
        
        return await self.update_pet(user_id, pet_data)

    async def play_pet(self, user_id: str, happiness_boost: int = 15) -> Dict[str, Any]:
        """Play with pet and update care state."""
        user = await self.find_one({"user_id": user_id})
        pet_data = self._merge_pet_defaults(user.get("pet") if user else None)
        now = datetime.utcnow()

        pet_data.update({
            "happiness": min(100, pet_data.get("happiness", 50) + happiness_boost),
            "hunger": min(100, pet_data.get("hunger", 45) + 10),
            "energy": max(0, pet_data.get("energy", 70) - 15),
            "mood": "happy" if pet_data.get("energy", 70) > 20 else "tired",
            "last_played": now,
            "last_care_at": now,
            "last_mood_update": now,
            "last_action": "play",
            "animation_clip": "play",
        })

        return await self.update_pet(user_id, pet_data)

    async def update_pet_xp(self, user_id: str, pet_xp: int) -> Dict[str, Any]:
        """Update pet XP while preserving the rest of the nested pet document."""
        return await self.collection.find_one_and_update(
            {"user_id": user_id},
            {"$set": {"pet.xp_earned": pet_xp}},
            upsert=True,
            return_document=True
        )

    async def update_pet_stage(self, user_id: str, stage: str) -> Dict[str, Any]:
        """Update pet evolution stage."""
        return await self.collection.find_one_and_update(
            {"user_id": user_id},
            {"$set": {"pet.stage": stage}},
            upsert=True,
            return_document=True
        )

    async def update_pet_outfit(self, user_id: str, outfit: str) -> Dict[str, Any]:
        """Update pet outfit."""
        return await self.collection.find_one_and_update(
            {"user_id": user_id},
            {"$set": {"pet.outfit": outfit}},
            upsert=True,
            return_document=True
        )
    
    # ========== STICKER METHODS ==========
    
    async def get_stickers(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's sticker collection"""
        user = await self.find_one({"user_id": user_id})
        return user.get("stickers", []) if user else []
    
    async def add_sticker(self, user_id: str, sticker: Dict[str, Any]) -> Dict[str, Any]:
        """Add sticker to user's collection"""
        sticker["earned_at"] = datetime.utcnow()
        return await self.collection.find_one_and_update(
            {"user_id": user_id},
            {"$addToSet": {"stickers": sticker}},
            upsert=True,
            return_document=True
        )
    
    async def has_sticker(self, user_id: str, sticker_id: str) -> bool:
        """Check if user already has a sticker"""
        user = await self.find_one({"user_id": user_id})
        if not user:
            return False
        stickers = user.get("stickers", [])
        return any(s.get("id") == sticker_id for s in stickers)
    
    # ========== PROGRESS/REPORTS ==========
    
    async def add_daily_stat(self, user_id: str, words_learned: int, time_mins: int) -> Dict[str, Any]:
        """Add daily learning stat"""
        today = datetime.utcnow().strftime("%Y-%m-%d")
        stat = {
            "date": today,
            "words": words_learned,
            "time_mins": time_mins
        }
        return await self.collection.find_one_and_update(
            {"user_id": user_id},
            {"$push": {"daily_stats": stat}},
            upsert=True,
            return_document=True
        )
    
    async def get_daily_stats(self, user_id: str, days: int = 7) -> List[Dict[str, Any]]:
        """Get recent daily stats"""
        user = await self.find_one({"user_id": user_id})
        if not user:
            return []
        stats = user.get("daily_stats", [])
        return stats[-days:] if len(stats) > days else stats


def get_gamification_repository() -> GamificationRepository:
    return GamificationRepository()

