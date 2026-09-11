# App-wide Language Setting (VI/EN) — Approach C Hybrid — COMPLETED

**Date:** 2026-09-10 · **Branch:** `10-days-quick-run` · **Commits:** `e1384134` (feature) · `e347cfa6` (docs) · `e8b2d3c2` (sliding toggle) · `140c1c07` (Playwright E2E gate)
**Options doc (user-approved):** `docs/superpowers/specs/2026-09-10-app-language-setting-options.{md,html}`

## Verification status: DEVICE_BROWSER_VERIFIED ✅ (Playwright, 2026-09-11)

`frontend/tests/e2e/admin-activation.spec.ts` — real login (admin account) against real backend↔Supabase:
- Chromium desktop (1280×800) **4/4 pass** · Mobile Safari (iPhone 13) **4/4 pass** with `--workers=1`
- Coverage: login → role-gated admin button → sliding language toggle (flip + persist across reload) → /admin/games + editor render → **course create via UI → card click lands on EDIT route** (blank-page regression) → API cleanup
- ⚠️ **Finding:** same-account PARALLEL logins kick each other's session (GlobalSessionWatcher single-session policy) — spec runs sequential; multi-device policy = backlog item

## What shipped
- **LocaleContext.t() bridge** (approach C): dict keys first → fallback global i18next (JSON `admin.*`/`learner.*` keys) → raw key. `{{var}}` interpolation added.
- **Language settings card on Profile** (clay style, every user — learner feature, not teacher-gated): Tiếng Việt 🇻🇳 / English 🇬🇧 segmented, calls `setLocale` → persists `edu-platform-locale` + syncs `i18n.changeLanguage` + `document.documentElement.lang`.
- **Migrated hardcoded strings → t()**: Profile (tabs/stats/admin button), GamesPage (hero, daily ceiling with interpolation, topic progress, played badge), DragMatchGame + MemoryPairsGame (empty-topic, XP status, replay button).
- **Single source cleanup**: `profile.*` removed from admin.json (now lives in dict).
- **LanguageToggle** already existed (Sidebar desktop + Landing) — now joined by Profile card (mobile-first surface).

## Verification
- **Playwright E2E 8/8 (chromium + Mobile Safari, `--workers=1`)** — see top section
- `tsc -b` exit 0 (production chain) · `vite build` SUCCESS
- vitest: **435 passed** (4 new locale tests: interpolation, switch+persist, i18n bridge); 9 pre-existing AR/sentry failures unchanged vs baseline
- Bugs caught during impl: `topics.map((t))` shadowed translator `t` in GamesPage; DragMatchGame `EmptyTopic` was a separate component without hook

## P1 backlog (documented, not in this pass)
- Remaining learner pages with hardcoded strings → migrate keys to JSON (`learner.*`) opportunistically
- Optional polish: type-safe i18n keys (`CustomTypeOptions`), `i18next-browser-languagedetector` plugin (current hand-rolled detection works)
