## Status
resolved

## Blocks
- `docs/mobile_migration/plans/2026-08-10-final-super-product-plan.md` — C26 XP idempotency hook

## Symptom
C26 requires XP-award deduplication safety, but the current backend contract does not expose any idempotency key or request identifier that React Native can send to guarantee exactly-once XP mutation.

Observed implementation evidence:
- `backend/api/gamification.py` defines `AddXPRequest` with fields:
  - `user_id`
  - `action`
  - `metadata?`
- `POST /gamification/add-xp` overwrites `user_id` from `current_user.id` and calls:
  - `service.add_xp(user_id, request.action, request.metadata)`
- No `idempotency_key`, `request_id`, `event_id`, or replay-protection field exists in the inspected API surface.

Practical reproduction risk:
1. RN submits XP mutation for an action.
2. Client retries because of double tap, network retry, app resume, or optimistic replay.
3. Backend receives two valid requests with the same semantic action.
4. Both can award XP because the server has no authoritative deduplication key.

## Hypotheses (ranked)
1. Backend gamification contract is currently designed for best-effort mutations, not idempotent learner-event ingestion — strongest evidence is the absence of any idempotency field in `AddXPRequest` and the direct `service.add_xp(...)` call shape.
2. Idempotency may have been intended to live inside `metadata`, but the backend currently treats `metadata` as opaque and the inspected route/service path shows no explicit deduplication semantics.
3. The plan assumed backend support would already exist, but implementation evidence shows the mobile client cannot safely guarantee deduplication alone.

## Tried
- Inspected backend gamification API contract and request model.
- Compared RN types and hooks against backend route surface.
- Evaluated whether client-only duplicate suppression could satisfy the requirement.

Why this did not resolve it:
- Client-only suppression cannot protect against retried requests across process restarts, flaky networks, duplicate dispatches from multiple surfaces, or ambiguous server-ack failures.
- Without a backend idempotency contract, RN cannot truthfully implement exactly-once XP awarding.

## Resolution
RESOLVED - GamificationEvent system implemented.

See `docs/mobile_migration/progress/2026-08-11-c26-gamification-event-implemented.md` for implementation details.

### Implementation Summary
Implemented backend-supported idempotency via UNIQUE(user_id, event_id) compound index:

**Backend Changes:**
- `backend/models/gamification_event.py` — GamificationEventDocument + schemas
- `backend/repositories/gamification_event_repository.py` — Beanie ODM repository
- `backend/services/gamification_service.py` — add_xp_with_event_id() method
- `backend/api/gamification.py` — new POST /gamification/xp-event endpoint
- `backend/database/indexes.py` — UNIQUE(user_id, event_id) index
- `backend/database/connection.py` — registered GamificationEventDocument

**Pronunciation Integration:**
- `backend/api/pronunciation.py` — uses attempt_id as event_id

**RN Integration:**
- `mobile/rn/src/types/gamification.ts` — AddXpEventRequest/Response types
- `mobile/rn/src/services/api.ts` — coursesApi.addXpEvent()
- `mobile/rn/src/hooks/useGamification.ts` — addXpEvent hook

**Tests:**
- `backend/tests/test_gamification_idempotency.py` — 17 idempotency tests
- `backend/tests/conftest.py` — mock_event_repository fixture
