# Lessons Design Spec — Course Content Authoring & Learner Experience

**Status:** Draft — pending user review
**Date:** 2026-07-22
**Owner:** UX Designer (planning) · English teacher (domain)
**Target repo:** `Edu-platform` monorepo (FastAPI backend + React/Vite frontend)

---

## 1. Background & Problem Statement

### 1.1 What the codebase already has

The team has built most of the **plumbing** for lessons:

- The backend `Lesson` model (`backend/models/course_model.py:202–244`) is a fully Duolingo-style rich document with fields for `vocabulary[]`, `quiz[]`, `pronunciation`, `game`, `readAloudStory`, `reward`, `arReference`, `scene_images[]`, `video_url`, etc.
- The learner-side `LessonPlayer.tsx` (`frontend-web/src/pages/LessonPlayer.tsx:172–1335`) **already conditionally renders** every block type — intro → watch → story → game → words → read → say → quiz → finish.
- A separate `CourseLesson` Beanie document (`backend/models/course_lesson.py`) with its own `course_lessons` MongoDB collection exists in parallel — but it is **not wired** to the main course flow and should be treated as dormant.
- The flashcard system (`backend/api/flashcards.py` + `FlashcardEditor.tsx`) is the existing **per-block-type editor** reference pattern.

### 1.2 What is missing

**Authoring UX, not data.** Today the only place a teacher can build lessons is the `CourseEditor.tsx` Sessions tab. It only supports three block types:

- `text` (rich-text notes)
- `video` (single URL)
- `image` (single URL)

`sessionToLesson()` at `CourseEditor.tsx:132–159` only fills `content`, `video_url`, and `images`. A teacher cannot create vocabulary items, quiz questions, pronunciation tasks, games, read-aloud stories, rewards, or AR references through any UI — even though the backend accepts them.

### 1.3 The learner-side bug this creates

`CourseDetail.tsx:208–239` renders zero lesson cards when `course.lessons` is empty. The CTA's "Start learning" handler (`CourseDetail.tsx`) navigates to `/courses/:id/lessons/${course.lessons[0]?.lesson_id}` — so an empty course navigates to **`.../lessons/undefined`**. A published course with no lessons is broken on the learner side, not just incomplete.

### 1.4 Goal of this design

Turn the half-built lessons feature into a **complete, teacher-authorable, learner-consumable unit**, while:

- Treating embedded `CourseSchema.lessons[]` as canonical (per user decision)
- Staying internally consistent with `LessonPlayer`'s existing conditional rendering
- Following the per-block-type editor pattern proven by `FlashcardEditor`
- Fixing the broken empty-course learner flow

---

## 2. Scope

### In scope (v1)

1. **Teacher authoring** — A new Lesson Builder inside `CourseEditor.tsx` that lets a teacher compose a lesson as an ordered list of blocks, with one focused mini-editor per block type, fully bilingual EN/VI, and `arReference` wired to the existing ARCombo system.
2. **Learner-facing lesson list** — A redesigned horizontal stepper preview on `CourseDetail.tsx` that mirrors the order of `LessonPlayer`'s steps, plus a polished empty-state hero.
3. **Admin visibility** — Lesson-type breakdown chips in `CourseManager`.
4. **Per-lesson publish state** — Draft / Published per lesson, surfaced in authoring.
5. **Safe fallback** — Empty lessons arrays render a polished empty state; "Start learning" is disabled when no lessons exist.

### Out of scope (deferred)

- Migrating to the dormant `CourseLesson` separate collection
- Per-role RBAC granularity beyond `RequireTeacherRole`
- AI-assisted lesson content generation
- AR combo authoring (only the existing combos are referenced)
- Analytics dashboards per lesson type
- Versioning / history of lessons

---

## 3. Design Decisions (locked from brainstorming)

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **Embedded `CourseSchema.lessons[]` is canonical** | Already wired to `LessonPlayer` and `CourseDetail`; migrating to the separate collection is a parallel workstream. |
| D2 | **All Duolingo-style blocks exposed in v1** | The `LessonPlayer` already renders all of them; the gap has been the authoring UI, so we close it. |
| D3 | **Bilingual EN/VI at block level is required** | Matches the pattern at course level; prevents retrofitting later. |
| D4 | **Single `RequireTeacherRole` gate, per-block RBAC later** | Avoid premature complexity; collect signal first. |
| D5 | **Reorderable list with type icon + title + duration** as the authoring layout | Scales to long lessons; matches the platform's existing card vocabulary. |
| D6 | **Horizontal stepper preview** on the learner side | Mirrors `LessonPlayer`'s actual flow; sets accurate expectations. |
| D7 | **Polished empty state** for courses with no lessons | Fixes the `undefined` URL bug. |
| D8 | **`arReference` wired in v1** to existing ARCombo system | The field already exists in the model; the AR combo system already exists; only the picker was missing. |
| D9 | **Per-lesson Draft/Published state** | Lets teachers compose a course incrementally without exposing half-built lessons to learners. |

---

## 4. Architecture

### 4.1 Component map

```
frontend-web/src/
├── pages/
│   ├── admin/
│   │   ├── CourseEditor.tsx          # EXTEND: new Lesson Builder tab replacing Sessions
│   │   │   └── LessonBuilder/        # NEW: per-block-type subcomponents
│   │   │       ├── LessonBuilderShell.tsx
│   │   │       ├── BlockList.tsx
│   │   │       ├── BlockEditors/
│   │   │       │   ├── TextBlockEditor.tsx
│   │   │       │   ├── VideoBlockEditor.tsx
│   │   │       │   ├── ImageBlockEditor.tsx
│   │   │       │   ├── VocabularyBlockEditor.tsx
│   │   │       │   ├── QuizBlockEditor.tsx
│   │   │       │   ├── PronunciationBlockEditor.tsx
│   │   │       │   ├── ReadAloudBlockEditor.tsx
│   │   │       │   ├── GameBlockEditor.tsx
│   │   │       │   ├── RewardBlockEditor.tsx
│   │   │       │   └── ARReferenceBlockEditor.tsx  # picker over /api/v1/combos
│   │   │       └── PublishToggle.tsx
│   │   ├── CourseManager.tsx         # EXTEND: lesson-type breakdown chips per row
│   │   └── CourseLessonPreview.tsx   # NEW: teacher-side preview of player flow
│   ├── CourseDetail.tsx              # EXTEND: horizontal stepper preview + empty state
│   └── LessonPlayer.tsx              # UNCHANGED (already renders all blocks)
├── types/
│   └── course.ts                     # EXTEND: add draftBlock types (see §6)
```

### 4.2 Data flow

```
[Teacher] --opens CourseEditor--> [LessonBuilder tab]
                                       |
       add/edit/reorder blocks        |
                                       v
                            [Draft state in editor]
                                       |
                            save (PATCH /api/v1/courses/:id)
                                       |
                                       v
                  [MongoDB courses collection]
                  (course.lessons[] updated)
                                       |
       /api/v1/courses/:id             |
                    |                  |
                    v                  |
       [CourseDetail.tsx] --renders--> [LessonStepper] --click--> /lessons/:id
                                                                 |
                                                                 v
                                                    [LessonPlayer.tsx]
                                                    (existing conditional rendering)
```

### 4.3 Reuse boundaries

- **`LessonPlayer.tsx` is untouched.** It already renders every block type. The contract is: `Lesson` shape from `frontend-web/src/types/course.ts` is the canonical payload, and the block sub-fields are the source of truth.
- **`courseService.ts`** gets new helpers (`addLessonBlock`, `reorderLessonBlocks`, `publishLesson`) but the existing `updateCourse()` path is reused for batch saves.
- **AR system is reused,** not extended. `ARReferenceBlockEditor` is a thin picker over the existing `GET /api/v1/combos` listing.

---

## 5. User Experience

### 5.1 Teacher authoring — Lesson Builder

**Entry point:** `CourseEditor.tsx`, second tab renamed from "Sessions" to **"Lessons"**.

**Top-level layout:** a single Lesson container with a list of Blocks inside.

```
+----------------------------------------------------------+
| Course: "Animals A1"  [Details] [Lessons*] [Review]     |
+----------------------------------------------------------+
| Lesson 1                                              [⋮] |
|   Title: "Meet the animals"  [EN]  [VI: Gặp gỡ các con vật]|
|   Status: ● Draft                                       |
|                                                          |
|   Blocks:                                               |
|   ┌────────────────────────────────────────────────┐    |
|   │ 1.  📹  Intro video (Rabbit.mp4) — 0:42  [EN/VI]│    |
|   ├────────────────────────────────────────────────┤    |
|   │ 2.  📖  Vocab (5 words) — Rabbit, Cat, Dog,     │    |
|   │                          Bird, Fish  [EN/VI]   │    |
|   ├────────────────────────────────────────────────┤    |
|   │ 3.  🎮  Game — Tap the picture  [EN only]       │    |
|   ├────────────────────────────────────────────────┤    |
|   │ 4.  🗣  Pronunciation — "Rabbit"  [EN/VI]      │    |
|   ├────────────────────────────────────────────────┤    |
|   │ 5.  ❓  Quiz — 3 questions  [EN/VI]             │    |
|   ├────────────────────────────────────────────────┤    |
|   │ 6.  🎁  Reward — Sticker: Bunny  [EN/VI]       │    |
|   ├────────────────────────────────────────────────┤    |
|   │ 7.  📷  AR Combo — AnimalFriends  [EN/VI]       │    |
|   └────────────────────────────────────────────────┘    |
|   [+ Add block ▾]   [↑ Save draft]   [Publish lesson]   |
+----------------------------------------------------------+
| Lesson 2 (collapsed preview) ...                        |
| [Add lesson]                                             |
+----------------------------------------------------------+
```

**Per-block-type editor pattern** — clicking a block opens a side-drawer or modal with a focused mini-editor, mirroring the `FlashcardEditor` pattern.

**Block-types in v1 with field maps:**

| Block type | Editor | Fields captured | Maps to model field |
|------------|--------|-----------------|---------------------|
| `text` | `TextBlockEditor` | EN body, VI body, optional heading | `content`, `content_vi` (new) |
| `video` | `VideoBlockEditor` | URL, thumbnail URL, optional intro flag | `video_url`, `video_thumbnail`, `intro_video_url` |
| `image` | `ImageBlockEditor` | URL, alt EN, alt VI, caption | `images[]` |
| `vocab` | `VocabularyBlockEditor` | Word EN, Word VI, IPA, image URL, audio URL, plural form? | `vocabulary[]` |
| `quiz` | `QuizBlockEditor` | Question EN/VI, options[] (each EN/VI), correct index, explanation | `quiz[]` |
| `pronunciation` | `PronunciationBlockEditor` | Target phrase EN, phrase VI, audio prompt URL, scoring hint | `pronunciation` |
| `read_aloud` | `ReadAloudBlockEditor` | Story title EN/VI, paragraphs[] EN/VI, optional narration URL | `readAloudStory` |
| `game` | `GameBlockEditor` | Game type selector, prompt, answer key | `game` |
| `reward` | `RewardBlockEditor` | Reward type (xp / sticker / badge), value, label EN/VI | `reward` |
| `ar_reference` | `ARReferenceBlockEditor` | Combo picker (calls `GET /api/v1/combos`), preview AR tag | `arReference` |

**Add Block menu** — collapsible dropdown grouped by category: *Media · Vocab & Practice · Interactive · Meta*.

**Per-block error states:** inline validation (e.g., quiz must have at least one correct answer; reward numeric range).

**Save model:** explicit "Save draft" button on each lesson; a "Publish lesson" toggle flips `status: 'draft' | 'published'` only if the lesson has at least one block and a title in both languages.

**Lifecycle:**

```
Draft (auto on create)
   ↓ save
Draft (persisted)
   ↓ publish toggle + validation passes
Published (visible to learners)
   ↓ edit
Draft (auto-revert on edit, with explicit re-publish step)
```

### 5.2 Learner-facing lesson list — `CourseDetail.tsx`

**Placement:** replaces the existing vertical lesson list (`CourseDetail.tsx:208–239`).

**Treatment:** **horizontal stepper preview**, mirroring `LessonPlayer`'s step order: intro → watch → story → game → words → read → say → quiz → finish.

```
+----------------------------------------------------------+
| "Animals A1" — 3 lessons · 18 blocks · ⭐ 120 XP        |
+----------------------------------------------------------+
|                                                         |
| Lesson 1 of 3                                           |
| ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐              |
| │Intro│▶│Word│▶│Game│▶│Read│▶│Quiz│▶│Finish│             |
| └────┘ └────┘ └────┘ └────┘ └────┘ └────┘              |
|  📹     📖 5   🎮    🗣    ❓ 3   🎁                  |
|                                                         |
| Lesson 2 of 3                                           |
| [collapsed preview]                                     |
|                                                         |
| Lesson 3 of 3                                           |
| [collapsed preview]                                     |
+----------------------------------------------------------+
|                       [Start learning →]                |
+----------------------------------------------------------+
```

**Click behavior:**

- Clicking a step icon in an **unlocked** lesson navigates to `/courses/:id/lessons/:lessonId#step-<n>` (player deep-links to the right step).
- Clicking a step in a **locked** (not-yet-unlocked) lesson shows a tooltip "Complete lesson N first" with a link to it.
- Clicking the lesson title (collapsed area) opens that lesson in `LessonPlayer` from step 1.

**Status badges:**

- ✓ Completed (green) — for completed lessons
- ⭕ Current (blue ring) — the user's `current_lesson_id` from `UserProgress`
- ○ Upcoming (gray) — not yet started
- 🔒 Locked (gray w/ lock icon) — if prerequisites logic is added later

### 5.3 Empty course state — learner side

When `course.lessons.length === 0`:

- **Hero** replaces the empty lesson-list area:
  - Title: "This course is being prepared"
  - Body: "Your teacher is still building the lessons. Check back soon!"
  - Friendly illustration slot (text-only hero in v1; design can add an SVG/illustration later)
  - Optional: teacher's name and a "Follow" hint (just a label, no actual follow-mechanism yet)
- **"Start learning" CTA disabled** — visually dimmed, `aria-disabled`, no `onClick`. Tooltip: "Available once lessons are added."

### 5.4 Admin visibility — `CourseManager`

In each row, the existing lesson-count cell expands to a chip strip:

```
| Course             | Lessons           | Status   |
|--------------------|-------------------|----------|
| Animals A1         | 3 lessons         | Published|
|                    | 📖 7 📹 2 ❓ 5 🎮 3|          |
|--------------------|-------------------|----------|
| Cooking Basics     | 0 lessons         | Draft    |
+--------------------+-------------------+----------+
```

- Chip strip shows **only blocks that have at least one instance**.
- Counts are computed from the embedded `lessons[]` array on the client (no new backend call).
- On `0 lessons` rows, the strip renders nothing — no chips.

### 5.5 Per-lesson publish state

- Each lesson has `status: 'draft' | 'published'`.
- Published lessons are visible in `CourseDetail`'s stepper.
- Draft lessons are visible only inside the teacher's `LessonBuilder` with a clear "Draft" badge and are excluded from `CourseDetail` entirely.
- Editing a published lesson auto-reverts it to draft; teacher must re-publish.

---

## 6. Data Model Changes

### 6.1 Embedded lesson schema (canonical, `backend/models/course_model.py` Lesson)

Add new optional fields; no breaking change to existing docs.

```python
# In Lesson model:
title_vi: str = ""                          # already exists
description_vi: Optional[str] = None        # NEW
content_vi: Optional[str] = None            # NEW (paired with content)
status: Literal["draft", "published"] = "published"  # NEW; default keeps legacy docs working
```

**Bilingual pattern for sub-blocks:** each list-typed sub-block (vocabulary, quiz, etc.) gains a `_vi` sibling field where useful. Concretely:

- `VocabularyItem`: add `word_vi: str = ""` (already present today, just verify), `definition_vi: Optional[str] = None` (new)
- `QuizQuestion`: add `question_vi: str = ""` (new), `options_vi: List[str] = []` (new), `explanation_vi: Optional[str] = None` (new)
- `ReadAloudStory`: add `title_vi: str = ""` and `body_vi: str = ""` next to `title` and `body`
- `PronunciationTask`: add `target_phrase_vi: Optional[str] = None`
- `Game`: add `prompt_vi: Optional[str] = None`
- `Reward`: add `label_vi: Optional[str] = None`

### 6.2 TypeScript types

`frontend-web/src/types/course.ts` mirrors all the above `_vi` siblings. The thin `admin.ts` Lesson type is removed in favor of the full canonical type — every authoring surface passes through the same shape.

### 6.3 Migration strategy

A one-shot migration script (`backend/database/migrations/`) sets:

- `status: "published"` for any existing embedded lesson that has a non-empty `title` (legacy docs are presumed "published" so we don't hide anything from active learners).
- `title_vi`, `description_vi` left as empty strings if absent.

No destructive change. Existing courses remain visible; their lessons gain a default `published` status.

---

## 7. API Surface Changes

### 7.1 New endpoints

```
POST   /api/v1/courses/{course_id}/lessons                  # add lesson
PATCH  /api/v1/courses/{course_id}/lessons/{lesson_id}      # edit lesson metadata + status
DELETE /api/v1/courses/{course_id}/lessons/{lesson_id}      # delete lesson
PATCH  /api/v1/courses/{course_id}/lessons/reorder          # reorder all lessons
POST   /api/v1/courses/{course_id}/lessons/{lesson_id}/blocks/{block_type}   # append block
PATCH  /api/v1/courses/{course_id}/lessons/{lesson_id}/blocks/{block_index}  # edit block
DELETE /api/v1/courses/{course_id}/lessons/{lesson_id}/blocks/{block_index}  # remove block
POST   /api/v1/courses/{course_id}/lessons/{lesson_id}/blocks/reorder       # reorder blocks
```

All endpoints gated by `RequireTeacherRole`. All operate on the embedded `lessons[]` array.

### 7.2 Existing endpoints — behavior changes

- `GET /api/v1/courses/{course_id}` — now filters out `status === "draft"` lessons from the embedded array when called by a non-authorized role (teacher sees drafts in their own authoring; learner sees published only).
- `GET /api/v1/courses/{course_id}/lessons/{lesson_id}` — same filtering.
- `POST /courses/generate` — generated sample lessons come back with `status: "draft"`.

### 7.3 AR combo listing endpoint

The existing `GET /api/v1/combos` is reused as-is by `ARReferenceBlockEditor`. No change needed.

---

## 8. Error Handling

| Surface | Failure | UX behavior |
|---------|---------|-------------|
| `CourseEditor` Lesson save | Network error | Inline banner above block list; preserve unsaved state |
| `CourseDetail` lesson fetch | 404 | Show "Lesson not found" hero; CTA back to course |
| `LessonBuilder` publish toggle | Missing required fields | Inline errors on the offending block; toggle disabled until resolved |
| `LessonBuilder` AR picker | AR service down | Dropdown shows "AR combos unavailable — try again" |
| `CourseDetail` empty course | `lessons.length === 0` | Empty-state hero; CTA disabled |
| `CourseDetail` "Start learning" | No published lessons | Button disabled with tooltip |
| Block order save | Concurrent edit | Show "Someone else edited this lesson — reload?" |
| Quiz block validation | No correct answer / < 2 options | Inline error; block can't be saved until fixed |
| Vocab block validation | No EN word | Inline error per row |
| Pronunciation block validation | No target phrase | Inline error; block can't be saved until fixed |

---

## 9. Testing Strategy

### 9.1 Unit (Vitest, frontend-web)

- `LessonBuilderShell` — add/remove/reorder blocks, dirty-state detection
- Each `*BlockEditor` — field validation, EN/VI toggles, bilingual completeness checks
- `BlockList` — drag/drop (or up/down) reordering, type icon rendering
- `LessonStepper` — step icon mapping, lock/unlock logic, click handlers

### 9.2 Integration (Pytest, backend)

- New endpoints — happy path + 401/403/404 paths
- Draft filter — when a learner `GET`s a course, draft lessons are excluded
- Migration script — legacy docs gain `status: "published"` and render unchanged

### 9.3 E2E (manual, before merge)

1. Teacher creates a course, adds a lesson, populates each of the 10 block types, publishes, switches to learner view, completes lesson, verifies XP awarded.
2. Teacher edits a published lesson → it auto-reverts to draft; learner no longer sees it; teacher re-publishes.
3. Author creates a course with zero lessons; learner sees the empty-state hero; CTA is disabled.
4. Teacher assigns a draft `status` to a lesson; learner view skips it but admin still sees it in `CourseManager`.

### 9.4 Regression — protected

- `LessonPlayer.tsx` keeps its existing conditional rendering unchanged. Test that all 9 step types still render when their respective fields are populated.
- Existing flashcard authoring flow (`FlashcardEditor`) unchanged.

---

## 10. Risks & Open Questions

| Risk | Severity | Mitigation |
|------|----------|------------|
| Backend `Lesson` model grows further with bilingual fields — risk of creeping complexity | Medium | Keep `_vi` siblings consistent; document the convention in `course_model.py` module docstring |
| Empty-state hero has no illustrated art in v1 (text-only) | Low | Use accent-colored clay card with text only; mark v1.1 follow-up for illustration |
| Per-lesson status adds a fourth publish dimension (course ↔ lesson) | Medium | Document the rule: editing a published lesson auto-reverts; clear UX cue in `PublishToggle` |
| Reordering uses array indexes in URL — fragile if concurrent edit | Medium | Optimistic concurrency: send current order version; backend rejects if stale |
| AR combo list may be large → poor picker UX | Low | Filter by category/age-range; default to recent |
| `CourseLesson` dormant collection stays confusing | Low | Add a `DEPRECATED.md` note pointing to this spec; mark file `@deprecated` |

---

## 11. Out-of-Scope Confirmations (from brainstorming)

These were considered and explicitly deferred:

- ❌ Migrating to the `CourseLesson` separate MongoDB collection
- ❌ Per-role RBAC differentiation beyond `RequireTeacherRole`
- ❌ AI-assisted lesson content generation
- ❌ Building new AR combo authoring (we only *reference* existing combos)
- ❌ Per-lesson analytics dashboards
- ❌ Lesson-level versioning / edit history

---

## 12. Open Questions Before Implementation

1. **Concurrency model for reordering** — send full ordered array per save vs. incremental index updates? *Default plan: full array per save with `updated_at`-based optimistic check.*
2. **Idempotent publishing** — does "publish" mean "make visible" or also "validate completeness"? *Default plan: publish validates completeness (must have title in EN+VI and at least one block).*
3. **Draft visibility in `CourseManager`** — does admin see drafts? *Default plan: yes, with a Draft chip distinct from Published.*

Each will be resolved during the implementation planning step (`writing-plans` skill) — they do not block this design.
