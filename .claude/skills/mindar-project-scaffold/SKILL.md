---
name: mindar-project-scaffold
description: Create a new MindAR project from scratch with the right bundler, dependencies, and file structure. Use when the user asks to start a MindAR, WebAR, or augmented-reality web app, or wants a starter template for image-tracking or face-tracking scenes.
---

# MindAR Project Scaffold

Create a new MindAR project. Pick the stack that fits the user's situation:
**vanilla**, **A-Frame** (declarative HTML), **Three.js** (programmatic, more
control), or **React** (when integrating into an existing React app).

## Decision tree

```
Is the user already in a React app?
  ├─ Yes  → react-threejs (component-based)
  └─ No
       │
       Does the user want minimal code / HTML-first?
         ├─ Yes  → aframe (declarative <a-scene>)
         └─ No   → vanilla or typescript-vite (programmatic)
```

## What you create

The `mindar_scaffold_project` MCP tool (or this skill's templates) generates:

```
<project-name>/
├── package.json          # pinned MindAR + bundler versions
├── index.html            # entry, includes <canvas> or <a-scene>
├── src/
│   └── main.{js,ts}      # bootstraps MindAR + camera
├── public/
│   ├── targets/          # .mind files (output of mindar-target-compiler)
│   └── assets/           # .glb, .jpg, .mp4
├── vite.config.{js,ts}   # for vanilla / react stacks
├── tsconfig.json         # if TypeScript
└── README.md             # how to run, where to put targets
```

## Per-stack starting points

### vanilla-threejs (recommended default)

```json
// package.json
{
  "name": "<name>",
  "private": true,
  "type": "module",
  "scripts": {
    "dev":   "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "mind-ar": "^1.2.5",
    "three":  "^0.160.0"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
```

```javascript
// src/main.js
import { MindARThree } from 'mind-ar/dist/mindar-three.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

const mindarThree = new MindARThree({
  container: document.querySelector('#container'),
  imageTargetSrc: '/targets/targets.mind'
});

const { renderer, scene, camera } = mindarThree;
const anchor = mindarThree.addAnchor(0);

const loader = new GLTFLoader();
loader.load('/assets/model.glb', (gltf) => {
  gltf.scene.scale.set(0.1, 0.1, 0.1);
  anchor.group.add(gltf.scene);
});

anchor.onTargetFound = () => console.log('found');
anchor.onTargetLost  = () => console.log('lost');

await mindarThree.start();
renderer.setAnimationLoop(() => mindarThree.renderer.render(scene, camera));
```

### aframe (HTML-first, no JS scene setup)

```html
<!-- index.html -->
<script src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-aframe.js"></script>

<a-scene mindar-image="imageTargetSrc: /targets/targets.mind"
         color-space="sRGB" vr-mode-ui="enabled: false"
         device-orientation-permission-ui="enabled: false">
  <a-camera position="0 0 0"></a-camera>
  <a-entity mindar-image-target="targetIndex: 0">
    <a-gltf-model src="/assets/model.glb"
                  position="0 0 0" rotation="0 0 0" scale="0.1 0.1 0.1">
    </a-gltf-model>
  </a-entity>
</a-scene>
```

### react-threejs

```tsx
// src/MindARScene.tsx
import { useEffect, useRef } from 'react';
import { MindARThree } from 'mind-ar/dist/mindar-three.js';

export function MindARScene({ targetSrc }: { targetSrc: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const mindarThree = new MindARThree({
      container: containerRef.current,
      imageTargetSrc: targetSrc
    });
    const anchor = mindarThree.addAnchor(0);
    // ... add models, lighting, etc.

    mindarThree.start().then(() => {
      mindarThree.renderer.setAnimationLoop(() => {
        mindarThree.renderer.render(mindarThree.scene, mindarThree.camera);
      });
    });

    return () => {
      mindarThree.stop();
      mindarThree.renderer.dispose();
    };
  }, [targetSrc]);

  return <div ref={containerRef} style={{ width: '100%', height: '100vh' }} />;
}
```

## Version pinning

Always pin to known-good versions. MindAR's API surface changes between
minor releases:

| Package       | Pinned version | Notes                                       |
| ------------- | -------------- | ------------------------------------------- |
| `mind-ar`     | `^1.2.5`       | 1.2.x is the stable line; 1.3+ has breaking changes |
| `three`       | `^0.160.0`     | Match the version `mind-ar` was tested with |
| `aframe`      | `^1.5.0`       | Use 1.5.x; 1.6+ removes some entity attrs    |
| `vite`        | `^5.0.0`       | Node ≥ 18 required                          |

## Common mistakes

- **No `vite.config.js` with HTTPS.** Camera requires secure context.
  Vite needs `server: { https: true }` for local dev over LAN.
- **Forgetting the `<canvas>` or `<a-scene>` height.** Default `<body>` is
  zero-height; set `html, body, #container { height: 100%; margin: 0 }`.
- **Importing from `mind-ar` root.** Always import from
  `mind-ar/dist/mindar-three.js` or `mind-ar/dist/mindar-face.js` — the
  root import breaks tree-shaking.
- **Serving from `file://`.** Browsers block camera on `file://` URLs.
  Always run via `vite` or similar dev server.

## References

- `references/stacks.md` — full per-stack package.json + tsconfig + entry files
- `references/local-https.md` — vite HTTPS setup for LAN testing
- For tracking/event details → load `mindar-image-tracking`
- For target compilation → load `mindar-target-compiler`