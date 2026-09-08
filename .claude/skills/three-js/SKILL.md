---
name: three-js
description: Immersive 3D web experiences with Three.js, WebGL/WebGPU, shaders, and advanced rendering techniques
---
# Three.js Development

Comprehensive guide to creating immersive 3D web experiences using Three.js with WebGL and WebGPU rendering.

## Overview

- **Purpose:** Build interactive 3D applications, visualizations, games, and immersive experiences for the web
- **Scope:** Core concepts, geometries, materials, lighting, shaders, animations, physics, post-processing, and performance optimization
- **Audience:** Web developers, creative developers, game developers, visualization specialists

## When to Use

Use this skill when:
- Building 3D product configurators
- Creating data visualizations in 3D
- Developing web-based games
- Building architectural visualizations
- Creating AR/VR experiences
- Developing interactive 3D websites
- Building scientific simulations

## Prerequisites

```bash
# Install Three.js
npm install three

# TypeScript types (optional)
npm install @types/three -D

# Development tools
npm install vite typescript -D
```

**Basic Setup:**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Three.js App</title>
    <style>
        body { margin: 0; overflow: hidden; }
        canvas { display: block; }
    </style>
</head>
<body>
    <script type="module" src="/src/main.js"></script>
</body>
</html>
```

---

## Core Concepts

### Scene Setup

The fundamental building blocks of any Three.js application.

```typescript
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene - Container for all 3D objects
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// Camera - Defines what we see
const camera = new THREE.PerspectiveCamera(
    75,                                    // FOV (degrees)
    window.innerWidth / window.innerHeight, // Aspect ratio
    0.1,                                   // Near clipping plane
    1000                                   // Far clipping plane
);
camera.position.set(0, 5, 10);

// Renderer - Draws the scene
const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

// Controls - Camera interaction
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 2;
controls.maxDistance = 50;

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();
```

### Camera Types

| Camera | Use Case | Key Properties |
|--------|----------|----------------|
| `PerspectiveCamera` | Realistic 3D scenes | fov, aspect, near, far |
| `OrthographicCamera` | 2D/isometric games | left, right, top, bottom, near, far |
| `CubeCamera` | Reflections, env maps | 6 render passes |
| `StereoCamera` | VR/AR applications | eye separation |

**Orthographic Camera Example:**
```typescript
const aspect = window.innerWidth / window.innerHeight;
const frustumSize = 10;

const camera = new THREE.OrthographicCamera(
    frustumSize * aspect / -2,  // left
    frustumSize * aspect / 2,   // right
    frustumSize / 2,            // top
    frustumSize / -2,           // bottom
    0.1,                        // near
    1000                        // far
);
```

---

## Geometries

### Built-in Geometries

```typescript
// Box (Cube)
const boxGeometry = new THREE.BoxGeometry(
    2,    // width
    2,    // height
    2,    // depth
    4,    // widthSegments
    4,    // heightSegments
    4     // depthSegments
);

// Sphere
const sphereGeometry = new THREE.SphereGeometry(
    1,     // radius
    32,    // widthSegments
    16     // heightSegments
);

// Cylinder
const cylinderGeometry = new THREE.CylinderGeometry(
    1,    // radiusTop
    1,    // radiusBottom
    2,    // height
    32    // radialSegments
);

// Cone
const coneGeometry = new THREE.ConeGeometry(
    1,    // radius
    2,    // height
    32    // radialSegments
);

// Torus (Donut)
const torusGeometry = new THREE.TorusGeometry(
    1,    // radius
    0.4,  // tube
    16,   // radialSegments
    100   // tubularSegments
);

// Plane (Ground)
const planeGeometry = new THREE.PlaneGeometry(
    10,   // width
    10,   // height
    10,   // widthSegments
    10    // heightSegments
);

// Capsule
const capsuleGeometry = new THREE.CapsuleGeometry(
    0.5,  // radius
    1,    // length
    8,    // capSegments
    16    // radialSegments
);
```

### Custom Geometry

```typescript
// Create custom geometry from vertices
const geometry = new THREE.BufferGeometry();

// Define vertices (x, y, z for each point)
const vertices = new Float32Array([
    // Front face
    -1, -1,  1,   // bottom-left
     1, -1,  1,   // bottom-right
     1,  1,  1,   // top-right
    -1,  1,  1,   // top-left
    // Back face
    -1, -1, -1,
     1, -1, -1,
     1,  1, -1,
    -1,  1, -1,
]);

geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

// Define indices for triangles
const indices = new Uint16Array([
    0, 1, 2,   0, 2, 3,    // front
    4, 6, 5,   4, 7, 6,    // back
    // ... more faces
]);
geometry.setIndex(new THREE.BufferAttribute(indices, 1));

// Calculate normals for lighting
geometry.computeVertexNormals();
```

### Procedural Geometry

```typescript
// Terrain from heightmap
function createTerrain(width: number, depth: number, resolution: number) {
    const geometry = new THREE.PlaneGeometry(
        width, 
        depth, 
        resolution, 
        resolution
    );
    
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        
        // Simple noise function for height
        positions[i + 2] = Math.sin(x * 0.5) * Math.cos(y * 0.5) * 2;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    return geometry;
}
```

---

## Materials

### Material Types

```typescript
// Basic - Unlit, no lighting calculations
const basicMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    wireframe: false,
    transparent: true,
    opacity: 0.8
});

// Standard - PBR (Physically Based Rendering)
const standardMaterial = new THREE.MeshStandardMaterial({
    color: 0x2194ce,
    metalness: 0.5,
    roughness: 0.5,
    envMapIntensity: 1.0
});

// Physical - Extended PBR with more controls
const physicalMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.0,
    roughness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    transmission: 0.9,    // Glass-like transparency
    thickness: 0.5,
    ior: 1.5              // Index of refraction
});

// Phong - Classic lighting model
const phongMaterial = new THREE.MeshPhongMaterial({
    color: 0x156289,
    emissive: 0x072534,
    specular: 0xffffff,
    shininess: 100
});

// Lambert - Diffuse only
const lambertMaterial = new THREE.MeshLambertMaterial({
    color: 0x156289,
    emissive: 0x000000
});

// Toon - Cartoon-style shading
const toonMaterial = new THREE.MeshToonMaterial({
    color: 0x00ff00,
    gradientMap: texture  // Optional gradient texture
});

// Normal - Visualize normals (debugging)
const normalMaterial = new THREE.MeshNormalMaterial();

// Matcap - Fast material capture
const matcapMaterial = new THREE.MeshMatcapMaterial({
    matcap: matcapTexture
});
```

### PBR Material Properties

```typescript
const material = new THREE.MeshStandardMaterial({
    // Base
    color: 0x888888,           // Diffuse color
    metalness: 0.5,            // 0 = dielectric, 1 = metal
    roughness: 0.5,            // 0 = smooth, 1 = rough
    
    // Textures
    map: diffuseMap,           // Diffuse/albedo
    metalnessMap: metalMap,    // Metalness channel
    roughnessMap: roughMap,    // Roughness channel
    normalMap: normalMap,      // Surface detail
    aoMap: aoMap,              // Ambient occlusion
    emissiveMap: emissiveMap,  // Self-illumination
    emissive: 0xffffff,
    emissiveIntensity: 1.0,
    
    // Environment
    envMap: envMap,            // Reflections
    envMapIntensity: 1.0,
    
    // Transparency
    transparent: true,
    opacity: 1.0,
    alphaTest: 0.5,            // Discard pixels below threshold
    
    // Sides
    side: THREE.DoubleSide,    // FrontSide, BackSide, DoubleSide
});
```

### Texture Loading

```typescript
import { TextureLoader } from 'three';

const textureLoader = new TextureLoader();

// Basic loading
const texture = textureLoader.load('/textures/diffuse.jpg');

// With callbacks
const texture = textureLoader.load(
    '/textures/diffuse.jpg',
    (texture) => {
        console.log('Texture loaded');
        texture.colorSpace = THREE.SRGBColorSpace;
    },
    (progress) => {
        console.log(`Loading: ${(progress.loaded / progress.total * 100)}%`);
    },
    (error) => {
        console.error('Error loading texture', error);
    }
);

// Texture properties
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
texture.repeat.set(2, 2);
texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
```

### Async Texture Loading

```typescript
// Modern async loading
async function loadTexture(url: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
        textureLoader.load(url, resolve, undefined, reject);
    });
}

// Loading multiple textures
async function loadTextures() {
    const [diffuse, normal, roughness] = await Promise.all([
        loadTexture('/textures/diffuse.jpg'),
        loadTexture('/textures/normal.jpg'),
        loadTexture('/textures/roughness.jpg')
    ]);
    
    return { diffuse, normal, roughness };
}
```

---

## Lighting

### Light Types

```typescript
// Ambient - Uniform light from all directions
const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

// Directional - Parallel rays (sun)
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -10;
directionalLight.shadow.camera.right = 10;
directionalLight.shadow.camera.top = 10;
directionalLight.shadow.camera.bottom = -10;
scene.add(directionalLight);

// Point - Light emanating from a point
const pointLight = new THREE.PointLight(0xff0000, 1, 100);
pointLight.position.set(0, 5, 0);
pointLight.castShadow = true;
scene.add(pointLight);

// Spot - Cone of light
const spotLight = new THREE.SpotLight(0xffffff, 1);
spotLight.position.set(0, 10, 0);
spotLight.angle = Math.PI / 6;          // 30 degrees
spotLight.penumbra = 0.3;               // Soft edge
spotLight.decay = 2;                    // Light falloff
spotLight.distance = 50;
spotLight.castShadow = true;
scene.add(spotLight);

// Hemisphere - Sky/ground lighting
const hemisphereLight = new THREE.HemisphereLight(
    0x87ceeb,  // Sky color
    0x8b4513,  // Ground color
    0.5        // Intensity
);
scene.add(hemisphereLight);

// Rect Area - Area light (requires RectAreaLightUniformsLib)
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { RectAreaLightHelper } from 'three/addons/helpers/RectAreaLightHelper.js';

RectAreaLightUniformsLib.init();

const rectLight = new THREE.RectAreaLight(0xffffff, 5, 4, 2);
rectLight.position.set(0, 5, 0);
rectLight.lookAt(0, 0, 0);
scene.add(rectLight);
scene.add(new RectAreaLightHelper(rectLight));
```

### Shadow Configuration

```typescript
// Renderer shadow setup
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Light shadow configuration
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;

// Shadow camera helper (debugging)
const shadowHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
scene.add(shadowHelper);

// Object shadow settings
mesh.castShadow = true;      // Object casts shadows
mesh.receiveShadow = true;   // Object receives shadows
```

### Environment Maps

```typescript
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

// Load HDRI environment
const rgbeLoader = new RGBELoader();
rgbeLoader.load('/environment.hdr', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
    scene.background = texture;
});

// Generate environment from scene
const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256);
const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);
scene.add(cubeCamera);

// Update environment map
cubeCamera.position.copy(mesh.position);
mesh.visible = false;
cubeCamera.update(renderer, scene);
mesh.visible = true;
mesh.material.envMap = cubeRenderTarget.texture;
```

---

## Animation

### Basic Animation

```typescript
// Rotate object continuously
function animate() {
    requestAnimationFrame(animate);
    
    mesh.rotation.x += 0.01;
    mesh.rotation.y += 0.02;
    
    renderer.render(scene, camera);
}

// Time-based animation
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    
    const elapsedTime = clock.getElapsedTime();
    
    mesh.rotation.y = elapsedTime * 0.5;
    mesh.position.y = Math.sin(elapsedTime) * 2;
    
    renderer.render(scene, camera);
}
```

### GSAP Integration

```bash
npm install gsap
```

```typescript
import gsap from 'gsap';

// Animate position
gsap.to(mesh.position, {
    duration: 2,
    x: 5,
    y: 3,
    ease: 'power2.inOut',
    repeat: -1,
    yoyo: true
});

// Animate rotation
gsap.to(mesh.rotation, {
    duration: 1,
    y: Math.PI * 2,
    ease: 'none',
    repeat: -1
});

// Animate material properties
gsap.to(mesh.material, {
    duration: 1,
    opacity: 0,
    ease: 'power2.out'
});

// Timeline for complex animations
const timeline = gsap.timeline({ repeat: -1 });
timeline
    .to(mesh.position, { duration: 1, y: 2 })
    .to(mesh.rotation, { duration: 1, y: Math.PI })
    .to(mesh.scale, { duration: 0.5, x: 2, y: 2, z: 2 });
```

### Morph Targets

```typescript
// Create morph targets
const geometry = new THREE.BoxGeometry(2, 2, 2);

// Store original positions
const positionAttribute = geometry.attributes.position;
const originalPositions = positionAttribute.array.slice();

// Create morph target
const morphPositions = new Float32Array(originalPositions.length);
for (let i = 0; i < morphPositions.length; i += 3) {
    morphPositions[i] = originalPositions[i] * 1.5;
    morphPositions[i + 1] = originalPositions[i + 1] * 1.5;
    morphPositions[i + 2] = originalPositions[i + 2] * 1.5;
}

geometry.morphAttributes.position = [
    new THREE.BufferAttribute(morphPositions, 3)
];

const material = new THREE.MeshStandardMaterial({
    color: 0x00ff00,
    morphTargets: true
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// Animate morph target
function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();
    mesh.morphTargetInfluences[0] = (Math.sin(time) + 1) / 2;
}
```

### Skeletal Animation

```typescript
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const gltfLoader = new GLTFLoader();

gltfLoader.load('/models/character.glb', (gltf) => {
    const model = gltf.scene;
    const mixer = new THREE.AnimationMixer(model);
    
    // Play all animations
    gltf.animations.forEach((clip) => {
        mixer.clipAction(clip).play();
    });
    
    scene.add(model);
    
    // Update in animation loop
    const clock = new THREE.Clock();
    
    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        mixer.update(delta);
        renderer.render(scene, camera);
    }
});
```

---

## Shaders

### Custom Shader Material

```typescript
// Vertex Shader
const vertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    uniform float uTime;
    
    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        
        // Vertex displacement
        vec3 pos = position;
        pos.z += sin(pos.x * 5.0 + uTime) * 0.1;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

// Fragment Shader
const fragmentShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    uniform float uTime;
    uniform vec3 uColor;
    uniform sampler2D uTexture;
    
    void main() {
        // Basic color
        vec3 color = uColor;
        
        // Add texture
        vec4 texColor = texture2D(uTexture, vUv);
        
        // Add lighting
        vec3 light = normalize(vec3(1.0, 1.0, 1.0));
        float diffuse = max(dot(vNormal, light), 0.0);
        
        // Add time-based effect
        float wave = sin(vUv.x * 10.0 + uTime) * 0.5 + 0.5;
        
        vec3 finalColor = mix(color, texColor.rgb, 0.5) * diffuse * wave;
        
        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

// Create shader material
const shaderMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xff0000) },
        uTexture: { value: texture }
    },
    side: THREE.DoubleSide,
    transparent: true
});

// Update uniforms in animation loop
function animate() {
    requestAnimationFrame(animate);
    shaderMaterial.uniforms.uTime.value = clock.getElapsedTime();
    renderer.render(scene, camera);
}
```

### Built-in Shader Chunks

```typescript
// Extend built-in materials with shaders
import * as THREE from 'three';

const material = new THREE.MeshStandardMaterial({
    color: 0x00ff00,
    onBeforeCompile: (shader) => {
        // Store original vertex shader
        const vertexShader = shader.vertexShader;
        
        // Modify vertex shader
        shader.vertexShader = vertexShader.replace(
            '#include <common>',
            `
            #include <common>
            uniform float uTime;
            `
        );
        
        // Add custom uniforms
        shader.uniforms.uTime = { value: 0 };
        
        // Store reference for updating
        material.userData.shader = shader;
    }
});

// Update in animation loop
function animate() {
    requestAnimationFrame(animate);
    if (material.userData.shader) {
        material.userData.shader.uniforms.uTime.value = clock.getElapsedTime();
    }
}
```

### Post-processing Shaders

```typescript
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Custom post-processing shader
const CustomShader = {
    uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2() }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform vec2 uResolution;
        varying vec2 vUv;
        
        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            
            // Vignette effect
            vec2 center = vUv - 0.5;
            float vignette = 1.0 - dot(center, center) * 2.0;
            color.rgb *= vignette;
            
            // Color grading
            color.rgb = pow(color.rgb, vec3(0.9));
            
            gl_FragColor = color;
        }
    `
};

// Setup post-processing
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const customPass = new ShaderPass(CustomShader);
composer.addPass(customPass);

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.5,  // strength
    0.4,  // radius
    0.85  // threshold
);
composer.addPass(bloomPass);

// Render with composer instead of renderer
function animate() {
    requestAnimationFrame(animate);
    customPass.uniforms.uTime.value = clock.getElapsedTime();
    composer.render();
}
```

---

## Post-Processing

### Standard Effects Pipeline

```typescript
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';
import { GlitchPass } from 'three/addons/postprocessing/GlitchPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

// Create composer
const composer = new EffectComposer(renderer);

// 1. Render pass (always first)
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// 2. Ambient Occlusion
const ssaoPass = new SSAOPass(scene, camera, width, height);
composer.addPass(ssaoPass);

// 3. Bloom (glow)
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    0.8,   // strength
    0.3,   // radius
    0.9    // threshold
);
composer.addPass(bloomPass);

// 4. Depth of Field
const bokehPass = new BokehPass(scene, camera, {
    focus: 10,
    aperture: 0.00001,
    maxblur: 0.01
});
composer.addPass(bokehPass);

// 5. Anti-aliasing (always last)
const smaaPass = new SMAAPass(width, height);
composer.addPass(smaaPass);
```

---

## Physics

### Cannon.js Integration

```bash
npm install cannon-es
```

```typescript
import * as CANNON from 'cannon-es';

// Physics world
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);
world.broadphase = new CANNON.SAPBroadphase(world);
world.defaultContactMaterial.friction = 0.1;

// Ground body
const groundBody = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Plane()
});
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);

// Sphere body
const sphereBody = new CANNON.Body({
    mass: 1,
    shape: new CANNON.Sphere(1),
    position: new CANNON.Vec3(0, 10, 0)
});
world.addBody(sphereBody);

// Sync Three.js mesh with physics
const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
const sphereMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(sphereMesh);

// Animation loop with physics
const clock = new THREE.Clock();
let oldElapsedTime = 0;

function animate() {
    requestAnimationFrame(animate);
    
    const elapsedTime = clock.getElapsedTime();
    const deltaTime = elapsedTime - oldElapsedTime;
    oldElapsedTime = elapsedTime;
    
    // Step physics
    world.step(1 / 60, deltaTime, 3);
    
    // Sync mesh with body
    sphereMesh.position.copy(sphereBody.position as unknown as THREE.Vector3);
    sphereMesh.quaternion.copy(sphereBody.quaternion as unknown as THREE.Quaternion);
    
    controls.update();
    renderer.render(scene, camera);
}
```

### Rapier Physics

```bash
npm install @dimforge/rapier3d-compat
```

```typescript
import RAPIER from '@dimforge/rapier3d-compat';

await RAPIER.init();
const world = new RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 });

// Create rigid body
const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(0.0, 10.0, 0.0);
const body = world.createRigidBody(bodyDesc);

// Create collider
const colliderDesc = RAPIER.ColliderDesc.ball(1.0);
world.createCollider(colliderDesc, body);

// Simulation loop
function animate() {
    requestAnimationFrame(animate);
    world.step();
    const position = body.translation();
    mesh.position.set(position.x, position.y, position.z);
}
```

---

## Performance Optimization

### Level of Detail (LOD)

```typescript
const lod = new THREE.LOD();

// High detail - close
const highDetail = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 64),
    new THREE.MeshStandardMaterial()
);
lod.addLevel(highDetail, 0);

// Medium detail
const mediumDetail = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 32),
    new THREE.MeshStandardMaterial()
);
lod.addLevel(mediumDetail, 10);

// Low detail - far
const lowDetail = new THREE.Mesh(
    new THREE.SphereGeometry(1, 8, 8),
    new THREE.MeshBasicMaterial()
);
lod.addLevel(lowDetail, 50);

scene.add(lod);
```

### Instancing

```typescript
// InstancedMesh for many identical objects
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });

const count = 10000;
const mesh = new THREE.InstancedMesh(geometry, material, count);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

// Set instance transforms
const dummy = new THREE.Object3D();
for (let i = 0; i < count; i++) {
    dummy.position.set(
        Math.random() * 100 - 50,
        Math.random() * 100 - 50,
        Math.random() * 100 - 50
    );
    dummy.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
    );
    dummy.scale.setScalar(Math.random() * 2);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
}

scene.add(mesh);

// Update instances in animation loop
function animate() {
    requestAnimationFrame(animate);
    for (let i = 0; i < count; i++) {
        dummy.rotation.y += 0.01;
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
}
```

### Frustum Culling

```typescript
// Automatic frustum culling
mesh.frustumCulled = true;  // Default: true

// Manual culling check
const frustum = new THREE.Frustum();
const projScreenMatrix = new THREE.Matrix4();
projScreenMatrix.multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse
);
frustum.setFromProjectionMatrix(projScreenMatrix);

if (frustum.intersectsObject(mesh)) {
    // Object is visible
}
```

### Memory Management

```typescript
// Dispose of objects properly
function disposeObject(obj: THREE.Object3D) {
    obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            if (child.geometry) {
                child.geometry.dispose();
            }
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => disposeMaterial(m));
                } else {
                    disposeMaterial(child.material);
                }
            }
        }
    });
    scene.remove(obj);
}

function disposeMaterial(material: THREE.Material) {
    // Dispose textures
    const textures = [
        material.map,
        material.normalMap,
        material.roughnessMap,
        material.metalnessMap,
        material.aoMap,
        material.emissiveMap
    ];
    
    textures.forEach(texture => {
        if (texture) texture.dispose();
    });
    
    material.dispose();
}

// Dispose renderer
function cleanup() {
    renderer.dispose();
    composer?.dispose();
}
```

### Performance Tips

```typescript
// 1. Use BufferGeometry (already default)
const geometry = new THREE.BufferGeometry();

// 2. Merge geometries
import { mergeBufferGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const merged = mergeBufferGeometries([geo1, geo2, geo3]);

// 3. Share materials
const sharedMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const mesh1 = new THREE.Mesh(geo1, sharedMaterial);
const mesh2 = new THREE.Mesh(geo2, sharedMaterial);

// 4. Reduce draw calls
// Use InstancedMesh for repeated objects
// Use merged geometries for static objects

// 5. Optimize shadows
renderer.shadowMap.type = THREE.BasicShadowMap;  // Faster than PCFSoftShadowMap
light.shadow.mapSize.width = 1024;  // Lower resolution

// 6. Use simpler materials
// MeshLambertMaterial < MeshPhongMaterial < MeshStandardMaterial

// 7. Limit pixel ratio
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// 8. Use object pooling
const objectPool: THREE.Mesh[] = [];
function getMesh() {
    return objectPool.pop() || new THREE.Mesh(geometry, material);
}
function returnMesh(mesh: THREE.Mesh) {
    objectPool.push(mesh);
}
```

---

## WebGPU Support

### WebGPU Renderer (Experimental)

```typescript
import { WebGPURenderer } from 'three/addons/renderers/webgpu/WebGPURenderer.js';

// Check WebGPU support
async function checkWebGPUSupport() {
    if (!navigator.gpu) {
        console.warn('WebGPU not supported, falling back to WebGL');
        return false;
    }
    const adapter = await navigator.gpu.requestAdapter();
    return adapter !== null;
}

// Initialize WebGPU renderer
async function initWebGPU() {
    const renderer = new WebGPURenderer({
        antialias: true
    });
    
    await renderer.init();
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    document.body.appendChild(renderer.domElement);
    
    return renderer;
}

// Usage
const isWebGPUAvailable = await checkWebGPUSupport();
const renderer = isWebGPUAvailable 
    ? await initWebGPU() 
    : new THREE.WebGLRenderer({ antialias: true });
```

### WebGPU Features

```typescript
// WebGPU-specific features
// 1. Compute shaders
// 2. Better performance for complex scenes
// 3. Advanced post-processing

// Note: WebGPU support in Three.js is experimental
// Check for updates: https://threejs.org/docs/#api/en/renderers/webgpu/WebGPURenderer
```

---

## Common Patterns

### Pattern: Interactive 3D Product Viewer

```typescript
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

class ProductViewer {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;
    private model: THREE.Group | null = null;
    
    constructor(container: HTMLElement) {
        // Scene setup
        this.scene = new THREE.Scene();
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            45,
            container.clientWidth / container.clientHeight,
            0.1,
            100
        );
        this.camera.position.set(5, 3, 5);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        container.appendChild(this.renderer.domElement);
        
        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 1;
        
        // Lighting
        this.setupLighting();
        
        // Resize handler
        window.addEventListener('resize', () => this.onResize(container));
        
        // Start animation
        this.animate();
    }
    
    private setupLighting() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambient);
        
        const directional = new THREE.DirectionalLight(0xffffff, 1);
        directional.position.set(5, 10, 7);
        this.scene.add(directional);
        
        const backLight = new THREE.DirectionalLight(0xffffff, 0.5);
        backLight.position.set(-5, 5, -5);
        this.scene.add(backLight);
    }
    
    async loadModel(url: string) {
        const loader = new GLTFLoader();
        
        // Draco compression
        const draco = new DRACOLoader();
        draco.setDecoderPath('/draco/');
        loader.setDRACOLoader(draco);
        
        const gltf = await loader.loadAsync(url);
        this.model = gltf.scene;
        
        // Center and scale model
        const box = new THREE.Box3().setFromObject(this.model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        this.model.position.sub(center);
        const maxDim = Math.max(size.x, size.y, size.z);
        this.model.scale.divideScalar(maxDim / 2);
        
        this.scene.add(this.model);
    }
    
    async loadEnvironment(url: string) {
        const loader = new RGBELoader();
        const texture = await loader.loadAsync(url);
        texture.mapping = THREE.EquirectangularReflectionMapping;
        this.scene.environment = texture;
    }
    
    private onResize(container: HTMLElement) {
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }
    
    private animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    dispose() {
        this.renderer.dispose();
        this.controls.dispose();
    }
}

// Usage
const viewer = new ProductViewer(document.getElementById('container')!);
await viewer.loadModel('/models/product.glb');
await viewer.loadEnvironment('/environment.hdr');
```

### Pattern: Particle System

```typescript
import * as THREE from 'three';

class ParticleSystem {
    private geometry: THREE.BufferGeometry;
    private material: THREE.PointsMaterial;
    private points: THREE.Points;
    private positions: Float32Array;
    private velocities: Float32Array;
    private count: number;
    
    constructor(count: number = 10000) {
        this.count = count;
        
        this.geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(count * 3);
        this.velocities = new Float32Array(count * 3);
        
        for (let i = 0; i < count * 3; i += 3) {
            // Random positions
            this.positions[i] = (Math.random() - 0.5) * 100;
            this.positions[i + 1] = (Math.random() - 0.5) * 100;
            this.positions[i + 2] = (Math.random() - 0.5) * 100;
            
            // Random velocities
            this.velocities[i] = (Math.random() - 0.5) * 0.1;
            this.velocities[i + 1] = (Math.random() - 0.5) * 0.1;
            this.velocities[i + 2] = (Math.random() - 0.5) * 0.1;
        }
        
        this.geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(this.positions, 3)
        );
        
        this.material = new THREE.PointsMaterial({
            size: 0.1,
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        this.points = new THREE.Points(this.geometry, this.material);
    }
    
    update() {
        for (let i = 0; i < this.count * 3; i += 3) {
            this.positions[i] += this.velocities[i];
            this.positions[i + 1] += this.velocities[i + 1];
            this.positions[i + 2] += this.velocities[i + 2];
            
            // Wrap around
            if (Math.abs(this.positions[i]) > 50) this.positions[i] *= -0.9;
            if (Math.abs(this.positions[i + 1]) > 50) this.positions[i + 1] *= -0.9;
            if (Math.abs(this.positions[i + 2]) > 50) this.positions[i + 2] *= -0.9;
        }
        
        this.geometry.attributes.position.needsUpdate = true;
    }
    
    get mesh() {
        return this.points;
    }
}

// Usage
const particles = new ParticleSystem(50000);
scene.add(particles.mesh);

function animate() {
    requestAnimationFrame(animate);
    particles.update();
    renderer.render(scene, camera);
}
```

### Pattern: Scene Manager

```typescript
import * as THREE from 'three';

interface Scene {
    init(): Promise<void>;
    update(delta: number): void;
    dispose(): void;
}

class SceneManager {
    private scenes: Map<string, Scene> = new Map();
    private currentScene: Scene | null = null;
    private clock: THREE.Clock;
    
    constructor() {
        this.clock = new THREE.Clock();
    }
    
    register(name: string, scene: Scene) {
        this.scenes.set(name, scene);
    }
    
    async switchTo(name: string) {
        if (this.currentScene) {
            this.currentScene.dispose();
        }
        
        const scene = this.scenes.get(name);
        if (!scene) throw new Error(`Scene ${name} not found`);
        
        await scene.init();
        this.currentScene = scene;
    }
    
    update() {
        const delta = this.clock.getDelta();
        if (this.currentScene) {
            this.currentScene.update(delta);
        }
    }
}
```

---

## Best Practices

### Do's ✅

1. **Use BufferGeometry** - Always use BufferGeometry over legacy Geometry
2. **Share materials** - Reuse materials across meshes when possible
3. **Use instancing** - For repeated identical objects
4. **Implement LOD** - For complex scenes with varying distances
5. **Dispose properly** - Clean up geometries, materials, textures
6. **Use texture atlases** - Reduce texture switches
7. **Limit lights** - Use minimal dynamic lights
8. **Profile performance** - Use Chrome DevTools and Stats.js
9. **Use frustum culling** - Let Three.js cull invisible objects
10. **Batch draw calls** - Merge static geometries

### Don'ts ❌

1. **Don't create objects in animation loop** - Pool and reuse
2. **Don't use too many lights** - Max 4-5 dynamic lights
3. **Don't forget to dispose** - Memory leaks cause crashes
4. **Don't ignore mobile** - Test on low-end devices
5. **Don't overuse shadows** - Expensive, limit shadow casters
6. **Don't use high poly models** - Optimize meshes
7. **Don't skip texture compression** - Use compressed formats
8. **Don't block main thread** - Use Web Workers for heavy calculations
9. **Don't ignore WebGL errors** - Check console regularly
10. **Don't use sync loading** - Use async loaders

---

## Checklist

### Before Starting

- [ ] Define target devices and browsers
- [ ] Set performance budget (60fps target)
- [ ] Choose appropriate rendering features
- [ ] Plan asset optimization strategy
- [ ] Consider WebGL fallbacks

### During Development

- [ ] Use Stats.js for performance monitoring
- [ ] Test on target devices regularly
- [ ] Implement proper loading screens
- [ ] Handle WebGL context loss
- [ ] Add error boundaries

### Before Launch

- [ ] Profile with Chrome DevTools
- [ ] Test on low-end devices
- [ ] Optimize textures (compression, size)
- [ ] Implement lazy loading
- [ ] Add accessibility features
- [ ] Test WebGL/WebGPU fallbacks

---

## Common Issues

### Issue: Black Screen

**Symptoms:**
- Canvas is black
- No errors in console

**Solution:**
```typescript
// Check these common issues:
// 1. Camera position - is it looking at the scene?
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

// 2. Lighting - is there any light?
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

// 3. Material - is it configured correctly?
const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });

// 4. Renderer size
renderer.setSize(window.innerWidth, window.innerHeight);

// 5. Actually rendering
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
```

### Issue: Performance Issues

**Symptoms:**
- Low FPS
- Stuttering
- High memory usage

**Solution:**
```typescript
// 1. Reduce draw calls
// Use InstancedMesh for repeated objects

// 2. Reduce geometry complexity
const geometry = new THREE.SphereGeometry(1, 16, 16);  // Not 64, 64

// 3. Use simpler materials
const material = new THREE.MeshLambertMaterial();  // Instead of Standard

// 4. Limit shadow casters
mesh.castShadow = false;  // Only enable for key objects

// 5. Use texture compression
// Use .ktx2 or .basis textures

// 6. Implement LOD
const lod = new THREE.LOD();
```

### Issue: Textures Not Loading

**Symptoms:**
- Models appear black or white
- CORS errors

**Solution:**
```typescript
// 1. Check CORS headers on server
// 2. Use correct texture color space
texture.colorSpace = THREE.SRGBColorSpace;

// 3. Wait for texture to load
const loader = new THREE.TextureLoader();
loader.load('/texture.jpg', (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    material.map = texture;
    material.needsUpdate = true;
});

// 4. Check file paths and extensions
```

---

## Quick Reference

### Essential Imports

```typescript
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
```

### Basic Setup Template

```typescript
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

scene.add(new THREE.AmbientLight(0xffffff, 0.5));

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
```

### Material Quick Reference

| Material | Lighting | Performance | Use Case |
|----------|----------|-------------|----------|
| `MeshBasicMaterial` | No | ⚡⚡⚡ | UI, debug |
| `MeshLambertMaterial` | Diffuse | ⚡⚡ | Matte objects |
| `MeshPhongMaterial` | Specular | ⚡ | Shiny objects |
| `MeshStandardMaterial` | PBR | Medium | Realistic |
| `MeshPhysicalMaterial` | Extended PBR | Slow | Glass, clearcoat |

---

## Tools & Resources

### Official Resources
- **Documentation** - https://threejs.org/docs/
- **Examples** - https://threejs.org/examples/
- **Editor** - https://threejs.org/editor/

### Learning Resources
- **Three.js Journey** - https://threejs-journey.com/
- **Discover Three.js** - https://discoverthreejs.com/

### Tools
- **Blender** - 3D modeling (free)
- **gltf-transform** - Optimize GLTF files
- **Draco** - Mesh compression
- **Basis Universal** - Texture compression

### Debugging
- **Stats.js** - FPS counter
- **Three.js Inspector** - Chrome extension
- **Spector.js** - WebGL debugging

---

## Related Skills

- **web-performance** - Optimizing 3D rendering performance
- **frontend-development** - Integrating Three.js with frameworks
- **api-development** - Loading 3D assets from APIs
- **visual-asset-creation** - Creating 3D models and textures
- **real-time-features** - WebSocket integration for multiplayer 3D
