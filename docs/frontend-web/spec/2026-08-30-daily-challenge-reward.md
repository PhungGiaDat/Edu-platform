# Daily Challenge + Reward Ledger Specification

**Status:** Approved for implementation planning on 2026-08-30
**Owner:** Frontend web + backend gamification
**Canonical surface:** `frontend/` with FastAPI as the only client-facing data boundary
**Related plan:** [Daily Challenge + Reward Ledger Implementation Plan](../plan/2026-08-30-daily-challenge-reward.md)
**Progress log:** [Daily Challenge + Reward Ledger Progress](../progress/2026-08-30-daily-challenge-reward.md)

## 1. Purpose

The current Daily Challenge page derives a summary from the profile response. It
does not identify the published challenge for a product day, expose the lesson
set, distinguish completion from reward claim, or provide an authoritative
once-only reward operation.

This specification defines a small, additive Daily Challenge contract that:

- publishes one challenge for a product day;
- shows the exact lessons and server-computed completion state;
- lets an authenticated learner claim the reward once;
- makes XP, badge, and explicit pet rewards idempotent and auditable; and
- keeps the existing `/profile` and `profile.daily_challenge` contract intact.

The feature is designed for the graduation mobile-web release. React Native,
Unity, AR/XR, and direct browser-to-database access are outside this scope.

## 2. Product contract

### 2.1 Audience and access

- Only an authenticated learner can read or claim a Daily Challenge.
- The browser never supplies `user_id`, authoritative progress, XP amounts,
  badge IDs, or pet IDs for an authorization decision.
- The initial product-day timezone is `Asia/Ho_Chi_Minh`. The backend owns the
  conversion from an instant to `challenge_date`.
- A missing published challenge is a normal `404` state, not an empty success
  response that looks like a completed challenge.

### 2.2 States

| State | Server condition | Learner-facing behavior |
|---|---|---|
| `locked` | The published challenge exists, but completed challenge lessons are below `target` | Show progress, lesson links, rewards preview, and a disabled claim button |
| `ready` | Completed challenge lessons meet `target` and no applied claim exists | Show an enabled claim button and a clear “ready to claim” message |
| `claimed` | An applied claim exists for this user and challenge | Show the stored outcome, claim timestamp, and a disabled “claimed today” state |

Completion is derived from the challenge lesson IDs and the learner's existing
`user_course_lesson_progress` rows. The client may display progress but cannot
declare completion.

### 2.3 Reward policy

- The initial seed contains only a verified `50 XP` reward.
- Do not display or seed a fabricated `mystery_badge` or unknown pet ID.
- A badge reward is allowed only when its ID exists in the verified badge
  catalog. Badge ownership is idempotent and does not add hidden bonus XP.
- A pet reward is allowed only when its `pet_id` is explicitly present in the
  published reward definition. It inserts into the existing
  `user_unlocked_pets` ownership table and does not bypass XP/streak eligibility
  for unrelated pets.
- Daily XP increases progression and may make an XP-gated pet eligible; it does
  not automatically unlock that pet.
- A reward preview displays configured rewards, while the claim response
  displays the actual applied outcome.

## 3. Persistence contract

The migration is additive. It creates four tables and does not alter, backfill,
or delete existing gamification, pet, course, or progress rows.

### 3.1 Tables

| Table | Responsibility | Ownership boundary |
|---|---|---|
| `daily_challenges` | One dated, published challenge definition | Product/admin content |
| `daily_challenge_lessons` | Ordered course/lesson membership for a challenge | Product content; references existing catalog rows |
| `daily_challenge_rewards` | Typed reward definitions for a challenge | Product content; one row per reward type per challenge |
| `daily_challenge_claims` | Per-user claim state, idempotency key, and outcome snapshot | Learner transaction/audit state |

The reward definition table is not a balance, wallet, or ownership table.
`user_gamification` remains the XP aggregate, `gamification_events` remains the
XP event ledger, and `user_unlocked_pets` remains pet ownership.

### 3.2 Required relational constraints

The migration and ORM metadata must represent these constraints:

- `daily_challenges.challenge_id` is the primary key and
  `challenge_date` is unique.
- Challenge lessons use `(challenge_id, lesson_id)` as the primary key and
  `(challenge_id, position)` as a unique ordering constraint.
- Lesson membership references the existing course and lesson catalog with
  restrictive deletion behavior.
- Rewards use a unique `(challenge_id, reward_type)` constraint.
- A reward payload is type-safe: XP has only `xp_amount`, badge has only
  `badge_id`, and pet has only `pet_id`.
- Claims use unique `(user_id, challenge_id)` and unique `(user_id, event_id)`.
- Claim rows reference the existing user and pet records and store audit times
  with `TIMESTAMPTZ`.
- An applied claim must have `claimed_at`; progress and XP values cannot be
  negative.
- Indexes support lesson lookup and recent claims by user.

The exact SQL, including `ON DELETE` behavior, checks, and indexes, is the
implementation baseline in the linked plan.

### 3.3 Database and Supabase boundary

- FastAPI repositories/services are the only application boundary for these
  tables.
- Before applying a Supabase migration, verify the repository's migration
  workflow, current project status, and advisor output. The migration must be
  additive and reversible by a documented forward fix, not by destructive
  production SQL.
- Review RLS for every new `public` table against the existing project policy.
  Browser clients must not receive a direct database credential or bypass the
  FastAPI authorization boundary.
- Schema checks must prove that no `DROP TABLE`, `TRUNCATE`, or `DELETE FROM`
  statement is introduced by this feature migration.

## 4. API contract

All routes are registered under `/api/v1` and use the existing
`get_current_user` dependency.

### 4.1 Read today's challenge

`GET /api/v1/daily-challenge/today`

Success response (`200`):

```json
{
  "challenge_id": "daily-2026-08-30",
  "challenge_date": "2026-08-30",
  "title": "Today's Learning Challenge",
  "progress": 1,
  "target": 3,
  "percent": 33,
  "state": "locked",
  "lessons": [
    {
      "course_id": "course-1",
      "lesson_id": "lesson-1",
      "title": "Animals",
      "topic": "Vocabulary",
      "duration_minutes": 10,
      "href": "/courses/course-1/lessons/lesson-1",
      "completed": true
    }
  ],
  "rewards": [
    {
      "reward_id": 1,
      "type": "xp",
      "label": "50 XP",
      "xp_amount": 50
    }
  ],
  "claimed_at": null
}
```

The response types are:

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
```

Errors:

- `401` when the learner is unauthenticated;
- `404` when there is no published challenge for the current product day; and
- `5xx` for an unexpected backend failure, with no fabricated reward state.

### 4.2 Claim today's reward

`POST /api/v1/daily-challenge/claim`

The request body is empty. The authenticated user is taken from the request
context. The success response (`200`) returns the same aggregate plus:

```ts
type DailyClaimResult = {
  xp_awarded: number;
  badge_id: string | null;
  pet_id: string | null;
  idempotent_replay: boolean;
};
```

The endpoint returns:

- `200` with the applied outcome, including the prior outcome for a deterministic
  replay of an already-applied claim;
- `404` when no published challenge exists today;
- `409` when progress is insufficient or another claim is processing; and
- `401` when the learner is unauthenticated.

Error responses are stable enough for the frontend to render a recoverable
message, but the server-side state remains authoritative.

## 5. Reward transaction and idempotency

The claim service must run challenge read, progress recomputation, claim lock,
reward grants, and applied-claim update in one PostgreSQL transaction.

1. Load the current published challenge, ordered lesson membership, rewards,
   and any existing claim for the authenticated user.
2. Recompute completed lessons from child progress rows and derive `locked`,
   `ready`, or `claimed`.
3. Lock or create the user's claim row for this challenge.
4. Apply XP through the existing transaction-aware PostgreSQL gamification
   helper using the stable event ID `daily_challenge:{challenge_id}`.
5. Grant only verified badge/pet rewards, using idempotent operations.
6. Store the actual outcome and set `status='applied'` and `claimed_at`.
7. Commit once and return the aggregate plus the replay flag.

If any grant fails, the transaction rolls back as a unit. An HTTP retry of the
same semantic claim is not a new reward event and must not increment XP twice.
The claim row and event ledger together are the audit trail; no client-side
progression persistence is authoritative.

## 6. Frontend UX contract

`DailyChallengePage` consumes the typed aggregate endpoint and must not infer
claim state from a numeric XP value or from the legacy profile summary.

Required UI states:

- loading skeleton;
- authenticated empty-day state;
- locked challenge with lesson links and disabled claim button;
- ready challenge with one enabled claim action;
- claiming state that prevents duplicate submissions;
- claimed state showing the stored XP/badge/pet outcome; and
- recoverable API error with retry.

The reward card must clearly distinguish “available reward” from “already
claimed.” It must not show a badge or pet name unless the API returns a verified
definition. Active controls use the existing vibrant claymorphism language:
raised surface, restrained shadow, clear focus ring, and a small elevation
change rather than a full-screen overlay or translucent layer over neighboring
controls.

Responsive and accessibility requirements:

- verify at 320, 375, 390, 428, and 768 CSS pixels, plus 1280 and 1440 desktop;
- no horizontal overflow and no reward/button clipped by browser safe areas;
- touch targets are at least 44 CSS pixels, with the project mobile target of
  48 pixels where practical;
- lesson links and claim controls are keyboard reachable with visible focus;
- color and status are not conveyed by color alone;
- honor `prefers-reduced-motion`; and
- refetch on window focus/visibility return through one shared in-flight load,
  coalescing events that arrive in the same transition;
- ignore stale responses when a newer request has started;
- cancel or otherwise invalidate an in-flight request on unmount; and
- preserve the last truthful state while a background refetch is pending.

The page must issue one aggregate request on initial mount. A paired
`focus`/`visibilitychange` transition must result in at most one additional
request, with no parallel duplicate requests or request waterfall.

## 7. Verification gates

The feature is not complete until all relevant gates have evidence:

### CODE_VERIFIED

- schema/migration and ORM tests pass;
- reward service tests cover idempotency, rollback, concurrent claims, badge
  no-bonus-XP, and explicit pet ownership;
- API tests cover authentication, empty day, locked, ready, claimed replay, and
  insufficient progress;
- frontend tests cover all UI states, retry, focus refetch coalescing, stale
  response protection, unmount cancellation/invalidation, clamping, and no
  false claimed label; and
- frontend build/lint/type checks pass without introducing a new warning in the
  touched surface.

### RUNTIME_VERIFIED

- a running frontend uses a controlled authenticated backend;
- completing the configured lesson set changes the server-derived state to
  `ready`; and
- claiming, refreshing, and retrying show exactly one authoritative XP grant;
- browser network evidence shows one aggregate request on mount and one at most
  for a paired focus/visibility return, with no overlapping duplicate; and
- a production-build performance capture records the Daily Challenge request
  timing plus Lighthouse or DevTools values for LCP, INP, CLS, and long tasks,
  compared with the pre-feature baseline.

### DEVICE_BROWSER_VERIFIED

- Safari iOS and Chrome Android or equivalent real-device browser checks cover
  the claim flow, safe-area layout, touch interaction, and no horizontal scroll;
- record the real device model, OS, browser version, build/URL, date, viewport,
  screenshots or video, and the request/performance trace location in the
  progress log; and
- responsive emulation is labelled as emulation and does not replace the real
  mobile-browser gate.

## 8. Non-goals and compatibility

- No changes to the legacy `/profile` response shape.
- No automatic pet unlock based on XP gain.
- No badge XP side effect outside `gamification_events`.
- No direct Supabase/PostgreSQL calls from the browser.
- No migration of unrelated legacy daily-reward methods until a caller and
  backend contract are confirmed.
- No changes to React Native, Unity, AR/XR, or unrelated dirty worktree files.

The older Daily Challenge page design under
`docs/superpowers/specs/2026-08-24-daily-challenge-page-design.md` describes an
earlier presentation-only model and does not override this approved web
contract.
