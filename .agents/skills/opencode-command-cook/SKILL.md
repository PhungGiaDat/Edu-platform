---
name: opencode-command-cook
description: Migrated OpenCode slash command `cook`. Use when the user asks to run or follow the old OpenCode `/cook` workflow.
---

# opencode-command-cook

This skill was migrated from `.opencode/commands/cook.md`.

OpenCode slash-command runtime features such as `$ARGUMENTS`, automatic command routing, and shell interpolation are preserved as prompt guidance only. Adapt them to Codex tools when executing.

## Original Command

Start implementing this task following your Core Responsibilities, Subagents Team and Development Rules:
$ARGUMENTS

## Step 1 — Clarify Requirements

Before doing anything else, read the task description carefully and identify what is unclear or missing.

Ask **only the questions that are genuinely needed** — do not ask about things that can be reasonably inferred from context or the codebase.

Good questions to ask (when applicable):
- **Scope:** "Should this affect existing behavior X, or only new cases?"
- **Edge cases:** "How should the system handle Y?"
- **Tech choice:** "Do you have a preference for [A] vs [B]?"
- **Integration:** "Should this connect to [existing service], or be standalone?"
- **UI/UX:** "Do you have a design reference, or should I propose one?"
- **Priority:** "Are there any constraints (deadline, performance, backward compatibility)?"

**Rules for asking:**
- Ask all questions in a single message — do not ask one by one
- Maximum 5 questions; skip anything you can infer
- If the task is already clear and complete, skip this step and proceed directly
- If the user says "just do it" or "YOLO", skip questions and proceed

Wait for the user's answers before moving to Step 2.

---

## Step 2 — Confirm Mode

After receiving answers (or if skipping Step 1), ask the user to choose a mode if not already specified:

- **YOLO** — execute all phases autonomously without approval gates
- **Interactive** — pause at each phase gate for user approval

Shortcut: if `$ARGUMENTS` contains "YOLO" → auto-select YOLO. "interactive" or "step by step" → auto-select Interactive.

---

## Step 3 — Execute SDLC Workflow

With requirements clarified and mode confirmed, execute all phases in order:

1. **Planning** — invoke `@planner` and `@researcher` in parallel
2. **Design UI/UX** — load `ui-ux-pro-max` skill if UI is involved
3. **Development** — implement the feature on a feature branch
4. **Code Review** — invoke `@reviewer`, then `@fix` for any issues
5. **Testing** — invoke `@tester`, loop with `@fix` until all tests pass
6. **Deployment** — invoke `@devops` to containerize and deploy
7. **Documentation** — invoke `@documenter` to update docs

Pass the selected mode and all clarified requirements to every subagent.
