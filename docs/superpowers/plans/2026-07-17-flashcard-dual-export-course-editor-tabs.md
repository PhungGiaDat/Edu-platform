# Flashcard Dual-Export + CourseEditor Tab Switcher

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two flashcard export files (with/without QR) + complete the CourseEditor segmented tab switcher.

**Architecture:**
1. **Flashcard dual-export:** MongoDB schema unchanged — no new `image_with_qr_url` field. Instead, `image_url` stores the clean PNG, and `qr_id` is used to render QR on-demand for print. The canvas-based artwork renderer already generates two PNGs client-side; this plan wires them through Supabase Storage to MongoDB. The design is: Canvas export → Supabase upload → save `image_url` (clean PNG) to MongoDB. QR is always generated at render time, never stored.
2. **CourseEditor tab switcher:** The segmented `Details / Sessions / Review` nav and view state were partially implemented (type + state added, UI not wired). This plan completes the wiring so the three-tab interface actually renders the correct content for each tab.

**Tech Stack:** React + TypeScript (frontend), FastAPI + Beanie/MongoDB + Supabase Storage (backend), Canvas API (artwork generation)

---

## Global Constraints

- MongoDB schema must NOT change (no `image_with_qr_url` field in flashcards)
- QR code is rendered client-side at view time, never stored server-side
- Flashcard `image_url` stores the clean PNG (without QR overlay)
- Existing TypeScript types in `frontend-web/src/types/admin.ts` must stay backward-compatible
- Backend schema types in `backend/models/admin_models.py` must stay backward-compatible
- All existing tests must pass after changes

---

## Task 1: Backend — Supabase flashcard image upload + dual-export support

**Files:**
- Create: `backend/services/flashcard_upload_service.py`
- Modify: `backend/api/admin.py` (add upload endpoints)

**Interfaces:**
- Consumes: `image_without_qr: bytes`, `image_with_qr: bytes`, `qr_id: str`, `deck_id: str`
- Produces: `{ "image_url": str, "image_with_qr_url": str }`

**Steps:**

- [ ] **Step 1: Create `backend/services/flashcard_upload_service.py`**

```python
# backend/services/flashcard_upload_service.py
"""
Flashcard Image Upload Service
Handles dual PNG export: clean + QR-overlaid.
Storage: Supabase Storage (same bucket as lesson media).
MongoDB: Only image_url (clean PNG) is saved — QR is always rendered client-side.
"""
import logging
import uuid
from settings import settings
import httpx

logger = logging.getLogger(__name__)


class FlashcardUploadService:
    BUCKET = "learnar-assets"
    FLASHcardS_FOLDER = "flashcards"

    def __init__(self):
        self.supabase_url = settings.SUPABASE_URL
        self.supabase_key = settings.SUPABASE_SERVICE_ROLE_KEY

    def _storage_path(self, qr_id: str, suffix: str) -> str:
        """Build Supabase Storage path: flashcards/<qr_id>/<qr_id>[_qr].png"""
        return f"{self.FLASHCARDS_FOLDER}/{qr_id}/{qr_id}{suffix}.png"

    async def upload_dual_images(
        self,
        image_without_qr: bytes,
        image_with_qr: bytes,
        qr_id: str,
    ) -> dict:
        """
        Upload both PNG variants to Supabase Storage.

        Returns:
            {"image_url": "...", "image_with_qr_url": "..."}
            Both URLs are Supabase public URLs.
            image_url → clean PNG (saved to MongoDB)
            image_with_qr_url → QR-overlaid PNG (for print reference, NOT saved to MongoDB)
        """
        clean_path = self._storage_path(qr_id, "")
        qr_path = self._storage_path(qr_id, "_qr")

        image_url = None
        image_with_qr_url = None

        if self.supabase_url and self.supabase_key:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {self.supabase_key}",
                    "Content-Type": "image/png",
                }
                # Upload clean PNG
                try:
                    r = await client.put(
                        f"{self.supabase_url}/storage/v1/object/{self.BUCKET}/{clean_path}",
                        content=image_without_qr,
                        headers=headers,
                    )
                    r.raise_for_status()
                    image_url = f"{self.supabase_url}/storage/v1/object/public/{self.BUCKET}/{clean_path}"
                except Exception as e:
                    logger.error(f"[FlashcardUpload] Clean image upload failed: {e}")
                    raise

                # Upload QR-overlaid PNG
                try:
                    r = await client.put(
                        f"{self.supabase_url}/storage/v1/object/{self.BUCKET}/{qr_path}",
                        content=image_with_qr,
                        headers=headers,
                    )
                    r.raise_for_status()
                    image_with_qr_url = f"{self.supabase_url}/storage/v1/object/public/{self.BUCKET}/{qr_path}"
                except Exception as e:
                    logger.warning(f"[FlashcardUpload] QR image upload failed (non-fatal): {e}")
                    image_with_qr_url = None
        else:
            # Local fallback — serve from static
            image_url = f"/static/{clean_path}"
            image_with_qr_url = f"/static/{qr_path}"

        return {
            "image_url": image_url,
            "image_with_qr_url": image_with_qr_url,
        }


def get_flashcard_upload_service() -> FlashcardUploadService:
    return FlashcardUploadService()
```

- [ ] **Step 2: Add upload endpoints to `backend/api/admin.py`**

Add these imports after existing imports (around line 9):

```python
from services.flashcard_upload_service import get_flashcard_upload_service
```

Add new endpoints after the existing flashcard DELETE endpoint (after line 381):

```python
@router.post(
    "/flashcards/upload-image",
    status_code=status.HTTP_201_CREATED,
    summary="Upload flashcard artwork (dual PNG: clean + QR)",
)
async def upload_flashcard_image(
    qr_id: str = Query(..., description="Flashcard QR ID (must match the card being created/edited)"),
    repo: AdminRepository = Depends(get_admin_repo),
):
    """
    Accept base64-encoded PNG bytes and upload both variants to Supabase Storage.

    Request body (multipart/form-data):
      - image_without_qr: bytes — clean card PNG (no QR overlay)
      - image_with_qr: bytes — card PNG with QR overlay

    Returns:
        {"image_url": "...", "image_with_qr_url": "..."}

    Note: Only `image_url` (clean PNG) should be saved to MongoDB.
    The `image_with_qr_url` is returned for reference/debugging.
    QR is always rendered client-side at view time.
    """
    from fastapi import File, UploadFile
    import base64

    logger.info(f"[Admin] POST /admin/flashcards/upload-image?qr_id={qr_id}")

    # Read multipart parts
    async def read_file(f: UploadFile) -> bytes:
        content = await f.read()
        return content

    # This endpoint will be called with multipart — use File() params
    # We parse the raw body for base64 for simplicity:
    # Frontend sends JSON: {"image_without_qr_b64": "...", "image_with_qr_b64": "..."}
    return {"message": "endpoint stub — implement multipart parsing per FastAPI File() pattern"}
```

**Alternative approach (simpler JSON body):** Replace the above with a JSON endpoint that accepts base64-encoded images:

```python
@router.post(
    "/flashcards/upload-image",
    status_code=status.HTTP_201_CREATED,
    summary="Upload flashcard artwork (dual PNG: clean + QR)",
)
async def upload_flashcard_image(
    request: Request,
    qr_id: str = Query(..., description="Flashcard QR ID"),
    service=Depends(get_flashcard_upload_service),
):
    """
    Request body (JSON):
    {
        "image_without_qr_b64": "base64-encoded PNG bytes",
        "image_with_qr_b64": "base64-encoded PNG bytes (optional — non-fatal if missing)"
    }
    """
    import base64

    body = await request.json()
    b64_clean = body.get("image_without_qr_b64", "")
    b64_qr = body.get("image_with_qr_b64", "")

    if not b64_clean:
        raise HTTPException(status_code=400, detail="image_without_qr_b64 is required")

    try:
        image_clean = base64.b64decode(b64_clean)
        image_qr = base64.b64decode(b64_qr) if b64_qr else image_clean
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image data")

    if len(image_clean) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image exceeds 10 MB limit")
    if len(image_qr) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="QR image exceeds 10 MB limit")

    result = await service.upload_dual_images(image_clean, image_qr, qr_id)
    return result
```

- [ ] **Step 3: Run existing backend tests**

Run: `cd backend && python -m pytest tests/ -v -k "flashcard" --tb=short 2>&1 | head -50`
Expected: All existing flashcard tests pass.

- [ ] **Step 4: Commit**

```bash
git add backend/services/flashcard_upload_service.py backend/api/admin.py
git commit -m "feat(admin): add flashcard dual-PNG upload to Supabase Storage"
```

---

## Task 2: Frontend — FlashcardEditor: upload to backend instead of only downloading

**Files:**
- Modify: `frontend-web/src/pages/admin/FlashcardEditor.tsx` (update `handleCardSubmit` + add upload step)

**Interfaces:**
- Consumes: `qrId`, `frontText`, `backText`, `imageUrl` (data URL), `arModelUrl`
- Produces: After canvas generates and uploads both PNGs, submit `image_url` (clean PNG) to MongoDB

**Steps:**

- [ ] **Step 1: Add `adminFlashcardsApi.uploadFlashcardImage` to `frontend-web/src/services/adminApi.ts`**

Add after the `adminFlashcardsApi` block (around line 237):

```typescript
async uploadFlashcardImage(
  qrId: string,
  imageWithoutQrB64: string,
  imageWithQrB64: string,
): Promise<{ image_url: string; image_with_qr_url?: string }> {
  try {
    const response = await apiClient.post(
      `${ADMIN_BASE_URL}/flashcards/upload-image`,
      { image_without_qr_b64: imageWithoutQrB64, image_with_qr_b64: imageWithQrB64 },
      { params: { qr_id: qrId } }
    );
    return response as { image_url: string; image_with_qr_url?: string };
  } catch (error) {
    console.error('[adminFlashcardsApi.uploadFlashcardImage] Error:', error);
    throw error;
  }
}
```

- [ ] **Step 2: Refactor `handleCardSubmit` in `FlashcardEditor.tsx`**

Current flow: only saves card metadata to MongoDB (no image upload).

New flow:
1. If user selected a local file → generate both canvas PNGs (already implemented in `handleDownloadArtwork`)
2. Upload both to backend (new `uploadFlashcardImage` call)
3. Replace `imageUrl` (data URL) with the returned `image_url` (Supabase URL) before submitting to MongoDB

**In `FlashcardEditor.tsx`, find the `handleCardSubmit` function and replace the `card-mode` section:**

```typescript
const handleCardSubmit = async (event: React.FormEvent) => {
  event.preventDefault();
  setError(null);
  if (!validateCard()) return;

  let finalImageUrl = imageUrl;

  // If image is a local file (data URL), generate + upload both PNGs
  if (imageUrl.startsWith('data:')) {
    setIsSubmitting(true);
    try {
      // 1. Generate both canvas exports (same logic as handleDownloadArtwork but no download)
      const qrCanvas = qrExportRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
      if (!qrCanvas) {
        setError('The QR preview is not ready yet.');
        setIsSubmitting(false);
        return;
      }

      const [cardImage, backgroundImage] = await Promise.all([
        loadImage(imageUrl),
        loadImage(FLASHCARD_BACKGROUND_URL).catch(() => null),
      ]);

      const canvas = document.createElement('canvas');
      canvas.width = CARD_WIDTH;
      canvas.height = CARD_HEIGHT;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Your browser could not create the card image.');

      const artwork: CardArtwork = {
        cardImage,
        backgroundImage,
        frontText: frontText.trim(),
        backText: backText.trim(),
      };

      // Export #1: clean card
      drawCardBase(context, artwork);
      const cleanBlob = await canvasToPng(canvas);
      const cleanBase64 = await blobToBase64(cleanBlob);

      // Export #2: with QR overlay
      drawQrOverlay(context, qrCanvas);
      const qrBlob = await canvasToPng(canvas);
      const qrBase64 = await blobToBase64(qrBlob);

      // 2. Upload to backend
      const uploadResult = await adminFlashcardsApi.uploadFlashcardImage(
        qrId.trim(),
        cleanBase64,
        qrBase64,
      );

      // Use the Supabase URL (clean PNG) for MongoDB
      finalImageUrl = uploadResult.image_url;
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload flashcard image.');
      setIsSubmitting(false);
      return;
    }
  }

  setIsSubmitting(true);

  const translation = { en: frontText.trim(), vi: backText.trim() };

  try {
    if (mode === 'card-new' && deckId) {
      const data: FlashcardCreate = {
        qr_id: qrId.trim(),
        word: frontText.trim(),
        translation,
        image_url: finalImageUrl,
        ar_model_url: arModelUrl.trim() || undefined,
      };
      await adminFlashcardsApi.createFlashcard(deckId, data);
    } else if (mode === 'card-edit' && deckId && cardId) {
      const data: FlashcardUpdate = {
        word: frontText.trim(),
        translation,
        image_url: finalImageUrl,
        ar_model_url: arModelUrl.trim() || undefined,
      };
      await adminFlashcardsApi.updateFlashcard(cardId, data);
    }
    navigate(`/admin/flashcards/${deckId}`);
  } catch (submitError) {
    setError(submitError instanceof Error ? submitError.message : 'Failed to save flashcard');
  } finally {
    setIsSubmitting(false);
  }
};
```

**Also add this helper at the top of the component file (after the `loadImage` function):**

```typescript
const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.replace(/^data:image\/\w+;base64,/, ''));
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
```

- [ ] **Step 3: Typecheck and lint**

Run: `cd frontend-web && npx tsc --noEmit 2>&1`
Run: `cd frontend-web && npx eslint src/pages/admin/FlashcardEditor.tsx src/services/adminApi.ts 2>&1`
Expected: Both pass.

- [ ] **Step 4: Commit**

```bash
git add frontend-web/src/pages/admin/FlashcardEditor.tsx frontend-web/src/services/adminApi.ts
git commit -m "feat(flashcard): upload canvas PNGs to Supabase on submit"
```

---

## Task 3: CourseEditor — ensure segmented switcher is fully wired and no unused variables remain

**Files:**
- Modify: `frontend-web/src/pages/admin/CourseEditor.tsx`

**Context:** A previous partial implementation added `CourseView`, `COURSE_VIEWS`, and `view`/`setView` state. The segmented nav UI and `{view === 'details'}`, `{view === 'sessions'}`, `{view === 'review'}` conditional rendering blocks were added in a previous session. Verify the file is clean — no unused `view`/`setView` declarations.

**Interfaces:**
- Consumes: `view` state, `COURSE_VIEWS` config, `setView` setter
- Produces: Three-tab interface (Details / Sessions / Review)

**Steps:**

- [ ] **Step 1: Verify `CourseEditor.tsx` is fully wired**

Read `frontend-web/src/pages/admin/CourseEditor.tsx` and confirm:
- `const [view, setView] = useState<CourseView>('details')` exists (around line 173)
- `<nav aria-label="Course editor sections">` with three buttons using `setView(courseView.id)` exists
- `{view === 'details' && (` wraps the Course setup section
- `{view === 'sessions' && (` wraps the Learning sessions section
- `{view === 'review' && (` wraps the Review section
- All three conditionals are closed with `)}`
- The right-hand `<aside>` (cover preview + checklist) is outside the `<main>` and renders regardless of view

**If any part is missing, add the missing piece:**

1. **Nav (after error div, before the grid div):**
```tsx
<nav
  aria-label="Course editor sections"
  className="mb-6 flex flex-wrap gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_8px_30px_rgba(30,64,175,0.06)]"
>
  {COURSE_VIEWS.map((courseView) => {
    const isActive = view === courseView.id;
    return (
      <button
        key={courseView.id}
        type="button"
        onClick={() => setView(courseView.id)}
        aria-current={isActive ? 'page' : undefined}
        className={`flex min-h-11 flex-1 flex-col items-start justify-center rounded-xl px-4 py-2 text-left transition ${
          isActive
            ? 'bg-[#126db5] text-white shadow-sm'
            : 'text-slate-700 hover:bg-slate-50 active:translate-y-px'
        }`}
      >
        <span className="text-sm font-bold">{courseView.label}</span>
        <span className={`text-xs ${isActive ? 'text-blue-50' : 'text-slate-500'}`}>
          {courseView.help}
        </span>
      </button>
    );
  })}
</nav>
```

2. **Wrap details section:** Find the `<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow...>` that starts the Course setup form and wrap it with `{view === 'details' && ( ... )}`.

3. **Wrap sessions section:** Find the `<section>` that starts the Learning sessions section and wrap it with `{view === 'sessions' && ( ... )}`.

4. **Wrap review section:** Add a `{view === 'review' && ( ... )}` block between the sessions section closing `</section>` and `</main>`.

5. **Add `CheckCircleIcon` to imports** if not already present.

- [ ] **Step 2: Remove unused import if `CheckCircleIcon` was added but is already imported**

Run: `cd frontend-web && npx tsc --noEmit 2>&1`
Expected: Typecheck passes with no unused variable warnings.

- [ ] **Step 3: Run linter**

Run: `cd frontend-web && npx eslint src/pages/admin/CourseEditor.tsx 2>&1`
Expected: No ESLint errors.

- [ ] **Step 4: Commit**

```bash
git add frontend-web/src/pages/admin/CourseEditor.tsx
git commit -m "feat(course-editor): complete segmented tab switcher (details/sessions/review)"
```

---

## Task 4: Production build verification

**Files:**
- None (verification only)

**Steps:**

- [ ] **Step 1: Run full frontend build**

Run: `cd frontend-web && npm run build 2>&1`
Expected: Build succeeds. Warnings about three-vendor chunk size are pre-existing and unrelated.

- [ ] **Step 2: Run backend tests**

Run: `cd backend && python -m pytest tests/ -v --tb=short 2>&1 | tail -30`
Expected: All tests pass (or pre-existing failures only).

- [ ] **Step 3: Commit verification**

```bash
git commit -m "chore: verify build passes after flashcard dual-export + course editor"
```

---

## Verification Checklist

After all tasks:

- [ ] `CourseEditor.tsx` renders a 3-tab segmented control (Details / Sessions / Review)
- [ ] Each tab shows the correct content when active
- [ ] `FlashcardEditor.tsx` uploads both canvas PNGs to Supabase on submit, then saves `image_url` to MongoDB
- [ ] `FlashcardEditor` still supports "Download images" for local PNG files (unchanged)
- [ ] MongoDB schema unchanged (no `image_with_qr_url` field in flashcards)
- [ ] `npm run build` passes on `frontend-web`
- [ ] Backend tests pass on `backend`
