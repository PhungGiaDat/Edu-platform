# Lighting for AR scenes

AR overlays 3D content on a real-world camera feed. Lighting on the 3D
content should match (roughly) the real environment, otherwise the models
look pasted-on.

## Three quick rules

1. **Use ambient + directional at minimum.** Pure ambient looks flat; pure
   directional casts harsh shadows.
2. **HDR environment maps if you have PBR materials.** Without an envmap,
   metallic/glossy materials render as solid black.
3. **Cap light intensity at ~1.0.** Real scenes rarely exceed midday sun
   (1.0 in Three.js). Over-lit AR looks fake.

## Ambient + directional

```javascript
scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(1, 1, 1);
scene.add(dir);
```

## Environment maps (PBR)

```javascript
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PMREMGenerator } from 'three';

const pmrem = new PMREMGenerator(renderer);
const env = pmrem.fromScene(new RoomEnvironment()).texture;
scene.environment = env;
```

`RoomEnvironment` is Three.js's built-in neutral room — good default when
you don't know the real lighting.

For outdoor AR (e.g. bright sunny day), use a bright HDR from Poly Haven.
For indoor scenes, RoomEnvironment is usually enough.

## Don't use real-time shadows

Shadow maps double the cost and rarely look correct in AR (they need to
match the real-world light direction). Use baked shadows or no shadows.

## Per-frame light updates

For dynamic lighting (e.g. matching real camera brightness), update
ambient intensity based on `getAverageLuminance()`:

```javascript
mindarThree.onUpdate = () => {
  const lum = estimateLuminance(renderer.domElement);
  scene.traverse(o => {
    if (o.isAmbientLight) o.intensity = 0.3 + lum * 0.7;
  });
};
```

Use sparingly — luminance estimation is expensive per frame.