# 🚀 AR Project Rescue & Implementation Plan

**Objective:** Khôi phục hiển thị Camera (Fix Black Screen), Tối ưu hóa Backend, và Hoàn thiện luồng logic "Scan QR -> Load NFT Dynamic".
**Architecture:** Hybrid Iframe Isolation (React Host + Vanilla JS AR Runtime).
**Total Tasks:** 24 Tasks.

---

## 🎭 Role 1: Frontend Graphics Engineer (CSS & WebGL)
**Mission:** Khắc phục lỗi "Màn hình đen", xử lý xung đột CSS giữa AR.js video stream và UI, đảm bảo `ar-runtime.html` hiển thị mượt mà trên Mobile.

### Phase 1.1: Fix Camera Stream Visibility (Critical)
- [ ] **Task 1.1 (CSS Reset):** Analyze `ar-runtime.css`. Remove `background: #000` from `body` and `html`. AR.js video element sits at `z-index: -2`, a black background will cover it. Set `background-color: transparent !important`.
- [ ] **Task 1.2 (Scene Config):** Inspect `ar-runtime.html`. Remove `embedded` attribute from `<a-scene>`. Use `vr-mode-ui="enabled: false"` only to prevent conflict with fullscreen video feeds on mobile.
- [ ] **Task 1.3 (Video Layering):** Write a script in `ar-runtime.js` that forces the `<video id="arjs-video">` to have `z-index: -1 !important` and `position: absolute; top: 0; left: 0;` immediately after it is injected by AR.js.
- [ ] **Task 1.4 (Debug UI):** Ensure `.ar-debug-panel` and `.arjs-loader` have `z-index: 9999` so they float *above* the WebGL canvas.

### Phase 1.2: UI/UX & CSS Isolation
- [ ] **Task 1.5 (Transparent Canvas):** Update `<a-scene>` renderer config to `renderer="alpha: true; logarithmicDepthBuffer: true;"`. This ensures the 3D scene creates a transparent layer over the camera video.
- [ ] **Task 1.6 (Mobile Viewport):** Update `meta viewport` to `width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover` to handle iPhone notches properly.
- [ ] **Task 1.7 (Loader Logic):** Update logic in `ar-runtime.js` to only fade out `.arjs-loader` when **both** `arjs-video-loaded` AND `arjs-nft-loaded` events have fired.

---

## 🛠️ Role 2: Backend Optimization Engineer (Node/DevOps)
**Mission:** Giải quyết vấn đề Backend khởi động nặng, tối ưu việc serve file Static (NFT Descriptors).

### Phase 2.1: Static Asset Decoupling
- [ ] **Task 2.1 (Structure Audit):** Identify where `.fset`, `.fset3`, `.iset` files are stored. Move them OUT of the React `src` folder.
- [ ] **Task 2.2 (Static Setup):** Move all AR assets to `public/static/ar-assets/`. Configure Backend to serve this folder as purely static files with `Cache-Control` headers (Long max-age).
- [ ] **Task 2.3 (No-Preload Policy):** Ensure the backend does **not** load NFT descriptors into RAM at startup. Serve only paths/URLs via API.
- [ ] **Task 2.4 (Model Compression):** Run `gltf-pipeline` or `draco-compression` on all `.glb` models in the assets folder to reduce file size.

### Phase 2.2: API Endpoint for Dynamic Assets
- [ ] **Task 2.5 (Lookup API):** Build an endpoint `GET /api/ar/assets/:qrCode`.
    * Input: `qrCode` (string).
    * Output: JSON `{ descriptorUrl: "...", modelUrl: "...", scale: "..." }`.
- [ ] **Task 2.6 (Health Check):** Create a lightweight `/health` endpoint that does *not* touch the DB, allowing the render machine/orchestrator to verify the service status instantly.

---

## 🧠 Role 3: Logic Integrator (React & JS Logic)
**Mission:** Xây dựng luồng "Hybrid Tracking": Scan QR -> Gọi API -> Inject NFT vào Scene.

### Phase 3.1: React State Machine Implementation
- [ ] **Task 3.1 (Hook Logic):** Create `useARStateMachine` hook using reducer pattern. States: `IDLE` -> `QR_DETECTED` -> `FETCHING_ASSET` -> `NFT_LOADED`.
- [ ] **Task 3.2 (Event Bridge):** In `ARContainer.tsx`, listen for `message` event from Iframe.
    * Case `QR_DETECTED`: Trigger the API fetch function.
- [ ] **Task 3.3 (Fetch Service):** Write function `fetchAssetByQR(code)`. On success, construct the `AR_CREATE_NFT` payload for the Iframe.

### Phase 3.2: Dynamic NFT Injection (The Core)
- [ ] **Task 3.4 (Iframe Injection):** Validate `createNFTMarker` in `ar-runtime.js`. Ensure it creates `<a-nft>` with the URL provided by the React parent via `postMessage`.
- [ ] **Task 3.5 (Reset Logic):** Implement `clearAllNFTs` functionality. When user scans a special "Reset QR", send `AR_CLEAR_ALL` to Iframe to free up memory.
- [ ] **Task 3.6 (Combo Detector):** Update the loop in `ar-runtime.js` to check distances between *dynamically* added markers (iterate through `ARRuntime.activeModels` map).

### Phase 3.3: Final Integration
- [ ] **Task 3.7 (Error Handling):** If `QR_DETECTED` but API returns 404, post `AR_ERROR` back to React to show UI toast.
- [ ] **Task 3.8 (Audio):** Trigger audio playback in React (Parent) when `AR_NFT_FOUND` is received (to avoid auto-play blocking).
- [ ] **Task 3.9 (iOS QA):** Test flow on iOS Safari. Verify camera permission prompt triggers correctly inside Iframe.