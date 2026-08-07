# 3D gestures on tracked content

Beyond tap/drag/pinch, advanced interactions: two-finger rotate,
long-press, swipe-to-flip, and constraint-based manipulation.

## Two-finger rotate

Track two pointers and rotate based on their angle:

```javascript
let touchStartAngle = 0;
let modelStartY = 0;

renderer.domElement.addEventListener('touchstart', (e) => {
  if (e.touches.length === 2) {
    const dx = e.touches[1].clientX - e.touches[0].clientX;
    const dy = e.touches[1].clientY - e.touches[0].clientY;
    touchStartAngle = Math.atan2(dy, dx);
    modelStartY = gltf.scene.rotation.y;
  }
});

renderer.domElement.addEventListener('touchmove', (e) => {
  if (e.touches.length === 2) {
    e.preventDefault();
    const dx = e.touches[1].clientX - e.touches[0].clientX;
    const dy = e.touches[1].clientY - e.touches[0].clientY;
    const angle = Math.atan2(dy, dx);
    gltf.scene.rotation.y = modelStartY + (angle - touchStartAngle);
  }
});
```

`e.preventDefault()` is important to suppress browser-level pinch-zoom.

## Long-press for context menu

Hold for 500ms to show options:

```javascript
let pressTimer = null;
let pressX = 0, pressY = 0;

renderer.domElement.addEventListener('pointerdown', (e) => {
  pressX = e.clientX; pressY = e.clientY;
  pressTimer = setTimeout(() => showContextMenu(pressX, pressY), 500);
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (Math.hypot(e.clientX - pressX, e.clientY - pressY) > 10) {
    clearTimeout(pressTimer);
  }
});
renderer.domElement.addEventListener('pointerup', () => clearTimeout(pressTimer));
```

Cancel the timer if the pointer moves more than 10px (i.e., it's a drag,
not a long-press).

## Swipe-to-flip

Detect horizontal swipe direction:

```javascript
let swipeStartX = 0;
renderer.domElement.addEventListener('pointerdown', (e) => {
  swipeStartX = e.clientX;
});
renderer.domElement.addEventListener('pointerup', (e) => {
  const dx = e.clientX - swipeStartX;
  if (Math.abs(dx) > 100) {
    gltf.scene.rotation.y += dx > 0 ? Math.PI : -Math.PI;
  }
});
```

## Constrained gestures

To prevent over-rotation or runaway scale, clamp values:

```javascript
function clamp(x, min, max) {
  return Math.max(min, Math.min(max, x));
}

// In your rotate handler:
gltf.scene.rotation.y = clamp(gltf.scene.rotation.y, -Math.PI, Math.PI);

// In your pinch handler:
gltf.scene.scale.setScalar(clamp(0.1 * dist / initialDist, 0.02, 0.5));
```

## Snapping to angles

Snap rotation to nearest 90° after release for a polished feel:

```javascript
renderer.domElement.addEventListener('pointerup', () => {
  const step = Math.PI / 2;
  gltf.scene.rotation.y = Math.round(gltf.scene.rotation.y / step) * step;
});
```

## Hit-testing on tracked content

All gestures above use `raycaster.intersectObject(anchor.group, true)` to
ensure the user is interacting with the AR content, not empty space. The
raycaster hits both the model and any plane/video textures inside the
anchor group.

## Touch + mouse unification

Modern browsers support `pointer*` events that handle both mouse and
touch uniformly. Prefer these over `mouse*` and `touch*`:

```javascript
renderer.domElement.addEventListener('pointerdown', handler);
renderer.domElement.addEventListener('pointermove', handler);
renderer.domElement.addEventListener('pointerup',   handler);
```

`pointercancel` should also be handled to clean up state if the browser
interrupts the gesture.

## Common mistakes

- **No `e.preventDefault()` in `touchmove`.** Browser pinch-zoom fights
  with your pinch handler.
- **Listening only to `click` for tap.** Click fires after touchend,
  with a delay. Use `pointerup` directly.
- **No hit-testing.** Gestures fire on the entire canvas; without
  raycasting, you're rotating objects the user can't see.