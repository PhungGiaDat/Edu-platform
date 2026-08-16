## Status
approved (gap confirmed)

## Goal
Document the confirmed entitlement gap: current flashcard resolution does NOT enforce private-card ownership.

---

## Gap Description

### Current state

`GET /api/v1/flashcard/{qr_id}` is **public**:
- No authentication required
- No entitlement check
- Returns full flashcard + AR metadata
- Model URLs are public Supabase Storage URLs

There is no:
- Private-card ownership model in MongoDB
- User-card ownership table
- AR-specific lesson entitlement
- Authenticated entitlement check in the AR experience path

---

## Evidence

1. `backend/services/ar_service.py` — `get_ar_experience(qr_id)` has no auth parameter
2. `backend/api/flashcards.py` — `GET /flashcard/{qr_id}` has no `user_id` filter
3. `backend/models/ar_object.py` — no `owner_id` or `visibility` field
4. Backend has no "private" concept for flashcards in the AR path

---

## Implication

Any user can:
1. Scan any QR code
2. Get the full AR payload (including model URLs)
3. Download models without proving entitlement

This is acceptable for MVP / public flashcards.

---

## Future Direction (NOT implemented)

Authenticated AR experience flow:
1. React Native sends auth token with `GET /api/v1/flashcard/{qr_id}?user_id=xxx`
2. Backend checks `user_card_ownership` collection
3. If entitled: return full payload + private Supabase URLs
4. If not entitled: return 403 or public subset

This requires:
- User-card ownership table
- Private Supabase storage bucket
- Short-lived signed URLs for private assets
- Backend entitlement enforcement

---

## Invariants

1. **SEC-REQ-001 MUST be maintained:** `GET /api/v1/flashcard/{qr_id}` continues as public during migration.
2. **SEC-REQ-002 MUST be maintained:** Model URLs are public Supabase URLs during migration.
3. **SEC-REQ-003 is NOT implemented:** Private flashcard entitlement is a future feature, not current scope.
4. **SEC-REQ-004 is NOT implemented:** Private Supabase storage is a future feature, not current scope.
5. **Legacy coexistence is not affected:** MindAR and WebAR paths remain public.

---

## Migration Impact

- Unity AR can use the same public model URL flow as MindAR
- No auth token needs to flow to Unity
- Unity bridge contract does not need entitlement fields
- Backend contract does not need entitlement fields for MVP

---

## Open questions

None — gap is confirmed and out of scope for current migration.
