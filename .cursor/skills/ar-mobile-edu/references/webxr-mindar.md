# WebXR / MindAR Reference

> Source of truth: `research/AR_TRACKING_RESEARCH_20260721.md` +
> `docs/superpowers/specs/2026-07-28-mindar-precompiled-mind-design.md` +
> MindAR + A-Frame upstream docs.

## Two-iframe architecture

The web AR client uses a **two-iframe pattern** to separate concerns:

```
LearnARV2.tsx (React)
└── ARContainerV2.tsx
    ├── SCANNING phase → ar-scanner.html (jsQR library)
    │     QR_DETECTED → postMessage
    └── VIEWING phase  → ar-viewer.html (MindAR + A-Frame)
                           TARGET_FOUND / TARGET_LOST → postMessage
```

Iframe messaging is **typed** via `mobile/rn/src/bridge/arMessages.ts` (the
RN bridge reuses the same protocol). Don't bypass with raw `postMessage`.

## MindAR pipeline

```
Flashcard image (PNG/JPG from backend)
   ↓
MindAR compiler (`mindar build`)
   ↓
.mind file (precompiled targets)
   ↓
Loaded at runtime by ar-viewer.html
```

The precompiled mind format is **faster** than runtime compilation. Build the
`.mind` files at content-publish time, ship with the bundle.

See `docs/superpowers/specs/2026-07-28-mindar-precompiled-mind-design.md`
for the full pipeline. Key rule: never compile `.mind` files in the browser
— it blocks the main thread for 5–10s per target.

## A-Frame scene structure

```html
<a-scene mindar-image="imageTargetSrc: #mind-targets">
  <a-camera position="0 0 0"></a-camera>
  <a-entity mindar-image-target="targetIndex: 0">
    <a-gltf-model src="model.glb"></a-gltf-model>
  </a-entity>
</a-scene>
```

- `mind-targets` is an `<a-assets>` item preloaded from the `.mind` file.
- One `<a-entity>` per tracked image, indexed by target order in the `.mind`.
- Models: `<a-gltf-model>` for `.glb` (preferred) or `<a-obj-model>` for
  legacy. Use `<a-asset-item>` to defer loading.

## postMessage protocol

Both ifframes communicate with the parent via typed messages. Payloads are
JSON-serializable. Events the parent listens to:

```typescript
// From ar-scanner.html (SCANNING phase)
{ type: 'QR_DETECTED', payload: { hash: string } }

// From ar-viewer.html (VIEWING phase)
{ type: 'TARGET_FOUND', payload: { targetIndex: number } }
{ type: 'TARGET_LOST',  payload: { targetIndex: number } }
{ type: 'AR_ERROR',     payload: { code: string, message: string } }
```

**Parent listens on `window.addEventListener('message', ...)`** and dispatches
to React state. Validate `event.origin` against the iframe's allowlist —
don't trust any iframe origin blindly.

## Stabilization (the 900ms grace period)

Currently (per `AR_TRACKING_RESEARCH_20260721.md`), `TARGET_LOST` triggers
immediately on marker loss with only a 900ms grace period. **There is no
existing stabilization logic** (no frame counting, no pose smoothing).

This is a known issue documented in `docs/implementation-log/PHASE2-RESEARCH-AR-IMAGE-TRACKING.md`.
The fix is to introduce a `StabilizationManager` that:
- Counts consecutive frames the target is found before emitting `TARGET_FOUND`
- Holds `TARGET_LOST` for the grace period (configurable via
  `/api/v1/ar/stability-config`)
- Exposes a `freezePose()` API for the freeze-pose semantic rule

See `references/ar-tracking-patterns.md` for the full stabilization spec.

## iOS Safari quirks

- `<a-scene>` needs `vr-mode-ui="enabled: false"` to hide the VR button.
- Audio in WebKit requires a user gesture before playback. Trigger audio
  on `TARGET_FOUND`, not on `DOMContentLoaded`.
- `aframe.io` documentation recommends `crossorigin="anonymous"` on
  `<a-assets>` for shared CDN models.
- Backgrounded tabs pause the AR session — handle `visibilitychange`.

## Performance budgets (web)

- Initial `.mind` load: target < 500ms on 4G.
- Model load: target < 1.5s for first model, cached thereafter.
- Combined A-Frame + MindAR JS payload: keep under 800KB gzipped.
- Scene must run at 60fps on a 3-year-old mid-range Android phone.
