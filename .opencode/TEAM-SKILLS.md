## Overview

This project includes **11 specialized agents** and **38 comprehensive skills** that work together to cover the complete SDLC — from planning and design through development, testing, deployment, and documentation.

---

## Agent → Skill Mapping

| Agent | Primary Skill(s) | Purpose | Usage |
|-------|-------------------|---------|-------|
| **orchestrator** | `sdlc-workflow`, `codebase-indexer`, `scout` | Team coordination & SDLC management | @orchestrator |
| **planner** | `requirements-analysis` | Requirements & architecture | @planner |
| **researcher** | `technology-evaluation` | Tech research & comparison | @researcher |
| **debug** | `debugging` | Issue investigation & root cause analysis | @debug |
| **fix** | `bug-fixing` | Implementing safe bug fixes | @fix |
| **reviewer** | `code-review` | Code quality & security | @reviewer |
| **tester** | `testing-strategies` | QA & test creation | @tester |
| **documenter** | `technical-writing` | Documentation | @documenter |
| **git-manager** | `git-workflows` | Version control | @git-manager |
| **devops** | `devops-automation`, `docker-containerization` | CI/CD & deployment | @devops |
| **database-admin** | `database-design` | Database optimization | @database-admin |
| **skill-creator** | `skill-creator` | Build custom skills | @skill-creator |
| **all agents** | `mermaid-diagrams`, `diagram-generation` | Create diagrams & visualizations | Any agent |
| **ar-specialist** | `mindar-integration`, `event-driven-ar`, `ar-state-machine`, `3d-web-experience`, `threejs-skills` | WebAR with MindAR, multi-target tracking, and React event/state integration | @ar-specialist |

---

## Skills Overview (37 Skills)

Skills are organized by category for easier reference.

### Category 1: SDLC & Process (5 skills)

#### 1. SDLC Workflow
**Location:** `.claude/skills/sdlc-workflow/`
**Used by:** @orchestrator
**Topics:**
- Complete SDLC phases (7 phases)
- Workflow templates
- Estimation guidelines
- Risk management
- Communication plans
- Metrics & KPIs
- Quality gates

#### 2. Requirements Analysis
**Location:** `.opencode/skills/requirements-analysis/`
**Used by:** @planner
**Topics:**
- Gathering techniques
- User stories & use cases
- Requirements workshops
- Prioritization frameworks
- Documentation templates

#### 3. Technology Evaluation
**Location:** `.opencode/skills/technology-evaluation/`
**Used by:** @researcher
**Topics:**
- Evaluation frameworks
- Comparison matrices
- Cost analysis
- Proof of concept
- Decision criteria

#### 4. Codebase Indexer
**Location:** `.opencode/skills/codebase-indexer/`
**Used by:** @orchestrator (Phase 1: Planning) · all agents (via qmd search)
**Topics:**
- Language auto-detection (agent-driven)
- ast-grep extraction patterns (TS, JS, Python, Go, Rust, Java, Ruby, PHP, C#)
- mcpls semantic enrichment (hover docs, call hierarchy, diagnostics)
- qmd-index document format with structured frontmatter
- qmd collection + embed commands
- Incremental update strategy (`/index-codebase --update`)

**Command:** `/index-codebase` or `/index-codebase --update`

#### 5. Scout — Codebase Exploration & Discovery
**Location:** `.opencode/skills/scout/` · `.claude/skills/scout/`
**Used by:** All agents — especially @planner, @reviewer, @tester, @debug, @fix
**Topics:**
- Consumes `./qmd-index/` built by `codebase-indexer`
- Discovery mode: locate files for a task using qmd semantic search
- Q&A mode: answer "what does X do / how does X work" with code evidence
- Multi-tool decision tree: qmd → ast-grep → mcpls → glob/grep
- Parallel multi-directory search patterns
- Incremental deep-dive protocol (broad → narrow → pinpoint)
- Integration patterns for each SDLC agent

**Trigger:** Read skill when user asks "find", "locate", "where is", "what does X do", "explain X", "who calls X", or any codebase search query.

#### 6. Skill Creator
**Location:** `.opencode/skills/skill-creator/`
**Used by:** All agents (meta-skill)
**Topics:**
- Skill templates
- CLI scaffolding
- Validation tools
- Best practices
- Documentation generation

---

### Category 2: Design & UX (4 skills)

#### 5. UI/UX Pro Max
**Location:** `.opencode/skills/ui-ux-pro-max/`
**Used by:** @orchestrator (Phase 2: Design UI/UX)
**Topics:**
- 67 design styles
- 96 color palettes
- 57 font pairings
- 99 UX guidelines
- 25 chart types across 13 tech stacks
- Searchable database with priority-based recommendations

#### 6. Accessibility Compliance (A11y)
**Location:** `.opencode/skills/a11y-compliance/`
**Used by:** All agents (compliance)
**Topics:**
- WCAG principles (POUR)
- WCAG levels (A, AA, AAA)
- Semantic HTML & ARIA
- Keyboard navigation
- Screen reader compatibility
- Color contrast & focus management
- Inclusive design patterns

#### 7. UI Component Generator
**Location:** `.opencode/skills/ui-component-generator/`
**Used by:** All agents (component generation)
**Topics:**
- Primitive, composite, layout components
- React, Vue, Svelte components
- Type-safe props & variants
- Accessibility integration
- Animation patterns
- Compound component patterns

#### 8. Visual Asset Creation
**Location:** `.opencode/skills/visual-asset-creation/`
**Used by:** All agents (visual assets)
**Topics:**
- Favicon generation (SVG, ICO, multi-size)
- Logo creation with SVG
- App icons for mobile/PWA
- Social media assets (OG images)
- Icon sets
- Implementation code & HTML integration

---

### Category 3: Frontend Development (7 skills)

#### 9. Frontend Development
**Location:** `.opencode/skills/frontend-development/`
**Used by:** All agents (frontend)
**Topics:**
- Component architecture (presentational, container, HOC, layout)
- State management patterns (Redux, Zustand, Jotai)
- Custom hooks
- Component structure & organization
- Error boundaries
- Performance patterns

#### 10. CSS & Styling
**Location:** `.opencode/skills/css-styling/`
**Used by:** All agents (styling)
**Topics:**
- Tailwind CSS configuration
- CSS-in-JS patterns (Styled Components, Emotion)
- Responsive design
- Design system integration
- CSS custom properties
- Dark mode & theming

#### 11. Server-Side Rendering
**Location:** `.opencode/skills/server-side-rendering/`
**Used by:** All agents (rendering strategies)
**Topics:**
- Rendering strategies (SSR, SSG, ISR, CSR)
- Next.js App Router patterns
- Nuxt.js patterns
- Remix patterns
- Hydration & streaming
- Caching strategies

#### 12. Form Builder
**Location:** `.opencode/skills/form-builder/`
**Used by:** All agents (forms)
**Topics:**
- Form architecture & state management
- Validation schemas (Zod, Yup, Joi)
- React Hook Form patterns
- Multi-step wizards
- Error handling & submission logic
- Custom field components

#### 13. SEO Optimizer
**Location:** `.opencode/skills/seo-optimizer/`
**Used by:** All agents (SEO)
**Topics:**
- Meta tags & Open Graph
- Structured data (Schema.org, JSON-LD)
- Sitemap & robots.txt
- Rich snippets
- URL optimization
- Content & keyword strategy

#### 14. Web Performance
**Location:** `.opencode/skills/web-performance/`
**Used by:** All agents (performance)
**Topics:**
- Core Web Vitals (LCP, FID, CLS, INP, TTFB)
- Performance measurement
- Lazy loading patterns
- Bundle optimization
- Caching strategies
- Resource hints

#### 15. Performance Optimizer
**Location:** `.opencode/skills/performance-optimizer/`
**Used by:** All agents (optimization)
**Topics:**
- Performance budgets
- Code splitting & tree shaking
- Image optimization
- Database query optimization
- Caching layers (CDN, Redis, in-memory)
- Load testing & profiling

---

### Category 4: Backend & API (5 skills)

#### 16. API Design
**Location:** `.opencode/skills/api-design/`
**Used by:** @planner, @researcher
**Topics:**
- RESTful API design principles
- GraphQL schema design
- URL structure & resource naming
- Versioning strategies
- Authentication & authorization patterns
- OpenAPI/Swagger documentation

#### 17. API Development
**Location:** `.opencode/skills/api-development/`
**Used by:** All agents (API implementation)
**Topics:**
- REST resource naming & HTTP methods
- Middleware patterns (auth, logging, CORS)
- Request validation (Zod, Joi)
- Rate limiting strategies
- Error handling patterns
- GraphQL resolvers & subscriptions

#### 18. Authentication & Authorization
**Location:** `.opencode/skills/authentication/`
**Used by:** All agents (security)
**Topics:**
- Session-based, JWT, OAuth 2.0, Magic Link, MFA
- Role-Based Access Control (RBAC)
- Token management & refresh
- Password security (bcrypt, argon2)
- CSRF & XSS protection
- Provider integrations (Google, GitHub, etc.)

#### 19. Real-Time Features
**Location:** `.opencode/skills/real-time-features/`
**Used by:** All agents (real-time)
**Topics:**
- WebSocket implementation
- Server-Sent Events (SSE)
- Long polling patterns
- Push API & notifications
- Room/channel management
- Presence & typing indicators

#### 20. Fullstack Architecture
**Location:** `.opencode/skills/fullstack-architecture/`
**Used by:** @planner, @researcher
**Topics:**
- Architecture patterns (Monolith, Modular, Microservices, Serverless)
- Monorepo setup (Turborepo, Nx)
- Frontend-backend integration
- Shared types & packages
- API gateway patterns
- Environment management

---

### Category 5: Data & Database (1 skill)

#### 21. Database Design
**Location:** `.opencode/skills/database-design/`
**Used by:** @database-admin, @planner
**Topics:**
- Schema design & normalization (1NF, 2NF, 3NF)
- Entity relationships (1:1, 1:N, M:N)
- Migration strategies
- Query optimization
- Indexing patterns
- ORM patterns (Prisma, Drizzle, TypeORM)

---

### Category 6: Quality & Testing (4 skills)

#### 22. Code Review
**Location:** `.opencode/skills/code-review/`
**Used by:** @reviewer
**Topics:**
- Review checklists
- Security review
- Performance review
- Feedback guidelines
- Severity levels
- Code smells & anti-patterns

#### 23. Testing Strategies
**Location:** `.opencode/skills/testing-strategies/`
**Used by:** @tester
**Topics:**
- Testing pyramid (unit, integration, E2E)
- Test types & patterns
- Coverage strategies
- Test organization
- Testing tools (Jest, Vitest, Playwright, Cypress)
- Mocking & stubbing

#### 24. Debugging
**Location:** `.opencode/skills/debugging/`
**Used by:** @debug
**Topics:**
- Debug methodology
- Root cause analysis
- Debug techniques
- Error analysis & stack traces
- Environment debugging
- Debug tools reference

#### 25. Bug Fixing
**Location:** `.opencode/skills/bug-fixing/`
**Used by:** @fix
**Topics:**
- Fix patterns by bug type
- Safe code changes
- Regression testing
- Error handling patterns
- Risk mitigation
- Fix verification

---

### Category 7: DevOps & Infrastructure (3 skills)

#### 26. DevOps Automation
**Location:** `.opencode/skills/devops-automation/`
**Used by:** @devops
**Topics:**
- CI/CD pipelines (GitHub Actions, GitLab CI)
- Kubernetes deployment
- Deployment strategies (blue/green, canary, rolling)
- Infrastructure as Code (Terraform, Pulumi)
- Monitoring & alerting
- Secrets management

#### 27. Docker Containerization
**Location:** `.opencode/skills/docker-containerization/`
**Used by:** @devops
**Topics:**
- Dockerfile patterns (Node.js, Python, Go)
- Multi-stage builds
- Docker Compose orchestration
- Container optimization
- Health checks & logging
- Registry management

#### 28. Git Workflows
**Location:** `.opencode/skills/git-workflows/`
**Used by:** @git-manager
**Topics:**
- Branching strategies (Git Flow, Trunk-Based, GitHub Flow)
- Commit guidelines (Conventional Commits)
- Common workflows
- Command reference
- Conflict resolution
- Hooks & automation

---

### Category 8: Documentation & Visualization (3 skills)

#### 29. Technical Writing
**Location:** `.opencode/skills/technical-writing/`
**Used by:** @documenter
**Topics:**
- Documentation types (README, API, Tutorial, ADR)
- Writing principles
- Templates & style guide
- Code documentation
- Diagram-driven docs

#### 30. Mermaid Diagrams
**Location:** `.opencode/skills/mermaid-diagrams/`
**Used by:** All agents (documentation support)
**Topics:**
- Flowcharts & process diagrams
- Sequence diagrams for API flows
- Entity Relationship Diagrams (ERDs)
- Gantt charts for project planning
- Timelines & state diagrams
- Class diagrams & mindmaps
- Theming & styling options

#### 31. Diagram Generation
**Location:** `.opencode/skills/diagram-generation/`
**Used by:** All agents (visual documentation)
**Topics:**
- Mermaid diagrams
- D2 syntax for architecture diagrams
- PlantUML for UML diagrams
- ASCII diagrams for quick docs
- Eraser.io compatible output
- Flowcharts, sequence, architecture diagrams

---

### Category 9: File & Document Generation (5 skills)

#### 32. DOCX (Word Documents)
**Location:** `.opencode/skills/docx/`
**Used by:** All agents (document creation)
**Topics:**
- Create, read, edit Word documents
- Professional formatting (headings, TOC, page numbers)
- Templates & letterheads
- Find-and-replace, tracked changes
- Image insertion
- Pandoc conversion

#### 33. PDF
**Location:** `.opencode/skills/pdf/`
**Used by:** All agents (PDF processing)
**Topics:**
- Read & extract text/tables
- Merge & split PDFs
- Rotate pages & add watermarks
- Fill forms & encrypt/decrypt
- Extract images
- OCR on scanned documents

#### 34. PPTX (Presentations)
**Location:** `.opencode/skills/pptx/`
**Used by:** All agents (presentation handling)
**Topics:**
- **FPT Dark Template** (51 slides, pre-unpacked) — executive pitches, client proposals
- **FPT Bright Template** (47 slides, pre-unpacked) — internal reports, workshops
- FPT workflow: copy pre-unpacked → edit XML → pack → cleanup (no unpack step)
- pptxgenjs workflow — creative from-scratch presentations with full design freedom
- python-pptx pipeline — structured content via parse → map → create (from pptx-generator)
- Read, parse, extract text from any presentation
- Edit existing PPTX files
- Auto-cleanup of working dirs and temp files after generation

#### 35. XLSX (Spreadsheets)
**Location:** `.opencode/skills/xlsx/`
**Used by:** All agents (spreadsheet processing)
**Topics:**
- Create, read, edit spreadsheets
- Excel formulas (not hardcoded values)
- Professional formatting
- Charting & data visualization
- CSV/TSV conversion
- Financial model color coding

---

### Category 10: Specialized (1 skill)

#### 36. Three.js
**Location:** `.opencode/skills/three-js/`
**Used by:** All agents (3D visualization)
**Topics:**
- Scene setup (camera, renderer, controls)
- Geometries & materials (PBR, custom)
- Lighting systems & shadows
- Textures & environment maps
- Animations & skeletal systems
- Custom shaders & post-processing
- Physics integration (Cannon.js, Rapier)
- Performance optimization (LOD, instancing)
- WebGPU support
- Common patterns (product viewer, particles)

---

## SDLC Phase Coverage (7 Phases)

### Phase 1: Planning
**Agents:** @orchestrator + @planner + @researcher
**Skills:** sdlc-workflow, requirements-analysis, technology-evaluation
**Activities:**
- Requirements gathering
- Technology evaluation
- Architecture design
- Project planning

### Phase 2: Design UI/UX
**Agents:** @orchestrator
**Skills:** ui-ux-pro-max, a11y-compliance, visual-asset-creation
**Activities:**
- User interface design
- User experience optimization
- Wireframes & mockups
- Accessibility compliance
- Visual asset creation

### Phase 3: Development
**Agents:** @git-manager + developers
**Skills:** git-workflows, frontend-development, css-styling, api-development, api-design, authentication, fullstack-architecture, database-design, form-builder, server-side-rendering, real-time-features, ui-component-generator
**Activities:**
- Feature implementation
- API development
- Database schema design
- Frontend & backend coding

### Phase 4: Code Review
**Agents:** @reviewer
**Skills:** code-review
**Activities:**
- Code quality review
- Security audit
- Performance review

### Phase 5: Testing
**Agents:** @tester
**Skills:** testing-strategies
**Activities:**
- Test creation
- Test execution
- Coverage analysis

### Phase 6: Deployment
**Agents:** @devops + @git-manager
**Skills:** devops-automation, docker-containerization, git-workflows
**Activities:**
- CI/CD pipeline
- Container deployment
- Release management

### Phase 7: Documentation
**Agents:** @documenter
**Skills:** technical-writing, mermaid-diagrams, diagram-generation, seo-optimizer
**Activities:**
- API documentation
- User guides
- Technical docs
- Diagrams & visual docs

---

## How to Use

### Method 1: Let Agents Use Skills Automatically

Agents automatically reference their corresponding skills when working:

```
You: "Review the authentication code"

@reviewer accesses code-review skill and applies:
- Security checklist
- Performance review
- Code quality guidelines
```

### Method 2: Direct Skill Reference

You can reference skills explicitly:

```
"Use testing-strategies skill to create a comprehensive test plan"
"Follow git-workflows skill for this release process"
"Apply requirements-analysis skill to gather user requirements"
"Use a11y-compliance skill to audit the page for WCAG issues"
```

### Method 3: Combined Agent + Skill

Combine agents with specific skill aspects:

```
"@reviewer use the security section from code-review skill to audit authentication"
"@tester focus on E2E testing from testing-strategies skill"
"@devops implement blue/green deployment from devops-automation skill"
"@planner use fullstack-architecture skill to design the system"
```

### Method 4: File & Document Generation

For document creation tasks, skills are loaded automatically:

```
"Create a Word document for the project report"        → docx skill
"Generate a PDF report of test results"                 → pdf skill
"Create a PowerPoint presentation about our roadmap"    → pptx skill
"Build an Excel spreadsheet with the sales data"        → xlsx skill
```

---

## Typical Workflows

### Feature Development (Full 7-Phase SDLC)

```mermaid
graph LR
    A[User Request] --> B[@orchestrator]
    B --> C[@planner]
    C --> D[@researcher]
    D --> E[Design UI/UX]
    E --> F[Implementation]
    F --> G[@tester]
    G -->|Bug List| H{@fix}
    H -->|Fixes| G
    G -->|All Pass| I[@reviewer]
    I -->|Issue List| H
    H -->|Fixes| I
    I -->|Approved| J[@documenter]
    J --> K[@devops]
    K --> L[Deployed]
```

**Skills Used:**
1. sdlc-workflow (orchestration)
2. requirements-analysis (planning)
3. technology-evaluation (research)
4. ui-ux-pro-max (design)
5. frontend-development + api-development (implementation)
6. testing-strategies (testing)
7. code-review (review)
8. technical-writing + mermaid-diagrams (documentation)
9. devops-automation + docker-containerization (deployment)

### Bug Fix Workflow

```
1. Report bug
2. @debug investigates root cause (debugging)
   → Outputs Debug Report
3. @fix implements the fix (bug-fixing)
   → Outputs Fix Report
4. @tester creates/runs regression tests (testing-strategies)
   → If bugs found: Outputs Bug List → @fix fixes → Repeat
   → If all pass: Continue
5. @reviewer reviews fix (code-review)
   → If issues found: Outputs Issue List → @fix fixes → Repeat
   → If approved: Continue
6. @git-manager creates hotfix (git-workflows)
7. @devops deploys fix (devops-automation)
```

### Review → Fix Workflow

```
@reviewer                    @fix                      @tester
    |                          |                          |
    |-- Review code             |                          |
    |-- Find issues             |                          |
    |-- Output Issue List ----->|                          |
    |                          |-- Parse Issue List        |
    |                          |-- Fix Critical issues     |
    |                          |-- Fix Important issues    |
    |                          |-- Output Fix Report       |
    |                          |                          |
    |                          |-- Hand off -------------->|
    |                          |                          |-- Run tests
    |                          |                          |-- If bugs: Bug List -> @fix
    |                          |                          +-- If pass: Done
```

### Test → Fix Workflow

```
@tester                      @fix                      @reviewer
    |                          |                          |
    |-- Create tests            |                          |
    |-- Run tests               |                          |
    |-- Find bugs               |                          |
    |-- Output Bug List ------->|                          |
    |                          |-- Parse Bug List          |
    |                          |-- Fix Critical bugs       |
    |                          |-- Fix High/Medium bugs    |
    |                          |-- Output Fix Report       |
    |                          |                          |
    |-- Re-run tests <----------|                          |
    |-- If bugs: repeat ------->|                          |
    +-- If pass: hand off ---------------------------------->|
                                                        (optional review)
```

### Release Process

```
1. @orchestrator coordinates (sdlc-workflow)
2. @tester runs regression (testing-strategies)
3. @reviewer performs security audit (code-review)
4. @documenter updates docs (technical-writing)
5. @git-manager creates release (git-workflows)
6. @devops deploys to production (devops-automation)
```

---

## Skill Integration Points

### Shared Concepts

| Concept | Primary Skill | Referenced By |
|---------|--------------|---------------|
| Quality gates | sdlc-workflow | All agents |
| Testing requirements | requirements-analysis | tester |
| Code standards | code-review | git-manager |
| Documentation templates | technical-writing | all |
| CI/CD integration | devops-automation | git-manager |
| Review process | code-review | orchestrator |
| Accessibility | a11y-compliance | frontend-development, ui-component-generator |
| Performance | web-performance | performance-optimizer, frontend-development |
| API patterns | api-design | api-development, authentication |
| Container patterns | docker-containerization | devops-automation |

### Cross-References

Skills reference each other:
- `sdlc-workflow` → All skills (orchestration)
- `requirements-analysis` → `testing-strategies` (test requirements)
- `code-review` → `testing-strategies` (test coverage)
- `debugging` → `bug-fixing` (diagnosis to fix)
- `bug-fixing` → `testing-strategies` (regression tests)
- `git-workflows` → `devops-automation` (CI/CD)
- `technical-writing` → All skills (documentation)
- `mermaid-diagrams` → All skills (visual documentation)
- `diagram-generation` → All skills (visual documentation)
- `three-js` → `web-performance` (3D rendering optimization)
- `api-design` → `api-development` (design to implementation)
- `authentication` → `api-development` (auth middleware)
- `frontend-development` → `css-styling`, `form-builder` (UI patterns)
- `fullstack-architecture` → `database-design`, `server-side-rendering` (architecture)
- `ui-ux-pro-max` → `a11y-compliance`, `ui-component-generator` (design to code)
- `performance-optimizer` → `web-performance` (optimization strategies)
- `seo-optimizer` → `server-side-rendering` (SSR for SEO)
- `docker-containerization` → `devops-automation` (container deployment)

---

## Quick Reference Card

### When to Use Which Skill

| Need | Skill | Agent |
|------|-------|-------|
| Coordinate team | sdlc-workflow | @orchestrator |
| Plan a feature | requirements-analysis | @planner |
| Evaluate technology | technology-evaluation | @researcher |
| Design UI/UX | ui-ux-pro-max | @orchestrator |
| Build accessible UI | a11y-compliance | Any agent |
| Generate components | ui-component-generator | Any agent |
| Create visual assets | visual-asset-creation | Any agent |
| Build frontend | frontend-development | Any agent |
| Style application | css-styling | Any agent |
| Set up SSR | server-side-rendering | Any agent |
| Build forms | form-builder | Any agent |
| Optimize SEO | seo-optimizer | Any agent |
| Optimize performance | web-performance, performance-optimizer | Any agent |
| Design API | api-design | @planner |
| Develop API | api-development | Any agent |
| Implement auth | authentication | Any agent |
| Add real-time features | real-time-features | Any agent |
| Design system architecture | fullstack-architecture | @planner |
| Design database schema | database-design | @database-admin |
| Debug an issue | debugging | @debug |
| Fix a bug | bug-fixing | @fix |
| Review code | code-review | @reviewer |
| Create tests | testing-strategies | @tester |
| Write documentation | technical-writing | @documenter |
| Create diagrams | mermaid-diagrams, diagram-generation | Any agent |
| Manage branches | git-workflows | @git-manager |
| Set up CI/CD | devops-automation | @devops |
| Containerize app | docker-containerization | @devops |
| Build 3D experiences | three-js | Any agent |
| Create a skill | skill-creator | Any agent |
| Create Word document | docx | Any agent |
| Process PDF | pdf | Any agent |
| Create presentation (FPT Dark/Bright or creative) | pptx | Any agent |
| Work with spreadsheets | xlsx | Any agent |

---

## File Structure

```
.opencode/
├── agents/                  # Agent definitions
│   ├── orchestrator.md
│   ├── planner.md
│   ├── researcher.md
│   ├── debug.md
│   ├── fix.md
│   ├── reviewer.md
│   ├── tester.md
│   ├── documenter.md
│   ├── git-manager.md
│   ├── devops.md
│   └── database-admin.md
├── skills/                  # Skill knowledge bases (36 skills)
│   ├── a11y-compliance/
│   ├── api-design/
│   ├── api-development/
│   ├── authentication/
│   ├── bug-fixing/
│   ├── code-review/
│   ├── css-styling/
│   ├── database-design/
│   ├── debugging/
│   ├── devops-automation/
│   ├── diagram-generation/
│   ├── docker-containerization/
│   ├── docx/
│   ├── form-builder/
│   ├── frontend-development/
│   ├── fullstack-architecture/
│   ├── git-workflows/
│   ├── mermaid-diagrams/
│   ├── pdf/
│   ├── performance-optimizer/
│   ├── pptx/                # + pre-unpacked FPT templates (dark/bright)
│   ├── real-time-features/
│   ├── requirements-analysis/
│   ├── seo-optimizer/
│   ├── server-side-rendering/
│   ├── skill-creator/
│   ├── technical-writing/
│   ├── technology-evaluation/
│   ├── testing-strategies/
│   ├── three-js/
│   ├── ui-component-generator/
│   ├── ui-ux-pro-max/
│   ├── visual-asset-creation/
│   ├── web-performance/
│   └── xlsx/
├── commands/                # Quick commands
│   ├── plan.md
│   ├── debug.md
│   ├── fix.md
│   ├── review.md
│   ├── test.md
│   ├── document.md
│   ├── deploy.md
│   └── research.md
└── AGENTS.md               # Team documentation

.claude/
├── skills/                  # Additional skill (1 skill)
│   └── sdlc-workflow/       # SDLC orchestration skill
```

---

## Best Practices

1. **Let orchestrator coordinate** for complex tasks
2. **Use skills explicitly** for specific needs
3. **Combine agents** for comprehensive coverage
4. **Reference skills** when you need specific guidance
5. **Use commands** for quick actions
6. **Keep skills updated** as practices evolve
7. **Check a11y-compliance** for all user-facing features
8. **Apply performance patterns** from web-performance & performance-optimizer
9. **Use authentication skill** for any security-related implementation
10. **Leverage document generation skills** (docx, pdf, pptx, xlsx) for deliverables

---

## Summary

The SDLC Agent Team provides:
- **11 Specialized Agents** — Expert roles for each SDLC phase
- **37 Comprehensive Skills** — Deep knowledge bases organized into 10 categories
- **Complete SDLC Coverage** — 7 phases from planning to deployment
- **Integrated Workflow** — Agents and skills work together seamlessly
- **Dedicated Debug & Fix** — Streamlined bug resolution pipeline
- **Design & UX Intelligence** — ui-ux-pro-max with searchable design database
- **Full-Stack Development** — Frontend, backend, API, database, real-time patterns
- **DevOps & Infrastructure** — CI/CD, Docker, deployment strategies
- **Document Generation** — Word, PDF, PowerPoint (FPT Dark/Bright + creative + structured), Excel creation & processing
- **Visual Documentation** — Mermaid diagrams, D2, diagram generation
- **Performance & SEO** — Core Web Vitals, optimization, search optimization
- **Accessibility** — WCAG compliance and inclusive design patterns
- **Skill Creator** — Build custom skills with templates
- **Three.js** — Build immersive 3D web experiences

Your team is ready for any software development task!

---

## Additional Skills (From .opencodee)

- `brainstorming`
- `multi-agent-brainstorming`
- `cloud-devops`
- `cloud-architect`
- `ai-engineer`
- `ai-product`
- `llm-prompt-optimizer`
- `llm-application-dev-langchain-agent`
- `threejs-skills`
- `threejs-loaders`
- `threejs-shaders`
- `threejs-textures`
- `threejs-animation`
- `threejs-materials`
- `python-pro`
- `react-best-practices`
- `mindar-integration`
- `3d-web-experience`
- `ar-state-machine`
- `event-driven-ar`
