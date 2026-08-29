---
description: "Create a research-backed implementation plan"
---

$ARGUMENTS

Use the SDLC `planner` and `researcher` agents to research and plan this task.

**MODE:** Apply the current mode (YOLO/INTERACTIVE).

## Approach

1. Invoke `@planner` and `@researcher` in parallel.
2. Combine their outputs into one unified plan.
3. Save artifacts under `./docs/plan/` and `./docs/research/`.

## File Output

- Plan → `./docs/plan/YYYYmmdd_<title>.md`
- Research → `./docs/research/YYYYmmdd_<title>.md`

## Constraints

- Do NOT implement changes in this command.
- Do NOT skip the research step.
