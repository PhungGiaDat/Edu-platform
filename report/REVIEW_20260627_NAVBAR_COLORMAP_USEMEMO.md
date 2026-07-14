# Debug + Review Report — Navbar, Colormap, useMemo Crash

**Date:** 2026-06-27 (UTC+7)
**Mode:** Review + Debug (post-fix verification)
**Commits under review:** `376bd45`, `635e386`
**Status:** ✅ All checks pass — ready for `git push origin main` approval

---

## 1. Test Results

### Frontend (Vitest)

```
> frontend-web@0.0.0 test
> vitest run

 ✓ src/utils/mindTargetMerge.test.ts (5 tests) 64ms
 ✓ src/__tests__/components/DailyGoalRing.test.tsx (28 tests) 455ms
 ✓ src/__tests__/components/StreakBadge.test.tsx (30 tests) 553ms

 Test Files  3 passed (3)
      Tests  63 passed (63)
   Duration  6.33s
```

**Result: 63 / 63 pass.** No regressions. Stderr noise in `StreakBadge` is expected
(network-failure simulation tests that intentionally log `Failed to load streak`).

### Backend (Pytest)

```
============================= test session starts =============================
platform win32 -- Python 3.13.5, pytest-9.1.1
collected 108 items

tests/test_api_auth_required.py ..........................               [ 24%]
tests/test_course_service_gamification.py ...............                [ 37%]
tests/test_gamification_service.py ..................................... [ 72%]
..............................                                           [100%]
======================= 108 passed, 1 warning in 33.87s =======================
```

**Result: 108 / 108 pass.** The single warning is `StarletteDeprecationWarning`
about `httpx` vs `httpx2`, unrelated to our changes.

### Static Analysis (ESLint on changed files)

```
src/pages/LessonPlayer.tsx
  406:24  warning  Promise executor functions should not be async   no-async-promise-executor
  810:6   warning  React Hook useMemo has a missing dependency     react-hooks/exhaustive-deps
✖ 2 problems (0 errors, 2 warnings)
```

Both warnings are **pre-existing** (line 406 is the `runPronunciationCheck`
executor, line 810 is `canGoNext`'s dep array — neither is touched by my
changes). The new code I added (`lessonSummary`, `stepOrder`, `handleWordPractice`,
`allAnswered`, drawer effects) produced zero warnings.

### TypeScript

```
$ npx tsc --noEmit
(no output → exit 0)
```

All type checks pass.

### Production Build

```
$ npm run build
✓ 819 modules transformed.
dist/index.html                             1.54 kB │ gzip:   0.78 kB
dist/assets/index-BZvdcDG0.js             572.98 kB │ gzip: 150.60 kB
dist/assets/three-vendor-coga82YW.js      787.01 kB │ gzip: 207.38 kB
dist/textures/colormap-fallback.png          shipped (74 B)
✓ built in 14.31s
```

Build succeeds. `colormap-fallback.png` is shipped under `dist/textures/`,
served at `/textures/colormap-fallback.png` on Vercel.

---

## 2. Review Findings

### Severity scale
- 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low · ⚪ Trivial

### Resolved in commit `635e386` (review refinements)

| ID | Severity | Finding | Resolution |
|----|----------|---------|------------|
| R-001 | 🟢 Low | Navbar backdrop was `<button>` — semantically a click-catcher, not an interactive control. Assistive tech would announce it as a button. | Replaced with `<div role="presentation" aria-hidden="true" onClick={close}>`. The role remains discoverable via the explicit close button inside the drawer. |
| R-002 | ⚪ Trivial | `lessonSummary` declared an unused local `videoScenes` (only `.length` was read). | Inlined the optional chain into the template literal. |

### No new issues from review

The following were explicitly checked and found clean:

| Area | Check | Result |
|------|-------|--------|
| Navbar drawer | Body-scroll lock restores previous overflow on cleanup (no leak across routes) | ✅ |
| Navbar drawer | Escape key listener removed on cleanup | ✅ |
| Navbar drawer | Drawer auto-closes on route change | ✅ |
| Navbar drawer | Focus management (focus trap) | ⚠️ Not implemented — drawer is keyboard-dismissible via Escape and close button, but focus does not auto-trap inside. Acceptable for a hamburger menu but flag as future enhancement. |
| useSafeGLTF fallback | `fallbackTexturePromise` cached at module scope | ✅ Single-flight; no leak across hooks |
| useSafeGLTF fallback | Texture applied to all materials (single or array) | ✅ Same traversal pattern as the existing textureUrl branch |
| useSafeGLTF fallback | Abort signal respected before applying result | ✅ |
| LessonPlayer useMemo | New `?.` + `?? 0` on `vocabulary`, `quiz`, `images`, `scenes` | ✅ All `.length` reads on possibly-undefined arrays are now safe |
| LessonPlayer handleWordPractice | Uses local `vocabulary = lesson.vocabulary ?? []` so all downstream `.length`/`.filter` are safe | ✅ |
| LessonPlayer allAnswered | `lesson?.quiz?.length` guard added | ✅ |
| Backward compat | `Lesson` interface still declares `vocabulary: VocabularyItem[]` etc. as required | ✅ Hardening is purely defensive — does not weaken the type contract |

---

## 3. Debug Trace Summary

### Issue 1: `Cannot read properties of undefined (reading 'length')`

**Stack location (user-provided):** `at pi (index-uJaL_6ns.js:7:306808)` — bundled
`LessonMediaPreview` → maps to `useMemo` calls on lines 124-125 of
`LessonPlayer.tsx` *and* the surrounding `lessonSummary` / `stepOrder` `useMemo`s
that did not have optional chaining.

**Root cause:** Backend `courseService.getLesson` returns a `Lesson` whose
`vocabulary`, `quiz`, `images`, or `videoLesson.scenes` fields may be undefined
when the lesson is incomplete or a partial response is cached. The TS types
declared these as required (`VocabularyItem[]` not `VocabularyItem[] | undefined`),
so callers wrote `lesson.vocabulary.length` unguarded.

**Fix:** Optional-chain each array field and use `?? 0` for the count. Same
treatment in `handleWordPractice`, `allAnswered`, and the secondary `lessonSummary`
read. The runtime contract was stricter than the API contract; we now match the API.

### Issue 2: `colormap.png` returning 504/400 on Supabase

**Root cause:** GLB model files reference an external texture at
`AR_models/pets/models/Textures/colormap.png` inside the Supabase bucket. Either
the file is missing (400/404), or the bucket's RLS policy denies public access
(403/504). The previous `useSafeGLTF` behavior was to **error out entirely**,
which surfaced as a 504/400 cycle in network logs and a "Legacy split-file model
detected" error.

**Fix:** When external deps are detected without an override URL, attempt to load
a local 74-byte `colormap-fallback.png` from `/textures/`. If even that fails,
clear `material.map` on all materials so the model renders with its base color
(never throws, never 504-loops).

### Issue 3: Navbar mobile drawer

**Previous state:** Inline `animate-slideDown` panel below the navbar. On
mobile/tablet (≤767 px) this works, but the panel pushes content and is not
focus-trapped. There is no backdrop, no Escape-key support, no body-scroll lock.

**Fix:** Replace with a true overlay drawer:
- `position: fixed inset-y-0 right-0`, width `min(85vw, 320px)`
- `position: fixed inset-0` backdrop with `bg-slate-900/50 backdrop-blur-sm`
- `@keyframes slideInRight` / `@keyframes fadeIn` for smooth open
- Closes on route change, Escape, backdrop click, or close button
- Body scroll locked (`document.body.style.overflow = 'hidden'`) for the lifetime
  of the open drawer, restored on cleanup

---

## 4. Pre-existing warnings (NOT introduced by this change)

| File | Line | Rule | Note |
|------|------|------|------|
| `LessonPlayer.tsx` | 406 | `no-async-promise-executor` | `runPronunciationCheck` Promise constructor is async — pre-existing. |
| `LessonPlayer.tsx` | 810 | `react-hooks/exhaustive-deps` | `canGoNext` useMemo missing `isStepLocked` in deps — pre-existing. |
| `vite build` | — | `chunk-size > 500 kB` | `three-vendor.js` is 787 kB — pre-existing. |
| `vite build` | — | `PetViewer3D` mixed static/dynamic import | Pre-existing. |

None of these block the build or tests.

---

## 5. Files Changed

| Commit | File | Lines | Purpose |
|--------|------|-------|---------|
| `376bd45` | `frontend-web/src/components/Navbar.tsx` | rewritten | Mobile drawer (overlay, slide-in, backdrop, scroll lock, Esc/click/route close) |
| `376bd45` | `frontend-web/src/hooks/useSafeGLTF.ts` | +95 | Local texture fallback for legacy split-file GLB models |
| `376bd45` | `frontend-web/src/index.css` | +30 | `@keyframes slideInRight`, `@keyframes fadeIn`, `.animate-slideInRight`, `.animate-fadeIn` |
| `376bd45` | `frontend-web/src/pages/LessonPlayer.tsx` | ~30 | `useMemo` defensive guards (`?.` + `?? 0`) |
| `376bd45` | `frontend-web/public/textures/colormap-fallback.png` | new (74 B) | Locally-served fallback texture |
| `376bd45` | `scripts/generate-fallback-texture.mjs` | new (93 lines) | Generator for the fallback PNG (reproducible, no binary in history beyond the committed 74 B file) |
| `635e386` | `frontend-web/src/components/Navbar.tsx` | -1/+2 | Backdrop `<button>` → `<div role="presentation">` |
| `635e386` | `frontend-web/src/pages/LessonPlayer.tsx` | -2/+1 | Drop unused `videoScenes` local |

---

## 6. Verification Checklist

- [x] Frontend vitest: **63/63 pass**
- [x] Backend pytest: **108/108 pass**
- [x] TypeScript: clean (no errors)
- [x] ESLint on changed files: 0 errors (2 pre-existing warnings unchanged)
- [x] Production build: succeeds, ships fallback texture under `/textures/`
- [x] No regressions introduced
- [x] Defensive guards don't weaken existing type contracts
- [x] Backward compatible (no API/signature changes)

---

## 7. Outstanding Items / Future Enhancements

1. **Focus trap inside drawer.** A real `focus-trap` library integration would
   prevent Tab from escaping the drawer while it's open. Not blocking for the
   current release.
2. **`three-vendor` chunk split.** The 787 kB three.js bundle could be
   code-split per feature (viewer-only vs. scene-only). Pre-existing; not in
   scope of this fix.
3. **Backend type contract.** `Lesson` interface declares `vocabulary: VocabularyItem[]`
   as required; backend responses don't always honor this. Consider tightening
   the backend response (Pydantic v2 `model_dump(exclude_none=True)`) or adding
   response validation middleware to enforce. Out of scope for this PR but
   worth filing as a follow-up.

---

## 8. Sign-off

All four review/debug phases complete:

| Phase | Status |
|-------|--------|
| Test (frontend + backend) | ✅ |
| Lint + Type check | ✅ |
| Build | ✅ |
| Static review | ✅ |

**Verdict:** ✅ Safe to deploy. Awaiting user approval to `git push origin main`.
