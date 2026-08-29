# Tra từ & Sổ tay — UI/UX Design (2026-08-30)

**Status:** Draft for product owner review — Phase 2 of the SDLC workflow.
**Companion documents:** [spec](../spec/2026-08-30-dictionary-notebook-wiki.md) · [plan](../plan/2026-08-30-dictionary-notebook-wiki.md) · [research](../../research/20260830_dictionary_notebook_wiki.md)

## Design thesis

A 5–8-year-old types one English word and receives **one friendly definition
card** — big word, IPA, part-of-speech badge, Vietnamese meaning, example,
and a kid-safe wiki excerpt — then saves it with one amber button. The
**signature element** is the Lexi-hosted definition card: the mascot shares
the card with the word and reacts to state (waving on arrival, waiting when
something goes wrong), so feedback is emotional, not just textual. Everything
else stays quiet: one column, one accent per role, no decoration that does
not teach.

## Tokens (locked by the approved spec)

| Token | Value | Usage |
|---|---|---|
| `brandColors.primary` | `#2563EB` | selected tab, translation text, primary button |
| `brandColors.secondary` | `#7C3AED` | IPA text, source badges, focus ring (tabs) |
| `brandColors.accent` | `#F59E0B` | save CTA only (one accent job) |
| `brandColors.background` | `#EFF6FF` | page background |
| `brandColors.foreground` | `#0F172A` | headings, body text |
| Secondary text | `#475569` (slate-600) | captions, labels — never lighter |
| Danger | `#DC2626` + `#FEE2E2` tint | error/blocked surfaces |
| Success | mint (`colors.mintGreen` legacy) | saved confirmation |
| Headings | Nunito 800/900 | word, page title, dialog title |
| Body | DM Sans 400/500/700 | everything else |
| Radius | 12px chips · 9999px tabs/badges · 28px cards/dialog | clay feel |
| Motion | 150–300ms, hard-shadow press (`translateY`) on buttons | `prefers-reduced-motion` kills all |

Icons: inline SVG only, 24×24 viewBox, `stroke-width 2.5`, `aria-hidden` —
search, book, save, globe, sparkle, alert, grid/list, close. **No emoji as UI
icons** anywhere on touched surfaces.

## Wireframes

### 1. Dictionary — Tra từ mode (default, mobile 390px)

```text
┌──────────────────────────────────┐
│ ☰  Tra từ                 ◉ Lexi │  Nunito 900 · Lexi "waving" 56px
│                                  │
│ (● Tra từ) ( Dịch câu )          │  clay pills; selected = #2563EB fill,
│                                  │  white text; unselected = white/85
│ ┌──────────────────────────────┐ │
│ │ Từ cần tra            [icon] │ │  label DM Sans 500 14px
│ │ ┌──────────────────────┐ ░░ │ │  input 48px + search icon button
│ │ └──────────────────────┘ ░░ │ │
│ │ [        Tra từ         ]   │ │  primary clay btn, hard shadow 4px
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │ elephant          /ˈel.ə.fənt/│ │  word 28px Nunito 900 · IPA purple
│ │ (noun)                ◉ Lexi  │ │  POS badge · Lexi "idle" 56px
│ │                              │ │
│ │ con voi                      │ │  22px Nunito 800 #2563EB
│ │ A very large grey animal     │ │  15px DM Sans, #0F172A
│ │ with a long trunk.           │ │
│ │ ❝ The elephant drinks water. ❞│ │  14px italic slate-600
│ │ ────────────────────────────  │ │  hairline slate-100
│ │ [Simple Wikipedia]           │ │  badge: purple tint pill 12px
│ │ Elephants are the largest…   │ │  14px
│ │ Nguồn: Wikipedia (CC BY-SA) ↗│ │  12px underline link slate-600
│ │ ┌──────────────────────────┐ │ │
│ │ │ ▪ Lưu vào Sổ tay         │ │ │  amber clay btn, full width, 48px
│ │ └──────────────────────────┘ │ │
│ └──────────────────────────────┘ │
│ ▸ bottom nav (More sheet entry)  │
└──────────────────────────────────┘
```

### 2. Card states (Tra từ)

```text
LOADING                         BLOCKED (422)                  ERROR (503/net)
┌────────────────────┐   ┌────────────────────────────┐   ┌──────────────────┐
│ ◌ spinner  ◉ Lexi  │   │ ◉ Lexi "waiting"           │   │ ⚠ SVG alert icon │
│ "Lexi đang tra từ" │   │ Từ này không phù hợp       │   │ Dịch vụ đang bận.│
│ (aria-live polite) │   │ để tra. Bạn thử từ         │   │ Thử lại sau nhé! │
│                    │   │ khác nhé!                  │   │ [ Thử lại ]      │
└────────────────────┘   │ (coral tint panel, 15px)   │   └──────────────────┘
                         └────────────────────────────┘
SAVED (3s)   → save button turns mint, "✓ Đã lưu" (SVG check), then reverts
SAVE ERROR   → red inline line under button: "Không lưu được, thử lại nhé"
```

### 3. Dictionary — Dịch câu mode (secondary)

```text
┌──────────────────────────────────┐
│ ( Tra từ ) (● Dịch câu)          │
│ ┌──────────────────────────────┐ │
│ │ Câu tiếng Anh                │ │
│ │ [ The elephant drinks water ]│ │
│ │ Ngữ cảnh (tùy chọn)          │ │  textarea 2 rows, optional
│ │ [ …………………………………………]          │ │
│ │ [        Dịch ngay       ]   │ │  primary clay btn
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │ Tiếng Việt                   │ │
│ │ Con voi uống nước            │ │  22px #2563EB
│ │ ── Dịch từng từ ──           │ │
│ │ (elephant · voi)(drinks · uống)│ ← word CHIPS: 40px, clay tint,
│ │  ← click = switch to Tra từ   │    hover -2px, focus amber ring
│ │ 💡 Giải thích  → SparkleIcon  │ │  SVG icons replace all emoji
│ │ 🔗 Từ liên quan → GlobeIcon   │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

### 4. Notebook — detail dialog (mobile bottom sheet / desktop modal)

```text
MOBILE (≤ md)                      DESKTOP (≥ md)
┌──────────────────────────┐       ┌──────────────────────────────┐
│ overlay rgba(15,23,42,.45)│       │        centered, max-w-md     │
│ ┌──────────────────────┐ │       │ ┌──────────────────────────┐ │
│ │ elephant        [✕]  │ │       │ │ elephant           [✕]   │ │
│ │ /ˈel.ə.fənt/ (noun)  │ │       │ │ /ˈel.ə.fənt/ (noun)(src) │ │
│ │ con voi              │ │       │ │ con voi                  │ │
│ │ definition…          │ │       │ │ …                        │ │
│ │ [Wikipedia] summary… │ │       │ │ …                        │ │
│ │ Ngữ cảnh: "…"        │ │       │ │ 2 lần ôn · [Xóa từ]      │ │
│ │ 2 lần ôn · [Xóa từ]  │ │       │ └──────────────────────────┘ │
│ └──────────────────────┘ │       └──────────────────────────────┘
└──────────────────────────┘       radius 28px · clay double shadow
Escape + backdrop close · focus moves in on open, restored on close
```

### 5. Navigation entries

- **Desktop sidebar:** two new items after Flashcards — `DictionaryIcon`
  (magnifier-plus) + `NotebookIcon` (book spine), same 2.5 stroke style,
  labels from locale keys.
- **Mobile:** More sheet gains two 64px clay gradient buttons (blue tint for
  Tra từ, purple tint for Sổ tay) beside Pets/Stickers; bottom bar untouched
  (already full).

## Interaction & motion notes

- Tab switch: 150ms background/color; panel content crossfade 150ms
  (`motion-safe` only).
- Definition card entrance: fade + 8px rise, 200ms, once.
- Clay buttons: `:active translateY(2px)` press; hover = shadow deepens, **no
  scale on text-bearing controls**.
- Word chips: hover `translateY(-2px)` 150ms; focus-visible amber ring.
- Save: saving = disabled + spinner; saved = mint 3s → revert (matches spec).
- Dialog: body scroll lock; `--z-modal` layering.
- All animation inside `motion-safe:` / reduced-motion overrides per Task 8 CSS.

## UX rules applied (ui-ux-pro-max + frontend-design)

- One accent job: amber is only "save". Blue teaches/acts, purple labels,
  red/mint only for state feedback.
- Vocabulary is the child's: "Tra từ", "Lưu vào Sổ tay", "Thử lại nhé" —
  no system jargon; error text never apologizes, it explains + gives the fix.
- Consistent actions keep their names across states ("Tra từ" button →
  "Tra từ" tab; save button → "Đã lưu").
- Touch targets ≥44px (tabs 44px, chips 40px+borders, buttons 48px).
- Focus order: tabs → input → submit → result card (save last); dialog traps
  focus, Escape/backdrop close, restore on close.
- Empty notebook = invitation ("Lưu từ từ AI translation hoặc flashcard để
  xem ở đây") — kept from the existing page.
- Labels name what the child controls ("Từ cần tra"), never the system.

## Design → implementation mapping

| Design element | Plan task |
|---|---|
| `brandColors` tokens, fonts link, clay utilities (tabs/chips/save/ipa/dialog) | Task 8 |
| Tra từ tab + Definition card + save states + Lexi states | Task 9 |
| Dịch câu panel + word chips + emoji→SVG swap | Task 10 |
| Notebook detail dialog + SVG source icons | Task 11 |
| Sidebar + More sheet entries | Task 12 |

## Verification hooks for Phase 3

- Visual QA at 375/390/768/1024px; no horizontal scroll; contrast ≥4.5:1 for
  text (slate-600 floor respected).
- `prefers-reduced-motion` pass: no entrance/hover motion, Lexi static.
- Keyboard-only pass: full journey reachable; visible rings on every stop.

## Taste-skill adaptation (product UI mode, mobile webapp)

**Design Read (taste-skill §0.B):** "Reading this as: multi-mode product UI
(dictionary + notebook) for Vietnamese children ages 5–8 on **mobile web**,
with a **vibrant claymorphism** language, executed on the project's locked
design system (Nunito/DM Sans + `brandColors` + `ClayCard`/`ClayButton`/
`ClayBadge`) — **not** a landing page."

Per taste-skill's own scoping (§13), its landing-page machinery (AIDA, hero
paradigms, bento grids, marquees, scroll-hijack, image sourcing, eyebrow
discipline) is **out of scope** here. What carries over is the quality
discipline; what overrides it is the kids' product constraint + the approved
design system (taste-skill §0.A.6: quiet constraints override aesthetic
preference).

**Dials (kids' product UI, adjusted from baseline):**

- `DESIGN_VARIANCE: 3` — structured single-column product UI; personality
  comes from clay shapes, color roles and Lexi states, not asymmetric layouts.
- `MOTION_INTENSITY: 3` — CSS transitions only (150–300ms) + clay press
  feedback; everything inside `motion-safe`. No GSAP, no scroll-driven
  animation, no infinite loops.
- `VISUAL_DENSITY: 3` — airy; one card per idea; 48px primary touch targets.

**Applied from the taste skills (mandatory in Phase 3):**

- Full state cycles shipped, never "static success only": loading / empty /
  blocked / error / saved (see states matrix above) + tactile `:active`
  press (`translateY(2px)`).
- Button contrast audit: amber save button uses `#0F172A` text (≥4.5:1 ✓);
  blue primary buttons use white text (≥4.5:1 ✓); outline buttons on white
  cards use `#2563EB` text. No invisible-label combos anywhere.
- Form patterns: label **above** input, helper/error text **below**; no
  placeholder-as-label; all form text ≥4.5:1 against card white.
- No duplicate CTA intent: exactly one "Tra từ" submit and one save action
  per definition card; sentence mode deliberately has no second save.
- Shape consistency lock (documented rule): chips 12px · tabs/badges pill
  (9999px) · cards/dialog 28px — applied everywhere, no mixing.
- Copy self-audit before RUNTIME_VERIFIED: every visible string re-read;
  plain kid-friendly Vietnamese; no filler verbs, no fake-precise numbers.
- z-index restraint: the only new z-context is the detail dialog via the
  existing `--z-modal` token; no arbitrary `z-50` spam.
- Icons: inline SVG, single family, 24 viewBox, `stroke-width 2.5`,
  `aria-hidden`; zero emoji in code/UI on touched surfaces.

**Explicitly rejected (landing machinery / wrong surface):** AIDA structure,
hero paradigms, bento grids, marquee, GSAP pinning/scrubbing, kinetic
typography, picsum/image-gen assets, section eyebrows/numbering, logo walls,
decoration strips, scroll cues.

**Theme:** single light claymorphism theme (approved spec, kids' product).
A dark mode would be an app-wide program, not a per-feature decision; out of
scope for this feature.

**threejs-animation:** not applicable — this feature has no 3D surface; Lexi
is a 2D spritesheet rendered by the existing `CodexPetSprite`. three.js stays
out of the dictionary/notebook bundle path (bundle-size discipline).

**vercel-react-view-transitions:** not applicable — `<ViewTransition>`
requires `react@canary`; the project runs stable React 18.2. All state-change
animation is CSS transitions per the plan. Re-evaluate only if the project
upgrades React.

## Skill stack mapping (remaining phases)

| Skill | Phase | Application |
|---|---|---|
| vercel-react-best-practices | 3 Dev · 4 Review | ternary conditional render (no `&&`), hoist static JSX, primitive effect deps, no inline component definitions, no new deps, no barrel imports |
| code-intelligence | 3 Dev · 4 Review | after each edit: LSP/`tsc` diagnostics + `ast-grep` scan; mechanical emoji audit via grep; find dead code before commit |
| api-design | 4 Review | endpoint consistency: additive optional fields, 422 safety / 503 degradation semantics, plural REST naming, no verb paths beyond existing `/lookup` action convention |
| best-of-n-solving | 3 (optional) | only if a task admits multiple viable approaches; the plan is prescriptive, so single-path by default |
| brainstorming | 1 (done) | HARD GATE satisfied: spec + plan + UI design presented and approved |
| codebase-onboarding | — | superseded by completed recon + `docs/frontend-web/` program docs |
| ui-ux-pro-max · frontend-design · taste skills | 2 (done) | design system locked; UX rules + pre-flight below |

## Taste pre-flight checklist (Phase 3 QA gate)

- [ ] Zero emoji in touched files' JSX/UI (mechanical grep audit)
- [ ] Every button: text/background contrast ≥4.5:1 (amber/dark, blue/white)
- [ ] Labels above inputs; error text below; no placeholder-as-label
- [ ] Radius scale respected everywhere: 12 (chips) / 9999 (tabs, badges) / 28 (cards, dialog)
- [ ] Interactive elements: ≥44px targets, `cursor-pointer`, visible `:focus-visible` ring
- [ ] States complete: loading / blocked / error / empty / saved, with `aria-live` for async results
- [ ] No motion outside `motion-safe`; Lexi honors reduced motion
- [ ] No horizontal scroll at 390px; dialog scrollable within `max-h-[85dvh]`
- [ ] No new npm/pip dependencies introduced
- [ ] Copy self-audit: plain kid-friendly Vietnamese, consistent action names
