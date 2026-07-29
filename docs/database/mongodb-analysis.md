# MongoDB Database Analysis Report

**Generated:** 2026-07-23 04:03:42 UTC
**Sample Size:** 300 documents per collection
**Tool:** `scripts/db_inspect/mongodb_inspect.py` (read-only)

## Executive Summary

- **Databases Inspected:** 2
- **Total Collections:** 45
- **Total Documents (estimated):** 781

## Database: `edu_platform`

**Collections:** 30

### Collection: `flashcard_decks`

**Documents:** 1 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |

**Schema:**

| Field | Types | Presence | Optional | Reference | Notes |
|-------|-------|----------|----------|-----------|-------|
| `_id` | `string` | 100.0% | No | Yes | -> s |
| `card_count` | `int` | 100.0% | No |  |  |
| `category` | `string` | 100.0% | No |  |  |
| `cover_image_url` | `null` | 100.0% | No |  |  |
| `created_at` | `string` | 100.0% | No |  |  |
| `deck_id` | `string` | 100.0% | No | Yes | -> decks |
| `description` | `object` | 100.0% | No |  | Embedded: object |
| `description.en` | `string` | 100.0% | No |  |  |
| `description.vi` | `string` | 100.0% | No |  |  |
| `is_active` | `bool` | 100.0% | No |  |  |
| `name` | `object` | 100.0% | No |  | Embedded: object |
| `name.en` | `string` | 100.0% | No |  |  |
| `name.vi` | `string` | 100.0% | No |  |  |
| `tags` | `array` | 100.0% | No |  |  |
| `teacher_id` | `string` | 100.0% | No | Yes | -> teachers |
| `updated_at` | `string` | 100.0% | No |  |  |

### Collection: `redis_cache`

**Documents:** 0 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `cache_key_1` | `cache_key` | No | No | N/A |
| `cache_type_1` | `cache_type` | No | No | N/A |
| `cache_type_1_expires_at_1` | `cache_type`, `expires_at` | No | No | N/A |
| `cache_type_1_created_at_1` | `cache_type`, `created_at` | No | No | N/A |
| `cache_ttl` | `expires_at` | No | No | N/A |

*No schema data (empty collection or sampling failed)*

### Collection: `pets`

**Documents:** 24 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `pet_id_1` | `pet_id` | Yes | No | N/A |

**Schema:**

| Field | Types | Presence | Optional | Reference | Notes |
|-------|-------|----------|----------|-----------|-------|
| `_id` | `string` | 100.0% | No | Yes | -> s |
| `animations` | `array` | 100.0% | No |  |  |
| `category` | `string` | 100.0% | No |  |  |
| `color` | `string` | 100.0% | No |  |  |
| `created_at` | `string` | 100.0% | No |  |  |
| `is_active` | `bool` | 100.0% | No |  |  |
| `model_url` | `string` | 100.0% | No |  |  |
| `name` | `string` | 100.0% | No |  |  |
| `name_vi` | `string` | 100.0% | No |  |  |
| `pack_source` | `string` | 100.0% | No |  |  |
| `pet_id` | `string` | 100.0% | No | Yes | -> pets |
| `rarity` | `string` | 100.0% | No |  |  |
| `texture_url` | `string` | 100.0% | No |  |  |
| `thumbnail_url` | `string` | 100.0% | No |  |  |
| `unlock_condition` | `object` | 100.0% | No |  | Embedded: object |
| `unlock_condition.type` | `string` | 100.0% | No |  |  |
| `unlock_condition.value` | `int` | 100.0% | No |  |  |
| `updated_at` | `null` | 100.0% | No |  |  |

### Collection: `lesson_sessions`

**Documents:** 2 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `lesson_session_user_course_lesson_unique` | `user_id`, `course_id`, `lesson_id` | Yes | No | N/A |
| `lesson_session_id_unique` | `session_id` | Yes | Yes | N/A |
| `lesson_session_user_status_updated` | `user_id`, `status`, `updated_at` | No | No | N/A |

**Schema:**

| Field | Types | Presence | Optional | Reference | Notes |
|-------|-------|----------|----------|-----------|-------|
| `_id` | `string` | 100.0% | No | Yes | -> s |
| `completed_at` | `null` | 100.0% | No |  |  |
| `course_id` | `string` | 100.0% | No | Yes | -> courses |
| `current_step_id` | `string` | 100.0% | No | Yes | -> current_steps |
| `current_step_index` | `int` | 100.0% | No |  |  |
| `lesson_id` | `string` | 100.0% | No | Yes | -> lessons |
| `progress_percent` | `int` | 100.0% | No |  |  |
| `session_id` | `string` | 100.0% | No | Yes | -> sessions |
| `started_at` | `string` | 100.0% | No |  |  |
| `status` | `string` | 100.0% | No |  |  |
| `steps` | `array` | 100.0% | No |  | Embedded: array |
| `steps.attempts` | `int` | 100.0% | No |  |  |
| `steps.best_score` | `int` | 100.0% | No |  |  |
| `steps.completed_at` | `null` | 100.0% | No |  |  |
| `steps.last_response` | `object` | 100.0% | No |  | Embedded: object |
| `steps.passed` | `bool` | 100.0% | No |  |  |
| `steps.status` | `string` | 100.0% | No |  |  |
| `steps.step_id` | `string` | 100.0% | No | Yes | -> steps |
| `steps.title` | `string` | 100.0% | No |  |  |
| `steps.updated_at` | `datetime` | 100.0% | No |  |  |
| `updated_at` | `string` | 100.0% | No |  |  |
| `user_id` | `string` | 100.0% | No | Yes | -> users |

### Collection: `courses`

**Documents:** 3 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `course_id_unique` | `course_id` | Yes | No | N/A |
| `course_is_published` | `is_published` | No | No | N/A |
| `course_category_key` | `category_key` | No | No | N/A |

**Schema:**

| Field | Types | Presence | Optional | Reference | Notes |
|-------|-------|----------|----------|-----------|-------|
| `_id` | `string` | 100.0% | No | Yes | -> s |
| `age_range` | `string` | 100.0% | No |  |  |
| `catalogPreview` | `array` | 100.0% | No |  | Embedded: array |
| `catalogPreview.color` | `string` | 100.0% | No |  |  |
| `catalogPreview.label` | `string` | 100.0% | No |  |  |
| `catalogPreview.value` | `string` | 100.0% | No |  |  |
| `category_icon` | `string` | 100.0% | No |  |  |
| `category_key` | `string` | 100.0% | No |  |  |
| `category_label` | `string` | 100.0% | No |  |  |
| `course_id` | `string` | 100.0% | No | Yes | -> courses |
| `created_at` | `string` | 100.0% | No |  |  |
| `description` | `string` | 100.0% | No |  |  |
| `description_vi` | `string` | 100.0% | No |  |  |
| `enrollmentCta` | `object` | 100.0% | No |  | Embedded: object |
| `enrollmentCta.body` | `string` | 100.0% | No |  |  |
| `enrollmentCta.buttonLabel` | `string` | 100.0% | No |  |  |
| `enrollmentCta.headline` | `string` | 100.0% | No |  |  |
| `is_published` | `bool` | 100.0% | No |  |  |
| `lessons` | `array` | 100.0% | No |  | Embedded: array |
| `lessons.activity` | `object` | 100.0% | No |  | Embedded: object |
| `lessons.activity.activity_id` | `string` | 100.0% | No | Yes | -> activitys |
| `lessons.activity.feedback_positive_vi` | `string` | 100.0% | No |  |  |
| `lessons.activity.instruction_vi` | `string` | 100.0% | No |  |  |
| `lessons.activity.items` | `array` | 100.0% | No |  | Embedded: array |
| `lessons.activity.items.id` | `string` | 100.0% | No | Yes | -> s |
| `lessons.activity.items.image` | `object` | 100.0% | No |  | Embedded: object |
| `lessons.activity.items.image.bucket` | `string` | 100.0% | No |  |  |
| `lessons.activity.items.image.path` | `string` | 100.0% | No |  |  |
| `lessons.activity.items.image.status` | `string` | 100.0% | No |  |  |
| `lessons.activity.items.image.type` | `string` | 100.0% | No |  |  |
| `lessons.activity.items.label` | `string` | 100.0% | No |  |  |
| `lessons.activity.prompt_audio_text` | `string` | 100.0% | No |  |  |
| `lessons.activity.type` | `string` | 100.0% | No |  |  |
| `lessons.arReference` | `null` | 100.0% | No |  |  |
| `lessons.content` | `null` | 100.0% | No |  |  |
| `lessons.description` | `string` | 100.0% | No |  |  |
| `lessons.duration_minutes` | `int` | 100.0% | No |  |  |
| `lessons.game` | `object` | 100.0% | No |  | Embedded: object |
| `lessons.game.feedback_positive_vi` | `string` | 100.0% | No |  |  |
| `lessons.game.game_id` | `string` | 100.0% | No | Yes | -> games |
| `lessons.game.instruction_vi` | `string` | 100.0% | No |  |  |
| `lessons.game.items` | `array` | 100.0% | No |  | Embedded: array |
| `lessons.game.items.id` | `string` | 100.0% | No | Yes | -> s |
| `lessons.game.items.image` | `object` | 100.0% | No |  | Embedded: object |
| `lessons.game.items.image.bucket` | `string` | 100.0% | No |  |  |
| `lessons.game.items.image.path` | `string` | 100.0% | No |  |  |
| `lessons.game.items.image.status` | `string` | 100.0% | No |  |  |
| `lessons.game.items.image.type` | `string` | 100.0% | No |  |  |
| `lessons.game.items.label` | `string` | 100.0% | No |  |  |
| `lessons.game.prompt_audio_text` | `string` | 100.0% | No |  |  |
| `lessons.game.type` | `string` | 100.0% | No |  |  |
| `lessons.generatedMedia` | `array` | 100.0% | No |  | Embedded: array |
| `lessons.generatedMedia.asset` | `object` | 100.0% | No |  | Embedded: object |
| `lessons.generatedMedia.asset.bucket` | `string` | 100.0% | No |  |  |
| `lessons.generatedMedia.asset.path` | `string` | 100.0% | No |  |  |
| `lessons.generatedMedia.asset.status` | `string` | 100.0% | No |  |  |
| `lessons.generatedMedia.asset.type` | `string` | 100.0% | No |  |  |
| `lessons.generatedMedia.prompt` | `string` | 100.0% | No |  |  |
| `lessons.generatedMedia.source` | `string` | 100.0% | No |  |  |
| `lessons.id` | `string` | 100.0% | No | Yes | -> s |
| `lessons.is_completed` | `bool` | 100.0% | No |  |  |
| `lessons.lesson_id` | `string` | 100.0% | No | Yes | -> lessons |
| `lessons.order` | `int` | 100.0% | No |  |  |
| `lessons.pronunciation` | `object` | 100.0% | No |  | Embedded: object |
| `lessons.pronunciation.audio` | `object` | 100.0% | No |  | Embedded: object |
| `lessons.pronunciation.audio.bucket` | `string` | 100.0% | No |  |  |
| `lessons.pronunciation.audio.path` | `string` | 100.0% | No |  |  |
| `lessons.pronunciation.audio.status` | `string` | 100.0% | No |  |  |
| `lessons.pronunciation.audio.type` | `string` | 100.0% | No |  |  |
| `lessons.pronunciation.feedback_positive_vi` | `string` | 100.0% | No |  |  |
| `lessons.pronunciation.instruction_vi` | `string` | 100.0% | No |  |  |
| `lessons.pronunciation.pass_score` | `int` | 100.0% | No |  |  |
| `lessons.pronunciation.prompt_audio_text` | `string` | 100.0% | No |  |  |
| `lessons.pronunciation.target_words` | `array` | 100.0% | No |  |  |
| `lessons.pronunciation.task_id` | `string` | 100.0% | No | Yes | -> tasks |
| `lessons.quiz` | `array` | 100.0% | No |  | Embedded: array |
| `lessons.quiz.correctOptionId` | `string` | 100.0% | No |  |  |
| `lessons.quiz.feedbackCorrect` | `string` | 100.0% | No |  |  |
| `lessons.quiz.feedbackIncorrect` | `string` | 100.0% | No |  |  |
| `lessons.quiz.options` | `array` | 100.0% | No |  | Embedded: array |
| `lessons.quiz.options.image` | `object` | 100.0% | No |  | Embedded: object |
| `lessons.quiz.options.image.bucket` | `string` | 100.0% | No |  |  |
| `lessons.quiz.options.image.path` | `string` | 100.0% | No |  |  |
| `lessons.quiz.options.image.status` | `string` | 100.0% | No |  |  |
| `lessons.quiz.options.image.type` | `string` | 100.0% | No |  |  |
| `lessons.quiz.options.label` | `string` | 100.0% | No |  |  |
| `lessons.quiz.options.option_id` | `string` | 100.0% | No | Yes | -> options |
| `lessons.quiz.prompt_vi` | `string` | 100.0% | No |  |  |
| `lessons.quiz.questionAudioText` | `string` | 100.0% | No |  |  |
| `lessons.quiz.question_id` | `string` | 100.0% | No | Yes | -> questions |
| `lessons.quiz.type` | `string` | 100.0% | No |  |  |
| `lessons.readAloudStory` | `object` | 100.0% | No |  | Embedded: object |
| `lessons.readAloudStory.feedback_positive_vi` | `string` | 100.0% | No |  |  |
| `lessons.readAloudStory.instruction_vi` | `string` | 100.0% | No |  |  |
| `lessons.readAloudStory.pages` | `array` | 100.0% | No |  | Embedded: array |
| `lessons.readAloudStory.pages.audio` | `object` | 100.0% | No |  | Embedded: object |
| `lessons.readAloudStory.pages.audio.bucket` | `string` | 100.0% | No |  |  |
| `lessons.readAloudStory.pages.audio.path` | `string` | 100.0% | No |  |  |
| `lessons.readAloudStory.pages.audio.status` | `string` | 100.0% | No |  |  |
| `lessons.readAloudStory.pages.audio.type` | `string` | 100.0% | No |  |  |
| `lessons.readAloudStory.pages.highlighted_words` | `array` | 100.0% | No |  |  |
| `lessons.readAloudStory.pages.image` | `object` | 100.0% | No |  | Embedded: object |
| `lessons.readAloudStory.pages.image.bucket` | `string` | 100.0% | No |  |  |
| `lessons.readAloudStory.pages.image.path` | `string` | 100.0% | No |  |  |
| `lessons.readAloudStory.pages.image.status` | `string` | 100.0% | No |  |  |
| `lessons.readAloudStory.pages.image.type` | `string` | 100.0% | No |  |  |
| `lessons.readAloudStory.pages.order` | `int` | 100.0% | No |  |  |
| `lessons.readAloudStory.pages.page_id` | `string` | 100.0% | No | Yes | -> pages |
| `lessons.readAloudStory.pages.text_en` | `string` | 100.0% | No |  |  |
| `lessons.readAloudStory.pages.text_vi` | `string` | 100.0% | No |  |  |
| `lessons.readAloudStory.story_id` | `string` | 100.0% | No | Yes | -> storys |
| `lessons.readAloudStory.title` | `string` | 100.0% | No |  |  |
| `lessons.reward` | `object` | 100.0% | No |  | Embedded: object |
| `lessons.reward.badgeTitle` | `string` | 100.0% | No |  |  |
| `lessons.reward.message_vi` | `string` | 100.0% | No |  |  |
| `lessons.reward.sticker` | `object` | 100.0% | No |  | Embedded: object |
| `lessons.reward.sticker.bucket` | `string` | 100.0% | No |  |  |
| `lessons.reward.sticker.path` | `string` | 100.0% | No |  |  |
| `lessons.reward.sticker.status` | `string` | 100.0% | No |  |  |
| `lessons.reward.sticker.type` | `string` | 100.0% | No |  |  |
| `lessons.reward.xp` | `int` | 100.0% | No |  |  |
| `lessons.title` | `string` | 100.0% | No |  |  |
| `lessons.title_vi` | `string` | 100.0% | No |  |  |
| `lessons.video` | `object` | 100.0% | No |  | Embedded: object |
| `lessons.video.duration_seconds` | `int` | 100.0% | No |  |  |
| `lessons.video.thumbnail_url` | `string` | 100.0% | No |  |  |
| `lessons.video.title` | `string` | 100.0% | No |  |  |
| `lessons.video.url` | `string` | 100.0% | No |  |  |
| `lessons.videoLesson` | `object` | 100.0% | No |  | Embedded: object |
| `lessons.videoLesson.duration_seconds` | `int` | 100.0% | No |  |  |
| `lessons.videoLesson.scenes` | `array` | 100.0% | No |  | Embedded: array |
| `lessons.videoLesson.scenes.audio_text_en` | `string` | 100.0% | No |  |  |
| `lessons.videoLesson.scenes.duration_seconds` | `int` | 100.0% | No |  |  |
| `lessons.videoLesson.scenes.image` | `object` | 100.0% | No |  | Embedded: object |
| `lessons.videoLesson.scenes.image.bucket` | `string` | 100.0% | No |  |  |
| `lessons.videoLesson.scenes.image.path` | `string` | 100.0% | No |  |  |
| `lessons.videoLesson.scenes.image.status` | `string` | 100.0% | No |  |  |
| `lessons.videoLesson.scenes.image.type` | `string` | 100.0% | No |  |  |
| `lessons.videoLesson.scenes.narration_vi` | `string` | 100.0% | No |  |  |
| `lessons.videoLesson.scenes.order` | `int` | 100.0% | No |  |  |
| `lessons.videoLesson.scenes.scene_id` | `string` | 100.0% | No | Yes | -> scenes |
| `lessons.videoLesson.scenes.visual_prompt` | `string` | 100.0% | No |  |  |
| `lessons.videoLesson.thumbnail` | `object` | 100.0% | No |  | Embedded: object |
| `lessons.videoLesson.thumbnail.bucket` | `string` | 100.0% | No |  |  |
| `lessons.videoLesson.thumbnail.path` | `string` | 100.0% | No |  |  |
| `lessons.videoLesson.thumbnail.status` | `string` | 100.0% | No |  |  |
| `lessons.videoLesson.thumbnail.type` | `string` | 100.0% | No |  |  |
| `lessons.videoLesson.title` | `string` | 100.0% | No |  |  |
| `lessons.videoLesson.video` | `object` | 100.0% | No |  | Embedded: object |
| `lessons.videoLesson.video.bucket` | `string` | 100.0% | No |  |  |
| `lessons.videoLesson.video.path` | `string` | 100.0% | No |  |  |
| `lessons.videoLesson.video.status` | `string` | 100.0% | No |  |  |
| `lessons.videoLesson.video.type` | `string` | 100.0% | No |  |  |
| `lessons.vocabulary` | `array` | 100.0% | No |  | Embedded: array |
| `lessons.vocabulary.audio` | `object` | 100.0% | No |  | Embedded: object |
| `lessons.vocabulary.audio.bucket` | `string` | 100.0% | No |  |  |
| `lessons.vocabulary.audio.path` | `string` | 100.0% | No |  |  |
| `lessons.vocabulary.audio.status` | `string` | 100.0% | No |  |  |
| `lessons.vocabulary.audio.type` | `string` | 100.0% | No |  |  |
| `lessons.vocabulary.emoji` | `string` | 100.0% | No |  |  |
| `lessons.vocabulary.image` | `object` | 100.0% | No |  | Embedded: object |
| `lessons.vocabulary.image.bucket` | `string` | 100.0% | No |  |  |
| `lessons.vocabulary.image.path` | `string` | 100.0% | No |  |  |
| `lessons.vocabulary.image.status` | `string` | 100.0% | No |  |  |
| `lessons.vocabulary.image.type` | `string` | 100.0% | No |  |  |
| `lessons.vocabulary.simple_sentence` | `string` | 100.0% | No |  |  |
| `lessons.vocabulary.sticker` | `object` | 100.0% | No |  | Embedded: object |
| `lessons.vocabulary.sticker.bucket` | `string` | 100.0% | No |  |  |
| `lessons.vocabulary.sticker.path` | `string` | 100.0% | No |  |  |
| `lessons.vocabulary.sticker.status` | `string` | 100.0% | No |  |  |
| `lessons.vocabulary.sticker.type` | `string` | 100.0% | No |  |  |
| `lessons.vocabulary.word_en` | `string` | 100.0% | No |  |  |
| `lessons.vocabulary.word_vi` | `string` | 100.0% | No |  |  |
| `level` | `string` | 100.0% | No |  |  |
| `studentTestimonials` | `array` | 100.0% | No |  | Embedded: array |
| `studentTestimonials.avatar` | `string` | 100.0% | No |  |  |
| `studentTestimonials.name` | `string` | 100.0% | No |  |  |
| `studentTestimonials.quote` | `string` | 100.0% | No |  |  |
| `studentTestimonials.role` | `string` | 100.0% | No |  |  |
| `subtitle_vi` | `string` | 100.0% | No |  |  |
| `theme` | `string` | 100.0% | No |  |  |
| `thumbnail` | `object` | 100.0% | No |  | Embedded: object |
| `thumbnail.bucket` | `string` | 100.0% | No |  |  |
| `thumbnail.path` | `string` | 100.0% | No |  |  |
| `thumbnail.status` | `string` | 100.0% | No |  |  |
| `thumbnail.type` | `string` | 100.0% | No |  |  |
| `thumbnail_url` | `null` | 100.0% | No |  |  |
| `title` | `string` | 100.0% | No |  |  |
| `updated_at` | `string` | 100.0% | No |  |  |

### Collection: `session_logs`

**Documents:** 7 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `user_id_1` | `user_id` | No | No | N/A |
| `user_id_1_started_at_-1` | `user_id`, `started_at` | No | No | N/A |
| `active_topic_1_started_at_-1` | `active_topic`, `started_at` | No | No | N/A |
| `session_logs_ttl` | `started_at` | No | No | 2592000 |

**Schema:**

| Field | Types | Presence | Optional | Reference | Notes |
|-------|-------|----------|----------|-----------|-------|
| `_id` | `string` | 100.0% | No | Yes | -> s |
| `active_topic` | `null` | 100.0% | No |  |  |
| `break_reminder_sent` | `bool` | 100.0% | No |  |  |
| `duration_seconds` | `null` | 100.0% | No |  |  |
| `ended_at` | `null` | 100.0% | No |  |  |
| `started_at` | `string` | 100.0% | No |  |  |
| `user_id` | `string` | 100.0% | No | Yes | -> users |

### Collection: `users`

**Documents:** 11 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `email_1` | `email` | Yes | No | N/A |
| `username_1` | `username` | Yes | No | N/A |

**Schema:**

| Field | Types | Presence | Optional | Reference | Notes |
|-------|-------|----------|----------|-----------|-------|
| `_id` | `string` | 100.0% | No | Yes | -> s |
| `active_pet` | `null`, `string` | 100.0% | No |  |  |
| `avatar_url` | `null` | 100.0% | No |  |  |
| `created_at` | `string` | 100.0% | No |  |  |
| `email` | `string` | 100.0% | No |  |  |
| `full_name` | `string` | 100.0% | No |  |  |
| `hashed_password` | `string` | 100.0% | No |  |  |
| `is_active` | `bool` | 100.0% | No |  |  |
| `is_superuser` | `bool` | 100.0% | No |  |  |
| `is_verified` | `bool` | 100.0% | No |  |  |
| `last_login` | `null` | 100.0% | No |  |  |
| `pet_preferences` | `null` | 100.0% | No |  |  |
| `unlocked_pets` | `array` | 100.0% | No |  |  |
| `updated_at` | `null`, `string` | 100.0% | No |  |  |
| `username` | `string` | 100.0% | No |  |  |

### Collection: `ai_feedback`

**Documents:** 1 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |

**Schema:**

| Field | Types | Presence | Optional | Reference | Notes |
|-------|-------|----------|----------|-----------|-------|
| `_id` | `string` | 100.0% | No | Yes | -> s |
| `pronunciation_score` | `int` | 100.0% | No |  |  |
| `timestamp` | `string` | 100.0% | No |  |  |
| `user_id` | `string` | 100.0% | No | Yes | -> users |
| `word` | `string` | 100.0% | No |  |  |

### Collection: `learning_paths`

**Documents:** 0 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `user_id_1` | `user_id` | No | No | N/A |

*No schema data (empty collection or sampling failed)*

### Collection: `course_lessons`

**Documents:** 0 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `lesson_id_1` | `lesson_id` | No | No | N/A |
| `course_id_1` | `course_id` | No | No | N/A |
| `created_by_1` | `created_by` | No | No | N/A |
| `course_id_1_order_1` | `course_id`, `order` | No | No | N/A |
| `status_1` | `status` | No | No | N/A |
| `lesson_type_1` | `lesson_type` | No | No | N/A |
| `status_1_lesson_type_1` | `status`, `lesson_type` | No | No | N/A |
| `created_by_1_status_1` | `created_by`, `status` | No | No | N/A |

*No schema data (empty collection or sampling failed)*

### Collection: `user_course_progress`

**Documents:** 3 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |

**Schema:**

| Field | Types | Presence | Optional | Reference | Notes |
|-------|-------|----------|----------|-----------|-------|
| `_id` | `string` | 100.0% | No | Yes | -> s |
| `completed_lessons` | `array` | 100.0% | No |  |  |
| `course_id` | `string` | 100.0% | No | Yes | -> courses |
| `current_lesson_id` | `string` | 100.0% | No | Yes | -> current_lessons |
| `lesson_progress` | `array` | 100.0% | No |  | Embedded: array |
| `lesson_progress.attempts` | `int` | 100.0% | No |  |  |
| `lesson_progress.best_score` | `int` | 100.0% | No |  |  |
| `lesson_progress.completed_at` | `null` | 100.0% | No |  |  |
| `lesson_progress.lesson_id` | `string` | 100.0% | No | Yes | -> lessons |
| `lesson_progress.status` | `string` | 100.0% | No |  |  |
| `rewards` | `array` | 100.0% | No |  |  |
| `started_at` | `string` | 100.0% | No |  |  |
| `status` | `string` | 100.0% | No |  |  |
| `total_xp` | `int` | 100.0% | No |  |  |
| `updated_at` | `string` | 100.0% | No |  |  |
| `user_id` | `string` | 100.0% | No | Yes | -> users |

### Collection: `user_sessions`

**Documents:** 0 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `session_id_1` | `session_id` | No | No | N/A |
| `user_id_1` | `user_id` | No | No | N/A |
| `user_id_1_status_1` | `user_id`, `status` | No | No | N/A |
| `user_id_1_started_at_1` | `user_id`, `started_at` | No | No | N/A |
| `status_1` | `status` | No | No | N/A |
| `status_1_started_at_1` | `status`, `started_at` | No | No | N/A |
| `course_id_1_started_at_1` | `course_id`, `started_at` | No | No | N/A |
| `lesson_id_1_started_at_1` | `lesson_id`, `started_at` | No | No | N/A |

*No schema data (empty collection or sampling failed)*

### Collection: `rag_cache`

**Documents:** 0 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `rag_cache_key_unique` | `key` | Yes | No | N/A |
| `rag_cache_ttl` | `expires_at` | No | No | N/A |

*No schema data (empty collection or sampling failed)*

### Collection: `quiz_questions`

**Documents:** 1 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |

**Schema:**

| Field | Types | Presence | Optional | Reference | Notes |
|-------|-------|----------|----------|-----------|-------|
| `_id` | `string` | 100.0% | No | Yes | -> s |
| `flashcard_qr_id` | `string` | 100.0% | No | Yes | -> flashcard_qrs |
| `passing_score` | `int` | 100.0% | No |  |  |
| `questions` | `array` | 100.0% | No |  | Embedded: array |
| `questions.correct_answer` | `string` | 100.0% | No |  |  |
| `questions.explanation` | `string` | 100.0% | No |  |  |
| `questions.id` | `string` | 100.0% | No | Yes | -> s |
| `questions.options` | `array` | 100.0% | No |  |  |
| `questions.question_text` | `string` | 100.0% | No |  |  |
| `questions.type` | `string` | 100.0% | No |  |  |
| `time_limit` | `int` | 100.0% | No |  |  |

### Collection: `combos`

**Documents:** 1 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |

**Schema:**

| Field | Types | Presence | Optional | Reference | Notes |
|-------|-------|----------|----------|-----------|-------|
| `_id` | `string` | 100.0% | No | Yes | -> s |
| `animation_url` | `null` | 100.0% | No |  |  |
| `audio_url` | `string` | 100.0% | No |  |  |
| `center_transform` | `object` | 100.0% | No |  | Embedded: object |
| `center_transform.position` | `string` | 100.0% | No |  |  |
| `center_transform.rotation` | `string` | 100.0% | No |  |  |
| `center_transform.scale` | `string` | 100.0% | No |  |  |
| `combo_id` | `string` | 100.0% | No | Yes | -> combos |
| `combo_mind_url` | `string` | 100.0% | No |  |  |
| `created_at` | `string` | 100.0% | No |  |  |
| `description` | `string` | 100.0% | No |  |  |
| `image_2d_url` | `string` | 100.0% | No |  |  |
| `model_3d_url` | `string` | 100.0% | No |  |  |
| `name` | `string` | 100.0% | No |  |  |
| `required_tags` | `array` | 100.0% | No |  |  |
| `reward_badge` | `string` | 100.0% | No |  |  |
| `reward_xp` | `int` | 100.0% | No |  |  |

### Collection: `mini_game_bank`

**Documents:** 20 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |

**Schema:**

| Field | Types | Presence | Optional | Reference | Notes |
|-------|-------|----------|----------|-----------|-------|
| `_comment` | `string` | 90.0% | Yes |  |  |
| `_id` | `string` | 100.0% | No | Yes | -> s |
| `celebration_right` | `string` | 100.0% | No |  |  |
| `choices` | `array` | 50.0% | Yes |  |  |
| `correct_answer` | `string` | 80.0% | Yes |  |  |
| `correct_words` | `array` | 30.0% | Yes |  |  |
| `difficulty` | `string` | 100.0% | No |  |  |
| `encouragement_wrong` | `string` | 100.0% | No |  |  |
| `flashcard_qr_id` | `string` | 100.0% | No | Yes | -> flashcard_qrs |
| `game_config` | `object` | 50.0% | Yes |  | Embedded: object |
| `game_config.fall_speed` | `int` | 30.0% | Yes |  |  |
| `game_config.grid_size` | `string` | 20.0% | Yes |  |  |
| `game_config.max_flips` | `int` | 20.0% | Yes |  |  |
| `game_config.spawn_interval` | `int` | 30.0% | Yes |  |  |
| `game_type` | `string` | 100.0% | No |  |  |
| `hint` | `string` | 100.0% | No |  |  |
| `image_url` | `string` | 100.0% | No |  |  |
| `pairs` | `array` | 20.0% | Yes |  | Embedded: array |
| `pairs.content` | `string` | 20.0% | Yes |  |  |
| `pairs.id` | `string` | 20.0% | Yes | Yes | -> s |
| `pairs.type` | `string` | 20.0% | Yes |  |  |
| `question` | `string` | 100.0% | No |  |  |
| `scrambled` | `string` | 20.0% | Yes |  |  |
| `scrambled_word` | `string` | 30.0% | Yes |  |  |
| `stars_reward` | `int` | 100.0% | No |  |  |
| `time_limit` | `int`, `null` | 100.0% | No |  |  |
| `wrong_words` | `array` | 30.0% | Yes |  |  |

### Collection: `lesson_step_attempts`

**Documents:** 0 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `lesson_attempt_session_attempted` | `session_id`, `attempted_at` | No | No | N/A |
| `lesson_attempt_user_course_lesson_step` | `user_id`, `course_id`, `lesson_id`, `step_id` | No | No | N/A |

*No schema data (empty collection or sampling failed)*

### Collection: `ar_combinations`

**Documents:** 9 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `combo_id_1` | `combo_id` | Yes | No | N/A |
| `required_tags_1` | `required_tags` | No | No | N/A |
| `flashcard_set_1_active_1` | `flashcard_set`, `active` | No | No | N/A |
| `semantic_result_1` | `semantic_result` | No | No | N/A |

**Schema:**

| Field | Types | Presence | Optional | Reference | Notes |
|-------|-------|----------|----------|-----------|-------|
| `_id` | `string` | 100.0% | No | Yes | -> s |
| `active` | `bool` | 100.0% | No |  |  |
| `animation` | `null` | 100.0% | No |  |  |
| `bonus_xp` | `int` | 11.1% | Yes |  |  |
| `center_transform` | `object` | 100.0% | No |  | Embedded: object |
| `center_transform.position` | `string` | 100.0% | No |  |  |
| `center_transform.rotation` | `string` | 100.0% | No |  |  |
| `center_transform.scale` | `string` | 100.0% | No |  |  |
| `combo_id` | `string` | 100.0% | No | Yes | -> combos |
| `combo_mind_url` | `string` | 100.0% | No |  |  |
| `combo_name` | `string` | 88.9% | Yes |  |  |
| `created_at` | `string` | 100.0% | No |  |  |
| `description` | `string` | 100.0% | No |  |  |
| `flashcard_set` | `null` | 100.0% | No |  |  |
| `image_2d_url` | `string` | 100.0% | No |  |  |
| `model_3d_url` | `string` | 100.0% | No |  |  |
| `phrase` | `null` | 100.0% | No |  |  |
| `priority` | `int` | 100.0% | No |  |  |
| `required_tags` | `array` | 100.0% | No |  |  |
| `reward_points` | `int` | 88.9% | Yes |  |  |
| `semantic_result` | `null` | 100.0% | No |  |  |
| `sound` | `null` | 100.0% | No |  |  |
| `target_order` | `array` | 11.1% | Yes |  |  |
| `texture_url` | `null`, `string` | 22.2% | Yes |  |  |
| `updated_at` | `string` | 100.0% | No |  |  |

### Collection: `pronunciation_attempts`

**Documents:** 0 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `user_id_1` | `user_id` | No | No | N/A |
| `flashcard_qr_id_1` | `flashcard_qr_id` | No | No | N/A |
| `user_id_1_flashcard_qr_id_1` | `user_id`, `flashcard_qr_id` | No | No | N/A |
| `user_id_1_attempted_at_-1` | `user_id`, `attempted_at` | No | No | N/A |
| `pronunciation_course_lesson_section_attempted` | `course_id`, `lesson_id`, `section_id`, `attempted_at` | No | No | N/A |
| `pronunciation_session_attempted` | `session_id`, `attempted_at` | No | Yes | N/A |
| `attempt_id_1` | `attempt_id` | No | No | N/A |
| `course_id_1_lesson_id_1` | `course_id`, `lesson_id` | No | No | N/A |
| `processing_status_partial` | `status` | No | No | N/A |
| `pronunciation_attempts_ttl` | `attempted_at` | No | No | 7776000 |

*No schema data (empty collection or sampling failed)*

### Collection: `word_mastery`

**Documents:** 0 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `word_mastery_user_course_lesson_word_unique` | `user_id`, `course_id`, `lesson_id`, `word` | Yes | No | N/A |
| `word_mastery_user_updated` | `user_id`, `updated_at` | No | No | N/A |

*No schema data (empty collection or sampling failed)*

### Collection: `chat_logs`

**Documents:** 0 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `chat_logs_session_sender_time` | `session_id`, `sender`, `timestamp` | No | No | N/A |

*No schema data (empty collection or sampling failed)*

### Collection: `quiz_attempts`

**Documents:** 0 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `user_id_1` | `user_id` | No | No | N/A |
| `quiz_type_1` | `quiz_type` | No | No | N/A |
| `user_id_1_attempted_at_-1` | `user_id`, `attempted_at` | No | No | N/A |
| `user_id_1_quiz_type_1` | `user_id`, `quiz_type` | No | No | N/A |
| `quiz_attempts_ttl` | `attempted_at` | No | No | 7776000 |

*No schema data (empty collection or sampling failed)*

### Collection: `learning_progress`

**Documents:** 0 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `user_id_1` | `user_id` | No | No | N/A |
| `flashcard_qr_id_1` | `flashcard_qr_id` | No | No | N/A |
| `user_id_1_flashcard_qr_id_1` | `user_id`, `flashcard_qr_id` | No | No | N/A |
| `user_id_1_mastery_level_-1` | `user_id`, `mastery_level` | No | No | N/A |
| `mastered_items_partial` | `mastery_level` | No | No | N/A |
| `next_review_at_1` | `next_review_at` | No | No | N/A |

*No schema data (empty collection or sampling failed)*

### Collection: `media_assets`

**Documents:** 645 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `media_asset_course_lesson_section_key_path_unique` | `course_id`, `lesson_id`, `section_id`, `asset_key`, `path` | Yes | No | N/A |
| `media_asset_course_lesson_section` | `course_id`, `lesson_id`, `section_id` | No | No | N/A |

**Schema:**

| Field | Types | Presence | Optional | Reference | Notes |
|-------|-------|----------|----------|-----------|-------|
| `_id` | `string` | 100.0% | No | Yes | -> s |
| `asset_key` | `string` | 100.0% | No |  |  |
| `bucket` | `string` | 100.0% | No |  |  |
| `course_id` | `string` | 100.0% | No | Yes | -> courses |
| `created_at` | `string` | 100.0% | No |  |  |
| `lesson_id` | `string` | 100.0% | No | Yes | -> lessons |
| `metadata` | `object` | 100.0% | No |  | Embedded: object |
| `metadata.duration_seconds` | `int` | 3.0% | Yes |  |  |
| `metadata.order` | `int` | 21.0% | Yes |  |  |
| `path` | `string` | 100.0% | No |  |  |
| `provider` | `string` | 100.0% | No |  |  |
| `public_url` | `string` | 100.0% | No |  |  |
| `section_id` | `string` | 100.0% | No | Yes | -> sections |
| `status` | `string` | 100.0% | No |  |  |
| `type` | `string` | 100.0% | No |  |  |
| `updated_at` | `string` | 100.0% | No |  |  |

### Collection: `flashcard_editor`

**Documents:** 0 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `flashcard_id_1` | `flashcard_id` | No | No | N/A |
| `created_by_1` | `created_by` | No | No | N/A |
| `created_at_-1` | `created_at` | No | No | N/A |

*No schema data (empty collection or sampling failed)*

### Collection: `feedback_templates`

**Documents:** 0 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `category_1` | `category` | No | No | N/A |
| `language_1` | `language` | No | No | N/A |
| `is_active_1` | `is_active` | No | No | N/A |
| `category_1_language_1_is_active_1` | `category`, `language`, `is_active` | No | No | N/A |

*No schema data (empty collection or sampling failed)*

### Collection: `user_points`

**Documents:** 9 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |

**Schema:**

| Field | Types | Presence | Optional | Reference | Notes |
|-------|-------|----------|----------|-----------|-------|
| `_id` | `string` | 100.0% | No | Yes | -> s |
| `badges` | `array` | 11.1% | Yes |  |  |
| `last_activity_date` | `string` | 100.0% | No |  |  |
| `level` | `int` | 100.0% | No |  |  |
| `longest_streak` | `int` | 100.0% | No |  |  |
| `pet` | `object` | 22.2% | Yes |  | Embedded: object |
| `pet.animation_clip` | `string` | 11.1% | Yes |  |  |
| `pet.energy` | `int` | 11.1% | Yes |  |  |
| `pet.happiness` | `int` | 22.2% | Yes |  |  |
| `pet.hunger` | `int` | 11.1% | Yes |  |  |
| `pet.last_action` | `string` | 11.1% | Yes |  |  |
| `pet.last_care_at` | `datetime` | 11.1% | Yes |  |  |
| `pet.last_fed` | `datetime` | 22.2% | Yes |  |  |
| `pet.last_mood_update` | `datetime` | 11.1% | Yes |  |  |
| `pet.last_played` | `datetime` | 11.1% | Yes |  |  |
| `pet.mood` | `string` | 11.1% | Yes |  |  |
| `pet.needs_attention` | `bool` | 11.1% | Yes |  |  |
| `pet.outfit` | `string` | 11.1% | Yes |  |  |
| `pet.stage` | `string` | 11.1% | Yes |  |  |
| `pet.type` | `string` | 22.2% | Yes |  |  |
| `pet.xp_earned` | `int` | 11.1% | Yes |  |  |
| `stickers` | `array` | 11.1% | Yes |  | Embedded: array |
| `stickers.earned_at` | `datetime` | 11.1% | Yes |  |  |
| `stickers.id` | `string` | 11.1% | Yes | Yes | -> s |
| `stickers.imageUrl` | `string` | 11.1% | Yes |  |  |
| `stickers.name` | `string` | 11.1% | Yes |  |  |
| `stickers.rarity` | `string` | 11.1% | Yes |  |  |
| `streak_days` | `int` | 100.0% | No |  |  |
| `total_points` | `int` | 100.0% | No |  |  |
| `user_id` | `string` | 100.0% | No | Yes | -> users |
| `xp_to_next_level` | `int` | 100.0% | No |  |  |

### Collection: `ar_objects`

**Documents:** 28 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `ar_tag_1` | `ar_tag` | Yes | No | N/A |
| `animation_type_1` | `animation_type` | No | No | N/A |

**Schema:**

| Field | Types | Presence | Optional | Reference | Notes |
|-------|-------|----------|----------|-----------|-------|
| `_id` | `string` | 100.0% | No | Yes | -> s |
| `animation_type` | `string` | 100.0% | No |  |  |
| `ar_tag` | `string` | 100.0% | No |  |  |
| `created_at` | `string` | 100.0% | No |  |  |
| `description` | `string` | 100.0% | No |  |  |
| `glb_size` | `double` | 100.0% | No |  |  |
| `image_2d_url` | `string` | 100.0% | No |  |  |
| `image_2d_url_updated` | `bool` | 50.0% | Yes |  |  |
| `model_3d_url` | `string` | 100.0% | No |  |  |
| `nft_base_url` | `string` | 100.0% | No |  |  |
| `nft_base_url_updated` | `bool` | 39.3% | Yes |  |  |
| `position` | `string` | 100.0% | No |  |  |
| `rotation` | `string` | 100.0% | No |  |  |
| `scale` | `string` | 100.0% | No |  |  |
| `texture_url` | `null`, `string` | 17.9% | Yes |  |  |
| `updated_at` | `null`, `string` | 17.9% | Yes |  |  |

### Collection: `flashcards`

**Documents:** 16 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `qr_id_1` | `qr_id` | Yes | No | N/A |
| `category_1` | `category` | No | No | N/A |
| `difficulty_1` | `difficulty` | No | No | N/A |
| `is_active_1` | `is_active` | No | No | N/A |
| `deck_id_1_created_at_1` | `deck_id`, `created_at` | No | No | N/A |
| `teacher_id_1` | `teacher_id` | No | No | N/A |

**Schema:**

| Field | Types | Presence | Optional | Reference | Notes |
|-------|-------|----------|----------|-----------|-------|
| `_id` | `string` | 100.0% | No | Yes | -> s |
| `ar_tag` | `string` | 100.0% | No |  |  |
| `audio_url` | `null` | 100.0% | No |  |  |
| `category` | `string` | 100.0% | No |  |  |
| `created_at` | `string` | 100.0% | No |  |  |
| `definition` | `string` | 100.0% | No |  |  |
| `difficulty` | `string` | 100.0% | No |  |  |
| `image_animation_type` | `string` | 100.0% | No |  |  |
| `image_url` | `string` | 100.0% | No |  |  |
| `qr_id` | `string` | 100.0% | No | Yes | -> qrs |
| `translation` | `object` | 100.0% | No |  | Embedded: object |
| `translation.en` | `string` | 100.0% | No |  |  |
| `translation.vi` | `string` | 100.0% | No |  |  |
| `updated_at` | `string` | 12.5% | Yes |  |  |
| `vector_embedding` | `null` | 100.0% | No |  |  |
| `word` | `string` | 100.0% | No |  |  |

### Collection: `profile_content`

**Documents:** 0 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `key_1` | `key` | Yes | No | N/A |

*No schema data (empty collection or sampling failed)*

## Database: `eduplatform`

**Collections:** 15

### Collection: `learning_progress`

**Documents:** 0 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `user_id_1` | `user_id` | No | No | N/A |
| `flashcard_qr_id_1` | `flashcard_qr_id` | No | No | N/A |
| `user_id_1_flashcard_qr_id_1` | `user_id`, `flashcard_qr_id` | No | No | N/A |
| `user_id_1_mastery_level_-1` | `user_id`, `mastery_level` | No | No | N/A |
| `mastered_items_partial` | `mastery_level` | No | No | N/A |
| `next_review_at_1` | `next_review_at` | No | No | N/A |

*No schema data (empty collection or sampling failed)*

### Collection: `pronunciation_attempts`

**Documents:** 0 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `attempt_id_1` | `attempt_id` | No | No | N/A |
| `user_id_1` | `user_id` | No | No | N/A |
| `flashcard_qr_id_1` | `flashcard_qr_id` | No | No | N/A |
| `user_id_1_flashcard_qr_id_1` | `user_id`, `flashcard_qr_id` | No | No | N/A |
| `user_id_1_attempted_at_-1` | `user_id`, `attempted_at` | No | No | N/A |
| `course_id_1_lesson_id_1` | `course_id`, `lesson_id` | No | No | N/A |
| `processing_status_partial` | `status` | No | No | N/A |
| `pronunciation_attempts_ttl` | `attempted_at` | No | No | 7776000 |

*No schema data (empty collection or sampling failed)*

### Collection: `course_lessons`

**Documents:** 0 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `lesson_id_1` | `lesson_id` | No | No | N/A |
| `course_id_1` | `course_id` | No | No | N/A |
| `created_by_1` | `created_by` | No | No | N/A |
| `course_id_1_order_1` | `course_id`, `order` | No | No | N/A |
| `status_1` | `status` | No | No | N/A |
| `lesson_type_1` | `lesson_type` | No | No | N/A |
| `status_1_lesson_type_1` | `status`, `lesson_type` | No | No | N/A |
| `created_by_1_status_1` | `created_by`, `status` | No | No | N/A |

*No schema data (empty collection or sampling failed)*

### Collection: `learning_paths`

**Documents:** 0 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `user_id_1` | `user_id` | No | No | N/A |

*No schema data (empty collection or sampling failed)*

### Collection: `ar_combinations`

**Documents:** 0 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `combo_id_1` | `combo_id` | Yes | No | N/A |
| `required_tags_1` | `required_tags` | No | No | N/A |
| `flashcard_set_1_active_1` | `flashcard_set`, `active` | No | No | N/A |
| `semantic_result_1` | `semantic_result` | No | No | N/A |

*No schema data (empty collection or sampling failed)*

### Collection: `user_sessions`

**Documents:** 0 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `session_id_1` | `session_id` | No | No | N/A |
| `user_id_1` | `user_id` | No | No | N/A |
| `user_id_1_status_1` | `user_id`, `status` | No | No | N/A |
| `user_id_1_started_at_1` | `user_id`, `started_at` | No | No | N/A |
| `status_1` | `status` | No | No | N/A |
| `status_1_started_at_1` | `status`, `started_at` | No | No | N/A |
| `course_id_1_started_at_1` | `course_id`, `started_at` | No | No | N/A |
| `lesson_id_1_started_at_1` | `lesson_id`, `started_at` | No | No | N/A |

*No schema data (empty collection or sampling failed)*

### Collection: `profile_content`

**Documents:** 0 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `key_1` | `key` | Yes | No | N/A |

*No schema data (empty collection or sampling failed)*

### Collection: `pets`

**Documents:** 0 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `pet_id_1` | `pet_id` | Yes | No | N/A |

*No schema data (empty collection or sampling failed)*

### Collection: `users`

**Documents:** 0 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `email_1` | `email` | Yes | No | N/A |
| `username_1` | `username` | Yes | No | N/A |

*No schema data (empty collection or sampling failed)*

### Collection: `quiz_attempts`

**Documents:** 0 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `user_id_1` | `user_id` | No | No | N/A |
| `quiz_type_1` | `quiz_type` | No | No | N/A |
| `user_id_1_attempted_at_-1` | `user_id`, `attempted_at` | No | No | N/A |
| `user_id_1_quiz_type_1` | `user_id`, `quiz_type` | No | No | N/A |
| `quiz_attempts_ttl` | `attempted_at` | No | No | 7776000 |

*No schema data (empty collection or sampling failed)*

### Collection: `flashcards`

**Documents:** 0 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `qr_id_1` | `qr_id` | Yes | No | N/A |
| `category_1` | `category` | No | No | N/A |
| `difficulty_1` | `difficulty` | No | No | N/A |
| `is_active_1` | `is_active` | No | No | N/A |
| `deck_id_1_created_at_1` | `deck_id`, `created_at` | No | No | N/A |
| `teacher_id_1` | `teacher_id` | No | No | N/A |

*No schema data (empty collection or sampling failed)*

### Collection: `redis_cache`

**Documents:** 0 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `cache_key_1` | `cache_key` | No | No | N/A |
| `cache_type_1` | `cache_type` | No | No | N/A |
| `cache_type_1_expires_at_1` | `cache_type`, `expires_at` | No | No | N/A |
| `cache_type_1_created_at_1` | `cache_type`, `created_at` | No | No | N/A |
| `cache_ttl` | `expires_at` | No | No | N/A |

*No schema data (empty collection or sampling failed)*

### Collection: `feedback_templates`

**Documents:** 0 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `category_1` | `category` | No | No | N/A |
| `language_1` | `language` | No | No | N/A |
| `is_active_1` | `is_active` | No | No | N/A |
| `category_1_language_1_is_active_1` | `category`, `language`, `is_active` | No | No | N/A |

*No schema data (empty collection or sampling failed)*

### Collection: `flashcard_editor`

**Documents:** 0 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `flashcard_id_1` | `flashcard_id` | No | No | N/A |
| `created_by_1` | `created_by` | No | No | N/A |
| `created_at_-1` | `created_at` | No | No | N/A |

*No schema data (empty collection or sampling failed)*

### Collection: `session_logs`

**Documents:** 0 (estimated (exact used))

**Indexes:**
| Name | Keys | Unique | Sparse | TTL |
|------|------|--------|--------|-----|
| `_id_` | `_id` | No | No | N/A |
| `user_id_1` | `user_id` | No | No | N/A |
| `user_id_1_started_at_-1` | `user_id`, `started_at` | No | No | N/A |
| `active_topic_1_started_at_-1` | `active_topic`, `started_at` | No | No | N/A |
| `session_logs_ttl` | `started_at` | No | No | 2592000 |

*No schema data (empty collection or sampling failed)*
