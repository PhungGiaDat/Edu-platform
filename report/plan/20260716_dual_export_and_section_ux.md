# Project Plan: Dual PNG Export for Flashcards + Section UX in Course Editor

**Date:** 2026-07-16
**Owner:** Planner (subagent of SDLC Orchestrator)
**Mode:** INTERACTIVE → executed without confirmation (binding constraints supplied)

## 1. Summary

We are delivering two independent features inside the teacher admin area:

1. **Flashcard dual-export (no MongoDB schema migration).** The existing single-image flashcard editor in `frontend-web/src/pages/admin/FlashcardEditor.tsx` is extended to render the 800×960 card canvas **twice** — once without the QR layer and once with it — producing two PNGs (`<qr-id>.png` and `<qr-id>_qr.png`). Both are uploaded to Supabase Storage via a new `POST /api/v1/admin/flashcards/cards/{qr_id}/image-upload` endpoint that proxies a `multipart/form-data` payload to Supabase (mirroring `lesson_media_service.upload_media`). Both public URLs are persisted on the flashcard document in two **new optional fields** — `image_clean_url` and `image_qr_url` — added symmetrically to the Beanie `Flashcard` document, the Beanie `FlashcardDocument` admin mirror, and the four Pydantic schemas (`FlashcardCreate`, `FlashcardUpdate`, `FlashcardResponse`, `FlashcardSchema`, plus `AdminFlashcardCreate`/`AdminFlashcardUpdate`/`AdminFlashcardResponse`). This is purely additive — no indexes change, no required field changes, no breaking rename of `image_url`. `qr_id` remains the only piece of metadata stored in MongoDB; PNGs live in Supabase.

2. **Section UX (low-code / no-code tabs).** `frontend-web/src/pages/admin/CourseEditor.tsx` replaces its vertical accordion list of session cards with a **tabbed strip + active-session panel** pattern. The tab bar shows one pill per session (numbered, with a per-tab title, duration, and completed-block count, plus per-tab Duplicate/Delete/Move-up/Move-down controls). The body of the active tab contains the existing low-code block editor (text/video/image blocks), unchanged. A single "Add session" tab is always the last tab. Tabs support keyboard navigation (Left/Right arrows, Home/End). Drag-to-reorder remains out of scope.

The two features share no state, no files, and no migrations; they ship independently and each has its own reviewer gate.

## 2. Architecture

### 2.1 Flashcard dual-export data flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│  FlashcardEditor.tsx  (browser, React)                                 │
│                                                                         │
│   frontText + backText + imageUrl + qrId                                │
│              │                                                          │
│              ▼                                                          │
│   ┌──────────────────────────────────────────────┐                      │
│   │ renderCardToCanvas(opts)                     │  ◄── pure helper,     │
│   │   • loads FLASHCARD_BACKGROUND_URL + imageUrl│      testable in      │
│   │   • draws rounded bg + image + label panel   │      jsdom            │
│   │   • if opts.includeQr → draws QR badge       │                      │
│   │   • returns Promise<Blob> ('image/png')      │                      │
│   └──────────────┬───────────────────────────────┘                      │
│                  │                                                      │
│   handleExportBoth():                                                  │
│      pass 1: includeQr=false → blobClean                               │
│      pass 2: includeQr=true  → blobQr                                  │
│                  │                                                      │
│                  ▼                                                      │
│   ┌──────────────────────────────────────────────┐                      │
│   │ uploadFlashcardImage(qrId, variant, blob)    │                      │
│   │   POST /api/v1/admin/flashcards/cards/{qr}   │                      │
│   │        /image-upload   (multipart/form-data) │                      │
│   └──────────────┬───────────────────────────────┘                      │
│                  │                                                      │
└──────────────────┼──────────────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  FastAPI  backend/api/admin.py                                          │
│   upload_flashcard_image(qr_id, variant, file)                          │
│      1. fetch flashcard by qr_id (sanity check)                         │
│      2. delegate to FlashcardImageService                               │
│                                                                         │
│  services/flashcard_image_service.py  (new)                             │
│      mirrors lesson_media_service.upload_media:                         │
│         • builds storage path  flashcards/{teacher_id}/{qr_id}_{variant}.png
│         • POSTs to {SUPABASE_URL}/storage/v1/object/{bucket}/{path}     │
│         • returns public_url                                            │
│                                                                         │
│  repositories/flashcard_repository.py                                   │
│      set_image_urls(qr_id, image_clean_url, image_qr_url)              │
│         → collection.update_one({qr_id}, {$set: {...}})                 │
│                                                                         │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  MongoDB  flashcards  (Beanie Flashcard + FlashcardDocument)            │
│     {                                                                  │
│       qr_id: "apple_001",                                              │
│       word: "apple",                                                   │
│       image_url:        "<existing primary — kept for back-compat>",   │
│       image_clean_url:  "https://.../apple.png",         ← NEW optional│
│       image_qr_url:     "https://.../apple_qr.png",      ← NEW optional│
│       …                                                                  │
│     }                                                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Section UX information architecture

```
CourseEditor.tsx (single page)
├─ Course Setup section        (unchanged)
├─ Learning sessions section   (refactored)
│   ├─ SessionTabsBar
│   │   • Tab N  (title · duration · block-count · move/duplicate/delete) × N
│   │   • "+ Add session" tab (always last)
│   │   • role="tablist", aria-orientation="horizontal"
│   │   • ArrowLeft/Right, Home/End keyboard nav
│   │
│   └─ ActiveSessionPanel
│       • Renders only CourseSession[activeSessionId]
│       • Body = existing block editor (text/video/image) — moved as-is
│
└─ Aside (cover preview, completion checklist)  (unchanged)
```

## 3. Flashcard dual export — implementation plan

### 3.1 File-by-file change list

| File | Change |
|------|--------|
| `frontend-web/src/pages/admin/FlashcardEditor.tsx` | Extract canvas-rendering into a pure helper `renderCardToCanvas({ frontText, backText, imageUrl, qrId, includeQr }) → Promise<Blob>`. Add state `imageCleanUrl`, `imageQrUrl`, `imageCleanLocalUrl`, `imageQrLocalUrl`, `isExporting`, `isUploadingClean`, `isUploadingQr`. Replace `handleDownloadArtwork` with two new handlers: `handleDownloadClean()` and `handleDownloadQr()` (single-pass each, downloads `<qr-id>.png` / `<qr-id>_qr.png`). Add `handleExportBoth()` (two-pass → blobs; offers both downloads). Add `handleUploadClean()` and `handleUploadQr()` (calls the upload helper, writes returned URL into state, sends it back to the form payload). Update the preview aside: two side-by-side preview cards ("No QR" and "With QR"), each with a labelled download button + an upload slot (button + thumbnail once uploaded). On `handleCardSubmit`, include `image_clean_url` and `image_qr_url` in the `FlashcardCreate`/`FlashcardUpdate` payload when populated. On initial load (card-edit mode), read `image_clean_url` / `image_qr_url` from the card and prefill state. |
| `frontend-web/src/services/adminApi.ts` | Add `uploadFlashcardImage(qrId: string, variant: 'clean' \| 'qr', file: Blob): Promise<{ public_url: string }>`. Add optional fields `image_clean_url?: string`, `image_qr_url?: string` to the existing `Flashcard`, `FlashcardCreate`, `FlashcardUpdate` type imports — they are forwarded by `types/admin.ts` below. |
| `frontend-web/src/types/admin.ts` | Extend `Flashcard` (line ~152), `FlashcardCreate` (line ~169), `FlashcardUpdate` (line ~183) with `image_clean_url?: string` and `image_qr_url?: string`. No change to `Lesson` or `Course*` types. |
| `frontend-web/src/pages/admin/FlashcardEditor.tsx` (re-export) | When `mode === 'card-edit'`, after fetching the card, populate `imageCleanUrl` / `imageQrUrl` state from the response. |
| `backend/models/flashcard.py` | Add optional `image_clean_url: Optional[str] = None` and `image_qr_url: Optional[str] = None` to (a) `Flashcard` Beanie document (after `audio_url`, ~line 35), (b) `FlashcardCreate` (after `image_url`, ~line 95), (c) `FlashcardUpdate` (after `image_url`, ~line 108), (d) `FlashcardResponse` (after `image_url`, ~line 123), (e) `FlashcardSchema` legacy mirror (after `image_url`, ~line 145). **No changes to `Settings.indexes`.** The comment block at lines 56-60 about the unique `qr_id` index still applies and must be left intact. |
| `backend/models/admin_models.py` | Add the same two optional fields symmetrically to (a) `FlashcardDocument` Beanie document (after `audio_url`, ~line 121), (b) `AdminFlashcardCreate` (~line 434), (c) `AdminFlashcardUpdate` (~line 447), (d) `AdminFlashcardResponse` (~line 464). **No changes to `Settings.indexes`.** |
| `backend/services/flashcard_image_service.py` (NEW) | Mirrors `services/lesson_media_service.py` shape. Class `FlashcardImageService.upload(file_content, qr_id, variant, teacher_id) -> str` returns a public URL. Builds storage path `flashcards/{teacher_id}/{qr_id}_{variant}.png` (variant ∈ `{'clean','qr'}`). POSTs to `{SUPABASE_URL}/storage/v1/object/{LEARNAR_ASSETS_BUCKET}/{path}` using `urllib.request` (the same call pattern as `generate_course_media.upload_file`). Falls back to a relative `/assets/{path}` URL only when `SUPABASE_URL` is unset (dev mode). Exposes factory `get_flashcard_image_service()`. |
| `backend/repositories/flashcard_repository.py` | Add `async def set_image_urls(qr_id, image_clean_url, image_qr_url) -> bool` — performs a single `update_one` with `$set` of only the keys that are non-`None`. Do **not** add an index for the new fields. |
| `backend/services/flashcard_service.py` | Add `async def update_image_urls(qr_id, image_clean_url=None, image_qr_url=None) -> Dict[str, Any]`. Delegates to repository, then re-fetches and returns the updated document. Logs at `info` level. |
| `backend/api/admin.py` | Add endpoint `POST /admin/flashcards/cards/{qr_id}/image-upload` (multipart `variant`, `file`) → returns `{ public_url, image_clean_url, image_qr_url }` after persisting. Reuse `Depends(get_admin_repo)` for the teacher-scope lookup. Use `UploadFile = File(...)`, `Form(...)` from `fastapi`. Variant is validated against the literal set `{'clean','qr'}`. The router **must** be added before any wildcard catch-all. |

### 3.2 Function-level pseudocode for `handleExportBoth()`

```
function handleExportBoth() {
  if (!validateCard() || !frontText.trim()) {  // existing validator
    if (!frontText.trim()) setError("Add front text before downloading.");
    return;
  }
  const qrCanvas = qrExportRef.current?.querySelector('canvas');
  if (!qrCanvas) { setError("The QR preview is not ready yet."); return; }

  setIsGenerating(true);  // reuse existing busy flag, label says "Generating both..."
  try {
    // Pre-load card image and background ONCE (used by both passes)
    const cardImage  = await loadImage(imageUrl);
    const background = await loadImage(FLASHCARD_BACKGROUND_URL).catch(() => null);

    // Pass 1 — clean (no QR)
    const blobClean = await renderCardToCanvas({
      frontText, backText, image: cardImage, background,
      qrCanvas: null,           // ← QR layer skipped
      includeQr: false,
    });

    // Pass 2 — with QR
    const blobQr = await renderCardToCanvas({
      frontText, backText, image: cardImage, background,
      qrCanvas,                 // ← QR layer drawn
      includeQr: true,
    });

    // Trigger downloads for both (do not upload)
    triggerBrowserDownload(blobClean, `${safeFileName(qrId)}.png`);
    triggerBrowserDownload(blobQr,   `${safeFileName(qrId)}_qr.png`);
  } catch (err) {
    setError(err.message ?? "Could not generate the flashcard images.");
  } finally {
    setIsGenerating(false);
  }
}
```

The new `renderCardToCanvas({ includeQr, qrCanvas, ... })` helper must:
- Create an offscreen `HTMLCanvasElement(800, 960)`.
- Perform the existing rounded-rect clip + background gradient/image (lines 286-300 of the current file).
- Perform the existing green border, image card panel, label panel, and label texts (lines 302-327).
- **Only** when `includeQr === true`, execute the existing white rounded square + QR `drawImage` block (lines 307-310). When `includeQr === false`, that region remains the green border only — visually equivalent to the existing artwork minus the badge.
- Return `canvas.toBlob(cb, 'image/png')` wrapped in a Promise.

`triggerBrowserDownload(blob, filename)` reuses the existing pattern from `handleDownloadArtwork` (lines 336-343): `URL.createObjectURL` → click anchor → `revokeObjectURL`.

### 3.3 Upload handlers — pseudocode

```
async function handleUploadClean() {
  if (!imageCleanLocalUrl) return;
  setIsUploadingClean(true); setError(null);
  try {
    const blob = await fetch(imageCleanLocalUrl).then(r => r.blob());
    const res = await adminFlashcardsApi.uploadFlashcardImage(qrId.trim(), 'clean', blob);
    setImageCleanUrl(res.image_clean_url);     // persisted URL
    setImageCleanLocalUrl(null);                // free local preview
  } catch (e) { setError(e.message); }
  finally { setIsUploadingClean(false); }
}
```

The QR variant is identical with `'qr'`. Both handlers refuse to start if `validateCard()` fails (mirrors `handleDownloadArtwork`). The state model:

- `imageCleanLocalUrl: string | null` — set right after the canvas export, holds a `blob:` URL used to render the preview thumbnail + drive the upload.
- `imageCleanUrl: string | null` — the **persisted** Supabase public URL (read from the card on edit; written after a successful upload).
- Same pair for `imageQr*`.
- Submit only sends `image_clean_url` / `image_qr_url` if non-empty; never overwrites with an empty string.

### 3.4 Validation rules (apply to all export & upload paths)

- `validateCard()` (existing): `qrId` matches `/^[A-Za-z0-9_-]+$/` and `imageUrl` is set.
- New helper `canExport()`: `validateCard() && frontText.trim() !== ''`.
- Upload is **only** permitted when `canExport()` is true. Downloads are permitted when `canExport()` is true even if no card has been saved yet — the user can grab PNGs without persisting.
- If the user uploads only the clean variant (and not the QR), saving proceeds normally; both fields are independent.
- Saving a card without uploading either variant is allowed and falls back to using `imageUrl` as the only image (current behaviour).

### 3.5 UI affordances (preview aside)

The existing `aside` block (lines 554-598 of the current `FlashcardEditor.tsx`) is replaced by:

```
┌── Live Preview ────────────────────────────────────────────────┐
│  Two stacked cards (preview thumbnails, non-interactive):      │
│    ┌────────────┐   ┌────────────┐                             │
│    │ no QR      │   │ with QR    │   ← both re-render the     │
│    │ (clean)    │   │            │     canvas at small scale  │
│    └────────────┘   └────────────┘                             │
│                                                                │
│  ┌── Clean ─────────────────────────────────────────────────┐ │
│  │ Download "<qrId>.png"   [⬇ Download clean]              │ │
│  │ Status: not generated / generated / uploaded             │ │
│  │ Upload slot: [⬆ Upload clean] + thumbnail once uploaded │ │
│  └──────────────────────────────────────────────────────────┘ │
│  ┌── With QR ───────────────────────────────────────────────┐ │
│  │ Download "<qrId>_qr.png" [⬇ Download with QR]           │ │
│  │ Status: not generated / generated / uploaded             │ │
│  │ Upload slot: [⬆ Upload with QR] + thumbnail once uploaded│ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  [⬇ Download both (no upload)]   (single button → 2 files)   │
│                                                                │
│  Hidden <QRCodeCanvas> still lives here for canvas export     │
└────────────────────────────────────────────────────────────────┘
```

Layout: a `grid grid-cols-2 gap-3` for the two preview thumbs, two bordered slots underneath, and a full-width "Download both" button at the bottom. Buttons use the existing colour tokens (`border-[#247CC2] bg-white text-[#176AA9]` for outlined, `bg-[#247CC2] text-white` for primary). The hidden `<QRCodeCanvas>` (`qrExportRef`, current lines 594-596) stays put — it remains the single source of truth for the QR pixels used during canvas export.

### 3.6 Backward compatibility

- `image_url` is **kept** in both Beanie documents and the response model. Existing renderers (e.g. `Flashcard.tsx` and the learner gallery) continue to work unchanged.
- A new flashcard that only uploads the QR variant still stores `image_url` (the user-supplied image data URL) in MongoDB alongside `image_qr_url`. A card that uploads both variants stores all three; the renderer can pick `image_clean_url` for non-AR lessons and `image_qr_url` for printable / scan-it-yourself decks.
- The `Flashcard.tsx` learner component is **not** changed by this plan; it still consumes `qrData`, `imgUrl`, `bgUrl`. We are only ensuring the admin editor exports both variants.
- `FlashcardCreate` / `FlashcardUpdate` / `FlashcardSchema` / `AdminFlashcardCreate` / `AdminFlashcardUpdate` keep `image_url` as required/optional exactly as today; the two new fields default to `None`.

### 3.7 Why this is "no MongoDB schema migration"

- No collection is renamed, dropped, or recreated.
- No index is added, removed, or modified.
- No required field is added.
- No field type changes.
- The two new fields are nullable strings; Beanie and Pydantic accept them on insert without any migration script. Documents already in MongoDB simply don't have them and will load with `image_clean_url = None, image_qr_url = None`.

## 4. Section UX — implementation plan

### 4.1 Decision: tabs (not stepper, not side-nav, not segmented control)

**Chosen:** horizontal **tab strip** above a single panel that holds the active session's block editor.

**Why tabs and not the alternatives:**

| Option | Why rejected |
|--------|--------------|
| Stepper ("1 → 2 → 3 → …", each on its own page) | Implies a wizard; teachers want to edit sessions out of order. A stepper that hides the next session until the previous is "complete" would lock them out. |
| Side-nav (vertical list on the left) | Eats horizontal real estate that the block editor needs (text fields, video URL, image URL inputs are wide). On mobile it would collapse to a hamburger, costing an extra tap. |
| Segmented control | Conceptually right for ≤4 mutually exclusive views, but teachers can have 10+ sessions; a segmented control does not scale. |
| Tabs (chosen) | Always one panel visible, no scroll to find the next session, keyboard a11y is straightforward (`role="tablist"`/`role="tab"`/`role="tabpanel"`), and the per-tab Duplicate/Delete/Move-up/Move-down controls live on the tab itself. |

### 4.2 File-by-file change list

| File | Change |
|------|--------|
| `frontend-web/src/pages/admin/CourseEditor.tsx` | Replace the `<article>`-based accordion list (current lines 664-895) with a tab strip + active panel. Tab strip is a `<div role="tablist" aria-orientation="horizontal">` containing one `<button role="tab" aria-selected aria-controls>` per session plus a trailing "Add session" tab. Body is a single `<section role="tabpanel" id={...} aria-labelledby={...}>` containing the existing block editor (title input, duration select, session goal textarea, block list with add text/video/image, Vietnamese details summary). All existing handlers (`addSession`, `duplicateSession`, `removeSession`, `moveSession`, `addBlock`, `removeBlock`, `updateSession`, `updateBlock`) are reused unchanged. |
| `frontend-web/src/pages/admin/CourseEditor.tsx` (state) | Existing `activeSessionId` already exists (line 164). New derivation `activeSession = sessions.find(s => s.id === activeSessionId) ?? sessions[0]` ensures the first session is shown when none is selected. Default after `addSession` / `duplicateSession` is the new tab. |

No other files change. `Lesson` / `CourseCreate` / `CourseUpdate` payloads are unaffected — we are only re-shaping the in-page UI for `CourseSession[]`.

### 4.3 State model

```
sessions:         CourseSession[]                    (immutable array; mutated via setSessions)
activeSessionId:  string | null                      (already present)
activeSession:    CourseSession | undefined          (derived: activeSessionId ?? sessions[0])
```

- **Tab order preservation** is automatic because `sessions` is an ordered array. The tab strip maps 1:1 with `sessions.map((s, i) => …)`.
- **Add session** appends a new `CourseSession` and sets `activeSessionId = newSession.id` so the new tab is open and focused.
- **Duplicate session** inserts the copy at `sourceIndex + 1` and sets `activeSessionId = duplicate.id` (existing behaviour, lines 268-287).
- **Delete session** filters out the session. If the deleted session was active, fall back to `activeSessionId = sessions[0]?.id ?? null`. If zero sessions remain, show the empty state.
- **Move up / down** swaps entries in the array. Active tab id is unchanged; only its visual position shifts.

### 4.4 Empty state (zero sessions)

When `sessions.length === 0` the tab bar shows **one** tab: a special "Add section" tab (different visual: dashed border, `+ Add section` label, `role="tab"` but `aria-disabled="false"` with an `onClick` that calls `addSession`). The panel below shows a centred empty illustration (reuse `BookOpenIcon` + helper text from current lines 648-662). The trailing "Add session" tab **always** renders, even when sessions exist — so the teacher never has to hunt for the Add button.

### 4.5 Keyboard a11y

The tablist supports the WAI-ARIA Authoring Practices "tabs with manual activation" pattern:

| Key | Action |
|-----|--------|
| `ArrowRight` | Move focus + selection to next tab (wraps). |
| `ArrowLeft` | Move focus + selection to previous tab (wraps). |
| `Home` | Focus + select first tab. |
| `End` | Focus + select last tab (the "+ Add session" tab). |
| `Enter` / `Space` | Activate focused tab. (When focused on the "+ Add session" tab, activate = call `addSession`.) |
| `Delete` (when a session tab has focus) | Calls `removeSession(activeSessionId)` after a one-shot inline confirm ("Delete session? Undo"). |

Each tab carries `aria-controls={panelId}` pointing to the single panel `id="session-panel-{activeSessionId}"`. The panel carries `aria-labelledby={tabId}`. Focus order is enforced by setting `tabIndex={isActive ? 0 : -1}` on each tab. The `onKeyDown` handler on the tablist delegates to a single `handleTabKeyDown` function.

### 4.6 Per-tab controls (visual)

Each session tab (except the trailing "+ Add session" tab) is a rounded-2xl pill containing:

```
┌────────────────────────────────────────────────────────────┐
│  ● 1  Title or "Untitled session"            ⏱ 5 min · 2 blocks │
│                                            ↑ ↓ ⎘ 🗑           │
└────────────────────────────────────────────────────────────┘
```

- Left cluster: numbered badge + title + meta line.
- Right cluster: move-up, move-down, duplicate, delete icon buttons (same `ChevronLeftIcon rotate-90`, `ChevronRightIcon rotate-90`, `CardsIcon`, `TrashIcon` already used in the file).
- The whole pill is clickable and switches the active tab.
- The active tab uses `bg-white border-[#126db5]`; inactive uses `bg-slate-50 border-slate-200 hover:bg-white`.
- Truncated titles (`truncate` utility) keep long titles from blowing up the tab width; the full title appears in the panel header below.

## 5. Test strategy

All tests live in `frontend-web/src/**/*.test.ts(x)` and use **vitest + @testing-library/react + jsdom**. The canvas pipeline is mocked via dependency injection — no real canvas drawing in unit tests.

### 5.1 Flashcard dual-export tests

| Test file | Spec |
|-----------|------|
| `frontend-web/src/pages/admin/FlashcardEditor.test.tsx` (NEW) | (a) Renders two preview cards labelled "Clean" and "With QR" when an image is selected. (b) Clicking "Download clean" calls `URL.createObjectURL` with a blob whose type starts with `image/png` and whose filename ends `.png` (no `_qr` suffix). (c) Clicking "Download with QR" calls it with a filename ending `_qr.png`. (d) Clicking "Download both" calls `createObjectURL` twice — once for clean, once for QR. (e) When `qrId` is empty, both download buttons are disabled. (f) When `imageUrl` is empty, both download buttons are disabled. (g) The `renderCardToCanvas` helper, when called with `includeQr: false`, does **not** call the `qrCanvas.drawImage` path (spy on a stub `qrCanvas`). |
| `frontend-web/src/pages/admin/FlashcardEditor.test.tsx` | (h) Clicking "Upload clean" calls `adminFlashcardsApi.uploadFlashcardImage(qrId, 'clean', blob)`. (i) On a successful upload, the response URL is stored in component state and the "thumbnail once uploaded" preview shows. (j) An upload error surfaces in the existing `error` banner. |
| `frontend-web/src/services/adminApi.test.ts` (NEW if absent; extend otherwise) | (k) `uploadFlashcardImage` builds the correct `multipart/form-data` body and posts to `/api/v1/admin/flashcards/cards/{qrId}/image-upload`. |

**Mocking strategy:** inject a stub renderer into the component via a refactored `useFlashcardExport()` hook that exposes `renderCardToCanvas`, `downloadBlob`, `uploadImage`. In production it delegates to the real helpers; in tests it returns deterministic `Blob(['png-bytes'])` payloads. This avoids jsdom's incomplete `<canvas>` polyfill and lets us assert the **plumbing** (button → handler → upload call) without depending on actual pixel data.

For the pure helper itself (no React), a separate `renderCardToCanvas.test.ts` (NEW) can run in a **node** environment using the `canvas` npm package (`pnpm add -D canvas` is **only** added if a maintainer approves — otherwise the helper is exercised via the stub in tests and via a one-off manual screenshot in the smoke check).

### 5.2 Section UX tests

| Test file | Spec |
|-----------|------|
| `frontend-web/src/pages/admin/CourseEditor.test.tsx` (NEW) | (a) Renders one tab per `sessions[]` entry, plus a trailing "Add session" tab. (b) Clicking a tab updates `aria-selected="true"` for that tab and renders its panel. (c) Pressing `ArrowRight` on the tablist moves focus and selection to the next tab; `ArrowLeft` does the reverse. (d) Pressing `End` focuses the last tab (the Add-session tab); pressing `Enter` on it calls `addSession`. (e) When `sessions.length === 0`, only the "Add section" tab is rendered and the empty-state panel is visible. (f) Clicking Duplicate on a tab inserts a copy immediately after it and switches the active tab to the copy. (g) Clicking Delete on the active tab removes the session; if it was the only one, the empty state appears. (h) Clicking Move-up on tab N swaps entries N and N-1; the active tab id is preserved. |
| `frontend-web/src/pages/admin/CourseEditor.test.tsx` | (i) The block editor inside the active panel still adds text/video/image blocks and the `sessionToLesson` payload is unchanged (regression guard via snapshot of `saveCourse('draft')` payload). |

### 5.3 Backend smoke

`backend/api/admin.py` does not have unit tests in this plan (out of scope), but the implementer must:

1. Manually `curl -F variant=clean -F file=@./sample.png http://localhost:8000/api/v1/admin/flashcards/cards/apple_001/image-upload` after starting the backend and confirm a Supabase URL is returned and the document is updated.
2. Re-run the existing admin flashcard endpoints (`GET /admin/flashcards/decks/{id}/cards`) and confirm the response now includes `image_clean_url` and `image_qr_url` (both `null` for legacy cards).

## 6. Risk register

| # | Risk | Probability | Impact | Mitigation |
|---|------|-------------|--------|------------|
| 1 | Beanie rejects a `Document` field not declared on the class when documents are loaded with that field present (forward compat) | Low | High | Pydantic / Beanie by default allow extra fields; explicit `model_config = Config.extra = "allow"` is added to `Flashcard` and `FlashcardDocument`. The new fields default to `None`. We never read from them on legacy paths. |
| 2 | Supabase Storage rejects PNGs because of a missing bucket or wrong path scheme | Medium | High | New `FlashcardImageService.upload` mirrors the exact bucket/path conventions used by `lesson_media_service` and `generate_course_media`. Local dev fallback (`/assets/{path}`) keeps the rest of the app working when env vars are missing. The implementer runs the smoke curl in §5.3 to confirm. |
| 3 | Canvas `toBlob` produces tainted output (security origin) | Medium | Medium | `loadImage` already sets `crossOrigin = 'anonymous'` for `https?:` URLs. The hidden `<QRCodeCanvas>` is rendered from a `value` string (no network call), so no taint risk from the QR. We add an explicit `try/catch` around `toBlob` and surface a clear error. |
| 4 | User uploads clean but forgets QR (or vice versa) — card looks wrong on the learner side | Medium | Medium | The submit handler **never** clears the other variant's URL when one is uploaded. The empty-slot UI is visually distinct from the filled-slot UI ("not uploaded" label). The checklist in the aside of `CourseEditor` is unchanged — this is admin-side, so the teacher sees the state directly. |
| 5 | Tab UX feels cramped with 10+ sessions on mobile | Medium | Medium | Tab pills are horizontally scrollable (`overflow-x-auto` + `snap-x`). The active tab is `scrollIntoView({ inline: 'center' })` whenever `activeSessionId` changes. The trailing "Add session" tab is always visible by `flex-shrink-0`. |

## 7. Out of scope

- Drag-and-drop reordering of session tabs (planned as a stretch; not in MVP).
- Multi-user collaboration / live cursors.
- Batch import of flashcards (CSV / JSON / QR scan).
- Server-side rendering of the PNG (would require adding a Pillow dependency on the backend; explicitly excluded).
- Vector-search reindex triggered by image URL changes (the existing `vector_embedding` is generated from text only and is unaffected).
- Changing the learner-facing `Flashcard.tsx` component.
- Adding a new Supabase bucket. We reuse the existing `learnar-assets` bucket (`settings.LEARNAR_ASSETS_BUCKET`).
- Removing or renaming `image_url`. Legacy readers still depend on it.
- Building a 3D AR preview of the card.

## 8. Acceptance criteria

A reviewer must be able to tick every box before the implementation is considered done.

### 8.1 Flashcard dual export

- [ ] `FlashcardEditor.tsx` renders two preview cards labelled "Clean" and "With QR" once an image is uploaded.
- [ ] "Download clean" produces a PNG named `<qr-id>.png` with no QR badge in the rendered region (604,38 → 762,196 is the background gradient, no white square, no QR pixels).
- [ ] "Download with QR" produces a PNG named `<qr-id>_qr.png` with the QR badge baked in (identical to the existing single-export output).
- [ ] "Download both" triggers both downloads without any upload call.
- [ ] "Upload clean" calls `POST /api/v1/admin/flashcards/cards/{qrId}/image-upload` with `variant=clean` and a PNG blob.
- [ ] "Upload with QR" calls the same endpoint with `variant=qr`.
- [ ] After a successful upload, the field in `Flashcard` / `FlashcardDocument` for the matching variant is persisted to MongoDB and the local preview shows a thumbnail.
- [ ] On `Save Flashcard`, the request body for `FlashcardCreate` / `FlashcardUpdate` includes `image_clean_url` / `image_qr_url` only when populated; never with empty strings.
- [ ] Legacy flashcards (loaded in card-edit mode) display their existing `image_url` thumbnail without crashing.
- [ ] `backend/models/flashcard.py::Flashcard.Settings.indexes` is byte-identical to before (no new index, no removed index).
- [ ] `backend/models/admin_models.py::FlashcardDocument.Settings.indexes` is byte-identical to before.
- [ ] Both download buttons and both upload buttons are disabled when `qrId` is empty or `imageUrl` is empty.
- [ ] All existing flashcard creation/editing flows (`/admin/flashcards/new-deck`, `/admin/flashcards/:deckId/new`, `/admin/flashcards/:deckId/:cardId/edit`) still work without a regression.

### 8.2 Section UX

- [ ] The "Learning sessions" section displays a horizontal tab strip with one tab per session plus a trailing "+ Add session" tab.
- [ ] The block editor (title, duration, goal, text/video/image blocks, Vietnamese details) only renders for the active session.
- [ ] Pressing `ArrowRight` / `ArrowLeft` on the tablist moves both focus and selection; pressing `Home` / `End` jumps to the first/last tab.
- [ ] Clicking Duplicate on a tab inserts a copy directly after it and the new copy becomes active.
- [ ] Clicking Delete on the active tab removes it; if it was the only one, the empty state appears.
- [ ] Move-up / Move-down on a tab swaps the session with its neighbour; the active tab id is preserved.
- [ ] When `sessions.length === 0`, exactly one "Add section" tab is rendered and the empty-state panel is visible.
- [ ] Save draft / Publish course continue to call `adminCoursesApi.createCourse` / `updateCourse` with the same payload shape (regression guard).

### 8.3 Quality gates

- [ ] All new vitest specs pass (`pnpm vitest run` from `frontend-web/`).
- [ ] No new dependencies are added to `frontend-web/package.json` or `backend/requirements.txt`.
- [ ] No new lines are added to either Beanie `Settings.indexes`.
- [ ] The two Beanie documents (`Flashcard` in `backend/models/flashcard.py`, `FlashcardDocument` in `backend/models/admin_models.py`) remain loadable on documents that do not have the new fields.

## 9. Task breakdown

Each task is independently committable; reviewers can pass task N before N+1 begins.

### Task 1 — Backend Pydantic + Beanie field additions

**Files:** `backend/models/flashcard.py`, `backend/models/admin_models.py`
**Functions / changes:** Add `image_clean_url: Optional[str] = None` and `image_qr_url: Optional[str] = None` to `Flashcard` (Document), `FlashcardCreate`, `FlashcardUpdate`, `FlashcardResponse`, `FlashcardSchema` in `flashcard.py`; symmetrically on `FlashcardDocument`, `AdminFlashcardCreate`, `AdminFlashcardUpdate`, `AdminFlashcardResponse` in `admin_models.py`. **Do not modify `Settings.indexes`** in either document. Add `class Config: extra = "allow"` (Beanie `Settings` already uses `populate_by_name` patterns — confirm with existing style) only if needed to load legacy docs without error.
**Reviewer check:** `git diff` shows new optional fields, no index changes, no breaking type changes; running `python -c "from models.flashcard import Flashcard, FlashcardCreate; print(FlashcardCreate.model_fields['image_clean_url'])"` returns `Optional[str]`.

### Task 2 — Frontend type additions

**Files:** `frontend-web/src/types/admin.ts`
**Functions / changes:** Extend `Flashcard` (line ~152), `FlashcardCreate` (line ~169), `FlashcardUpdate` (line ~183) with `image_clean_url?: string` and `image_qr_url?: string`. Run `pnpm tsc --noEmit` to confirm no downstream breakage.
**Reviewer check:** TypeScript build clean; learners of these types (search via `Grep "FlashcardCreate"` in `frontend-web/src`) compile.

### Task 3 — Supabase upload service (backend)

**Files:** `backend/services/flashcard_image_service.py` (NEW), `backend/services/flashcard_service.py` (add `update_image_urls`)
**Functions / changes:** Implement `FlashcardImageService.upload(file_content, qr_id, variant, teacher_id) -> str` mirroring `lesson_media_service.upload_media`. Build path `flashcards/{teacher_id}/{qr_id}_{variant}.png`. POST to `{SUPABASE_URL}/storage/v1/object/{LEARNAR_ASSETS_BUCKET}/{path}` using `urllib.request`. Fallback to `/assets/{path}` when env vars missing. Expose `get_flashcard_image_service()` factory. Add `FlashcardService.update_image_urls(qr_id, image_clean_url=None, image_qr_url=None) -> Dict[str, Any]` that delegates to the new repository method.
**Reviewer check:** Manual `curl` against the dev backend uploads a sample PNG and returns a public URL (logged in the smoke check §5.3).

### Task 4 — Repository update + admin endpoint

**Files:** `backend/repositories/flashcard_repository.py`, `backend/api/admin.py`
**Functions / changes:** Add `FlashcardRepository.set_image_urls(qr_id, image_clean_url=None, image_qr_url=None) -> bool` that does a single `update_one({qr_id}, {"$set": {...filtered non-None keys...}})`. Add `POST /admin/flashcards/cards/{qr_id}/image-upload` to `admin.py` accepting `variant: Literal["clean","qr"]`, `file: UploadFile`. Returns `{public_url, image_clean_url, image_qr_url, qr_id}`. Reject `variant` outside the literal set with `HTTPException(400)`. The endpoint must be inserted **before** any `@router.get("/{qr_id}")` wildcard.
**Reviewer check:** `curl -F variant=clean -F file=@./sample.png ...` returns 200 with a `public_url`; the document's `image_clean_url` is non-null in MongoDB; the other field (`image_qr_url`) is untouched.

### Task 5 — Frontend adminApi helper

**Files:** `frontend-web/src/services/adminApi.ts`
**Functions / changes:** Add `adminFlashcardsApi.uploadFlashcardImage(qrId: string, variant: 'clean' | 'qr', file: Blob): Promise<{ public_url: string; image_clean_url: string; image_qr_url: string; qr_id: string }>`. Use `FormData` + `apiClient.post(...)` with `Content-Type: multipart/form-data`. Forward the response verbatim.
**Reviewer check:** A vitest spec (`frontend-web/src/services/adminApi.test.ts`) confirms the request URL, method, and `FormData` body keys.

### Task 6 — Pure canvas render helper + tests

**Files:** `frontend-web/src/pages/admin/FlashcardEditor.tsx` (extract), `frontend-web/src/pages/admin/FlashcardEditor.test.tsx` (NEW)
**Functions / changes:** Move the body of the existing `handleDownloadArtwork` (lines 261-349) into a new module-private helper `renderCardToCanvas({ frontText, backText, image, background, qrCanvas, includeQr }) → Promise<Blob>`. Add a thin `triggerBrowserDownload(blob, filename)` helper. The existing `handleDownloadArtwork` is deleted (its UI affordance is replaced by two single-variant buttons).
**Reviewer check:** A vitest spec exercises `renderCardToCanvas` with a stubbed `qrCanvas` (a plain `HTMLCanvasElement` from jsdom) and asserts that when `includeQr=false`, no `drawImage(qrCanvas, …)` call is made; when `includeQr=true`, exactly one is.

### Task 7 — Wire dual-export into the editor UI

**Files:** `frontend-web/src/pages/admin/FlashcardEditor.tsx`
**Functions / changes:** Add new state (`imageCleanUrl`, `imageQrUrl`, `imageCleanLocalUrl`, `imageQrLocalUrl`, `isExporting`, `isUploadingClean`, `isUploadingQr`). Implement `handleExportBoth()`, `handleDownloadClean()`, `handleDownloadQr()`, `handleUploadClean()`, `handleUploadQr()` per §3.2-3.3. Update the preview aside per §3.5. Update `handleCardSubmit` to include the two new optional fields when populated. On `card-edit` mount, read `image_clean_url` / `image_qr_url` from the fetched card.
**Reviewer check:** Vitest spec covers the six handlers (download clean, download QR, download both, upload clean success/error, upload QR success/error). Manual smoke confirms both downloads and at least one upload.

### Task 8 — Section tabs in CourseEditor

**Files:** `frontend-web/src/pages/admin/CourseEditor.tsx`
**Functions / changes:** Replace the accordion `<article>` list (lines 664-895) with a tablist + single panel. Reuse existing `addSession`, `duplicateSession`, `removeSession`, `moveSession`, `addBlock`, `removeBlock`, `updateSession`, `updateBlock` unchanged. Add `handleTabKeyDown` for arrow / Home / End / Enter / Delete. Render the empty state when `sessions.length === 0` and the trailing "Add session" tab always.
**Reviewer check:** Vitest spec in `CourseEditor.test.tsx` covers keyboard nav, add/duplicate/delete/move, empty state, and regression on `sessionToLesson` payload.

### Task 9 — Section UX tests

**Files:** `frontend-web/src/pages/admin/CourseEditor.test.tsx` (NEW)
**Functions / changes:** Implement the test list in §5.2.
**Reviewer check:** All specs green; `pnpm vitest run src/pages/admin/CourseEditor.test.tsx` passes.

### Task 10 — Documentation + final smoke

**Files:** none; manual checklist recorded in the PR description.
**Functions / changes:** Capture screenshots of the two flashcard previews + tab strip into the PR; record the `curl` smoke results; tick every box in §8.
**Reviewer check:** PR description has the screenshot grid, smoke transcripts, and the §8 acceptance checklist ticked.

---

**End of plan.**