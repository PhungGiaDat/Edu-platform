---
name: mindar-image-tracking
description: Build image-tracking AR scenes with MindAR — initialize the tracker, register targets, attach GLB/HTML/video to anchors, and handle targetFound/targetLost events. Use when implementing image target tracking, AR markers, posters, flashcards, or any scene that tracks a printed/digital image.
---

# MindAR Image Tracking

Build image-target AR scenes with MindAR. The two core APIs:

- `MindARThree` (programmatic, Three.js) — for full control, animations, custom shaders
- A-Frame's `mindar-image` component (declarative HTML) — for prototypes and content-heavy scenes

Pick **MindARThree** if you need `THREE.AnimationMixer`, custom shaders, or
complex interactivity. Pick **A-Frame** if the scene is mostly static markup
with a few assets.

## Core concepts

### Targets

A `.mind` file is a compiled bundle of one or more image targets. The
**order** of compilation determines `targetIndex` — MindAR exposes anchors
in that same order.

```javascript
const mindarThree = new MindARThree({
  container: document.querySelector('#container'),
  imageTargetSrc: '/targets/targets.mind'  // compiled by mindar-target-compiler
});

// targetIndex 0 is the first image in the compilation
const anchor0 = mindarThree.addAnchor(0);
const anchor1 = mindarThree.addAnchor(1);
```

### Anchors

An anchor is a Three.js `Group` attached to a specific image target. When
the target is found, the group becomes visible and tracks the marker's
position/rotation. When lost, it's hidden.

```javascript
anchor.group.add(yourObject3D);
anchor.onTargetFound = () => { /* ... */ };
anchor.onTargetLost  = () => { /* ... */ };
```

### Tracking events

| Event            | Fires when                                      |
| ---------------- | ----------------------------------------------- |
| `targetFound`    | Marker detected with confidence above threshold |
| `targetLost`     | Marker no longer visible                        |
| `update` (Three) | Per-frame, with anchor.matrix updated           |

`targetFound` and `targetLost` are **edge-triggered** — they fire once per
state change. For continuous tracking data, hook into the per-frame
`update` event.

## Putting a model on an anchor

```javascript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
loader.load('/assets/model.glb', (gltf) => {
  gltf.scene.scale.set(0.1, 0.1, 0.1);  // MindAR units are meters
  gltf.scene.position.set(0, 0, 0);
  anchor.group.add(gltf.scene);

  // Optional: capture animation
  const mixer = new THREE.AnimationMixer(gltf.scene);
  gltf.animations.forEach(clip => mixer.clipAction(clip).play());

  anchor.onTargetFound = () => mixer.timeScale = 1;
  anchor.onTargetLost  = () => mixer.timeScale = 0;
});
```

## Putting HTML on an anchor (A-Frame only)

In A-Frame, you can put any HTML inside the `<a-entity mindar-image-target>`:

```html
<a-entity mindar-image-target="targetIndex: 0">
  <a-plane width="1" height="0.5" color="#007bff"></a-plane>
  <a-text value="Hello AR!" position="0 0 0.01" align="center" color="white"></a-text>
</a-entity>
```

For Three.js MindAR, project HTML onto a 3D plane using CSS3DRenderer or
just render text into a canvas texture.

## Multiple targets

```javascript
const targets = [
  { index: 0, modelUrl: '/assets/apple.glb',   animation: 'idle' },
  { index: 1, modelUrl: '/assets/ball.glb',    animation: 'spin' }
];

const anchors = targets.map(t => {
  const anchor = mindarThree.addAnchor(t.index);
  // load each model, attach to anchor
  return anchor;
});

// Optional: when ALL targets are found, trigger combo event
let found = new Set();
anchors.forEach((a, i) => {
  a.onTargetFound = () => {
    found.add(i);
    if (found.size === anchors.length) triggerCombo();
  };
  a.onTargetLost  = () => found.delete(i);
});
```

## Transform tuning

After loading a model, you'll often need to:

- **scale**: MindAR units are meters; a printed card at 0.1m needs a small model
- **position**: center of the card is `(0,0,0)` in anchor space
- **rotation**: target image's top edge becomes the anchor's +Y axis

```javascript
gltf.scene.scale.set(0.05, 0.05, 0.05);   // 5cm
gltf.scene.position.set(0, 0, 0);          // centered
gltf.scene.rotation.set(0, Math.PI, 0);    // flip 180° if upside-down
```

## Common mistakes

- **Confusing `mindar-image` (A-Frame) and `mindar-three` (Three.js).** They
  have different APIs and different scene graphs.
- **Wrong `targetIndex`.** Anchors are zero-indexed in compile order. The
  third image in `targets.mind` is `targetIndex: 2`, not `2`.
- **Heavy models on first frame.** Load asynchronously and show a
  placeholder until ready; otherwise the camera pauses on a blank target.
- **Animations don't pause on lost.** Without `mixer.timeScale = 0`, your
  animation keeps running while the model is invisible.
- **Setting `position` on the anchor instead of the model.** The anchor's
  position is overwritten by tracking; mutate `model.position` or wrap in
  another `Group`.

## References

- `references/events.md` — full event lifecycle, per-frame update hook
- `references/multi-target.md` — patterns for N-target scenes, combos
- `references/lighting.md` — environment maps, ambient/directional lighting for AR
- For face tracking → load `mindar-face-tracking`
- For video/audio → load `mindar-media-interactions`
- For performance issues → load `mindar-performance-debug`