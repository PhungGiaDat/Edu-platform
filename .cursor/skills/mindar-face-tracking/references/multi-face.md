# Multi-face tracking

MindAR face tracking focuses on a single primary face. Multi-face support
is limited and performance-heavy.

## Single face (default)

```javascript
const mindarFace = new MindARFace({ container });
const faceMesh = mindarFace.addFaceMesh();
await mindarFace.start();
```

This tracks the largest/closest face. Good enough for selfie filters and
single-user apps.

## Multiple faces (limited)

MindAR supports up to ~3 faces in recent versions, but performance drops
fast. Each additional face adds ~30% CPU/GPU.

```javascript
// Not officially documented; check current MindAR version
const faces = [mindarFace.addFaceMesh(), mindarFace.addFaceMesh()];
// Both anchors track the two largest faces
```

If you need multi-face AR, consider **MediaPipe** or **Spark AR Studio**
instead — they handle multi-face better.

## Performance trade-offs

| Faces | Typical FPS (iPhone 11) | Notes                          |
| ----- | ----------------------- | ------------------------------ |
| 1     | 30+                     | Default                        |
| 2     | 20-25                   | Usable for paired interactions |
| 3     | 12-18                   | Sluggish on mid-range devices  |
| 4+    | <10                     | Not recommended for production |

## When to use multi-face

- Two-person AR effects (split-screen filter, paired animation)
- Group selfies with shared virtual object
- Interactive installations with multiple users

## Common pitfalls

- **Assuming face indices are stable.** They aren't — if one user leaves
  the frame, the indices may shift. Use `onTargetFound` to bind content
  dynamically rather than pre-assigning by index.
- **Different lighting on different faces.** A single directional light
  assumption breaks with multi-face. Use multiple lights or per-face
  ambient.
- **Forgetting the "no face" state.** If only one of two expected faces
  is visible, show "bring your friend closer" hint.