# Mobile-Web Learner Product UI Specification

**Status:** Approved by the product owner on 2026-08-28.

## 1. Purpose

This specification defines the target learner experience for the graduation
mobile-web application in `frontend/`. It standardizes the core journey without
redesigning backend behavior or replacing the existing application shell.

The release journey is:

```text
Auth -> Course -> Lesson -> Flashcard -> Reward/Progress
```

The implementation follows the decision in
[`../decisions/2026-08-28-ui-approach.md`](../decisions/2026-08-28-ui-approach.md).

## 2. Product outcomes

The completed UI program must let an authenticated learner:

1. sign in or register and reach the learner area without losing session state;
2. discover a course and understand its topic, progress, and next action;
3. open a course, select or resume a lesson, and understand lesson structure;
4. complete lesson activities with clear progress and recoverable errors;
5. practise a flashcard, hear or attempt pronunciation where available, and
   launch supported practice activities;
6. receive a reward presentation based only on the authoritative backend
   response; and
7. confirm updated XP, streak, goals, or progress after completion.

The journey must remain coherent after refresh, deep linking, and browser Back.

## 3. Scope

### 3.1 In scope

- Public authentication pages: `/login` and `/register`.
- Learner shell behavior used by the core journey.
- Course catalog and filtered course routes.
- Course detail and generic lesson player routes.
- The routed `/flashcards` page and its current practice flow.
- Reward presentation and `/progress` confirmation.
- Shared design tokens and learner-page primitives required by these routes.
- Loading, empty, error, retry, authentication-required, and reduced-motion
  states for touched surfaces.
- Focused component tests and a mobile Playwright journey.

### 3.2 Deferred until the core journey is stable

- Core educational games beyond links required by the core journey.
- PWA installability, service-worker registration, and offline shell.
- Pets, stickers, daily challenge, leaderboard, profile polish, and reporting.
- Broad route lazy-loading or bundle restructuring unless measurements establish
  a separate performance blocker.

### 3.3 Out of scope

- New features or parity work in `mobile/rn/**` or `mobile/unity/**`.
- Admin UI redesign.
- MindAR, WebAR, XR, or native AR redesign.
- Direct client access to PostgreSQL, Supabase database tables, MongoDB, or any
  persistence implementation.
- FastAPI contract redesign, authentication redesign, or client-side ownership
  of authoritative progression.
- A new UI framework or general-purpose component library.

## 4. Existing contracts to preserve

### 4.1 Routing and access

- Existing route URLs and deep links remain valid.
- `RequireLearnerAccess` continues to govern guest-capable learner routes.
- `RequireUserAuth` continues to govern authenticated progression and reward
  surfaces.
- Guest access is not silently expanded to authenticated endpoints.
- Browser Back and Forward follow navigation history; the UI must not replace
  history merely to hide navigation defects.
- The initial flashcard target is the component currently routed at
  `/flashcards`. Other flashcard pages are not merged implicitly.

### 4.2 API and data

- `apiClient` and existing feature services remain the client transport
  boundary.
- Request URLs, request payloads, authentication headers, response mapping, and
  storage behavior remain unchanged unless separately approved.
- Loading and error UI may adapt service results but must not invent successful
  domain data.
- Demo/fallback content must be visibly distinguishable where its presence could
  be mistaken for authoritative learner progress.

### 4.3 Gamification

- The backend decides authoritative XP and progression.
- The UI never calculates, persists, or awards authoritative XP.
- Retrying the same semantic reward action reuses its stable `event_id`.
- HTTP retry is not a new reward event.
- Reward presentation uses the completion/reward response, then refreshes or
  invalidates authoritative progression data.
- A stale progress refresh must not trigger another reward mutation.

## 5. Information architecture

### 5.1 Primary learner destinations

The learner shell must make these destinations easy to reach on mobile:

1. Learn: `/courses`.
2. Path: the current learning-path destination.
3. Practice: `/flashcards`.
4. Progress: `/progress` for authenticated learners.
5. More: secondary destinations exposed by the existing shell pattern.

This specification does not require a shell rewrite. If navigation density on a
375px viewport prevents the requirements below, a separate shell extraction
task may split the current component while preserving its route metadata,
access policy, focus management, and saved preference behavior.

### 5.2 Page anatomy

Touched learner pages use a common anatomy where applicable:

- learner page frame with safe-area and shell spacing;
- one page-level heading;
- optional short subtitle or progress context;
- one visually dominant primary action;
- content sections with consistent vertical rhythm;
- semantic loading, empty, error, and retry states; and
- a stable next action at completion.

The shared implementation may consist of four bounded primitives:

- `LearnerPageFrame`: canvas width, responsive padding, and overflow contract;
- `LearnerPageHeader`: heading, description, and optional contextual action;
- `LearnerSection`: labelled content grouping and spacing;
- `LearnerPageState`: loading, empty, error, and retry semantics.

These primitives remain presentational. They do not import auth, router,
feature services, or gamification logic.

## 6. Visual system

### 6.1 Direction

Use a vibrant, tactile claymorphic language suitable for young learners. The
experience should feel playful without reducing readability or turning every
surface into a competing call to action.

The UI-UX Pro Max research supports claymorphism for educational applications,
solid playful surfaces, visible interaction feedback, and short 150-300ms
transitions. The repository's existing brand palette and components remain the
baseline; the tool-generated palette is guidance, not a replacement mandate.

### 6.2 Token contract

- Existing values in `frontend/src/design-tokens/claymorphic.ts` remain valid
  compatibility tokens during migration.
- Semantic CSS aliases may describe canvas, surface, text, muted text, learning,
  success, reward, danger, focus, control radius, surface radius, touch size,
  and motion duration.
- Legacy variables map to semantic aliases before consumers are migrated.
- A slice must not add a page-local color when an existing semantic role covers
  the same meaning.
- Raw color does not communicate status without text, an icon, or another
  non-color indicator.

### 6.3 Typography and icons

- Keep Baloo 2 for expressive learner headings where it is already used.
- Body text uses the existing readable application font; changing the global
  body family requires measured layout and loading evidence.
- Minimum body copy is 16px on learner content unless space is genuinely
  constrained and contrast remains compliant.
- Use one consistent SVG icon language on touched controls.
- Emoji may appear as learning content or decorative copy, but not as the sole
  label or state indicator for an interactive control.

### 6.4 Surfaces and motion

- Clay depth uses solid or high-opacity surfaces, rounded corners, borders, and
  controlled shadows.
- Hover effects must not be required to understand or operate a control.
- Hover and press feedback must not cause surrounding layout shift.
- Essential transitions last 150-300ms.
- Under `prefers-reduced-motion: reduce`, continuous, parallax, bounce, shimmer,
  and decorative entrance animations stop. The final readable state remains
  visible without waiting for animation completion.

## 7. Responsive and touch contract

- The primary design viewport is 375px wide.
- Required review widths are 375px, 768px, 1024px, and 1440px.
- Interactive targets are at least 48px by 48px in learner navigation and
  primary activity controls.
- Adjacent touch targets have at least 8px separation unless their combined
  control supplies equivalent hit-area protection.
- No touched route produces horizontal document scrolling at required widths.
- Fixed or sticky controls respect `env(safe-area-inset-top)` and
  `env(safe-area-inset-bottom)` where applicable.
- Content is not hidden behind the mobile navigation, desktop rail, virtual
  keyboard, or fixed completion controls.
- Orientation changes preserve the learner's current activity and selected
  item.
- Desktop sidebar spacing is owned by the shell. Pages do not add a second
  hard-coded sidebar offset.

## 8. Accessibility contract

- Every page has one discoverable `main` region and one page-level `h1`.
- A skip link allows keyboard users to bypass repeated learner navigation.
- Keyboard focus follows visual order and never becomes trapped outside an
  intentional modal or sheet.
- Closing the More sheet or modal restores focus to its trigger.
- All form inputs have programmatic labels and associated error descriptions.
- Errors use `role="alert"`; non-blocking loading and success updates use an
  appropriate live region.
- Clickable cards use a native interactive element or implement equivalent role,
  keyboard, focus, and disabled semantics.
- Focus indicators remain visible on clay surfaces.
- Normal text meets a 4.5:1 contrast ratio; large text meets 3:1.
- Images have meaningful alt text or are explicitly decorative.
- Progress, correctness, locked state, and reward status are not conveyed by
  color alone.
- The journey remains operable at 200% browser text zoom.

## 9. Journey requirements

### 9.1 Authentication

- Login and registration share the same visual hierarchy and field behavior.
- Submit controls expose loading and disabled states without changing form
  dimensions.
- Authentication errors are announced and remain visible until the learner
  edits or resubmits.
- Successful authentication enters `/courses` using the existing session and
  post-login loading behavior.
- Guest entry, where currently supported, clearly communicates that reward and
  progress destinations require authentication.

### 9.2 Course discovery and detail

- The catalog identifies the current filter or path and provides a way back to
  all courses.
- Course cards expose title, topic/category, progress when authoritative data is
  available, and a clear Start or Continue action.
- Loading preserves page structure with a semantic progress state.
- Empty catalog states distinguish no published data from an applied filter
  returning no matches.
- Error states explain that courses could not be loaded and expose a retry.
- Course detail identifies lesson order, completion state, duration or activity
  metadata when available, and the next recommended lesson.

### 9.3 Lesson player

- The learner can see the current step, total steps, and completion state.
- Each activity presents one dominant action and prevents accidental duplicate
  submission while a request is pending.
- Media failure produces a recoverable fallback and does not block unrelated
  text or activities.
- Quiz and pronunciation feedback explains success, retry, or unavailable
  capability without relying on color.
- Refresh or resume returns the learner to the coherent session state supplied
  by current APIs.
- Completion transitions to reward presentation only after authoritative
  completion succeeds.

### 9.4 Flashcard practice

- The `/flashcards` route identifies category or selection context and makes
  the selected card visually and programmatically clear.
- Card flip and selection are accessible by touch and keyboard.
- Audio controls have an accessible name and a visible playing/unavailable
  state.
- Pronunciation practice explains permission, listening, evaluating, feedback,
  retry, and unsupported-browser states.
- Game launch controls use SVG icons or text labels, not emoji-only controls.
- API failure exposes a truthful fallback or error state; fallback data is not
  presented as saved learner progress.

### 9.5 Reward and progress closure

- Completion shows the authoritative reward once for the semantic event.
- The reward surface names the completed activity, received progression where
  supplied, and one clear next action.
- Closing or continuing from reward cannot submit the reward mutation again.
- Progress refresh reflects the backend response or a subsequent authoritative
  fetch.
- If refresh fails after a successful reward, the UI distinguishes “reward
  recorded, progress refresh unavailable” from “reward failed.”

## 10. Error and resilience model

Every touched asynchronous surface implements these distinct states:

| State | Required behavior |
|---|---|
| Initial loading | Preserve page context, announce loading, and prevent duplicate primary action |
| Empty | Explain why no content is available and provide the next valid action |
| Recoverable error | Keep useful context, announce the error, and provide retry |
| Authentication required | Preserve the intended destination where supported and direct the learner to sign in |
| Offline/network unavailable | Avoid claiming a domain failure; offer retry when connectivity returns |
| Partial success | State what succeeded and what could not refresh |
| Unsupported capability | Offer a usable non-capability path when product behavior allows it |

Retrying a read is safe. Retrying a reward mutation must preserve its semantic
event identity.

## 11. Performance constraints

- Measure before introducing memoization, virtualization, or router-level code
  splitting.
- The learner shell must not import AR/Three.js modules merely to render core
  navigation.
- Touched images use the existing responsive media utilities where applicable,
  include intrinsic dimensions, and avoid layout shift.
- A shared primitive must not import a feature service or create a network
  request.
- New page templates add no runtime dependency.
- Performance warnings and bundle sizes are baselined before implementation;
  a significant regression becomes a separate blocking task with evidence.

## 12. Verification and acceptance

### 12.1 CODE_VERIFIED

- Focused Vitest/Testing Library tests cover the changed component behavior.
- Route/access characterization tests prove URLs and guards remain coherent.
- Tests assert roles, names, states, and behavior instead of brittle styling or
  emoji markup.
- `npm.cmd run build` succeeds from `frontend/`.
- `npm.cmd run lint -- --quiet` succeeds, or pre-existing unrelated failures are
  recorded with exact evidence and no regression from the slice.

### 12.2 RUNTIME_VERIFIED

In a running browser environment, verify:

1. authentication and session transition;
2. course loading, filtering, detail, and lesson entry;
3. lesson activity progress and completion;
4. flashcard selection, audio/pronunciation capability behavior;
5. authoritative reward presentation and progress refresh;
6. refresh, deep link, Back, error, and retry behavior; and
7. no duplicate reward request for the same semantic event.

The runtime uses the intended backend or a documented controlled backend with
reproducible fixtures.

### 12.3 DEVICE_BROWSER_VERIFIED

- Exercise the core journey in Chrome Android and Safari iOS on real devices
  when available.
- Responsive-mode results are labelled `EMULATION_VERIFIED`, not
  `DEVICE_BROWSER_VERIFIED`.
- Record viewport/device, browser version, backend environment, evidence paths,
  and failures in `docs/frontend-web/progress/`.
- Verify touch targets, safe area, virtual keyboard, audio permission, 200% text
  zoom, reduced motion, orientation, and absence of horizontal scrolling.

Final graduation acceptance requires mobile-browser runtime evidence; desktop
browser results alone are insufficient.

## 13. Delivery slices

The implementation plan must map every task to one independently testable
deliverable in this order:

1. Baseline route, shell, token, accessibility, and performance contracts.
2. Minimal learner-page primitives used by the first slice.
3. Authentication to course catalog.
4. Course detail to lesson entry.
5. Lesson activity and completion.
6. Flashcard and pronunciation practice.
7. Reward to authoritative progress confirmation.
8. Cross-route mobile E2E and device-browser release verification.
9. Games only after slices 1-8 pass their gates.
10. PWA installability and offline shell only after the core flow is stable.

Each slice ends with focused tests, build/lint, browser runtime evidence, and an
append-only progress record. It must not combine an unrelated architecture,
backend persistence, AR, admin, or native-client refactor.

## 14. Spec completion criteria

This specification is ready for implementation planning when product ownership
confirms:

- the progressive vertical-slice scope;
- preservation of current route, API, auth, and reward contracts;
- the claymorphic visual and accessibility direction;
- the core journey and delivery order; and
- the separation of games/PWA and out-of-scope surfaces.
