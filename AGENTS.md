# SDLC Agent Team

A comprehensive team of specialized AI agents covering the full Software Development Life Cycle (SDLC).

## Skills Loading Rule

**Primary auto-loaded skills directory: `.cursor/skills/`** (Cursor's skill discovery scans this directory and lists its `SKILL.md` files in context).

**Reference catalogs (do NOT auto-load):**
- `.agents/skills-disabled/` — large reference catalog of ~1,000 skills. Renamed from `.agents/skills/` so Cursor's scanner skips it. Restore by renaming back to `.agents/skills/` if you want them auto-loaded.
- `.cursor/references/awesome-cursor-skills/` — cloned awesome-list of community skills. Browse `README.md` and copy individual skills into `.cursor/skills/` if you want them active.
- `.cursor/skills/superpowers/` — Superpowers workflow skills (TDD, brainstorming, debugging, etc.). Loaded via `.cursor/rules/superpowers-bootstrap.mdc` workflow, not auto-listed.

When in doubt, prefer `.cursor/skills/` skills and explicit Superpowers skills. Treat `.agents/skills/` as opt-in reference material.

## Available Skills

All skills below live in `.cursor/skills/` and are **auto-discovered and loaded by Cursor on every session**. Skills are organized by category; those marked *(model-invoked)* may also be triggered automatically by the agent when a matching task is detected.

### Design & UI

| Skill | Source | Description |
|-------|--------|-------------|
| `taste-skill` | taste-skill | Anti-slop frontend design — 3-dial system (VARIANCE/MOTION/DENSITY), design-system map, GSAP skeletons |
| `taste-skill-v1` | taste-skill | Original v1 of the taste-skill, pinned for projects that depend on exact v1 behavior |
| `gpt-tasteskill` | taste-skill | Stricter GPT/Codex variant — higher layout variance, aggressive anti-slop enforcement |
| `redesign-skill` | taste-skill | Audit-first redesign of existing UIs — fix layout, spacing, hierarchy, and styling |
| `soft-skill` | taste-skill | High-end visual design — softer contrast, whitespace, premium fonts, spring motion |
| `minimalist-skill` | taste-skill | Editorial product UI (Notion/Linear vibes), restrained palette, crisp structure |
| `brutalist-skill` | taste-skill | Industrial design language — Swiss type, sharp contrast, experimental layout |
| `stitch-skill` | taste-skill | Google Stitch-compatible rules, optional DESIGN.md export format |
| `output-skill` | taste-skill | Full-output enforcement — bans placeholder comments, prevents truncation |
| `using-ui-stack` | awesome-cursor | Enforce a design system — 8px grid, color tokens, typography, dark mode, 5-state interactions |
| `anthropic-frontend-design` | anthropic/skills | Distinctive, intentional visual design — no templated defaults, real aesthetic risk-taking |
| `vercel-web-design-guidelines` | vercel-labs/agent-skills | UI code audit for 100+ accessibility, UX, and performance rules |
| `ui-ux-pro-max` | local | Full-stack UI/UX design intelligence with searchable database |

### Image Generation

| Skill | Source | Description |
|-------|--------|-------------|
| `image-to-code-skill` | taste-skill | Image-first pipeline — generate site references, analyze, then implement |
| `imagegen-frontend-web` | taste-skill | Website comps with hero, landing, multi-section with strong typography |
| `imagegen-frontend-mobile` | taste-skill | Mobile screens and flows — iOS/Android/cross-platform mockups |
| `brandkit` | taste-skill | Brand-kit boards — logo directions, palettes, typography, identity applications |
| `generating-images` | awesome-cursor | OpenAI gpt-image-2 image generation — icons, logos, OG images, illustrations |

### CSS & Tailwind Conversion

| Skill | Source | Description |
|-------|--------|-------------|
| `converting-css-to-tailwind` | awesome-cursor | Convert plain CSS to Tailwind — selectors, media queries, pseudo-classes, animations |
| `converting-css-modules-to-tailwind` | awesome-cursor | Migrate CSS Modules to Tailwind — handles `styles.xxx`, composes, conditional classNames |

### React & Frontend Performance

| Skill | Source | Description |
|-------|--------|-------------|
| `vercel-react-best-practices` | vercel-labs/agent-skills | 70 rules across 8 categories — waterfalls, bundle size, SSR, re-renders, JS perf |
| `vercel-react-view-transitions` | vercel-labs/agent-skills | Native View Transitions API — shared elements, Suspense reveals, list identity |
| `vercel-composition-patterns` | vercel-labs/agent-skills | Compound components, context providers, avoid boolean prop proliferation |
| `shadcn-ui` | shadcn/ui | Managing shadcn components — adding, searching, debugging, styling, composing |

### Workflow & Debugging

| Skill | Source | Description |
|-------|--------|-------------|
| `systematic-debugging` | awesome-cursor | Structured debugging — reproduce, isolate, hypothesize, verify; git bisect, binary search |
| `saving-workspace-context` *(model-invoked)* | awesome-cursor | Auto-persist research, decisions, and learnings to workspace files across sessions |
| `best-of-n-solving` | awesome-cursor | Parallel problem-solving via git worktrees — pick the best approach |
| `responsive-testing` | awesome-cursor | Open app at mobile/tablet/desktop viewports, screenshot, report layout breakage |
| `prompt-engineering` | awesome-cursor | LLM prompt writing — system prompts, few-shot, chain-of-thought, structured output |

### Architecture & Planning

| Skill | Source | Description |
|-------|--------|-------------|
| `architecture-decision-records` | awesome-cursor | Document technical decisions as ADRs — context, options, rationale |
| `database-design` | awesome-cursor | Schema design — tables, relationships, indexes, constraints, ORM setup |
| `mattpocock-improve-architecture` | mattpocock/skills | Scan codebase for deepening opportunities, HTML report, then grill through the design |
| `mattpocock-grill-me` | mattpocock/skills | Relentless interview to stress-test a plan or design until all branches resolve |
| `anthropic-mcp-builder` | anthropic/skills | Build MCP servers from scratch — TypeScript/Python SDK, tool definitions, transport setup |

### SDLC & Engineering

| Skill | Source | Description | Maps to |
|-------|--------|-------------|---------|
| `bug-fixing` | local | Safe bug fix patterns — regression test addition, fix verification |
| `code-review` | local | Code quality review — correctness, maintainability, performance, best practices |
| `code-intelligence` | local | LSP tools + ast-grep for IDE-level code intelligence | all agents |
| `debugging` | local | Comprehensive debugging methodologies and techniques | `debug` |
| `testing-strategies` | local | Test creation strategy — unit, integration, E2E, coverage | `tester` |
| `requirements-analysis` | local | Requirements gathering and structured analysis |
| `sdlc-workflow` | local | SDLC workflow management, phase coordination, quality gates | `orchestrator` |
| `scout` | local | Codebase exploration via pre-built index + ast-grep + MCPLS | all agents |

### Superpowers Workflow Skills *(bootstrap-loaded — see Trigger for when each fires)*

| Skill | Trigger | Flow |
|-------|---------|------|
| `brainstorming` *(HARD-GATE)* | Before any creative work | Explore intent, propose 2-3 approaches, write spec, invoke `writing-plans` |
| `writing-plans` | After brainstorming approves a design | Spec to multi-step plan with review checkpoints |
| `test-driven-development` | Before writing implementation | Red-green-refactor cycle |
| `systematic-debugging` | On any bug, test failure, unexpected behavior | Reproduce, isolate, hypothesize, verify |
| `subagent-driven-development` | Executing plans with independent parallel tasks | Orchestrate subagents across sub-tasks |
| `executing-plans` | Written plan spans multiple sessions | Step-by-step with session boundaries |
| `dispatching-parallel-agents` | 2+ independent tasks, no shared state | Launch all simultaneously, pick best result |
| `requesting-code-review` | Before merging or after major features | Pull review, verify requirements |
| `receiving-code-review` | After review feedback lands | Process suggestions, fix, re-verify |
| `verification-before-completion` | Before claiming work is done or opening PR | Pre-commit checklist |
| `finishing-a-development-branch` | Tests pass, work ready to merge | Integration decision, PR, merge |
| `using-git-worktrees` | Before isolated feature work or parallel plans | Isolated branch per attempt |
| `using-superpowers` | Meta — how to find and invoke skills | Skill discovery and chaining |
| `writing-skills` | Creating or editing `.cursor/skills/*.md` files | Draft, pressure-test, commit |

### Infrastructure & DevOps

| Skill | Source | Description |
|-------|--------|-------------|
| `docker-containerization` | local | Multi-stage Dockerfile patterns, Docker Compose, container orchestration |
| `devops-automation` | local | CI/CD pipeline setup, infrastructure automation, deployment strategies |
| `git-workflows` | local | Git workflows, branching strategies, version control best practices |
| `fullstack-architecture` | local | Monorepo setup, frontend-backend integration, system design patterns |
| `api-design` | local | RESTful/GraphQL API design — schemas, endpoints, documentation |
| `ast-grep` | local | AST-based structural code search, lint, and rewrite |
| `postgres-best-practices` | local | PostgreSQL optimization — indexing, query tuning, backup, security |
| `technology-evaluation` | local | Framework and tool evaluation and selection framework |

### Documentation & Communication

| Skill | Source | Description |
|-------|--------|-------------|
| `technical-writing` | local | Technical documentation, guides, and API documentation |
| `last30days` | local | Research across Reddit, X, YouTube, TikTok, Instagram, HN, GitHub for recent trends |

### Superpowers (Workflow Skills)

The `superpowers/` skills are loaded via the superpowers bootstrap workflow and are invoked explicitly by the agent when matching tasks arise. See `.cursor/skills/superpowers/skills/`.

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
