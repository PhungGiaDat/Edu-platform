---
name: sdlc-workflow
description: Complete SDLC workflow management, phase coordination, and quality gates
---
# SDLC Workflow

Structured framework for managing the full Software Development Life Cycle with coordinated agent teams.

## Overview

This skill provides the orchestrator with workflow templates, quality gates, estimation guidelines, and coordination patterns for managing all 7 SDLC phases.

## SDLC Phases

### Phase 1: Planning
**Agents:** @planner (parallel) + @researcher (parallel)
**Outputs:** `./plan/YYYYmmdd_<title>.md`, `./research/YYYYmmdd_<title>.md`
**Activities:**
- Requirements gathering and analysis
- Architecture design
- Technology evaluation and comparison
- Risk assessment and mitigation planning

### Phase 2: Design UI/UX
**Skill:** ui-ux-pro-max
**Output:** `./docs/ui-design.md`
**Activities:**
- User interface design
- User experience optimization
- Wireframes and mockups
- Design system specifications

### Phase 3: Development
**Agents:** @git-manager + developers
**Activities:**
- Feature branch creation
- Code implementation following plan and design
- Code quality standards enforcement
- Version control management

### Phase 4: Code Review
**Agents:** @reviewer + @fix
**Output:** `./report/REVIEW_YYYYmmdd_HHMMSS.md`
**Activities:**
- Code quality review
- Security audit (OWASP Top 10)
- Performance analysis
- Issue identification and fix implementation

### Phase 5: Testing
**Agents:** @tester + @fix
**Output:** `./report/TEST_REPORT_YYYYmmdd_HHMMSS.md`
**Activities:**
- Test strategy development
- Unit, integration, and E2E test creation
- Test execution and bug discovery
- Bug fix verification loop

### Phase 6: Deployment
**Agent:** @devops
**Output:** `./report/DEPLOY_YYYYmmdd_HHMMSS.md`
**Activities:**
- Application containerization
- Environment deployment (local, k8s, server)
- Health check verification
- Rollback plan preparation

### Phase 7: Documentation
**Agent:** @documenter
**Output:** `./docs/`
**Activities:**
- README creation/updates
- API documentation
- User guides and tutorials
- Architecture documentation

## Quality Gates

Each phase transition requires passing a quality gate:

| Transition | Requirements |
|------------|-------------|
| Planning -> Design | Requirements documented, architecture designed, tech stack decided |
| Design -> Development | UI/UX specs complete, wireframes approved |
| Development -> Review | Code compiles, feature branch created, best practices followed |
| Review -> Testing | Code reviewed, security audit done, all issues fixed |
| Testing -> Deployment | All tests passing, coverage meets target, no critical bugs |
| Deployment -> Documentation | App deployed, health checks passing, deployment verified |
| Documentation -> Complete | README updated, API docs complete, user guide created |

## Workflow Templates

### Feature Development
```
1. @planner + @researcher (parallel in YOLO mode)
2. Load ui-ux-pro-max skill for design
3. @git-manager creates branch, implement features
4. @reviewer reviews -> @fix fixes issues
5. @tester tests -> @fix fixes bugs (loop until passing)
6. @devops deploys
7. @documenter documents
```

### Bug Fix (Abbreviated)
```
1. @debug investigates -> Debug Report
2. @fix implements fix -> Fix Report
3. @tester regression tests (loop with @fix until passing)
4. @reviewer audits fix
5. @git-manager hotfix branch
6. @devops deploys
7. @documenter updates changelog
```

### Release Preparation
```
1. @tester runs full regression suite
2. @reviewer performs security audit
3. @documenter updates all documentation
4. @git-manager creates release branch and tags
5. @devops prepares and executes deployment
```

## Estimation Guidelines

### Complexity Levels
| Level | Description | Typical Duration |
|-------|-------------|-----------------|
| **Small** | Single file change, isolated fix | 1-2 phases |
| **Medium** | Multi-file feature, moderate scope | 3-5 phases |
| **Large** | Cross-cutting feature, new subsystem | All 7 phases |
| **Epic** | Major feature set, architectural changes | Multiple iterations of all 7 phases |

### Phase Time Distribution (typical)
| Phase | % of Total |
|-------|-----------|
| Planning | 15-20% |
| Design | 10-15% |
| Development | 25-35% |
| Code Review | 5-10% |
| Testing | 15-20% |
| Deployment | 5-10% |
| Documentation | 5-10% |

## Risk Management

### Risk Categories
- **Technical** - Technology limitations, integration complexity
- **Resource** - Agent availability, model limitations
- **Schedule** - Phase dependencies, blocking issues
- **Quality** - Test coverage gaps, security vulnerabilities

### Mitigation Strategies
| Risk | Strategy |
|------|----------|
| Phase failure | Retry up to configured retry_attempts |
| Blocking dependency | Escalate to user, try alternative approach |
| Quality gate failure | Loop back to previous phase for fixes |
| Agent unresponsive | Fallback to orchestrator direct action |

## Communication Patterns

### Delegation Format
```markdown
**MODE: [YOLO|INTERACTIVE]**

@[agent] [Task description]:

**Context:** [relevant details]
**Requirements:** [specific needs]
**Output:** [expected deliverable and location]
```

### Progress Reporting
After each phase completion, report:
- Phase name and status
- Deliverables created (with file paths)
- Issues encountered and resolution
- Next phase preview

## Metrics & KPIs

### Quality Metrics
- Test coverage percentage (target: configurable, default 80%)
- Code review issues found vs fixed
- Security vulnerabilities identified
- Documentation completeness

### Process Metrics
- Phases completed vs skipped
- Retry count per phase
- Time spent per phase
- Bug escape rate (bugs found after deployment)

## Mode Behaviors

### YOLO Mode
- Execute all phases automatically without stopping
- Phase 1 uses parallel execution (@planner + @researcher)
- Only pause for critical blocking issues
- Report progress after each phase

### Interactive Mode
- Pause at each phase gate for user approval
- Present plans and options before proceeding
- Ask clarifying questions at start
- Get explicit confirmation before major actions
