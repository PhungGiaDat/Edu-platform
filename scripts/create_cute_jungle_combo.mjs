import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from '../frontend-web/node_modules/three/build/three.module.js';
import { GLTFExporter } from '../frontend-web/node_modules/three/examples/jsm/exporters/GLTFExporter.js';

globalThis.FileReader = class {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer();
    this.onloadend?.();
  }
};

const root = path.resolve(import.meta.dirname, '..');
const outputDir = path.join(root, 'frontend-web', 'public', 'assets', 'models', 'combos');
const outputPath = path.join(outputDir, 'cute_elephant_jungle.glb');

function mat(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85,
    metalness: 0,
    ...options,
  });
}

const materials = {
  ground: mat(0x8fd36a),
  grass: mat(0x56bd63),
  leaf: mat(0x38b86b),
  leafLight: mat(0x70d87b),
  trunk: mat(0x9a6a3d),
  flowerPink: mat(0xff8bb3),
  flowerYellow: mat(0xffd94a),
  water: mat(0x7bdff2, { transparent: true, opacity: 0.82 }),
  elephant: mat(0xaec4d6),
  elephantDark: mat(0x86a6bd),
  blush: mat(0xff9fb4),
  eye: mat(0x253044),
  ivory: mat(0xfff3cf),
};

function addMesh(parent, geometry, material, position, scale = [1, 1, 1], rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function makePalm(x, z, scale = 1) {
  const group = new THREE.Group();
  group.name = 'cute_palm_tree';
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);

  addMesh(group, new THREE.CylinderGeometry(0.045, 0.065, 0.8, 8), materials.trunk, [0, 0.4, 0], [1, 1, 1], [0.08, 0, -0.12]);

  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2;
    const leaf = addMesh(
      group,
      new THREE.ConeGeometry(0.12, 0.48, 8),
      i % 2 ? materials.leaf : materials.leafLight,
      [Math.cos(angle) * 0.16, 0.86, Math.sin(angle) * 0.16],
      [1, 0.55, 1],
      [Math.PI / 2, 0, -angle]
    );
    leaf.name = 'palm_leaf';
  }

  return group;
}

function makeBush(x, z, colorMat = materials.leaf) {
  const group = new THREE.Group();
  group.name = 'round_jungle_bush';
  group.position.set(x, 0, z);
  addMesh(group, new THREE.SphereGeometry(0.12, 16, 12), colorMat, [0, 0.12, 0], [1.2, 0.75, 1]);
  addMesh(group, new THREE.SphereGeometry(0.09, 16, 12), materials.leafLight, [-0.1, 0.13, 0.03], [1, 0.75, 1]);
  addMesh(group, new THREE.SphereGeometry(0.09, 16, 12), colorMat, [0.1, 0.13, -0.03], [1, 0.75, 1]);
  return group;
}

function makeFlower(x, z, flowerMat) {
  const group = new THREE.Group();
  group.name = 'tiny_flower';
  group.position.set(x, 0, z);
  addMesh(group, new THREE.CylinderGeometry(0.01, 0.01, 0.16, 6), materials.grass, [0, 0.08, 0]);
  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2;
    addMesh(group, new THREE.SphereGeometry(0.025, 8, 8), flowerMat, [Math.cos(angle) * 0.025, 0.17, Math.sin(angle) * 0.025], [1, 0.35, 1]);
  }
  addMesh(group, new THREE.SphereGeometry(0.018, 8, 8), materials.flowerYellow, [0, 0.17, 0], [1, 0.6, 1]);
  return group;
}

function makeCuteElephant() {
  const group = new THREE.Group();
  group.name = 'cute_low_poly_elephant';
  group.position.set(0, 0.12, 0.04);
  group.rotation.y = Math.PI;

  addMesh(group, new THREE.SphereGeometry(0.24, 24, 16), materials.elephant, [0, 0.25, 0], [1.25, 0.9, 0.85]);
  addMesh(group, new THREE.SphereGeometry(0.18, 24, 16), materials.elephant, [0, 0.38, -0.22], [1, 0.92, 0.9]);
  addMesh(group, new THREE.CylinderGeometry(0.035, 0.055, 0.32, 12), materials.elephantDark, [0, 0.22, -0.38], [1, 1, 1], [0.75, 0, 0]);

  addMesh(group, new THREE.SphereGeometry(0.09, 16, 12), materials.elephantDark, [-0.16, 0.39, -0.22], [0.55, 1.15, 0.18], [0, 0.25, 0.15]);
  addMesh(group, new THREE.SphereGeometry(0.09, 16, 12), materials.elephantDark, [0.16, 0.39, -0.22], [0.55, 1.15, 0.18], [0, -0.25, -0.15]);

  addMesh(group, new THREE.SphereGeometry(0.018, 8, 8), materials.eye, [-0.06, 0.42, -0.37]);
  addMesh(group, new THREE.SphereGeometry(0.018, 8, 8), materials.eye, [0.06, 0.42, -0.37]);
  addMesh(group, new THREE.SphereGeometry(0.025, 8, 8), materials.blush, [-0.095, 0.37, -0.37], [1, 0.45, 0.35]);
  addMesh(group, new THREE.SphereGeometry(0.025, 8, 8), materials.blush, [0.095, 0.37, -0.37], [1, 0.45, 0.35]);

  addMesh(group, new THREE.ConeGeometry(0.018, 0.11, 8), materials.ivory, [-0.055, 0.32, -0.38], [1, 1, 1], [-0.35, 0, 0.2]);
  addMesh(group, new THREE.ConeGeometry(0.018, 0.11, 8), materials.ivory, [0.055, 0.32, -0.38], [1, 1, 1], [-0.35, 0, -0.2]);

  [[-0.15, 0.02], [0.15, 0.02], [-0.14, 0.24], [0.14, 0.24]].forEach(([x, z]) => {
    addMesh(group, new THREE.CylinderGeometry(0.045, 0.05, 0.18, 10), materials.elephantDark, [x, 0.08, z]);
  });

  return group;
}

const scene = new THREE.Scene();
scene.name = 'cute_elephant_jungle_combo_scene';

addMesh(scene, new THREE.CylinderGeometry(0.72, 0.78, 0.08, 48), materials.ground, [0, 0, 0]);
addMesh(scene, new THREE.CylinderGeometry(0.24, 0.26, 0.02, 32), materials.water, [-0.25, 0.055, -0.16], [1.15, 1, 0.7]);

scene.add(makePalm(-0.42, 0.18, 0.82));
scene.add(makePalm(0.46, 0.16, 0.72));
scene.add(makePalm(0.22, -0.43, 0.58));

scene.add(makeBush(-0.52, -0.18));
scene.add(makeBush(0.55, -0.1, materials.leafLight));
scene.add(makeBush(-0.04, 0.46));

scene.add(makeFlower(-0.43, -0.38, materials.flowerPink));
scene.add(makeFlower(0.38, -0.36, materials.flowerYellow));
scene.add(makeFlower(0.05, -0.52, materials.flowerPink));

const elephant = makeCuteElephant();
scene.add(elephant);

const key = new THREE.DirectionalLight(0xffffff, 1.8);
key.position.set(1.5, 2.5, 1);
scene.add(key);

scene.scale.setScalar(1);

await fs.mkdir(outputDir, { recursive: true });

const exporter = new GLTFExporter();
const arrayBuffer = await exporter.parseAsync(scene, {
  binary: true,
  onlyVisible: true,
});

await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
console.log(`Saved ${outputPath}`);
