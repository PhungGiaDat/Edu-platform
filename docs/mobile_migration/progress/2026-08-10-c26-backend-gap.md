# C26 — XP Idempotency Hook — Backend Contract Gap

## Session
2026-08-10, agent: Claude Code, branch: MindAR-Update

## Goal
Validate whether C26 can be implemented truthfully in React Native without faking server-side XP idempotency.

## Inputs Re-read
- `docs/mobile_migration/plans/2026-08-10-final-super-product-plan.md` — C26 entry
- `backend/api/gamification.py`
- `mobile/rn/src/types/gamification.ts`
- `mobile/rn/src/hooks/useGamification.ts`
- `mobile/rn/src/hooks/useUser.ts`
- `docs/mobile_migration/progress/2026-08-10-c27-home-xp-header.md`

## Finding
C26 is **not implementable as written on the RN side alone**.

The current backend mutation contract for XP awarding has no explicit idempotency primitive.
Inspected evidence:
- `AddXPRequest` contains `user_id`, `action`, `metadata?`
- `POST /gamification/add-xp` forwards to `service.add_xp(user_id, request.action, request.metadata)`
- No `idempotency_key`, `event_id`, or replay-safe contract is present

This means RN cannot guarantee exactly-once XP mutations across retries, duplicate taps, reconnects, or ambiguous network failures.

## Decision Applied
Per session constraints, this was recorded as a **BACKEND_DEPENDENCY** instead of implementing fake client-only deduplication.

Client-only duplicate suppression is insufficient because it cannot authoritatively prevent double-awards when:
- the same mutation is retried after transport uncertainty
- the app process restarts
- two client surfaces emit the same semantic event
- a request succeeds on the server but the client does not receive confirmation

## Artifacts Created
### `docs/mobile_migration/blockers/2026-08-10-c26-xp-idempotency-backend-gap.md`
- Open blocker for the backend contract gap.
- Captures symptom, evidence, hypotheses, and why RN-only mitigation is not enough.

## Changed
No RN runtime code changed for C26.

This was intentionally documentation-only because implementing a hook here would create a false guarantee.

## Verified
- Backend contract inspected directly in `backend/api/gamification.py`
- RN types/hook surface checked against backend request model
- Confirmed absence of explicit idempotency field in inspected API surface
- Confirmed C27 remains independent and does not require this blocker to stand

## Not Verified
- Internal backend service implementation beyond the inspected route/service call shape
- Whether backend team already has an unmerged/idempotent redesign in flight

## Spec/Plan Corrections from Implementation Evidence
C26 needs one of these before RN implementation can be considered complete:
1. backend-supported idempotency key / event id contract, or
2. explicit product downgrade stating XP mutation is best-effort and may duplicate under retry conditions

Until one of those is approved, RN must not claim C26 is solved.

## Blockers Raised
- `docs/mobile_migration/blockers/2026-08-10-c26-xp-idempotency-backend-gap.md`

## Confirmations
- ✅ No Unity source modified
- ✅ No `docs/unity_ar/**` modified
- ✅ No backend runtime modified
- ✅ No fake client-only idempotency shipped
- ✅ No direct MongoDB access added
- ✅ No privileged Supabase access added
- ✅ No unrelated RN refactor performed

## Next
C26 remains blocked on backend contract support.
