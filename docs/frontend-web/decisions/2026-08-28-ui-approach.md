# ADR: Progressive Vertical-Slice UI Convergence

## Status

Accepted on 2026-08-28.

## Context

The graduation release target is the responsive learner application in
`frontend/`. The repository already contains working learner routes, a
responsive `Layout`/`Sidebar` shell, feature-oriented modules, claymorphic
tokens and primitives, and partial automated test coverage. It also contains
several overlapping CSS/token systems, large orchestration pages, inconsistent
page states, and no mobile-browser E2E covering the complete release journey.

The release must preserve FastAPI contracts, authentication guards, browser
history, and backend-authoritative gamification. The worktree also contains
unrelated in-progress gamification and AR changes, making a broad shell or CSS
rewrite especially risky.

## Options considered

### Option A: Progressive vertical-slice convergence

Improve one complete learner journey at a time. Reuse existing routes, shell,
services, tokens, and feature boundaries. Consolidate UI foundations only when
a release slice needs them.

- Strengths: lowest regression risk, fastest path to runtime-verifiable value,
  small rollback boundaries, and good compatibility with the current codebase.
- Weaknesses: legacy and converged UI coexist temporarily.

### Option B: Learner Shell V2 and design-system-first migration

Build a new shell, router seam, semantic design system, and feature page
platform before migrating learner routes.

- Strengths: clean long-term boundaries and stronger system-wide consistency.
- Weaknesses: high up-front cost, duplicated shell behavior, route/access risk,
  and a larger blast radius near release.

### Option C: Route-by-route visual refresh

Apply shared page templates to routes in journey order while leaving most
architecture untouched.

- Strengths: rapid visual cohesion and easy page-level rollback.
- Weaknesses: can become surface-only polish and preserve fragmented tokens,
  duplicated wrappers, and oversized page responsibilities.

## Decision

Use **Option A with the bounded page-template technique from Option C**.

The execution unit is a vertical slice, not a CSS layer or component category.
Each slice may introduce only the shared tokens and presentational primitives it
actually consumes. Existing routes, guards, services, and page orchestration
remain in place until characterization tests and runtime evidence justify a
separate structural change.

The core sequence is:

```text
Auth -> Course -> Lesson -> Flashcard -> Reward/Progress
```

## Consequences

- The first implementation phase establishes route, shell, responsive, and API
  baselines before changing visuals.
- A small learner-page template family may be added for frame, header, section,
  and loading/error/empty states.
- Existing clay tokens and primitives are the compatibility baseline. New
  semantic aliases may be introduced, but there is no mass token or CSS rewrite.
- Large pages retain their orchestration logic while touched presentational
  sections may be extracted behind explicit props.
- The actual routed `/flashcards` implementation is the initial flashcard
  target; other flashcard experiences require a separate canonical-flow
  decision.
- Games and PWA work start only after the core journey meets its runtime gate.
- Admin, AR/XR, React Native, and Unity are excluded from this UI program.
- Temporary visual inconsistency outside migrated slices is accepted and
  tracked instead of being hidden by an unsafe big-bang redesign.

## Reconsideration triggers

Revisit this decision only if product ownership explicitly approves a new
information architecture, the current shell cannot satisfy verified mobile
requirements, or route/API characterization demonstrates that incremental
migration is more costly than a parallel shell.
