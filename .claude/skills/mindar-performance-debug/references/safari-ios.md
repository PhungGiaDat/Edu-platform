# Safari iOS quirks

Safari iOS has unique behaviors that bite AR developers. These are
specifically the iOS Safari (mobile) issues, not macOS Safari.

## Autoplay and user-gesture rules

| Media     | Autoplay allowed?               | Workaround                          |
| --------- | ------------------------------- | ----------------------------------- |
| Muted video | ✅ (with `playsinline`)        | Always mute for AR                  |
| Unmuted video | ❌ without gesture            | "Tap to start" overlay              |
| Audio     | ❌ without gesture              | Silent-unlock trick                 |
| AudioContext | ❌ without gesture            | User click/touch first              |

## video.playsInline

Without this attribute, iOS opens the video fullscreen — UX killer.

```html
<video playsinline muted src="..."></video>
```

## WebGL context preservation

iOS Safari aggressively suspends background tabs. When the user
returns, the WebGL context may be lost.

```javascript
renderer.domElement.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  console.warn('WebGL context lost; will restore');
});
renderer.domElement.addEventListener('webglcontextrestored', () => {
  console.log('WebGL context restored');
  // Re-init textures, shaders, etc.
});
```

## Audio session interruption

Phone calls, Siri, and other apps can interrupt audio. Listen for
events:

```javascript
audio.addEventListener('pause', () => { /* paused by system */ });
audio.addEventListener('play',  () => { /* resumed */ });
audio.addEventListener('ended', () => { /* finished */ });
```

## Memory limits

iOS Safari has a 1.5GB per-tab memory limit. Heavy AR scenes with
many large textures can crash.

| Asset type      | Safe limit     |
| --------------- | -------------- |
| `.glb` model    | < 30MB total   |
| Total textures  | < 80MB         |
| Audio cache     | < 50MB         |
| JS heap         | < 200MB        |

## Slow startup on first run

First camera access on a fresh Safari install can take 3-5 seconds.
Show a loading indicator:

```html
<div id="loading">Preparing camera...</div>
```

## orientationchange event

Rotation handling differs from Android:

```javascript
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    // After rotation, canvas may need re-sizing
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, 100);  // delay for the rotation to complete
});
```

## Other quirks

- **`getUserMedia` constraints:** `facingMode: 'user'` may need to be
  `'environment'` on some iPads
- **`videoHeight`/`videoWidth`:** flip on portrait vs landscape — track
  orientation explicitly
- **`<input type="file">`:** iOS shows only photo library; no camera
  capture by default
- **Service workers:** iOS Safari supports them, but background
  processing is heavily restricted

## Testing on real iOS devices

Always test on real hardware:

- iPhone 11 or newer (A13+)
- iPad Pro 2020+
- Use Safari, not Chrome for iOS (Chrome is just Safari with a different
  UI)

The Xcode Simulator is **not** sufficient — it doesn't simulate real
GPU/CPU/memory pressure.