# 8th Wall AR Control Plane Consolidation — Design Spec

> **Spec type:** Architectural redesign  
> **User goal:** Fix camera handoff deadlock by removing scanner iframe, consolidating all Control Plane into React component  
> **Bug root cause:** `RELEASE_CAMERA` postMessage between parent and scanner iframe is unreliable — iframe can be stale after React re-render, causing the camera to never release and XR_BOOTING to never fire

---

## Context

`LearnAR8thWall.tsx` currently runs a 3-iframe architecture:

```
React Parent
├── ar-scanner.html iframe  (jsQR, getUserMedia camera)
│   └── postMessage RELEASE_CAMERA → SCANNER_CAMERA_RELEASED
└── ar-xr.html iframe       (8th Wall XR engine)

QR_DETECTED
    │
    ├─ fetch XR metadata (async, parallel)
    │
    └─ postMessage RELEASE_CAMERA (unreliable — iframe window can be stale)
         │
         └─ wait... (deadlock if scanner iframe loses its contentWindow)
```

**Problem:** `scannerReadyWindowRef.current` captures the scanner iframe's `contentWindow` at `SCANNER_READY`, but after `setPhase` triggers a React re-render, the stored `contentWindow` can become stale or the scanner iframe element may be recycled. The `RELEASE_CAMERA` message never reaches the scanner, camera is never released, XR_BOOTING never fires.

**Fix:** Remove the scanner iframe entirely. Scanner and React share the same runtime — no postMessage bridge needed. When QR is detected, scanner calls `stream.getTracks().forEach(t => t.stop())` directly.

---

## Target Architecture

```
┌─────────────────────────────────────────────────────┐
│                    LearnAR8thWall                    │
│                    CONTROL PLANE                     │
│                                                     │
│  phase           currentTarget   targetReady         │
│  cameraReleased  cameraReleasing  scanError        │
│  foundCards      qrDetected                           │
└─────────────────────────────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          ▼                             ▼
┌─────────────────────┐     ┌─────────────────────┐
│    QRScanner         │     │     ar-xr.html      │
│  (React component)  │     │       iframe        │
│                     │     │                     │
│  getUserMedia       │     │  XR8 engine         │
│  video element      │     │  SLAM tracking      │
│  jsQR loop          │     │  Three.js rendering │
│                     │     │                     │
│  QR found → stop() │     │  postMessage events │
│  stream.track.stop()│     │  XR_CAMERA_HAS_VIDEO│
│                     │     │  TARGET_FOUND        │
└─────────────────────┘     └─────────────────────┘
```

### State Machine (5 phases)

```
SCANNING
    │
    │ QR_DETECTED
    ▼
PREPARING
    │
    ├── target API response → TARGET_READY
    │
    └── scanner.stop() → CAMERA_RELEASED
            │
       both ready
            ▼
XR_BOOTING
    │
    | XR_CAMERA_HAS_VIDEO
    ▼
VIEWING
    │
    | error
    ▼
ERROR
```

### Phase Descriptions

| Phase | Scanner | XR iframe | Notes |
|---|---|---|---|
| `SCANNING` | active, video playing | unmounted | jsQR polling |
| `PREPARING` | stopping | unmounted | API fetch in flight |
| `XR_BOOTING` | stopped | mounted, loading | XR engine boots |
| `VIEWING` | stopped | mounted, live | `XR_CAMERA_HAS_VIDEO` received |
| `ERROR` | stopped | unmounted | scanAgain → SCANNING |

---

## Component Design

### `LearnAR8thWall.tsx` (refactor)

**Remove:**
- `scannerRef` — scanner is now a React component
- `scannerReadyWindowRef` — no iframe bridge needed
- `releaseRetryRef` — no retry logic for postMessage
- Phase `RELEASING_CAMERA` — eliminated; scanner stops itself
- `RELEASE_CAMERA` postMessage handling
- `SCANNER_READY`, `SCANNER_CAMERA_RELEASED` message handlers
- `handleSwitchToMindAR` — future work

**State:**
```ts
type Phase = 'SCANNING' | 'PREPARING' | 'XR_BOOTING' | 'VIEWING' | 'ERROR';

const [phase, setPhase] = useState<Phase>('SCANNING');
const [currentTarget, setCurrentTarget] = useState<XRTarget | null>(null);
const [scanError, setScanError] = useState<string | null>(null);
const [foundCards, setFoundCards] = useState<Set<string>>(new Set());
const [cameraReleased, setCameraReleased] = useState(false);
const [targetReady, setTargetReady] = useState(false);
```

**XR_BOOTING trigger (replaces SCANNER_CAMERA_RELEASED + RELEASING_CAMERA):**
```ts
useEffect(() => {
  if (phase === 'PREPARING' && targetReady && cameraReleased && currentTarget) {
    setPhase('XR_BOOTING');
  }
}, [phase, targetReady, cameraReleased, currentTarget]);
```

**New callback — called by QRScanner when QR detected:**
```ts
const handleQRDetected = useCallback(async (qrId: string) => {
  if (foundCards.has(qrId)) return;

  setPhase('PREPARING');
  setTargetReady(false);
  setCameraReleased(false);
  setCurrentTarget(null);
  setScanError(null);

  // Fetch XR metadata in parallel with camera stop
  const fetchTarget = (async () => {
    const res = await fetch(`${API_BASE}/api/v1/flashcard/${qrId}/xr-urls`);
    const raw = await res.json();
    const target: XRTarget = { qr_id: qrId, ...buildXRTarget(raw) };
    setCurrentTarget(target);
    setFoundCards(prev => new Set([...prev, qrId]));
    setTargetReady(true);
  })();
}, [foundCards]);

// Camera stop handled by QRScanner component directly — no postMessage
```

### `QRScanner.tsx` (new component)

Replaces `ar-scanner.html` iframe.

**Location:** `frontend/src/features/ar/components/QRScanner.tsx`

**Props:**
```ts
interface QRScannerProps {
  onDetected: (qrId: string) => void;
  onReady?: (stream: MediaStream) => void;
  onError?: (error: string) => void;
  active?: boolean; // false = unmount/cleanup
  debug?: boolean;
}
```

**Behavior:**
- Mounts `<video>` element, calls `getUserMedia({ video: { facingMode: 'environment' } })`
- Runs `jsQR` polling loop on canvas frames
- On QR detected: calls `onDetected(qrId)`, then immediately calls `stream.getTracks().forEach(t => t.stop())`
- Exposes `stop()` for programmatic cleanup
- Unmounts on `active=false`

**Stop logic (replaces RELEASE_CAMERA postMessage):**
```ts
function stop() {
  const stream = videoRef.current?.srcObject as MediaStream | null;
  stream?.getTracks().forEach(track => {
    track.stop();
  });
  if (videoRef.current) {
    videoRef.current.srcObject = null;
    videoRef.current.pause();
  }
}
```

### `ar-xr.html` (unchanged except for onboarding docs)

No changes to `ar-xr.html` itself. Only its parent-side integration changes.

---

## File Map

| Action | File | Change |
|---|---|---|
| Modify | `frontend/src/pages/LearnAR8thWall.tsx` | Remove scanner iframe, add QRScanner component, new state machine, remove camera handoff postMessage |
| Create | `frontend/src/features/ar/components/QRScanner.tsx` | New component: React jsQR scanner with direct camera stop |
| Create | `frontend/src/hooks/useQRScanner.ts` | Optional: hook version for non-component use |
| Create | `frontend/src/styles/QRScanner.css` | Minimal styles for scanner video overlay |
| Delete | `frontend/public/ar-scanner.html` | No longer used — scanner is React component |
| Delete | `frontend/public/static/ar-assets/js/ar-scanner.js` | Replaced by QRScanner.tsx |
| Delete | `frontend/public/static/ar-assets/css/ar-scanner.css` | Replaced by QRScanner.css |
| Modify | `frontend/src/styles/LearnAR8thWall.css` | Remove scanner iframe CSS, add QRScanner container CSS |

---

## Boundary Contracts

### QRScanner → LearnAR8thWall
- `onDetected(qrId: string)` — called exactly once per scan
- `onReady(stream: MediaStream)` — called after getUserMedia succeeds
- `onError(message: string)` — called on camera or jsQR failure

### LearnAR8thWall → QRScanner
- `active={phase === 'SCANNING'}` — controls mount/unmount
- Scanner unmount triggers cleanup (stream.stop automatically via useEffect)

### LearnAR8thWall ↔ ar-xr.html (unchanged)
- All postMessage events (XR_ENGINE_READY, XR_SLAM_LOADED, XR_PIPELINE_READY, XR_CAMERA_HAS_VIDEO, TARGET_FOUND, TARGET_LOST, XR_ERROR) — same as current

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Camera permission denied | `QRScanner.onError('Camera permission denied')` → setPhase(ERROR) with message |
| QR not found in database | API returns 404 → setPhase(ERROR) with "No AR content for this card" |
| XR engine fails to load | XR_CAMERA_HAS_VIDEO never fires → ARContainerXR watchdog handles (existing) |
| Camera stop fails silently | No-op — XR8 will fail gracefully; user can retry |
| Scan again | `handleScanAgain()` → setPhase(SCANNING) → QRScanner remounts |

---

## Telegram Sync

Unchanged. `useTelegramSync` continues to read `parentTraceLogs` and `arDebugBufferRef`.

New trace events to add:
```
QR_DETECTED       → QR found, scanner stopping
SCANNER_STOPPED   → stream.getTracks().stop() called
TARGET_READY      → API response received
XR_BOOTING        → iframe mounted
VIEWER_IFRAME_LOADED → iframe onLoad
XR_CAMERA_HAS_VIDEO → XR is live
```

---

## Testing Checklist

1. Camera permission prompt appears on first scan
2. QR detected → camera immediately stops (no visible delay)
3. XR iframe mounts after QR detected + API response
4. XR_CAMERA_HAS_VIDEO → VIEWING phase transition
5. Scan Again → full cycle repeats correctly
6. Duplicate QR → ignored, no camera restart
7. Error states → ERROR overlay shown, retry works
8. Telegram sync (Ctrl+Shift+S) → logs include new trace events

---

## Rollout Order

1. Create `QRScanner.tsx` — test in isolation with a simple page
2. Create `useQRScanner.ts` hook — for future non-component use
3. Refactor `LearnAR8thWall.tsx` — swap scanner iframe for QRScanner component
4. Delete `ar-scanner.html` and associated assets
5. Update `LearnAR8thWall.css` — remove scanner iframe styles
6. Verify all phases, error paths, Telegram sync

No database migrations. No API contract changes. No changes to `ar-xr.html`.
