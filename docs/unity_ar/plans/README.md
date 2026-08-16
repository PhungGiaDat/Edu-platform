# `docs/unity_ar/plans/` — Implementation Plans

Plans describe **how** to implement a spec topic across multiple sessions.

## What lives here

- `YYYY-MM-DD-<plan-slug>.md` — one file per plan
- Plan body: ordered steps with verification gates between them
- Plans are derived from `spec/` topics and decompose into `tasks/`

## File naming

- Date prefix is when the plan was written
- Plan slug describes the topic: `cat-meat-combo`, `runtime-image-library-load`
- NEVER delete a plan — once superseded, mark it `Status: superseded`

## When to create

- Spec topic is `approved` AND the work spans >1 session
- A single trivial change does NOT need a plan — just a progress entry

## Minimum content

```markdown
## Status
draft | approved | in-progress | done | superseded

## Target spec
Link to `docs/unity_ar/spec/<file>.md`

## Steps
1. <step> → verify: <check>
2. <step> → verify: <check>
3. ...

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