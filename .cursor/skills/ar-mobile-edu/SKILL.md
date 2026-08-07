---
name: ar-mobile-edu
description: Build and modify AR/MR features for the LearnAR mobile education platform — covers both Web (MindAR + A-Frame via React) and Native Mobile (Unity ARFoundation + React Native shell) paths. Use when implementing image/QR target tracking, .glb model loading, AR session lifecycle, pose stabilization, combo/animation effects, or bridging RN↔Unity messaging.
---

# AR for Mobile Education Platform

This skill is the single entry point for AR/MR work on the LearnAR v2 platform. It
covers **both delivery paths** that share one backend:

| Path              | Stack                                                       | Audience                |
| ----------------- | ----------------------------------------------------------- | ----------------------- |
| **Web AR**        | React + A-Frame + MindAR (two-iframe pattern, `postMessage`) | Desktop / mobile web    |
| **Native Mobile** | React Native shell + Unity `.xcframework` + Swift bridge    | iOS (ARKit) first       |

Both clients consume the **same FastAPI + MongoDB** backend (`/api/v1/ar/*` endpoints:
`stability-config`, `semantic-rules`, `combo-triggered`).

## When to load references

Don't read all of `references/` upfront. Pick what fits the task.

| If you're working on…                       | Load                                  |
| ------------------------------------------- | ------------------------------------- |
| Image tracking, marker detection, `.glb`    | `references/unity-arfoundation.md`   |
| AR session lifecycle, RN↔Unity bridge      | `references/unity-rn-bridge.md`      |
| MindAR + A-Frame scene, `postMessage`       | `references/webxr-mindar.md`          |
| Tracking stability, freeze-pose, combos     | `references/ar-tracking-patterns.md`  |
| Performance, mobile GPU, model budgets      | `references/mobile-ar-performance.md` |

## Repository context

- **Repo:** `Unity-Technologies/arfoundation-samples` is the canonical reference
  for sample scenes, scripts, and AR Foundation patterns. Mirror its conventions.
- **Project docs (read these for authoritative decisions):**
  - `context/unity-ar-architecture.md` — locked architecture decisions (Unity 6 LTS, ARFoundation 6.0.7, ARKit 6.0.6, UGUI, no URP).
  - `docs/superpowers/specs/2026-07-23-unity-rn-mobile-ar-design.md` — RN↔Unity design spec.
  - `docs/superpowers/specs/2026-07-28-mindar-precompiled-mind-design.md` — MindAR pipeline.
  - `docs/implementation-log/PHASE2-RESEARCH-AR-IMAGE-TRACKING.md` — current tracking research.
  - `research/AR_TRACKING_RESEARCH_20260721.md` — full tracking system analysis.
- **Code locations:**
  - Unity: `mobile/unity/Assets/AR/`, `Assets/Bridge/`, `Assets/Gestures/`
  - React Native shell: `mobile/rn/src/bridge/`, `mobile/rn/src/components/`
  - Web AR: see `frontend-web/` (MindAR iframe + A-Frame iframe pattern)

## Core principles (do not violate)

1. **API contract is shared, not duplicated.** Both clients call the existing
   `/api/v1/ar/*` endpoints. No new backend code unless the existing endpoints
   don't cover it — and if so, change the web client too.
2. **Feature parity matters.** New AR features on one path must be replicated
   on the other. Don't ship asymmetric capabilities.
3. **AR is a thin layer over the content model.** `.glb` models and image
   references come from flashcards, not from Unity or React hardcoded values.
4. **Windows dev constraint is real.** ARKit's `XRReferenceImageLibrary` needs
   a macOS-Xcode compile step. Use the **AR Resource Group** runtime path when
   building on Windows; reserve `XRReferenceImageLibrary` for the one-time
   MacBook Air M4 build.
5. **Tracking stability is non-negotiable for education.** Children will look
   away, move the camera, occlude markers. Always design for grace periods,
   pose smoothing, and re-detection — see `references/ar-tracking-patterns.md`.

## Workflow

### Implementing a new AR feature

1. **Check if it exists on the other path.** Search `mobile/unity/Assets/` and
   `frontend-web/` for the feature. If one path has it, mirror it.
2. **Identify which subsystems it touches:**
   - Tracking (marker detection, pose)
   - Rendering (3D scene, models, UI overlay)
   - Stabilization (combo logic, freeze-pose, semantic rules)
   - Bridge / messaging (RN↔Unity or React↔iframe)
3. **Read the relevant reference file** (see table above) before writing code.
4. **Implement backend contract changes first** if needed (Pydantic schemas,
   `ar/*` endpoints). Then client. Never the reverse.
5. **Test on both paths** before marking complete — feature parity gate.

### Modifying existing tracking behavior

1. Read `research/AR_TRACKING_RESEARCH_20260721.md` and
   `docs/implementation-log/PHASE2-RESEARCH-AR-IMAGE-TRACKING.md` first.
2. Trace the change through both Web (MindAR `TARGET_FOUND`/`TARGET_LOST`)
   and Unity (ARFoundation `trackables.changed`) event flows.
3. Update stabilization thresholds (`stability-config` endpoint) if changing
   grace periods or pose smoothing — do not hardcode.
4. Verify freeze-pose semantic rules still resolve (see `references/ar-tracking-patterns.md`).

### Building on Windows (Unity)

- Use **AR Resource Group** runtime path for image targets (works without
  macOS-Xcode compile).
- Avoid `XRReferenceImageLibrary` until the MacBook build is scheduled.
- For final `.ipa`, document the MacBook build step in the task brief; the
  `Xcode 26 on borrowed MacBook Air M4` is the one-time path.

## Bridge contract (quick reference)

For the full spec, see `references/unity-rn-bridge.md`. Minimum methods:

```
RN → Unity:  initSession(), loadARExperience(payload),
             setPlaneDetection(bool), pauseSession(),
             resumeSession(), destroySession()
Unity → RN:  onArReady, onPlaneDetected, onObjectPlaced,
             onTrackingStateChanged, onError
```

The `loadARExperience` payload is built by `mobile/rn/src/bridge/ARExperienceMapper.ts`
and consumed by `mobile/unity/Assets/Bridge/ARPayloadMapper.cs`.

## Anti-patterns (rejected by reviewer)

- **Hardcoded target IDs, model URLs, or thresholds.** All come from the
  backend (`/api/v1/ar/*`) or the project's flashcard data.
- **Adding AR features without parity check.** New tracking behavior on
  Unity without mirroring on web AR fails review.
- **Using `XRReferenceImageLibrary` on Windows builds.** Breaks the
  ARKit compile step. Use AR Resource Group.
- **Calling AR APIs without checking `session.state`.** Triggers NREs.
- **Hardcoded UI strings.** Add to `mobile/rn/src/i18n/{en,vi}.json`.
- **Skipping the 900ms grace period on `TARGET_LOST`.** Causes flicker
  when children move. Tune via `stability-config`.

## References

- `references/unity-arfoundation.md` — ARFoundation 6.0.7 scene setup, ARKit loader, runtime image tracking.
- `references/unity-rn-bridge.md` — RN↔Unity bridge contract, payload mapper, TurboModule surface.
- `references/webxr-mindar.md` — MindAR + A-Frame two-iframe pattern, `postMessage` protocol.
- `references/ar-tracking-patterns.md` — pose stabilization, freeze-pose, semantic combos, proximity effects.
- `references/mobile-ar-performance.md` — GPU budgets, model poly counts, session lifecycle for thermal management.
