# SDLC Agent Team

A comprehensive team of specialized AI agents covering the full Software Development Life Cycle (SDLC).

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
