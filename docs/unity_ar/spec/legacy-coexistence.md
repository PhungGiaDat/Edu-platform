## Status
approved

## Goal
Lock in that MindAR/WebAR legacy path MUST remain available until native AR reaches verified feature parity.

## Invariants

1. MindAR, .mind files, Three.js AR, WebView AR, and legacy backend tracking fields (`nft_base_url`, `mind_catalog_id`, `mind_target_index`, `combo_mind_url`) MUST NOT be removed during the migration.
2. The QR resolver (`GET /api/v1/flashcard/{qr_id}`) continues serving legacy MindAR payloads alongside any native AR extensions.
3. Legacy coexistence is NOT optional — it is the active production path until native AR is explicitly verified feature-complete.
4. Native AR and MindAR MAY coexist in the same React Native app during migration (parallel screens or conditional routing).
5. Legacy cutover requires an explicit feature-parity checklist signed off before removing any legacy component.

## Components
- Backend: MindAR catalog resolution, `nft_base_url`, `mind_catalog_id`, `mind_target_index`
- Frontend Web: `ar-viewer.html`, MindAR init, Three.js renderer
- React Native: WebView AR shell, MindAR JS bindings
- Unity: NOT involved in legacy path

## Verification
Legacy path is verified by existing E2E tests and manual AR scanning on physical devices.

## Open questions
None — this invariant is approved.
