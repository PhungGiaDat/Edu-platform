# `docs/unity_ar/tasks/` — Concrete Work Items

Tasks are **single-session, single-owner work items** pulled from approved plans.

## What lives here

- `YYYY-MM-DD-<task-slug>.md` — one file per task
- A task has clear acceptance criteria and a verification path

## File naming

- Date prefix is when the task was opened (or scheduled start date)
- Slug is short: `combo-engine-distance-check`, `xr-sim-test-fixture`

## Lifecycle states

```
open → in-progress → done | blocked | wontfix
```

Update frontmatter `Status:` when state changes.

## Minimum content

```markdown
## Status
open | in-progress | done | blocked | wontfix

## Parent plan
Link to `docs/unity_ar/plans/<file>.md`

## Goal
One sentence the task delivers.

## Acceptance criteria
- [ ] <verifiable>

## Verification
- compilation: ...
- tests: ...
- XR Simulation: ...
- physical device: optional

## Time / risk estimate
S/M/L and any caveats.

## Progress
Link to `docs/unity_ar/progress/<file>.md` when work begins.
```

## When to create

- A plan step needs explicit ownership / tracking
- A spec topic can be broken into independent parallel tasks

## When NOT to create

- Single-line fix → progress entry only
- Spike / exploration → progress entry, no task file