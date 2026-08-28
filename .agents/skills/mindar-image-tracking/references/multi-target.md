# Multi-target scenes and combos

Patterns for scenes with multiple image targets — used for AR flashcard
collections, AR trading cards, or any "combine two targets" interaction.

## Design rules

1. **Each target has a unique `targetIndex`.** MindAR compiles in file
   order; the third image compiled is `targetIndex: 2`. Don't reorder
   files in production without re-indexing all anchors.
2. **Anchor 0 is conventionally the "primary" target.** Often shown first
   in the UI / on the entry card. The first card the user scans.
3. **Combine targets trigger an animation or combo effect**, not a
   "transition to a new scene". Keep the user in the same world.

## Loading patterns

### Lazy-load per target

Don't load all N models upfront — wait for the target to be found:

```javascript
const anchors = [0, 1, 2, 3].map(i => {
  const a = mindarThree.addAnchor(i);
  a.group.visible = false;  // hidden until first found

  a.onTargetFound = async () => {
    if (!a.group.children.length) {
      const url = `/assets/target-${i}.glb`;
      const gltf = await loadGltf(url);
      gltf.scene.scale.setScalar(0.1);
      a.group.add(gltf.scene);
    }
    a.group.visible = true;
  };

  a.onTargetLost = () => { a.group.visible = false; };
  return a;
});
```

This keeps memory bounded and avoids loading assets for cards the user
never scans.

### Preload + reveal

For known course content (e.g. a fixed set of 12 flashcards), preload
all models on app start:

```javascript
const loader = new GLTFLoader();
const promises = [0,1,2,3].map(i =>
  new Promise(r => loader.load(`/assets/target-${i}.glb`, gltf => {
    gltf.scene.scale.setScalar(0.1);
    mindarThree.addAnchor(i).group.add(gltf.scene);
    r();
  }))
);
await Promise.all(promises);
```

Trade-off: faster reveal, higher memory. Use when the course is fixed
and small (≤ 12 targets).

## Combo effects

When two specific targets are both visible, trigger a "combo" animation:

```javascript
const COMBOS = [
  { needs: [0, 2], animation: () => showHeartBetween(0, 2) },
  { needs: [1, 3], animation: () => showCollision(1, 3) }
];

const active = new Set();
anchors.forEach((a, i) => {
  a.onTargetFound = () => active.add(i);
  a.onTargetLost  = () => { active.delete(i); hideCombos(); };
});

setInterval(() => {
  for (const c of COMBOS) {
    if (c.needs.every(n => active.has(n))) {
      c.animation();
    }
  }
}, 200);  // 5Hz check, sufficient for combo triggering
```

## UI overlay for "scan more" hints

Show a prompt when only some targets are found:

```javascript
function updateHint() {
  if (active.size === 0) hint.textContent = 'Point your camera at the first card';
  else if (active.size < 4) hint.textContent = `${active.size}/4 found — keep scanning`;
  else hint.textContent = 'All found! 🎉';
}
setInterval(updateHint, 500);
```

## Reference implementation: 4-card flashcard scene

The `edu-platform` project uses exactly this pattern. See
`frontend-web/` (MindAR + A-Frame two-iframe) and `mobile/unity/Assets/`
(Unity ARFoundation) for the dual-implementation.