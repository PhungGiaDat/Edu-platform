# REVIEW — Install Guide PWA Page (+ Mimi→Lexi cleanup)

- **Commit**: `54da43f` on `feature/install-guide-pwa`
- **Date**: 2026-09-05
- **Reviewer**: Orchestrator self-review (subagent credit exhausted — fallback per policy)
- **Verified**: `tsc --noEmit` clean · vitest InstallGuidePage (3/3) + pwaShell (2/2) = 5/5 pass · py_compile OK · grep "Mimi" = 0 shipped-code matches

## Scope reviewed
`InstallGuidePage.tsx` (530 lines, full read), test file (full read), `App.tsx` route, `index.html` font link, `global.css` `.msr`, `NotificationSettingsPage.tsx` (Lexi rename + Link CTA), `web_push_service.py` templates.

## Findings

| ID | Severity | Location | Finding | Disposition |
|---|---|---|---|---|
| REVIEW-001 | Minor | `InstallGuidePage.tsx` tablist | Segmented control lacks arrow-key roving focus (buttons are individually tabbable — WCAG-acceptable) | Accept; note for future |
| REVIEW-002 | Minor | Android flow | After user dismisses the native prompt, `canInstall` flips false → button shows disabled "Đang chuẩn bị…" label; label still guides to menu ⋮ fallback | Accept |
| REVIEW-003 | Minor | Desktop copy-link | `navigator.clipboard?.writeText` silently no-ops on non-HTTPS (prod is HTTPS) | Accept |
| REVIEW-004 | Verified-OK | iOS UA quirk | `isIOS()` in hook handles iPadOS-13+ MacIntel (`maxTouchPoints > 1`); `iosBelow164` regex `/OS 16_(\d+)/` correct for iPhone UA; null-safe | — |
| REVIEW-005 | Verified-OK | Security | No `dangerouslySetInnerHTML`, no user-input rendering, single static external URL | — |
| REVIEW-006 | Verified-OK | State machine | `isStandalonePwa()` on mount + `appinstalled` effect → State B; hint on failed verify matches spec | — |
| REVIEW-007 | Verified-OK | Naming | 0 "Mimi" remaining in `backend/` + `frontend/src/` ("Mimics" docstring false-positive only) | — |

## Verdict: **APPROVE-WITH-NITS** (no Critical/Important issues)

## Test evidence
```
frontend: npx tsc --noEmit → OK
vitest: InstallGuidePage.test.tsx 3 passed; pwaShell.test.ts 2 passed (5/5)
backend: python -m py_compile web_push_service.py → OK
```
