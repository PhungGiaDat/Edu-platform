# Child-Safe Session Break Design

## Context

The current break reminder is driven by a timestamp in browser `localStorage`, while authenticated session endpoints separately store state in Redis. When the 30-minute limit is reached, selecting **Take a Break** only marks the React context as manually paused and redirects to `/profile`. The persisted start timestamp remains over the limit, and the app-level watcher immediately renders the blocking overlay again on every route and reload.

The backend also has two independent Redis session implementations (`SessionService` and `LockService`). Several `LockService` coroutine calls in the API are not awaited. The browser therefore remains the effective source of truth for the visible timer even when backend synchronization fails.

## Goals

- A child can always leave the blocking overlay by selecting **Take a Break**.
- Taking a break cannot be bypassed by immediately reloading or reopening a learning route.
- Session behavior remains predictable when the backend or Redis is unavailable.
- The visible timer has one explicit state model instead of independent timestamps and flags.
- Existing Redis code is not deleted as part of this focused frontend repair.

## Non-Goals

- Building a complete parent account or PIN flow.
- Enforcing limits across multiple browsers or devices.
- Repairing or consolidating every Redis session endpoint.
- Replacing analytics or long-term usage reporting.

## Considered Approaches

### Immediate session reset

Reset the 30-minute timer when **Take a Break** is selected. This is simple, but a child can immediately return to learning and receive another full session, so it does not provide a meaningful break.

### Redis-authoritative timer

Make Redis the single source of truth for all timer state. This can support cross-device enforcement, but it requires a configured shared Redis instance, consolidation of the two backend services, corrected async endpoints, and real parent authorization. It is too broad and fragile for the current production repair.

### Browser state machine with a persistent cooldown (selected)

Use a small browser-persisted state machine for immediate child UX. Redis is removed from the overlay's critical path. A mandatory five-minute cooldown prevents reload bypass while allowing `/profile` and other non-learning pages to remain usable.

## State Model

The session has three states:

- `active`: a 30-minute learning window is counting down.
- `limit_reached`: the learning window has expired and the break overlay is shown.
- `on_break`: a five-minute break is in progress until a persisted `breakUntil` timestamp.

Persisted state is versioned and validated before use. Invalid, missing, or future-skewed timestamps fail safely to a fresh `active` session instead of trapping the user behind an overlay.

## User Flow

1. Entering a learning route with no active session starts a 30-minute window.
2. At 25 minutes, the existing dismissible warning appears.
3. At 30 minutes, the blocking break overlay appears.
4. Selecting **Take a Break**:
   - transitions to `on_break`;
   - records `breakUntil = now + 5 minutes`;
   - ends the current local learning session;
   - requests backend session cleanup on a best-effort basis for authenticated users;
   - immediately navigates to `/profile` without leaving the overlay mounted.
5. During the cooldown, profile and non-learning pages remain usable. Entering a learning route shows a friendly, non-trapping break countdown instead of restarting the timer.
6. After the cooldown expires, the next learning-route entry starts a fresh 30-minute session.

## Parent Extension

The current **10 More Minutes (Parent)** action is not protected by a parent PIN or a distinct parent authorization check. It must be hidden from the limit overlay in this repair. A future parent-gate feature can restore extension through an authenticated parent-only action.

## Component Boundaries

- `SessionContext` owns the state machine, persistence, clock ticks, and transition methods.
- `GlobalSessionWatcher` translates state into overlay visibility and navigation actions.
- `BreakReminder` remains a presentational component and does not own session state.
- Route classification identifies learning routes that should start or block a learning session; non-learning routes do not advance or restart the learning window.
- `sessionApi` cleanup is best-effort. Network failure must never prevent the local transition to `on_break`.

## Error Handling

- Local state is committed before any backend request.
- Backend cleanup failures are logged without restoring the blocking overlay.
- Storage parsing errors discard only the session-state key and start from a valid state.
- Time calculations use timestamps rather than decrement-only counters so mobile backgrounding and reloads remain deterministic.

## Testing

Regression coverage must demonstrate:

- A limit-reached session shows the break overlay.
- Selecting **Take a Break** hides the overlay and navigates to `/profile`.
- Reloading during the cooldown does not recreate the trapping limit overlay.
- A learning route entered during the cooldown does not start a new 30-minute session.
- Expired cooldown state starts a fresh learning session.
- Backend cleanup failure does not block the local break transition.
- The parent extension action is absent until a parent gate exists.

## Rollout

Implement directly on `MindAR-Update` with a focused regression test first. Keep existing backend Redis endpoints unchanged in this repair, and document their consolidation as separate follow-up work.
