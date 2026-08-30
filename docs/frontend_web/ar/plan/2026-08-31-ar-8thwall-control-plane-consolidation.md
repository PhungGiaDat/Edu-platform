# 8th Wall AR Control Plane Consolidation — Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix camera handoff deadlock by removing scanner iframe, consolidating all Control Plane into React component.

**Architecture:** Scanner iframe removed. `QRScanner.tsx` React component runs jsQR directly in React runtime. When QR detected, `stream.getTracks().forEach(t => t.stop())` called directly — no postMessage bridge. State machine reduced from 6 to 5 phases.

**Tech Stack:** React 18, jsQR (vendored), 8th Wall XR, TypeScript, CSS Modules

**Spec:** `docs/frontend_web/ar/specs/2026-08-31-ar-8thwall-control-plane-consolidation.md`

---

## Global Constraints

- `ar-xr.html` must not be modified
- No API contract changes
- No database migrations
- Telegram sync must continue working
- Camera permission flow must remain intact

---

## Task 1: Create QRScanner.tsx

**Files:**
- Create: `frontend/src/features/ar/components/QRScanner.tsx`
- Test: manual browser test on `/learn-ar-xr`

**Interfaces:**
- Consumes: nothing (standalone)
- Produces: `QRScannerProps` interface, default export `QRScanner` component

**Steps:**

- [ ] **Step 1: Write the component skeleton**

```tsx
import React, { useEffect, useRef, useCallback } from 'react';

interface QRScannerProps {
  onDetected: (qrId: string) => void;
  onReady?: (stream: MediaStream) => void;
  onError?: (error: string) => void;
  active?: boolean;
  debug?: boolean;
}

export const QRScanner: React.FC<QRScannerProps> = ({
  onDetected,
  onReady,
  onError,
  active = true,
  debug = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const isDetectedRef = useRef(false);

  // ... implementation below
};

export default QRScanner;
```

- [ ] **Step 2: Implement camera acquisition in useEffect**

```tsx
useEffect(() => {
  if (!active) return;

  let mounted = true;

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      if (!mounted) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      onReady?.(stream);
      startScan();
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Camera error');
    }
  }

  startCamera();
  return () => {
    mounted = false;
    stopScan();
    const stream = streamRef.current;
    stream?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };
}, [active]);
```

- [ ] **Step 3: Implement jsQR polling loop**

```tsx
const startScan = useCallback(() => {
  if (!canvasRef.current || !videoRef.current) return;
  const canvas = canvasRef.current;
  const video = videoRef.current;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  function scan() {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(scan);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code && !isDetectedRef.current) {
      isDetectedRef.current = true;
      onDetected(code.data);
      stopScan();
      stopCamera();
      return;
    }
    animFrameRef.current = requestAnimationFrame(scan);
  }

  animFrameRef.current = requestAnimationFrame(scan);
}, [onDetected]);

const stopScan = useCallback(() => {
  if (animFrameRef.current) {
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = null;
  }
}, []);

const stopCamera = useCallback(() => {
  const stream = streamRef.current;
  stream?.getTracks().forEach(track => track.stop());
  streamRef.current = null;
  if (videoRef.current) {
    videoRef.current.srcObject = null;
    videoRef.current.pause();
  }
}, []);
```

- [ ] **Step 4: Add JSX with video + canvas + debug overlay**

```tsx
return (
  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    <video
      ref={videoRef}
      playsInline
      muted
      autoPlay
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
    <canvas
      ref={canvasRef}
      style={{ display: 'none' }}
    />
    {debug && (
      <div style={{
        position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.7)', color: '#0f0', fontFamily: 'monospace',
        fontSize: 11, padding: '4px 12px', borderRadius: 20, zIndex: 9999,
      }}>
        Scanning...
      </div>
    )}
  </div>
);
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/ar/components/QRScanner.tsx
git commit -m "feat(ar): create QRScanner React component with direct camera stop"
```

---

## Task 2: Create useQRScanner.ts hook

**Files:**
- Create: `frontend/src/hooks/useQRScanner.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `{ startScanner, stopScanner, isScanning }` hook

**Steps:**

- [ ] **Step 1: Write the hook**

```ts
import { useCallback, useRef, useState } from 'react';

export function useQRScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startScanner = useCallback(async (videoEl: HTMLVideoElement) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    });
    streamRef.current = stream;
    videoRef.current = videoEl;
    videoEl.srcObject = stream;
    await videoEl.play();
    setIsScanning(true);
  }, []);

  const stopScanner = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  }, []);

  return { startScanner, stopScanner, isScanning };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useQRScanner.ts
git commit -m "feat(ar): create useQRScanner hook for non-component scanner use"
```

---

## Task 3: Create QRScanner.css

**Files:**
- Create: `frontend/src/styles/QRScanner.css`

**Steps:**

- [ ] **Step 1: Write minimal styles**

```css
.qr-scanner-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
  overflow: hidden;
}

.qr-scanner-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.qr-scanner-canvas {
  display: none;
}

.qr-scanner-debug-overlay {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75);
  color: #0f0;
  font-family: monospace;
  font-size: 11px;
  padding: 4px 12px;
  border-radius: 20px;
  z-index: 9999;
  pointer-events: none;
  white-space: nowrap;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/styles/QRScanner.css
git commit -m "feat(ar): add QRScanner CSS styles"
```

---

## Task 4: Refactor LearnAR8thWall.tsx

**Files:**
- Modify: `frontend/src/pages/LearnAR8thWall.tsx:1-537`
- Modify: `frontend/src/styles/LearnAR8thWall.css` (remove scanner iframe styles)

**Interfaces:**
- Consumes: `QRScanner` component, `useTelegramSync` hook
- Produces: Updated `LearnAR8thWall` page with new state machine

**Steps:**

- [ ] **Step 1: Update imports and Phase type**

Replace:
```tsx
type Phase =
  | 'SCANNING'
  | 'LOADING_TARGET'
  | 'RELEASING_CAMERA'
  | 'XR_BOOTING'
  | 'VIEWING'
  | 'ERROR';
```

With:
```tsx
type Phase =
  | 'SCANNING'
  | 'PREPARING'
  | 'XR_BOOTING'
  | 'VIEWING'
  | 'ERROR';
```

- [ ] **Step 2: Remove stale refs**

Remove from state declarations:
- `scannerRef` (useRef for iframe — no longer needed)
- `scannerReadyWindowRef` (Window capture for postMessage — no longer needed)
- `releaseRetryRef` (retry timer for RELEASE_CAMERA — no longer needed)

- [ ] **Step 3: Update state declarations**

Replace the phase + target state block with:
```tsx
const [phase, setPhase] = useState<Phase>('SCANNING');
const [currentTarget, setCurrentTarget] = useState<XRTarget | null>(null);
const [scanError, setScanError] = useState<string | null>(null);
const [foundCards, setFoundCards] = useState<Set<string>>(new Set());
const [cameraReleased, setCameraReleased] = useState(false);
const [targetReady, setTargetReady] = useState(false);
```

- [ ] **Step 4: Add XR_BOOTING trigger useEffect**

Add after state declarations:
```tsx
// Trigger XR_BOOTING when both target is ready and camera is released
useEffect(() => {
  if (phase === 'PREPARING' && targetReady && cameraReleased && currentTarget) {
    setPhase('XR_BOOTING');
    trace('XR_BOOTING', 'both ready — transitioning');
  }
}, [phase, targetReady, cameraReleased, currentTarget]);
```

- [ ] **Step 5: Implement handleQRDetected callback**

Replace the entire QR_DETECTED message handler block (lines ~168-264 in original) with:
```tsx
const handleQRDetected = useCallback(async (qrId: string) => {
  if (foundCards.has(qrId)) {
    trace('QR_DUPLICATE', `Already scanned: ${qrId}`);
    return;
  }

  trace('QR_DETECTED', `QR=${qrId} → PHASE=PREPARING`);

  setPhase('PREPARING');
  setTargetReady(false);
  setCameraReleased(false);
  setCurrentTarget(null);
  setScanError(null);

  // Run fetch and camera stop in parallel
  const fetchTarget = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/flashcard/${qrId}/xr-urls`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const raw = await res.json();
      const target: XRTarget = {
        qr_id: qrId,
        word: raw.word || qrId.replace('001', ''),
        xr_target_json_url: raw.tracking_target?.xr_target_json_url || raw.xr_target_json_url,
        xr_target_image_url: raw.tracking_target?.xr_target_image_url || raw.xr_target_image_url,
        model_3d_url: raw.target?.model_3d_url || raw.model_3d_url,
        texture_url: raw.target?.texture_url || raw.texture_url,
        animations: raw.target?.animations || raw.animations,
        default_animation: raw.target?.default_animation || raw.default_animation || 'IDLE',
        combo_animation: raw.target?.combo_animation || raw.combo_animation,
        position: raw.target?.position || '0 0 0',
        rotation: raw.target?.rotation || '0 0 0',
        scale: raw.target?.scale || '1 1 1',
      };

      if (!target.xr_target_json_url && !target.xr_target_image_url) {
        throw new Error(`No XR target URL for: ${qrId}`);
      }

      setCurrentTarget(target);
      setFoundCards(prev => new Set([...prev, qrId]));
      setTargetReady(true);
      trace('TARGET_READY', qrId);
    } catch (err) {
      trace('API_ERROR', String(err));
      setScanError(err instanceof Error ? err.message : 'Failed to load XR target');
      setPhase('ERROR');
    }
  })();

  // Camera will stop via QRScanner component's onDetected side effect.
  // We just wait for the onCameraReleased callback.
}, [foundCards]);

// Callback from QRScanner: camera has been stopped
const handleCameraReleased = useCallback(() => {
  if (phase === 'PREPARING') {
    setCameraReleased(true);
    trace('SCANNER_STOPPED', 'stream.getTracks().stop() called');
  }
}, [phase]);
```

- [ ] **Step 6: Remove scanner iframe message handlers**

Delete from the message handler useEffect:
- `SCANNER_READY` case
- `SCANNER_CAMERA_RELEASED` case
- `QR_DETECTED` case (replaced by `handleQRDetected` callback)
- `window.frames['scanner-iframe']` lookup logic
- `scannerReadyWindowRef` capture logic
- `RELEASE_CAMERA` postMessage sending
- `releaseRetryRef` retry logic

- [ ] **Step 7: Update render — replace scanner iframe with QRScanner component**

Replace:
```tsx
{['SCANNING', 'LOADING_TARGET', 'RELEASING_CAMERA'].includes(phase) && (
  <iframe
    key="scanner-iframe"
    name="scanner-iframe"
    ref={scannerRef}
    src="/ar-scanner.html?debug=true"
    title="AR Scanner"
    allow="camera; xr-spatial-tracking"
    style={{ width: '100%', height: '100%', border: 'none' }}
  />
)}
```

With:
```tsx
{phase === 'SCANNING' && (
  <QRScanner
    onDetected={handleQRDetected}
    onReady={() => trace('SCANNER_READY', 'getUserMedia succeeded')}
    onError={(msg) => {
      trace('SCANNER_ERROR', msg);
      setScanError(msg);
      setPhase('ERROR');
    }}
    active={phase === 'SCANNING'}
    debug={isDebugMode}
  />
)}
```

- [ ] **Step 8: Update loading overlay phase names**

Replace `LOADING_TARGET` with `PREPARING` in the overlay JSX. Remove `RELEASING_CAMERA` overlay entirely.

- [ ] **Step 9: Update XR_BOOTING condition in render**

Replace:
```tsx
{(phase === 'XR_BOOTING' || phase === 'VIEWING') && viewerSrc && (
```
With:
```tsx
{(phase === 'XR_BOOTING' || phase === 'VIEWING') && viewerSrc && (
```

- [ ] **Step 10: Update handleRetry to reset all new state flags**

```tsx
const handleRetry = useCallback(() => {
  setPhase('SCANNING');
  setScanError(null);
  setCurrentTarget(null);
  setCameraReleased(false);
  setTargetReady(false);
}, []);
```

- [ ] **Step 11: Update debug phase indicator**

Replace:
```tsx
Scanner: <strong>{['SCANNING', 'LOADING_TARGET', 'RELEASING_CAMERA'].includes(phase) ? 'active' : 'hidden'}</strong>
```
With:
```tsx
Scanner: <strong>{phase === 'SCANNING' ? 'active' : 'hidden'}</strong>
```

- [ ] **Step 12: Update LearnAR8thWall.css**

Remove scanner iframe container styles. Add `.qr-scanner-container` wrapper styles if needed.

- [ ] **Step 13: Commit**

```bash
git add frontend/src/pages/LearnAR8thWall.tsx frontend/src/styles/LearnAR8thWall.css
git commit -m "refactor(ar): remove scanner iframe, use QRScanner component, new 5-phase state machine"
```

---

## Task 5: Delete ar-scanner.html and assets

**Files:**
- Delete: `frontend/public/ar-scanner.html`
- Delete: `frontend/public/static/ar-assets/js/ar-scanner.js`
- Delete: `frontend/public/static/ar-assets/css/ar-scanner.css`

**Steps:**

- [ ] **Step 1: Verify no other files reference ar-scanner.html**

```bash
grep -r "ar-scanner.html" frontend/src --include="*.tsx" --include="*.ts" --include="*.css"
```

Expected: no results.

- [ ] **Step 2: Delete the files**

```bash
rm frontend/public/ar-scanner.html
rm frontend/public/static/ar-assets/js/ar-scanner.js
rm frontend/public/static/ar-assets/css/ar-scanner.css
```

- [ ] **Step 3: Check if ar-assets folder is now empty, remove if so**

```bash
# If folder empty, remove:
rmdir frontend/public/static/ar-assets/js
rmdir frontend/public/static/ar-assets/css
rmdir frontend/public/static/ar-assets
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(ar): remove ar-scanner.html and related assets — replaced by QRScanner React component"
```

---

## Task 6: Verify all phases and error paths

**Files:**
- Test: browser manual test

**Steps:**

- [ ] **Step 1: Start dev server**

```bash
cd frontend && npm run dev
```

Navigate to `/learn-ar-xr?debug=true`

- [ ] **Step 2: Verify SCANNING phase**

Expected: QRScanner mounts, camera permission prompt appears, video feed shows.

- [ ] **Step 3: Verify QR_DETECTED → PREPARING**

Scan a QR code. Expected: `QR_DETECTED` trace, phase changes to `PREPARING`, scanner unmounts.

- [ ] **Step 4: Verify PREPARING → XR_BOOTING**

After API response and camera released, expected: `TARGET_READY` + `SCANNER_STOPPED` traces, phase changes to `XR_BOOTING`, ar-xr.html iframe mounts.

- [ ] **Step 5: Verify XR_BOOTING → VIEWING**

Wait for `XR_CAMERA_HAS_VIDEO`. Expected: phase changes to `VIEWING`.

- [ ] **Step 6: Verify error path**

Scan a non-existent QR. Expected: ERROR overlay with message, Scan Again button works.

- [ ] **Step 7: Verify Scan Again**

Click Scan Again. Expected: full cycle restarts from SCANNING.

- [ ] **Step 8: Verify Telegram sync**

Press Ctrl+Shift+S. Expected: logs sent to Telegram with new trace events.

---

## Task 7: Final commit

- [ ] **Step 1: Tag milestone**

```bash
git tag -a v8th-wall-control-plane -m "feat(ar): remove scanner iframe, consolidate control plane into React"
git push origin 10-days-quick-run --tags
```
