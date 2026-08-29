"""Behavioral tests for the transaction-bound Daily Challenge reward service."""

from __future__ import annotations

import asyncio
from copy import deepcopy
from datetime import date, datetime, timezone

import pytest

from services.daily_reward_service import DailyRewardGrantError, DailyRewardService


CHALLENGE_DATE = date(2026, 8, 30)
CHALLENGE_ID = "daily:2026-08-30"


class FakePool:
    def __init__(self, connection):
        self.connection = connection

    def acquire(self):
        return FakeAcquire(self.connection)


class FakeAcquire:
    def __init__(self, connection):
        self.connection = connection

    async def __aenter__(self):
        return self.connection

    async def __aexit__(self, exc_type, exc, traceback):
        return False


class FakeTransaction:
    def __init__(self, connection):
        self.connection = connection
        self.snapshot = None

    async def __aenter__(self):
        await self.connection.lock.acquire()
        self.snapshot = deepcopy(
            (
                self.connection.aggregate,
                self.connection.events,
                self.connection.badges,
                self.connection.unlocked_pets,
                self.connection.xp_apply_count,
                self.connection.pet_insert_count,
                self.connection.repository.claims if self.connection.repository is not None else None,
            )
        )
        return self

    async def __aexit__(self, exc_type, exc, traceback):
        if exc_type is not None:
            (
                self.connection.aggregate,
                self.connection.events,
                self.connection.badges,
                self.connection.unlocked_pets,
                self.connection.xp_apply_count,
                self.connection.pet_insert_count,
                claims,
            ) = self.snapshot
            if self.connection.repository is not None:
                self.connection.repository.claims = claims
        self.connection.lock.release()
        return False


class FakeRewardConnection:
    """Small stateful asyncpg fake; every mutation is transaction-snapshotted."""

    def __init__(self, *, fail_pet_grant: bool = False):
        self.lock = asyncio.Lock()
        self.fail_pet_grant = fail_pet_grant
        self.aggregate = {
            "total_points": 0,
            "level": 1,
            "xp_to_next_level": 100,
            "streak_days": 0,
        }
        self.events = {}
        self.badges = []
        self.unlocked_pets = set()
        self.xp_apply_count = 0
        self.pet_insert_count = 0
        self.calls = []
        self.repository = None

    def transaction(self):
        return FakeTransaction(self)

    async def fetchval(self, query, *args):
        self.calls.append(("fetchval", query, args))
        if "SELECT 1 FROM public.users" in query:
            return 1
        raise AssertionError(f"Unexpected fetchval query: {query}")

    async def fetchrow(self, query, *args):
        self.calls.append(("fetchrow", query, args))
        if "INSERT INTO public.gamification_events" in query:
            key = (args[0], args[1])
            if key in self.events:
                return None
            event = {
                "user_id": args[0],
                "event_id": args[1],
                "action": args[2],
                "source_type": args[3],
                "source_id": args[4],
                "attempt_id": args[5],
                "session_id": args[6],
                "learning_path_id": args[7],
                "metadata": args[8],
                "xp_awarded": 0,
                "total_xp_after": None,
                "level_after": None,
                "xp_to_next_after": None,
                "status": "processing",
            }
            self.events[key] = event
            return deepcopy(event)
        if "SELECT * FROM public.gamification_events" in query:
            return deepcopy(self.events.get((args[0], args[1])))
        if "SELECT * FROM public.user_gamification" in query:
            return deepcopy(self.aggregate)
        if "SELECT streak_days FROM public.user_gamification" in query:
            return {"streak_days": self.aggregate["streak_days"]}
        if "UPDATE public.gamification_events SET" in query:
            event = self.events[(args[0], args[1])]
            event.update(
                xp_awarded=args[2],
                total_xp_after=args[3],
                level_after=args[4],
                xp_to_next_after=args[5],
                status="applied",
            )
            return deepcopy(event)
        if "UPDATE public.user_gamification" in query and "SET badges=" in query:
            badge_id = args[1]
            if badge_id not in self.badges:
                self.badges.append(badge_id)
            return {"badges": list(self.badges)}
        raise AssertionError(f"Unexpected fetchrow query: {query}")

    async def execute(self, query, *args):
        self.calls.append(("execute", query, args))
        if "INSERT INTO public.user_gamification" in query:
            return "INSERT 0 1"
        if "UPDATE public.user_gamification SET total_points=" in query:
            self.aggregate.update(
                total_points=args[1], level=args[2], xp_to_next_level=args[3]
            )
            self.xp_apply_count += 1
            return "UPDATE 1"
        if "INSERT INTO public.user_unlocked_pets" in query:
            if self.fail_pet_grant:
                raise RuntimeError("INJECTED_PET_FAILURE")
            pet_id = args[1]
            if pet_id not in self.unlocked_pets:
                self.unlocked_pets.add(pet_id)
                self.pet_insert_count += 1
            return "INSERT 0 1"
        raise AssertionError(f"Unexpected execute query: {query}")


class FakeDailyChallengeRepository:
    def __init__(self, *, rewards, progress: int = 1, target: int = 1):
        self.rewards = [dict(reward) for reward in rewards]
        self.progress = progress
        self.target = target
        self.claims = {}

    async def get_today(self, connection, challenge_date):
        if challenge_date != CHALLENGE_DATE:
            return None
        return {
            "challenge_id": CHALLENGE_ID,
            "challenge_date": CHALLENGE_DATE,
            "target_lessons": self.target,
            "status": "published",
        }

    async def get_claim(self, connection, user_id, challenge_id):
        return deepcopy(self.claims.get((user_id, challenge_id)))

    async def get_completion(self, connection, user_id, challenge_id, challenge_date):
        return {"progress": self.progress, "target": self.target, "completed_lesson_ids": ["lesson-1"]}

    async def lock_or_create_claim(self, connection, user_id, challenge_id, event_id, progress):
        key = (user_id, challenge_id)
        if key not in self.claims:
            self.claims[key] = {
                "user_id": user_id,
                "challenge_id": challenge_id,
                "event_id": event_id,
                "progress_at_claim": progress,
                "status": "processing",
            }
        return deepcopy(self.claims[key])

    async def get_rewards(self, connection, challenge_id):
        assert challenge_id == CHALLENGE_ID
        return deepcopy(self.rewards)

    async def mark_claim_applied(self, connection, user_id, challenge_id, outcome):
        claim = self.claims[(user_id, challenge_id)]
        claim.update(
            status="applied",
            xp_awarded=outcome["xp_awarded"],
            badge_id=outcome["badge_id"],
            pet_id=outcome["pet_id"],
            grant_result=deepcopy(outcome),
        )
        return deepcopy(claim)


def build_service(*, rewards, progress=1, target=1, fail_pet_grant=False):
    connection = FakeRewardConnection(fail_pet_grant=fail_pet_grant)
    repository = FakeDailyChallengeRepository(rewards=rewards, progress=progress, target=target)
    connection.repository = repository
    service = DailyRewardService(pool=FakePool(connection), challenge_repository=repository)
    return service, connection, repository


@pytest.mark.asyncio
async def test_same_daily_claim_awards_xp_once_and_reuses_the_stable_event_id():
    service, connection, _ = build_service(
        rewards=[{"reward_type": "xp", "xp_amount": 50, "display_label": "50 XP"}]
    )
    now = datetime(2026, 8, 30, 6, tzinfo=timezone.utc)

    first = await service.claim_today("user-1", now=now)
    replay = await service.claim_today("user-1", now=now)

    assert first.status == "applied"
    assert first.xp_awarded == 50
    assert replay.status == "claimed"
    assert replay.idempotent_replay is True
    assert connection.xp_apply_count == 1
    assert ("user-1", f"daily_challenge:{CHALLENGE_ID}") in connection.events


@pytest.mark.asyncio
async def test_concurrent_daily_claim_has_one_xp_mutation_and_one_applied_outcome():
    service, connection, _ = build_service(
        rewards=[{"reward_type": "xp", "xp_amount": 50, "display_label": "50 XP"}]
    )
    now = datetime(2026, 8, 30, 6, tzinfo=timezone.utc)

    results = await asyncio.gather(
        service.claim_today("user-1", now=now),
        service.claim_today("user-1", now=now),
    )

    assert sum(result.status == "applied" for result in results) == 1
    assert connection.xp_apply_count == 1


@pytest.mark.asyncio
async def test_failed_pet_grant_rolls_back_claim_and_xp():
    service, connection, repository = build_service(
        rewards=[
            {"reward_type": "xp", "xp_amount": 50, "display_label": "50 XP"},
            {"reward_type": "pet", "pet_id": "pet-fox", "display_label": "Fox"},
        ],
        fail_pet_grant=True,
    )

    with pytest.raises(DailyRewardGrantError, match="INJECTED_PET_FAILURE"):
        await service.claim_today("user-1", now=datetime(2026, 8, 30, tzinfo=timezone.utc))

    assert repository.claims == {}
    assert connection.aggregate["total_points"] == 0
    assert connection.events == {}
    assert connection.unlocked_pets == set()


@pytest.mark.asyncio
async def test_explicit_pet_reward_is_idempotent():
    service, connection, _ = build_service(
        rewards=[{"reward_type": "pet", "pet_id": "pet-fox", "display_label": "Fox"}]
    )
    now = datetime(2026, 8, 30, tzinfo=timezone.utc)

    first = await service.claim_today("user-1", now=now)
    replay = await service.claim_today("user-1", now=now)

    assert first.pet_id == "pet-fox"
    assert replay.idempotent_replay is True
    assert connection.unlocked_pets == {"pet-fox"}
    assert connection.pet_insert_count == 1


@pytest.mark.asyncio
async def test_xp_reward_never_inserts_an_xp_gated_pet_ownership_row():
    service, connection, _ = build_service(
        rewards=[{"reward_type": "xp", "xp_amount": 50, "display_label": "50 XP"}]
    )

    await service.claim_today("user-1", now=datetime(2026, 8, 30, tzinfo=timezone.utc))

    assert connection.unlocked_pets == set()
    assert not any("user_unlocked_pets" in query for _, query, _ in connection.calls)


@pytest.mark.asyncio
async def test_badge_reward_does_not_add_untracked_bonus_xp():
    service, connection, _ = build_service(
        rewards=[{"reward_type": "badge", "badge_id": "first_scan", "display_label": "First Scan"}]
    )

    result = await service.claim_today("user-1", now=datetime(2026, 8, 30, tzinfo=timezone.utc))

    assert result.xp_awarded == 0
    assert connection.aggregate["total_points"] == 0
    assert connection.badges == ["first_scan"]


@pytest.mark.asyncio
async def test_existing_processing_claim_returns_locked_without_reward_mutation():
    service, connection, repository = build_service(
        rewards=[{"reward_type": "xp", "xp_amount": 50, "display_label": "50 XP"}]
    )
    repository.claims[("user-1", CHALLENGE_ID)] = {
        "user_id": "user-1",
        "challenge_id": CHALLENGE_ID,
        "event_id": f"daily_challenge:{CHALLENGE_ID}",
        "status": "processing",
    }

    result = await service.claim_today("user-1", now=datetime(2026, 8, 30, tzinfo=timezone.utc))

    assert result.status == "locked"
    assert connection.xp_apply_count == 0
