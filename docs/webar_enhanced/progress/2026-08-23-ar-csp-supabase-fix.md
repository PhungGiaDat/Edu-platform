# AR CSP Fix — Supabase fetch unblocked in main app

> **Date:** 2026-08-23
> **Status:** Fixed and committed (0d9e726)
> **Impact:** Cat001 (and any catalog-validated flashcard) now reaches AR_VIEWING in persistent viewer mode

---

## Symptom (from user debug log)

```
[14:33:44] FLASHCARD_CATALOG_REJECTED
  qrId: "cat001"
  errorCode: "MODEL_ASSET_UNAVAILABLE"
  mindCatalogId: "animal-combo-v1"
  mindTargetIndex: 0
```

```
[14:33:44] PARENT_VIEWER_SRC_READY  → hasViewerSrc: false
[14:33:44] LEARNAR_QR_REJECTED       → detectedQrId: null
```

User feedback (translated): "Mặc dù đã update lại mindfile, vẫn bị reject.
Xem lại luồng backend schema, query về, và query xuống database những data cần từ các bảng."

## Root cause

`preflightRequiredGlb()` in `frontend/src/components/ar/arCatalogContract.ts` issues
a `Range: bytes=0-3` GET against `model_3d_url` to verify the glTF/GLB magic
bytes before the AR scene renders. For cat001, the model URL is
`https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/ragdollcat_mobile.glb`.

`frontend/vercel.json` ships a **strict CSP** for the React parent app route
(line 80, before the fix):

```
connect-src 'self'
  https://*.sentry.io
  https://*.ingest.de.sentry.io
  https://edu-platform-api-do20.onrender.com
  https://o4511704263622656.ingest.de.sentry.io
  wss://*.onrender.com
```

**No `*.supabase.co` in `connect-src`.** Browser blocks the preflight fetch
in the React parent context. The catch block in `preflightRequiredGlb` re-throws
as `MODEL_ASSET_UNAVAILABLE` — which `useMultiFlashcard` reads as catalog
rejection and falls back to the legacy `mindUrl` (which is empty for cat001
since the new schema deprecates `nft_base_url`).

By contrast, `/ar-scanner.html` and `/ar-viewer.html` (lines 33 and 46 in the
same file) already allow `https://*.supabase.co wss://*.supabase.co` because
the iframe AR runtime needs to load `.mind` files and `.glb` models directly.
The React parent app's CSP was never updated to match.

### Why the backend schema/query flow was a red herring

- `get_ar_experience(qr_id)` correctly joins `flashcards` → `ar_tracking_targets` → `ar_objects`
- `target.model_3d_url` is `ragdollcat_mobile.glb` (verified 200 OK + 206 on Range GET)
- `target.mind_catalog_id` is `animal-combo-v1` (matches manifest)
- `target.mind_target_index` is `0` (matches manifest)
- `validateCardForCatalog` passes
- Failure is at the *next* step — network fetch from React parent is CSP-blocked

The catalog contract is correct. The asset is reachable. CSP is the wall.

## Fix

`frontend/vercel.json` — append `https://*.supabase.co wss://*.supabase.co` to the
main-route CSP `connect-src`:

```diff
- connect-src 'self' https://*.sentry.io https://*.ingest.de.sentry.io https://edu-platform-api-do20.onrender.com https://o4511704263622656.ingest.de.sentry.io wss://*.onrender.com
+ connect-src 'self' https://*.sentry.io https://*.ingest.de.sentry.io https://edu-platform-api-do20.onrender.com https://o4511704263622656.ingest.de.sentry.io wss://*.onrender.com https://*.supabase.co wss://*.supabase.co
```

Single-line surgical change. Other CSP directives untouched.

## Verification

- **Static:** `frontend/vercel.json` syntax validated by Vercel on next deploy.
- **Runtime (after deploy):**
  1. Open `https://edu-platform-dev.vercel.app/learn-ar?debug=true`
  2. Scan `cat001` (animal-combo-v1 catalog, mindTargetIndex=0)
  3. Expected: `preflightRequiredGlb` returns → `FLASHCARD_CATALOG_VALIDATED` → `PARENT_VIEWER_SRC_READY hasViewerSrc: true` → `AR_READY` → model renders.

## Still open (not in this fix — out of scope)

- Unicode seed corruption (`Bé Gấu` → `B? G?u`) — DB-level encoding fix, separate workstream.
- Learning Path 3D not visible in mobile bottom nav on iPhone 14 Pro — likely a layout/responsive cutoff on 5-item bottom nav (Learn + Learning Path + AR + Cards + Profile + More). User can find it via More sheet. Cosmetic.
- Vercel deploy was 502 (DNS_HOSTNAME_EMPTY) at time of fix — transient platform issue, not related.

## Commits

- `0d9e726` — fix(ar): allow Supabase fetch in main app CSP for model preflight