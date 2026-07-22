# Unity AR Mobile Client — Architecture Decisions

## 2026-07-22 — Initial scope

**Decision:** Unity builds a *native iOS mobile client* (ARKit + ARFoundation + image target tracking). The existing **web A-Frame/WebXR AR stays untouched** and remains the desktop / mobile-web client. Both clients share the **single FastAPI + MongoDB backend** — no new server-side code required; just consume the existing `/api/v1/ar/*` endpoints (`stability-config`, `semantic-rules`, `combo-triggered`) that the web client already uses.

**Implications for design:**
- Unity project lives in a new top-level folder (suggested: `mobile-unity/` or `ios-unity/`) — separate from `backend/` and `frontend-web/`.
- No refactoring of existing code paths; Unity is purely additive.
- API contract that Unity consumes is whatever the web client consumes — keeps backend single source of truth.
- iOS first; Android can be added later by swapping ARFoundation provider (ARCore) — Unity code is ~90% shared.
- ARCore-only features (Google Cloud Anchors) are explicitly out of scope.

**Toolchain reality (2026):** Unity 6 LTS (6000.x) + ARFoundation 6.0.7 + Apple ARKit XR Plugin 6.0.6 + Xcode 14+. Final iOS `.ipa` build requires macOS + Xcode (cannot be done on Windows alone). User is on Windows; final build must be done by a teammate with a Mac, or via Unity Cloud Build, or the reference-image-library compile step must be done once on a Mac and the result committed.

**Windows-specific constraint:** ARKit's `XRReferenceImageLibrary` requires a macOS-Xcode compile step to convert PNGs into ARKit's binary AR Resource format. The workaround on Windows is the **AR Resource Group** path (works for runtime, but image-library-as-AssetBundle is blocked). Open question to confirm with user.

**Storage:** 3D `.glb` model URLs are hosted on Supabase Storage bucket `learnar-assets` (see `backend/settings.py:41` and `backend/services/flashcard_upload_service.py:5`). Public URL pattern: `{SUPABASE_URL}/storage/v1/object/public/learnar-assets/{path}`. AR image reference targets come from the FastAPI backend's flashcard data, which already includes the QR/image reference for tracking. Unity will download .glb files via `UnityWebRequest` and load them at runtime using Unity's built-in `GLTFast` or `UnityGLTF` package.

**Final scope decisions (locked 2026-07-22):**
- Feature parity: full — match web AR feature set (QR scan, image tracking, pose stabilization, .glb models from Supabase, semantic combos, proximity combos, animations, audio)
- UI framework: UGUI (Canvas/Image) for in-AR overlays
- Build path: Xcode 26 on borrowed MacBook Air M4 (one-time); URP not required (built-in pipeline sufficient for AR overlay UI)
- ML features (LiDAR depth, people occlusion): out of scope for v1; add later if needed

**Open questions still in brainstorming:**
- Whether Unity client should authenticate against the same FastAPI endpoints as web (yes — `POST /api/v1/auth/login`) or use a separate API key
- Combo effects: Particle Systems (simple, no extra packages) vs VFX Graph (shader-based, requires VFX Graph package)
- Image target supply: existing flashcard images on Supabase. Unity .meta files must travel with .glb for Editor