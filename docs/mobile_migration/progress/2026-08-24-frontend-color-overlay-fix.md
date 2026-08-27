# Mobile-First Progress — Session 2026-08-24

## Frontend Color-Overlay Fix (iPhone 12 Pro)

### Reported
- User reported "color overlay sai trên mobile iPhone 12 Pro" trên local `frontend/` dev server.
- Browser automation tool unavailable in session — used Playwright (already in devDeps) thay thế.
- Two attached skills: `responsive-testing`, `ui-ux-pro-max`.

### Investigation
- Inspected `frontend/src/components/Navbar.tsx` (logged-in shell), `frontend/src/pages/LandingPage.tsx` (public `/`).
- Only the LandingPage is reachable without backend auth — its `<nav>` (lines 255–324) is the visible sticky nav on mobile.
- Confirmed via DOM inspection at 5 viewports × 3 pages (15 Playwright runs):
  - `position: sticky`, `z-index: 100`
  - `backgroundColor: rgba(0, 0, 0, 0)` (TRANSPARENT)
  - `backdropFilter: none`
  - No `padding-top: env(safe-area-inset-top)`
  - No `<meta name="theme-color">` in `index.html`
- Visual evidence: `frontend/test-artifacts/iphone14pro-homepage.png` (pre-fix) shows status bar inverted, hero gradient visible behind nav text, CTA buttons lose contrast on yellow gradient.

### Fix Applied (surgical)
- `frontend/index.html`: added `<meta name="theme-color">` (light + dark), `<meta name="apple-mobile-web-app-capable>`, `<meta name="apple-mobile-web-app-status-bar-style="default">`.
- `frontend/src/pages/LandingPage.tsx` nav:
  - `backgroundColor: rgba(255,255,255,0.92)` (opaque frosted)
  - `backdropFilter: saturate(180%) blur(12px)` + Webkit prefix
  - `paddingTop/Bottom: clamp(12px, 3vw, 12px)` (split from short-hand)
  - `paddingLeft/Right: max(env(safe-area-inset-X), clamp(16px, 5vw, 24px))` — accommodates iPhone notch + side minimum
  - `borderBottom: 1px solid rgba(15,23,42,0.06)` — subtle separator from content

### Verification
- Re-ran full responsive matrix: 15/15 PASS, all viewports show `backgroundColor: rgba(255,255,255,0.92)` + `backdropFilter` active.
- Visual snapshots written to `frontend/test-artifacts/responsive-fix-{viewport}.png` + `-scrolled.png`.
- iPhone 12 Pro (390×844): nav opaque, content scrolled behind gets blurred, status bar theme-color respects light scheme.
- Lint: 0 errors.

### Pending / Out of Scope
- Did NOT touch `frontend/src/components/Navbar.tsx` (logged-in shell): requires backend auth, browser would redirect; Navbar already has `bg-white shadow-md border-b` + sticky z-50 — visually distinct from LandingPage issue.
- Did NOT touch `frontend/src/components/Sidebar.tsx`: mobile bottom sheet, separate surface.
- Per `AGENTS.md` MOBILE-FIRST policy: `frontend/` is legacy/fallback. This fix is **appearance-only**, no behavior change.

### Tooling Notes
- Playwright browsers not pre-installed in sandbox cache → ran `npx playwright install chromium` once (~390 MB).
- Dev server already running on `:5174` (Vite, port 5173 in use by an earlier session).
- New ad-hoc specs:
  - `tests/e2e/_responsive-verify.spec.ts` — DOM assertions
  - `tests/e2e/_responsive-snap.spec.ts` — visual screenshots
  Prefixed with `_` so Playwright ignores them if added to CI later. Not part of the suite yet — manual gate only.
