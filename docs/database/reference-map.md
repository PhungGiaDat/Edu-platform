# MongoDB Reference Map

**Generated:** 2026-07-23 04:03:42 UTC

This document shows inferred relationships between collections based on
field naming conventions and ObjectId patterns.

## Relationship Summary

| Source Collection | Field | Target Collection | Confidence | Rationale |
|------------------|-------|------------------|------------|-----------|
| `lesson_sessions` | `user_id` | `users` | high | `_id` field in users, high-confidence match |
| `lesson_sessions` | `course_id` | `courses` | high | `course_id` unique index in courses |
| `lesson_sessions` | `lesson_id` | `courses` (embedded) | medium | lesson embedded in courses |
| `lesson_sessions` | `session_id` | `user_sessions` | high | `session_id` indexed in user_sessions |
| `lesson_sessions` | `steps.step_id` | `courses` (embedded) | medium | steps embedded in lesson_sessions |
| `user_course_progress` | `user_id` | `users` | high | `email`/`username` unique indexes in users |
| `user_course_progress` | `course_id` | `courses` | high | `course_id_unique` index in courses |
| `user_course_progress` | `lesson_progress.lesson_id` | `courses` (embedded) | medium | lesson embedded in courses |
| `ai_feedback` | `user_id` | `users` | high | `email`/`username` unique indexes in users |
| `user_points` | `user_id` | `users` | high | `email`/`username` unique indexes in users |
| `session_logs` | `user_id` | `users` | high | `email`/`username` unique indexes in users |
| `pets` | `pet_id` | `pets` | high | `pet_id` unique index in pets |
| `combos` | `combo_id` | `combos` | high | `combo_id` unique index in combos |
| `ar_combinations` | `combo_id` | `combos` | high | `combo_id` unique index in combos |
| `flashcards` | `qr_id` | `flashcards` | medium | `qr_id` unique index in flashcards |
| `flashcard_decks` | `deck_id` | `courses` (embedded) | medium | decks embedded in courses |
| `flashcard_decks` | `teacher_id` | `users` | medium | teacher is a user |
| `quiz_questions` | `flashcard_qr_id` | `flashcards` | medium | `qr_id` unique index in flashcards |
| `mini_game_bank` | `flashcard_qr_id` | `flashcards` | medium | `qr_id` unique index in flashcards |
| `media_assets` | `course_id` | `courses` | high | `course_id_unique` index in courses |
| `media_assets` | `lesson_id` | `courses` (embedded) | medium | lesson embedded in courses |
| `media_assets` | `section_id` | `courses` (embedded) | medium | section embedded in lessons |
| `courses` | `lessons.lesson_id` | `courses` (self-ref) | high | lessons are embedded in courses |
| `courses` | `lessons.game.game_id` | `mini_game_bank` | medium | game_id in mini_game_bank |
| `courses` | `lessons.pronunciation.task_id` | `pronunciation_attempts` | medium | task_id in pronunciation_attempts |
| `courses` | `lessons.quiz.question_id` | `quiz_questions` | medium | quiz questions are top-level |
| `courses` | `lessons.quiz.options.option_id` | `quiz_questions` | medium | options embedded in quiz_questions |

## Mermaid ER Diagram

Based on high-confidence relationship inferences:

```mermaid
erDiagram
    USERS ||--o{ LESSON_SESSIONS : "user_id"
    USERS ||--o{ USER_COURSE_PROGRESS : "user_id"
    USERS ||--o{ USER_POINTS : "user_id"
    USERS ||--o{ USER_SESSIONS : "user_id"
    USERS ||--o{ SESSION_LOGS : "user_id"
    USERS ||--o{ AI_FEEDBACK : "user_id"
    USERS ||--o{ FLASHCARD_DECKS : "teacher_id"

    COURSES ||--o{ LESSON_SESSIONS : "course_id"
    COURSES ||--o{ USER_COURSE_PROGRESS : "course_id"
    COURSES ||--o{ MEDIA_ASSETS : "course_id"
    COURSES ||--o{ COURSE_LESSONS : "course_id"
    COURSES ||--o{ USER_SESSIONS : "course_id"
    COURSES {
        array lessons
    }

    LESSON_SESSIONS ||--o| USER_SESSIONS : "session_id"

    USER_SESSIONS ||--o{ LESSON_STEP_ATTEMPTS : "session_id"

    PETS {
        string pet_id PK
    }

    COMBOS ||--o{ AR_COMBINATIONS : "combo_id"

    FLASHCARDS ||--o{ QUIZ_QUESTIONS : "flashcard_qr_id"
    FLASHCARDS ||--o{ MINI_GAME_BANK : "flashcard_qr_id"
    FLASHCARDS ||--o{ PRONUNCIATION_ATTEMPTS : "flashcard_qr_id"
    FLASHCARDS ||--o{ LEARNING_PROGRESS : "flashcard_qr_id"
    FLASHCARDS ||--o{ FLASHCARD_DECKS : "deck_id"

    COURSES ||--o{ MEDIA_ASSETS : "lesson_id"

    MINI_GAME_BANK ||--o{ COURSES : "lessons.game.game_id (embedded)"

    QUIZ_QUESTIONS {
        string flashcard_qr_id
        array questions
    }
    QUIZ_QUESTIONS ||--o| COURSES : "lessons.quiz.question_id"

    USER_COURSE_PROGRESS ||--o| COURSES : "current_lesson_id (embedded)"
```

## Key Findings

1. **User-centric relationships**: `users` is the central entity, referenced by 7+ collections (`user_id`)
2. **Course as content hub**: `courses` embeds lessons directly (no separate `lessons` collection needed), referenced by `user_course_progress`, `media_assets`, `lesson_sessions`
3. **Duplicate databases**: `edu_platform` and `eduplatform` have identical collection names — this appears to be a staging/production split or migration artifact
4. **TTL indexes present**: `session_logs` (30 days), `pronunciation_attempts` (90 days), `quiz_attempts` (90 days) — data lifecycle is managed
5. **`courses.lessons` is a rich embedded document** with nested sub-collections (vocabulary, quiz, video, game, pronunciation, etc.) — not normalized

## Verified Cross-References

These field-to-collection relationships are confirmed by the presence of matching unique/indexed fields:

- `lesson_sessions.user_id` → `users.email` (indexed)
- `lesson_sessions.course_id` → `courses.course_id_unique` (indexed)
- `user_course_progress.user_id` → `users.email` (indexed)
- `user_course_progress.course_id` → `courses.course_id_unique` (indexed)
- `pets.pet_id` → `pets.pet_id_1` (unique index)
- `combos.combo_id` → `combos.combo_id_1` (unique index)
- `ar_combinations.combo_id` → `combos.combo_id_1` (unique index)
- `flashcards.qr_id` → `flashcards.qr_id_1` (unique index)
- `media_assets.course_id` → `courses.course_id_unique` (indexed)
