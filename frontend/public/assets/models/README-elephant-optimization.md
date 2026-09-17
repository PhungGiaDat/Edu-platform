# elephant-learning-path.glb — optimization notes

`elephant.glb` (Sketchfab export, ~21.5 MB) is kept untouched. This derivative
is a mobile-sized version for the Learning Path PetGuide fallback only.

## Inspection (original)

- Size: 21.48 MB (no textures at all — the entire size is geometry)
- 7 mesh primitives, all skinned (`JOINTS_0`/`WEIGHTS_0`), `u32` indices
- ~270,016 vertices / ~525,952 triangles total
- 4 materials (flat colors via `KHR_materials_pbrSpecularGlossiness`, no textures)
- 1 animation ("Walking"): 29 channels, 804 keyframes, 15.57 KB

## Pipeline (gltf-transform CLI, run from `frontend/`)

```
npx @gltf-transform/cli weld      elephant.glb        1-weld.glb
npx @gltf-transform/cli simplify  1-weld.glb           2-simplify.glb --ratio 0.2 --error 0.02
npx @gltf-transform/cli resample  2-simplify.glb        3-resample.glb
npx @gltf-transform/cli dedup     3-resample.glb        4-dedup.glb
npx @gltf-transform/cli prune     4-dedup.glb           5-prune.glb
npx @gltf-transform/cli quantize  5-prune.glb           6-quantize.glb
npx @gltf-transform/cli dedup     6-quantize.glb        7-final.glb
npx @gltf-transform/cli prune     7-final.glb           elephant-learning-path.glb
```

No Draco/Meshopt compression — both need a runtime decoder wired into the
`GLTFLoader` instance `useGLTF` builds internally, which this project doesn't
configure. `quantize` uses `KHR_mesh_quantization`, decoded natively by
three.js's `GLTFLoader` with no extra setup.

## Result

| | Original | Optimized |
|---|---|---|
| Size | 21.48 MB | 1.96 MB (2,057,176 bytes) |
| Triangles (sum of primitives) | ~525,952 | ~105,180 |
| Indices | u32 | u16 |
| Vertex attrs | f32 position/normal | i16_norm position/normal, u8 joints, u8_norm weights |
| Skins | 7, 25 joints each | 7, 25 joints each — unchanged |
| Animation "Walking" | 804 keyframes | 764 keyframes (lossless dedup via `resample`) |
| Materials | 4, no textures | 4, no textures — unchanged |

Verified after each step via `gltf-transform inspect` and by exporting to
`.gltf` JSON to confirm the `skins` array (inverseBindMatrices + 25 joints
per skin) survived `quantize`'s internal prune pass intact.

Visual result at actual in-scene scale has **not** been confirmed in a
browser — no screenshot/render tooling was available when this was built.
