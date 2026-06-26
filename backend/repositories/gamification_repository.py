from typing import List, Optional, Dict, Any
from database.base_repo import BaseRepository
import logging
from datetime import datetime, timedelta
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

    async def get_streak(self, user_id: str) -> Dict[str, Any]:
        """Get streak data for a user"""
        data = await self.find_one({"user_id": user_id})
        if not data:
            return {
                "current_streak": 0,
                "longest_streak": 0,
                "last_activity": None,
                "streak_active_today": False,
                "daily_goal_minutes": 15,
                "minutes_today": 0,
            }
        last_activity = data.get("last_activity_date") or data.get("last_activity")
        is_today = False
        if last_activity:
            from datetime import timedelta
            today = datetime.utcnow().date()
            last_date = last_activity.date() if hasattr(last_activity, "date") else last_activity
            is_today = last_date == today
        minutes_today = data.get("minutes_today", 0)
        return {
            "current_streak": data.get("streak_days", 0),
            "longest_streak": data.get("longest_streak", 0),
            "last_activity": last_activity.isoformat() if last_activity else None,
            "streak_active_today": is_today,
            "daily_goal_minutes": data.get("daily_goal_minutes", 15),
            "minutes_today": minutes_today,
        }

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
        """Add daily learning stat using upsert-per-day pattern.
        
        If a stat for today already exists, updates it (increments values).
        Otherwise, inserts a new stat entry for today.
        """
        today = datetime.utcnow().strftime("%Y-%m-%d")
        
        # Upsert-per-day: try to update existing today entry first
        result = await self.collection.find_one_and_update(
            {
                "user_id": user_id,
                "daily_stats.date": today,
            },
            {
                "$inc": {
                    "daily_stats.$.words_learned": words_learned,
                    "daily_stats.$.time_mins": time_mins,
                }
            },
            return_document=True
        )
        
        # If no today entry existed, push a new one
        if result is None:
            stat = {
                "date": today,
                "words_learned": words_learned,
                "time_mins": time_mins,
            }
            result = await self.collection.find_one_and_update(
                {"user_id": user_id},
                {"$push": {"daily_stats": stat}},
                upsert=True,
                return_document=True
            )
        
        return result
    
    async def get_daily_stats(self, user_id: str, days: int = 7) -> List[Dict[str, Any]]:
        """Get recent daily stats from user_points embedded array"""
        user = await self.find_one({"user_id": user_id})
        if not user:
            return []
        stats = user.get("daily_stats", [])
        return stats[-days:] if len(stats) > days else stats

    async def get_daily_stats_v2(self, user_id: str, days: int = 7) -> List[Dict[str, Any]]:
        """
        Aggregate daily stats from session_logs collection.
        Uses upsert-per-day pattern (Q5 decision).
        Returns aggregated stats per day including words_learned, games_played, etc.
        """
        from database.db import get_database
        db = await get_database()
        
        # Get sessions from the last N days
        start_date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        for _ in range(days):
            start_date = start_date.replace(day=start_date.day - 1) if start_date.day > 1 else start_date.replace(month=start_date.month - 1, day=28)
        start_date = datetime.utcnow() - timedelta(days=days)
        
        cursor = db.session_logs.find({
            "user_id": user_id,
            "started_at": {"$gte": start_date}
        }).sort("started_at", -1)
        
        sessions = await cursor.to_list(length=1000)
        
        # Aggregate by date
        daily_aggregates: Dict[str, Dict[str, Any]] = {}
        
        for session in sessions:
            if not session.get("ended_at"):
                continue
                
            session_date = session["started_at"].strftime("%Y-%m-%d")
            
            if session_date not in daily_aggregates:
                daily_aggregates[session_date] = {
                    "date": session_date,
                    "words_learned": 0,
                    "games_played": 0,
                    "pronunciation_attempts": 0,
                    "time_mins": 0,
                    "sessions_count": 0,
                }
            
            # Add session data
            agg = daily_aggregates[session_date]
            agg["words_learned"] += session.get("words_learned", 0)
            agg["games_played"] += session.get("games_played", 0)
            agg["pronunciation_attempts"] += session.get("pronunciation_attempts", 0)
            
            # Calculate time from duration_seconds
            duration = session.get("duration_seconds", 0) or 0
            agg["time_mins"] += duration // 60
            agg["sessions_count"] += 1
            
            # Track most active topic
            topic = session.get("active_topic")
            if topic:
                agg["most_active_topic"] = topic
        
        return list(daily_aggregates.values())


from datetime import timedelta
def get_gamification_repository() -> GamificationRepository:
    return GamificationRepository()

