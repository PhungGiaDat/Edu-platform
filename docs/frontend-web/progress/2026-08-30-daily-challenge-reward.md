# Daily Challenge + Reward Ledger Progress

**Date:** 2026-08-30
**Status:** `IN_PROGRESS / TASK 3 GREEN; SCOPED LOCAL COMMIT`
**Scope:** Daily Challenge implementation; schema, repository, and reward service are local only. The migration has not been applied to Supabase.
**Specification:** [Daily Challenge + Reward Ledger](../spec/2026-08-30-daily-challenge-reward.md)
**Implementation plan:** [Daily Challenge + Reward Ledger](../plan/2026-08-30-daily-challenge-reward.md)

## Decision recorded

The feature will use four dedicated PostgreSQL tables:

- `daily_challenges` for the date-scoped published definition;
- `daily_challenge_lessons` for ordered lesson membership;
- `daily_challenge_rewards` for typed reward definitions; and
- `daily_challenge_claims` for one claim per learner/challenge, idempotency,
  transaction outcome, and audit timestamps.

The first seed is `50 XP` only. XP is processed through the existing
`gamification_events` idempotency boundary. XP does not auto-unlock an XP-gated
pet. A pet is unlocked only when a verified reward definition explicitly names a
pet and the grant uses the existing `user_unlocked_pets` table. Badge grants do
not add hidden XP.

## Discovery evidence

The current implementation was audited before this documentation baseline was
written:

- `frontend/src/pages/DailyChallengePage.tsx` reads the legacy profile summary,
  does not identify a challenge date or challenge ID, and treats completion as
  if it were a claim.
- `backend/services/profile_service.py` derives the current summary from lesson
  progress and `profile_content`; it does not provide a dedicated claim state.
- The frontend has legacy daily methods in `frontend/src/services/apiClient.ts`,
  but matching backend daily routes were not found in the current API surface.
- `gamification_events` already provides the unique `(user_id, event_id)`
  idempotency boundary, and `user_unlocked_pets` is the existing pet ownership
  table.
- The legacy badge path can add badge XP outside the PostgreSQL event ledger;
  the new claim path therefore requires the PostgreSQL idempotent badge path.
- No verified `mystery_badge` catalog entry was found, so the reward seed does
  not invent one.

## Baseline verification evidence

These results describe the pre-implementation baseline, not completion of the
new feature:

| Check | Result | Interpretation |
|---|---|---|
| Existing Daily Challenge page unit tests | `17/17` passed | Existing presentation tests pass; they do not prove the new API contract |
| Frontend production build | Passed with existing warnings | Build is usable as a baseline; Three.js/chunk warnings remain outside this feature |
| Daily Challenge Playwright run | `1` passed, `12` failed | Fixture runs guest mode while scenarios expect authenticated content and redirects to Login |
| Backend profile test collection | Blocked | Existing stale import references `UserResponse` from `models.user_mongo`; the class is in `models.user_schemas` |

No `CODE_VERIFIED`, `RUNTIME_VERIFIED`, or `DEVICE_BROWSER_VERIFIED` claim is
made for the new Daily Challenge + Reward Ledger.

## Execution gates

Before implementation is marked started:

1. Review the spec and plan together and preserve the legacy profile contract.
2. Verify the repository's Supabase migration workflow, project status, and
   advisor checks before applying any database migration.
3. Confirm the authenticated test fixture and backend dependency overrides for
   API/service tests; guest-mode redirects cannot validate the claim flow.
4. Add real database coverage for unique claims, event idempotency, rollback,
   and concurrent claim behavior.
5. Confirm any future badge or pet reward ID against the live catalog before
   publishing a seed.

## Append-only implementation log

### 2026-08-30 — Documentation baseline

- Added the approved product/API/persistence contract in `spec/`.
- Kept the executable task sequence in `plan/` and aligned it to the spec.
- Recorded discovery and pre-implementation test evidence here.
- No backend/frontend source, SQL migration, Supabase state, or user data was
  changed.

### 2026-08-30 — Performance review follow-up

- The review-only `performance-optimizer` pass found that focus and
  `visibilitychange` refetch requirements were not operationalized enough.
- The spec and plan now require a shared single-flight loader, event
  coalescing, stale-response protection, unmount cancellation/invalidation,
  and one aggregate request per load transition.
- The responsive matrix now covers target dimensions, viewport containment,
  focus visibility, reduced motion, sticky claim/safe-area behavior, and lesson
  overlap rather than only body overflow and heading visibility.
- The runtime/device gate now requires exact commands and environment details,
  device/browser evidence, request traces, and Lighthouse/DevTools plus React
  render evidence.
- Those review changes were documentation-only; the feature now has a local
  schema slice, while the remaining service/API/frontend work has no new
  verification status yet.

### 2026-08-30 — Task 1 schema slice

- Added `backend/database/postgres/migrations/20260830_01_daily_challenge_rewards.sql`
  with the four additive Daily Challenge tables, foreign keys, checks, unique
  constraints, and indexes.
- Added `backend/database/orm_models/daily_challenge.py` and exported the four
  mappings from `database.orm_models`.
- Added `backend/tests/test_daily_challenge_schema.py` with migration safety,
  reward/claim invariant, and ORM export checks.
- RED evidence: `3 failed` because the migration and ORM module did not exist.
- GREEN evidence: `Set-Location backend; python -m pytest tests/test_daily_challenge_schema.py -v`
  => `3 passed, 1 PytestCacheWarning`.
- The warning is an environment permission issue writing the existing
  `backend/.pytest_cache`; it is not a schema test failure.
- The migration has not been applied to any Supabase/database environment and
  no commit has been created. Supabase project-status/advisor/RLS review remains
  open for the next checkpoint.

### 2026-08-30 — Task 2 repository slice

- Added `backend/repositories/daily_challenge_repository.py` with parameterized
  asyncpg persistence for date lookup, deterministic challenge definition,
  server-computed completion, and row-locked claim creation/finalization.
- Added `DAILY_CHALLENGE_TIMEZONE` to `backend/settings.py`; the default is
  `Asia/Ho_Chi_Minh` and the completion window binds that setting as a SQL
  parameter instead of hard-coding a timezone literal.
- Added `backend/tests/test_daily_challenge_repository.py`. Its stateful fake
  covers definition and claim creation races plus rollback when the published
  catalog cannot satisfy the target; it does not connect to a database.
- The seed creates only the `50 XP` *definition*. It does not award user XP,
  claim a reward, unlock a pet, or grant a badge. Those mutations remain Task 3.
- RED evidence: repository test collection failed before the repository module
  existed.
- GREEN evidence: `Set-Location backend; python -m pytest
  tests/test_daily_challenge_schema.py tests/test_daily_challenge_repository.py
  -v` => `16 passed, 1 PytestCacheWarning`; the warning is the existing
  `backend/.pytest_cache` permission problem, not a test failure.
- Import evidence: `python -c "import database.orm_models; from
  repositories.daily_challenge_repository import DailyChallengeRepository;
  print(DailyChallengeRepository.__name__)"` => `DailyChallengeRepository`.
- This is `CODE_VERIFIED` repository coverage only. No Supabase migration has
  been applied, no real database transaction/API/browser check has run, and no
  commit has been created.

### 2026-08-30 — Task 3 scoped onboarding synthesis

- Persistence: `postgres_pool()` acquires an asyncpg connection with statement
  caching disabled for Supabase transaction pooling; Daily Challenge must keep
  claim, XP event, aggregate, badge, pet, and applied claim in one connection
  transaction.
- Gamification: `gamification_events` already has the authoritative unique
  `(user_id, event_id)` contract. Its public method resolves legacy actions
  from `XP_REWARDS`, so the daily path needs a separate connection-bound helper
  that accepts only a server-loaded reward definition.
- Ownership: badge IDs must be verified against `BADGE_DEFINITIONS`; explicit
  pets belong in `user_unlocked_pets` with `ON CONFLICT DO NOTHING`. Neither
  path may infer a pet reward from new XP.
- API/auth: protected FastAPI routes consistently use `get_current_user`; the
  authenticated GET/claim routes are deferred to Task 4.
- Operations: Supabase migration apply, deployment, CI/CD changes, and new Git
  branches are out of this approved slice and were not performed.

### 2026-08-30 — Task 3 transaction-safe reward slice

- Added `backend/services/daily_reward_service.py`. It derives the product date
  from the configured timezone, recomputes progress, reads only server-defined
  reward rows, and completes claim/XP/badge/pet state in one transaction.
- Added `PostgresGamificationService.apply_xp_event(connection, ...)`; the
  existing public API continues to resolve XP from `XP_REWARDS`, while Daily
  Challenge passes the validated `daily_challenge_rewards.xp_amount`.
- Added connection-bound, idempotent badge and pet grant helpers. The badge
  helper does not award bonus XP; the pet helper runs only for an explicit
  `pet_id` reward row.
- Added a Windows-safe product-date fallback for the fixed `Asia/Ho_Chi_Minh`
  UTC+07 contract when the IANA timezone database is unavailable. Any future
  configured timezone still fails explicitly rather than silently using UTC.
- RED evidence: `python -m pytest tests/test_daily_reward_service.py -v`
  initially failed collection because `services.daily_reward_service` did not
  exist.
- GREEN evidence: `python -m pytest tests/test_daily_challenge_schema.py
  tests/test_daily_challenge_repository.py tests/test_daily_reward_service.py
  tests/test_gamification_idempotency.py -v` => `49 passed,
  1 PytestCacheWarning`; `python -m pytest
  tests/test_completion_transaction_boundary.py -v` => `2 passed,
  1 PytestCacheWarning`; `python -m compileall -q` for the four touched
  backend modules completed without output.
- The cache warning is the existing `backend/.pytest_cache` permissions issue.
  No migration, Supabase data, API route, frontend/browser surface, deploy, or
  new Git branch was changed in this task.
