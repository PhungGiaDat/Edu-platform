# Animals Course Implementation Plan
**Plan ID:** `20260803_animals_course_build`
**Branch:** `MindAR-Update`
**Date:** 2026-08-03 (UTC+7)
**Owner:** Animals Course Build subagent

---

## 1. Design Read (Word doc)

Source: `D:\Downloads\ban_thiet_ke_khoa_hoc_animals_demo.docx`

The spec defines **Khóa học 1: ANIMALS** — a 5-lesson English course for ages 5–7.
**Lesson 1 "Bài 1: Cat"** is the required prototype to fully implement.

### 1.1 Course shape
- **Title:** "Animals Adventure" / "Hành trình động vật"
- **Category:** `animals` (extends the existing `nature` taxonomy)
- **Audience:** 5–7 (still passes `age_range == "5-8"` after the integrity normalizer)
- **5 lessons** (Cat is fully built; the other 4 are stubbed for end-to-end Playwright coverage):
  1. **Cat** — full 7-section flow (warm-up → vocab → listen → match → mini-games → quiz → reward)
  2. **Dog** — copy of Cat with new vocabulary
  3. **Bird** — same
  4. **Fish** — same
  5. **Rabbit** — same

### 1.2 The 7 sections (mapped to existing schema)
| Word doc section      | Existing lesson step | Notes |
|-----------------------|----------------------|-------|
| Warm-up               | `intro` (video)      | 60–90s intro video, scene list |
| Learn Vocabulary      | `words`              | 5 vocabulary items (image, audio, sticker, simple_sentence) |
| Practice – Listen & Choose | `game` (listen_and_tap) | 3-tile prompt → tap correct |
| Practice – Match Picture | `read` (readAloudStory) | 2-page mini-story with highlighted words |
| Mini Games (5 games)  | `game` + `activity`  | One `Activity` block + one `game` block (memory/find/match) |
| Quiz (10 questions)   | `quiz`               | 10 mixed `image_choice` / `sound_choice` items |
| Reward                | `finish` (reward)    | XP + sticker + badge title |

The existing `CourseSchema` / `Lesson` schema already supports all of this; we map the spec exactly onto it.

### 1.3 Vocabulary for Lesson 1 (Cat)
| word_en | word_vi | emoji | simple_sentence |
|---------|---------|-------|-----------------|
| Cat | con mèo | 🐱 | The cat is small. |
| Dog | con chó | 🐶 | The dog is big. |
| Bird | con chim | 🐦 | The bird can fly. |
| Fish | con cá | 🐟 | The fish swims. |
| Rabbit | con thỏ | 🐰 | The rabbit hops. |

### 1.4 Mini-games (rendered as the `game` section + `activity` section)
| Game | Type | Spec |
|------|------|------|
| 1. Listen & Tap | `listen_and_tap` | Audio prompt "cat" → tap the cat tile |
| 2. Picture Match | `picture_match` | Mirror cards (Cat↔Cat, Dog↔Dog) |
| 3. Memory Match | `memory_match` | 4-card flip |
| 4. Find Picture | `find_picture` | "Find the cat" among 3 tiles |
| 5. Sound Choose | `choose_sound` | Match animal sound to animal |

### 1.5 Quiz — 10 questions (5 image_choice, 5 sound_choice)
Cover all 5 vocabulary items × 2 questions per animal.

### 1.6 Reward
- **XP:** 50 (within the `0–250` validator)
- **Badge:** "Cat Champion" / "Nhà vô địch mèo"
- **Sticker:** `cat-king-sticker.svg`
- **Message:** "Bé đã hoàn thành bài Cat! Tiếp tục nhé!" / "You finished the Cat lesson!"

### 1.7 CTA strings (verbatim from Word doc)
| Element | English | Vietnamese |
|---------|---------|-----------|
| Start | "Start Cat" | "Bắt đầu Cat" |
| Warm-up | "Warm-up" | "Khởi động" |
| Continue | "Keep going" | "Tiếp tục" |
| Submit Quiz | "Submit Quiz" | "Nộp bài" |
| Finish | "Finish Lesson" | "Hoàn thành" |
| Reward title | "You got a sticker!" | "Bé nhận sticker!" |

---

## 2. Approach Options

### Option A — Standalone `/courses/animals` route with course id `animals-adventure-en-5-7`
- **Pro:** Clean separation; no demo collision; existing demo courses untouched.
- **Pro:** Existing `CourseList` already routes `/courses/animals` to a filtered view by topic — adding a real course at id `animals-adventure-en-5-7` makes the filter naturally light up.
- **Pro:** All existing infrastructure (CourseService, LessonSession, RewardPopup, useGamification) is reused unchanged.
- **Con:** Mismatch between the Word doc's "7 sections" and the existing LessonPlayer's step order — we need to map them via the existing schema (see 1.2 mapping table).

### Option B — Extend the existing `momo-nature-english-5-7` course with a Cat lesson
- **Pro:** Reuses existing course surface.
- **Con:** Pollutes the existing demo; breaks the refactor's atomic write of `momo_nature.json`; harder to verify in isolation.

### Option C — Build a brand-new standalone UI (skip the existing schema)
- **Pro:** Perfect 7-section mirror.
- **Con:** Mocks away the gamification, Repositories, and Session infra. Hard to verify real progress.

### **Recommendation:** Option A. The existing schema maps to the spec cleanly (Section 1.2 table), and we get a real, verifiable end-to-end flow with minimal new code.

---

## 3. Recommended Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Frontend (frontend-web)                                                     │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Route /courses/animals → CourseList (filtered isAnimalNatureCourse)   │  │
│  │   → click Animals Adventure → /courses/animals-adventure-en-5-7       │  │
│  │   → CourseDetail                                                    │  │
│  │   → click lesson → /courses/animals-adventure-en-5-7/lessons/<id>   │  │
│  │   → LessonPlayer (existing component, 8-step flow)                   │  │
│  │                                                                       │  │
│  │  New: useAnimalsCourse hook (course-level derivations)                │  │
│  │  New: AnimalsStickerSheet overlay (reward celebration)                │  │
│  │  New: View Transitions CSS (fade between sections)                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  Backend (FastAPI)                                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Existing routes (UNCHANGED):                                          │  │
│  │   GET  /api/v1/courses                                                │  │
│  │   GET  /api/v1/courses/{id}                                           │  │
│  │   GET  /api/v1/courses/{id}/lessons/{lid}                             │  │
│  │   POST /api/v1/courses/{id}/lessons/{lid}/session/start               │  │
│  │   POST /api/v1/courses/{id}/lessons/{lid}/steps/attempt               │  │
│  │   POST /api/v1/lessons/{lid}/complete                                 │  │
│  │                                                                       │  │
│  │ Adds:                                                                  │  │
│  │   backend/database/seed/animals_adventure.json (5 lessons, fold 1)    │  │
│  │   backend/scripts/upload_animals_assets.py (idempotent Supabase upload)│  │
│  │   frontend-web/public/assets/animals/* (SVG fallback for offline dev)  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  Persistence                                                                │
│  MongoDB collection `courses` AND `media_assets`                              │
│  Supabase bucket `learnar-assets` (images + audio)                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. File-by-file change list

### Backend (created)
| Path | Purpose |
|------|---------|
| `backend/seeds/courses/animals_adventure.json` | Course seed (5 lessons, fully formed Cat) |
| `backend/scripts/upload_animals_assets.py` | Idempotent Supabase uploader (curl-based, reuses existing pattern) |
| `backend/tests/test_animals_course.py` | Smoke test for course normalization + ensure Cat lesson loads |

### Frontend (created)
| Path | Purpose |
|------|---------|
| `frontend-web/src/hooks/useAnimalsCourse.ts` | Hook wrapping courseService + lesson-driven helpers |
| `frontend-web/src/pages/AnimalsAdventure.tsx` | Dedicated Animals landing page (course-over-mosaic) |
| `frontend-web/src/styles/animals.css` | View Transitions + 7-section palette |
| `frontend-web/src/components/animals/AnimalsHero.tsx` | Clay-style hero with 5 mascot tiles |
| `frontend-web/src/components/animals/AnimalsLessonCard.tsx` | Lesson card with vocabulary preview |
| `frontend-web/src/components/animals/AnimalsRewardBurst.tsx` | Reward overlay (sticker burst + XP toast) |
| `frontend-web/public/assets/animals/{cat,dog,bird,fish,rabbit}.svg` | Mascot SVGs (generated programmatically) |
| `frontend-web/public/assets/animals/scenes/{warmup,vocab,listen,match,game,quiz}.svg` | Section reference PNGs (rendered from CSS) |
| `frontend-web/tests/e2e/animals-cat.spec.ts` | Playwright spec for the Cat lesson flow |

### Frontend (modified)
| Path | Change |
|------|--------|
| `frontend-web/src/App.tsx` | Add `/courses/animals-adventure` and `/courses/animals-adventure/lessons/:id` routes |
| `frontend-web/src/pages/CourseList.tsx` | Surface the new course; keep the `/courses/animals` filter working |

### Docs (created)
| Path | Purpose |
|------|---------|
| `plan/20260803_animals_course_build.md` | This plan |
| `docs/designs/animals_*.png` | Captured design reference PNGs (one per section) |

---

## 5. Execution Order

1. **Backend models** — already complete (Step 1.2 mapping). No new models needed.
2. **Seed JSON** — write `animals_adventure.json` with the 5-lesson structure.
3. **Asset SVGs** — generate animal mascot SVGs (5) + section reference SVGs (7) + audio placeholders.
4. **Upload script** — `upload_animals_assets.py` uploads SVGs to the `learnar-assets` bucket under `courses/animals-adventure-5-7/`.
5. **Seed run** — run `python -m services.course_service.generate_sample_course` (or hit POST `/api/v1/courses/generate`) to upsert.
6. **Frontend hook + page** — build `useAnimalsCourse`, `AnimalsAdventure`, `AnimalsHero`, `AnimalsLessonCard`, `AnimalsRewardBurst`.
7. **Wire route** — update `App.tsx` to mount the new page on `/courses/animals-adventure`.
8. **View Transitions CSS** — add `animals.css` with fade transitions + status pills.
9. **Design references** — render the 7 sections to PNG via Playwright headless (script at `scripts/capture_animals_designs.py`).
10. **Verification** — start dev servers, run Playwright spec, screenshot at 5 viewports, run responsive test, audit (vercel-web-design-guidelines), pytest.
11. **Commit** — one commit per logical chunk (seed, upload, frontend, docs, tests).
12. **Final report** — summary file with file paths, IDs, screenshot links, results.

---

## 6. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| OpenAI key unavailable for image generation | Use programmatic SVG (gradient + emoji + simple shapes) — no AI needed |
| Supabase upload needs service key | `.env` already has it; reuse existing `upload_models_to_supabase.py` curl pattern |
| Refactor task concurrently edits `settings.py` | Skip `settings.py` — use `settings.SUPABASE_PROJECT_URL` via existing accessor |
| Schema strict validator rejects age_range other than "5-8" | Use `age_range: "5-8"` (the spec says 5–7 but validator enforces 5–8) |
| Lesson validation requires 3–5 vocab words | Use exactly 5 |
| Validation requires 60–120s video duration | Use 90s |
| Validation requires 3–5 quiz options per question | Use 3 options |

---

## 7. Acceptance Criteria

- [ ] `animals-adventure-en-5-7` course visible in `GET /api/v1/courses`
- [ ] Cat lesson has 5 vocabulary items, 1 game, 1 activity, 1 quiz with 10 questions, 1 reward
- [ ] `/courses/animals-adventure` renders the AnimalsAdventure hero with 5 lesson cards
- [ ] `/courses/animals-adventure/lessons/learn-the-cat` runs the 8-step LessonPlayer flow
- [ ] Completion awards the XP defined in the seed and shows the AnimalsRewardBurst overlay
- [ ] All five viewports render without horizontal scroll (375, 428, 768, 1280, 1536)
- [ ] Playwright spec passes end-to-end
- [ ] `pytest backend/tests/test_animals_course.py` passes
- [ ] `curl localhost:8000/health` returns `{"status": "ok"}`
- [ ] View Transitions CSS present (no console warnings about missing handlers)
- [ ] Commits split per logical chunk (no push)
