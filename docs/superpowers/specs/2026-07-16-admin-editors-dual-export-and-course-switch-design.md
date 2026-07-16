# 2026-07-16 Admin Editors: Dual-Image Flashcard Export + Course Switch UI

## Context

Two admin editor improvements on the deployed platform, both scoped to
`frontend-web/src/pages/admin/`. No MongoDB schema change is allowed.

## Feature 1 — Flashcard dual-image export (QR / no-QR)

**Where:** `FlashcardEditor.tsx` (`card-new` / `card-edit` modes). The
`new-deck` route only edits deck metadata; the export button lives in the
card editor, which is the real target.

**Current:** `handleDownloadArtwork` renders one 800x960 canvas *with* a QR
box and downloads `<qrId>-flashcard.png`.

**Change:** One click → two PNG files:
- `<qrId>.png` — clean card, **no QR** (dataset / OCR / re-edit source)
- `<qrId>_qr.png` — same card **with QR** (print for students)

**Design:**
- Extract the canvas drawing into `drawCardBase(ctx, {cardImage, backgroundImage, frontText, backText})` that renders everything except the QR white box + QR image.
- `drawQrOverlay(ctx, qrCanvas)` draws only the QR box (fixed position, unchanged coords: white rounded rect at 604,38 158x158; QR at 623,57 120x120).
- Export helper `canvasToPng(canvas) => Blob`, `downloadBlob(blob, filename)`.
- `handleDownloadArtwork` builds the base once, exports clean PNG, then draws the QR overlay on the same context and exports the QR PNG. Two sequential downloads.
- Button label → "Download images (QR + clean)". Keep single button; keep existing disabled guards.

**No schema change:** `qr_id` and `image_url` already exist. Nothing new persisted; both files are generated on demand from existing data + the QR id, exactly matching the "regenerate QR anytime by exporting again" goal.

## Feature 2 — Course builder: switch views instead of scrolling

**Where:** `CourseEditor.tsx` (`/admin/courses/new` + edit).

**Current:** Single long scroll: Course setup card, then Sessions accordion, then sidebar. On many sessions the admin scrolls a lot.

**Change (low-code/no-code feel):** Add a segmented top switcher with three steps:
1. **Details** — the existing "Course setup" section.
2. **Sessions** — the existing sessions builder, but only the active session's body is shown; sessions are switched via a compact session tab strip (chips) instead of scrolling accordions. Add/duplicate/reorder/delete stay.
3. **Review** — moves the existing sidebar preview + readiness checklist into a focused step; publish/save actions remain always visible in the header.

**Design:**
- New `view` state: `'details' | 'sessions' | 'review'` (default `details`).
- Segmented control (accessible `role="tablist"`, arrow-key nav, `aria-selected`).
- Sessions step: a horizontal, wrapping chip row of sessions (number + title, active highlighted). Selecting a chip sets `activeSessionId`; only that session's editor body renders. "Add session" selects the new one. Keep move/duplicate/delete controls on the active session's header.
- The right sidebar (preview + checklist + tip) renders inside the Review step, and as a persistent sidebar on `lg+` so wide screens keep context. On small screens it only shows in Review to avoid scroll.
- Validation on save can auto-switch to the step containing the first error (e.g., missing session title → Sessions step) so the no-scroll flow still surfaces errors.

## Testing / verification

- `npm run build` (tsc + vite) must pass.
- `npm test` (vitest) — existing `FlashcardEditor.test.tsx` must still pass; the export button still exists and is enabled under the same conditions.
- Manual: card editor downloads two files; course builder switches steps without scrolling; keyboard nav on the segmented control.

## Out of scope

- No S3/Supabase upload pipeline (none exists today).
- No backend/model/API changes.
- No new dependencies.
