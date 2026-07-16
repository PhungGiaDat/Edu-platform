# Course catalog and sidebar redesign

## Goal

Bring the learner course catalog and desktop sidebar visually in line with the supplied claymorphic reference while retaining the existing routing, course data, localization, progress data, and mobile navigation.

## Design decisions

- Keep the existing single catalog composition rather than creating a parallel page layout.
- Use the existing local Momo course artwork and colour tokens; no network-loaded visual assets or new UI libraries.
- Make the desktop sidebar a calmer, more compact learning rail: branded card, learning streak summary, then clear active navigation.
- Keep the catalog hero editorial and spacious on desktop, then stack it into the existing mobile-first layout below 760px.
- Preserve reduced-motion behavior and visible keyboard focus styles.

## Implementation plan

1. Add a focused course-catalog UI regression test that asserts the hero, progress overview, and category paths remain visible.
2. Refine `CourseList` markup only where semantic labels or visual hooks are needed.
3. Update catalog CSS for the reference layout and high-contrast clay controls.
4. Update the desktop sidebar presentation without changing navigation targets or collapse behavior.
5. Build, run the focused test, capture the rendered `/courses` page in a headless browser, inspect the capture, then iterate if necessary.

## Verification

- `npm.cmd run test -- CourseList`
- `npm.cmd run build`
- Headless Chrome screenshot of `/courses` at desktop viewport, visually inspected after each UI pass.
