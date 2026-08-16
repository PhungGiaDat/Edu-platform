# `docs/unity_ar/` — Unity / AR Foundation Project Memory

Local-lite memory hub for the Unity / AR Foundation migration. Mirrors TencentDB Agent Memory's 4-asset pattern without requiring their full stack (3 services + LLM proxy).

## Asset mapping

| TencentDB concept | Local equivalent | Location |
|--------------------|------------------|----------|
| Chat Memory (L0–L3) | Session transcripts + memory file | `C:\Users\LENOVO\.cursor\projects\<workspace>\agent-transcripts\` (auto) + this folder's `progress/` (curated) |
| Skill | Reusable workflow + guardrails | `.claude/skills/unity-*` and `.cursor/skills/unity-*` |
| Wiki | Authoritative specifications | `docs/unity_ar/spec/` |
| Code-Graph | Real file structure + read-by-name routing | workspace tree + `.claude/skills/unity-arfoundation-image-tracking/references/` |

## Folder structure

```
docs/unity_ar/
├── spec/       # Authoritative architecture specs (what & why)
├── progress/   # Implementation evidence (when & verified)
├── plans/      # Multi-session plans derived from specs (how)
├── blockers/   # Things preventing spec implementation
└── tasks/      # Single-session work items pulled from plans
```

Each folder has its own `README.md` defining content rules.

## Workflow

1. **Brainstorm / design** → produces a new `spec/<topic>.md` (status: draft)
2. **Plan** → `plans/YYYY-MM-DD-<slug>.md` decomposes approved spec into steps
3. **Task** → `tasks/YYYY-MM-DD-<slug>.md` pulls a single step from a plan
4. **Work** → implement + verify + write `progress/YYYY-MM-DD-<slug>.md`
5. **Blocked?** → `blockers/YYYY-MM-DD-<slug>.md`, link from spec + plan + task
6. **Loop** → next session reads `progress/` newest-first, picks up the task

## Why this matters

- The next session does not re-derive what the previous one learned.
- Specs are **durable**. Progress is **disposable**.
- A blocker file outlives any single Claude / Cursor session.
- Memory is **load-on-demand** — `spec/` is one file per topic, not a 600-line dump.

## When a session ends

Mandatory evidence write (agent must do, not user):

```markdown
docs/unity_ar/progress/YYYY-MM-DD-<short-topic>.md

with sections:
  ## Session
  ## Goal
  ## Changed
  ## Verified
  ## Not Verified
  ## Specs touched
  ## Blockers raised
```

If the work affected a spec or uncovered a blocker, update those files too.

## When a session starts

Mandatory cold-start read (agent must do, not user):

1. `Glob docs/unity_ar/progress/*.md` — list newest-first by filename date
2. `Read` the newest progress file — this is today's starting context
3. Follow `## Specs touched` / `## Blockers raised` links only if the current task overlaps
4. **Do not pre-load** spec/, plans/, blockers/, tasks/ unless the progress file explicitly points to them

If `progress/` is empty (first session), tell the user "no prior progress" before starting work.

See `.claude/skills/unity-ar-evidence/SKILL.md` for the auto-trigger protocol (covers both directions).