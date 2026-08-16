# LC3 Data-Driven Quiz Activity Contract

## Status

- Requirements: **LOCKED**
- Backend contract: **IMPLEMENTED**
- ORM/live schema: **VERIFIED**
- Focused tests: **TESTED**
- RN contract: **IMPLEMENTED**
- RN quiz UI/runtime: **IMPLEMENTED**
- LearningSession quiz integration: **IMPLEMENTED**
- Data-driven RN/backend vertical slice: **TESTED (AUTOMATED CONTRACT)**
- Production Quiz content: **NOT SEEDED**
- Runtime device: **NOT VERIFIED**

## Persistence decision

Live PostgreSQL inspection found stable bigint quiz-question IDs, flashcard ownership, existing question type/answer fields, and option identity `(question_id, option_order)`. Current data uses `multiple_choice` and `true_false`.

LC3 maps the existing tables through SQLAlchemy. Learner option identity is derived as `{question_id}:{option_order}`. No schema gap exists.

**NO SQL/ALEMBIC MIGRATION REQUIRED.** Read-only Alembic comparison reported no upgrade operations; current/head remain `20260814_orm_baseline`.

## Runtime/API contract

- Quiz config uses canonical question IDs, an optional bounded count, and authored/random question ordering; options retain canonical order.
- `GET /courses/{course_id}/lessons/{lesson_id}/activities/{activity_id}/quiz` returns render-safe questions/options without answer keys and preserves random selection in existing session-step JSONB.
- `POST .../quiz/answers` receives only a question/option identity; the backend evaluates correctness, appends `lesson_step_attempts`, and completes the existing quiz step after all selected questions are attempted.
- No extra quiz-session/progress table, XP rule, content seed, assets, Unity work, or polished RN UI was added.

## RN quiz runtime

- `QuizActivityRenderer` hydrates only through the LC3 quiz activity API and renders the backend-provided order unchanged.
- The current LC3 DTO supports `multiple_choice` and `true_false`; both render as text options. It has no learner image or audio URL, so no media contract is fabricated.
- RN submits only `{ question_id, option_id }`. Correctness feedback comes only from the answer response; no answer key or correctness data is present in hydration.
- The renderer blocks duplicate submits, retains a selected answer after transport failure for retry, safely surfaces empty/malformed payloads, and calls the existing `LearningSession` completion boundary only after the backend returns `completed: true`.
- `LearningSessionScreen` retains its legacy children slot unless an optional schema-v2 quiz activity plus course/lesson IDs is supplied.
- The existing `CourseDetail → LessonPlayer` route carries the already backend-loaded lesson payload. When its first activity is `quiz`, `LessonPlayer` enters `LearningSessionScreen`; non-quiz and legacy lessons keep the original player path.

## Verification

```powershell
.venv\Scripts\python.exe -m pytest backend/tests/test_quiz_activity_contract.py backend/tests/test_lesson_activity_contract.py backend/tests/test_completion_transaction_boundary.py backend/tests/test_course_service_gamification.py backend/tests/test_course_start.py backend/tests/test_orm_learner_foundation.py -q -p no:cacheprovider
```

Result: **51 passed**.

```powershell
.venv\Scripts\alembic.exe check
```

Result: **No new upgrade operations detected**.

```powershell
node --test --experimental-strip-types --import "data:text/javascript,import { register } from 'node:module'; import { pathToFileURL } from 'node:url'; register('./ts-resolver-hook.mjs', pathToFileURL('./'));" src/__tests__/quiz-activity-renderer.test.ts
```

Result: **9 passed**.

`npx.cmd tsc --noEmit` reports **no new LC3 errors**. Five unrelated pre-existing AR/gamification errors remain in `ARExperienceMapper.ts`, `useARSession.ts`, `useGamification.ts`, `api.ts`, and `gamificationService.ts`.

The automated route/API contract proves `CourseDetail → LessonPlayer → LearningSession → QuizActivityRenderer`, including backend-provided activity data, identity-only submission, and backend completion authority. The backend LC3 suite supplies the in-process API/session contract evidence. No physical-device runtime was performed.
