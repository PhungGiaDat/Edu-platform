# Blocker: WebAR fallback navigation not wired

## ID
`blocker-2026-08-18-web-ar-fallback`

## Raised
2026-08-18

## Phase
M9 — Error, Recovery & WebAR Fallback

## Severity
Medium

## Description

`PermissionDeniedOverlay.tsx` accepts `onUseWebAR?: () => void` and `showWebARFallback?: boolean`. When user taps "Try WebAR" button, it calls `onUseWebAR?.()`.

In `ARScreen.tsx`, the `onUseWebAR` handler is:
```tsx
onUseWebAR={() => {
  console.log('[ARScreen] WebAR fallback requested — not implemented');
}}
```

This is a no-op. The WebAR fallback screen (`MindARWebView` or similar) does not exist in RN.

## Spec requirement

`MOB-FALLBACK-REQ-003 [TARGET][SHOULD]`: When WebAR fallback is offered, RN navigates to the `AR` screen with a mode flag (`useWebAR: true`) that renders the MindAR WebView path instead of Unity.

`MOB-FALLBACK-REQ-004 [TARGET][SHOULD]`: The user is not automatically redirected to WebAR without consent.

## Fix options

**Option A (separate screen):** Create `WebARScreen.tsx` with MindAR WebView, navigate to it from `onUseWebAR`.

**Option B (mode flag):** Add `useWebAR: boolean` to AR route params, conditionally render MindAR vs Unity.

Decision needed: MQ-2 from mobile-ar-product-spec.md.

## Status
Open — awaiting MQ-2 decision
