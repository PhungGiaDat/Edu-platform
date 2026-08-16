---
name: mindar-performance-debug
description: Diagnose WebAR issues with MindAR — camera not opening, HTTPS problems, target not detected, model jitter, FPS drops, Safari iOS quirks, memory leaks, and React-specific issues like multiple renderer creation. Use when an AR scene fails to start, runs slowly, or behaves incorrectly.
---

# MindAR Performance & Debug

Systematic debugging for WebAR scenes. When something doesn't work, walk
through this checklist **in order** — most failures are in the first few
steps.

## Diagnostic order

```
HTTPS
  ↓
Camera permission
  ↓
Browser support
  ↓
Target file
  ↓
targetIndex
  ↓
Asset paths
  ↓
WebGL errors
  ↓
Tracking stability
  ↓
Rendering performance
```

Don't skip ahead. Each step catches a class of common bugs.

## 1. HTTPS

Camera access requires secure context. **HTTP ≠ secure context**
(except `localhost`).

```bash
# Test your URL
curl -sI https://your-app.example.com | head -1
# Should be: HTTP/2 200 (with HTTPS)

# Common failures:
# http://your-app.example.com — NOT secure
# https://192.168.1.42:5173 — secure, but cert warning
```

For local dev, see `mindar-project-scaffold/references/local-https.md`.

## 2. Camera permission

The browser prompts the user once. If denied, the prompt won't reappear
without explicit user action.

```javascript
try {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  // success
} catch (e) {
  if (e.name === 'NotAllowedError') {
    showError('Camera permission denied. Click the camera icon in your URL bar to re-enable.');
  } else if (e.name === 'NotFoundError') {
    showError('No camera found on this device.');
  } else if (e.name === 'NotReadableError') {
    showError('Camera is in use by another app.');
  }
}
```

## 3. Browser support

WebAR needs:

- `navigator.mediaDevices.getUserMedia` ✅ All modern browsers
- WebGL 2 (or WebGL 1) ✅ All modern browsers
- `OffscreenCanvas` (optional, for perf) ✅ Modern

| Browser | Version | MindAR support |
| ------- | ------- | -------------- |
| Chrome Android | 88+ | ✅ |
| Chrome Desktop | 88+ | ✅ |
| Safari iOS | 14.5+ | ✅ (with quirks) |
| Safari macOS | 14+ | ✅ |
| Firefox | 88+ | ✅ |
| Edge | 88+ | ✅ |
| Samsung Internet | 14+ | ✅ |

For feature detection:

```javascript
if (!navigator.mediaDevices?.getUserMedia) {
  showError('Camera API not supported in this browser');
}
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
if (!gl) showError('WebGL not supported');
```

## 4. Target file

If targets aren't detected, the issue is usually the `.mind` file:

- **Wrong path.** Check Network tab — is the `.mind` actually loading?
- **CORS.** When loading from a CDN, the CDN must return `Access-Control-Allow-Origin`.
- **Compiled with old/wrong sources.** Recompile from `targets/source/`.
- **Image quality too low.** Validate with `validate-targets.mjs`.

```javascript
const response = await fetch('/targets/targets.mind');
if (!response.ok) throw new Error(`Failed to load .mind: ${response.status}`);
const buffer = await response.arrayBuffer();
console.log('mind file size:', buffer.byteLength, 'bytes');
```

## 5. targetIndex

Anchor indices are 0-based in compile order. A common bug: listing
targets in alphabetical order during compile, then expecting them to
match a hardcoded UI order.

```javascript
// BAD: hardcoded index that's wrong after re-sort
mindarThree.addAnchor(3);  // might be a different image now

// GOOD: use a manifest to map names to indices
const manifest = await fetch('/targets/manifest.json').then(r => r.json());
const appleIdx = manifest.targets.find(t => t.name === 'apple').index;
mindarThree.addAnchor(appleIdx);
```

## 6. Asset paths

`.glb`, `.mp4`, `.jpg` — paths are relative to the page URL, not the JS
file. Common failures:

- `<img src="./assets/x.jpg">` works on `/foo/bar.html` → `/foo/assets/x.jpg` ✅
- `import x from './assets/x.glb'` (Vite) → bundled, hash-suffixed URL
- `fetch('/assets/x.glb')` (absolute) → must match server root

Always check the Network tab. 404s mean path mismatch.

## 7. WebGL errors

WebGL silently fails. Check the console for errors after each operation:

```javascript
function checkGLError(gl, op) {
  const err = gl.getError();
  if (err !== gl.NO_ERROR) {
    console.error(`WebGL error after ${op}: 0x${err.toString(16)}`);
  }
}
```

Common errors:
- `0x0500 INVALID_ENUM` — wrong constant
- `0x0501 INVALID_VALUE` — out-of-range argument
- `0x0502 INVALID_OPERATION` — operation not allowed in current state
- `0x0505 OUT_OF_MEMORY` — texture/buffer too large
- `0x0506 INVALID_FRAMEBUFFER_OPERATION` — framebuffer incomplete

## 8. Tracking stability

If the model "jitters" or "floats":

1. **Image target quality.** Low-resolution or low-contrast targets
   produce noisy pose estimates. Use `mindar-target-compiler` validation.
2. **Lighting.** Very dark or very bright environments confuse the
   tracker. Use ambient + directional lighting on the model.
3. **Distance.** MindAR works best 20-100cm from the target. Closer or
   farther may degrade.
4. **Pinned camera angle.** Hold steady for 2-3 seconds when first
   showing the target.

For programmatic smoothing, see
`ar-tracking-patterns` (in `ar-mobile-edu`).

## 9. Rendering performance

If FPS drops:

```javascript
const stats = renderer.info;
console.log({
  drawCalls:    stats.render.calls,
  triangles:    stats.render.triangles,
  textures:     stats.memory.textures,
  geometries:   stats.memory.geometries
});
```

Targets:

| Device class  | Draw calls | Triangles |
| ------------- | ---------- | --------- |
| Mid-range     | < 30       | < 60k     |
| High-end      | < 50       | < 100k    |

If you're over budget:

- Reduce model poly count (use `gltf-transform optimize`)
- Use `MeshBasicMaterial` instead of `MeshStandardMaterial` for non-PBR
- Cap texture resolution at 512×512 for non-hero assets
- Disable shadows (default in Three.js)

## React-specific issues

### Multiple renderers

If the component remounts without cleanup, you get multiple `WebGLRenderer`
instances. The first GPU context fails; subsequent ones may work but
leak memory.

```javascript
useEffect(() => {
  const mindarThree = new MindARThree({ container, imageTargetSrc });
  // ...
  return () => {
    mindarThree.renderer.setAnimationLoop(null);
    mindarThree.stop();
    mindarThree.renderer.dispose();
    mindarThree.renderer.forceContextLoss();
  };
}, []);
```

`forceContextLoss()` is critical — without it, the GPU context stays
allocated.

### Stale closures

If you reference state inside `anchor.onTargetFound` that updates after
mount, you get the stale value. Use a ref:

```javascript
const latestStatus = useRef('init');
useEffect(() => { latestStatus.current = 'ready'; }, []);

anchor.onTargetFound = () => {
  console.log(latestStatus.current);  // current value, not stale
};
```

### Effects running on every render

If your dependency array includes an unstable object (like
`{ imageTargetSrc }` recreated each render), the effect tears down and
recreates the entire MindAR scene.

```javascript
// BAD
useEffect(() => { /* setup */ }, [{ imageTargetSrc }]);

// GOOD
useEffect(() => { /* setup */ }, [imageTargetSrc]);  // primitive value
```

## References

- `references/safari-ios.md` — iOS-specific quirks (autoplay, fullscreen, audio)
- `references/memory-leaks.md` — leak patterns and how to fix them
- `references/fps-tuning.md` — quick wins for low-end devices