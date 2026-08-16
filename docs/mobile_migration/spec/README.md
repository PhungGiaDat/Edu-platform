# `docs/mobile_migration/spec/` — Authoritative Specifications

Specifications are **the source of truth** for the React Native learner-product target behavior. Once approved, RN code conforms to spec — spec does NOT bend to code.

## What lives here

- `*.md` — one file per spec topic (e.g. `learner-product-spec.md`, `learner-parity-matrix.md`, `web-feature-inventory.md`, `native-ar-integration.md`)
- Each spec answers: **what** the mobile learner product does, **why** it does it, **which invariants** apply
- Specs reference concrete files / endpoints / components — but do not duplicate code
- `000-index.md` — table of contents + requirement ID conventions for this workspace

## File naming

- `<topic>.md` — lowercase, dash-separated
- `000-index.md` — table of contents linking every spec

## When to create / update

- **Create** when a topic has more than one open design question or has multiple components that must agree
- **Update** when an invariant changes, a component is added/removed, or a milestone closes
- NEVER edit a spec to retroactively match an implementation — open a blocker instead

## Relationship to other folders

| Folder | Relationship |
|--------|--------------|
| `progress/` | Evidence the spec was implemented and verified |
| `plans/` | Plans derived from spec topics |
| `blockers/` | Things preventing the spec from being implemented |
| `tasks/` | Concrete work items pulled from plans |
| `docs/unity_ar/spec/` | Unity/native-AR specs (authoritative for the AR lane; reference, do not duplicate) |
| `docs/superpowers/plans/` | Workflow / process plans (NOT architecture specs) |
| `docs/report/` | Generic session reports (web/backend/etc.) |

## Authoring convention

Each spec file MUST contain:

```markdown
## Status
draft | approved | superseded

## Goal
One sentence: what this spec locks in.

## Invariants
Numbered rules that code MUST follow.

## Components
List of files / screens / hooks / endpoints this spec touches.

## Requirements
Stable requirement IDs (MOB-<DOMAIN>-REQ-xxx) with behavior, ownership,
backend dependency, verification, and status. See `000-index.md` for the
ID conventions and collision rules.
```
