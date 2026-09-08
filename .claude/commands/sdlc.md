---
description: Run the sdlc-kit 7-phase SDLC workflow (opt-in, does not touch superpowers default)
---

Run the SDLC orchestrator for: $ARGUMENTS

1. Load the `sdlc-workflow` skill (`.claude/skills/sdlc-workflow/SKILL.md`) and act as its orchestrator.
2. Mode: if the arguments include "YOLO" use YOLO mode; "interactive" or "step by step" use Interactive mode; otherwise ask the user to pick a mode before starting.
3. Delegate phase work to the sdlc-kit subagents (`planner`, `researcher`, `reviewer`, `tester`, `fix`, `documenter`, `git-manager`, `devops`, `debug`) via the Agent tool, per the skill's phase table.
4. Scope rule: this workflow applies ONLY to this invocation. Do not apply SDLC phases to other tasks in the session — the default workflow remains superpowers.
