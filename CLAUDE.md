# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Derived from Andrej Karpathy's observations on LLM coding pitfalls.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

---

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

---

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

---

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

**The test:** Every changed line should trace directly to the user's request.

---

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

## Workflow: superpowers + sdlc-kit (hybrid)

Two toolchains, complementary roles. Never run both as competing top-level processes:

- **superpowers** = default execution engine (brainstorm → plan → TDD loop → review → finish branch).
- **sdlc-kit agents** = specialist subagents slotted into that pipeline. `/sdlc` = formal 7-phase orchestrator, opt-in only.

### Default execution loop (coding tasks)

1. Plan → superpowers `brainstorming` / `writing-plans`
2. Implement → superpowers TDD: `tdd-red` (failing tests) → `tdd-green` (minimum impl), loop
3. Review → sdlc-kit `reviewer` agent (quality + security); apply findings via `fix` agent
4. Finish → superpowers `finishing-a-development-branch`

### When to pull in sdlc-kit specialists

| Situation | Agent |
|---|---|
| Tech comparison / unknowns during planning | `researcher` |
| Recurring bug the TDD loop cannot close | `debug` (root cause) → `fix` |
| Regression / E2E sweep, Medium+ scope | `tester` |
| DB schema / index / query work | `database-admin` |
| CI / deploy / containerization | `devops` |
| Docs on Large scope | `documenter` |
| Branch / release / tag strategy | `git-manager` |

### Sizing

- Small (1–2 files): pure superpowers TDD, no sdlc agents.
- Medium/Large: mix per table above.
- `/sdlc <task>`: run the full 7-phase orchestrator — only when the user asks for it explicitly.

### Precedence

Karpathy rules (§1–4) always apply. This section governs how tasks execute. During a `/sdlc` invocation, the orchestrator overrides this section for that invocation only.

---

## Project Context

This is an educational platform project with:
- **Frontend**: React/Next.js web app (`frontend-web/`)
- **Backend**: FastAPI backend server (`backend/`)
- **Mobile**: React Native app (`mobile/`)
- **Skills**: Reusable workflows in `.cursor/skills/` (Cursor scans) and `.claude/skills/` (Claude scans). Both directories exist with overlapping but not identical content.
- **Rules**: Workspace-level at `.cursor/rules/` and `.claude/rules/`.

### Workspace memory folders

Planning/memory artifacts follow a 5-folder pattern — `spec/` (what & why), `progress/` (session evidence, when & verified), `plans/` (how), `blockers/` (things blocking spec), `tasks/` (single-session work items) — created under whichever `docs/<area>/` the work belongs to. The pattern is not pinned to one fixed folder.

- At the END of any task that touches an area with these folders, append a `progress/` entry (even for trivial changes).
- At the BEGINNING of a follow-up session, read the newest `progress/` file first — it carries what was done, verified, and what to pick up next.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

### IMPLEMENTATION → SPEC/PLAN FEEDBACK RULE

During implementation, the current approved spec/plan is the baseline.

If implementation reveals:
- missing requirement
- incorrect dependency
- backend/data contract gap
- asset/export mismatch
- new cross-system requirement
- invalid assumption
- scope change

DO NOT silently work around the plan.

Instead:

1. capture concrete evidence
2. identify the owning spec/plan
3. update the minimum required documentation
4. record the change in progress
5. update task/dependency status if affected
6. continue implementation only after the contract is coherent

Do not rewrite unrelated planning documents.
Do not reopen closed decisions without new evidence.
Do not create duplicate sources of truth.

Small implementation discoveries may be reconciled in the same session.
Architectural or cross-system changes require STOP + explicit decision before
continuing.


