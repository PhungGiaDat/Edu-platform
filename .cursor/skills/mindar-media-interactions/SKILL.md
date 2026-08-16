---
name: mindar-media-interactions
description: Add video, audio, gesture, and CTA interactions to MindAR scenes — play/pause video on target found/lost, handle browser autoplay restrictions, attach tap-drag-rotate-scale gestures, and synchronize animations with tracking events. Use when adding video textures, sound effects, or interactive buttons to image or face targets.
---

# MindAR Media Interactions

Add video, audio, and gesture interactions to MindAR scenes. This skill
covers the patterns that work reliably across iOS Safari, Android Chrome,
and desktop browsers — autoplay policies, gesture handling, and
synchronization with tracking.

## Video textures

Use video as a texture on a plane, anchored to a target. Play/pause
based on `targetFound`/`targetLost`.

### Three.js (programmatic)

```javascript
import * as THREE from 'three';

const video = document.createElement('video');
video.src = '/assets/intro.mp4';
video.loop = true;
video.muted = true;        // required for autoplay
video.playsInline = true;  // required for iOS
video.crossOrigin = 'anonymous';

const texture = new THREE.VideoTexture(video);
texture.colorSpace = THREE.SRGBColorSpace;

const geo = new THREE.PlaneGeometry(1, 0.5625);  // 16:9
const mat = new THREE.MeshBasicMaterial({ map: texture });
const videoPlane = new THREE.Mesh(geo, mat);
videoPlane.position.set(0, 0, 0);
anchor.group.add(videoPlane);

anchor.onTargetFound = async () => {
  try {
    await video.play();
  } catch (e) {
    console.warn('Video play blocked; user gesture needed first', e);
  }
};
anchor.onTargetLost = () => video.pause();
```

### A-Frame (declarative)

```html
<video id="intro-video"
       src="/assets/intro.mp4"
       loop muted playsinline crossorigin="anonymous"
       style="display:none"></video>

<a-entity mindar-image-target="targetIndex: 0">
  <a-video src="#intro-video" width="1" height="0.5625" position="0 0 0"></a-video>
</a-entity>

<script>
  const v = document.querySelector('#intro-video');
  const target = document.querySelector('[mindar-image-target]');
  target.addEventListener('targetFound', () => v.play().catch(() => {}));
  target.addEventListener('targetLost',  () => v.pause());
</script>
```

## Autoplay restrictions

Browsers (especially iOS Safari) block `video.play()` without a user
gesture. Strategies:

1. **Mute the video.** Muted videos can autoplay in most browsers.
2. **Pre-load metadata only.** Call `video.load()` early so the first
   frame is ready; the actual `play()` may still need a gesture.
3. **Add a "Tap to start" overlay.** Show a button that the user taps,
   which calls `play()`. Once played, subsequent `targetFound` calls
   don't need another gesture.
4. **Use `playsinline`.** Required for iOS so the video doesn't go
   fullscreen automatically.

```javascript
async function ensurePlaying(video) {
  try {
    await video.play();
  } catch (e) {
    showTapToStartOverlay(() => video.play());
  }
}
```

## Audio

WebKit (iOS) requires a user gesture for **any** audio playback. The
gesture counts site-wide once granted.

```javascript
const audio = new Audio('/assets/sfx.mp3');
audio.loop = true;

let audioUnlocked = false;

document.addEventListener('click', () => {
  audio.play().then(() => {
    audio.pause();
    audio.currentTime = 0;
    audioUnlocked = true;
  }).catch(() => {});
}, { once: true });

anchor.onTargetFound = () => {
  if (audioUnlocked) audio.play();
};
anchor.onTargetLost  = () => audio.pause();
```

The `once: true` listener unlocks audio on the first user click anywhere
on the page. After that, audio can play/pause freely.

## Gesture interactions

Tap, drag, pinch on a tracked target.

### Tap (rotate 90°)

```javascript
import { Raycaster, Vector2 } from 'three';

const raycaster = new Raycaster();
const pointer = new Vector2();

renderer.domElement.addEventListener('click', (e) => {
  pointer.x = (e.clientX / window.innerWidth)  * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(anchor.group, true);
  if (hits.length) {
    gltf.scene.rotation.y += Math.PI / 2;
  }
});
```

### Drag (rotate while dragging)

```javascript
let isDragging = false, prevX = 0;
renderer.domElement.addEventListener('pointerdown', (e) => {
  isDragging = true; prevX = e.clientX;
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (!isDragging) return;
  gltf.scene.rotation.y += (e.clientX - prevX) * 0.01;
  prevX = e.clientX;
});
renderer.domElement.addEventListener('pointerup', () => isDragging = false);
```

### Pinch (scale)

Two-finger pinch requires tracking two pointers:

```javascript
let initialDist = 0;
renderer.domElement.addEventListener('touchstart', (e) => {
  if (e.touches.length === 2) {
    initialDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
  }
});
renderer.domElement.addEventListener('touchmove', (e) => {
  if (e.touches.length === 2) {
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    gltf.scene.scale.setScalar(0.1 * dist / initialDist);
  }
});
```

## CTA buttons

A "Buy now" or "Learn more" button overlaid on the AR scene:

```javascript
const button = document.createElement('button');
button.textContent = 'Buy Now';
button.style.cssText = `
  position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
  padding: 12px 24px; background: #007bff; color: white; border: none;
  border-radius: 24px; font-size: 16px; z-index: 10;
`;
button.onclick = () => window.open('https://example.com/product', '_blank');
document.body.appendChild(button);
```

Hide the button when target is lost:

```javascript
anchor.onTargetFound = () => button.style.display = 'block';
anchor.onTargetLost  = () => button.style.display = 'none';
```

## Synchronizing animations with tracking

Pause `THREE.AnimationMixer` when target is lost:

```javascript
const mixer = new THREE.AnimationMixer(gltf.scene);
gltf.animations.forEach(clip => mixer.clipAction(clip).play());

anchor.onTargetFound = () => mixer.timeScale = 1;
anchor.onTargetLost  = () => mixer.timeScale = 0;
```

For face tracking, pause/resume based on face visibility:

```javascript
faceMesh.visible and (mixer.timeScale = 1) or (mixer.timeScale = 0);
```

## Common mistakes

- **`video.muted = false` before any user gesture.** Won't autoplay.
  Keep muted, then unmute after first user interaction.
- **Forgetting `playsinline`.** iOS goes fullscreen by default — UX killer.
- **No fallback for autoplay-blocked video.** Without a tap-to-start
  overlay, the video never plays on iOS.
- **Gesture handlers on `click` only.** Use `pointerdown`/`pointermove` for
  drag — `click` is too coarse for smooth drag.
- **Audio playing before user gesture.** Always unlock audio first.

## References

- `references/video-codecs.md` — codec/container compatibility matrix
- `references/audio-formats.md` — MP3 vs OGG vs AAC browser support
- `references/gesture-3d.md` — advanced 3D gestures on tracked content
- For tracking events → load `mindar-image-tracking`
- For perf issues with media → load `mindar-performance-debug`