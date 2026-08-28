# MindAR Image Tracking Events

Full lifecycle of `targetFound`, `targetLost`, and per-frame `update`.

## Edge events

```javascript
anchor.onTargetFound = () => {
  // Fires when marker is detected.
  // anchor.group.visible becomes true automatically.
};

anchor.onTargetLost = () => {
  // Fires when marker is no longer visible.
  // anchor.group.visible becomes false automatically.
};
```

These are **edge-triggered**, not level-triggered. They fire once per
state change. If you need to know "is the target currently visible?", track
it in a local variable:

```javascript
let isFound = false;
anchor.onTargetFound = () => { isFound = true; /* ... */ };
anchor.onTargetLost  = () => { isFound = false; /* ... */ };
```

## Per-frame update

For continuous tracking data, subscribe to the per-frame event on
`MindARThree`:

```javascript
mindarThree.onUpdate = (delta) => {
  // anchor.matrix is the current 4x4 transform
  // (already applied to anchor.group automatically)
  // Use this to drive non-tracking logic like timer-based animations.
};
```

`delta` is the time in seconds since the last frame. Use it instead of
`clock.getDelta()` for consistency with MindAR's render loop.

## Multi-target semantics

When multiple targets are tracked simultaneously, each anchor's events
fire independently. There is no built-in "all targets found" event —
combine manually:

```javascript
const states = new Map();
anchors.forEach((a, i) => {
  states.set(i, false);
  a.onTargetFound = () => states.set(i, true);
  a.onTargetLost  = () => states.set(i, false);
});

setInterval(() => {
  const allFound = [...states.values()].every(s => s);
  if (allFound) triggerCelebration();
}, 500);
```

## Confidence / stability

MindAR does not expose a per-frame confidence score publicly, but you can
observe stability by tracking how long a target has been continuously found:

```javascript
let foundAt = 0;
anchor.onTargetFound = () => {
  foundAt = performance.now();
};
anchor.onUpdate = () => {
  const stableMs = performance.now() - foundAt;
  // Use stableMs to delay content reveal until target is stable
  if (stableMs > 500 && !anchor.group.children[0].visible) {
    anchor.group.children[0].visible = true;
  }
};
```

This is the stabilization pattern recommended by the
`ar-tracking-patterns` reference in `ar-mobile-edu`.

## Cleanup

Always tear down listeners and animation loops in the React/useEffect
cleanup:

```javascript
useEffect(() => {
  // setup
  return () => {
    mindarThree.renderer.setAnimationLoop(null);
    mindarThree.stop();
    mindarThree.renderer.dispose();
    // anchor.onTargetFound/Lost are released with anchor
  };
}, []);
```