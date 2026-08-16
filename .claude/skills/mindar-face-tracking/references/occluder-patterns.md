# Occluder patterns for face tracking

An occluder is an invisible mesh that writes only to the depth buffer —
content behind it (rendered later) gets clipped. Used to make 3D objects
look like they're behind the face or interact correctly with face geometry.

## Basic depth-only occluder

```javascript
const occluderMat = new THREE.MeshBasicMaterial({
  colorWrite: false,        // don't draw color
  depthWrite: true          // write to depth buffer
});
const occluderGeo = new THREE.SphereGeometry(0.12, 32, 32);
const occluder = new THREE.Mesh(occluderGeo, occluderMat);
faceMesh.add(occluder);
```

## Order matters

The occluder must be rendered **before** any content it should hide.
Default Three.js render order follows scene-graph order; force it with
`renderOrder`:

```javascript
occluder.renderOrder = -10;   // render first

// Then content
content.renderOrder = 0;
```

## Common occluder shapes

- **Sphere** — general face volume; simplest, slightly inaccurate at edges
- **Head mesh** — use MindAR's `addFaceMesh()` with a skin-toned material
  for a more accurate occluder; this is the "real" approach
- **Two half-spheres** — for glasses frames that go around the head
- **Custom geometry** — for very specific use cases (e.g. occluder for
  ears only)

## Using face mesh as occluder

```javascript
const faceMesh = mindarFace.addFaceMesh();
faceMesh.material = new THREE.MeshBasicMaterial({
  colorWrite: false,
  depthWrite: true
});
// Now any content added behind the face will be clipped
```

The face mesh follows the user's face geometry more accurately than a
generic sphere — use it when you need ear pieces or back-of-head content.

## Stencil-buffer approach (advanced)

For cases where simple depth-occlusion isn't enough (e.g. partial
transparency, custom blending), use the stencil buffer. MindAR doesn't
ship with stencil support; you'd need to extend Three.js renderer setup.

## Pitfalls

- **Occluder visible in transparent models.** If the occluder sphere is
  too big, it clips visible content. Size to the actual face geometry.
- **Z-fighting between occluder and content.** Move the occluder slightly
  back (`z -= 0.001`) or use polygonOffset on the occluder material.
- **Occluder doesn't track fast head motion.** Depth-only render can lag
  one frame. Acceptable for most uses; for precise occlusion, use
  per-frame `faceMesh.matrix` updates.

## When NOT to use an occluder

If the entire face area is covered (e.g. full-face mask), skip the
occluder — there's nothing to clip behind the face. Occluders only matter
for content that extends past face edges (glasses ear pieces, hats,
earrings, headbands).