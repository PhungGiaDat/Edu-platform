from typing import List, Dict, Any
from repositories.gamification_repository import get_gamification_repository
from models.gamification_model import XP_REWARDS, BADGE_DEFINITIONS, calculate_next_level_xp
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class GamificationService:
    """Service layer for gamification business logic (Model-Repo-Service pattern)"""
    
    def __init__(self):
        self.repo = get_gamification_repository()

    async def award_points(self, user_id: str, points: int, reason: str) -> Dict[str, Any]:
        """Award points for an action"""
        logger.info(f"Awarding {points} points to {user_id} for {reason}")
        return await self.repo.update_points(user_id, points)
    
    async def add_xp(self, user_id: str, action: str, metadata: Dict = None) -> Dict[str, Any]:
        """
        Add XP for completing an action.
        Returns result with level_up info and badges earned.
        """
        if action not in XP_REWARDS:
            logger.warning(f"Unknown XP action: {action}")
            return {"success": False, "error": f"Unknown action: {action}"}
        
        xp_amount = XP_REWARDS[action]
        
        # Get current user data
        user_data = await self.repo.get_by_user_id(user_id) or {
            "total_points": 0, "level": 1, "xp_to_next_level": 100, "streak_days": 0
        }
        
        current_xp = user_data.get("total_points", 0)
        current_level = user_data.get("level", 1)
        xp_to_next = user_data.get("xp_to_next_level", 100)
        
        # Calculate new XP and level
        new_xp = current_xp + xp_amount
        new_level = current_level
        level_up = False
        
        while new_xp >= xp_to_next:
            new_xp -= xp_to_next
            new_level += 1
            xp_to_next = calculate_next_level_xp(new_level)
            level_up = True
        
        # Update database
        await self.repo.add_xp(user_id, xp_amount, new_level, xp_to_next)
        
        # Update streak
        today = datetime.utcnow().strftime("%Y-%m-%d")
        streak_result = await self.update_streak(user_id, today)
        
        # Check for badges
        badges_earned = []
        if level_up and new_level == 5:
            await self.award_badge(user_id, "level_5")
            badges_earned.append("level_5")
        elif level_up and new_level == 10:
            await self.award_badge(user_id, "level_10")
            badges_earned.append("level_10")
        
        logger.info(f"Added {xp_amount} XP for {user_id} ({action})")
        
        return {
            "success": True,
            "xp_added": xp_amount,
            "total_xp": new_xp,
            "level": new_level,
            "level_up": level_up,
            "streak": streak_result.get("current_streak", 0),
            "badges_earned": badges_earned
        }
    
    async def award_badge(self, user_id: str, badge_id: str) -> Dict[str, Any]:
        """Award a badge to user"""
        if badge_id not in BADGE_DEFINITIONS:
            return {"success": False, "error": f"Unknown badge: {badge_id}"}
        
        # Check if already has badge
        user_data = await self.repo.get_by_user_id(user_id)
        if user_data and badge_id in user_data.get("badges", []):
            return {"success": True, "awarded": False, "message": "Already has badge"}
        
        await self.repo.add_badge(user_id, badge_id)
        
        # Award XP for badge
        badge_xp = BADGE_DEFINITIONS[badge_id].get("xp_reward", 0)
        if badge_xp > 0:
            await self.repo.update_points(user_id, badge_xp)
        
        logger.info(f"Awarded badge '{badge_id}' to {user_id}")
        return {"success": True, "awarded": True, "badge": BADGE_DEFINITIONS[badge_id]}
    
    async def update_streak(self, user_id: str, activity_date: str) -> Dict[str, Any]:
        """Update user streak based on activity"""
        user_data = await self.repo.get_by_user_id(user_id) or {}
        
        last_date = user_data.get("last_activity_date")
        current_streak = user_data.get("streak_days", 0)
        longest_streak = user_data.get("longest_streak", 0)
        
        if last_date is None:
            new_streak = 1
        elif last_date.strftime("%Y-%m-%d") == activity_date:
            new_streak = current_streak  # Same day
        else:
            last_str = last_date.strftime("%Y-%m-%d")
            last_dt = datetime.strptime(last_str, "%Y-%m-%d")
            current_dt = datetime.strptime(activity_date, "%Y-%m-%d")
            diff = (current_dt - last_dt).days
            
            new_streak = current_streak + 1 if diff == 1 else 1
        
        new_longest = max(new_streak, longest_streak)
        
        await self.repo.update_streak(user_id, new_streak, new_longest)
        
        # Check streak badges
        if new_streak == 3:
            await self.award_badge(user_id, "streak_3")
        elif new_streak == 7:
            await self.award_badge(user_id, "streak_7")
        
        return {"current_streak": new_streak, "longest_streak": new_longest}

    async def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get user gamification stats"""
        stats = await self.repo.get_by_user_id(user_id)
        if not stats:
            return {"total_points": 0, "level": 1, "badges": [], "streak_days": 0}
        return stats

    async def get_leaderboard(self) -> List[Dict[str, Any]]:
        """Get leaderboard"""
        return await self.repo.get_leaderboard()
    
    # ========== PET METHODS ==========
    
    async def get_pet(self, user_id: str) -> Dict[str, Any]:
        """Get user's virtual pet"""
        pet = await self.repo.get_pet(user_id)
        if not pet:
            # Create default pet
            pet = {
                "type": "bunny",
                "happiness": 50,
                "last_fed": None
            }
        return pet
    
    async def feed_pet(self, user_id: str) -> Dict[str, Any]:
        """
        Feed user's pet - increases happiness.
        Returns updated pet state.
        """
        result = await self.repo.feed_pet(user_id, happiness_boost=10)
        pet = result.get("pet", {})
        
        # Award XP for caring for pet
        await self.repo.update_points(user_id, 5)  # Small XP reward
        
        logger.info(f"Fed pet for user {user_id}, happiness: {pet.get('happiness')}")
        
        return {
            "success": True,
            "happiness": pet.get("happiness", 50),
            "pet_type": pet.get("type", "bunny"),
            "xp_earned": 5
        }
    
    async def choose_pet(self, user_id: str, pet_type: str) -> Dict[str, Any]:
        """Choose/change pet type"""
        valid_types = ["bunny", "panda", "dog", "cat"]
        if pet_type not in valid_types:
            return {"success": False, "error": f"Invalid pet type. Choose from: {valid_types}"}
        
        pet_data = {
            "type": pet_type,
            "happiness": 50,
            "last_fed": None
        }
        await self.repo.update_pet(user_id, pet_data)
        
        return {"success": True, "pet": pet_data}
    
    # ========== STICKER METHODS ==========
    
    STICKER_CATALOG = {
        "star_gold": {"name": "Gold Star", "rarity": "common", "imageUrl": "/assets/stickers/star_gold.png"},
        "star_rainbow": {"name": "Rainbow Star", "rarity": "rare", "imageUrl": "/assets/stickers/star_rainbow.png"},
        "trophy_bronze": {"name": "Bronze Trophy", "rarity": "common", "imageUrl": "/assets/stickers/trophy_bronze.png"},
        "trophy_gold": {"name": "Gold Trophy", "rarity": "epic", "imageUrl": "/assets/stickers/trophy_gold.png"},
        "animal_elephant": {"name": "Elephant", "rarity": "common", "imageUrl": "/assets/stickers/elephant.png"},
        "animal_lion": {"name": "Lion", "rarity": "rare", "imageUrl": "/assets/stickers/lion.png"},
        "crown": {"name": "Crown", "rarity": "legendary", "imageUrl": "/assets/stickers/crown.png"},
    }
    
    async def get_stickers(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's sticker collection"""
        return await self.repo.get_stickers(user_id)
    
    async def collect_sticker(self, user_id: str, sticker_id: str) -> Dict[str, Any]:
        """
        Collect a sticker for user.
        Returns result with sticker details.
        """
        if sticker_id not in self.STICKER_CATALOG:
            return {"success": False, "error": f"Unknown sticker: {sticker_id}"}
        
        # Check if already has sticker
        if await self.repo.has_sticker(user_id, sticker_id):
            return {"success": True, "collected": False, "message": "Already has sticker"}
        
        sticker = {
            "id": sticker_id,
            **self.STICKER_CATALOG[sticker_id]
        }
        
        await self.repo.add_sticker(user_id, sticker)
        
        # Award XP based on rarity
        xp_rewards = {"common": 10, "rare": 25, "epic": 50, "legendary": 100}
        xp = xp_rewards.get(sticker["rarity"], 10)
        await self.repo.update_points(user_id, xp)
        
        logger.info(f"Collected sticker '{sticker_id}' for user {user_id}")
        
        return {
            "success": True,
            "collected": True,
            "sticker": sticker,
            "xp_earned": xp
        }
    
    # ========== PROGRESS REPORTS ==========
    
    async def track_learning(self, user_id: str, words_learned: int, time_mins: int) -> Dict[str, Any]:
        """Track daily learning progress"""
        await self.repo.add_daily_stat(user_id, words_learned, time_mins)
        return {"success": True, "words": words_learned, "time_mins": time_mins}
    
    async def get_progress_report(self, user_id: str, days: int = 7) -> Dict[str, Any]:
        """
        Get comprehensive progress report for parent dashboard.
        """
        # Get user stats
        stats = await self.repo.get_by_user_id(user_id) or {}
        
        # Get daily stats
        daily_stats = await self.repo.get_daily_stats(user_id, days)
        
        # Calculate totals
        total_words = sum(s.get("words", 0) for s in daily_stats)
        total_time = sum(s.get("time_mins", 0) for s in daily_stats)
        
        return {
            "user_id": user_id,
            "period_days": days,
            "summary": {
                "total_xp": stats.get("total_points", 0),
                "level": stats.get("level", 1),
                "streak_days": stats.get("streak_days", 0),
                "badges_count": len(stats.get("badges", [])),
                "stickers_count": len(stats.get("stickers", [])),
            },
            "learning": {
                "total_words": total_words,
                "total_time_mins": total_time,
                "avg_words_per_day": round(total_words / max(len(daily_stats), 1), 1),
                "avg_time_per_day": round(total_time / max(len(daily_stats), 1), 1),
            },
            "daily_breakdown": daily_stats,
            "pet": stats.get("pet", {"type": "bunny", "happiness": 50}),
        }


def get_gamification_service() -> GamificationService:
    return GamificationService()

