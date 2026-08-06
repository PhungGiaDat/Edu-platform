# AR Persistent Viewer Test Runbook

> This runbook documents manual and automated verification steps for the Shared-Mind
> Persistent Viewer feature (Tasks 7–11 of the MindAR-Update branch).

---

## Deployment Info

| Field | Value |
|-------|-------|
| **Branch** | `MindAR-Update` |
| **Commit** | `d031fed2646a308ee40f64ee7e46fb0369c4be31` |
| **Feature Flag** | `VITE_PERSISTENT_MIND_VIEWER=true` |
| **Deployed URL** | `https://your-frontend-url.vercel.app` |
| **Backend URL** | `https://your-backend-url.onrender.com` |

---

## Catalog Under Test

| Field | Value |
|-------|-------|
| **Catalog ID** | `animals-v2` |
| **Mind URL** | `/assets/target/catalogs/animals-v2.mind` |
| **Manifest SHA-256** | `0a43e0b170f887b302324739b686003f482c24e9b35e4cefee4bbb22ffc45884` |
| **Target Count** | `2` |
| **Targets** | `elephant_marker_01` (index 0), `shiba_marker_01` (index 1) |

### Manifest `animals-v2.manifest.json`

```json
{
  "schemaVersion": 1,
  "catalogId": "animals-v2",
  "mindUrl": "/assets/target/catalogs/animals-v2.mind",
  "targetCount": 2,
  "sha256": "0a43e0b170f887b302324739b686003f482c24e9b35e4cefee4bbb22ffc45884",
  "targets": [
    { "arTag": "elephant_marker_01", "mindTargetIndex": 0 },
    { "arTag": "shiba_marker_01", "mindTargetIndex": 1 }
  ]
}
```

---

## API Payload for Both Cards

### Elephant Card (`elephant_marker_01`, mindTargetIndex 0)

```json
{
  "_id": "elephant-card-id",
  "qr_id": "elephant_marker_01",
  "word": "Elephant",
  "ar_tag": "elephant_marker_01",
  "mindCatalogId": "animals-v2",
  "mindTargetIndex": 0,
  "mindUrl": "/assets/target/catalogs/animals-v2.mind",
  "model3dUrl": "/assets/models/elephant.glb",
  "image2dUrl": "/assets/model2d/elephant.jpg",
  "audio_url": "",
  "translation": { "en": "Elephant" },
  "category": "animals",
  "image_url": "https://example.com/elephant.jpg",
  "image_animation_type": "bounce",
  "difficulty": "easy",
  "created_at": "2026-01-01T00:00:00.000Z"
}
```

### Shiba Card (`shiba_marker_01`, mindTargetIndex 1)

```json
{
  "_id": "shiba-card-id",
  "qr_id": "shiba_marker_01",
  "word": "Shiba",
  "ar_tag": "shiba_marker_01",
  "mindCatalogId": "animals-v2",
  "mindTargetIndex": 1,
  "mindUrl": "/assets/target/catalogs/animals-v2.mind",
  "model3dUrl": "/assets/models/shiba.glb",
  "image2dUrl": "/assets/model2d/shiba.jpg",
  "audio_url": "",
  "translation": { "en": "Shiba" },
  "category": "animals",
  "image_url": "https://example.com/shiba.jpg",
  "image_animation_type": "wiggle",
  "difficulty": "easy",
  "created_at": "2026-01-01T00:00:00.000Z"
}
```

---

## Verification Steps

### Prerequisites

1. Ensure `VITE_PERSISTENT_MIND_VIEWER=true` is set in the environment.
2. Backend is running at `http://localhost:8000` (local) or your deployed URL.
3. Frontend is running at `http://localhost:5173` (local) or your Vercel URL.
4. Physical flashcards printed with the `animals-v2` QR codes, OR the MindAR companion app.

---

### iPhone Safari — Scan Order A (Elephant First)

**Device:** iPhone 13 Safari (or equivalent modern iOS device)
**Browser version:** Safari 17.x
**Camera permission:** Granted

1. Open Safari and navigate to `https://your-frontend-url.vercel.app/learn-ar`.
2. Grant camera permission when prompted.
3. Verify the page loads in **SCANNING** mode (camera feed visible).
4. Point the camera at the **elephant** flashcard.
   - The 3D elephant model should appear.
   - The viewer transitions to **VIEWING** mode.
   - Check the debug overlay:
     - `VIEWER_BOOTSTRAP_START`: **1** occurrence
     - `MINDAR_CONFIG_ACTIVE`: **1** occurrence
     - `ACTIVE_TARGETS_APPLIED`: **1** occurrence
     - `MULTI_MIND_PREPARE_STARTED`: **0** occurrences
     - `MULTI_MIND_MERGED`: **0** occurrences
5. Tap the **"+ Add card"** button (bottom-right).
6. A prompt appears: "Scan the second flashcard QR".
7. Point the camera at the **shiba** flashcard.
   - The 3D shiba model should appear alongside the elephant model.
   - **Verify the iframe was NOT reloaded** — the AR viewer overlay should not flash or reset.
   - Check the debug overlay again:
     - `VIEWER_BOOTSTRAP_START`: **1** (still — no new occurrence)
     - `MINDAR_CONFIG_ACTIVE`: **1** (still — MindAR did not restart)
     - `ACTIVE_TARGETS_APPLIED`: **2** (total — one per card activation)
     - `MULTI_MIND_PREPARE_STARTED`: **0** (never)
     - `MULTI_MIND_MERGED`: **0** (never)
     - `ADD_CARD_SCAN_STARTED`: **1** (the add-card flow fired)
8. **Capture screenshots** of both models visible simultaneously.

---

### iPhone Safari — Scan Order B (Shiba First)

**Device:** iPhone 13 Safari (or equivalent modern iOS device)
**Browser version:** Safari 17.x
**Camera permission:** Granted (already granted from previous test)

1. Open Safari and navigate to `https://your-frontend-url.vercel.app/learn-ar`.
2. If camera permission is already granted, it should auto-proceed.
3. Point the camera at the **shiba** flashcard first.
   - The 3D shiba model should appear.
   - Check debug labels: `VIEWER_BOOTSTRAP_START: 1`, `MINDAR_CONFIG_ACTIVE: 1`.
4. Tap **"+ Add card"**.
5. Scan the **elephant** flashcard.
   - Both models should appear; iframe should NOT reload.
   - `VIEWER_BOOTSTRAP_START: 1`, `MULTI_MIND_PREPARE_STARTED: 0`.

---

### Desktop Chrome — Scan Order A

**Device:** macOS / Windows desktop
**Browser:** Chrome 126+

1. Open Chrome and navigate to `http://localhost:5173/learn-ar`.
2. Open DevTools → **Console** tab.
3. Filter the console by `AR_DEBUG` to see debug labels.
4. Grant camera permission.
5. Scan the elephant card → verify model loads.
6. Click **"+ Add card"** → scan the shiba card.
7. Verify console shows:
   - `VIEWER_BOOTSTRAP_START` (1)
   - `MINDAR_CONFIG_ACTIVE` (1)
   - `ACTIVE_TARGETS_APPLIED` (2)
   - `ADD_CARD_SCAN_STARTED` (1)
   - `MULTI_MIND_PREPARE_STARTED` (0)
   - `MULTI_MIND_MERGED` (0)
8. Take a screenshot of the console showing all labels.

---

### Catalog Mismatch Test

**Purpose:** Verify that scanning a card with a wrong `mindCatalogId` is rejected without restarting the viewer.

**Setup:**
1. Navigate to `http://localhost:5173/learn-ar` (desktop Chrome recommended — easier to see console).
2. Grant camera permission.
3. In the network tab, mock a response for a fake QR code `wrong-cat-qr-id` that returns `mindCatalogId: "animals-v1"` (wrong catalog) instead of `"animals-v2"`.

**Steps:**
1. Scan the `wrong-cat-qr-id` card.
2. Observe: the AR viewer should **not restart**.
3. Check the console:
   - `FLASHCARD_CATALOG_REJECTED` appears
   - `VIEWER_BOOTSTRAP_START` count remains **1**
   - `MULTI_MIND_PREPARE_STARTED` count remains **0**
4. The UI should show a rejection toast/message (implementation-specific) without crashing the viewer.

---

### Deliberately Broken Model Test

**Purpose:** Verify that a missing or invalid 3D model triggers `ACTIVE_TARGETS_REJECTED` from the viewer, not a silent 2D image fallback.

**Setup:**
1. In the network tab, mock `elephant.glb` to return HTTP **404**.
2. Navigate to `http://localhost:5173/learn-ar`.
3. Scan the elephant card.

**Expected behavior:**
- The viewer emits `ACTIVE_TARGETS_REJECTED` with code `MODEL_LOAD_ERROR` or similar.
- The UI should show an error state or retry option.
- **NO** `showImageFallbackForTarget` call is invoked (confirmed by bootstrap contract test).
- `VIEWER_BOOTSTRAP_START` count remains **1** (viewer did not restart).

---

### Second Permission Prompt Test

**Purpose:** Confirm no second camera permission prompt occurs when scanning the second card.

**Steps:**
1. On mobile, grant camera permission once.
2. Scan elephant card → model loads.
3. Tap "+ Add card" → scan shiba card.
4. **Observe:** No second camera permission prompt appears.
5. Camera permission indicator in the browser address bar shows **granted** throughout.

---

## Expected Debug Label Counts

| Label | Scan Order A | Scan Order B | Notes |
|-------|-------------|-------------|-------|
| `VIEWER_BOOTSTRAP_START` | 1 | 1 | Viewer bootstraps once at the start |
| `MINDAR_CONFIG_ACTIVE` | 1 | 1 | MindAR starts once, never restarts |
| `ACTIVE_TARGETS_APPLIED` | 2 | 2 | Once per card activation (elephant + shiba) |
| `ADD_CARD_SCAN_STARTED` | 1 | 1 | The add-card flow fires once |
| `MULTI_MIND_PREPARE_STARTED` | 0 | 0 | Persistent path never triggers multi-mind merge |
| `MULTI_MIND_MERGED` | 0 | 0 | Same — no merge at all |
| `FLASHCARD_CATALOG_REJECTED` | 0 | 0 | Only fires in the catalog mismatch test |

---

## Automated Test Results

Run the following commands from `frontend-web/`:

```bash
# 1. Bootstrap contract tests (vitest)
npm test -- src/__tests__/arViewerBootstrapContract.test.ts

# 2. Playwright E2E tests
npm run test:e2e -- tests/e2e/persistent-mind-viewer.spec.ts
```

### Expected Bootstrap Contract Test Output

```
✓ bounds the CDN bootstrap and reports its script stages
✓ handles SET_ACTIVE_TARGETS message
✓ handles BEGIN_ADD_CARD_SCAN message
✓ applyActiveTargets does not call showImageFallbackForTarget on model error
✓ applyActiveTargets does not call showImageFallbackForTarget for slot 0 model error
✓ does not call MULTI_MIND_PREPARE_STARTED or MULTI_MIND_MERGED in persistent path

6 passed
```

### Expected Playwright E2E Output

```
 ✓ Persistent Mind Viewer — Scan Order A > VIEWER_BOOTSTRAP_START fires exactly once across two cards
 ✓ Persistent Mind Viewer — Scan Order B > same lifecycle counts regardless of scan order
 ✓ Catalog mismatch > scanning wrong-catalog card triggers FLASHCARD_CATALOG_REJECTED without viewer restart
 ✓ Contract assertions > flashcard API for elephant returns mindCatalogId and mindTargetIndex
 ✓ Contract assertions > flashcard API for shiba returns mindCatalogId and mindTargetIndex
 ✓ Contract assertions > manifest.json returns correct catalogId and targetCount

6 passed
```

---

## Troubleshooting

### `VIEWER_BOOTSTRAP_START` fires twice

**Cause:** The iframe is being recreated (key remount). Check `ARContainerV2.tsx` for any state change that causes the viewer iframe to remount.

**Fix:** Ensure the viewer iframe key is stable — it should only mount once when `initialPhase` transitions from SCANNING to VIEWING.

### `MULTI_MIND_PREPARE_STARTED` appears

**Cause:** The feature flag `VITE_PERSISTENT_MIND_VIEWER` is not set to `true`, causing LearnARV2 to fall back to the old multi-mind merge flow.

**Fix:** Set `VITE_PERSISTENT_MIND_VIEWER=true` in your environment variables and rebuild.

### `ACTIVE_TARGETS_APPLIED` never appears

**Cause:** The mock events (`simulateARReady`, `simulateTargetFound`) are not reaching the `ARContainerV2` message handler. The AR runtime simulation may need adjustment.

**Fix:** Verify that the Playwright `page.evaluate` calls post the messages correctly. In a real browser with actual AR, these events come from the `ar-viewer.html` iframe.

### Camera permission denied

**Cause:** The browser blocked camera access.

**Fix:** On mobile, tap the camera icon in the address bar and allow access. On desktop, click "Allow" in the browser's permission prompt.

### Models don't load

**Cause:** GLB files returning 404, or the MindAR `maxTrack` setting is too low.

**Fix:** Verify the mock routes return 200 for all GLB files. Check that `maxTrack=2` is set in the viewer URL parameters (ARContainerV2 sets this automatically for the persistent viewer).
