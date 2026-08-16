# `docs/unity_ar/spec/` — Authoritative Specifications

Specifications are **the source of truth** for the Unity / AR Foundation target architecture.
Once approved, code conforms to spec — spec does NOT bend to code.

## What lives here

- `*.md` — one file per spec topic (e.g. `image-tracking.md`, `card-registry.md`, `combo-interaction.md`)
- Each spec answers: **what** the system does, **why** it does it, **which invariants** apply
- Specs reference concrete files / classes / components — but do not duplicate code

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
| `docs/research/` | Investigation notes that may seed a new spec |
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
List of files / classes / components / packages this spec touches.

## Verification
How an implementation of this spec is checked (XR Simulation, PlayMode, physical device, etc.).

## Open questions
Things that block this spec from `approved`.
```

A spec is **approved** only when all `## Open questions` are resolved and the author marks the status.