---
name: unity-ar-evidence
description: Two-way Unity / AR memory protocol. (1) Cold-start: at the BEGINNING of any Unity session, read the newest `docs/unity_ar/progress/` file to inherit last session's context — goal, changes, verification, not-yet-verified, next steps. (2) Write-evidence: at the END of every Unity task, append a new `progress/YYYY-MM-DD-<topic>.md` so the next session inherits your result. Triggers on: starting any Unity task (cold-start), "I just finished X in Unity", "Cat+Meat combo now works in XR Sim", "I changed CardTrackingManager", "Blocker: ARCore doesn't track X", or any completion of work touching `mobile/unity/`. Mirrors the TencentDB Agent Memory 4-asset pattern in pure local files (no extra services).
---

# Unity / AR Evidence + Cold-Start Protocol

Project memory lives at `docs/unity_ar/`. This skill enforces two directions:

1. **Cold-start** — at the BEGINNING of every Unity session, read the latest progress entry so you start with context, not from zero.
2. **Write evidence** — at the END of every Unity task, write a progress entry so the next session inherits your result.

**Do not skip either step.** Together they form the continuity loop that gives the next session memory of what you did.

## Cold-Start Protocol (mandatory at session start)

Before doing **any** Unity / AR work in a new session, run this in order:

1. **List progress files** newest-first:
   ```bash
   Glob docs/unity_ar/progress/*.md — sort by mtime descending
   ```
2. **Read the newest progress file** with `Read`. This is the warm context — it tells you:
   - What the user asked last session
   - What was changed and verified
   - What was *not* verified (still pending on physical device, etc.)
   - Which specs and blockers are active
   - What the next session should pick up
3. **If the user named a task** (e.g. "continue Cat+Meat combo"), follow the `## Next` link from the latest progress and the `## Specs touched` / `## Blockers raised` sections.
4. **Only then start work.** Do not ask the user to re-explain what was done last session — the progress file is the canonical answer.

If `docs/unity_ar/progress/` is empty (first ever session), skip this step and tell the user "no prior progress" before starting.

### Write priority when cold-starting

The newest progress file is sufficient context for most sessions. **Do not pre-load** spec/, plans/, blockers/, or tasks/ unless the latest progress file links to one and the current task touches it. Those folders are written on demand, read on demand.

### What "newest" means

- Sort by **filename date** (`YYYY-MM-DD` prefix), not filesystem mtime — filenames are the canonical chronological order
- If two files share the same date, the one with the longer / more detailed body is the more recent
- If a progress file references "see also `progress/older-file.md`", follow that link only if the current task overlaps

## Write-Evidence Protocol (mandatory at session end)

See sections below. The reverse direction of the same loop.

## The 5 folders

| Folder | Purpose | When to write |
|--------|---------|---------------|
| `spec/` | Authoritative architecture specs (what & why) | When a topic has multiple components or invariants to lock in |
| `progress/` | Session evidence diary (when & verified) | **End of every Unity task, always** |
| `plans/` | Multi-session implementation plans | When approved spec spans >1 session |
| `blockers/` | Things preventing spec implementation | When spec says X but reality does Y |
| `tasks/` | Single-session work items | When a plan step needs explicit tracking |

Each folder has its own `README.md` with the full authoring rules. **Read the README before writing a new file type.**

## What you write at end of session

Pick the right folder by what happened. Most sessions only need `progress/`. 

### Mandatory: `progress/YYYY-MM-DD-<topic>.md`

**Always**, even for trivial changes. Use today's date (UTC+7) and a short topic slug.

```markdown
## Session
YYYY-MM-DD HH:MM, agent: claude-code, branch: <git branch>

## Goal
One sentence — the user's actual ask.

## Changed
- `path/to/file.cs:LINE` — what changed and why
- `GameObject/Component` — what changed (if Editor state)

## Verified
- compilation: pass | fail | not-run
- console (read_console): clean | errors-list | warnings-list
- tests: <name> → pass | fail
- XR Simulation: <result> | not-run
- physical device: <result> | not-run | n/a

## Not Verified
- (default: list anything mobile/physical)
- e.g. Android ARCore real-camera tracking — not verified

## Specs touched
- `docs/unity_ar/spec/<file>.md` §<section> — <what changed>

## Blockers raised
- `docs/unity_ar/blockers/<file>.md` — <one-line summary>

## Next
- (one sentence — what should happen next, NOT what you'll do next)
```

Keep it short (~50-150 lines). Do **not** paste diffs. Reference commit hashes if useful.

### Optional: `blockers/YYYY-MM-DD-<slug>.md`

Open a blocker ONLY when:
- Approved spec contradicts reality (don't rewrite spec to match code)
- XR Sim passes but physical device behaves differently
- Package / API discrepancy requires a design call

Don't open for typos or trivial bugs.

### Optional: `spec/<topic>.md`

Create or update a spec when:
- A topic spans >1 component
- Multiple agents need to agree on invariants
- You discover a new invariant that wasn't documented

If unsure, write progress first, then ask whether spec needs updating.

### Optional: `plans/YYYY-MM-DD-<slug>.md`

Only when approved spec spans >1 session AND no existing plan covers it.

### Optional: `tasks/YYYY-MM-DD-<slug>.md`

Only when a plan step needs explicit tracking AND you'll be the one (or someone else will be) doing the work in a later session.

## Anti-patterns

- **Don't** write `progress/` without a `## Verified` section. "Should compile" / "probably works" are not verification.
- **Don't** write `progress/` describing what you plan to do — it's past tense only.
- **Don't** open a blocker for a normal bug. Fix and progress.
- **Don't** rename existing progress files. Their name is their identity.
- **Don't** dump full diffs into progress. Reference commit hashes or paths.
- **Don't** create a spec for a one-file change. Progress is enough.
- **Don't** read all 5 README.md files every session. Read once on first trigger; thereafter read only the folder you're about to write to.

## How this skill auto-fires

Trigger phrases:
- "I just finished X" / "now it works" / "done with X"
- "Let me document this" / "save evidence" / "write progress"
- Any completion of work touching `mobile/unity/`
- Any new blocker uncovered during a Unity task
- Any spec-affecting decision (new invariant, deprecated API)

The Cursor side mirror lives at `.cursor/rules/unity-ar-evidence.mdc` — same trigger surface, two hosts.

## Reading order for next session

1. Newest `docs/unity_ar/progress/` file → today's starting context.
2. Follow `## Specs touched` and `## Blockers raised` links if relevant.
3. If you're picking up an open task, read its parent plan first.
4. Only then start work.