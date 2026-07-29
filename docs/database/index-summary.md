# MongoDB Index Summary

**Generated:** 2026-07-23 04:03:42 UTC

## All Indexes

| Database | Collection | Index Name | Keys | Unique | Sparse | TTL |
|----------|------------|------------|------|--------|--------|-----|
| `edu_platform` | `ai_feedback` | `_id_` | _id:1 | No | No | N/A |
| `edu_platform` | `ar_combinations` | `_id_` | _id:1 | No | No | N/A |
| `edu_platform` | `ar_combinations` | `combo_id_1` | combo_id:1 | Yes | No | N/A |
| `edu_platform` | `ar_combinations` | `flashcard_set_1_active_1` | flashcard_set:1, active:1 | No | No | N/A |
| `edu_platform` | `ar_combinations` | `required_tags_1` | required_tags:1 | No | No | N/A |
| `edu_platform` | `ar_combinations` | `semantic_result_1` | semantic_result:1 | No | No | N/A |
| `edu_platform` | `ar_objects` | `_id_` | _id:1 | No | No | N/A |
| `edu_platform` | `ar_objects` | `animation_type_1` | animation_type:1 | No | No | N/A |
| `edu_platform` | `ar_objects` | `ar_tag_1` | ar_tag:1 | Yes | No | N/A |
| `edu_platform` | `chat_logs` | `_id_` | _id:1 | No | No | N/A |
| `edu_platform` | `chat_logs` | `chat_logs_session_sender_time` | session_id:1, sender:1, timestamp:-1 | No | No | N/A |
| `edu_platform` | `combos` | `_id_` | _id:1 | No | No | N/A |
| `edu_platform` | `course_lessons` | `_id_` | _id:1 | No | No | N/A |
| `edu_platform` | `course_lessons` | `course_id_1` | course_id:1 | No | No | N/A |
| `edu_platform` | `course_lessons` | `course_id_1_order_1` | course_id:1, order:1 | No | No | N/A |
| `edu_platform` | `course_lessons` | `created_by_1` | created_by:1 | No | No | N/A |
| `edu_platform` | `course_lessons` | `created_by_1_status_1` | created_by:1, status:1 | No | No | N/A |
| `edu_platform` | `course_lessons` | `lesson_id_1` | lesson_id:1 | No | No | N/A |
| `edu_platform` | `course_lessons` | `lesson_type_1` | lesson_type:1 | No | No | N/A |
| `edu_platform` | `course_lessons` | `status_1` | status:1 | No | No | N/A |
| `edu_platform` | `course_lessons` | `status_1_lesson_type_1` | status:1, lesson_type:1 | No | No | N/A |
| `edu_platform` | `courses` | `_id_` | _id:1 | No | No | N/A |
| `edu_platform` | `courses` | `course_category_key` | category_key:1 | No | No | N/A |
| `edu_platform` | `courses` | `course_id_unique` | course_id:1 | Yes | No | N/A |
| `edu_platform` | `courses` | `course_is_published` | is_published:1 | No | No | N/A |
| `edu_platform` | `feedback_templates` | `_id_` | _id:1 | No | No | N/A |
| `edu_platform` | `feedback_templates` | `category_1` | category:1 | No | No | N/A |
| `edu_platform` | `feedback_templates` | `category_1_language_1_is_active_1` | category:1, language:1, is_active:1 | No | No | N/A |
| `edu_platform` | `feedback_templates` | `is_active_1` | is_active:1 | No | No | N/A |
| `edu_platform` | `feedback_templates` | `language_1` | language:1 | No | No | N/A |
| `edu_platform` | `flashcard_decks` | `_id_` | _id:1 | No | No | N/A |
| `edu_platform` | `flashcard_editor` | `_id_` | _id:1 | No | No | N/A |
| `edu_platform` | `flashcard_editor` | `created_at_-1` | created_at:-1 | No | No | N/A |
| `edu_platform` | `flashcard_editor` | `created_by_1` | created_by:1 | No | No | N/A |
| `edu_platform` | `flashcard_editor` | `flashcard_id_1` | flashcard_id:1 | No | No | N/A |
| `edu_platform` | `flashcards` | `_id_` | _id:1 | No | No | N/A |
| `edu_platform` | `flashcards` | `category_1` | category:1 | No | No | N/A |
| `edu_platform` | `flashcards` | `deck_id_1_created_at_1` | deck_id:1, created_at:1 | No | No | N/A |
| `edu_platform` | `flashcards` | `difficulty_1` | difficulty:1 | No | No | N/A |
| `edu_platform` | `flashcards` | `is_active_1` | is_active:1 | No | No | N/A |
| `edu_platform` | `flashcards` | `qr_id_1` | qr_id:1 | Yes | No | N/A |
| `edu_platform` | `flashcards` | `teacher_id_1` | teacher_id:1 | No | No | N/A |
| `edu_platform` | `learning_paths` | `_id_` | _id:1 | No | No | N/A |
| `edu_platform` | `learning_paths` | `user_id_1` | user_id:1 | No | No | N/A |
| `edu_platform` | `learning_progress` | `_id_` | _id:1 | No | No | N/A |
| `edu_platform` | `learning_progress` | `flashcard_qr_id_1` | flashcard_qr_id:1 | No | No | N/A |
| `edu_platform` | `learning_progress` | `mastered_items_partial` | mastery_level:-1 | No | No | N/A |
| `edu_platform` | `learning_progress` | `next_review_at_1` | next_review_at:1 | No | No | N/A |
| `edu_platform` | `learning_progress` | `user_id_1` | user_id:1 | No | No | N/A |
| `edu_platform` | `learning_progress` | `user_id_1_flashcard_qr_id_1` | user_id:1, flashcard_qr_id:1 | No | No | N/A |
| `edu_platform` | `learning_progress` | `user_id_1_mastery_level_-1` | user_id:1, mastery_level:-1 | No | No | N/A |
| `edu_platform` | `lesson_sessions` | `_id_` | _id:1 | No | No | N/A |
| `edu_platform` | `lesson_sessions` | `lesson_session_id_unique` | session_id:1 | Yes | Yes | N/A |
| `edu_platform` | `lesson_sessions` | `lesson_session_user_course_lesson_unique` | user_id:1, course_id:1, lesson_id:1 | Yes | No | N/A |
| `edu_platform` | `lesson_sessions` | `lesson_session_user_status_updated` | user_id:1, status:1, updated_at:-1 | No | No | N/A |
| `edu_platform` | `lesson_step_attempts` | `_id_` | _id:1 | No | No | N/A |
| `edu_platform` | `lesson_step_attempts` | `lesson_attempt_session_attempted` | session_id:1, attempted_at:-1 | No | No | N/A |
| `edu_platform` | `lesson_step_attempts` | `lesson_attempt_user_course_lesson_step` | user_id:1, course_id:1, lesson_id:1, step_id:1 | No | No | N/A |
| `edu_platform` | `media_assets` | `_id_` | _id:1 | No | No | N/A |
| `edu_platform` | `media_assets` | `media_asset_course_lesson_section` | course_id:1, lesson_id:1, section_id:1 | No | No | N/A |
| `edu_platform` | `media_assets` | `media_asset_course_lesson_section_key_path_unique` | course_id:1, lesson_id:1, section_id:1, asset_key:1, path:1 | Yes | No | N/A |
| `edu_platform` | `mini_game_bank` | `_id_` | _id:1 | No | No | N/A |
| `edu_platform` | `pets` | `_id_` | _id:1 | No | No | N/A |
| `edu_platform` | `pets` | `pet_id_1` | pet_id:1 | Yes | No | N/A |
| `edu_platform` | `profile_content` | `_id_` | _id:1 | No | No | N/A |
| `edu_platform` | `profile_content` | `key_1` | key:1 | Yes | No | N/A |
| `edu_platform` | `pronunciation_attempts` | `_id_` | _id:1 | No | No | N/A |
| `edu_platform` | `pronunciation_attempts` | `attempt_id_1` | attempt_id:1 | No | No | N/A |
| `edu_platform` | `pronunciation_attempts` | `course_id_1_lesson_id_1` | course_id:1, lesson_id:1 | No | No | N/A |
| `edu_platform` | `pronunciation_attempts` | `flashcard_qr_id_1` | flashcard_qr_id:1 | No | No | N/A |
| `edu_platform` | `pronunciation_attempts` | `processing_status_partial` | status:1 | No | No | N/A |
| `edu_platform` | `pronunciation_attempts` | `pronunciation_attempts_ttl` | attempted_at:1 | No | No | 7776000 |
| `edu_platform` | `pronunciation_attempts` | `pronunciation_course_lesson_section_attempted` | course_id:1, lesson_id:1, section_id:1, attempted_at:-1 | No | No | N/A |
| `edu_platform` | `pronunciation_attempts` | `pronunciation_session_attempted` | session_id:1, attempted_at:-1 | No | Yes | N/A |
| `edu_platform` | `pronunciation_attempts` | `user_id_1` | user_id:1 | No | No | N/A |
| `edu_platform` | `pronunciation_attempts` | `user_id_1_attempted_at_-1` | user_id:1, attempted_at:-1 | No | No | N/A |
| `edu_platform` | `pronunciation_attempts` | `user_id_1_flashcard_qr_id_1` | user_id:1, flashcard_qr_id:1 | No | No | N/A |
| `edu_platform` | `quiz_attempts` | `_id_` | _id:1 | No | No | N/A |
| `edu_platform` | `quiz_attempts` | `quiz_attempts_ttl` | attempted_at:1 | No | No | 7776000 |
| `edu_platform` | `quiz_attempts` | `quiz_type_1` | quiz_type:1 | No | No | N/A |
| `edu_platform` | `quiz_attempts` | `user_id_1` | user_id:1 | No | No | N/A |
| `edu_platform` | `quiz_attempts` | `user_id_1_attempted_at_-1` | user_id:1, attempted_at:-1 | No | No | N/A |
| `edu_platform` | `quiz_attempts` | `user_id_1_quiz_type_1` | user_id:1, quiz_type:1 | No | No | N/A |
| `edu_platform` | `quiz_questions` | `_id_` | _id:1 | No | No | N/A |
| `edu_platform` | `rag_cache` | `_id_` | _id:1 | No | No | N/A |
| `edu_platform` | `rag_cache` | `rag_cache_key_unique` | key:1 | Yes | No | N/A |
| `edu_platform` | `rag_cache` | `rag_cache_ttl` | expires_at:1 | No | No | N/A |
| `edu_platform` | `redis_cache` | `_id_` | _id:1 | No | No | N/A |
| `edu_platform` | `redis_cache` | `cache_key_1` | cache_key:1 | No | No | N/A |
| `edu_platform` | `redis_cache` | `cache_ttl` | expires_at:1 | No | No | N/A |
| `edu_platform` | `redis_cache` | `cache_type_1` | cache_type:1 | No | No | N/A |
| `edu_platform` | `redis_cache` | `cache_type_1_created_at_1` | cache_type:1, created_at:1 | No | No | N/A |
| `edu_platform` | `redis_cache` | `cache_type_1_expires_at_1` | cache_type:1, expires_at:1 | No | No | N/A |
| `edu_platform` | `session_logs` | `_id_` | _id:1 | No | No | N/A |
| `edu_platform` | `session_logs` | `active_topic_1_started_at_-1` | active_topic:1, started_at:-1 | No | No | N/A |
| `edu_platform` | `session_logs` | `session_logs_ttl` | started_at:1 | No | No | 2592000 |
| `edu_platform` | `session_logs` | `user_id_1` | user_id:1 | No | No | N/A |
| `edu_platform` | `session_logs` | `user_id_1_started_at_-1` | user_id:1, started_at:-1 | No | No | N/A |
| `edu_platform` | `user_course_progress` | `_id_` | _id:1 | No | No | N/A |
| `edu_platform` | `user_points` | `_id_` | _id:1 | No | No | N/A |
| `edu_platform` | `user_sessions` | `_id_` | _id:1 | No | No | N/A |
| `edu_platform` | `user_sessions` | `course_id_1_started_at_1` | course_id:1, started_at:1 | No | No | N/A |
| `edu_platform` | `user_sessions` | `lesson_id_1_started_at_1` | lesson_id:1, started_at:1 | No | No | N/A |
| `edu_platform` | `user_sessions` | `session_id_1` | session_id:1 | No | No | N/A |
| `edu_platform` | `user_sessions` | `status_1` | status:1 | No | No | N/A |
| `edu_platform` | `user_sessions` | `status_1_started_at_1` | status:1, started_at:1 | No | No | N/A |
| `edu_platform` | `user_sessions` | `user_id_1` | user_id:1 | No | No | N/A |
| `edu_platform` | `user_sessions` | `user_id_1_started_at_1` | user_id:1, started_at:1 | No | No | N/A |
| `edu_platform` | `user_sessions` | `user_id_1_status_1` | user_id:1, status:1 | No | No | N/A |
| `edu_platform` | `users` | `_id_` | _id:1 | No | No | N/A |
| `edu_platform` | `users` | `email_1` | email:1 | Yes | No | N/A |
| `edu_platform` | `users` | `username_1` | username:1 | Yes | No | N/A |
| `edu_platform` | `word_mastery` | `_id_` | _id:1 | No | No | N/A |
| `edu_platform` | `word_mastery` | `word_mastery_user_course_lesson_word_unique` | user_id:1, course_id:1, lesson_id:1, word:1 | Yes | No | N/A |
| `edu_platform` | `word_mastery` | `word_mastery_user_updated` | user_id:1, updated_at:-1 | No | No | N/A |
| `eduplatform` | `ar_combinations` | `_id_` | _id:1 | No | No | N/A |
| `eduplatform` | `ar_combinations` | `combo_id_1` | combo_id:1 | Yes | No | N/A |
| `eduplatform` | `ar_combinations` | `flashcard_set_1_active_1` | flashcard_set:1, active:1 | No | No | N/A |
| `eduplatform` | `ar_combinations` | `required_tags_1` | required_tags:1 | No | No | N/A |
| `eduplatform` | `ar_combinations` | `semantic_result_1` | semantic_result:1 | No | No | N/A |
| `eduplatform` | `course_lessons` | `_id_` | _id:1 | No | No | N/A |
| `eduplatform` | `course_lessons` | `course_id_1` | course_id:1 | No | No | N/A |
| `eduplatform` | `course_lessons` | `course_id_1_order_1` | course_id:1, order:1 | No | No | N/A |
| `eduplatform` | `course_lessons` | `created_by_1` | created_by:1 | No | No | N/A |
| `eduplatform` | `course_lessons` | `created_by_1_status_1` | created_by:1, status:1 | No | No | N/A |
| `eduplatform` | `course_lessons` | `lesson_id_1` | lesson_id:1 | No | No | N/A |
| `eduplatform` | `course_lessons` | `lesson_type_1` | lesson_type:1 | No | No | N/A |
| `eduplatform` | `course_lessons` | `status_1` | status:1 | No | No | N/A |
| `eduplatform` | `course_lessons` | `status_1_lesson_type_1` | status:1, lesson_type:1 | No | No | N/A |
| `eduplatform` | `feedback_templates` | `_id_` | _id:1 | No | No | N/A |
| `eduplatform` | `feedback_templates` | `category_1` | category:1 | No | No | N/A |
| `eduplatform` | `feedback_templates` | `category_1_language_1_is_active_1` | category:1, language:1, is_active:1 | No | No | N/A |
| `eduplatform` | `feedback_templates` | `is_active_1` | is_active:1 | No | No | N/A |
| `eduplatform` | `feedback_templates` | `language_1` | language:1 | No | No | N/A |
| `eduplatform` | `flashcard_editor` | `_id_` | _id:1 | No | No | N/A |
| `eduplatform` | `flashcard_editor` | `created_at_-1` | created_at:-1 | No | No | N/A |
| `eduplatform` | `flashcard_editor` | `created_by_1` | created_by:1 | No | No | N/A |
| `eduplatform` | `flashcard_editor` | `flashcard_id_1` | flashcard_id:1 | No | No | N/A |
| `eduplatform` | `flashcards` | `_id_` | _id:1 | No | No | N/A |
| `eduplatform` | `flashcards` | `category_1` | category:1 | No | No | N/A |
| `eduplatform` | `flashcards` | `deck_id_1_created_at_1` | deck_id:1, created_at:1 | No | No | N/A |
| `eduplatform` | `flashcards` | `difficulty_1` | difficulty:1 | No | No | N/A |
| `eduplatform` | `flashcards` | `is_active_1` | is_active:1 | No | No | N/A |
| `eduplatform` | `flashcards` | `qr_id_1` | qr_id:1 | Yes | No | N/A |
| `eduplatform` | `flashcards` | `teacher_id_1` | teacher_id:1 | No | No | N/A |
| `eduplatform` | `learning_paths` | `_id_` | _id:1 | No | No | N/A |
| `eduplatform` | `learning_paths` | `user_id_1` | user_id:1 | No | No | N/A |
| `eduplatform` | `learning_progress` | `_id_` | _id:1 | No | No | N/A |
| `eduplatform` | `learning_progress` | `flashcard_qr_id_1` | flashcard_qr_id:1 | No | No | N/A |
| `eduplatform` | `learning_progress` | `mastered_items_partial` | mastery_level:-1 | No | No | N/A |
| `eduplatform` | `learning_progress` | `next_review_at_1` | next_review_at:1 | No | No | N/A |
| `eduplatform` | `learning_progress` | `user_id_1` | user_id:1 | No | No | N/A |
| `eduplatform` | `learning_progress` | `user_id_1_flashcard_qr_id_1` | user_id:1, flashcard_qr_id:1 | No | No | N/A |
| `eduplatform` | `learning_progress` | `user_id_1_mastery_level_-1` | user_id:1, mastery_level:-1 | No | No | N/A |
| `eduplatform` | `pets` | `_id_` | _id:1 | No | No | N/A |
| `eduplatform` | `pets` | `pet_id_1` | pet_id:1 | Yes | No | N/A |
| `eduplatform` | `profile_content` | `_id_` | _id:1 | No | No | N/A |
| `eduplatform` | `profile_content` | `key_1` | key:1 | Yes | No | N/A |
| `eduplatform` | `pronunciation_attempts` | `_id_` | _id:1 | No | No | N/A |
| `eduplatform` | `pronunciation_attempts` | `attempt_id_1` | attempt_id:1 | No | No | N/A |
| `eduplatform` | `pronunciation_attempts` | `course_id_1_lesson_id_1` | course_id:1, lesson_id:1 | No | No | N/A |
| `eduplatform` | `pronunciation_attempts` | `flashcard_qr_id_1` | flashcard_qr_id:1 | No | No | N/A |
| `eduplatform` | `pronunciation_attempts` | `processing_status_partial` | status:1 | No | No | N/A |
| `eduplatform` | `pronunciation_attempts` | `pronunciation_attempts_ttl` | attempted_at:1 | No | No | 7776000 |
| `eduplatform` | `pronunciation_attempts` | `user_id_1` | user_id:1 | No | No | N/A |
| `eduplatform` | `pronunciation_attempts` | `user_id_1_attempted_at_-1` | user_id:1, attempted_at:-1 | No | No | N/A |
| `eduplatform` | `pronunciation_attempts` | `user_id_1_flashcard_qr_id_1` | user_id:1, flashcard_qr_id:1 | No | No | N/A |
| `eduplatform` | `quiz_attempts` | `_id_` | _id:1 | No | No | N/A |
| `eduplatform` | `quiz_attempts` | `quiz_attempts_ttl` | attempted_at:1 | No | No | 7776000 |
| `eduplatform` | `quiz_attempts` | `quiz_type_1` | quiz_type:1 | No | No | N/A |
| `eduplatform` | `quiz_attempts` | `user_id_1` | user_id:1 | No | No | N/A |
| `eduplatform` | `quiz_attempts` | `user_id_1_attempted_at_-1` | user_id:1, attempted_at:-1 | No | No | N/A |
| `eduplatform` | `quiz_attempts` | `user_id_1_quiz_type_1` | user_id:1, quiz_type:1 | No | No | N/A |
| `eduplatform` | `redis_cache` | `_id_` | _id:1 | No | No | N/A |
| `eduplatform` | `redis_cache` | `cache_key_1` | cache_key:1 | No | No | N/A |
| `eduplatform` | `redis_cache` | `cache_ttl` | expires_at:1 | No | No | N/A |
| `eduplatform` | `redis_cache` | `cache_type_1` | cache_type:1 | No | No | N/A |
| `eduplatform` | `redis_cache` | `cache_type_1_created_at_1` | cache_type:1, created_at:1 | No | No | N/A |
| `eduplatform` | `redis_cache` | `cache_type_1_expires_at_1` | cache_type:1, expires_at:1 | No | No | N/A |
| `eduplatform` | `session_logs` | `_id_` | _id:1 | No | No | N/A |
| `eduplatform` | `session_logs` | `active_topic_1_started_at_-1` | active_topic:1, started_at:-1 | No | No | N/A |
| `eduplatform` | `session_logs` | `session_logs_ttl` | started_at:1 | No | No | 2592000 |
| `eduplatform` | `session_logs` | `user_id_1` | user_id:1 | No | No | N/A |
| `eduplatform` | `session_logs` | `user_id_1_started_at_-1` | user_id:1, started_at:-1 | No | No | N/A |
| `eduplatform` | `user_sessions` | `_id_` | _id:1 | No | No | N/A |
| `eduplatform` | `user_sessions` | `course_id_1_started_at_1` | course_id:1, started_at:1 | No | No | N/A |
| `eduplatform` | `user_sessions` | `lesson_id_1_started_at_1` | lesson_id:1, started_at:1 | No | No | N/A |
| `eduplatform` | `user_sessions` | `session_id_1` | session_id:1 | No | No | N/A |
| `eduplatform` | `user_sessions` | `status_1` | status:1 | No | No | N/A |
| `eduplatform` | `user_sessions` | `status_1_started_at_1` | status:1, started_at:1 | No | No | N/A |
| `eduplatform` | `user_sessions` | `user_id_1` | user_id:1 | No | No | N/A |
| `eduplatform` | `user_sessions` | `user_id_1_started_at_1` | user_id:1, started_at:1 | No | No | N/A |
| `eduplatform` | `user_sessions` | `user_id_1_status_1` | user_id:1, status:1 | No | No | N/A |
| `eduplatform` | `users` | `_id_` | _id:1 | No | No | N/A |
| `eduplatform` | `users` | `email_1` | email:1 | Yes | No | N/A |
| `eduplatform` | `users` | `username_1` | username:1 | Yes | No | N/A |

## Collections with Only Default _id Index

These collections may benefit from additional indexes for common query patterns:

- `edu_platform.ai_feedback`
- `edu_platform.combos`
- `edu_platform.flashcard_decks`
- `edu_platform.mini_game_bank`
- `edu_platform.quiz_questions`
- `edu_platform.user_course_progress`
- `edu_platform.user_points`

## Summary

- **Total Indexes:** 196
- **Unique Index Definitions:** 196
- **Collections with Default-Only Index:** 7
