# Adaptive Mission Path — Course Experience Design

**Status:** Draft for review
**Date:** 2026-08-31
**Primary surface:** `frontend/**` responsive mobile web
**Scope:** Generic catalog, learning-path guidance, course detail, and lesson-content orchestration

## 1. Decision summary

Keep the current course catalog as the learner's entry point. Enhance it with one adaptive next action, then turn the generic course detail page into a vertical mission path. The path is composed from the course's existing ordered lessons and each lesson's existing content blocks.

The experience is intentionally a hybrid:

- **Path-first:** learners can see where they are, what is complete, and what comes next.
- **Mission-first:** the top of the catalog and course page always offer one obvious action.
- **Adaptive:** `current_lesson_id`, completed lessons, lesson progress, and learning-path preferences choose the next action deterministically.

No new recommendation service, database table, client-side XP calculation, or native-client work is required for the first slice.

The existing `/learning-path-3d` route remains a separate optional experience. It is not the source of truth for the generic catalog path.

## 2. Problem and evidence

The generic product already has the important ingredients: catalog cards, learning-path preferences, lesson sessions, step attempts, vocabulary, games, stories, pronunciation, quizzes, media, rewards, and progress. The main gap is hierarchy:

`/courses` currently behaves primarily as a catalog, while `/courses/:id` presents lessons as a flat list. The learner must decide what to do next even though the backend already stores `current_lesson_id` and completed lessons. `CourseMap` contains a promising node visual, but is not connected to the generic course route and contains hardcoded destinations.

The backend also already supports a canonical `learning_blocks.activities` envelope and exposes activity-ordered lesson session steps. Legacy lesson fields remain available for existing course content. This makes a presentation/orchestration enhancement safer than a new content model.

Duolingo's first-party product documentation describes units organized around communication goals, bite-sized lessons, a mixture of speaking/listening/reading/writing, and personalized practice inside the path. Its mini-unit research write-up also describes introducing a small amount of new material and putting it into use soon after. These are product patterns to adapt, not a claim that copying the UI guarantees the same outcomes.

Learning research supports making the content sequence interactive: retrieval practice with feedback has shown benefits for delayed vocabulary performance in several language-learning contexts. The evidence varies by learner age, language, task, and spacing interval, so the design uses it as a bounded interaction principle rather than a promise of learning gains.

Research sources are recorded in [`report-source.md`](../../../report-source.md).

## 3. Goals

### Must achieve

1. A learner opening `/courses` can immediately see and start the most relevant next lesson.
2. A learner opening `/courses/:courseId` can understand the course journey without scanning a flat list.
3. Each lesson preview makes its content concrete: activity type, vocabulary/question count, media, duration, and reward where available.
4. Opening a lesson starts or resumes the existing server-backed session.
5. Completing a lesson returns authoritative progress/reward data and updates the next mission.
6. The experience works at 375–428px mobile widths without horizontal overflow or unreachable controls.
7. Existing course and lesson APIs remain compatible with the paused RN/Unity clients.

### Explicitly out of scope

- A machine-learning recommender or new recommendation endpoint.
- A new unit/section database schema in the MVP.
- Client-authoritative XP, reward persistence, or direct database access.
- Replacing the generic flow with the Three.js learning-path scene.
- Rebuilding the Animals Adventure showcase as the generic course contract.
- Hearts, lives, punitive blocking, leaderboards, or a full gamification redesign.
- Migrating every legacy course in the same change.

## 4. Information architecture

```text
Catalog (/courses)
  ├─ Next Mission card (one primary action)
  ├─ Learning-path context (priority topic / daily goal / progress)
  └─ Course cards (browse and choose another course)
       ↓
Course Mission Path (/courses/:courseId)
  ├─ Course header + progress
  ├─ Presentation-only units/chunks
  │    └─ Lesson nodes: completed / current / locked / review
  └─ Lesson detail bottom sheet or accessible dialog
       ↓
Lesson (/courses/:courseId/lessons/:lessonId)
  ├─ Server-backed session
  ├─ Ordered activity steps
  │    ├─ warm-up / learn vocabulary
  │    ├─ listen / match / drag / memory / mini-game
  │    ├─ read aloud / pronunciation
  │    └─ quiz / finish
  ├─ Immediate feedback and retry at step level
  └─ Backend-authoritative completion → reward/progress → next mission
```

The catalog remains the product's top-level course discovery surface. The learning path is an enhancement layer over catalog and progress, not a second independent content hierarchy.

## 5. Contract mapping

### 5.1 Catalog and recommendation inputs

Use the data already loaded by `CourseList`:

- `Course[]` from `CourseService.listCourses()`.
- `UserProgress[]` from `CourseService.getProgress()`.
- Learning-path preferences from the existing learning-path API/client flow.

Learning-path preferences are a ranking signal. They do not create, rename, or reorder the authoritative lesson sequence inside a course.

### 5.2 Course and lesson inputs

Use `Course.lessons` sorted by the backend-provided `order` value, with `lesson_id` as the stable identity. Do not infer domain units from array position as if they were persisted backend units.

For lesson previews, prefer canonical `lesson.learning_blocks.activities` when present. The canonical activity list is already ordered and includes `activity_id`, `type`, `title`, `order`, `required`, and completion policy. When canonical activities are absent, derive a preview from the existing legacy fields in this order:

1. `videoLesson` / `lesson_media`.
2. `game`.
3. `vocabulary`.
4. `readAloudStory`.
5. `pronunciation`.
6. `quiz`.

The fallback is for presentation and compatibility. It must not mutate the API payload or create a second persisted content model.

### 5.3 Lesson session inputs

When a learner opens a lesson, the existing session contract is authoritative:

- `current_step_id` and `current_step_index` determine resume position.
- `steps[]` determines the server-approved step sequence and step status.
- `submit_lesson_step` persists the attempt and returns the updated session.
- `complete_lesson` returns the authoritative completion/progress/reward result.

The client may render optimistic visual feedback for a tap or selection, but it must not mark a lesson complete, unlock a future lesson for security purposes, or add XP without the backend response.

## 6. Adaptive next-action algorithm

Implement the selection as a pure, deterministic view-model function so it can be unit tested without React or network calls.

### Inputs

```ts
type NextActionInput = {
  courses: Course[];
  progress: UserProgress[];
  priorityTopics: string[];
};
```

### Selection order

1. For each in-progress course, use a valid `current_lesson_id` that exists in that course and is not completed.
2. If the stored current lesson is stale or already completed, choose the first incomplete lesson by `order` in that same started course.
3. Choose the first incomplete lesson in a course matching the first available `priorityTopics` value. Matching uses the existing course/topic key semantics; malformed or unknown topics fall through.
4. Choose the first incomplete lesson in any started course.
5. Choose the first lesson in the first published available course.
6. If no course has a lesson, show a browse/empty state and no lesson CTA.

Tie-breakers are stable: API course order first, then ascending lesson order. A completed course is not selected as a new mission unless the learner explicitly chooses a completed lesson for review.

The output should include:

- `courseId` and `lessonId`.
- `status`: `continue`, `start`, or `review`.
- A short reason such as `continue_where_left_off`, `priority_topic`, `started_course`, or `first_lesson`.
- Lesson metadata needed by the card: title, duration, primary activity, content counts, and reward preview.

The algorithm must validate every ID before producing a navigable href. A stale ID is a fallback condition, not a fatal render error.

## 7. Course mission path

### 7.1 Presentation-only units

`CourseDetail` groups the sorted lesson list into stable visual chunks of four lessons for the MVP. The chunk is called a “chặng”/mission group in the UI, but it is not persisted and must not be presented as a backend prerequisite or curriculum unit.

If a future API adds an explicit unit/section field, the adapter may use it without changing the rendered node contract. Until then, the grouping is only a way to provide rhythm and reduce the visual weight of a long list.

### 7.2 Node states

Derive states with this precedence:

1. `completed`: lesson ID is in `completed_lessons`.
2. `current`: valid `current_lesson_id` and the lesson is not completed.
3. `available`: first incomplete lesson when no valid current lesson exists.
4. `locked`: a later incomplete lesson after the current/available lesson.
5. `review`: a completed node when the learner taps it intentionally.

The UI lock is a presentation cue. It is not an authorization boundary and must not be used to imply that a direct URL is secure. Backend/session validation remains authoritative.

Each node displays only the information needed to choose:

- lesson title and Vietnamese title where available;
- duration;
- primary activity label/icon;
- small content counts such as words/questions;
- current/completed/locked state;
- reward preview only when supplied by the lesson contract.

### 7.3 Mobile interaction

On mobile, tapping a node opens an accessible bottom sheet/dialog with:

- title, description, state, duration, activity summary, and reward preview;
- one primary action: Continue, Start, or Review;
- close action and escape/back behavior;
- no nested navigation or competing primary CTAs.

On larger screens the same information may appear in an inline card or dialog, but the semantic model stays the same.

`CourseMap` may be reused for the visual language only after its hardcoded routes and empty-state copy are removed. The generic route supplies lesson hrefs and callbacks; the component must not decide whether to navigate to `/learn-ar`, `/flashcards`, or another unrelated feature.

## 8. Lesson content experience

### 8.1 Content hierarchy

The lesson screen should feel like one small mission, not a dashboard of unrelated widgets:

1. Mission header: title, duration, step progress, and a short goal.
2. One active activity at a time, chosen by the server session step.
3. One clear learner action.
4. Immediate feedback with a retry/continue path.
5. Completion summary with the next mission action.

The learner should not have to select the next activity from a tab bar. The current step is selected from `LessonSession.current_step_index` and the ordered `steps[]` response.

### 8.2 Activity mapping

The content adapter maps the canonical activity type to a renderer and preview:

| Canonical type | Learner-facing role | Existing content/contract to reuse |
|---|---|---|
| `warm_up` | quick visual/audio entry | lesson media and step attempt |
| `learn_vocabulary` | see/hear a small word set | vocabulary activity hydration or lesson vocabulary |
| `listen_choose` | listen and choose | vocabulary/audio content and step attempt |
| `match` / `drag_drop` | active recall with pictures | existing game/practice primitives |
| `memory_match` / `mini_game` | playful challenge | mini-game activity endpoints/components |
| `read_aloud` | short story + read/listen | `readAloudStory` and audio |
| `pronunciation` | say target words | pronunciation service and task data |
| `quiz` | checkpoint questions | quiz activity endpoint or existing quiz flow |

The legacy fields remain supported for existing seed/course payloads. When a canonical activity references content that is unavailable, show an explicit recoverable activity error and keep the step incomplete; do not silently mark it passed.

### 8.3 Questions and feedback

Question interactions must use the existing server contracts where available. The UI may show immediate local feedback for responsiveness, then reconcile with the session/activity response. Correct and incorrect states must be visually and textually distinct, and the learner must be told what to do next.

The first content slice should favor short sequences that mix recognition and retrieval:

- introduce a small set of words or a visual/audio prompt;
- ask the learner to retrieve or identify them;
- vary the interaction type when content exists;
- finish with a short quiz/checkpoint;
- surface a review/retry path when the learner misses items.

This is orchestration of authored content, not client-side generation of new questions.

## 9. Completion, reward, and refresh

The canonical completion loop is:

```text
activity interaction
  → POST step attempt / activity answer
  → updated LessonSession
  → final required step passes
  → POST lesson completion
  → authoritative reward/progress response
  → refetch course progress
  → next mission CTA
```

Rules:

- XP and reward values are displayed from backend responses only.
- A replayed completed lesson is review and must not create a duplicate reward.
- After a successful completion, the lesson player shows the reward only after the completion response resolves.
- Returning to `CourseDetail` or `CourseList` refetches progress before recomputing the next action.
- A failed completion request keeps the learner in a recoverable state and does not show a false success.

## 10. Failure and empty-state behavior

### Catalog/course loading

- While loading, show a mobile-safe skeleton or progress indicator.
- If courses fail, preserve the existing catalog fallback behavior where available, but label it as demo/preview content.
- Never display hardcoded demo XP as authoritative user progress.
- If no published course has lessons, show a clear empty state and remove the Start CTA.

### Progress/preferences failure

- Courses remain browsable if progress or learning-path preferences fail.
- The app may offer the first available lesson as a generic Start action only when the existing start/session API can handle it.
- Show “personalization unavailable” or equivalent non-blocking copy rather than pretending a priority was applied.

### Stale progress

- Validate `current_lesson_id` against the loaded course before navigation.
- Fall back to the next incomplete lesson in stable order.
- Do not crash or render a broken href.

### Direct lesson URL

- A direct lesson URL must still load through the existing backend/session validation.
- The visual locked state is not a security mechanism.
- If the lesson is not found or is not available to the current user, show the existing not-found/error state.

### Unsupported content

- Identify the activity and explain that it cannot be loaded right now.
- Keep progression incomplete.
- Offer Back to course path and retry; do not skip required content silently.

## 11. Visual and accessibility direction

Use the existing claymorphic, friendly visual language rather than introducing a new design system:

- vertical single-column mobile composition;
- clear color-coded status, with text/icon labels in addition to color;
- soft press states and short ease-out transitions;
- maximum one or two attention animations in a viewport;
- respect `prefers-reduced-motion`;
- all interactive nodes, buttons, and sheet controls at least 44×44px;
- no hover-only meaning or interaction;
- readable contrast and visible focus states;
- bottom-sheet/dialog focus management and keyboard escape behavior;
- progress announcements for screen readers when a step completes.

The visual objective is “alive because the learner is doing something,” not “busy because the page is animated.”

## 12. Proposed frontend boundaries

These are implementation boundaries for the later plan, not a request to add all files immediately:

- `frontend/src/pages/CourseList.tsx`
  - load/compose `NextMissionCard` view model;
  - keep catalog cards as browse fallback.
- `frontend/src/pages/CourseDetail.tsx`
  - replace the flat lesson presentation with mission-path data and state.
- `frontend/src/features/courses/components/CourseMap.tsx`
  - make it a generic presentational path component with supplied href/callbacks.
- `frontend/src/features/courses/components/`
  - add focused components for mission header, lesson node, node dialog, and activity preview only where reuse does not make existing components harder to understand.
- `frontend/src/features/courses/`
  - add pure adapters/selectors for next action, lesson status, presentation units, and activity summaries.
- `frontend/src/pages/LessonPlayer.tsx`
  - preserve session/completion calls; align visible content with the server step sequence and add safe handling for canonical activity metadata.
- `frontend/src/features/courses/types.ts`
  - add only client-side view-model types or missing read-only contract fields that already exist in API responses; do not invent persistence fields.

No backend file needs to change for the first path/catalog slice. Any later canonical activity renderer must reuse the current FastAPI activity/session endpoints and preserve response semantics.

## 13. Testing and acceptance

### Pure selector/adapter tests

- valid current lesson is selected first;
- stale current lesson falls back to the next incomplete lesson;
- completed current lesson falls forward;
- priority topic influences ranking without hiding other courses;
- started-course and first-course fallbacks are deterministic;
- no lesson produces a safe empty state;
- lesson fields map to the correct primary activity and counts;
- presentation units are stable and do not mutate course order;
- status precedence is completed → current/available → locked, with review as an explicit action.

### Component tests

- catalog renders one next mission CTA;
- CTA href contains a validated course and lesson ID;
- course path renders completed/current/locked states;
- node dialog exposes one primary action and closes accessibly;
- reward/progress display appears only after the completion response;
- loading, progress failure, stale ID, and no-content states remain usable.

### Browser tests

At minimum, use 375px, 390px, 428px, and a desktop width:

1. new learner → catalog → first mission → course path;
2. in-progress learner → Continue goes to the stored current lesson;
3. priority topic → matching incomplete course is preferred;
4. stale progress → deterministic fallback, no broken href;
5. course path → tap current node → resume lesson session;
6. answer/complete lesson → authoritative reward/progress → next mission;
7. completed lesson → Review works and does not duplicate XP;
8. direct lesson URL and browser back navigation;
9. loading/API failure/unsupported-content recovery;
10. no horizontal overflow and no CTA hidden behind mobile navigation.

Existing Animals Adventure tests remain unchanged and are not evidence that the generic flow is complete.

### Release verification

- `CODE_VERIFIED`: frontend typecheck/build, focused Vitest, and backend course/gamification regression tests.
- `RUNTIME_VERIFIED`: run the generic catalog → course → lesson → completion flow against the dev server.
- `DEVICE_BROWSER_VERIFIED`: exercise the learner flow in a real mobile browser when release acceptance is claimed. Responsive desktop screenshots alone are insufficient.

## 14. Phased delivery

### Phase 1 — Catalog and path shell

- Pure next-action selector and tests.
- Next Mission card in `/courses`.
- Presentation-only units and node states in `/courses/:courseId`.
- Rewire `CourseMap` to generic lesson callbacks/hrefs.
- Mobile dialog/sheet and accessibility states.

### Phase 2 — Activity-aware lesson presentation

- Activity summary/preview adapters for canonical and legacy lesson content.
- Align lesson player navigation with server session steps.
- Make the sequence of vocabulary, question, game, pronunciation, story, and quiz content visually coherent.
- Add completion → refetch → next mission transition.

### Phase 3 — Review quality and measurement

- Short recurring review node using existing activity/progress data.
- Mistake/retry presentation improvements.
- Only after the core flow is stable, consider additive analytics or an explicit backend next-action response.

## 15. Best-of-N decision record

Three independent approaches were compared against delivery speed, contract safety, learner clarity, and long-term maintainability:

| Approach | What it optimizes | Main weakness | Decision |
|---|---|---|---|
| Path-first | Strong course journey and visual nodes | Can invent unit semantics when the backend has no unit ID | Keep as the course-detail presentation |
| Mission-first | Fastest visible improvement and one clear CTA | Does not by itself make the full course feel like a journey | Keep as the catalog/course entry layer |
| Adaptive hybrid | Uses catalog, preferences, progress, ordered lessons, and sessions together | Requires a small selector/adapter layer | **Selected** |

The selected approach is the smallest one that addresses both parts of the request: the catalog stays familiar, while the learner gets a more alive, guided experience inside each course and lesson.

## 16. Open approval points

The following choices are intentionally fixed for this design unless product review changes them:

1. Generic `/courses` remains the entry point; the existing 3D path is not promoted to primary navigation.
2. Learning-path preferences rank catalog actions; they do not become a separate course-content source.
3. Four-lesson presentation chunks are visual grouping only.
4. Existing FastAPI/session/reward contracts remain authoritative.
5. Canonical `learning_blocks.activities` is preferred for new content; legacy fields remain fallback-compatible.
6. No new API/schema or client-side reward logic is part of the first implementation slice.
