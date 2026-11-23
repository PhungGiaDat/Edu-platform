"""Transaction-safe reward claiming for the date-scoped Daily Challenge."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from database.postgres_connection import postgres_pool
from models.gamification_model import BADGE_DEFINITIONS
from repositories.daily_challenge_repository import DailyChallengeRepository, PRODUCT_TIMEZONE
from repositories.postgres_user_repository import PostgresUserRepository
from services.postgres_gamification_service import PostgresGamificationService


@dataclass(frozen=True)
class DailyClaimResult:
    status: Literal["applied", "claimed", "locked"]
    xp_awarded: int
    badge_id: str | None
    pet_id: str | None
    idempotent_replay: bool


class DailyRewardGrantError(RuntimeError):
    """Signals a reward mutation that must roll back its enclosing transaction."""


class DailyRewardService:
    """Claims only server-defined rewards from one completed Daily Challenge."""

    def __init__(
        self,
        *,
        pool=None,
        challenge_repository=DailyChallengeRepository,
        gamification_service: PostgresGamificationService | None = None,
        user_repository=PostgresUserRepository,
    ) -> None:
        self._pool = pool
        self._challenge_repository = challenge_repository
        self._gamification_service = gamification_service or PostgresGamificationService()
        self._user_repository = user_repository

    @staticmethod
    def _challenge_date(now: datetime | None) -> datetime.date:
        instant = now or datetime.now(timezone.utc)
        if instant.tzinfo is None:
            raise ValueError("now must be timezone-aware")
        try:
            product_timezone = ZoneInfo(PRODUCT_TIMEZONE)
        except ZoneInfoNotFoundError:
            # Windows CI images may omit the IANA database. Ho Chi Minh has a
            # fixed UTC+07 offset and no daylight-saving transition, so this
            # preserves the approved initial product-day contract without
            # silently guessing for any future configurable timezone.
            if PRODUCT_TIMEZONE != "Asia/Ho_Chi_Minh":
                raise
            product_timezone = timezone(timedelta(hours=7), name=PRODUCT_TIMEZONE)
        return instant.astimezone(product_timezone).date()

    @staticmethod
    def _outcome_from_claim(claim: dict[str, Any], *, status: Literal["claimed", "locked"]) -> DailyClaimResult:
        raw_outcome = claim.get("grant_result") or {}
        outcome = json.loads(raw_outcome) if isinstance(raw_outcome, str) else dict(raw_outcome)
        return DailyClaimResult(
            status=status,
            xp_awarded=int(outcome.get("xp_awarded", claim.get("xp_awarded", 0) or 0)),
            badge_id=outcome.get("badge_id", claim.get("badge_id")),
            pet_id=outcome.get("pet_id", claim.get("pet_id")),
            idempotent_replay=status == "claimed",
        )

    async def claim_today(self, user_id: str, now: datetime | None = None) -> DailyClaimResult:
        challenge_date = self._challenge_date(now)
        pool = self._pool or postgres_pool()
        try:
            async with pool.acquire() as connection:
                async with connection.transaction():
                    challenge = await self._challenge_repository.get_today(connection, challenge_date)
                    if challenge is None:
                        raise DailyRewardGrantError("NO_PUBLISHED_CHALLENGE")
                    challenge_id = str(challenge["challenge_id"])

                    existing_claim = await self._challenge_repository.get_claim(connection, user_id, challenge_id)
                    if existing_claim is not None:
                        if existing_claim["status"] == "applied":
                            return self._outcome_from_claim(existing_claim, status="claimed")
                        return self._outcome_from_claim(existing_claim, status="locked")

                    completion = await self._challenge_repository.get_completion(
                        connection, user_id, challenge_id, challenge_date
                    )
                    progress = int(completion["progress"])
                    target = int(completion["target"])
                    if target < 1 or progress < target:
                        raise DailyRewardGrantError("INSUFFICIENT_PROGRESS")

                    event_id = f"daily_challenge:{challenge_id}"
                    claim = await self._challenge_repository.lock_or_create_claim(
                        connection, user_id, challenge_id, event_id, progress
                    )
                    if claim["status"] == "applied":
                        return self._outcome_from_claim(claim, status="claimed")
                    if claim["status"] != "processing":
                        return self._outcome_from_claim(claim, status="locked")

                    rewards = await self._challenge_repository.get_rewards(connection, challenge_id)
                    xp_rewards = [reward for reward in rewards if reward["reward_type"] == "xp"]
                    badge_rewards = [reward for reward in rewards if reward["reward_type"] == "badge"]
                    pet_rewards = [reward for reward in rewards if reward["reward_type"] == "pet"]
                    if len(xp_rewards) > 1 or len(badge_rewards) > 1 or len(pet_rewards) > 1:
                        raise DailyRewardGrantError("INVALID_REWARD_DEFINITION")

                    xp_awarded = int(xp_rewards[0]["xp_amount"]) if xp_rewards else 0
                    if xp_awarded:
                        xp_result = await self._gamification_service.apply_xp_event(
                            connection,
                            user_id=user_id,
                            event_id=event_id,
                            action="daily_challenge_claim",
                            xp_amount=xp_awarded,
                            source_type="daily_challenge",
                            source_id=challenge_id,
                            metadata={"challenge_id": challenge_id, "challenge_date": challenge_date.isoformat()},
                        )
                        if not xp_result.get("success"):
                            raise DailyRewardGrantError(str(xp_result.get("error", "XP_GRANT_FAILED")))

                    badge_id = str(badge_rewards[0]["badge_id"]) if badge_rewards else None
                    if badge_id is not None:
                        if badge_id not in BADGE_DEFINITIONS:
                            raise DailyRewardGrantError("UNKNOWN_BADGE_REWARD")
                        await self._gamification_service.grant_badge_on_connection(connection, user_id, badge_id)

                    pet_id = str(pet_rewards[0]["pet_id"]) if pet_rewards else None
                    if pet_id is not None:
                        await self._user_repository.grant_pet_on_connection(connection, user_id, pet_id)

                    outcome = {
                        "xp_awarded": xp_awarded,
                        "badge_id": badge_id,
                        "pet_id": pet_id,
                        "event_id": event_id if xp_awarded else None,
                    }
                    await self._challenge_repository.mark_claim_applied(
                        connection, user_id, challenge_id, outcome
                    )
                    return DailyClaimResult(
                        status="applied",
                        xp_awarded=xp_awarded,
                        badge_id=badge_id,
                        pet_id=pet_id,
                        idempotent_replay=False,
                    )
        except DailyRewardGrantError:
            raise
        except Exception as exc:
            raise DailyRewardGrantError(str(exc)) from exc
