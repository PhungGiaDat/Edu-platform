# Mobile AR Performance Reference

> Covers both iOS (Unity ARKit) and Web AR (mobile Safari/Chrome). Targets
> the platform's 3-year-old mid-range device floor.

## GPU & thermal budgets

| Path    | Draw calls / frame | Triangles / scene | Texture mem |
| ------- | ----------------- | ----------------- | ----------- |
| iOS     | < 50              | < 100k            | < 80MB      |
| Android | < 40              | < 80k             | < 60MB      |
| Web     | < 30              | < 60k             | < 40MB      |

Exceeding any budget causes thermal throttling within 2-3 minutes of AR
session start on iPhone 11 / Pixel 4a class devices.

## Model budgets (`.glb`)

- **Poly count:** < 30k triangles per model. Educational props (animals,
  objects) rarely need more.
- **Texture resolution:** 1024×1024 max for hero props, 512×512 for props
  seen briefly.
- **Material count:** < 3 materials per model. Avoid PBR complexity for AR
  (lighting is mixed real-world + scene, PBR doesn't shine).
- **File size:** < 4MB per `.glb`. Most should be < 1MB.

Run [gltf-transform](https://gltf-transform.dev/) on every model before
shipping:

```bash
npx gltf-transform optimize input.glb output.glb --texture-compress webp
```

## Session lifecycle for thermal management

AR sessions heat devices fast. Patterns:

1. **Pause when occluded.** If `ARCameraManager` reports `limited`
   tracking for > 5s, pause rendering (don't destroy session).
2. **Lower frame rate after first minute.** Drop from 60fps to 30fps
   once the initial "wow" moment passes. iOS:
   `UnityEngine.iOS.Device.preferredFrameRate = 30;`
3. **Auto-suspend on background.** Both `OnApplicationPause` (Unity) and
   `visibilitychange` (web).
4. **Cool-down pause.** After 8 minutes continuous use, show a "take a
   break" overlay and pause the session for 60s.

## Image target resolution

ARKit / ARCore require physical print sizes for reliable tracking. Rules:

| Marker physical size | Min target image resolution |
| -------------------- | -------------------------- |
| < 5cm                | 256×256 (won't track)      |
| 5–15cm               | 512×512                    |
| 15–40cm              | 1024×1024                  |
| > 40cm               | 2048×2048                  |

Flashcard images in this project are 15–25cm (printed trading card size),
so 1024×1024 source images are required.

## Memory & GC

- **Unity:** Don't allocate per-frame in `Update()`. Cache `WaitForSeconds`,
  `Vector3[]` buffers, material instances.
- **Web:** Use `<a-asset-item>` for model preloading. Don't `new GLTFLoader()`
  per scene — share one instance.
- **Bridge:** Coalesce RN↔Unity events. Don't emit `onPlaneDetected` on
  every frame; emit only on `added`/`removed`.

## Network

- **Cache `.mind` files** (web) and `.glb` models aggressively. LRU cache
  with `mobile/rn/src/utils/glbCache.ts` for RN, in-memory dict for Unity.
- **Image targets** are precompiled into `.mind` for web, runtime-loaded
  for Unity. Both pull PNGs from Supabase Storage.
- **Offline support:** the first session after install should cache all
  current course models. Subsequent sessions work offline.

## Testing on real devices

Always verify on real hardware, not just simulator:

- iOS: iPhone 11 or newer (ARKit 3+)
- Android: Pixel 4a or equivalent ARCore-supported device
- Web: actual mobile Safari (not desktop emulation)

The Unity Editor's XR Simulation (`SimulationLoader.asset`) is **only** for
logic testing. It does not represent real thermal or GPU behavior.

## Profiling

- **Unity:** Xcode GPU Frame Capture (iOS), Android GPU Inspector
- **Web:** Chrome DevTools → Performance → record during AR session
- **Always** profile for at least 5 minutes of continuous use to catch
  thermal degradation, not just cold-start behavior.
