---
name: mindar-face-tracking
description: Build face-tracking AR scenes with MindAR Face — glasses, masks, makeup, occluders, and face anchors. Use when the user wants Snapchat-style face filters, virtual try-on, face masks, or any AR that tracks facial features (eyes, nose, mouth, cheeks).
---

# MindAR Face Tracking

Build face-tracking AR with `MindARFace`. Three.js programmatic only —
A-Frame has no face component. Output is face anchor points (eyes, nose,
mouth, forehead, cheeks) plus a face mesh.

## Initialize

```javascript
import { MindARFace } from 'mind-ar/dist/mindar-face.js';

const mindarFace = new MindARFace({
  container: document.querySelector('#container'),
});

const { renderer, scene, camera } = mindarFace;
const faceMesh = mindarFace.addFaceMesh();   // <-- key: face anchor
```

`faceMesh` is a Three.js `Object3D` that gets a 4×4 transform per frame
matching the user's face position, orientation, and scale. Add your
content as children of `faceMesh` so it sticks to the face.

## Face anchor points

Beyond the whole-face anchor, MindAR exposes individual landmark anchors:

```javascript
const leftEye  = mindarFace.addAnchor('leftEye');
const rightEye = mindarFace.addAnchor('rightEye');
const nose     = mindarFace.addAnchor('nose');
const mouth    = mindarFace.addAnchor('mouth');
const forehead = mindarFace.addAnchor('forehead');
```

Available landmarks: `forehead`, `leftEye`, `rightEye`, `noseBridge`,
`noseTip`, `leftCheek`, `rightCheek`, `upperLip`, `lowerLip`, `mouth`,
`chin`.

## Common patterns

### Glasses

```javascript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

new GLTFLoader().load('/assets/glasses.glb', (gltf) => {
  gltf.scene.scale.set(0.07, 0.07, 0.07);   // face units
  gltf.scene.position.set(0, 0.01, 0.06);    // a bit forward of eye plane
  faceMesh.add(gltf.scene);
});
```

### Face paint / makeup (decal)

```javascript
const tex = new THREE.TextureLoader().load('/assets/makeup.png');
const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
const geo = new THREE.PlaneGeometry(0.18, 0.24);
const plane = new THREE.Mesh(geo, mat);
plane.position.set(0, 0, 0.1);
faceMesh.add(plane);
```

### Occluder

To hide part of the model behind the face (e.g. ear pieces that go into
the cheek), make those parts an occluder:

```javascript
const occluderMat = new THREE.MeshBasicMaterial({ colorWrite: false });
const occluderGeo = new THREE.SphereGeometry(0.12, 32, 32);
const occluder = new THREE.Mesh(occluderGeo, occluderMat);
occluder.position.z = 0.05;
faceMesh.add(occluder);   // renders to depth buffer only
```

The occluder must be **rendered before** the rest of the scene. If you
have transparency issues, set `renderOrder = -1`.

### Forehead text label

```javascript
const canvas = document.createElement('canvas');
canvas.width = 512; canvas.height = 128;
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#fff';  ctx.fillRect(0, 0, 512, 128);
ctx.fillStyle = '#000';  ctx.font = 'bold 64px sans-serif';
ctx.fillText('HELLO', 100, 80);
const tex = new THREE.CanvasTexture(canvas);
const label = new THREE.Mesh(
  new THREE.PlaneGeometry(0.2, 0.05),
  new THREE.MeshBasicMaterial({ map: tex, transparent: true })
);
label.position.set(0, 0.1, 0.1);    // forehead area
faceMesh.add(label);
```

## Camera setup

MindAR face tracking uses the **front camera** by default. For rear-camera
face AR (rare), pass `cameraFacing: 'environment'`:

```javascript
new MindARFace({ container, cameraFacing: 'environment' });
```

If the user's device doesn't have a front camera, fallback gracefully:

```javascript
try {
  await mindarFace.start();
} catch (e) {
  showError('No front-facing camera found');
}
```

## Performance

Face tracking is more expensive than image tracking. Targets:

- **iPhone 11 / Pixel 4a:** 30+ fps with simple models
- **Mid-range Android:** 15-25 fps with simple models; drops below 15fps
  with complex models
- **Browser support:** Chromium-based and Firefox stable; Safari iOS works
  but older iPhones may struggle

If FPS drops below 20:

1. Reduce model poly count
2. Disable shadows and post-processing
3. Lower texture resolution to 512×512
4. Use `MeshBasicMaterial` instead of `MeshStandardMaterial` (skip PBR)

## Common mistakes

- **Forgetting `faceMesh.add()` not `scene.add()`.** Items added to the
  scene don't track the face; they float in world space.
- **Setting `material.depthWrite = true` on the occluder.** Defeats the
  purpose — use `colorWrite: false` only.
- **Initializing with rear camera.** Front-facing is the default for face
  tracking; rear-camera face tracking is rarely supported.
- **Not handling the "no face" state.** When `faceMesh.visible` is false,
  hide UI prompts or show "show your face" message.

## References

- `references/landmarks.md` — full list of landmarks + coordinate conventions
- `references/occluder-patterns.md` — depth, colorWrite, renderOrder
- `references/multi-face.md` — handling multiple faces (limited support)
- For image targets → load `mindar-image-tracking`
- For video/audio overlays → load `mindar-media-interactions`