---
description: Research, analyze, and create an implementation plan — does NOT implement
allowed-tools: Agent, Read, Glob, Grep
---

Use the `planner` and `researcher` subagents (via the Agent tool) to plan this task:
$ARGUMENTS

**IMPORTANT: Do NOT start implementing.** Research and plan only.

## How to Execute

Invoke `planner` and `researcher` in **parallel** for efficiency:

- **planner** — gather requirements, design architecture, break down tasks
- **researcher** — evaluate technologies, research solutions, identify risks

Wait for both to complete, then present a unified plan to the user.

## File Output

- Plan → `./docs/plan/YYYYmmdd_<title>.md`
- Research → `./docs/research/YYYYmmdd_<title>.md`
- Create directories if they don't exist

## Plan Structure

### 1. Overview
- Feature description and business value
- Target users and scope

### 2. Requirements
- Functional requirements
- Non-functional requirements
- Acceptance criteria

### 3. Architecture
- System design
- Component breakdown
- Data models and API contracts

### 4. Implementation Tasks
Break down into tasks with:
- Description, estimated effort, dependencies, priority

### 5. Technical Decisions
- Technology choices (from researcher findings)
- Trade-offs considered

### 6. Risks & Mitigations
- Technical risks and mitigation strategies

### 7. Testing Strategy
- Unit, integration, E2E test needs

---
**Next step for user:** Run `/cook` to start implementation based on this plan.
