# `docs/unity_ar/blockers/` — Active and Resolved Blockers

A blocker is anything **preventing** a spec from being implemented as written.

## What lives here

- `YYYY-MM-DD-<blocker-slug>.md` — one file per blocker
- A blocker names the spec topic it blocks, the exact symptom, and a hypothesis

## File naming

- Date prefix is when the blocker was opened
- Slug is short: `arcore-image-quality`, `mutable-library-async-race`

## Lifecycle states

```
open → investigating → resolved | wontfix | deferred
```

Update the frontmatter `Status:` line when state changes. **Never delete a blocker file** — `wontfix` and `resolved` are valid terminal states.

## Minimum content

```markdown
## Status
open | investigating | resolved | wontfix | deferred

## Blocks
- Link to `docs/unity_ar/spec/<file>.md` (the spec this blocks)
- Link to `docs/unity_ar/plans/<file>.md` (the plan this blocks, if any)

## Symptom
Exact observed behavior with reproduction steps.

## Hypotheses (ranked)
1. <most likely> — <evidence>
2. <second> — <evidence>

## Tried
What was attempted and why it didn't resolve.

## Resolution
(Filled in only when status = resolved | wontfix | deferred.)
```

## When to open a blocker

- Spec says X, code does Y, and the spec is approved (don't rewrite spec to match code)
- XR Simulation passes but physical device behaves differently
- Package / API discrepancy that requires a design call, not a code fix
- Dependency conflict that needs a manual decision

## When NOT to open a blocker

- A simple bug → write progress entry, fix it
- A typo → fix it
- An implementation is just slow → profile and write progress entry