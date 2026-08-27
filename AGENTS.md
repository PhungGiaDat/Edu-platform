# SDLC Agent Team (Cursor host)

A team of specialized AI agents covering the full Software Development Life Cycle (SDLC).

**Default behavior**: this file is loaded by the Cursor host. It contains the SDLC orchestrator's role, skill discovery rules, and routing into `.cursor/skills/`. It deliberately does NOT duplicate the workspace-level rules in `CLAUDE.md` (which is loaded by Claude Code), nor the Unity-specific routing rules in `.cursor/rules/unity-tool-routing.mdc`, nor the evidence protocol in `.cursor/rules/unity-ar-evidence.mdc`. This keeps each host's startup context small.

**Companion files (read on demand, never all at once):**

| Host | File | Purpose |
|------|------|---------|
| Claude Code | `CLAUDE.md` | Behavioral guidelines + Unity Tool Routing §5 + workspace memory |
| Cursor | `.cursor/rules/karpathy-guidelines.mdc` | Karpathy behavioral guidelines |
| Cursor | `.cursor/rules/unity-tool-routing.mdc` | UnitySkills REST > CLI > MCP routing |
| Cursor | `.cursor/rules/unity-ar-evidence.mdc` | Evidence-write protocol at end of every Unity task |
| Both | `docs/unity_ar/README.md` | Folder structure + TencentDB memory mapping |

If a Cursor session and a Claude session disagree on routing, `CLAUDE.md` §5 wins (it is workspace-level and version-controlled separately).

**Always use the SDLC orchestrator (`sdlc-orchestrator`) as the entrypoint for any software development task. Before answering ANY question, check if a relevant skill in `.cursor/skills/` applies — if yes, load it with the `Read` tool first. Never answer a development question without loading at least one relevant skill.**

## Skills Loading Rule

**Primary auto-loaded skills directory: `.cursor/skills/`** (Cursor's skill discovery scans this directory and lists its `SKILL.md` files in context).

**Reference catalogs (do NOT auto-load):**
- `.agents/skills-disabled/` — large reference catalog of ~1,000 skills. Renamed from `.agents/skills/` so Cursor's scanner skips it. Restore by renaming back to `.agents/skills/` if you want them auto-loaded.
- `.cursor/references/awesome-cursor-skills/` — cloned awesome-list of community skills. Browse `README.md` and copy individual skills into `.cursor/skills/` if you want them active.
- `.cursor/skills/superpowers/` — Superpowers workflow skills (TDD, brainstorming, debugging, etc.). Loaded via `.cursor/rules/superpowers-bootstrap.mdc` workflow, not auto-listed.

When in doubt, prefer `.cursor/skills/` skills and explicit Superpowers skills. Treat `.agents/skills/` as opt-in reference material.

## Available Skills (on-demand, not preloaded)

Skills live in `.cursor/skills/<name>/SKILL.md` (also mirrored to `.claude/skills/<name>/SKILL.md` for Claude Code). **Do not read every skill at session start.** Read on demand:

```bash
Glob .cursor/skills/*/SKILL.md     # list — returns names only
```

For each candidate, read only its `SKILL.md` frontmatter (`name` + `description`) to confirm relevance, then load the full file only when the current phase actually needs it. The `description:` field on every `SKILL.md` is auto-loaded by Cursor as the trigger phrase — adding a second copy of the catalog here doubles the token cost with zero information gain.

### Discovery protocol (mandatory at task start)

1. `Glob .cursor/skills/*/SKILL.md` (or `Glob .claude/skills/*/SKILL.md` for Claude)
2. Match by trigger phrase from the `description:` field — load by **name only**
3. Open the full file only when the phase needs it
4. Reference catalogs (do not auto-load):
   - `.agents/skills-disabled/` — large ~1,000 skill reference catalog; renamed to keep Cursor scanner quiet
   - `.cursor/references/awesome-cursor-skills/` — cloned community list, browse `README.md`, copy individual skills into `.cursor/skills/` only when active
   - `.cursor/skills/superpowers/` — Superpowers workflow (TDD, brainstorming, debugging, etc.); loaded via `.cursor/rules/superpowers-bootstrap.mdc`, not auto-listed

### Authoritative skill pipelines

- SDLC pipeline + 26-skill dispatch map: `.cursor/rules/superpowers-bootstrap.mdc`
- Unity tool routing: `.cursor/rules/unity-tool-routing.mdc` (which Unity system to call)
- Evidence-write protocol: `.cursor/rules/unity-ar-evidence.mdc` (when to write `docs/unity_ar/` files)
- The orchestrator's per-phase slice lives below in "Team Overview"

When in doubt: prefer `.cursor/skills/` skills and explicit Superpowers skills. Treat `.agents/skills/` as opt-in reference material.

## Team Overview

This project includes 11 specialized agents that work together to handle all aspects of software development:

| Agent | Role | Mode | When to Use |
|-------|------|------|-------------|
| **orchestrator** | Team Lead | Primary | Default - coordinates all agents |
| **planner** | Solution Architect | Subagent | Requirements, architecture, planning |
| **researcher** | Technical Researcher | Subagent | Technology evaluation, debugging |
| **debug** | Debug Engineer | Subagent | Issue investigation, root cause analysis |
| **fix** | Bug Fix Engineer | Subagent | Implementing bug fixes |
| **reviewer** | Code Reviewer | Subagent | Code quality, security audit |
| **tester** | QA Engineer | Subagent | Test creation, quality assurance |
| **documenter** | Technical Writer | Subagent | Documentation, guides, API docs |
| **git-manager** | DevOps (Git) | Subagent | Version control, branching |
| **devops** | DevOps Specialist | Subagent | CI/CD, deployment, infrastructure |
| **database-admin** | DBA | Subagent | Database optimization, performance tuning |

## Quick Start

### 1. Using the Orchestrator (Recommended)

The orchestrator is set as the **default agent** and will automatically coordinate the team:

```
# Just start opencode
opencode

# Then ask for anything
"I need to add user authentication"
"Help me debug the database connection issue"
"Review the changes in src/api/"
```

### 2. Direct Agent Invocation

You can directly invoke any agent using `@` mention:

```
@planner create a plan for implementing payment processing
@reviewer review the authentication module
@tester create tests for the user service
@documenter document the API endpoints
@git-manager help me create a release branch
@devops set up a CI/CD pipeline
@researcher investigate PostgreSQL vs MongoDB for our use case
@debug investigate why users can't log in
@fix implement the fix for the null pointer exception
@database-admin optimize the slow queries in production
```

### 3. Switching Primary Agents

Use **Tab** key to switch between primary agents (orchestrator, build, plan).

## Agent Capabilities

### 🎯 Orchestrator
- Coordinates all SDLC phases
- Delegates tasks to specialized agents
- Manages workflow and quality gates
- Handles cross-team coordination

**Invoke:** Default agent or `@orchestrator`

### 📋 Planner
- Requirements gathering and analysis
- Architecture design
- Project planning and estimation
- Risk assessment

**Invoke:** `@planner`

**Example:**
```
@planner create a plan for adding multi-tenant support
```

### 🔍 Researcher
- Technology evaluation
- Problem investigation
- Codebase exploration
- Security research

**Invoke:** `@researcher`

**Example:**
```
@researcher compare React vs Vue for our new project
```

### 🐛 Debug
- Issue reproduction
- Root cause analysis
- Stack trace investigation
- Environment debugging

**Invoke:** `@debug`

**Example:**
```
@debug investigate the TypeError in the payment processing flow
```

### 🔧 Fix
- Bug fix implementation
- Safe code changes
- Regression test addition
- Fix verification

**Invoke:** `@fix`

**Example:**
```
@fix implement a fix for the null pointer exception in user service
```

### ✅ Reviewer
- Code quality review
- Security audit
- Performance analysis
- Best practices enforcement

**Invoke:** `@reviewer`

**Example:**
```
@reviewer review the changes in the authentication module
```

### 🧪 Tester
- Unit test creation
- Integration testing
- E2E test scenarios
- Test strategy planning

**Invoke:** `@tester`

**Example:**
```
@tester create comprehensive tests for the payment service
```

### 📝 Documenter
- README creation
- API documentation
- User guides
- Technical documentation

**Invoke:** `@documenter`

**Example:**
```
@documenter create API documentation for the user endpoints
```

### 🌿 Git Manager
- Branch strategy implementation
- Commit management
- Merge conflict resolution
- Release management

**Invoke:** `@git-manager`

**Example:**
```
@git-manager help me set up a release branch for v2.0
```

### 🚀 DevOps
- CI/CD pipeline setup
- Docker containerization
- Kubernetes deployments
- Infrastructure as Code

**Invoke:** `@devops`

**Example:**
```
@devops set up a GitHub Actions pipeline for this project
```

### 🗄️ Database Admin
- Database performance optimization
- Query analysis and tuning
- Index management
- Backup and recovery
- Security and permissions

**Invoke:** `@database-admin`

**Example:**
```
@database-admin analyze slow queries and optimize database performance
```
@devops set up a GitHub Actions pipeline for this project
```

## Typical Workflows

### New Feature Development

```
1. "I need to add [feature]"
   → Orchestrator delegates to planner
   
2. @planner creates architecture plan
   → Planner creates detailed design
   
3. @researcher evaluates technologies
   → Researcher provides recommendations
   
4. Implementation (you or build agent)
   
5. @tester creates test suite
   → Tester writes comprehensive tests
   
6. @reviewer reviews code
   → Reviewer provides feedback
   
7. @documenter updates docs
   → Documenter creates/updates documentation
   
8. @git-manager handles merge
   → Git manager manages branches
   
9. @devops deploys to staging
   → DevOps handles deployment
```

### Bug Investigation and Fix

```
1. "There's a bug with [description]"
   → @debug investigates root cause
   → Outputs Debug Report
   
2. @fix implements fix based on debug report
   → Outputs Fix Report
   
3. @tester creates regression tests
   → Outputs Bug List (if any bugs found)
   
4. If bugs found → @fix fixes bugs
   → Repeat until all tests pass
   
5. @reviewer reviews the fix
   → Outputs Issue List (if any issues found)
   
6. If issues found → @fix fixes issues
   → Repeat until review passes
   
7. @git-manager manages hotfix
   → Branch and merge handling
   
8. @devops deploys fix
   → Production deployment
```

### Code Review → Fix Workflow

```
1. @reviewer reviews code
   → Outputs Issue List (ISSUE-001, ISSUE-002, etc.)
   
2. @fix processes Issue List
   → Fixes Critical issues first
   → Then Important issues
   → Outputs Fix Report
   
3. @tester verifies fixes
   → If bugs found → Outputs Bug List
   → @fix fixes bugs
   → Repeat until all tests pass
   
4. @reviewer re-reviews if needed
```

### Test → Fix Workflow

```
1. @tester creates/runs tests
   → If bugs found → Outputs Bug List (BUG-001, BUG-002, etc.)
   → If all pass → Outputs Test Report
   
2. @fix processes Bug List
   → Fixes Critical bugs first
   → Then High, Medium, Low
   → Outputs Fix Report
   
3. @tester re-runs tests
   → Repeat until all tests pass
```

### Release Preparation

```
1. "Prepare release v2.0"
   → Orchestrator coordinates team
   
2. @tester runs regression suite
   
3. @reviewer performs security audit
   
4. @documenter updates all docs
   
5. @git-manager creates release branch and tags
   
6. @devops prepares deployment
```

## Configuration

The team is configured in:
- `opencode.json` - Main configuration
- `.opencode/agents/*.md` - Individual agent definitions

### Customization

You can customize agents by editing their `.md` files:
- Adjust `temperature` for creativity vs precision
- Modify `tools` for access control
- Update `permission` for security
- Change `model` for different capabilities

## Best Practices

### 1. Let Orchestrator Coordinate
Start with the orchestrator for complex tasks - it knows when to involve specialists.

### 2. Be Specific
Provide clear context when invoking agents directly:
```
❌ @reviewer review the code
✅ @reviewer review src/auth/oauth.ts focusing on security and error handling
```

### 3. Chain Agents
Use multiple agents in sequence:
```
@researcher investigate Redis clustering
@planner create implementation plan based on findings
@tester design test strategy for Redis integration
```

### 4. Use for Entire SDLC
The team covers:
- Requirements & Planning
- Design & Architecture
- Development & Implementation
- Testing & QA
- Documentation
- Deployment & Operations
- Maintenance & Support

## Agent Permissions

| Agent | Write | Edit | Bash | Web | Notes |
|-------|-------|------|------|-----|-------|
| Orchestrator | ✅ | ✅ | ✅ | ✅ | Full access |
| Planner | ❌ | ❌ | ⚠️ | ❌ | Read-only, safe bash |
| Researcher | ❌ | ❌ | ⚠️ | ✅ | Read-only with web |
| Debug | ❌ | ❌ | ⚠️ | ✅ | Read-only, can run tests |
| Fix | ✅ | ✅ | ⚠️ | ❌ | Can modify code |
| Reviewer | ❌ | ❌ | ⚠️ | ❌ | Read-only for review |
| Tester | ✅ | ✅ | ⚠️ | ❌ | Can write tests |
| Documenter | ✅ | ✅ | ❌ | ❌ | Write docs only |
| Git Manager | ❌ | ❌ | ⚠️ | ❌ | Git operations |
| DevOps | ✅ | ✅ | ⚠️ | ❌ | Config files |
| Database Admin | ✅ | ✅ | ⚠️ | ❌ | DB operations |

⚠️ = Ask permission, ✅ = Allowed, ❌ = Denied

## Troubleshooting

### Agent Not Responding
Check if agent is properly configured in `.opencode/agents/`

### Wrong Agent Invoked
Be more specific with agent name: `@planner` vs `@plan`

### Permission Denied
Check agent's `tools` and `permission` settings in agent file

## Examples

### Full Feature Request
```
I need to implement a real-time chat feature using WebSockets.
The chat should support:
- Private messaging
- Group channels
- Message history
- File attachments
```

The orchestrator will:
1. Have planner create detailed architecture
2. Have researcher evaluate WebSocket libraries
3. Coordinate implementation
4. Have tester create test strategy
5. Have reviewer audit security
6. Have documenter document API
7. Have git-manager create branches
8. Have devops set up infrastructure

### Quick Task
```
@tester add unit tests for src/utils/validators.ts
```

Tester will create comprehensive tests for the validators.

---

**Happy Coding!** 🚀

Your SDLC Agent Team is ready to help with any development task.

---

## Graduation Release Execution Policy

### WEB-FIRST PRODUCT DIRECTION (REVISED)

Effective immediately, the primary graduation-project release target is the **MOBILE-WEB APPLICATION in `frontend/`** — a responsive web app optimized for mobile browsers, with progressive enhancement toward a PWA.

Primary implementation surfaces:
- `frontend/**` (responsive mobile-web learner app; PWA-ready)
- `backend/**`

`mobile/rn/**` and `mobile/unity/**` are **PAUSED**:
- Do NOT start new feature work on React Native or Unity native surfaces.
- Keep existing code compiling where practical, but do not invest in parity, polish, or device E2E.
- They remain reference implementations for API contracts and behavior.

The native mobile application may still be used for:
- behavior/reference inspection
- legacy API contract discovery
- regression/compatibility investigation when explicitly assigned

---

### RELEASE PRIORITY

When multiple valid tasks are available, prioritize work that moves the mobile-web application in `frontend/` closer to end-to-end usability.

Preferred priority:
1. Web learner shell, responsive layout & navigation (mobile-browser-first)
2. Backend/API connectivity
3. Courses / Learning Path / Lessons
4. Interactive Flashcards
5. Gamification / Progress
6. Core Educational Games
7. Pronunciation product integration
8. PWA progressive enhancement (installability, offline shell) when core flows are stable
9. Pets / stickers / session-time / reporting
10. Cross-browser + mobile-device browser E2E
11. MindAR/WebAR integration if explicitly assigned
12. Native RN/Unity work only if explicitly un-paused by the user

Prefer a working vertical slice: `Auth → Course → Lesson → Flashcard → Reward/Progress`

---

### WEB RELEASE GATE

A feature is not considered fully verified only because unit tests pass.

Use these verification levels:
- **CODE_VERIFIED**: compile/typecheck/tests pass
- **RUNTIME_VERIFIED**: feature exercised in a running dev server / browser environment
- **DEVICE_BROWSER_VERIFIED**: feature exercised in a real mobile browser (Chrome Android / Safari iOS) or responsive-mode emulation

For final graduation acceptance: **mobile-browser RUNTIME_VERIFIED is the release gate.**

Desktop-browser-only validation does NOT replace mobile-browser verification for learner-facing flows.

PWA-specific gates (when PWA work is active):
- installable (manifest + service worker registered)
- offline shell loads without network
- no stale-cache regressions after deploy

---

### BACKEND CONTRACT STABILITY

The web app (`frontend/`) and the paused native clients (RN/Unity) communicate through FastAPI contracts.

**Do NOT** couple any client directly to the persistence implementation.

Required boundary:
```
frontend (web) / RN / Unity
        ↓
      FastAPI
        ↓
Service / Repository
        ↓
   Persistence
```

Database migrations must preserve externally observable API behavior whenever possible.

**Do NOT** rewrite clients merely because backend persistence changes.

---

### STRUCTURED DATABASE DIRECTION

The target structured/business persistence is PostgreSQL.

MongoDB/Beanie is considered transitional/legacy persistence during migration.

The migration goal is: **replace persistence, NOT redesign product behavior.**

Preferred target:
```
FastAPI
    ↓
service/domain layer
    ↓
PostgreSQL repository
    ↓
PostgreSQL
```

Keep:
- Supabase Storage for binary/media assets where currently appropriate
- Qdrant for vector/RAG/search responsibilities
- FastAPI as the backend gateway

**Do NOT** introduce direct client (web/RN/Unity) database access.

**Do NOT** add Redis, Kafka, RabbitMQ, CQRS, microservice splits, or other infrastructure unless a demonstrated requirement exists.

This is a graduation project: prefer correctness, simplicity, debuggability, and delivery speed.

---

### DATABASE MIGRATION RULE

For each MongoDB → PostgreSQL domain migration:

1. Inspect the ACTUAL existing persistence model and callers.
2. Capture current API/service behavior and relevant tests.
3. Design the minimum relational mapping: primary keys, foreign keys, unique constraints, nullable fields, JSONB only where flexibility is genuinely required.
4. Replace persistence behind the service/repository boundary.
5. Preserve existing API contracts unless a contract change is explicitly approved.
6. Run the SAME behavioral/regression tests after migration.
7. Only mark the domain migrated when externally observable behavior remains coherent.
8. Migrate according to WEB dependency priority, not simply collection order.
9. Do not migrate unused legacy data merely for theoretical parity if it is not required by the graduation mobile-web product.
10. Preserve IDs/references where practical to avoid unnecessary frontend, media, AR, or vector-store rewrites.

---

### GAMIFICATION CONTRACT

Gamification reward processing now follows semantic-event/idempotent semantics.

Core invariant:
```
semantic learner event
        ↓
  stable event_id
        ↓
authenticated FastAPI request
        ↓
backend-authoritative reward processing
        ↓
authoritative progression response
```

Rules:
- backend decides authoritative XP
- no client (web/RN/Unity) decides authoritative XP amounts
- clients do not persist authoritative progression
- retry of the same semantic event must reuse the same `event_id`
- HTTP retry is NOT a new reward event
- `event_id` is not the same concept as lesson_id, qr_id, ar_tag, combo_id, or AR Foundation TrackableId
- gamification event/history remains separate from aggregate current progression
- reward eligibility policy and idempotency are distinct concerns

During PostgreSQL migration, preserve these semantics and reuse the existing idempotency/concurrency/failure-recovery tests as migration acceptance gates.

---

### UNITY / AR OWNERSHIP (PAUSED)

Native AR is **PAUSED** under the web-first direction. The architecture below is preserved as reference for when/if native work resumes:

```
React Native → Unity host → AR Foundation → image tracking → runtime reference image library → card registry → GLTFast → multi-card/combo → semantic Unity event → RN → authenticated backend mutation
```

Rules (reference, not active work):
- native tracking is IMAGE TRACKING
- QR identity is business/backend identity, not the native tracking target
- `.mind` is legacy MindAR-only data
- never infer physical tracking width from GLB/model dimensions
- never fallback `modelUrl → referenceImageUrl`
- TrackableId is runtime/ephemeral identity
- Unity emits semantic events; backend remains authoritative for rewards

**Do NOT** start new native AR feature work unless the user explicitly un-pauses it.

---

### FRONTEND-WEB POLICY (PRIMARY SURFACE)

`frontend/**` is the **PRIMARY implementation surface** for all learner-facing product work.

Expected work:
- new learner product features land here first
- responsive mobile-browser-first UX
- PWA progressive enhancement when core flows are stable
- MindAR/WebAR integration if explicitly assigned

**Do NOT:**
- start new feature work in `mobile/rn/**` or `mobile/unity/**`
- invest in RN/Unity parity, polish, or device E2E while web-first work remains
- break existing API contracts consumed by the paused native clients

---

### DOCUMENTATION GOVERNANCE

**Do NOT** put rapidly changing progress state in this file.

Current status, test counts, blockers, and completed task IDs belong in:
- `docs/mobile_migration/progress/**`
- `docs/unity_ar/progress/**`
- owning blocker/task artifacts

`AGENTS.md` contains durable execution policy.

Approved specifications/plans remain architectural baselines, but when an older plan conflicts with this explicit WEB-FIRST release policy, do not silently follow the older mobile-first priority. Record the conflict and apply the current web-first release direction.

---

### IMPLEMENTATION STYLE

Prefer:
```
inspect actual code → implement → compile → focused tests → runtime/device verification → update progress
```

Avoid sessions that repeatedly stop at:
- "I will inspect..."
- "I recommend planning..."
- "we should redesign..."

when repository evidence is sufficient to implement safely.

- Small implementation mismatch → reconcile minimally in the same session.
- True cross-system architectural conflict → capture evidence and stop only the affected work.

---

### CURRENT PRODUCT DEFINITION OF DONE

The graduation release is primarily judged by a coherent MOBILE-WEB learner experience.

Target:
- authentication works
- courses load dynamically
- learning path works
- lessons work
- interactive flashcards work
- pronunciation/audio interaction works
- meaningful learner actions can award idempotent XP
- progression is visible
- core games are usable
- PostgreSQL is the authoritative structured persistence after migration
- Supabase Storage/Qdrant continue in their intended roles
- demo data is reproducible
- mobile-browser E2E (responsive layout, touch interactions) succeeds
- PWA installability + offline shell (when PWA work is active)

Native RN/Unity AR completeness is optional unless explicitly un-paused by the user.

---

## Blender work (Codex + BlenderMCP)

Lightweight routing rules for Blender / 3D-model tasks. **Skill creation is deferred** — this section only wires the tool path. Add a `blender-3d-production` skill under `.agents/skills/` when you have ≥ 1 real Blender task to harden.

### When this fires

A task touches **any** of: `.blend`, `FBX`/`GLB`/`OBJ`/`USD` files, Blender Python (`bpy`), materials / rigging / animation, 3D export, or `models/source/`, `models/working/`, `models/exports/`.

### Tool routing (Codex + BlenderMCP)

1. **Inspect first.** Use `BlenderMCP` scene/object read tools (`get_scene_info`, `get_object_info`, `execute_blender_code` with a *read-only* snippet) before any mutation. No file edit / no Python execution without a current scene snapshot.
2. **Mutate via BlenderMCP.** The primary execution path is the BlenderMCP stdio server declared in `.codex/config.toml` (`[mcp_servers.blender]`). It bridges to a Blender addon listening on `localhost:9876`. Run Blender + enable the addon before expecting tool calls to succeed.
3. **Complex / deterministic Python → BlenderMCP `execute_blender_code`.** Not a blanket `run_script` against the whole scene. Pass a narrow, idempotent operation; expect a verification pass after.
4. **Hard prohibitions:**
   - Do not retopologize, re-rig, replace materials, or rewrite UVs on AI-generated models unless the user explicitly asks for that specific change.
   - Do not overwrite files in `models/source/`. Treat them as read-only inputs.
   - Do not run large mutation scripts without first listing object names and current state.
5. **Verify after each meaningful mutation.** Re-inspect the scene, confirm the intended change landed, and only then move on.
6. **Export pipeline** (when the task is "prepare for Unity"):
   - Working copy → `models/working/`
   - Final export (FBX or GLB) → `models/exports/`
   - Mirror the asset contract the Unity side expects (see `mobile/unity/README.md` and the GLTFast block in `docs/unity_ar/spec/architecture-specification.md`).

### BlenderMCP server status

| Field | Value |
|---|---|
| Config | `.codex/config.toml` → `[mcp_servers.blender]` |
| Command | `C:\Users\LENOVO\.local\bin\uvx.exe` (verified `uvx 0.11.25`) |
| Args | `["blender-mcp"]` |
| Approval mode | `default_tools_approval_mode = "writes"` (reads auto-allow, writes need explicit OK — BlenderMCP can execute Python inside Blender) |
| Timeouts | `startup_timeout_sec = 20`, `tool_timeout_sec = 120` |
| Required runtime | Blender 3+ with the `ahujasid/blender-mcp` addon enabled and its socket bound to `localhost:9876` |

`uvx` path is hardcoded; if it moves, update this table and `.codex/config.toml` together. `codex` CLI is not currently on PATH — the MCP entry is written directly into the TOML rather than via `codex mcp add`.

### Anti-patterns

- "The model looks weird, let me just retopo it" — only the user can authorise topology changes.
- "I'll just run the whole cleanup script" — narrow every script to the specific objects and properties the task names.
- Skipping inspection and discovering the wrong object was edited.
- Treating `models/source/` as mutable.
- Adding a Blender skill to `.agents/skills/` preemptively — create the skill when a real task forces it, not now.

