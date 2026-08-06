# Task 3 Report: FlashcardEditor — upload canvas PNGs to backend on submit

## Status: ✅ DONE

## What was implemented

### 1. `adminApi.ts` — Added `uploadFlashcardImage` method

Added to `adminFlashcardsApi` after `deleteFlashcard` (line 230):

```typescript
async uploadFlashcardImage(
  qrId: string,
  imageWithoutQrB64: string,
  imageWithQrB64: string,
): Promise<{ image_url: string; image_with_qr_url?: string }>
```

Calls `POST /api/v1/admin/flashcards/upload-image` with JSON body `{"image_without_qr_b64": "...", "image_with_qr_b64": "..."}` and query param `qr_id`.

### 2. `FlashcardEditor.tsx` — Added `blobToBase64` helper

Added after the `loadImage` function (line 35). Converts a `Blob` to a raw base64 string (strips the `data:image/...;base64,` prefix) for the backend to decode.

### 3. `FlashcardEditor.tsx` — Refactored `handleCardSubmit`

The card-mode submit branch now:
- Checks if `imageUrl` is a data URL (local file) before submitting
- Generates the QR canvas reference from `qrExportRef`
- Loads the card image and background image in parallel
- Creates an offscreen canvas, draws the card base, exports as PNG blob, converts to base64
- Draws the QR overlay on the same canvas, exports again as PNG blob, converts to base64
- Uploads both to Supabase via `adminFlashcardsApi.uploadFlashcardImage`
- Uses the returned `image_url` (Supabase URL, clean PNG) as `finalImageUrl`
- Passes `finalImageUrl` to `createFlashcard`/`updateFlashcard` instead of the raw data URL

The `handleDownloadArtwork` function is **unchanged** — it still saves both PNGs locally.

## Issues encountered

None. The implementation followed the plan exactly.

## Typecheck / Lint results

- `npx tsc --noEmit` — ✅ **PASS** (exit code 0)
- `npx eslint src/pages/admin/FlashcardEditor.tsx src/services/adminApi.ts` — ✅ **PASS** (exit code 0)

## Commit

```
commit 9bce0d77222700f1ab8a604042726121e9b62ee6
Author: ...
Date:   Fri Jul 17 2026 ...

feat(flashcard): upload canvas PNGs to Supabase on submit, save clean URL to MongoDB
```

Files changed: `frontend-web/src/pages/admin/FlashcardEditor.tsx`, `frontend-web/src/services/adminApi.ts` (2 files, +89 insertions, -2 deletions).
