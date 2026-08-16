# `docs/mobile_migration/plans/` — Implementation Plans

Plans describe **how** to implement a spec topic across multiple sessions.

## What lives here

- `YYYY-MM-DD-<plan-slug>.md` — one file per plan
- Plan body: ordered phases/steps with verification gates between them
- Plans are derived from `spec/` topics and decompose into `tasks/`
- The migration plan uses phases **R0–R15** (RN learner migration). The Unity AR lane uses **P0–P11**; the Mobile AR track inside `docs/unity_ar/` uses **M0–M12** — do not reuse those IDs here.

## File naming

- Date prefix is when the plan was written
- Plan slug describes the topic: `learner-migration-plan`, `cursor-execution-model`
- NEVER delete a plan — once superseded, mark it `Status: superseded`

## When to create

- Spec topic is `approved` AND the work spans >1 session
- A single trivial change does NOT need a plan — just a progress entry

## Minimum content

```markdown
## Status
draft | approved | in-progress | done | superseded

## Target spec
Link to `docs/mobile_migration/spec/<file>.md`

## Phases
R<n> — <title>  → verify: <check>

## Risks
- <what could go wrong>

## Out of scope
- <what this plan explicitly does NOT do>
```

## Lifecycle

```
draft → approved → in-progress → done
                 ↘ superseded (replaced by a newer plan)
```

Only `approved` plans decompose into `tasks/`. `draft` plans are sketches; `in-progress` plans should have an active progress entry.
