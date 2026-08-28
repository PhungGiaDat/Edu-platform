# Quick FPS wins

If your AR scene drops below 30fps on mid-range devices, here are quick
wins to try in order. Each is a one-line-or-less change.

## 1. Disable shadows

```javascript
renderer.shadowMap.enabled = false;  // default in Three.js
```

Shadow maps double the rendering cost. AR scenes rarely need them.

## 2. Use MeshBasicMaterial instead of MeshStandardMaterial

```javascript
// Before
const mat = new THREE.MeshStandardMaterial({ map: texture });

// After
const mat = new THREE.MeshBasicMaterial({ map: texture });
```

`MeshStandardMaterial` runs PBR lighting per pixel — expensive. For
AR, basic shading often looks fine because the camera feed provides the
real lighting context.

## 3. Cap pixel ratio

```javascript
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
```

On a 3x retina display, default pixel ratio triples the fragment count.
Capping at 2 is visually identical for most users.

## 4. Reduce model poly count

Use `gltf-transform` to simplify:

```bash
npx gltf-transform optimize input.glb output.glb \
  --simplify true --simplify-error 0.001
```

Or in code:

```javascript
import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier.js';
const simplifier = new SimplifyModifier(gltf.scene);
const simplified = simplifier.modify(gltf.scene, gltf.parser.associations);
```

## 5. Cap texture resolution

For non-hero assets, use 512×512 instead of 1024×1024:

```javascript
import { TextureLoader, LinearFilter } from 'three';

const loader = new TextureLoader();
loader.load('/assets/x.jpg', (tex) => {
  tex.minFilter = LinearFilter;   // faster sampling
  tex.generateMipmaps = false;    // skip mipmap generation
  tex.needsUpdate = true;
});
```

## 6. Throttle non-render work

Per-frame work that doesn't need 60fps:

```javascript
let lastUpdate = 0;
mindarThree.onUpdate = (now) => {
  if (now - lastUpdate < 0.1) return;  // 10Hz instead of 60Hz
  lastUpdate = now;
  doExpensiveCheck();   // e.g., proximity computation
};
```

## 7. Reduce draw calls

Merge static geometry into one mesh:

```javascript
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const merged = BufferGeometryUtils.mergeGeometries(
  staticMeshes.map(m => m.geometry)
);
const mesh = new THREE.Mesh(merged, sharedMaterial);
```

Each draw call is ~0.1-0.5ms; 30 draw calls ≈ 5-15ms per frame.

## 8. Use `THREE.InstancedMesh` for repeated objects

If you have many copies of the same model:

```javascript
const instancedMesh = new THREE.InstancedMesh(geo, mat, count);
for (let i = 0; i < count; i++) {
  matrix.setPosition(i, 0, 0);
  instancedMesh.setMatrixAt(i, matrix);
}
scene.add(instancedMesh);
```

All instances render in one draw call.

## 9. Lower render resolution

Trade resolution for FPS:

```javascript
renderer.setSize(width / 1.5, height / 1.5, false);
// CSS still displays at full size; render at lower res
canvas.style.width = '100%';
canvas.style.height = '100%';
```

Visible quality loss is minimal on mobile; FPS gain is large.

## 10. Disable post-processing

EffectComposer, Bloom, SSAO — each adds 5-15ms per frame. Skip them for
AR.

## Diagnostic: which win matters?

Use Chrome DevTools **Performance** tab → record → look for:

- **Scripting time** (yellow): high → JS bottleneck
- **Rendering time** (purple): high → layout/paint bottleneck
- **GPU time** (green): high → WebGL bottleneck (most AR issues)
- **Painting time** (gray): high → compositor bottleneck (rare)

GPU time is usually the culprit. Apply wins 1-3, 5 first.

## Realistic targets

| Device class        | Target FPS | Acceptable draw calls |
| ------------------- | ---------- | --------------------- |
| iPhone 11 / Pixel 5 | 60         | < 50                  |
| iPhone 8 / Pixel 4 | 30-45      | < 30                  |
| Mid-range Android   | 24-30      | < 20                  |
| Low-end Android     | 15-20      | < 10                  |

If you're below target on iPhone 11, you're doing something seriously
wrong — check for per-frame allocations and un-disp disposables.