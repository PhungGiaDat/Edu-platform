"""Unit tests for the asyncpg-backed daily challenge repository."""

from copy import deepcopy
from datetime import date

import pytest

from repositories.daily_challenge_repository import DailyChallengeRepository, PRODUCT_TIMEZONE


class FakeConnection:
    """Small asyncpg-shaped fake that records parameterized calls."""

    def __init__(self, *, fetchrows=(), fetchrow_results=()):
        self.fetchrows = list(fetchrows)
        self.fetchrow_results = list(fetchrow_results)
        self.calls = []

    def transaction(self):
        return FakeTransaction(self)

    async def fetch(self, query, *args):
        self.calls.append(("fetch", query, args))
        return self.fetchrows.pop(0)

    async def fetchrow(self, query, *args):
        self.calls.append(("fetchrow", query, args))
        return self.fetchrow_results.pop(0)

    async def execute(self, query, *args):
        self.calls.append(("execute", query, args))
        return "INSERT 0 1"


class FakeTransaction:
    def __init__(self, connection):
        self.connection = connection

    async def __aenter__(self):
        self.connection.calls.append(("transaction_enter", "", ()))
        return self

    async def __aexit__(self, exc_type, exc, traceback):
        self.connection.calls.append(("transaction_exit", "", (exc_type,)))
        return False


class StatefulConnection:
    """Models the database state needed to prove repository race/rollback paths."""

    def __init__(self, *, published_lessons=(), concurrent_winner=None, concurrent_claim=None):
        self.published_lessons = [dict(lesson) for lesson in published_lessons]
        self.concurrent_winner = deepcopy(concurrent_winner)
        self.concurrent_claim = deepcopy(concurrent_claim)
        self.challenge = None
        self.memberships = []
        self.rewards = []
        self.claim = None
        self.calls = []

    def transaction(self):
        return StatefulTransaction(self)

    async def fetch(self, query, *args):
        self.calls.append(("fetch", query, args))
        assert "FROM public.lessons AS lesson" in query
        return self.published_lessons[: args[0]]

    async def fetchrow(self, query, *args):
        self.calls.append(("fetchrow", query, args))
        if "INSERT INTO public.daily_challenges" in query:
            if self.concurrent_winner is not None:
                self.challenge = deepcopy(self.concurrent_winner)
                self.concurrent_winner = None
                return None
            if self.challenge is not None:
                return None
            self.challenge = {
                "challenge_id": args[0],
                "challenge_date": args[1],
                "title": args[2],
                "target_lessons": args[3],
                "status": "published",
            }
            return deepcopy(self.challenge)
        if "SELECT * FROM public.daily_challenges" in query:
            return deepcopy(self.challenge)
        if "SELECT * FROM public.daily_challenge_claims" in query:
            return deepcopy(self.claim)
        if "INSERT INTO public.daily_challenge_claims" in query:
            if self.concurrent_claim is not None:
                self.claim = deepcopy(self.concurrent_claim)
                self.concurrent_claim = None
                return None
            if self.claim is not None:
                return None
            self.claim = {
                "user_id": args[0],
                "challenge_id": args[1],
                "event_id": args[2],
                "progress_at_claim": args[3],
                "status": "processing",
            }
            return deepcopy(self.claim)
        raise AssertionError(f"Unexpected fetchrow query: {query}")

    async def execute(self, query, *args):
        self.calls.append(("execute", query, args))
        if "INSERT INTO public.daily_challenge_lessons" in query:
            self.memberships.append({
                "challenge_id": args[0],
                "course_id": args[1],
                "lesson_id": args[2],
                "position": args[3],
            })
        elif "INSERT INTO public.daily_challenge_rewards" in query:
            self.rewards.append({
                "challenge_id": args[0],
                "xp_amount": args[1],
                "display_label": args[2],
            })
        else:
            raise AssertionError(f"Unexpected execute query: {query}")
        return "INSERT 0 1"


class StatefulTransaction:
    def __init__(self, connection):
        self.connection = connection
        self.snapshot = None

    async def __aenter__(self):
        self.snapshot = deepcopy((
            self.connection.challenge,
            self.connection.memberships,
            self.connection.rewards,
            self.connection.claim,
        ))
        return self

    async def __aexit__(self, exc_type, exc, traceback):
        if exc_type is not None:
            (
                self.connection.challenge,
                self.connection.memberships,
                self.connection.rewards,
                self.connection.claim,
            ) = self.snapshot
        return False


def sql_calls(connection, method):
    return [query for call_method, query, _ in connection.calls if call_method == method]


@pytest.mark.asyncio
async def test_get_today_uses_a_stable_parameterized_date_lookup():
    connection = FakeConnection(fetchrow_results=[{"challenge_id": "daily:2026-08-30"}])

    result = await DailyChallengeRepository.get_today(connection, date(2026, 8, 30))

    assert result == {"challenge_id": "daily:2026-08-30"}
    _, query, args = connection.calls[0]
    assert "challenge_date=$1::date" in query
    assert args == (date(2026, 8, 30),)


@pytest.mark.asyncio
async def test_ensure_today_creates_a_deterministic_definition_and_only_xp_reward():
    created = {"challenge_id": "daily:2026-08-30", "title": "Daily focus"}
    connection = FakeConnection(
        fetchrows=[[{"course_id": "c1", "lesson_id": "l1"}, {"course_id": "c2", "lesson_id": "l2"}]],
        fetchrow_results=[created],
    )

    result = await DailyChallengeRepository.ensure_today(
        connection, date(2026, 8, 30), "Daily focus", 2, []
    )

    assert result == created
    fetch_query = sql_calls(connection, "fetch")[0]
    assert "course.is_published=TRUE" in fetch_query
    assert "ORDER BY course.course_id, lesson.lesson_order, lesson.lesson_id" in fetch_query
    assert "LIMIT $1" in fetch_query
    challenge_insert = next(query for query in sql_calls(connection, "fetchrow") if "INSERT INTO public.daily_challenges" in query)
    assert "ON CONFLICT (challenge_date) DO NOTHING" in challenge_insert
    execute_calls = [call for call in connection.calls if call[0] == "execute"]
    executed = "\n".join(call[1] for call in execute_calls)
    assert "INSERT INTO public.daily_challenge_lessons" in executed
    assert "reward_type, xp_amount, display_label" in executed
    reward_call = next(call for call in execute_calls if "INSERT INTO public.daily_challenge_rewards" in call[1])
    assert "'xp', $2, $3" in reward_call[1]
    assert reward_call[2] == ("daily:2026-08-30", 50, "50 XP")
    assert "Mystery Badge" not in executed
    assert "user_gamification" not in executed


@pytest.mark.asyncio
async def test_ensure_today_preserves_an_existing_definition_without_reseeding_it():
    existing = {"challenge_id": "daily:2026-08-30", "title": "Existing"}
    connection = FakeConnection(fetchrow_results=[None, existing])

    result = await DailyChallengeRepository.ensure_today(
        connection, date(2026, 8, 30), "Daily focus", 2, []
    )

    assert result == existing
    assert sql_calls(connection, "fetch") == []
    assert sql_calls(connection, "execute") == []


@pytest.mark.asyncio
async def test_ensure_today_rejects_an_unachievable_target_without_leaving_membership_rows():
    created = {"challenge_id": "daily:2026-08-30"}
    connection = FakeConnection(fetchrows=[[{"course_id": "c1", "lesson_id": "l1"}]], fetchrow_results=[created])

    with pytest.raises(ValueError, match="published lessons"):
        await DailyChallengeRepository.ensure_today(
            connection, date(2026, 8, 30), "Daily focus", 2, []
        )

    assert sql_calls(connection, "execute") == []
    assert connection.calls[-1][0] == "transaction_exit"
    assert connection.calls[-1][2][0] is ValueError


@pytest.mark.asyncio
async def test_ensure_today_conflict_loser_re_reads_winner_without_reseeding_membership_or_reward():
    winner = {"challenge_id": "daily:2026-08-30", "title": "Winner", "target_lessons": 2}
    connection = StatefulConnection(
        published_lessons=[{"course_id": "c1", "lesson_id": "l1"}],
        concurrent_winner=winner,
    )

    result = await DailyChallengeRepository.ensure_today(
        connection, date(2026, 8, 30), "Daily focus", 2, []
    )

    assert result == winner
    assert connection.memberships == []
    assert connection.rewards == []
    assert not any(method == "fetch" for method, _, _ in connection.calls)


@pytest.mark.asyncio
async def test_ensure_today_rolls_back_the_new_definition_when_catalog_has_too_few_lessons():
    connection = StatefulConnection(published_lessons=[{"course_id": "c1", "lesson_id": "l1"}])

    with pytest.raises(ValueError, match="published lessons"):
        await DailyChallengeRepository.ensure_today(
            connection, date(2026, 8, 30), "Daily focus", 2, []
        )

    assert connection.challenge is None
    assert connection.memberships == []
    assert connection.rewards == []


@pytest.mark.asyncio
async def test_get_completion_joins_completed_lessons_inside_the_ho_chi_minh_product_day():
    completion = {"progress": 1, "target": 2, "completed_lesson_ids": ["l1"]}
    connection = FakeConnection(fetchrow_results=[completion])

    result = await DailyChallengeRepository.get_completion(
        connection, "user-1", "daily:2026-08-30", date(2026, 8, 30)
    )

    assert result == completion
    _, query, args = connection.calls[0]
    assert "JOIN public.user_course_lesson_progress AS progress" in query
    assert "progress.status='completed'" in query
    assert "progress.completed_at >= ($3::date::timestamp AT TIME ZONE $4)" in query
    assert "progress.completed_at < (($3::date + 1)::timestamp AT TIME ZONE $4)" in query
    assert args == ("user-1", "daily:2026-08-30", date(2026, 8, 30), PRODUCT_TIMEZONE)


@pytest.mark.asyncio
async def test_get_user_today_returns_the_users_challenge_snapshot():
    snapshot = {"challenge_id": "daily:2026-08-30", "progress": 1, "target": 2}
    connection = FakeConnection(fetchrow_results=[snapshot])

    result = await DailyChallengeRepository.get_user_today(connection, "user-1", date(2026, 8, 30))

    assert result == snapshot
    _, query, args = connection.calls[0]
    assert "FROM public.daily_challenges AS challenge" in query
    assert args == ("user-1", date(2026, 8, 30))


@pytest.mark.asyncio
async def test_get_rewards_loads_only_the_server_defined_reward_rows():
    reward = {"reward_type": "xp", "xp_amount": 50, "display_label": "50 XP"}
    connection = FakeConnection(fetchrows=[[reward]])

    result = await DailyChallengeRepository.get_rewards(connection, "daily:2026-08-30")

    assert result == [reward]
    _, query, args = connection.calls[0]
    assert "FROM public.daily_challenge_rewards" in query
    assert "WHERE challenge_id=$1" in query
    assert args == ("daily:2026-08-30",)


@pytest.mark.asyncio
async def test_get_claim_uses_the_unique_user_challenge_key():
    claim = {"claim_id": 1, "status": "processing"}
    connection = FakeConnection(fetchrow_results=[claim])

    result = await DailyChallengeRepository.get_claim(connection, "user-1", "daily:2026-08-30")

    assert result == claim
    _, query, args = connection.calls[0]
    assert "WHERE user_id=$1 AND challenge_id=$2" in query
    assert args == ("user-1", "daily:2026-08-30")


@pytest.mark.asyncio
async def test_lock_or_create_claim_locks_an_existing_claim_before_returning_it():
    existing = {"claim_id": 1, "status": "processing"}
    connection = FakeConnection(fetchrow_results=[existing])

    result = await DailyChallengeRepository.lock_or_create_claim(
        connection, "user-1", "daily:2026-08-30", "event-1", 2
    )

    assert result == existing
    assert len(connection.calls) == 1
    _, query, args = connection.calls[0]
    assert "SELECT * FROM public.daily_challenge_claims" in query
    assert "FOR UPDATE" in query
    assert args == ("user-1", "daily:2026-08-30")


@pytest.mark.asyncio
async def test_lock_or_create_claim_inserts_when_no_claim_is_locked():
    claim = {"claim_id": 2, "event_id": "event-1"}
    connection = FakeConnection(fetchrow_results=[None, claim])

    result = await DailyChallengeRepository.lock_or_create_claim(
        connection, "user-1", "daily:2026-08-30", "event-1", 2
    )

    assert result == claim
    _, query, args = connection.calls[1]
    assert "INSERT INTO public.daily_challenge_claims" in query
    assert "ON CONFLICT (user_id, challenge_id) DO NOTHING" in query
    assert args == ("user-1", "daily:2026-08-30", "event-1", 2)


@pytest.mark.asyncio
async def test_lock_or_create_claim_conflict_loser_relocks_the_winning_claim():
    winner = {"claim_id": 3, "user_id": "user-1", "challenge_id": "daily:2026-08-30"}
    connection = StatefulConnection(concurrent_claim=winner)

    result = await DailyChallengeRepository.lock_or_create_claim(
        connection, "user-1", "daily:2026-08-30", "event-1", 2
    )

    assert result == winner
    lock_queries = [query for method, query, _ in connection.calls if method == "fetchrow" and "FOR UPDATE" in query]
    assert len(lock_queries) == 2


@pytest.mark.asyncio
async def test_mark_claim_applied_persists_the_authoritative_outcome():
    applied = {"status": "applied", "xp_awarded": 50}
    connection = FakeConnection(fetchrow_results=[applied])

    result = await DailyChallengeRepository.mark_claim_applied(
        connection, "user-1", "daily:2026-08-30", {"xp_awarded": 50}
    )

    assert result == applied
    _, query, args = connection.calls[0]
    assert "SET status='applied'" in query
    assert "AND status='processing'" in query
    assert "grant_result=$3::jsonb" in query
    assert args[0:2] == ("user-1", "daily:2026-08-30")
