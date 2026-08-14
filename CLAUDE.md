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

## Project Context

This is an educational platform project with:
- **Frontend**: React/Next.js web app (`frontend-web/`)
- **Backend**: FastAPI backend server (`backend/`)
- **Mobile**: React Native + Unity AR components (`mobile/`)
- **Skills**: Reusable workflows in `.cursor/skills/` (Cursor scans) and `.claude/skills/` (Claude scans). Both directories exist with overlapping but not identical content.
- **Rules**: Workspace-level at `.cursor/rules/` and `.claude/rules/`.

### Workspace memory: `docs/unity_ar/`

Project memory for the Unity / AR Foundation migration lives at `docs/unity_ar/`. Folder structure mirrors TencentDB Agent Memory's 4-asset pattern (Chat Memory / Skill / Wiki / Code-Graph) but in pure local files — no extra services.

| Folder | Purpose | Authoring rules |
|--------|---------|-----------------|
| `spec/` | Authoritative specs (what & why) | `docs/unity_ar/spec/README.md` |
| `progress/` | Session evidence (when & verified) | `docs/unity_ar/progress/README.md` |
| `plans/` | Multi-session plans (how) | `docs/unity_ar/plans/README.md` |
| `blockers/` | Things blocking spec | `docs/unity_ar/blockers/README.md` |
| `tasks/` | Single-session work items | `docs/unity_ar/tasks/README.md` |

**Rule: at the end of EVERY Unity task, write a `progress/` entry.** Even trivial changes. Skipping this is a process violation — the next session has no memory of what you did. The skill `unity-ar-evidence` (`.claude/skills/unity-ar-evidence/SKILL.md`) enforces this on the Claude side; `.cursor/rules/unity-ar-evidence.mdc` does the same on the Cursor side.

**Rule: at the BEGINNING of every Unity session, read the newest `progress/` file first.** This is the cold-start protocol — the previous session's last entry tells you what was done, what was verified, what was not yet verified, and what to pick up next. Do not pre-load `spec/`, `plans/`, `blockers/`, or `tasks/` unless the latest progress file links to one. The newest progress file alone is the warm context.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## 5. Unity Tool Routing (this workspace)

This project has **three** Unity-agent paths available simultaneously. Do not call them interchangeably — pick by task shape. Skill content is loaded **on demand**, never all at once.

### Priority order

1. **Besty UnitySkills REST** (`.claude/skills/unity-skills/`, 776 skills, server on `localhost:8090–8100`)
   - **Use for**: live Editor operations when Unity is open — scripts, scenes, GameObjects, components, assets, console, Play Mode, EditMode/PlayMode tests, editor state.
   - **First action in any session that touches Unity**: `GET /health` → branch on `currentMode` (`approval` / `auto` / `bypass`) before any write.
   - **Never** read all 776 skills at once. Pick by intent: `GET /skills/recommend?intent=<words>` (~2-5 KB) or `GET /skills?brief=1` (~19 KB). Read full schema only when you must call a skill whose signature you don't already hold.
   - **Dry-run gate**: `POST /skill/<name>?mode=dryRun` before the first execution of any skill whose parameters you don't already know.

2. **Official Unity CLI** (binding lives at `mobile/unity/Library/UnitySkills/cli_config.json`, only present after user binds via `Window > UnitySkills > Unity CLI Setup...`)
   - **Use for**: cold-starting Unity when Editor is closed (`unity open <project> --args -unityskills-coldstart`), headless tests, headless runs/builds when explicitly enabled.
   - **Use only if**: that file exists with `enabled: true`. If absent or `enabled: false` → CLI is off; ignore it completely; do not suggest installing it unprompted.
   - See `unity-skills/skills/unity-cli/SKILL.md` (already auto-discovered) for the routing rules Besty ships.

3. **IvanMurzak Unity MCP** (`user-unityMCP` namespace, 48 tools, allow-listed in `.claude/settings.local.json`)
   - **Use for**: when UnitySkills lacks the required capability, when an existing workflow already targets MCP, or when MCP provides materially better inspection for the task (e.g. taking scene screenshots via `manage_camera screenshot`, running EditMode/PlayMode tests via `run_tests`, reading live Unity Console via `read_console`).
   - Skill to load on demand: `unity-mcp-usage` (`.claude/skills/unity-mcp-usage/SKILL.md`).

### Anti-routing rules (the bits that burn quota)

- **Never** perform the same mutation through both UnitySkills and Unity MCP. Pick one path; verify through that same path.
- **Never** read the full UnitySkills schema (618 KB) unless the cheaper layers left you unsure. The same applies to any other large reference file — open one section at a time.
- **Never** load all of `.claude/skills/unity-skills/` references at once. Load the specific `skills/<module>/SKILL.md` only when the task touches that module. The `xr` module's preface rule applies: before any `xr_*` REST call, load `unity-skills/skills/xr/SKILL.md`.
- **Never** call Unity CLI when the REST server is alive and the task is interactive editor work. CLI is for closed-editor scenarios only.
- **Never** suggest installing Unity CLI. It is opt-in via the in-Editor panel; you cannot enable it from chat.

### Skill loading cheat-sheet (progressive disclosure)

| When the user says or implies… | Load (name only — content loads on trigger) |
|---|---|
| Anything about AR Foundation, ARTrackedImageManager, runtime image library, image tracking, XR Simulation | `unity-arfoundation-image-tracking` |
| Anything about React Native ↔ Unity bridge, RN↔Unity messaging, TurboModule surface for Unity | `unity-rn-bridge` |
| Unity MCP tool calls, `mcp__UnityMCP__*`, taking Editor screenshots, running tests via MCP | `unity-mcp-usage` |
| Vector math, pose, distance, quaternions, world/local transforms | `unity-3d-math` |
| 3D math deep-dive references (same as above, deeper) | `.claude/skills/unity-3d-math/references/spatial-math-deep-dive.md` |
| Besty REST call, `localhost:8090`, `unity_skills.py`, `/health`, `/skills/recommend` | `unity-skills` (its `SKILL.md` boots the schema-discovery protocol) |
| Building skills, structuring skill content | `suggesting-skills` / `.claude/skills/suggesting-skills/SKILL.md` |
| Anything else in Unity | Do not pre-load — start with `/health` and let the server's `/skills/recommend` pick the module |

### Cursor-side mirror

The same routing is encoded in `.cursor/rules/unity-tool-routing.mdc` so Cursor's agent follows it too. Two files, identical policy, two different agent hosts.


### Unity AR spec-change boundary

For normal Unity implementation tasks:

- `docs/unity_ar/spec/` is authoritative, not an implementation scratchpad.
- Do not change an approved requirement or architecture decision merely to match current code.
- If implementation evidence conflicts with spec, stop and record the conflict.
- Spec changes require an explicit architecture/spec task.
- Normal implementation sessions update their task artifact and MUST append a `progress/` entry.

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


