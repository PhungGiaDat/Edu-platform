# Course Catalog Polish — 2026-08-24

## Scope

Follow-up to `2026-08-24-frontend-color-overlay-fix.md`. The user requested
five DOM-level tweaks on the authenticated `/courses` shell after testing
on iPhone 12 Pro. Four of the five were actionable; one was a mis-click
on the chat-buddy backdrop overlay and was dropped.

Verification levels achieved:

- CODE_VERIFIED — typecheck / build / Playwright assertions all green
- RUNTIME_VERIFIED — Playwright Chromium captured screenshots in both
  expanded (296px) and collapsed (132px) desktop states plus an
  iPhone 12 Pro 390x844 sanity snapshot

DEVICE_VERIFIED was not attempted — this is the legacy `frontend/`
surface (not the MOBILE release target per `AGENTS.md`) and the user
did not request on-device verification.

## Changes

### 1. `span.course-catalog__eyebrow` — clearer typography

User intent: restyle in place (text was retained). CSS at
`frontend/src/styles/course-catalog.css:73-86` was changed:

| | before | after |
|---|---|---|
| min-height | 2.5rem | 2.75rem |
| padding | 0.35 0.95 | 0.5 1.1 |
| border | 1px purple 16% | 1.5px sky-blue 28% |
| color | #6d28d9 (purple) | #1e3a8a (deep blue) |
| background | white 74% | white-to-sky gradient |
| shadow | soft inset | 6px sky-blue lift + inset highlight |
| font-size | inherits body | 0.92rem |

Visual evidence: `test-artifacts/catalog-hero.png`.

### 2. `aside.learner-sidebar--desktop` — collapsed 88px → 132px

User intent: "bung ra đều màn hình hơn" while keeping the collapse
toggle. Only the **collapsed** state was widened; the expanded
state at 296px was untouched.

Edited `frontend/src/index.css:39-46`:

```diff
 @media (min-width: 768px) {
   .learner-shell {
-    --learner-sidebar-width: 88px;
+    --learner-sidebar-width: 132px;
   }
   .learner-shell--sidebar-expanded {
     --learner-sidebar-width: 296px;
   }
 }
```

Result: collapsed labels like "Path", "Stickers", "Pet" now have ~32px
breathing room each side, no longer cramped against the wrapper.

Verified via Playwright bounding box:

```
[sidebar-expanded] width=296
[sidebar-collapsed] width=132   ← matches expected 130-138 range
```

Visual evidence: `test-artifacts/catalog-after-desktop.png`.

### 3. `.course-catalog__stat--0..3 .course-catalog__stat-icon` — per-card tone

User intent: "fix this svg" → give icons a colored-circle background.
Each icon now owns its own gradient that does NOT inherit from the
stat card's text color.

| stat | icon | gradient | glow ring |
|---|---|---|---|
| 0 | BookOpenIcon | #7c3aed → #5b21b6 (purple) | rgb(237 233 254) 4px |
| 1 | CheckIcon | #34d399 → #059669 (emerald) | rgb(209 250 229) 4px |
| 2 | BoltIcon | #fbbf24 → #d97706 (amber) | rgb(254 243 199) 4px |
| 3 | RocketIcon | #fb7185 → #be123c (rose) | rgb(255 228 230) 4px |

Base `.course-catalog__stat-icon` size grew from 2.75rem (44px) to
3.25rem (52px) to accommodate the new glow ring. Mobile override
in the same file reduced proportionally to 3rem (48px).

Inner SVG grew 1.5rem → 1.75rem and gained a `drop-shadow(0 1px 1px
rgba(0,0,0,0.18))` for claymorphic depth.

Playwright assertion captured all four computed backgrounds:

```
[stat-icon-0] linear-gradient(135deg, rgb(124, 58, 237), rgb(91, 33, 182))
[stat-icon-1] linear-gradient(135deg, rgb(52, 211, 153), rgb(5, 150, 105))
[stat-icon-2] linear-gradient(135deg, rgb(251, 191, 36), rgb(217, 119, 6))
[stat-icon-3] linear-gradient(135deg, rgb(251, 113, 133), rgb(190, 18, 60))
```

Visual evidence: `test-artifacts/catalog-stats.png`.

### 4. `.course-catalog__priority-action` — clearer arrow icon

User intent: "icon meaning rõ hơn". The chevron `›` glyph (font-size
2rem) was replaced with a proper horizontal arrow SVG that signals
"go to /learning-path" more clearly.

`frontend/src/pages/CourseList.tsx` — JSX:

```diff
-<span aria-hidden="true">›</span>
+<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
+     strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
+     aria-hidden="true">
+  <path d="M5 12h14" />
+  <path d="m13 6 6 6-6 6" />
+</svg>
```

`frontend/src/styles/course-catalog.css:178-217` — CSS now sizes the
SVG instead of using `font-size: 2rem`, and the icon shifts 2px right
on hover to reinforce directional affordance. Button footprint grew
2.6rem → 2.75rem so the arrow has air.

Playwright assertion: `priority.locator('svg')` count is `1`; legacy
chevron span count is `0`.

Visual evidence: `test-artifacts/catalog-hero.png`.

### 5. Element 4 (dropped) — `<div class="fixed inset-0 z-10">`

User said "xóa nút model này đi" while pointing at the chat buddy
backdrop overlay (a click-to-close mask for the floating chat box,
not a "model button"). After clarification the user selected
"wrong_element" — this item is intentionally not removed.

If the chat buddy on `/courses` is unwanted, the correct fix is to
gate the chat box at its parent route or `useAuth()` level, not to
strip the click-to-close overlay which would break the dialog's
escape hatch.

## Files changed

| path | type | lines (approx) |
|---|---|---|
| `frontend/src/styles/course-catalog.css` | edit | eyebrow retstyle, stat-icon sizing + 4 gradient blocks, priority-action CSS, mobile override for stat-icon |
| `frontend/src/index.css` | edit | `--learner-sidebar-width: 88px → 132px` |
| `frontend/src/pages/CourseList.tsx` | edit | chevron span → arrow SVG |
| `frontend/tests/e2e/_course-catalog-after.spec.ts` | new (then deleted — see note below) |
| `frontend/test-artifacts/catalog-*.png` | new | 5 visual evidence PNGs |

## Verification

Single Playwright spec `course-catalog course-shell polish` asserted:

- eyebrow present with expected text
- sidebar expanded ≥ 296px
- sidebar collapsed in 130-138px range (we target 132px)
- 4 stat icons each have `linear-gradient` background
- priority-action has exactly 1 `<svg>`, no `<span>›` chevron

Result: `1 passed (9.7s)` on chromium only (mobile safari binary
not present in the sandbox).

The temporary spec `_course-catalog-after.spec.ts` was deleted after
verification. If you want a regression suite, copy the file without
the leading underscore and run via `npx playwright test`.

## Risks / known limitations

- **Legacy surface** — `frontend/` is a `LEGACY / REFERENCE / FALLBACK`
  surface per `AGENTS.md`. These polish edits do not block the
  MOBILE-FIRST release target (`mobile/rn`, `mobile/unity`,
  `backend/`).
- **iOS safe-area** — eyebrow / sidebar edits stay within `clamp()`
  and `env(safe-area-inset-*)`-aware layouts already in place. No
  new safe-area-handling was introduced here; it remains owned by
  the layout primitives in `Layout.tsx`.
- **Sidebar localStorage** — the 132px width is automatic for any
  user whose `eduar:sidebar-preference` is missing or whose
  viewport is `< 1200px` wide. Existing user prefs are preserved.
- **Stat icons in dark mode** — current CSS uses light-only
  backgrounds. If dark mode lands, the glow rings and gradient stops
  may want a dark variant.
