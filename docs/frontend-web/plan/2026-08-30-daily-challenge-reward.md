# Daily Challenge + Reward Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** Approved by the product owner on 2026-08-30; Tasks 1–3 local schema/repository/reward slices are GREEN. Supabase apply, API/UI work, and real-database verification remain pending.

**Goal:** Turn the current profile-derived Daily Challenge summary into a date-scoped, authenticated challenge with actionable lessons and a once-only reward claim that cannot double-award XP, badges, or pets.

**Architecture:** Additive PostgreSQL tables own challenge definitions, lesson membership, reward definitions, and per-user claim state. A backend Daily Challenge service recomputes completion from `user_course_lesson_progress`, then applies XP through the existing PostgreSQL gamification event ledger and grants badges/pets idempotently in the same transaction boundary. The frontend consumes one typed aggregate endpoint and renders locked, ready, claimed, loading, error, and date-rollover states without changing the legacy `profile.daily_challenge` response contract.

**Tech Stack:** FastAPI + asyncpg + PostgreSQL/Supabase SQL migrations; existing `user_gamification`, `gamification_events`, `pets`, and `user_unlocked_pets` contracts; React 18 + TypeScript + Vite + Vitest/Testing Library + Playwright; existing claymorphism utilities and Lexi mascot assets.

## Global Constraints

- PostgreSQL remains authoritative for challenge completion, XP, badge ownership, pet ownership, and claim state.
- The browser never submits authoritative XP amounts, badge IDs, pet IDs, progress counts, or user IDs for authorization decisions.
- The migration is additive: create new daily-challenge tables and indexes; do not alter, backfill, or delete existing `user_gamification`, `gamification_events`, `pets`, or `user_unlocked_pets` rows.
- Every XP grant uses a stable event ID and the existing unique `(user_id, event_id)` idempotency contract.
- A daily reward never automatically unlocks an XP-gated pet merely because XP increased; it only makes the pet eligible unless the reward definition explicitly contains a verified `pet_id`.
- An explicit pet reward reuses `user_unlocked_pets` with an idempotent insert; it never creates a second ownership table.
- Badge and pet grants are idempotent and are recorded in the claim outcome for auditability.
- The default reward is seeded only from verified catalog data. Do not invent a `mystery_badge` or pet ID that does not exist in the current catalog.
- Keep `profile.daily_challenge` backward-compatible for `/profile`; the dedicated page may use `/daily-challenge/today`.
- Keep React Native, Unity, AR/XR, and unrelated dirty files out of scope.
- Do not add new dependencies, Redis, queues, or direct frontend-to-database access.
- Use `Asia/Ho_Chi_Minh` as the initial product day boundary through an explicit backend setting; store timestamps as `TIMESTAMPTZ` and dates as `DATE`.
- Before applying a Supabase migration, verify the repository migration workflow, project status, advisor output, and RLS posture for every new `public` table; keep the FastAPI boundary authoritative for browser requests.
- No emoji-only UI icons on the touched Daily Challenge surface; use inline SVGs or existing Lexi assets.
- Mobile acceptance includes 320, 375, 390, 428, and 768 CSS pixels; desktop checks include 1280 and 1440 CSS pixels; no horizontal overflow is allowed.
- Preserve unrelated dirty changes. Stage only files named by the current task.
- Each task follows RED → GREEN → focused verification and ends with a scoped commit checkpoint.

## Approved domain contract

### Tables

The migration creates four tables:

```sql
CREATE TABLE IF NOT EXISTS public.daily_challenges (
    challenge_id TEXT PRIMARY KEY,
    challenge_date DATE NOT NULL UNIQUE,
    title TEXT NOT NULL,
    target_lessons INTEGER NOT NULL CHECK (target_lessons > 0),
    status TEXT NOT NULL DEFAULT 'published'
        CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_challenge_lessons (
    challenge_id TEXT NOT NULL
        REFERENCES public.daily_challenges(challenge_id) ON DELETE CASCADE,
    course_id TEXT NOT NULL
        REFERENCES public.courses(course_id) ON DELETE RESTRICT,
    lesson_id TEXT NOT NULL
        REFERENCES public.lessons(lesson_id) ON DELETE RESTRICT,
    position SMALLINT NOT NULL CHECK (position > 0),
    PRIMARY KEY (challenge_id, lesson_id),
    UNIQUE (challenge_id, position)
);

CREATE INDEX IF NOT EXISTS idx_daily_challenge_lessons_lesson
    ON public.daily_challenge_lessons (lesson_id, course_id);

CREATE TABLE IF NOT EXISTS public.daily_challenge_rewards (
    reward_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    challenge_id TEXT NOT NULL
        REFERENCES public.daily_challenges(challenge_id) ON DELETE CASCADE,
    reward_type TEXT NOT NULL
        CHECK (reward_type IN ('xp', 'badge', 'pet')),
    xp_amount INTEGER CHECK (xp_amount IS NULL OR xp_amount >= 0),
    badge_id TEXT,
    pet_id TEXT REFERENCES public.pets(pet_id) ON DELETE RESTRICT,
    display_label TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_daily_challenge_reward_type UNIQUE (challenge_id, reward_type),
    CONSTRAINT ck_daily_challenge_reward_payload CHECK (
        (reward_type = 'xp' AND xp_amount IS NOT NULL AND badge_id IS NULL AND pet_id IS NULL)
        OR (reward_type = 'badge' AND xp_amount IS NULL AND badge_id IS NOT NULL AND pet_id IS NULL)
        OR (reward_type = 'pet' AND xp_amount IS NULL AND badge_id IS NULL AND pet_id IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS public.daily_challenge_claims (
    claim_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    challenge_id TEXT NOT NULL
        REFERENCES public.daily_challenges(challenge_id) ON DELETE RESTRICT,
    event_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing'
        CHECK (status IN ('processing', 'applied', 'failed')),
    progress_at_claim INTEGER NOT NULL CHECK (progress_at_claim >= 0),
    xp_awarded INTEGER NOT NULL DEFAULT 0 CHECK (xp_awarded >= 0),
    badge_id TEXT,
    pet_id TEXT REFERENCES public.pets(pet_id) ON DELETE RESTRICT,
    grant_result JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    claimed_at TIMESTAMPTZ,
    UNIQUE (user_id, challenge_id),
    UNIQUE (user_id, event_id),
    CONSTRAINT ck_daily_challenge_claim_applied_at CHECK (
        status <> 'applied' OR claimed_at IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_daily_challenge_claims_user_recent
    ON public.daily_challenge_claims (user_id, created_at DESC);
```

`daily_challenge_rewards` is a definition table, not a balance or ownership table. `daily_challenge_claims` is the once-per-user-per-day state and audit snapshot. XP remains in `user_gamification` and `gamification_events`; pet ownership remains in `user_unlocked_pets`.

### API contract

`GET /api/v1/daily-challenge/today` requires `get_current_user` and returns:

```ts
type DailyReward = {
  reward_id: number;
  type: 'xp' | 'badge' | 'pet';
  label: string;
  xp_amount?: number;
  badge_id?: string;
  pet_id?: string;
};

type DailyChallengeToday = {
  challenge_id: string;
  challenge_date: string;
  title: string;
  progress: number;
  target: number;
  percent: number;
  state: 'locked' | 'ready' | 'claimed';
  lessons: Array<{
    course_id: string;
    lesson_id: string;
    title: string;
    topic: string;
    duration_minutes: number;
    href: string;
    completed: boolean;
  }>;
  rewards: DailyReward[];
  claimed_at: string | null;
};

type DailyClaimResult = {
  xp_awarded: number;
  badge_id: string | null;
  pet_id: string | null;
  idempotent_replay: boolean;
};
```

`POST /api/v1/daily-challenge/claim` has an empty request body and uses the authenticated user. It returns the same aggregate plus `claim_result` containing `xp_awarded`, `badge_id`, `pet_id`, and `idempotent_replay`. It returns `409` when progress is insufficient or another claim is currently processing, `404` when no published challenge exists for today, and `200` with the previous outcome for an already-applied deterministic claim.

### Reward invariants

1. The server calculates completion from the challenge lesson IDs and completed child progress rows; client progress is display-only.
2. The stable XP event ID is `daily_challenge:{challenge_id}`. The `(user_id, event_id)` uniqueness scope prevents cross-user collision and retry duplication.
3. XP is applied only once. A retry returns the stored event snapshot and never increments `user_gamification` again.
4. A badge reward calls the PostgreSQL idempotent badge grant. The daily claim path must not call the legacy badge method that can add badge XP outside the event ledger.
5. A pet reward inserts into `user_unlocked_pets` with `ON CONFLICT DO NOTHING`; existing XP/streak eligibility behavior remains unchanged.
6. All reward grants and the applied claim row commit in one PostgreSQL transaction. A failure rolls the entire claim back; a retry can safely re-run with the same event ID.

---

### Task 1: Freeze the contract and add the additive schema

**Files:**
- Read: `docs/frontend-web/spec/2026-08-30-daily-challenge-reward.md`
- Create: `backend/database/postgres/migrations/20260830_01_daily_challenge_rewards.sql`
- Create: `backend/database/orm_models/daily_challenge.py`
- Modify: `backend/database/orm_models/__init__.py`
- Test: `backend/tests/test_daily_challenge_schema.py`

**Interfaces:**
- Produces the table names, constraints, indexes, and SQLAlchemy metadata used by the repository and later migration checks.
- Does not modify any existing gamification or pet table.

- [x] **Step 1: Write failing schema tests**

Assert that the migration contains all four table names, all uniqueness constraints, the reward payload check, the pet foreign keys, `TIMESTAMPTZ` audit fields, and no destructive statement (`DROP TABLE`, `TRUNCATE`, or `DELETE FROM`). Assert that `database.orm_models` exposes `DailyChallengeORM`, `DailyChallengeLessonORM`, `DailyChallengeRewardORM`, and `DailyChallengeClaimORM`.

- [x] **Step 2: Run RED**

Run from `backend/`:

```powershell
python -m pytest tests/test_daily_challenge_schema.py -v
```

Expected: collection or assertion failure because the migration and ORM models do not exist.

- [x] **Step 3: Add the SQL and typed ORM mappings**

Use the approved SQL contract above. The ORM classes must use `String`, `Integer`/`SmallInteger`, `Text`, `Boolean` only where needed, `JSONB` for `grant_result`, `DateTime(timezone=True)` for timestamps, and `UniqueConstraint`/`CheckConstraint` names matching the SQL. Mark the existing Supabase-owned style with `info={"alembic_managed": False}` if the module is imported by Alembic.

- [ ] **Step 4: Verify the Supabase migration boundary**

Inspect the repository's configured migration workflow before applying SQL. Run the available project-status and advisor checks, review RLS for each new `public` table against the existing policy, and record the result in `docs/frontend-web/progress/2026-08-30-daily-challenge-reward.md`. Do not give the browser a direct database path.

- [x] **Step 5: Run GREEN and metadata checks**

Run:

```powershell
python -m pytest tests/test_daily_challenge_schema.py -v
python -c "import database.orm_models; from database.orm_models.daily_challenge import DailyChallengeORM, DailyChallengeClaimORM; print(DailyChallengeORM.__tablename__, DailyChallengeClaimORM.__tablename__)"
```

Expected: schema tests pass and the four table mappings import without connecting to the database.

- [x] **Step 6: Commit the schema slice in the approved Daily Challenge commit**

```powershell
git add docs/frontend-web/spec/2026-08-30-daily-challenge-reward.md docs/frontend-web/plan/2026-08-30-daily-challenge-reward.md backend/database/postgres/migrations/20260830_01_daily_challenge_rewards.sql backend/database/orm_models/daily_challenge.py backend/database/orm_models/__init__.py backend/tests/test_daily_challenge_schema.py
git commit -m "feat(daily-challenge): add challenge and reward ledger schema"
```

---

### Task 2: Implement the challenge and claim repository

**Files:**
- Create: `backend/repositories/daily_challenge_repository.py`
- Modify: `backend/settings.py`
- Test: `backend/tests/test_daily_challenge_repository.py`

**Interfaces:**
- `DailyChallengeRepository.get_today(connection, challenge_date) -> dict | None`
- `DailyChallengeRepository.ensure_today(connection, challenge_date, title, target_lessons, lessons) -> dict`
- `DailyChallengeRepository.get_user_today(connection, user_id, challenge_date) -> dict`
- `DailyChallengeRepository.get_completion(connection, user_id, challenge_id, challenge_date) -> dict`
- `DailyChallengeRepository.lock_or_create_claim(connection, user_id, challenge_id, event_id, progress) -> dict`
- `DailyChallengeRepository.mark_claim_applied(connection, user_id, challenge_id, outcome) -> dict`
- `DailyChallengeRepository.get_claim(connection, user_id, challenge_id) -> dict | None`

- [x] **Step 1: Write repository tests with a fake asyncpg connection**

Cover: stable date lookup, deterministic `ensure_today` with `ON CONFLICT`, lesson ordering by `position`, completed lesson join by `status='completed'` and `completed_at` in the configured product timezone, unique claim lookup, and `SELECT ... FOR UPDATE` for an existing claim. The stateful fake must also prove a losing definition/claim creation race re-reads the winner and a failed definition seed rolls back its local transaction state.

- [x] **Step 2: Run RED**

Run `python -m pytest tests/test_daily_challenge_repository.py -v` from `backend/`. Expected: missing module/class failures.

- [x] **Step 3: Implement the repository with parameterized asyncpg SQL**

The completion query must join `daily_challenge_lessons` to `user_course_lesson_progress` by `user_id`, `course_id`, and `lesson_id`; count distinct challenge lessons; and compare `completed_at` against the explicit `Asia/Ho_Chi_Minh` day window. It must return `progress`, `target`, and `completed_lesson_ids` from the server. Never use a client-supplied progress value.

`ensure_today` must create the deterministic ID `daily:{YYYY-MM-DD}`, select stable published lessons ordered by `course_id`, `lesson_order`, and `lesson_id`, limit to `target_lessons`, and be safe when two requests create the same date concurrently.

The timezone is bound from `settings.DAILY_CHALLENGE_TIMEZONE` (default `Asia/Ho_Chi_Minh`), rather than embedded as a SQL literal. Definition seeding creates the `50 XP` reward row only; it does not mutate user XP, pet ownership, badge ownership, or claim state.

- [x] **Step 4: Run GREEN**

Run `python -m pytest tests/test_daily_challenge_repository.py -v`. Expected: all repository tests pass.

- [x] **Step 5: Commit after product-owner review**

```powershell
git add backend/settings.py backend/repositories/daily_challenge_repository.py backend/tests/test_daily_challenge_repository.py
git commit -m "feat(daily-challenge): add challenge and claim repository"
```

---

### Task 3: Make XP, badge, and pet grants transaction-safe and idempotent

**Files:**
- Create: `backend/services/daily_reward_service.py`
- Modify: `backend/services/postgres_gamification_service.py`
- Modify: `backend/repositories/postgres_user_repository.py`
- Modify: `backend/repositories/daily_challenge_repository.py`
- Test: `backend/tests/test_daily_reward_service.py`
- Test: `backend/tests/test_gamification_idempotency.py` (append regression cases only)

**Interfaces:**
- `DailyRewardService.claim_today(user_id: str, now: datetime | None = None) -> DailyClaimResult`
- `DailyClaimResult` is a frozen dataclass with `status: Literal["applied", "claimed", "locked"]`, `xp_awarded: int`, `badge_id: str | None`, `pet_id: str | None`, and `idempotent_replay: bool`.
- `DailyRewardGrantError(RuntimeError)` is raised only when the transaction must roll back; the API maps it to a stable `409` or `500` response according to the failure type.
- Internal `PostgresGamificationService.apply_xp_event(connection, *, user_id, event_id, action, xp_amount, metadata) -> dict`
- Internal `PostgresUserRepository.grant_pet_on_connection(connection, user_id, pet_id) -> bool`

- [x] **Step 1: Write RED tests before changing reward code**

The tests must prove the following concrete outcomes:

```python
async def test_same_daily_claim_awards_xp_once(fake_service):
    first = await fake_service.claim_today("user-1")
    replay = await fake_service.claim_today("user-1")
    assert first.xp_awarded == 50
    assert replay.idempotent_replay is True
    assert fake_service.grant_call_count == 1

async def test_concurrent_daily_claim_has_one_applied_outcome(fake_service):
    results = await asyncio.gather(
        fake_service.claim_today("user-1"),
        fake_service.claim_today("user-1"),
    )
    assert sum(result.status == "applied" for result in results) == 1
    assert fake_service.grant_call_count == 1

async def test_failed_pet_grant_rolls_back_claim_and_xp(failing_pet_service):
    with pytest.raises(DailyRewardGrantError):
        await failing_pet_service.claim_today("user-1")
    assert failing_pet_service.claim_row_status is None
    assert failing_pet_service.xp_balance == 0

async def test_explicit_pet_reward_is_idempotent(pet_reward_service):
    first = await pet_reward_service.claim_today("user-1")
    replay = await pet_reward_service.claim_today("user-1")
    assert first.pet_id == "pet-fox"
    assert replay.idempotent_replay is True
    assert pet_reward_service.pet_insert_count == 1

async def test_xp_reward_does_not_auto_unlock_xp_gated_pet(xp_reward_service):
    await xp_reward_service.claim_today("user-1")
    assert xp_reward_service.unlocked_pet_ids == []
    assert xp_reward_service.can_unlock("pet-fox") is True

async def test_badge_reward_does_not_add_untracked_bonus_xp(badge_reward_service):
    before = badge_reward_service.xp_balance
    await badge_reward_service.claim_today("user-1")
    assert badge_reward_service.xp_balance == before
    assert badge_reward_service.badge_ids == ["first_scan"]
```

Use a fake connection that records transaction statements and a fake repository/grant catalog. The tests must assert that the same event ID is reused on retry and that the client cannot select the grant amount or pet.

- [x] **Step 2: Run RED**

Run:

```powershell
python -m pytest tests/test_daily_reward_service.py tests/test_gamification_idempotency.py -v
```

Expected: the new service/helper tests fail while the existing idempotency tests remain the baseline to preserve.

- [x] **Step 3: Extract a transaction-aware XP helper**

Refactor the PostgreSQL implementation so its public `add_xp_with_event_id()` keeps its current behavior, but delegates the actual insert/lock/aggregate/update/event snapshot work to a helper that accepts an existing asyncpg connection and a server-supplied `xp_amount`. The public endpoint continues to resolve XP from `XP_REWARDS[action]`; only the daily reward service can pass the validated amount read from `daily_challenge_rewards`.

The helper must retain:

```python
event_id = event_id.strip()
ON CONFLICT (user_id, event_id) DO NOTHING
SELECT ... FOR UPDATE
status = 'applied'
UPDATE user_gamification only after the event is owned by this transaction
```

Do not call the public service method from inside the daily claim transaction because it opens a second transaction.

- [x] **Step 4: Implement the daily claim orchestration**

Inside one `async with pool.acquire()` and `async with connection.transaction()` block:

1. Load today’s published challenge and rewards.
2. Recompute completion and reject insufficient progress.
3. Lock or create the `(user_id, challenge_id)` claim row.
4. Apply the XP reward through the transaction-aware helper using `daily_challenge:{challenge_id}`.
5. Grant a verified badge through the PostgreSQL idempotent badge path without badge bonus XP.
6. Grant a verified pet through `user_unlocked_pets ... ON CONFLICT DO NOTHING` only when the reward row explicitly contains `pet_id`.
7. Persist the actual XP/badge/pet outcome and set `status='applied'`, `claimed_at=now()`.
8. Return the aggregate response and the replay flag.

The default challenge seed has only the verified `50 XP` reward until a real badge ID is selected from `BADGE_DEFINITIONS`; it must not fabricate `mystery_badge`.

- [x] **Step 5: Run GREEN and the existing reward suite**

Run:

```powershell
python -m pytest tests/test_daily_reward_service.py tests/test_gamification_idempotency.py -v
```

Expected: all new tests and all existing idempotency tests pass.

- [x] **Step 6: Commit the approved local slices**

```powershell
git add backend/services/daily_reward_service.py backend/services/postgres_gamification_service.py backend/repositories/postgres_user_repository.py backend/repositories/daily_challenge_repository.py backend/tests/test_daily_reward_service.py backend/tests/test_gamification_idempotency.py backend/tests/test_daily_challenge_repository.py
git commit -m "feat(daily-challenge): add idempotent reward claims"
```

---

### Task 4: Add authenticated Daily Challenge API without breaking profile

**Files:**
- Create: `backend/api/daily_challenge.py`
- Create: `backend/models/daily_challenge.py`
- Modify: `backend/api/__init__.py`
- Modify: `backend/main.py`
- Test: `backend/tests/test_daily_challenge_api.py`

**Interfaces:**
- `GET /api/v1/daily-challenge/today`
- `POST /api/v1/daily-challenge/claim`
- Both routes use `get_current_user` and never accept a user ID for authorization.

- [ ] **Step 1: Write API tests**

Cover unauthenticated `401`, empty-day `404`, locked response, ready response, successful claim, already-claimed replay, insufficient-progress `409`, and pet reward response. Override `get_current_user`, the repository, and `DailyRewardService` using the existing `TestClient(main.app)` pattern.

- [ ] **Step 2: Run RED**

Run `python -m pytest tests/test_daily_challenge_api.py -v` from `backend/`. Expected: route/model import failures.

- [ ] **Step 3: Implement typed models and router**

The router converts the service result to the exact `DailyChallengeToday` contract above. Error messages are stable enough for frontend fallback, while authoritative state remains in the service. Register the router under `/api/v1` and keep `/api/v1/profile/me` unchanged.

- [ ] **Step 4: Run GREEN**

Run `python -m pytest tests/test_daily_challenge_api.py -v`. Expected: all API cases pass.

- [ ] **Step 5: Commit**

```powershell
git add backend/api/daily_challenge.py backend/models/daily_challenge.py backend/api/__init__.py backend/main.py backend/tests/test_daily_challenge_api.py
git commit -m "feat(daily-challenge): expose authenticated challenge endpoints"
```

---

### Task 5: Wire the frontend to the new contract and render truthful reward states

**Files:**
- Modify: `frontend/src/services/apiClient.ts`
- Modify: `frontend/src/pages/DailyChallengePage.tsx`
- Modify: `frontend/src/styles/claymorphic-utilities.css`
- Modify: `frontend/src/__tests__/DailyChallengePage.test.tsx`

**Interfaces:**
- `apiClient.getDailyChallengeToday(): Promise<DailyChallengeToday>`
- `apiClient.claimDailyChallenge(): Promise<DailyChallengeToday & { claim_result: DailyClaimResult }>`

- [ ] **Step 1: Replace presentation-only mocks with failing state tests**

Add tests for:

```tsx
expect(screen.getByText(/Today's Lessons/i)).toBeInTheDocument();
expect(screen.getAllByRole('link', { name: /Start/i })).toHaveLength(3);
expect(screen.getByRole('button', { name: /Claim Reward/i })).toBeDisabled();
expect(screen.getByRole('button', { name: /Claim Reward/i })).toBeEnabled();
await user.click(screen.getByRole('button', { name: /Claim Reward/i }));
expect(apiClient.claimDailyChallenge).toHaveBeenCalledTimes(1);
expect(screen.getByText(/Claimed today/i)).toBeInTheDocument();
```

Also test API errors, reward preview fallback, progress clamping to `0..100`,
no false `Claimed` text when state is only `ready`, exactly one initial
aggregate request, coalescing of paired `focus`/`visibilitychange` events,
stale-response protection, and unmount cancellation/invalidation.

- [ ] **Step 2: Run RED**

Run from `frontend/`:

```powershell
npm.cmd test -- --run src/__tests__/DailyChallengePage.test.tsx
```

Expected: new contract tests fail because the page only consumes `getMyProfile()`.

- [ ] **Step 3: Add typed client methods**

Use `GET /api/v1/daily-challenge/today` and `POST /api/v1/daily-challenge/claim` with automatic auth headers. Do not send `user_id`, XP, reward IDs, or progress from the browser.

- [ ] **Step 4: Implement page state machine**

Use server `state` as the source of truth:

```tsx
locked  -> disabled claim button + “Complete today’s lessons to unlock”
ready   -> enabled claim button + pending/error handling
claimed -> non-interactive “Claimed today” badge
```

Render lesson rows with course/lesson links, completion checkmarks, duration, and `Start` labels. Fetch exactly once on mount and refetch on `window.focus`/`visibilitychange` through a shared single-flight loader. Coalesce paired events, prevent parallel duplicate requests, invalidate stale responses with a request sequence, and cancel or invalidate the loader on unmount before applying state. Keep the last truthful state while a background refetch is pending. Show a mobile sticky claim bar only in `ready` state.

- [ ] **Step 5: Apply responsive claymorphism hardening**

Keep the vibrant clay visual language but use fluid `clamp()` sizing, `min-width: 0`, a stacked mobile layout, `max-width: 100%`, safe-area bottom padding, 48px touch targets, visible focus rings, and reduced-motion fallbacks. Replace touched emoji-only icons with inline SVG/Lexi. Ensure reward copy comes from typed reward rows and displays actual `xp_awarded` after claim.

- [ ] **Step 6: Run GREEN**

Run:

```powershell
npm.cmd test -- --run src/__tests__/DailyChallengePage.test.tsx
npm.cmd run build
```

Expected: focused tests and build pass; existing non-blocking Vite dependency/chunk warnings may remain.

- [ ] **Step 7: Commit**

```powershell
git add frontend/src/services/apiClient.ts frontend/src/pages/DailyChallengePage.tsx frontend/src/styles/claymorphic-utilities.css frontend/src/__tests__/DailyChallengePage.test.tsx
git commit -m "feat(daily-challenge): render lessons and truthful reward states"
```

---

### Task 6: Repair authenticated E2E coverage and verify responsive behavior

**Files:**
- Modify: `frontend/tests/e2e/daily-challenge.spec.ts`
- Create: `frontend/tests/e2e/fixtures/auth.ts` when the existing reusable fixture cannot seed authenticated storage
- Test artifacts: do not commit `frontend/playwright-report/**` or `frontend/test-results/**`

**Interfaces:**
- Authenticated fixture seeds `authToken` and `authUser` with a non-expired test JWT payload, mocks `/api/v1/auth/me`, `/api/v1/daily-challenge/today`, and the claim endpoint.
- A separate guest test keeps `guestMode=true` and expects `/login`; guest mode must not be used by authenticated tests.

- [ ] **Step 1: Rewrite the fixture and add behavioral cases**

Cover: authenticated route access, guest redirect, three lessons, Start navigation, locked claim, ready claim, successful claim, replayed claimed state, API error/retry, coalesced focus/visibility refetch, no horizontal overflow, and one aggregate request per load transition.

- [ ] **Step 2: Run RED against the current implementation**

Run from `frontend/`:

```powershell
npm.cmd run test:e2e -- tests/e2e/daily-challenge.spec.ts --project=chromium
```

Expected: the new authenticated data-state tests fail until Tasks 4–5 are implemented; the guest redirect case should pass against the current `RequireUserAuth`.

- [ ] **Step 3: Run the mobile/desktop matrix**

Use Playwright contexts at widths `320`, `375`, `390`, `428`, `768`, `1280`, and `1440`. Assert:

```ts
expect(await page.locator('body').evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
await expect(page.getByRole('heading', { name: /Daily Challenge/i })).toBeVisible();
const claim = page.getByRole('button', { name: /Claim Reward/i });
const viewport = page.viewportSize()!;
const claimBox = await claim.boundingBox();
expect(claimBox?.height ?? 0).toBeGreaterThanOrEqual(44);
expect(claimBox?.x ?? -1).toBeGreaterThanOrEqual(0);
expect((claimBox?.x ?? -1) + (claimBox?.width ?? 0)).toBeLessThanOrEqual( viewport.width );
await page.keyboard.press('Tab');
await expect(page.locator(':focus-visible')).toBeVisible();
await page.emulateMedia({ reducedMotion: 'reduce' });
```

Also give the sticky claim surface a stable `data-testid="daily-challenge-claim-bar"`
and assert that it remains inside the viewport, has at least the base
safe-area padding contract (`padding-bottom >= 16px`), and does not cover lesson
links. Count `/daily-challenge/today` requests and assert one request on mount
and one request maximum for a paired focus/visibility return, with no overlapping
requests. Capture screenshots and request traces only for review; keep them
outside the commit.

- [ ] **Step 4: Run GREEN**

Run:

```powershell
npm.cmd run test:e2e -- tests/e2e/daily-challenge.spec.ts --project=chromium
npm.cmd run test:e2e -- tests/e2e/daily-challenge.spec.ts --project="Mobile Safari"
```

Expected: all Daily Challenge E2E cases pass. If the real backend is not available, label the result `RUNTIME_VERIFIED` against the controlled Playwright API fixture, not production.

- [ ] **Step 5: Complete the real-device browser gate**

Run the deployed or HTTPS preview build on one Safari iOS device and one Chrome
Android device. Record device model, OS, browser version, viewport, build/URL,
date, claim-flow screenshots or video, and network/performance trace locations
in the progress log. If either device is unavailable, leave
`DEVICE_BROWSER_VERIFIED` open rather than claiming completion. Playwright
emulation remains a separate result.

- [ ] **Step 6: Commit**

```powershell
git add frontend/tests/e2e/daily-challenge.spec.ts frontend/tests/e2e/fixtures/auth.ts
git commit -m "test(daily-challenge): cover authenticated claim flow and responsive states"
```

---

### Task 7: Run release gates and record evidence

**Files:**
- Modify: `docs/frontend-web/progress/2026-08-30-daily-challenge-reward.md`
- Read: `docs/frontend-web/spec/2026-08-30-daily-challenge-reward.md`
- Read: `docs/superpowers/specs/2026-08-24-daily-challenge-page-design.md`

- [ ] **Step 1: Run backend focused gates**

```powershell
Set-Location -LiteralPath 'backend'
python -m pytest tests/test_daily_challenge_schema.py tests/test_daily_challenge_repository.py tests/test_daily_reward_service.py tests/test_daily_challenge_api.py tests/test_gamification_idempotency.py -v
```

Record pass/fail counts and any environment-only failures.

- [ ] **Step 2: Run frontend gates**

```powershell
Set-Location -LiteralPath 'frontend'
npm.cmd test -- --run src/__tests__/DailyChallengePage.test.tsx
npm.cmd run build
npm.cmd run lint -- --quiet
git diff --check
```

- [ ] **Step 3: Inspect migration and reward invariants**

```powershell
rg -n "DROP TABLE|TRUNCATE|DELETE FROM|daily_challenge|event_id|user_unlocked_pets|xp_amount" backend/database/postgres/migrations/20260830_01_daily_challenge_rewards.sql backend/services/daily_reward_service.py backend/services/postgres_gamification_service.py
```

Confirm that no daily claim path directly accepts client reward amounts, no default pet is fabricated, and no duplicate ownership table exists.

- [ ] **Step 4: Update progress evidence**

Record `CODE_VERIFIED`, `RUNTIME_VERIFIED`, or `DEVICE_BROWSER_VERIFIED` separately. Include exact commands, frontend/backend/browser versions, workspace/commit state, warning inventory, test counts, trace/screenshot artifact locations, and any environment-only failure. State explicitly that a responsive Playwright emulation is not a real-device verification.

- [ ] **Step 5: Collect performance evidence**

Against the production frontend build, capture one Lighthouse or DevTools
performance run, the Daily Challenge network request timing, and a React
Profiler or equivalent render trace for initial mount and focus/visibility
refetch. Record LCP, INP, CLS, long tasks, request count, and whether any new
warning or regression is attributable to the touched surface.

- [ ] **Step 6: Final scoped status review**

```powershell
git status --short
git diff --stat
git diff --cached --stat
```

Unrelated `.opencode/**`, `opencode.json`, `frontend/public/ar-xr.html`, and user-provided images must remain unstaged.

---

## Self-review checklist before execution

- The current profile summary remains backward-compatible.
- A user cannot claim before server-computed completion.
- A retry cannot create a second XP event.
- A badge cannot add untracked bonus XP.
- An XP reward cannot auto-unlock an XP-gated pet.
- An explicit pet reward can only grant the catalog pet once.
- A transaction failure leaves no applied claim and no partial reward.
- The default “Mystery Badge” copy is not presented unless a real badge ID is configured.
- Locked, ready, claimed, loading, error, and empty-day UI states are covered.
- Authenticated and guest E2E fixtures are separate.
- Mobile widths have no horizontal overflow and claim controls meet touch-target requirements.
- No database or feature code is changed until this plan is accepted for execution.
