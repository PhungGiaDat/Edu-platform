# MindAR Stack Templates

Detailed file content for each stack. The base skill points here when the
agent needs the full starter for a chosen stack.

## vanilla-threejs

### package.json
```json
{
  "name": "my-mindar-app",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --https",
    "build": "vite build",
    "preview": "vite preview --https"
  },
  "dependencies": {
    "mind-ar": "^1.2.5",
    "three": "^0.160.0"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
```

### vite.config.js
```javascript
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    https: true,
    host: '0.0.0.0'
  },
  publicDir: 'public',
  build: {
    target: 'es2020',
    rollupOptions: {
      output: { manualChunks: { three: ['three'] } }
    }
  }
});
```

### index.html
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
  <title>MindAR App</title>
  <style>
    html, body, #container { width: 100%; height: 100%; margin: 0; overflow: hidden; background: #000; }
    #container { position: relative; }
  </style>
</head>
<body>
  <div id="container"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

## aframe

### package.json (just a static server)
```json
{
  "name": "my-mindar-aframe-app",
  "private": true,
  "scripts": {
    "dev":   "npx http-server -S -C cert.pem .",
    "build": "echo 'static only'"
  }
}
```

### index.html — full template with model + light + tap interaction
```html
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MindAR A-Frame</title>
  <script src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-aframe.js"></script>
  <style>html,body{margin:0;overflow:hidden;background:#000}</style>
</head>
<body>
  <a-scene mindar-image="imageTargetSrc: /targets/targets.mind"
           color-space="sRGB" vr-mode-ui="enabled: false"
           device-orientation-permission-ui="enabled: false">
    <a-assets>
      <a-asset-item id="model" src="/assets/model.glb"></a-asset-item>
    </a-assets>
    <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
    <a-entity light="type: ambient; color: #ffffff; intensity: 0.8"></a-entity>
    <a-entity light="type: directional; position: 1 1 1; intensity: 0.6"></a-entity>
    <a-entity mindar-image-target="targetIndex: 0">
      <a-gltf-model src="#model" position="0 0 0" rotation="0 0 0" scale="0.1 0.1 0.1"></a-gltf-model>
    </a-entity>
  </a-scene>
</body>
</html>
```

## react-threejs

### package.json
```json
{
  "name": "my-mindar-react-app",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --https",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "mind-ar": "^1.2.5",
    "three": "^0.160.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^5.0.0",
    "typescript": "^5.3.0"
  }
}
```

### vite.config.ts
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: { https: true, host: '0.0.0.0' }
});
```

### src/MindARScene.tsx
```tsx
import { useEffect, useRef, useState } from 'react';
import { MindARThree } from 'mind-ar/dist/mindar-three.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function MindARScene({ targetSrc, modelUrl }: {
  targetSrc: string;
  modelUrl: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'init' | 'ready' | 'tracking' | 'lost'>('init');

  useEffect(() => {
    if (!containerRef.current) return;
    const mindarThree = new MindARThree({ container: containerRef.current, imageTargetSrc: targetSrc });
    const { renderer, scene, camera } = mindarThree;
    const anchor = mindarThree.addAnchor(0);

    new GLTFLoader().load(modelUrl, (gltf) => {
      gltf.scene.scale.setScalar(0.1);
      anchor.group.add(gltf.scene);
    });

    anchor.onTargetFound = () => setStatus('tracking');
    anchor.onTargetLost  = () => setStatus('lost');

    mindarThree.start().then(() => setStatus('ready'));
    renderer.setAnimationLoop(() => renderer.render(scene, camera));

    return () => {
      renderer.setAnimationLoop(null);
      mindarThree.stop();
      renderer.dispose();
    };
  }, [targetSrc, modelUrl]);

  return (
    <>
      <div ref={containerRef} style={{ width: '100%', height: '100vh' }} />
      <div style={{ position: 'fixed', top: 10, left: 10, color: 'white' }}>
        status: {status}
      </div>
    </>
  );
}
```

## typescript-vite

Same as vanilla-threejs but `src/main.ts` and `tsconfig.json`:

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "jsx": "preserve",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```