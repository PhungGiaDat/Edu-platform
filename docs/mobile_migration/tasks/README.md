# `docs/mobile_migration/tasks/` — Concrete Work Items

Tasks are **single-session, single-owner, single-feature-slice work items** pulled from approved plans. This workspace is primarily executed by **Cursor**; each task is deliberately bounded so one Cursor session can finish it, verify it, and stop.

## What lives here

- `YYYY-MM-DD-<task-slug>.md` — one file per task
- A task has clear acceptance criteria and a verification path
- Follow the Cursor execution model: **ONE TASK / ONE FEATURE SLICE / ONE SESSION / VERIFY / STOP** (see `plans/YYYY-MM-DD-cursor-execution-model.md`)

## File naming

- Date prefix is when the task was opened (or scheduled start date)
- Slug is short: `course-list-api-adapter`, `pet-collection-hook`, `session-warning-reducer`

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
Link to `docs/mobile_migration/plans/<file>.md`

## Objective
One sentence the task delivers.

## Files
- Likely files (create/modify) under `mobile/rn/src/...`

## Backend endpoints
- The exact endpoints this task consumes (reuse existing; no new endpoints without a backend-gap blocker)

## Prerequisites / Out of scope
- What must already exist; what this task explicitly does NOT do

## Acceptance criteria
- [ ] <verifiable, binary>

## Tests / Evidence
- Test names + pass criteria; evidence the next agent can verify

## Stop condition
- The single check that ends this task (do not gold-plate past it)

## Progress
Link to `docs/mobile_migration/progress/<file>.md` when work begins.
```
