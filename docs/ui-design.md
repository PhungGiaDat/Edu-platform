# EduAR Responsive Navigation and Child UX Specification

## Navigation behavior

| Viewport | Default | Interaction | Content behavior |
|---|---|---|---|
| `<768 px` | Labeled bottom bar: Learn, AR, Cards, Profile, More | More opens a modal bottom sheet | Sheet contains Pet, Stickers, daily goal/streak, course preview, tracker and CTAs. |
| `768–1199 px` | 88 px icon rail | Expand to a 296 px overlay | Main remains offset 88 px; overlay closes via toggle, Escape, or route selection. |
| `>=1200 px` | 296 px sidebar | Collapse to 88 px rail | Main offset changes with the same state. |

The saved desktop preference uses a versioned local-storage object. Navigation targets are at least 44x44 px. Active items use both color and shape, not color alone.

## Accessibility

- Bottom items always show short labels.
- More sheet uses `role=dialog`, `aria-modal`, an accessible title, focus trap, focus return, Escape and backdrop close.
- Toggle exposes `aria-expanded` and an action label.
- Safe-area insets prevent overlap on iPhone; body content receives bottom padding while the bar is present.
- Motion is decorative only and disabled with `prefers-reduced-motion`.

## Tracker and icon system

- XP: yellow lightning inside a blue clay medallion.
- Done: open book with mint check.
- Stickers: yellow/coral star sticker with folded corner and sparkles; reused for navigation.
- Icons are local inline SVG, 24–28 px. Values are 20–22 px and labels 11–12 px. Cards use scoped padding and support four-digit XP.

## Course catalog

- Header uses `min-width: 0`; “View all” never wraps.
- Titles clamp to two lines; cards never cause horizontal scrolling.
- Empty, error and long-title states retain a full-width target.

## Lexi

- Visual size: about 56 px mobile, 68–72 px tablet, and 84–88 px laptop; pointer target stays at least 44 px.
- The visual is contained using height-first sizing and the atlas cell ratio 192:208, never stretched to a square.
- Header/message variants stay inside their declared containers.

## Visual QA sizes

393x852 (iPhone 14 Pro), 768x1024, 1024x768, 1280x800, and 1440x900; additionally test 125% browser zoom and 200% text zoom.
