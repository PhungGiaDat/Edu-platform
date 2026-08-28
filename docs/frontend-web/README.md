# Frontend Web Delivery Documentation

This folder is the source of truth for the graduation mobile-web release in
`frontend/`. React Native and Unity documents remain historical references and
do not set the active product priority.

## Current UI program

| Document | Purpose | Status |
|---|---|---|
| [UI approach decision](decisions/2026-08-28-ui-approach.md) | Records the selected frontend modernization strategy and rejected alternatives | Accepted |
| [Mobile-web product UI specification](spec/2026-08-28-mobile-web-product-ui.md) | Defines the learner journey, UI contracts, boundaries, and acceptance gates | Approved |
| [Mobile-web UI execution plan](plan/2026-08-28-mobile-web-ui-execution.md) | Converts the approved specification into testable implementation tasks | Ready for execution |

## Folder convention

- `decisions/`: durable architecture and product decisions.
- `spec/`: approved behavior, UI, accessibility, and contract requirements.
- `plan/`: executable task sequences with exact files, tests, and commands.
- `progress/`: append-only implementation and verification evidence.
- `qa/`: reusable browser and device verification matrices when needed.

## Delivery order

The primary journey is:

```text
Auth -> Course -> Lesson -> Flashcard -> Reward/Progress
```

Work is accepted in independently verifiable vertical slices. Games and PWA
enhancements follow the core journey. Admin, native React Native, Unity, and
AR/XR redesign are outside this UI program unless explicitly assigned.

## Verification vocabulary

- `CODE_VERIFIED`: TypeScript build, lint, and focused automated tests pass.
- `RUNTIME_VERIFIED`: the changed journey is exercised in a running browser
  against the intended backend or a controlled reproducible test backend.
- `DEVICE_BROWSER_VERIFIED`: the journey is exercised in a real mobile browser;
  responsive emulation must be labelled as emulation.

Desktop-only validation is not the graduation release gate for learner-facing
work.
