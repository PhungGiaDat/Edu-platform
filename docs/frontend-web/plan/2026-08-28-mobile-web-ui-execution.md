# Mobile-Web Core Learner UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a coherent, accessible, mobile-browser-first learner journey from authentication through authoritative reward and progress confirmation.

**Architecture:** Preserve the existing React Router routes, auth guards, `Layout`/`Sidebar` shell, FastAPI transport, and feature services. Add a small presentational learner-page layer, then adopt it one vertical slice at a time while keeping orchestration and server-state logic in the current feature/page owners. Lesson completion renders only the authoritative completion response and never performs a second client-side XP mutation.

**Tech Stack:** React 18, TypeScript 5.8, React Router 6, Tailwind CSS 4, Vitest 3, Testing Library, Playwright, Vite 7, FastAPI.

## Global Constraints

- `frontend/**` is the primary learner implementation surface; do not modify `mobile/rn/**` or `mobile/unity/**`.
- Preserve current route URLs, `RequireLearnerAccess`, `RequireUserAuth`, browser history, auth storage, and FastAPI request contracts.
- Do not modify admin, MindAR, WebAR, XR, or native AR behavior in this program.
- Keep `apiClient` and current feature services as the only client-to-FastAPI boundary.
- The backend owns authoritative XP and progression; the frontend must not calculate, persist, or award authoritative XP.
- Completion retry must not create a second reward mutation. Render `gamification.xp_earned` from the completion response.
- Keep current clay tokens as compatibility aliases; do not perform a big-bang CSS or palette rewrite.
- Add no UI framework, icon package, state library, or runtime dependency.
- Learner touch targets are at least 48px by 48px with at least 8px between adjacent controls.
- Required responsive review widths are 375px, 768px, 1024px, and 1440px with no horizontal document scroll.
- Normal text contrast is at least 4.5:1; focus remains visible; color is never the only status indicator.
- Respect `prefers-reduced-motion` and keep the final readable state visible when motion is disabled.
- Preserve unrelated dirty-worktree changes, especially current AR, leaderboard, streak, pet, and clay utility edits.
- Stage and commit only the paths owned by the current task. If any listed path has overlapping user changes, reconcile it before editing.
- Every task ends with focused tests and an independently reviewable deliverable.

---

## File and responsibility map

### New shared UI files

- `frontend/src/shared/components/learner-page/LearnerPageFrame.tsx`: page canvas, width, padding, and safe-area contract.
- `frontend/src/shared/components/learner-page/LearnerPageHeader.tsx`: one page heading, subtitle, and contextual action.
- `frontend/src/shared/components/learner-page/LearnerSection.tsx`: semantic labelled content grouping.
- `frontend/src/shared/components/learner-page/LearnerPageState.tsx`: loading, empty, error, and retry live-region behavior.
- `frontend/src/shared/components/learner-page/index.ts`: public exports only.
- `frontend/src/styles/learner-page.css`: semantic aliases and responsive page primitives.

### Existing owners retained

- `frontend/src/App.tsx`: route and guard composition; no route redesign.
- `frontend/src/app/components/Layout.tsx`: shell-level `main`, skip link target, and shell spacing.
- `frontend/src/pages/Login.tsx` and `Register.tsx`: auth form composition.
- `frontend/src/pages/CourseList.tsx` and `CourseDetail.tsx`: catalog/detail orchestration.
- `frontend/src/pages/LessonPlayer.tsx`: lesson/session orchestration and authoritative completion handoff.
- `frontend/src/pages/FlashcardPage.tsx`: the canonical first-pass `/flashcards` route.
- `frontend/src/pages/ProgressDashboard.tsx`: authoritative progress presentation.
- `frontend/src/features/courses/services/CourseService.ts`: typed course endpoint adapter.
- `frontend/src/features/courses/types.ts`: course and completion response contracts.

### Test and evidence files

- `frontend/src/__tests__/learnerRouteContracts.test.ts`: stable route/guard characterization.
- `frontend/src/__tests__/components/LearnerPagePrimitives.test.tsx`: primitive behavior and accessibility.
- `frontend/src/__tests__/app/Layout.test.tsx`: shell main/skip-link contract.
- `frontend/src/__tests__/pages/AuthPages.test.tsx`: login/register states.
- `frontend/src/__tests__/pages/CourseDetail.test.tsx`: course state contract.
- `frontend/src/__tests__/pages/LessonCompletion.test.ts`: authoritative completion mapping.
- `frontend/src/__tests__/pages/FlashcardPage.test.tsx`: flashcard state and control semantics.
- `frontend/src/__tests__/pages/ProgressDashboard.test.tsx`: progress states and shell spacing.
- `frontend/tests/e2e/learner-core-journey.spec.ts`: controlled mobile journey.
- `docs/frontend-web/progress/2026-08-28-mobile-web-core-ui.md`: append-only execution evidence.

---

### Task 1: Freeze route and access contracts

**Files:**

- Create: `frontend/src/__tests__/learnerRouteContracts.test.ts`
- Read: `frontend/src/App.tsx:268-334`
- Read: `frontend/src/contexts/AuthContext.tsx:11-14`

**Interfaces:**

- Consumes: current route JSX in `App.tsx`.
- Produces: a characterization gate that fails if the core route or guard contract changes accidentally.

- [ ] **Step 1: Write the route characterization test**

```typescript
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const srcRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appSource = readFileSync(resolve(srcRoot, 'App.tsx'), 'utf8');
const authSource = readFileSync(resolve(srcRoot, 'contexts/AuthContext.tsx'), 'utf8');

describe('core learner route contracts', () => {
  it.each([
    ['/', 'LandingPage'],
    ['/login', 'Login'],
    ['/register', 'Register'],
  ])('keeps public route %s mapped to %s', (path, page) => {
    expect(appSource).toContain(`<Route path="${path}" element={<${page}`);
  });

  it.each([
    ['/courses', 'RequireLearnerAccess'],
    ['/courses/:id', 'RequireLearnerAccess'],
    ['/courses/:courseId/lessons/:lessonId', 'RequireLearnerAccess'],
    ['/flashcards', 'RequireUserAuth'],
    ['/progress', 'RequireUserAuth'],
  ])('keeps %s behind %s', (path, guard) => {
    const routeLine = appSource
      .split('\n')
      .find((line) => line.includes(`<Route path="${path}"`));
    expect(routeLine).toContain(`<${guard}>`);
  });

  it('keeps the persisted auth storage keys stable', () => {
    expect(authSource).toContain("const TOKEN_KEY = 'authToken'");
    expect(authSource).toContain("const USER_KEY = 'authUser'");
    expect(authSource).toContain("const GUEST_KEY = 'guestMode'");
  });
});
```

- [ ] **Step 2: Run the characterization test**

Run from `frontend/`:

```powershell
npm.cmd test -- --run src/__tests__/learnerRouteContracts.test.ts
```

Expected: all route and storage assertions pass before UI changes.

- [ ] **Step 3: Record the baseline**

Create the progress file for the actual execution date and record:

Create `docs/frontend-web/progress/2026-08-28-mobile-web-core-ui.md` with the heading
`# Mobile-Web Core UI Progress`. Add a `## Baseline` section containing the
literal commands below followed by their copied output:

```powershell
git branch --show-current
git rev-parse --short HEAD
git status --short
npm.cmd run build
npm.cmd test -- --run
```

Also list the four required screenshot widths: 375, 768, 1024, and 1440.
Never infer a result that was not produced by the command.

- [ ] **Step 4: Commit the contract test and baseline artifact**

```powershell
git add frontend/src/__tests__/learnerRouteContracts.test.ts docs/frontend-web/progress/2026-08-28-mobile-web-core-ui.md
git diff --cached --name-only
git commit -m "test(frontend): freeze core learner route contracts"
```

Expected staged paths: only the test and `2026-08-28-mobile-web-core-ui.md`.

---

### Task 2: Add the minimal learner-page design layer

**Files:**

- Create: `frontend/src/shared/components/learner-page/LearnerPageFrame.tsx`
- Create: `frontend/src/shared/components/learner-page/LearnerPageHeader.tsx`
- Create: `frontend/src/shared/components/learner-page/LearnerSection.tsx`
- Create: `frontend/src/shared/components/learner-page/LearnerPageState.tsx`
- Create: `frontend/src/shared/components/learner-page/index.ts`
- Create: `frontend/src/styles/learner-page.css`
- Modify: `frontend/src/index.css:1-5`
- Test: `frontend/src/__tests__/components/LearnerPagePrimitives.test.tsx`

**Interfaces:**

- Produces: `LearnerPageFrame`, `LearnerPageHeader`, `LearnerSection`, and `LearnerPageState`.
- Constraint: these files import no router, auth context, feature hook, service, or runtime bus.

- [ ] **Step 1: Write failing primitive tests**

```tsx
/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  LearnerPageFrame,
  LearnerPageHeader,
  LearnerPageSection,
  LearnerPageState,
} from '@/shared/components/learner-page';

describe('learner page primitives', () => {
  it('renders one labelled page frame and heading', () => {
    render(
      <LearnerPageFrame>
        <LearnerPageHeader title="Courses" description="Choose the next lesson" />
      </LearnerPageFrame>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Courses' })).toBeTruthy();
    expect(screen.getByText('Choose the next lesson')).toBeTruthy();
  });

  it('labels sections through their headings', () => {
    render(<LearnerPageSection title="Recommended"><p>Animals</p></LearnerPageSection>);
    const heading = screen.getByRole('heading', { level: 2, name: 'Recommended' });
    expect(heading.id).toBeTruthy();
    expect(heading.closest('section')?.getAttribute('aria-labelledby')).toBe(heading.id);
  });

  it('announces errors and invokes retry once', () => {
    const retry = vi.fn();
    render(<LearnerPageState kind="error" title="Courses unavailable" onRetry={retry} />);
    expect(screen.getByRole('alert')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('announces loading without presenting a retry action', () => {
    render(<LearnerPageState kind="loading" title="Loading courses" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.queryByRole('button')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests and observe RED**

```powershell
npm.cmd test -- --run src/__tests__/components/LearnerPagePrimitives.test.tsx
```

Expected: module resolution fails because `@/shared/components/learner-page` does not exist.

- [ ] **Step 3: Implement `LearnerPageFrame`**

```tsx
import type { HTMLAttributes, ReactNode } from 'react';

export interface LearnerPageFrameProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function LearnerPageFrame({ children, className = '', ...props }: LearnerPageFrameProps) {
  return (
    <div className={`learner-page-frame ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Implement `LearnerPageHeader`**

```tsx
import type { ReactNode } from 'react';

export interface LearnerPageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
}

export function LearnerPageHeader({ title, description, eyebrow, action, className = '' }: LearnerPageHeaderProps) {
  return (
    <header className={`learner-page-header ${className}`.trim()}>
      <div className="min-w-0">
        {eyebrow ? <p className="learner-page-header__eyebrow">{eyebrow}</p> : null}
        <h1 className="learner-page-header__title">{title}</h1>
        {description ? <p className="learner-page-header__description">{description}</p> : null}
      </div>
      {action ? <div className="learner-page-header__action">{action}</div> : null}
    </header>
  );
}
```

- [ ] **Step 5: Implement `LearnerPageSection`**

```tsx
import { useId, type ReactNode } from 'react';

export interface LearnerPageSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function LearnerPageSection({ title, description, children, className = '' }: LearnerPageSectionProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={`learner-page-section ${className}`.trim()}>
      <div className="learner-page-section__heading">
        <h2 id={headingId}>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
```

- [ ] **Step 6: Implement `LearnerPageState`**

```tsx
export type LearnerPageStateKind = 'loading' | 'empty' | 'error' | 'offline' | 'auth-required';

export interface LearnerPageStateProps {
  kind: LearnerPageStateKind;
  title: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function LearnerPageState({
  kind,
  title,
  description,
  onRetry,
  retryLabel = 'Try again',
}: LearnerPageStateProps) {
  const isBlockingError = kind === 'error' || kind === 'offline' || kind === 'auth-required';
  return (
    <div
      className={`learner-page-state learner-page-state--${kind}`}
      role={isBlockingError ? 'alert' : 'status'}
      aria-live={isBlockingError ? 'assertive' : 'polite'}
      aria-busy={kind === 'loading' ? true : undefined}
    >
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {onRetry ? <button type="button" onClick={onRetry}>{retryLabel}</button> : null}
    </div>
  );
}
```

- [ ] **Step 7: Add the public barrel**

```typescript
export * from './LearnerPageFrame';
export * from './LearnerPageHeader';
export * from './LearnerSection';
export * from './LearnerPageState';
```

- [ ] **Step 8: Add semantic CSS aliases and responsive styles**

Create `frontend/src/styles/learner-page.css`:

```css
:root {
  --learner-canvas: var(--color-bg);
  --learner-surface: var(--color-surface);
  --learner-text: var(--color-text);
  --learner-text-muted: var(--color-text-soft);
  --learner-learning: var(--color-primary);
  --learner-success: var(--color-success);
  --learner-reward: var(--color-accent);
  --learner-danger: var(--color-error);
  --learner-focus: var(--color-primary-dark);
  --learner-control-radius: 18px;
  --learner-surface-radius: 28px;
  --learner-touch-min: 48px;
  --learner-motion-fast: 160ms;
  --learner-motion-normal: 240ms;
}

.learner-page-frame {
  width: 100%;
  max-width: 1200px;
  min-width: 0;
  margin-inline: auto;
  padding: 1rem;
  padding-bottom: calc(6rem + env(safe-area-inset-bottom, 0px));
}

.learner-page-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.learner-page-header__eyebrow {
  margin: 0 0 0.25rem;
  color: var(--learner-learning);
  font-weight: 800;
}

.learner-page-header__title {
  margin: 0;
  color: var(--learner-text);
  font-size: clamp(2rem, 8vw, 3.5rem);
  line-height: 1.05;
}

.learner-page-header__description,
.learner-page-section__heading p,
.learner-page-state p {
  color: var(--learner-text-muted);
}

.learner-page-section,
.learner-page-state {
  border: 3px solid var(--color-border);
  border-radius: var(--learner-surface-radius);
  background: var(--learner-surface);
  box-shadow: 0 8px 0 rgb(15 23 42 / 8%), 0 14px 30px rgb(91 141 239 / 10%);
  padding: 1rem;
}

.learner-page-section + .learner-page-section {
  margin-top: 1rem;
}

.learner-page-state {
  display: grid;
  place-items: center;
  min-height: 14rem;
  text-align: center;
}

.learner-page-state button,
.learner-page-header__action > :where(button, a) {
  min-width: var(--learner-touch-min);
  min-height: var(--learner-touch-min);
}

@media (min-width: 768px) {
  .learner-page-frame {
    padding: 1.5rem 2rem 2rem;
  }

  .learner-page-header {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
  }
}

@media (prefers-reduced-motion: reduce) {
  .learner-page-frame,
  .learner-page-section,
  .learner-page-state {
    scroll-behavior: auto;
    transition: none;
  }
}
```

Add this import after the existing design imports in `frontend/src/index.css`:

```css
@import "./styles/learner-page.css";
```

- [ ] **Step 9: Run focused tests and build**

```powershell
npm.cmd test -- --run src/__tests__/components/LearnerPagePrimitives.test.tsx
npm.cmd run build
```

Expected: primitive tests pass; build exits 0.

- [ ] **Step 10: Commit the design layer**

```powershell
git add frontend/src/shared/components/learner-page frontend/src/styles/learner-page.css frontend/src/index.css frontend/src/__tests__/components/LearnerPagePrimitives.test.tsx
git diff --cached --name-only
git commit -m "feat(frontend): add learner page primitives"
```

---

### Task 3: Stabilize shell semantics and safe-area ownership

**Files:**

- Modify: `frontend/src/app/components/Layout.tsx:31-48`
- Test: `frontend/src/__tests__/app/Layout.test.tsx`

**Interfaces:**

- Produces: exactly one shell-level `main#learner-main` and one skip link.
- Constraint: routed pages use `div` or `section` for internal content regions, not another `main`.

- [ ] **Step 1: Write the failing shell test**

```tsx
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/components/Sidebar', () => ({
  Sidebar: () => <nav aria-label="Learner navigation" />,
}));

import { Layout } from '@/app/components/Layout';

describe('Layout accessibility contract', () => {
  it('provides a skip link and exactly one named main region', () => {
    render(<Layout><h1>Courses</h1></Layout>);
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#learner-main');
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('main')).toHaveAttribute('id', 'learner-main');
  });
});
```

- [ ] **Step 2: Run the test and observe RED**

```powershell
npm.cmd test -- --run src/__tests__/app/Layout.test.tsx
```

Expected: the skip link and `main` id assertions fail.

- [ ] **Step 3: Add the skip link and main target**

Change the `Layout` return wrapper to:

```tsx
return (
  <div
    className={`learner-shell flex min-h-[100dvh] w-full max-w-[100vw] min-w-0 overflow-x-hidden ${
      isSidebarExpanded ? 'learner-shell--sidebar-expanded' : ''
    }`}
    style={{ backgroundColor: 'var(--color-bg)' }}
  >
    <a
      href="#learner-main"
      className="sr-only focus:not-sr-only fixed left-4 top-4 z-[var(--z-top)] rounded-xl bg-white px-4 py-3 font-bold text-slate-900 shadow-lg"
    >
      Skip to main content
    </a>
    <Sidebar
      isDesktopExpanded={isSidebarExpanded}
      onDesktopExpandedChange={setSidebarExpanded}
    />
    <main
      id="learner-main"
      tabIndex={-1}
      className="learner-main w-full max-w-[100vw] min-w-0 flex-1 overflow-x-hidden pb-[calc(76px+env(safe-area-inset-bottom,0px)+0.75rem)] transition-[margin,max-width] duration-300 md:pb-0 motion-reduce:transition-none"
    >
      {children}
    </main>
  </div>
);
```

- [ ] **Step 4: Run shell, route, and build gates**

```powershell
npm.cmd test -- --run src/__tests__/app/Layout.test.tsx src/__tests__/learnerRouteContracts.test.ts
npm.cmd run build
```

Expected: both test files and build pass.

- [ ] **Step 5: Commit the shell semantics**

```powershell
git add frontend/src/app/components/Layout.tsx frontend/src/__tests__/app/Layout.test.tsx
git diff --cached --name-only
git commit -m "fix(frontend): expose accessible learner main region"
```

---

### Task 4: Make authentication states accessible and stable

**Files:**

- Modify: `frontend/src/pages/Login.tsx:95-133`
- Modify: `frontend/src/pages/Register.tsx:77-127`
- Test: `frontend/src/__tests__/pages/AuthPages.test.tsx`

**Interfaces:**

- Preserves: `login(email, password)`, `register(email, password, name)`, guest entry, and navigation to `/courses`.
- Produces: announced errors, labelled busy forms, and stable disabled submit controls.

- [ ] **Step 1: Write failing auth page tests**

```tsx
/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const login = vi.fn();
const register = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    login,
    register,
    enterGuestMode: vi.fn(),
    isLoading: false,
    isPostLoginLoading: false,
    startPostLoginLoading: vi.fn(),
    endPostLoginLoading: vi.fn(),
  }),
}));

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

vi.mock('@/features/auth/components/LexiLoginLoader', () => ({
  LexiLoginLoader: () => null,
}));

import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';

describe('auth pages', () => {
  beforeEach(() => vi.clearAllMocks());

  it('announces a login failure and connects it to the form', async () => {
    login.mockResolvedValue({ success: false, error: 'Invalid credentials' });
    render(<MemoryRouter><Login /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('loginEmail'), { target: { value: 'learner@example.com' } });
    fireEvent.change(screen.getByLabelText('loginPassword'), { target: { value: 'wrong' } });
    fireEvent.submit(screen.getByRole('button', { name: 'loginSubmit' }).closest('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
  });

  it('announces a registration failure', async () => {
    register.mockResolvedValue({ success: false, error: 'Email already exists' });
    render(<MemoryRouter><Register /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('registerName'), { target: { value: 'Learner' } });
    fireEvent.change(screen.getByLabelText('registerEmail'), { target: { value: 'learner@example.com' } });
    fireEvent.change(screen.getByLabelText('registerPassword'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'registerSubmit' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Email already exists'));
  });
});
```

- [ ] **Step 2: Run auth tests and observe RED**

```powershell
npm.cmd test -- --run src/__tests__/pages/AuthPages.test.tsx
```

Expected: the error elements are not discoverable by `role="alert"`.

- [ ] **Step 3: Add error association and busy semantics**

In each page, give the error a stable id and role:

```tsx
{errorText ? (
  <div
    id="auth-form-error"
    role="alert"
    className="rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
  >
    {errorText}
  </div>
) : null}
```

Update each form opening tag:

```tsx
<form
  onSubmit={handleLogin}
  className="space-y-4"
  aria-busy={isLoading}
  aria-describedby={errorText ? 'auth-form-error' : undefined}
>
```

Use `handleRegister` in the registration page and keep the same `aria-*` attributes.

Add `aria-disabled={isLoading}` to each submit `ClayButton`; keep the existing native `disabled` prop.

- [ ] **Step 4: Run focused regression and build**

```powershell
npm.cmd test -- --run src/__tests__/pages/AuthPages.test.tsx
npm.cmd run build
```

Expected: auth tests pass and build exits 0.

- [ ] **Step 5: Commit the auth slice**

```powershell
git add frontend/src/pages/Login.tsx frontend/src/pages/Register.tsx frontend/src/__tests__/pages/AuthPages.test.tsx
git diff --cached --name-only
git commit -m "fix(frontend): clarify learner authentication states"
```

---

### Task 5: Converge course catalog and detail page states

**Files:**

- Modify: `frontend/src/pages/CourseList.tsx:566-766`
- Modify: `frontend/src/pages/CourseDetail.tsx:131-235`
- Modify: `frontend/src/__tests__/pages/CourseList.test.tsx`
- Create: `frontend/src/__tests__/pages/CourseDetail.test.tsx`

**Interfaces:**

- Consumes: `LearnerPageFrame`, `LearnerPageHeader`, and `LearnerPageState`.
- Preserves: `courseService.listCourses`, `getProgress`, `getCourse`, `startCourse`, route params, filters, and Start/Continue navigation.

- [ ] **Step 1: Extend the catalog test with semantic states**

Add assertions to `CourseList.test.tsx`:

```tsx
expect(screen.getByRole('main')).toBeTruthy();
expect(screen.getByRole('heading', { level: 1, name: 'Course Catalog' })).toBeTruthy();
expect(container.scrollWidth).toBeLessThanOrEqual(container.clientWidth || container.scrollWidth);
```

Do not add a second `<main>` in `CourseList`; the `main` is provided by `Layout` in route-level tests. For the isolated page test, wrap the page in:

```tsx
<main id="learner-main">
  <CourseList />
</main>
```

- [ ] **Step 2: Write the failing course detail state tests**

```tsx
/** @vitest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCourse = vi.fn();
const getProgress = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'learner-1' } }) }));
vi.mock('@/contexts/LocaleContext', () => ({ useLocale: () => ({ locale: 'en' }) }));
vi.mock('@/services/CourseService', () => ({
  courseService: { getCourse, getProgress, startCourse: vi.fn() },
}));

import { CourseDetail } from '@/pages/CourseDetail';

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/courses/course-1']}>
      <Routes><Route path="/courses/:id" element={<CourseDetail />} /></Routes>
    </MemoryRouter>,
  );
}

describe('CourseDetail states', () => {
  beforeEach(() => vi.clearAllMocks());

  it('announces loading', () => {
    getCourse.mockReturnValue(new Promise(() => undefined));
    getProgress.mockReturnValue(new Promise(() => undefined));
    renderDetail();
    expect(screen.getByRole('status')).toHaveTextContent('Loading course');
  });

  it('announces a load error', async () => {
    getCourse.mockRejectedValue(new Error('offline'));
    getProgress.mockResolvedValue([]);
    renderDetail();
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  });
});
```

- [ ] **Step 3: Run course tests and observe RED**

```powershell
npm.cmd test -- --run src/__tests__/pages/CourseList.test.tsx src/__tests__/pages/CourseDetail.test.tsx
```

Expected: detail loading/error roles fail before primitive adoption.

- [ ] **Step 4: Adopt shared page states without changing data flow**

Add imports:

```tsx
import {
  LearnerPageFrame,
  LearnerPageHeader,
  LearnerPageState,
} from '@/shared/components/learner-page';
```

Replace `CourseDetail` loading and error branches with:

```tsx
if (isLoading) {
  return (
    <LearnerPageFrame>
      <LearnerPageState kind="loading" title={copy.loadingCourse} />
    </LearnerPageFrame>
  );
}

if (!course || error) {
  return (
    <LearnerPageFrame>
      <LearnerPageState
        kind="error"
        title={error || copy.courseNotFound}
        onRetry={loadCourse}
        retryLabel={locale === 'vi' ? 'Thử lại' : 'Try again'}
      />
    </LearnerPageFrame>
  );
}
```

Extract the current effect body into this callback and use it from both the
effect and `LearnerPageState.onRetry`:

```tsx
const loadCourse = useCallback(async () => {
  if (!id) return;
  const learnerId = getLearnerId(user?.id);
  setIsLoading(true);
  setError(null);
  try {
    const [nextCourse, progressList] = await Promise.all([
      courseService.getCourse(id),
      courseService.getProgress(learnerId).catch(() => [] as UserProgress[]),
    ]);
    setCourse(nextCourse);
    setProgress(progressList.find((item) => item.course_id === nextCourse.course_id) || null);
  } catch (loadError) {
    console.error('[CourseDetail] load error:', loadError);
    setError(copy.courseNotFound);
  } finally {
    setIsLoading(false);
  }
}, [copy.courseNotFound, id, user?.id]);

useEffect(() => {
  void loadCourse();
}, [loadCourse]);
```

Import `useCallback` from React and set `onRetry={loadCourse}`. Do not reload
the entire application.

Wrap the successful course detail page in `LearnerPageFrame` and replace its page heading block with:

```tsx
<LearnerPageHeader
  eyebrow={course.category_label}
  title={courseTitle(course, locale)}
  description={courseDescription(course, locale)}
/>
```

For `CourseList`, preserve the current hero and card markup. Change only its loading and error containers to `LearnerPageState`, and wrap the existing catalog canvas in `LearnerPageFrame`. Do not recalculate catalog progress or replace demo fallback behavior in this task.

- [ ] **Step 5: Verify course behavior**

```powershell
npm.cmd test -- --run src/__tests__/pages/CourseList.test.tsx src/__tests__/pages/CourseDetail.test.tsx
npm.cmd run build
npm.cmd run lint -- --quiet
```

Expected: focused tests, build, and lint pass.

- [ ] **Step 6: Commit the course slice**

```powershell
git add frontend/src/pages/CourseList.tsx frontend/src/pages/CourseDetail.tsx frontend/src/__tests__/pages/CourseList.test.tsx frontend/src/__tests__/pages/CourseDetail.test.tsx
git diff --cached --name-only
git commit -m "feat(frontend): unify mobile course page states"
```

---

### Task 6: Type and render authoritative lesson completion

**Files:**

- Modify: `frontend/src/features/courses/types.ts:235-264`
- Modify: `frontend/src/features/courses/services/CourseService.ts:53-73`
- Create: `frontend/src/features/courses/lib/lessonCompletion.ts`
- Modify: `frontend/src/pages/LessonPlayer.tsx:714-755`
- Modify: `frontend/src/pages/LessonPlayer.tsx:1172-1331`
- Test: `frontend/src/__tests__/pages/LessonCompletion.test.ts`

**Interfaces:**

- Produces: `LessonCompletionResult` and `toAuthoritativeReward(result, authoredReward)`.
- Preserves: the existing `POST /api/v1/lessons/{lessonId}/complete` payload.
- Constraint: `LessonPlayer` does not call `GamificationService.addXP` or `useGamification.addXP`.

- [ ] **Step 1: Write failing completion mapping tests**

```typescript
import { describe, expect, it } from 'vitest';
import { toAuthoritativeReward } from '@/features/courses/lib/lessonCompletion';
import type { LessonCompletionResult, Reward } from '@/features/courses/types';

const authoredReward: Reward = {
  xp: 50,
  sticker: { bucket: 'media', path: 'stickers/star.png', type: 'sticker', status: 'ready' },
  badgeTitle: 'Lesson star',
  message_vi: 'Hoan thanh bai hoc',
};

const completion = (xpEarned: number): LessonCompletionResult => ({
  user_id: 'learner-1',
  course_id: 'course-1',
  status: 'started',
  current_lesson_id: 'lesson-2',
  completed_lessons: ['lesson-1'],
  lesson_progress: [],
  total_xp: 150,
  rewards: [authoredReward],
  gamification: {
    xp_earned: xpEarned,
    words_learned: 2,
    time_mins: 4,
    new_sticker: null,
  },
});

describe('authoritative lesson completion mapping', () => {
  it('uses xp_earned from the backend response', () => {
    expect(toAuthoritativeReward(completion(20), authoredReward)?.xp).toBe(20);
  });

  it('does not show a second reward for an idempotent replay', () => {
    expect(toAuthoritativeReward(completion(0), authoredReward)).toBeNull();
  });

  it('does not invent display metadata when the lesson has no authored reward', () => {
    expect(toAuthoritativeReward(completion(20), null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test and observe RED**

```powershell
npm.cmd test -- --run src/__tests__/pages/LessonCompletion.test.ts
```

Expected: the completion type/helper module does not exist.

- [ ] **Step 3: Add the completion response type**

Append after `UserProgress` in `frontend/src/features/courses/types.ts`:

```typescript
export interface LessonCompletionGamification {
  xp_earned: number;
  words_learned: number;
  time_mins: number;
  new_sticker: Record<string, unknown> | null;
}

export interface LessonCompletionResult extends UserProgress {
  gamification: LessonCompletionGamification;
}
```

- [ ] **Step 4: Type the service response without changing the request**

Import `LessonCompletionResult` and annotate `completeLesson`:

```typescript
completeLesson: (
  courseId: string,
  lessonId: string,
  userId: string,
  stats?: {
    score?: number;
    timeSpent?: number;
    wordsLearned?: string[];
    pronunciationScores?: Record<string, number>;
    gamesPlayed?: number;
  },
): Promise<LessonCompletionResult> =>
  apiClient.post(`/api/v1/lessons/${lessonId}/complete`, {
    user_id: userId,
    course_id: courseId,
    score: stats?.score,
    time_spent: stats?.timeSpent,
    words_learned: stats?.wordsLearned,
    pronunciation_scores: stats?.pronunciationScores,
    games_played: stats?.gamesPlayed,
  }),
```

- [ ] **Step 5: Implement authoritative reward mapping**

```typescript
import type { LessonCompletionResult, Reward } from '@/features/courses/types';

export function toAuthoritativeReward(
  completion: LessonCompletionResult,
  authoredReward: Reward | null | undefined,
): Reward | null {
  if (!authoredReward || completion.gamification.xp_earned <= 0) return null;
  return { ...authoredReward, xp: completion.gamification.xp_earned };
}
```

- [ ] **Step 6: Use the authoritative completion response once**

In `handleFinishLesson`, replace the ignored response and authored XP branch with:

```tsx
const completion = await courseService.completeLesson(courseId, lessonId, learnerId, {
  score: result.score,
  timeSpent: sessionStartTime > 0 ? Math.ceil((Date.now() - sessionStartTime) / 60000) : 0,
  wordsLearned,
  pronunciationScores,
  gamesPlayed,
});

await saveStepProgress('finish', {
  passed: true,
  score: result.score,
  attemptType: 'lesson_complete',
  responseData: {
    reward_xp: completion.gamification.xp_earned,
    step_complete: true,
  },
});

const authoritativeReward = toAuthoritativeReward(completion, lesson.reward);
if (authoritativeReward) {
  setReward(authoritativeReward);
  HapticService.reward();
  SoundEffectService.play('success').catch(() => undefined);
}
setNotice(
  completion.gamification.xp_earned > 0
    ? copy.stepSaved
    : `${copy.completed}: ${copy.courseProgress} ${completion.total_xp} XP`,
);
```

Add the helper import:

```typescript
import { toAuthoritativeReward } from '@/features/courses/lib/lessonCompletion';
```

Do not add any client gamification mutation.

- [ ] **Step 7: Adopt shared loading/error states and remove nested `main`**

Replace the loading/error branches with `LearnerPageFrame` plus `LearnerPageState` as in Task 5. Change the internal `<main ...>` at the activity canvas to:

```tsx
<section
  aria-label={currentStep.title}
  className="min-h-0 flex-1 overflow-y-auto rounded-[36px] border-4 border-white p-4 shadow-[0_12px_0_rgba(91,141,239,0.10)] sm:p-5"
  style={{ background: shellTone(currentStep?.id) }}
>
```

Close it with `</section>`. Keep the shell-level `main` from `Layout` as the only main landmark.

Add `role="status" aria-live="polite"` to the notice container and `aria-current="step"` to the active step button.

- [ ] **Step 8: Run completion, session, and build gates**

```powershell
npm.cmd test -- --run src/__tests__/pages/LessonCompletion.test.ts src/__tests__/SessionContext.test.tsx
npm.cmd run build
npm.cmd run lint -- --quiet
```

Expected: focused tests, build, and lint pass; no new direct `addXP` call appears in `LessonPlayer`.

Verify:

```powershell
rg -n "addXP|add-xp" src/pages/LessonPlayer.tsx
```

Expected: no output.

- [ ] **Step 9: Commit the lesson slice**

```powershell
git add frontend/src/features/courses/types.ts frontend/src/features/courses/services/CourseService.ts frontend/src/features/courses/lib/lessonCompletion.ts frontend/src/pages/LessonPlayer.tsx frontend/src/__tests__/pages/LessonCompletion.test.ts
git diff --cached --name-only
git commit -m "fix(frontend): render authoritative lesson rewards"
```

---

### Task 7: Make flashcard practice states truthful and accessible

**Files:**

- Modify: `frontend/src/pages/FlashcardPage.tsx:17-252`
- Test: `frontend/src/__tests__/pages/FlashcardPage.test.tsx`

**Interfaces:**

- Preserves: `GET /api/v1/flashcard`, pronunciation submission, game navigation, and current demo fallback.
- Produces: explicit fallback disclosure, keyboard-selectable cards, labelled audio/practice/game controls, and live states.

- [ ] **Step 1: Write failing flashcard behavior tests**

```tsx
/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();

vi.mock('@/services/apiClient', () => ({ apiClient: { get, post: vi.fn() } }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'learner-1' }, token: 'token', isGuest: false }),
}));
vi.mock('@/features/learning/components/Flashcard', () => ({
  default: ({ word }: { word: string }) => <span>{word}</span>,
}));
vi.mock('@/features/pronunciation/components/PronunciationPractice', () => ({
  PronunciationPractice: () => <div>Pronunciation practice</div>,
}));

import FlashcardPage from '@/pages/FlashcardPage';

describe('FlashcardPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('discloses demo fallback when the API fails', async () => {
    get.mockRejectedValue(new Error('offline'));
    render(<MemoryRouter><FlashcardPage /></MemoryRouter>);
    expect(await screen.findByText(/demo card/i)).toBeTruthy();
  });

  it('selects a card through a named button', async () => {
    get.mockResolvedValue([{ id: 'card-1', word: 'cat', translation: 'meo' }]);
    render(<MemoryRouter><FlashcardPage /></MemoryRouter>);
    const card = await screen.findByRole('button', { name: /practice cat/i });
    fireEvent.click(card);
    await waitFor(() => expect(card).toHaveAttribute('aria-pressed', 'true'));
  });

  it('uses text or SVG labels instead of emoji-only game controls', async () => {
    get.mockResolvedValue([{ id: 'card-1', word: 'cat' }]);
    render(<MemoryRouter><FlashcardPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /practice cat/i }));
    expect(screen.getByRole('button', { name: 'Drag Match' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Memory Match' })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests and observe RED**

```powershell
npm.cmd test -- --run src/__tests__/pages/FlashcardPage.test.tsx
```

Expected: fallback disclosure and button semantics fail.

- [ ] **Step 3: Track API fallback explicitly**

Add state:

```tsx
const [isDemoFallback, setIsDemoFallback] = useState(false);
```

Set it in the request:

```tsx
const list: FlashcardData[] = Array.isArray(data) ? data : data.flashcards ?? data.items ?? [];
if (!cancelled) {
  setIsDemoFallback(list.length === 0);
  setCards(list.length > 0 ? list : [DEMO_CARD]);
}
```

And in `catch`:

```tsx
if (!cancelled) {
  setIsDemoFallback(true);
  setCards([DEMO_CARD]);
}
```

Render this disclosure after the page heading:

```tsx
{isDemoFallback ? (
  <div role="status" className="mb-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-3 font-bold text-amber-900">
    The live flashcard catalog is unavailable. You are practising with a demo card; this activity is not saved progress.
  </div>
) : null}
```

- [ ] **Step 4: Use native button semantics for card selection**

Wrap each rendered flashcard in:

```tsx
<button
  type="button"
  aria-label={`Practice ${card.word}`}
  aria-pressed={isSelected}
  onClick={() => handleCardClick(card)}
  className="min-h-12 min-w-12 rounded-[28px] text-left focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-blue-700"
>
  <Flashcard
    word={card.word}
    bgUrl={BG_FALLBACK}
    imgUrl={card.image_url ?? jungle as string}
    qrData={getQrData(card)}
    audioUrl={card.audio_url}
    imageAnimationType={card.image_animation_type}
    translation={getTranslationText(card.translation)}
  />
</button>
```

Move the existing selection callback and existing `Flashcard` props into this button without changing data mapping.

- [ ] **Step 5: Remove emoji from the game configuration**

Change the config to:

```typescript
const GAME_LABELS: Record<GameType, { label: string; color: string }> = {
  drag_match: { label: 'Drag Match', color: '#0ea5e9' },
  catch_word: { label: 'Catch Word', color: '#f59e0b' },
  word_scramble: { label: 'Word Scramble', color: '#10b981' },
  memory_match: { label: 'Memory Match', color: '#f97316' },
};
```

Render the text label and one decorative inline SVG inside each game button:

```tsx
<svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
  <path d="M5 12h14M12 5l7 7-7 7" />
</svg>
<span>{config.label}</span>
```

Replace the collapsed practice control emoji with an inline microphone SVG and keep visible word text.

- [ ] **Step 6: Adopt the page frame and live loading state**

Use `LearnerPageFrame`, `LearnerPageHeader`, and `LearnerPageState`. Loading becomes:

```tsx
return (
  <LearnerPageFrame>
    <LearnerPageState kind="loading" title="Loading flashcards" />
  </LearnerPageFrame>
);
```

The successful page has exactly one `h1` supplied by `LearnerPageHeader`.

- [ ] **Step 7: Verify flashcard behavior**

```powershell
npm.cmd test -- --run src/__tests__/pages/FlashcardPage.test.tsx
npm.cmd run build
npm.cmd run lint -- --quiet
```

Expected: focused tests, build, and lint pass.

- [ ] **Step 8: Commit the flashcard slice**

```powershell
git add frontend/src/pages/FlashcardPage.tsx frontend/src/__tests__/pages/FlashcardPage.test.tsx
git diff --cached --name-only
git commit -m "feat(frontend): clarify mobile flashcard practice"
```

---

### Task 8: Close the journey with authoritative progress UI

**Files:**

- Modify: `frontend/src/pages/ProgressDashboard.tsx:36-280`
- Test: `frontend/src/__tests__/pages/ProgressDashboard.test.tsx`

**Interfaces:**

- Preserves: `useProgressReport(userId)` and its `refresh()` behavior.
- Produces: semantic loading/error/refresh states with shell-owned desktop offset.

- [ ] **Step 1: Write failing progress page tests**

```tsx
/** @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const refresh = vi.fn();
const useProgressReport = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'learner-1' } }) }));
vi.mock('@/hooks/useProgressReport', () => ({ useProgressReport: (...args: unknown[]) => useProgressReport(...args) }));
vi.mock('@/features/gamification/components/ProgressChart', () => ({ ProgressChart: () => <div>Chart</div> }));
vi.mock('@/features/gamification/components/WeeklyReport', () => ({ WeeklyReport: () => <div>Weekly</div> }));
vi.mock('@/features/gamification/components/StreakBadge', () => ({ StreakBadge: () => <div>Streak</div> }));
vi.mock('@/features/gamification/components/DailyGoal', () => ({ DailyGoal: () => <div>Goal</div> }));

import { ProgressDashboard } from '@/pages/ProgressDashboard';

describe('ProgressDashboard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('announces loading', () => {
    useProgressReport.mockReturnValue({ isLoading: true, summary: null, weeklyReport: null, achievements: [], weeklyComparison: null, refresh });
    render(<ProgressDashboard />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading progress');
  });

  it('announces failure and retries', () => {
    useProgressReport.mockReturnValue({ isLoading: false, summary: null, weeklyReport: null, achievements: [], weeklyComparison: null, refresh });
    render(<ProgressDashboard />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does not add a second desktop sidebar offset', () => {
    const pagePath = resolve(dirname(fileURLToPath(import.meta.url)), '../../pages/ProgressDashboard.tsx');
    const source = readFileSync(pagePath, 'utf8');
    expect(source).not.toMatch(/md:pl-24|lg:pl-72/);
  });
});
```

- [ ] **Step 2: Run tests and observe RED**

```powershell
npm.cmd test -- --run src/__tests__/pages/ProgressDashboard.test.tsx
```

Expected: status/alert semantics and desktop-offset contract fail.

- [ ] **Step 3: Replace page-owned states with shared states**

Use:

```tsx
if (isLoading) {
  return (
    <LearnerPageFrame>
      <LearnerPageState kind="loading" title="Loading progress" />
    </LearnerPageFrame>
  );
}

if (!summary) {
  return (
    <LearnerPageFrame>
      <LearnerPageState
        kind="error"
        title="Progress unavailable"
        description="Your saved reward is not changed. Refresh the authoritative progress report when the connection returns."
        onRetry={refresh}
      />
    </LearnerPageFrame>
  );
}
```

Wrap the success UI in `LearnerPageFrame` and use `LearnerPageHeader`. Remove `md:pl-24 lg:pl-72` from all ProgressDashboard root state branches because `Layout` owns the sidebar margin.

Replace the refresh emoji with an inline SVG and give the button `aria-label="Refresh progress"`. Add `aria-live="polite"` to the region that displays refreshed summary values.

- [ ] **Step 4: Run progress and lesson completion regressions**

```powershell
npm.cmd test -- --run src/__tests__/pages/ProgressDashboard.test.tsx src/__tests__/pages/LessonCompletion.test.ts
npm.cmd run build
npm.cmd run lint -- --quiet
```

Expected: focused tests, build, and lint pass.

- [ ] **Step 5: Commit the progress closure**

```powershell
git add frontend/src/pages/ProgressDashboard.tsx frontend/src/__tests__/pages/ProgressDashboard.test.tsx
git diff --cached --name-only
git commit -m "feat(frontend): close learner journey with progress states"
```

---

### Task 9: Add controlled mobile-browser journey coverage

**Files:**

- Create: `frontend/tests/e2e/learner-core-journey.spec.ts`
- Read: `frontend/playwright.config.ts`

**Interfaces:**

- Consumes: stable storage keys, route URLs, and FastAPI response shapes.
- Produces: deterministic Chromium and Mobile Safari emulation coverage without external credentials.

- [ ] **Step 1: Create deterministic auth and API setup**

Start the spec with:

```typescript
import { expect, test, type Page } from '@playwright/test';

const learner = {
  id: 'learner-1',
  email: 'learner@example.com',
  username: 'Learner',
  role: 'learner',
  roles: ['learner'],
  is_superuser: false,
};

const token = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJsZWFybmVyLTEiLCJlbWFpbCI6ImxlYXJuZXJAZXhhbXBsZS5jb20iLCJleHAiOjQxMDI0NDQ4MDB9.';

async function installAuthenticatedLearner(page: Page) {
  await page.addInitScript(({ tokenValue, userValue }) => {
    localStorage.setItem('authToken', tokenValue);
    localStorage.setItem('authUser', JSON.stringify(userValue));
    localStorage.removeItem('guestMode');
  }, { tokenValue: token, userValue: learner });

  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: learner }));
}
```

- [ ] **Step 2: Add controlled course, flashcard, and progress routes**

```typescript
async function installLearnerApi(page: Page) {
  const lesson = {
    lesson_id: 'lesson-1',
    title: 'Meet the animals',
    title_vi: 'Lam quen dong vat',
    order: 1,
    duration_minutes: 5,
    video_duration: 0,
    images: [],
    scene_images: [],
    vocabulary: [],
    quiz: [],
    generatedMedia: [],
    reward: null,
  };
  const course = {
    course_id: 'course-1',
    title: 'Animals',
    subtitle_vi: 'Dong vat',
    theme: 'animals',
    category_key: 'nature',
    category_label: 'Nature',
    category_icon: 'leaf',
    age_range: '6-10',
    level: 'beginner',
    description_vi: 'Hoc tu vung dong vat',
    catalogPreview: [],
    studentTestimonials: [],
    lessons: [lesson],
    is_published: true,
  };
  const progress = [{
    user_id: learner.id,
    course_id: course.course_id,
    status: 'started',
    current_lesson_id: lesson.lesson_id,
    completed_lessons: [],
    lesson_progress: [],
    total_xp: 0,
    rewards: [],
  }];

  await page.route('**/api/v1/courses', (route) => route.fulfill({ json: [course] }));
  await page.route('**/api/v1/courses/course-1', (route) => route.fulfill({ json: course }));
  await page.route('**/api/v1/users/learner-1/progress', (route) => route.fulfill({ json: progress }));
  await page.route('**/api/v1/learning-path/**', (route) => route.fulfill({ json: null }));
  await page.route('**/api/v1/flashcard', (route) => route.fulfill({
    json: [{ id: 'card-1', qr_id: 'cat-1', word: 'cat', translation: 'meo' }],
  }));
}
```

Order the exact course routes before the broad list route if Playwright matching demonstrates overlap; use `route.request().url()` in a single handler if needed.

- [ ] **Step 3: Add the responsive journey test**

```typescript
test.beforeEach(async ({ page }) => {
  await installAuthenticatedLearner(page);
  await installLearnerApi(page);
});

test('authenticated learner can traverse the core UI without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/courses');
  await expect(page.getByRole('heading', { level: 1, name: /course catalog/i })).toBeVisible();

  await page.getByText('Animals', { exact: true }).first().click();
  await expect(page).toHaveURL(/\/courses\/course-1/);
  await expect(page.getByRole('heading', { level: 1, name: 'Animals' })).toBeVisible();

  await page.goto('/flashcards');
  await page.getByRole('button', { name: /practice cat/i }).click();
  await expect(page.getByText(/practice: cat/i)).toBeVisible();

  await page.goto('/progress');
  await expect(page.getByRole('heading', { level: 1, name: /progress report/i })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
```

- [ ] **Step 4: Run both configured browser projects**

```powershell
npx.cmd playwright test tests/e2e/learner-core-journey.spec.ts --project=chromium
npx.cmd playwright test tests/e2e/learner-core-journey.spec.ts --project="Mobile Safari"
```

Expected: both projects pass. Record that Mobile Safari is emulation, not real-device verification.

- [ ] **Step 5: Add reduced-motion and 200% zoom assertions**

Add a second test:

```typescript
test('core learner page remains usable with reduced motion and 200 percent text zoom', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/courses');
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await expect(page.getByRole('heading', { level: 1, name: /course catalog/i })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
```

Run both projects again and require zero failures.

- [ ] **Step 6: Commit controlled E2E coverage**

```powershell
git add frontend/tests/e2e/learner-core-journey.spec.ts
git diff --cached --name-only
git commit -m "test(frontend): cover mobile learner core journey"
```

---

### Task 10: Run integrated quality and runtime gates

**Files:**

- Modify: `docs/frontend-web/progress/2026-08-28-mobile-web-core-ui.md`
- Verify: all files changed by Tasks 1-9.

**Interfaces:**

- Produces: CODE_VERIFIED and RUNTIME_VERIFIED evidence.
- Does not claim: DEVICE_BROWSER_VERIFIED without a real phone/browser run.

- [ ] **Step 1: Run focused tests**

```powershell
npm.cmd test -- --run src/__tests__/learnerRouteContracts.test.ts src/__tests__/components/LearnerPagePrimitives.test.tsx src/__tests__/app/Layout.test.tsx src/__tests__/pages/AuthPages.test.tsx src/__tests__/pages/CourseList.test.tsx src/__tests__/pages/CourseDetail.test.tsx src/__tests__/pages/LessonCompletion.test.ts src/__tests__/pages/FlashcardPage.test.tsx src/__tests__/pages/ProgressDashboard.test.tsx
```

Expected: all listed test files pass with zero failures.

- [ ] **Step 2: Run build and lint**

```powershell
npm.cmd run build
npm.cmd run lint -- --quiet
```

Expected: both exit 0. Existing Vite warnings may be recorded but must not be presented as new success or silently omitted.

- [ ] **Step 3: Run the full frontend test baseline**

```powershell
npm.cmd test -- --run
```

Expected: no new failures in touched domains. If unrelated baseline failures remain, record exact files and counts and compare them with Task 1 evidence.

- [ ] **Step 4: Run controlled E2E**

```powershell
npx.cmd playwright test tests/e2e/learner-core-journey.spec.ts
```

Expected: Chromium and Mobile Safari emulation pass.

- [ ] **Step 5: Exercise the real runtime journey**

Start the intended backend and frontend environments. In a mobile-sized browser, perform and record:

1. Login with an environment-provided learner account; no credential is written to docs.
2. Open `/courses`, apply one available filter, and open a live course.
3. Start or resume a lesson and complete its supported activity sequence.
4. Observe the completion response in the Network panel and record `gamification.xp_earned` without recording tokens.
5. Close the reward presentation and confirm no second completion/XP request is emitted.
6. Open `/flashcards`, select a card, and exercise audio or the supported-browser fallback.
7. Open `/progress` and confirm the authoritative value refreshes.
8. Refresh the page, use browser Back/Forward, and verify route/session coherence.
9. Simulate an offline read and verify truthful retry UI.

Expected: the journey reaches RUNTIME_VERIFIED. If the backend lacks reproducible data or completion support, record the exact failing request/response and mark only the affected gate blocked; do not claim runtime completion.

- [ ] **Step 6: Inspect final diff and whitespace**

```powershell
git diff --check
git status --short
git diff --stat
```

Expected: no whitespace errors; unrelated dirty paths remain untouched.

- [ ] **Step 7: Append verification evidence**

Append `## Verification` with the three subheadings `### CODE_VERIFIED`,
`### RUNTIME_VERIFIED`, and `### DEVICE_BROWSER_VERIFIED`.

Under `CODE_VERIFIED`, copy each executed command, its exit code, pass/fail
counts, and build warnings. Under `RUNTIME_VERIFIED`, record the backend and
frontend environment identifiers, each route result, the observed completion
request count, the progress-refresh behavior, and evidence paths. Under
`DEVICE_BROWSER_VERIFIED`, use exactly one status from Task 11 and record the
actual device/browser versions when a real-device run occurs.

- [ ] **Step 8: Commit only the progress evidence**

```powershell
git add docs/frontend-web/progress/2026-08-28-mobile-web-core-ui.md
git diff --cached --name-only
git commit -m "docs(frontend): record core learner UI verification"
```

---

### Task 11: Perform real mobile-device browser verification

**Files:**

- Modify: `docs/frontend-web/progress/2026-08-28-mobile-web-core-ui.md`

**Interfaces:**

- Produces: DEVICE_BROWSER_VERIFIED evidence or an explicit device-only blocker.

- [ ] **Step 1: Prepare a reachable test environment**

Use a deployed staging URL or a LAN-reachable HTTPS environment. Do not expose development credentials, bearer tokens, or unrestricted backend ports in the progress document.

- [ ] **Step 2: Verify Chrome Android**

Record the real device model, Android version, Chrome version, viewport/orientation, and results for:

- authentication and virtual keyboard;
- course, lesson, flashcard, reward, and progress journey;
- touch targets and adjacent-control spacing;
- bottom navigation and safe-area overlap;
- audio/microphone permission and fallback;
- browser Back/Forward and refresh;
- portrait-to-landscape state preservation; and
- absence of horizontal scrolling.

- [ ] **Step 3: Verify Safari iOS**

Record the real device model, iOS version, Safari version, and the same checks. Pay special attention to safe-area insets, viewport resizing under the keyboard, audio permission, and sticky/fixed controls.

- [ ] **Step 4: Update the evidence status accurately**

Use exactly one status:

- `DEVICE_BROWSER_VERIFIED`: both required real-browser runs pass.
- `PARTIALLY_DEVICE_VERIFIED`: one platform passes and the other is not available or fails.
- `EMULATION_ONLY`: no real device run occurred.

Do not relabel Playwright Mobile Safari emulation as device verification.

- [ ] **Step 5: Commit the device evidence**

```powershell
git add docs/frontend-web/progress/2026-08-28-mobile-web-core-ui.md
git diff --cached --name-only
git commit -m "docs(frontend): record mobile device browser verification"
```

---

## Follow-up gates outside this plan

Do not start these until Tasks 1-10 pass and Task 11 is either verified or has a documented device-only blocker:

1. Educational games UI convergence.
2. Pets, stickers, leaderboard, daily challenge, profile, and reporting polish.
3. Route-level lazy loading based on measured bundle evidence.
4. PWA manifest/service-worker/offline-shell implementation.
5. AR/WebAR work only when explicitly assigned.

Each follow-up receives its own spec-to-plan cycle and must not be appended casually to this core plan.
