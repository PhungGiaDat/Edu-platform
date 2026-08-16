# Memory leak patterns and fixes

WebGL scenes are notorious for memory leaks because GPU resources
(textures, buffers, programs) aren't tracked by JS GC. Always clean up.

## Leak: not disposing textures

```javascript
// BAD: texture allocated, no dispose
const tex = new THREE.TextureLoader().load('/assets/big.jpg');
material.map = tex;

// GOOD:
const tex = new THREE.TextureLoader().load('/assets/big.jpg');
material.map = tex;
// Later:
tex.dispose();
material.dispose();
```

## Leak: not disposing geometries

```javascript
// BAD:
scene.add(mesh);
scene.remove(mesh);
// mesh.geometry still allocated

// GOOD:
scene.add(mesh);
scene.remove(mesh);
mesh.geometry.dispose();
mesh.material.dispose();
```

## Leak: not disposing video textures

```javascript
const video = document.createElement('video');
video.src = '/assets/clip.mp4';
const tex = new THREE.VideoTexture(video);
material.map = tex;

// On cleanup:
video.pause();
video.src = '';        // releases decoder
video.load();
tex.dispose();
material.dispose();
```

## Leak: not calling `renderer.dispose()`

```javascript
// Always call on unmount
renderer.dispose();
renderer.forceContextLoss();   // releases WebGL context
```

`forceContextLoss()` is the only way to actually free the GPU context
back to the system. Without it, the context stays allocated.

## Leak: event listeners on window/document

```javascript
// BAD: listener registered on window, never removed
window.addEventListener('resize', onResize);

// GOOD:
window.addEventListener('resize', onResize);
return () => window.removeEventListener('resize', onResize);
```

In React, return the cleanup function from `useEffect`. In vanilla JS,
track the cleanup callback.

## Leak: animation loop not stopped

```javascript
// BAD: setAnimationLoop never cleared
renderer.setAnimationLoop(() => render());

// GOOD:
renderer.setAnimationLoop(() => render());
return () => renderer.setAnimationLoop(null);
```

A leaked animation loop keeps rendering even when the scene is
invisible — wastes CPU and battery.

## Leak: per-frame allocations

```javascript
// BAD: new objects every frame
function animate() {
  const tmp = new THREE.Vector3();   // allocation
  // ...
}

// GOOD: reuse temp objects
const _tmp = new THREE.Vector3();
function animate() {
  // use _tmp
}
```

For sustained 60fps, avoid allocations in the hot path. Vector3,
Quaternion, Matrix4 — declare them once at module scope.

## Leak: GLTFLoader caches

The loader caches parsed GLBs internally. For scenes with many
dynamically-loaded GLBs:

```javascript
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const draco = new DRACOLoader();
draco.setDecoderPath('/draco/');
const loader = new GLTFLoader();
loader.setDRACOLoader(draco);

// Later: dispose cache
loader.manager.removeLoader?.(loader);
```

## Detecting leaks

Chrome DevTools:

1. **Memory tab** → Take heap snapshot → trigger action → take another
   snapshot → compare
2. **Performance → Memory** → watch JS heap over time
3. **Performance monitor** → watch "JS heap size" — if it grows linearly,
   you have a leak

In production, monitor via `performance.memory.usedJSHeapSize` (Chrome
only) — log it for diagnostics.

## Patterns that always leak

- `setInterval` without `clearInterval`
- `requestAnimationFrame` recursion without cancel
- Promises that never resolve
- IndexedDB transactions left open
- WebSocket connections not closed

Audit these first when chasing leaks.