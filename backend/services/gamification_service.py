from typing import List, Dict, Any, Optional
from repositories.gamification_repository import get_gamification_repository
from repositories.gamification_event_repository import get_gamification_event_repository
from models.gamification_model import XP_REWARDS, BADGE_DEFINITIONS, calculate_next_level_xp
from models.gamification_event import EventStatus
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class GamificationService:
    """Service layer for gamification business logic (Model-Repo-Service pattern)"""
    
    def __init__(self):
        self.repo = get_gamification_repository()
        self.event_repo = get_gamification_event_repository()

    def _clamp(self, value: int, minimum: int = 0, maximum: int = 100) -> int:
        return max(minimum, min(maximum, int(value)))

    def _parse_dt(self, value: Any) -> datetime | None:
        if isinstance(value, datetime):
            return value
        if isinstance(value, str):
            try:
                return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
            except ValueError:
                return None
        return None

    def _is_today_active(self, last_activity) -> bool:
        """Check if user was active today."""
        if not last_activity:
            return False
        today = datetime.utcnow().date()
        last_date = last_activity.date() if hasattr(last_activity, "date") else last_activity
        return last_date == today

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
            "last_action": "idle",
            "animation_clip": "idle",
        }

    def _mood_from_stats(self, hunger: int, energy: int, happiness: int) -> str:
        if energy <= 15:
            return "sleeping"
        if hunger >= 75:
            return "hungry"
        if happiness <= 25:
            return "sad"
        if happiness >= 80 and hunger <= 50:
            return "happy"
        return "content"

    def _hydrate_pet_state(self, pet: Dict[str, Any] | None) -> Dict[str, Any]:
        hydrated = self._default_pet()
        if pet:
            hydrated.update(pet)

        now = datetime.utcnow()
        last_update = self._parse_dt(hydrated.get("last_mood_update")) or self._parse_dt(hydrated.get("last_care_at")) or now
        elapsed_hours = max(0, (now - last_update).total_seconds() / 3600)

        if elapsed_hours >= 0.25:
            hunger = self._clamp(hydrated.get("hunger", 45) + int(elapsed_hours * 6))
            happiness = self._clamp(hydrated.get("happiness", 50) - int(elapsed_hours * 3))
            energy = self._clamp(hydrated.get("energy", 70) + int(elapsed_hours * 4))
            hydrated.update({
                "hunger": hunger,
                "happiness": happiness,
                "energy": energy,
                "last_mood_update": now,
            })

        hydrated["mood"] = self._mood_from_stats(
            self._clamp(hydrated.get("hunger", 45)),
            self._clamp(hydrated.get("energy", 70)),
            self._clamp(hydrated.get("happiness", 50)),
        )
        hydrated["needs_attention"] = hydrated["mood"] in {"hungry", "sad", "sleeping"}
        hydrated["animation_clip"] = hydrated.get("animation_clip") or hydrated["mood"]
        return hydrated

    async def award_points(self, user_id: str, points: int, reason: str) -> Dict[str, Any]:
        """Award points for an action"""
        logger.info(f"Awarding {points} points to {user_id} for {reason}")
        return await self.repo.update_points(user_id, points)
    
    async def add_xp(self, user_id: str, action: str, metadata: Dict = None) -> Dict[str, Any]:
        """
        Add XP for completing an action.
        Returns result with level_up info and badges earned.

        NOTE: Legacy method - no idempotency. Use add_xp_with_event_id for new integrations.
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
        elif level_up and new_level == 20:
            await self.award_badge(user_id, "level_20")
            badges_earned.append("level_20")

        # Auto-award stickers based on milestones
        sticker_earned = await self._check_sticker_rewards(user_id, action, new_level, metadata)

        logger.info(f"Added {xp_amount} XP for {user_id} ({action})")

        return {
            "success": True,
            "xp_added": xp_amount,
            "total_xp": new_xp,
            "level": new_level,
            "level_up": level_up,
            "streak": streak_result.get("current_streak", 0),
            "badges_earned": badges_earned,
            "sticker_earned": sticker_earned,
            "_legacy": True,  # Mark as legacy for analytics
        }

    async def add_xp_with_event_id(
        self,
        user_id: str,
        event_id: str,
        action: str,
        source_type: Optional[str] = None,
        source_id: Optional[str] = None,
        attempt_id: Optional[str] = None,
        session_id: Optional[str] = None,
        learning_path_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Idempotent XP award via UNIQUE(user_id, event_id).

        Algorithm:
        1. Validate event_id is non-null, non-empty, non-whitespace.
        2. Try to create event with PROCESSING status.
        3. If duplicate, load existing event.
           - If APPLIED: return cached result (idempotent replay).
           - If PROCESSING: return error (concurrent processing).
           - If REJECTED: allow retry with same event_id.
        4. Calculate XP and progression.
        5. Mark event as APPLIED atomically (conditional update).
           - Only succeeds if status was PROCESSING.
           - If failed, XP was NOT awarded (prevents duplicate XP).
        6. Apply XP to user_points ONLY after successful mark_applied.

        Returns:
            {
                "success": bool,
                "event_id": str,
                "action": str,
                "xp_awarded": int,
                "total_xp_after": int,
                "level_after": int,
                "xp_to_next_after": int,
                "level_up": bool,
                "idempotent_replay": bool,
                "status": str,
                "badges_earned": list,
                "sticker_earned": dict,
                "streak": int,
            }
        """
        # Step 0: Validate event_id
        if not event_id or not str(event_id).strip():
            logger.warning(f"[add_xp_with_event_id] Invalid event_id: {event_id!r}")
            return {
                "success": False,
                "event_id": str(event_id) if event_id is not None else "None",
                "error": "Invalid event_id: cannot be None, empty, or whitespace-only",
                "idempotent_replay": False,
            }
        event_id = str(event_id).strip()

        # Validate action
        if action not in XP_REWARDS:
            logger.warning(f"[add_xp_with_event_id] Unknown action: {action}")
            return {
                "success": False,
                "event_id": event_id,
                "error": f"Unknown action: {action}",
                "idempotent_replay": False,
            }

        xp_amount = XP_REWARDS[action]

        # Step 1: Try to create event
        created = await self.event_repo.create_event(
            user_id=user_id,
            event_id=event_id,
            action=action,
            source_type=source_type,
            source_id=source_id,
            attempt_id=attempt_id,
            session_id=session_id,
            learning_path_id=learning_path_id,
            metadata=metadata,
        )

        if created is None:
            # Duplicate event - check status for replay semantics
            existing = await self.event_repo.find_by_user_event(user_id, event_id)
            if existing and existing.get("status") == EventStatus.APPLIED.value:
                # Valid replay - return cached result
                logger.info(f"[add_xp_with_event_id] Replay for event {event_id}")
                return {
                    "success": True,
                    "event_id": event_id,
                    "action": existing.get("action"),
                    "xp_awarded": existing.get("xp_awarded", 0),
                    "total_xp_after": existing.get("total_xp_after", 0),
                    "level_after": existing.get("level_after", 1),
                    "xp_to_next_after": existing.get("xp_to_next_after", 100),
                    "level_up": False,  # Already counted in snapshot
                    "idempotent_replay": True,
                    "status": existing.get("status"),
                    "badges_earned": [],  # Not replayed
                    "sticker_earned": None,  # Not replayed
                    "streak": 0,  # Not recalculated
                }
            elif existing and existing.get("status") == EventStatus.PROCESSING.value:
                # Concurrent processing - conflict
                logger.warning(f"[add_xp_with_event_id] Concurrent processing for event {event_id}")
                return {
                    "success": False,
                    "event_id": event_id,
                    "error": "CONCURRENT_PROCESSING",
                    "idempotent_replay": False,
                }
            else:
                # REJECTED or unknown - allow retry by resetting to PROCESSING
                reset_result = await self.event_repo.reset_to_processing(user_id, event_id)
                if reset_result is None:
                    # Race condition - another request changed the status
                    existing = await self.event_repo.find_by_user_event(user_id, event_id)
                    if existing and existing.get("status") == EventStatus.APPLIED.value:
                        return {
                            "success": True,
                            "event_id": event_id,
                            "action": existing.get("action"),
                            "xp_awarded": existing.get("xp_awarded", 0),
                            "total_xp_after": existing.get("total_xp_after", 0),
                            "level_after": existing.get("level_after", 1),
                            "xp_to_next_after": existing.get("xp_to_next_after", 100),
                            "level_up": False,
                            "idempotent_replay": True,
                            "status": existing.get("status"),
                            "badges_earned": [],
                            "sticker_earned": None,
                            "streak": 0,
                        }
                    return {
                        "success": False,
                        "event_id": event_id,
                        "error": "RETRY_CONFLICT",
                        "idempotent_replay": False,
                    }
                # Reset succeeded - continue with processing

        # Step 2: Calculate XP and progression
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

        # Step 3: Mark event as APPLIED first (atomic conditional update)
        # This MUST succeed before we apply XP to avoid duplicate awards
        mark_result = await self.event_repo.mark_applied(
            user_id=user_id,
            event_id=event_id,
            xp_awarded=xp_amount,
            total_xp_after=current_xp + xp_amount,
            level_after=new_level,
            xp_to_next_after=xp_to_next,
        )
        
        # ATOMICITY GUARANTEE: Only apply XP if mark_applied succeeded
        # mark_applied uses conditional update - only succeeds if status was PROCESSING
        # If None is returned, another request won the race (event already APPLIED)
        if mark_result is None:
            logger.warning(f"[add_xp_with_event_id] Race lost for event {event_id}, XP not applied")
            # Return conflict - XP was not awarded
            return {
                "success": False,
                "event_id": event_id,
                "error": "CONCURRENT_PROCESSING",
                "idempotent_replay": False,
            }
        
        # Step 4: Apply XP to user_points ONLY after successful mark_applied
        await self.repo.add_xp(user_id, xp_amount, new_level, xp_to_next)

        # Step 5: Update streak
        today = datetime.utcnow().strftime("%Y-%m-%d")
        streak_result = await self.update_streak(user_id, today)

        # Step 6: Check badges (only on level-up milestones)
        badges_earned = []
        if level_up and new_level == 5:
            await self.award_badge(user_id, "level_5")
            badges_earned.append("level_5")
        elif level_up and new_level == 10:
            await self.award_badge(user_id, "level_10")
            badges_earned.append("level_10")
        elif level_up and new_level == 20:
            await self.award_badge(user_id, "level_20")
            badges_earned.append("level_20")

        # Step 7: Check sticker rewards
        sticker_earned = await self._check_sticker_rewards(user_id, action, new_level, metadata)

        logger.info(f"[add_xp_with_event_id] Applied {xp_amount} XP for {user_id} ({action}), event_id={event_id}")

        return {
            "success": True,
            "event_id": event_id,
            "action": action,
            "xp_awarded": mark_result.get("xp_awarded", xp_amount),
            "total_xp_after": mark_result.get("total_xp_after", current_xp + xp_amount),
            "level_after": mark_result.get("level_after", new_level),
            "xp_to_next_after": mark_result.get("xp_to_next_after", xp_to_next),
            "level_up": level_up,
            "idempotent_replay": False,
            "status": EventStatus.APPLIED.value,
            "badges_earned": badges_earned,
            "sticker_earned": sticker_earned,
            "streak": streak_result.get("current_streak", 0),
        }

    async def check_event_conflict(
        self,
        user_id: str,
        event_id: str,
        expected_action: str,
    ) -> Dict[str, Any]:
        """
        Check if an event_id exists with different semantics (conflict detection).
        Used for semantic validation before processing.
        """
        existing = await self.event_repo.find_by_user_event(user_id, event_id)
        if existing and existing.get("action") != expected_action:
            return {
                "has_conflict": True,
                "existing_event": existing,
                "message": f"Event {event_id} was used for action '{existing.get('action')}', not '{expected_action}'",
            }
        return {"has_conflict": False, "existing_event": None, "message": None}
    
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
            return {
                "user_id": user_id,
                "total_points": 0,
                "level": 1,
                "xp_to_next_level": 100,
                "stars": 0,
                "badges": [],
                "streak_days": 0,
                "longest_streak": 0,
                "streak_active_today": False,
                "minutes_today": 0,
                "daily_progress": [],
                "pet": self._default_pet(),
            }
        if "user_id" not in stats:
            stats["user_id"] = user_id
        stats["streak_active_today"] = self._is_today_active(stats.get("last_activity_date"))
        stats["minutes_today"] = stats.get("minutes_today", 0)
        stats["pet"] = self._hydrate_pet_state(stats.get("pet"))
        return stats

    async def get_leaderboard(self) -> List[Dict[str, Any]]:
        """Get leaderboard"""
        return await self.repo.get_leaderboard()
    
    # ========== STREAK & DAILY GOAL ==========

    async def get_streak(self, user_id: str) -> Dict[str, Any]:
        """
        Get streak data for a user.
        Returns current streak, longest streak, and daily goal progress.
        """
        return await self.repo.get_streak(user_id)

    # ========== PET METHODS ==========
    
    async def get_pet(self, user_id: str) -> Dict[str, Any]:
        """Get user's virtual pet"""
        pet = await self.repo.get_pet(user_id)
        hydrated = self._hydrate_pet_state(pet)
        if pet and (hydrated.get("last_mood_update") != pet.get("last_mood_update") or hydrated.get("mood") != pet.get("mood")):
            await self.repo.update_pet(user_id, hydrated)
        return hydrated
    
    async def feed_pet(self, user_id: str) -> Dict[str, Any]:
        """
        Feed user's pet - increases happiness.
        Returns updated pet state.
        """
        result = await self.repo.feed_pet(user_id, happiness_boost=10)
        pet = self._hydrate_pet_state(result.get("pet", {}))
        
        # Award XP for caring for pet
        await self.repo.update_points(user_id, 5)  # Small XP reward
        
        # Update pet XP for evolution
        pet_xp = pet.get("xp_earned", 0) + 5
        await self.repo.update_pet_xp(user_id, pet_xp)
        
        # Check evolution
        new_stage = self._get_evolution_stage(pet_xp)
        old_stage = pet.get("stage", "baby")
        evolved = False
        
        if new_stage != old_stage:
            await self.repo.update_pet_stage(user_id, new_stage)
            pet["stage"] = new_stage
            evolved = True
            logger.info(f"Pet evolved to {new_stage} for user {user_id}")
        
        logger.info(f"Fed pet for user {user_id}, happiness: {pet.get('happiness')}")
        
        return {
            "success": True,
            "happiness": pet.get("happiness", 60),
            "hunger": pet.get("hunger", 10),
            "energy": pet.get("energy", 75),
            "mood": pet.get("mood", "happy"),
            "last_action": "feed",
            "animation_clip": "feed",
            "pet_type": pet.get("type", "bunny"),
            "xp_earned": 5,
            "pet_xp": pet_xp,
            "stage": new_stage,
            "evolved": evolved
        }
    
    async def choose_pet(self, user_id: str, pet_type: str) -> Dict[str, Any]:
        """Choose/change pet type"""
        if not pet_type or not pet_type.strip():
            return {"success": False, "error": "Pet type is required"}
        
        pet_data = {
            "type": pet_type.strip(),
            "happiness": 50,
            "hunger": 45,
            "energy": 70,
            "mood": "content",
            "last_fed": None,
            "last_played": None,
            "last_care_at": datetime.utcnow(),
            "last_mood_update": datetime.utcnow(),
            "outfit": "none",
            "xp_earned": 0,
            "stage": "baby",
            "last_action": "idle",
            "animation_clip": "idle",
        }
        await self.repo.update_pet(user_id, pet_data)
        
        return {"success": True, "pet": pet_data}
    
    async def play_with_pet(self, user_id: str) -> Dict[str, Any]:
        """
        Play with user's pet - increases happiness and awards XP.
        Returns updated pet state.
        """
        result = await self.repo.play_pet(user_id, happiness_boost=15)
        pet = self._hydrate_pet_state(result.get("pet", {}))
        
        # Award XP for playing
        await self.repo.update_points(user_id, 8)
        
        # Update pet XP for evolution
        pet_xp = pet.get("xp_earned", 0) + 8
        await self.repo.update_pet_xp(user_id, pet_xp)
        
        # Check evolution
        new_stage = self._get_evolution_stage(pet_xp)
        if new_stage != pet.get("stage", "baby"):
            await self.repo.update_pet_stage(user_id, new_stage)
            pet["stage"] = new_stage
            logger.info(f"Pet evolved to {new_stage} for user {user_id}")
        
        logger.info(f"Played with pet for user {user_id}, happiness: {pet.get('happiness')}")
        
        return {
            "success": True,
            "happiness": pet.get("happiness", 65),
            "hunger": pet.get("hunger", 55),
            "energy": pet.get("energy", 55),
            "mood": pet.get("mood", "happy"),
            "last_action": "play",
            "animation_clip": "play",
            "pet_type": pet.get("type", "bunny"),
            "xp_earned": 8,
            "pet_xp": pet_xp,
            "stage": new_stage
        }
    
    async def change_pet_outfit(self, user_id: str, outfit: str) -> Dict[str, Any]:
        """Change pet's outfit/accessory"""
        valid_outfits = ["none", "crown", "wizard_hat", "superhero_cape", "party_hat", "glasses", "bowtie"]
        if outfit not in valid_outfits:
            return {"success": False, "error": f"Invalid outfit. Choose from: {valid_outfits}"}
        
        await self.repo.update_pet_outfit(user_id, outfit)
        
        return {"success": True, "outfit": outfit}
    
    def _get_evolution_stage(self, xp: int) -> str:
        """Calculate evolution stage based on XP"""
        if xp >= 2000:
            return "adult"
        elif xp >= 500:
            return "teen"
        elif xp >= 100:
            return "child"
        return "baby"
    
    def _get_evolution_threshold(self, stage: str) -> int:
        """Get XP threshold for a given stage"""
        thresholds = {"baby": 0, "child": 100, "teen": 500, "adult": 2000}
        return thresholds.get(stage, 0)
    
    def _get_evolution_progress(self, xp: int) -> Dict[str, Any]:
        """Calculate progress to next evolution stage"""
        current_stage = self._get_evolution_stage(xp)
        current_threshold = self._get_evolution_threshold(current_stage)
        
        # Next stage thresholds
        next_thresholds = {"baby": 100, "child": 500, "teen": 2000}
        next_stage = None
        next_threshold = None
        
        if current_stage in next_thresholds:
            next_stage = "teen" if current_stage == "child" else ("adult" if current_stage == "teen" else "child")
            next_threshold = next_thresholds[current_stage]
        
        progress = 0
        remaining = 0
        
        if next_threshold:
            progress = int(((xp - current_threshold) / (next_threshold - current_threshold)) * 100)
            remaining = next_threshold - xp
        
        return {
            "current_stage": current_stage,
            "current_xp": xp,
            "progress_percentage": min(100, max(0, progress)),
            "xp_to_next_stage": max(0, remaining),
            "next_stage": next_stage,
            "next_stage_threshold": next_threshold,
        }
    
    async def get_pet_xp(self, user_id: str) -> Dict[str, Any]:
        """Get pet XP and evolution progress for a user"""
        pet = await self.repo.get_pet(user_id)
        if not pet:
            return {
                "xp": 0,
                "stage": "baby",
                "progress": self._get_evolution_progress(0)
            }
        
        xp = pet.get("xp_earned", 0)
        return {
            "xp": xp,
            "stage": self._get_evolution_stage(xp),
            "progress": self._get_evolution_progress(xp)
        }
    
    # ========== STICKER METHODS ==========
    
    STICKER_CATALOG = {
        # Common stickers
        "star_gold": {"name": "Gold Star", "rarity": "common", "imageUrl": "/assets/stickers/star_gold.png"},
        "trophy_bronze": {"name": "Bronze Trophy", "rarity": "common", "imageUrl": "/assets/stickers/trophy_bronze.png"},
        "animal_elephant": {"name": "Elephant", "rarity": "common", "imageUrl": "/assets/stickers/elephant.png"},
        "heart_pink": {"name": "Pink Heart", "rarity": "common", "imageUrl": "/assets/stickers/heart_pink.png"},
        "book_blue": {"name": "Blue Book", "rarity": "common", "imageUrl": "/assets/stickers/book_blue.png"},
        # Rare stickers
        "star_rainbow": {"name": "Rainbow Star", "rarity": "rare", "imageUrl": "/assets/stickers/star_rainbow.png"},
        "animal_lion": {"name": "Lion", "rarity": "rare", "imageUrl": "/assets/stickers/lion.png"},
        "rocket": {"name": "Rocket", "rarity": "rare", "imageUrl": "/assets/stickers/rocket.png"},
        "medal_silver": {"name": "Silver Medal", "rarity": "rare", "imageUrl": "/assets/stickers/medal_silver.png"},
        # Epic stickers
        "trophy_gold": {"name": "Gold Trophy", "rarity": "epic", "imageUrl": "/assets/stickers/trophy_gold.png"},
        "diamond": {"name": "Diamond", "rarity": "epic", "imageUrl": "/assets/stickers/diamond.png"},
        "unicorn": {"name": "Unicorn", "rarity": "epic", "imageUrl": "/assets/stickers/unicorn.png"},
        # Legendary stickers
        "crown": {"name": "Crown", "rarity": "legendary", "imageUrl": "/assets/stickers/crown.png"},
        "dragon": {"name": "Dragon", "rarity": "legendary", "imageUrl": "/assets/stickers/dragon.png"},
        "phoenix": {"name": "Phoenix", "rarity": "legendary", "imageUrl": "/assets/stickers/phoenix.png"},
    }
    
    # Sticker award rules - maps actions/milestones to sticker rewards
    STICKER_REWARDS = {
        # Game completion rewards (based on score)
        "game_perfect": ["trophy_gold", "diamond"],  # 100% score
        "game_great": ["star_rainbow", "medal_silver"],  # 80%+ score
        "game_good": ["star_gold", "heart_pink"],  # 60%+ score
        # Activity milestones
        "first_game": ["star_gold"],
        "games_10": ["rocket"],
        "games_25": ["unicorn"],
        "games_50": ["crown"],
        "pronunciation_perfect": ["animal_lion", "star_rainbow"],
        "combo_discovered": ["animal_elephant", "book_blue"],
        "streak_7": ["diamond"],
        "streak_14": ["dragon"],
        "level_10": ["trophy_gold"],
        "level_20": ["phoenix"],
        # Lesson completion rewards
        "lesson_completed": ["star_gold", "heart_pink", "animal_elephant", "book_blue"],
    }
    
    async def get_stickers(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's sticker collection"""
        return await self.repo.get_stickers(user_id)
    
    def get_sticker_catalog(self) -> Dict[str, Dict[str, Any]]:
        """Get full sticker catalog (no auth required)"""
        return self.STICKER_CATALOG
    
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
    
    async def _check_sticker_rewards(
        self, 
        user_id: str, 
        action: str, 
        level: int, 
        metadata: Dict = None
    ) -> Dict[str, Any]:
        """
        Check and auto-award stickers based on action and milestones.
        Returns sticker info if one was awarded, None otherwise.
        """
        import random
        
        metadata = metadata or {}
        sticker_to_award = None
        
        # Level-based rewards
        if level == 10:
            sticker_to_award = "trophy_gold"
        elif level == 20:
            sticker_to_award = "phoenix"
        
        # Action-based rewards with random selection
        if action == "game_completed":
            score = metadata.get("score", 0)
            if score >= 100:
                candidates = self.STICKER_REWARDS.get("game_perfect", [])
            elif score >= 80:
                candidates = self.STICKER_REWARDS.get("game_great", [])
            elif score >= 60:
                candidates = self.STICKER_REWARDS.get("game_good", [])
            else:
                candidates = []
            
            if candidates:
                # Random chance (30%) to award a sticker for game completion
                if random.random() < 0.3:
                    sticker_to_award = random.choice(candidates)
        
        elif action == "pronunciation_correct":
            score = metadata.get("score", 0)
            if score >= 90 and random.random() < 0.25:
                candidates = self.STICKER_REWARDS.get("pronunciation_perfect", [])
                if candidates:
                    sticker_to_award = random.choice(candidates)
        
        elif action == "combo_discovered":
            if random.random() < 0.4:  # 40% chance
                candidates = self.STICKER_REWARDS.get("combo_discovered", [])
                if candidates:
                    sticker_to_award = random.choice(candidates)
        
        # Award the sticker if selected
        if sticker_to_award:
            result = await self.collect_sticker(user_id, sticker_to_award)
            if result.get("collected"):
                return result.get("sticker")
        
        return None

    async def _maybe_award_lesson_sticker(
        self,
        user_id: str,
        words_count: int,
        games_played: int,
    ) -> Optional[Dict[str, Any]]:
        """
        Auto-award stickers for lesson completion based on milestones.
        Called automatically when a lesson is completed.
        """
        import random

        user_stats = await self.repo.get_by_user_id(user_id) or {}
        total_lessons = user_stats.get("lessons_completed", 0)
        total_games = user_stats.get("games_played", 0) + (games_played or 0)
        total_words = user_stats.get("total_words_learned", 0) + (words_count or 0)

        sticker_to_award: Optional[str] = None

        # Lesson milestone stickers
        milestone_map = {
            1: "star_gold",
            5: "medal_silver",
            10: "trophy_bronze",
            20: "trophy_gold",
            50: "crown",
        }
        for threshold, sticker_id in milestone_map.items():
            if total_lessons == threshold:
                sticker_to_award = sticker_id
                break

        # Fallback: random sticker with low chance for non-milestone completions
        if not sticker_to_award and random.random() < 0.15:
            candidates = self.STICKER_REWARDS.get("lesson_completed", [])
            if candidates:
                sticker_to_award = random.choice(candidates)

        if sticker_to_award:
            result = await self.collect_sticker(user_id, sticker_to_award)
            if result.get("collected"):
                return result.get("sticker")

        return None

    # ========== PROGRESS REPORTS ==========

    async def track_learning(self, user_id: str, words_learned: int, time_mins: int) -> Dict[str, Any]:
        """Track daily learning progress"""
        await self.repo.add_daily_stat(user_id, words_learned, time_mins)
        return {"success": True, "words_learned": words_learned, "time_mins": time_mins}
    
    async def get_progress_report(self, user_id: str, days: int = 7) -> Dict[str, Any]:
        """
        Get comprehensive progress report for parent dashboard.
        """
        # Get user stats
        stats = await self.repo.get_by_user_id(user_id) or {}

        # Get daily stats (warns, delegated to MongoDB)
        daily_stats = await self.repo.get_daily_stats(user_id, days)

        # Get stickers from separate table (PostgreSQL)
        stickers = await self.repo.get_stickers(user_id)

        # Calculate totals (support both old 'words' and new 'words_learned' field names)
        total_words = sum(s.get("words_learned", s.get("words", 0)) for s in daily_stats)
        total_time = sum(s.get("time_mins", 0) for s in daily_stats)

        return {
            "user_id": user_id,
            "period_days": days,
            "summary": {
                "total_xp": stats.get("total_points", 0),
                "level": stats.get("level", 1),
                "streak_days": stats.get("streak_days", 0),
                "badges_count": len(stats.get("badges", [])),
                "stickers_count": len(stickers),
            },
            "learning": {
                "total_words": total_words,
                "total_time_mins": total_time,
                "avg_words_per_day": round(total_words / max(len(daily_stats), 1), 1),
                "avg_time_per_day": round(total_time / max(len(daily_stats), 1), 1),
            },
            "daily_breakdown": daily_stats,
            "pet": stats.get("pet") or {"type": "bunny", "happiness": 50},
        }


def get_gamification_service() -> GamificationService:
    from database.postgres_connection import postgres_core_enabled
    if postgres_core_enabled():
        from services.postgres_gamification_service import PostgresGamificationService
        return PostgresGamificationService()
    return GamificationService()

