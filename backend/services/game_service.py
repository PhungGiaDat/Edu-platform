"""
Game Service - Business logic for game operations
"""
from typing import Optional, List, Dict, Any
import asyncio
import logging

from repositories.game_repository import GameRepository, get_game_repository
from repositories.flashcard_repository import FlashcardRepository, get_flashcard_repository
from services.ai_service import AIService, get_ai_service
from models import GameChallenge, MemoryPair
from settings import settings

logger = logging.getLogger(__name__)


AI_GAME_TYPES = {"drag_match", "catch_word", "word_scramble", "memory_match"}
SUPPORTED_GAME_TYPES = {*AI_GAME_TYPES, "coloring", "pronunciation"}


class GameService:
    """Service handling game business logic"""
    
    def __init__(
        self,
        game_repo: GameRepository,
        flashcard_repo: FlashcardRepository,
        ai_service: Optional[AIService] = None,
    ):
        self.game_repo = game_repo
        self.flashcard_repo = flashcard_repo
        self.ai_service = ai_service

    async def _try_generate_game(
        self,
        flashcard: Dict[str, Any],
        game_type: Optional[str],
        difficulty: str,
    ) -> Optional[Dict[str, Any]]:
        if not settings.AI_DYNAMIC_CONTENT_ENABLED or not self.ai_service:
            return None

        if game_type and game_type not in AI_GAME_TYPES:
            return None

        safe_game_type = game_type if game_type in AI_GAME_TYPES else "drag_match"
        attempts = max(1, settings.AI_CONTENT_RETRIES)
        timeout = max(1.0, settings.AI_CONTENT_TIMEOUT_SECONDS)

        for attempt in range(1, attempts + 1):
            try:
                raw_challenges = await asyncio.wait_for(
                    self.ai_service.generate_game_challenges_from_manifest(
                        flashcard=flashcard,
                        game_type=safe_game_type,
                        difficulty=difficulty,
                        num_challenges=3,
                    ),
                    timeout=timeout,
                )
                challenges = [
                    GameChallenge(**self._normalize_challenge(item, flashcard, safe_game_type, difficulty, index)).model_dump(mode="json")
                    for index, item in enumerate(raw_challenges[:3], start=1)
                ]
                if challenges:
                    logger.info("[Game] Generated AI game for qr_id=%s", flashcard.get("qr_id"))
                    return {
                        "flashcard_qr_id": flashcard["qr_id"],
                        "challenges": challenges,
                        "difficulty": difficulty,
                        "game_type": safe_game_type,
                    }
            except Exception as exc:
                logger.warning(
                    "[Game] AI generation attempt %s/%s failed for qr_id=%s: %s",
                    attempt,
                    attempts,
                    flashcard.get("qr_id"),
                    exc,
                )

        return None

    def _normalize_challenge(
        self,
        item: Dict[str, Any],
        flashcard: Dict[str, Any],
        game_type: str,
        difficulty: str,
        index: int,
    ) -> Dict[str, Any]:
        word = str(flashcard.get("word") or "word")
        image_url = item.get("image_url") or flashcard.get("image_url")
        correct_answer = str(item.get("correct_answer") or word)
        choices = item.get("choices") or self._default_choices(word)
        if correct_answer and correct_answer not in choices:
            choices = [correct_answer, *choices]
        pairs = item.get("pairs")

        if game_type == "word_scramble":
            scrambled_word = item.get("scrambled_word") or self._scramble_word(word)
        else:
            scrambled_word = None

        if game_type == "memory_match":
            pairs = pairs or self._memory_pairs(word, image_url)

        return {
            "game_type": game_type,
            "flashcard_qr_id": flashcard["qr_id"],
            "difficulty": difficulty if difficulty in {"easy", "medium", "hard"} else "easy",
            "question": str(item.get("question") or self._default_question(game_type, word)),
            "image_url": image_url,
            "correct_answer": correct_answer,
            "choices": [str(choice) for choice in choices[:4]] if choices else None,
            "scrambled_word": scrambled_word,
            "pairs": pairs,
            "hint": item.get("hint") or f"Look for {word}.",
            "encouragement_wrong": item.get("encouragement_wrong") or "Good try. Try once more!",
            "celebration_right": item.get("celebration_right") or "Great job!",
            "time_limit": item.get("time_limit") if difficulty == "hard" else None,
            "stars_reward": min(max(int(item.get("stars_reward") or 1), 1), 3),
            "game_config": item.get("game_config") or self._default_game_config(game_type, difficulty),
        }

    def _translation_value(self, flashcard: Dict[str, Any]) -> str:
        translation = flashcard.get("translation") or {}
        if isinstance(translation, dict):
            return translation.get("vi") or translation.get("en") or flashcard.get("word") or "word"
        return str(translation or flashcard.get("word") or "word")

    def _default_choices(self, word: str) -> List[str]:
        choices = [word, "cat", "tree", "book"]
        return list(dict.fromkeys(choices))

    def _scramble_word(self, word: str) -> str:
        letters = list(word.upper())
        if len(letters) <= 2:
            return "".join(reversed(letters))
        return "".join(letters[1::2] + letters[0::2])

    def _memory_pairs(self, word: str, image_url: Optional[str]) -> List[Dict[str, str]]:
        return [
            MemoryPair(id="target", type="word", content=word).model_dump(mode="json"),
            MemoryPair(id="target", type="image", content=image_url or word).model_dump(mode="json"),
        ]

    def _default_question(self, game_type: str, word: str) -> str:
        questions = {
            "drag_match": f"Drag the matching word: {word}",
            "catch_word": f"Catch the word: {word}",
            "word_scramble": "Unscramble the word.",
            "memory_match": "Find the matching cards.",
        }
        return questions.get(game_type, f"Find {word}.")

    def _default_game_config(self, game_type: str, difficulty: str) -> Dict[str, Any]:
        if game_type == "catch_word":
            return {
                "fall_speed": 2 if difficulty == "easy" else 3,
                "spawn_interval": 1400 if difficulty == "easy" else 1100,
            }
        if game_type == "memory_match":
            return {"grid_size": "2x2", "max_flips": 2}
        return {}

    def _local_fallback_game(
        self,
        flashcard: Dict[str, Any],
        game_type: Optional[str],
        difficulty: str,
    ) -> Dict[str, Any]:
        safe_game_type = game_type if game_type in AI_GAME_TYPES else "drag_match"
        word = str(flashcard.get("word") or "word")
        image_url = flashcard.get("image_url")
        translation = self._translation_value(flashcard)

        base = {
            "game_type": safe_game_type,
            "flashcard_qr_id": flashcard["qr_id"],
            "difficulty": difficulty if difficulty in {"easy", "medium", "hard"} else "easy",
            "question": self._default_question(safe_game_type, word),
            "image_url": image_url,
            "correct_answer": word,
            "choices": self._default_choices(word),
            "scrambled_word": self._scramble_word(word) if safe_game_type == "word_scramble" else None,
            "pairs": self._memory_pairs(word, image_url) if safe_game_type == "memory_match" else None,
            "hint": f"{word} means {translation}.",
            "encouragement_wrong": "Nice try. You are learning!",
            "celebration_right": "Wonderful!",
            "time_limit": 45 if difficulty == "hard" else None,
            "stars_reward": 1,
            "game_config": self._default_game_config(safe_game_type, difficulty),
        }

        challenge = GameChallenge(**base).model_dump(mode="json")
        return {
            "flashcard_qr_id": flashcard["qr_id"],
            "challenges": [challenge],
            "difficulty": difficulty,
            "game_type": safe_game_type,
        }
    
    async def get_game_by_flashcard(
        self,
        qr_id: str,
        game_type: Optional[str] = None,
        difficulty: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get game session for a flashcard by QR ID
        
        Args:
            qr_id: Flashcard QR ID
            game_type: Optional game type filter
            difficulty: Optional difficulty filter
        
        Returns:
            Game session with challenges array
        """
        flashcard = await self.flashcard_repo.get_by_qr_id(qr_id)
        if not flashcard:
            logger.warning("[Game] Unknown qr_id=%s", qr_id)
            return None

        difficulty = difficulty or flashcard.get("difficulty") or "easy"

        generated = await self._try_generate_game(flashcard, game_type, difficulty)
        if generated:
            return generated

        # Get all fixed game challenges for this flashcard with filters.
        filters = {}
        if game_type:
            filters["game_type"] = game_type
        if difficulty:
            filters["difficulty"] = difficulty
        
        challenges = await self.game_repo.get_by_flashcard_qr_id(qr_id, **filters)
        
        if not challenges:
            logger.info("[Game] Using local fallback for qr_id=%s", qr_id)
            return self._local_fallback_game(flashcard, game_type, difficulty)

        logger.info("[Game] Using PostgreSQL configured game for qr_id=%s", qr_id)
        
        # Return in GameSessionSchema format
        return {
            "flashcard_qr_id": qr_id,
            "challenges": challenges,
            "difficulty": difficulty,
            "game_type": game_type
        }


def get_game_service() -> GameService:
    """Factory function for dependency injection"""
    game_repo = get_game_repository()
    flashcard_repo = get_flashcard_repository()
    from database.postgres_connection import postgres_core_enabled
    ai_service = None if postgres_core_enabled() else get_ai_service()
    return GameService(game_repo, flashcard_repo, ai_service)
