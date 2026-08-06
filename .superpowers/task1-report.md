# Task 1 Report — Backend Flashcard Dual-Upload Service

## Status: DONE

## What was implemented

### 1. Created `backend/services/flashcard_upload_service.py`

- Class `FlashcardUploadService` with a single method `upload_dual_images(image_without_qr: bytes, image_with_qr: bytes, qr_id: str) -> dict`
- Uses `httpx.AsyncClient` for async HTTP to Supabase Storage REST API
- Storage paths: `flashcards/{qr_id}/{qr_id}.png` (clean) and `flashcards/{qr_id}/{qr_id}_qr.png` (QR)
- Uses `x-upsert: true` header for idempotent uploads
- If Supabase not configured (`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are `None`), falls back to `/static/` paths
- QR image upload failure is **non-fatal** — logs a warning and sets `image_with_qr_url = None`
- Clean image upload failure is **fatal** — raises and propagates the error
- Factory function `get_flashcard_upload_service()` for dependency injection

### 2. Added `POST /admin/flashcards/upload-image` to `backend/api/admin.py`

- Accepts JSON body: `{"image_without_qr_b64": "...", "image_with_qr_b64": "..."}`
- Query param: `qr_id` (required)
- Validates base64 decoding; returns 400 on invalid data
- Enforces 10 MB size limit per image; returns 400 if exceeded
- Calls `upload_dual_images()` and returns `{"image_url": "...", "image_with_qr_url": "..."}`
- Uses existing `get_admin_repo` dependency for teacher auth scoping
- Added `Request` import and `get_flashcard_upload_service` import to `admin.py`

### Key design decisions

- **MongoDB schema unchanged** — only `image_url` (clean PNG) is ever stored; `qr_id` drives QR rendering at view time
- Both URLs are returned so the frontend can use the clean URL for MongoDB and optionally surface the QR URL for reference
- QR upload is non-fatal so that a Supabase outage on the secondary file doesn't block card creation

## Test results

```
tests/test_gamification_service.py::TestXpRewards::test_xpRewards_flashcardViewed PASSED
1 passed, 127 deselected
```

No existing flashcard tests broke.

## Commit

```
commit 9bce0d7
feat(admin): add flashcard dual-PNG upload to Supabase Storage
```
