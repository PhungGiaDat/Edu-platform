# mobile-AR — Docs Index

This is the canonical home for AR-related documentation on the `mobile-AR` branch.
The branch-scope rule `.cursor/rules/mobile-AR-branch-scope.mdc` requires that
**every code change on `mobile-AR` is paired with a doc update here**.

## Branch contract (TL;DR)

- Active branch **must** be `mobile-AR` for the rule to apply.
- Touch **only** AR-related files (Unity `Assets/AR/**`, `Bridge/**`, `mobile/rn/src/**`, AR docs).
- No code change without a matching doc entry in this folder.
- Commit messages must reference the doc path.

## Layout

| Path | Purpose | Status |
|---|---|---|
| `README.md` | This index | kept current |
| `architecture.md` | Unity–RN bridge, data flow, scene/component map | _to be drafted_ |
| `anchors.md` | Anchor persistence + eviction policy | _to be drafted_ |
| `tracking.md` | Image / plane / object tracking notes | _to be drafted_ |
| `interactions.md` | Gestures, combos, food/pet logic | _to be drafted_ |
| `bridge.md` | RN ↔ Unity message protocol | _to be drafted_ |
| `build.md` | Codemagic pipeline + local build steps | _to be drafted_ |
| `decisions/NNNN-title.md` | Architecture Decision Records (append) | empty |
| `phase-logs/YYYY-MM-DD-phase-NN.md` | Per-phase implementation logs (append-only) | empty |

## How to add a new doc

1. Pick the right file under this folder (or create a new one if it's a genuinely new sub-area).
2. Write the **why** and **what** before writing code. Reference the design spec if it exists.
3. Add a row to the table above (or update an existing row's status).
4. In the commit message, end with `Docs: docs/mobile-AR/<file>.md`.

## Cross-references

- AR design spec: `docs/superpowers/specs/2026-07-23-unity-rn-mobile-ar-design.md`
- AR migration plan: `docs/superpowers/plans/2026-07-23-unity-rn-mobile-ar-migration-plan.md`
- AR POC (legacy, runtime image tracking): `docs/ar-poc/CODEMAGIC-SETUP.md`
- Phase-2 implementation logs: `docs/implementation-log/PHASE2-*.md`
- Branch-scope rule: `.cursor/rules/mobile-AR-branch-scope.mdc`
- Branch base: `origin/main` (tracking PR #8 merge commit `dc0c357`)

## Phase log conventions

`phase-logs/YYYY-MM-DD-phase-NN.md` files are append-only. New work on an existing phase
appends to the existing file under a dated sub-heading; new phases get a new file.
