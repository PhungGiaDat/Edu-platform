-- MongoDB -> PostgreSQL mobile-first baseline.
-- Schema owner: this versioned SQL migration, applied through the configured
-- Supabase migration mechanism.  Prisma is not present in this repository.
-- The migration is additive: it does not drop the three empty legacy tables.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- The pre-existing empty table is the user identity owner.  Legacy ObjectId
-- strings remain public IDs, so no new UUID is introduced.
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'learner',
    ADD COLUMN IF NOT EXISTS roles JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS active_pet_id TEXT,
    ADD COLUMN IF NOT EXISTS pet_preferences JSONB,
    ADD COLUMN IF NOT EXISTS legacy_mongo_id TEXT UNIQUE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email ON public.users (email);
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username ON public.users (username);

CREATE TABLE IF NOT EXISTS public.pets (
    pet_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_vi TEXT,
    model_url TEXT,
    texture_url TEXT,
    thumbnail_url TEXT,
    category TEXT,
    pack_source TEXT,
    rarity TEXT,
    color TEXT,
    animations JSONB NOT NULL DEFAULT '[]'::jsonb,
    unlock_condition JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.user_unlocked_pets (
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    pet_id TEXT NOT NULL REFERENCES public.pets(pet_id) ON DELETE RESTRICT,
    PRIMARY KEY (user_id, pet_id)
);

ALTER TABLE public.users
    ADD CONSTRAINT fk_users_active_pet
    FOREIGN KEY (active_pet_id) REFERENCES public.pets(pet_id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.courses (
    course_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    title_vi TEXT NOT NULL DEFAULT '',
    description TEXT,
    description_vi TEXT NOT NULL DEFAULT '',
    thumbnail_url TEXT,
    subtitle_vi TEXT NOT NULL DEFAULT '',
    theme TEXT NOT NULL DEFAULT '',
    category_key TEXT NOT NULL DEFAULT '',
    category_label TEXT NOT NULL DEFAULT '',
    category_icon TEXT NOT NULL DEFAULT '',
    age_range TEXT NOT NULL DEFAULT '5-8',
    level TEXT NOT NULL DEFAULT 'beginner',
    thumbnail JSONB,
    catalog_preview JSONB NOT NULL DEFAULT '[]'::jsonb,
    student_testimonials JSONB NOT NULL DEFAULT '[]'::jsonb,
    enrollment_cta JSONB,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    CONSTRAINT ck_courses_level CHECK (level IN ('beginner', 'intermediate', 'advanced'))
);
CREATE INDEX IF NOT EXISTS idx_courses_published ON public.courses (is_published);
CREATE INDEX IF NOT EXISTS idx_courses_category_key ON public.courses (category_key);

CREATE TABLE IF NOT EXISTS public.lessons (
    lesson_id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES public.courses(course_id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    title_vi TEXT NOT NULL DEFAULT '',
    description TEXT,
    lesson_order INTEGER NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 3 CHECK (duration_minutes >= 0),
    content TEXT,
    video JSONB,
    media JSONB,
    learning_blocks JSONB NOT NULL DEFAULT '{}'::jsonb,
    reward JSONB,
    ar_reference JSONB,
    generated_media JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (course_id, lesson_order)
);
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON public.lessons (course_id);

CREATE TABLE IF NOT EXISTS public.flashcard_decks (
    deck_id TEXT PRIMARY KEY,
    name JSONB NOT NULL,
    description JSONB,
    cover_image_url TEXT,
    category TEXT,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    teacher_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    card_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.flashcards (
    qr_id TEXT PRIMARY KEY,
    deck_id TEXT REFERENCES public.flashcard_decks(deck_id) ON DELETE SET NULL,
    teacher_id TEXT,
    ar_tag TEXT,
    word TEXT NOT NULL,
    translation JSONB NOT NULL,
    definition TEXT,
    category TEXT NOT NULL,
    image_url TEXT NOT NULL,
    audio_url TEXT,
    difficulty TEXT NOT NULL DEFAULT 'easy',
    image_animation_type TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_flashcards_ar_tag ON public.flashcards (ar_tag);
CREATE INDEX IF NOT EXISTS idx_flashcards_category ON public.flashcards (category);
CREATE INDEX IF NOT EXISTS idx_flashcards_difficulty ON public.flashcards (difficulty);

CREATE TABLE IF NOT EXISTS public.media_assets (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES public.courses(course_id) ON DELETE RESTRICT,
    lesson_id TEXT NOT NULL REFERENCES public.lessons(lesson_id) ON DELETE RESTRICT,
    section_id TEXT NOT NULL,
    asset_key TEXT NOT NULL,
    bucket TEXT NOT NULL,
    path TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    public_url TEXT,
    provider TEXT NOT NULL DEFAULT 'supabase',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    UNIQUE (course_id, lesson_id, section_id, asset_key, path)
);
CREATE INDEX IF NOT EXISTS idx_media_assets_lesson ON public.media_assets (course_id, lesson_id, section_id);

CREATE TABLE IF NOT EXISTS public.user_course_progress (
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    course_id TEXT NOT NULL REFERENCES public.courses(course_id) ON DELETE RESTRICT,
    current_lesson_id TEXT REFERENCES public.lessons(lesson_id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'started',
    total_xp INTEGER NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
    rewards JSONB NOT NULL DEFAULT '[]'::jsonb,
    started_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, course_id),
    CONSTRAINT ck_user_course_progress_status CHECK (status IN ('started', 'completed'))
);

CREATE TABLE IF NOT EXISTS public.user_course_lesson_progress (
    user_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    lesson_id TEXT NOT NULL REFERENCES public.lessons(lesson_id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'not_started',
    best_score INTEGER NOT NULL DEFAULT 0 CHECK (best_score >= 0),
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    completed_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, course_id, lesson_id),
    FOREIGN KEY (user_id, course_id)
        REFERENCES public.user_course_progress(user_id, course_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.lesson_sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    course_id TEXT NOT NULL REFERENCES public.courses(course_id) ON DELETE RESTRICT,
    lesson_id TEXT NOT NULL REFERENCES public.lessons(lesson_id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'started',
    current_step_id TEXT NOT NULL,
    current_step_index INTEGER NOT NULL DEFAULT 0,
    progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
    started_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    UNIQUE (user_id, course_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS public.lesson_session_steps (
    session_id TEXT NOT NULL REFERENCES public.lesson_sessions(session_id) ON DELETE RESTRICT,
    step_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'locked',
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    best_score INTEGER NOT NULL DEFAULT 0 CHECK (best_score >= 0),
    passed BOOLEAN NOT NULL DEFAULT FALSE,
    last_response JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    PRIMARY KEY (session_id, step_id)
);

CREATE TABLE IF NOT EXISTS public.learning_paths (
    user_id TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE RESTRICT,
    priority_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
    daily_time_goal_mins INTEGER NOT NULL DEFAULT 15 CHECK (daily_time_goal_mins BETWEEN 5 AND 120),
    daily_words_goal INTEGER NOT NULL DEFAULT 5 CHECK (daily_words_goal BETWEEN 1 AND 50),
    notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

ALTER TABLE public.learning_progress
    ADD COLUMN IF NOT EXISTS mastered_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS legacy_mongo_id TEXT UNIQUE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_learning_progress_user_flashcard
    ON public.learning_progress (user_id, flashcard_qr_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_user_mastery
    ON public.learning_progress (user_id, mastery_level DESC);

CREATE TABLE IF NOT EXISTS public.word_mastery (
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    course_id TEXT NOT NULL REFERENCES public.courses(course_id) ON DELETE RESTRICT,
    lesson_id TEXT NOT NULL REFERENCES public.lessons(lesson_id) ON DELETE RESTRICT,
    word TEXT NOT NULL,
    mastery_level INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, course_id, lesson_id, word)
);

CREATE TABLE IF NOT EXISTS public.user_gamification (
    user_id TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE RESTRICT,
    total_points INTEGER NOT NULL DEFAULT 0 CHECK (total_points >= 0),
    level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
    xp_to_next_level INTEGER NOT NULL DEFAULT 100 CHECK (xp_to_next_level > 0),
    streak_days INTEGER NOT NULL DEFAULT 0 CHECK (streak_days >= 0),
    longest_streak INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
    last_activity_date TIMESTAMPTZ,
    badges JSONB NOT NULL DEFAULT '[]'::jsonb,
    pet_state JSONB,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_gamification_stickers (
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    sticker_id TEXT NOT NULL,
    name TEXT,
    rarity TEXT,
    image_url TEXT,
    earned_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, sticker_id)
);

CREATE TABLE IF NOT EXISTS public.gamification_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    event_id TEXT NOT NULL,
    action TEXT NOT NULL,
    source_type TEXT,
    source_id TEXT,
    attempt_id TEXT,
    session_id TEXT,
    learning_path_id TEXT,
    xp_awarded INTEGER NOT NULL DEFAULT 0 CHECK (xp_awarded >= 0),
    status TEXT NOT NULL DEFAULT 'processing',
    total_xp_after INTEGER,
    level_after INTEGER,
    xp_to_next_after INTEGER,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    applied_at TIMESTAMPTZ,
    CONSTRAINT uq_gamification_events_user_event UNIQUE (user_id, event_id),
    CONSTRAINT ck_gamification_events_status CHECK (status IN ('processing', 'applied', 'rejected'))
);
CREATE INDEX IF NOT EXISTS idx_gamification_events_user_recent ON public.gamification_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gamification_events_source ON public.gamification_events (source_type, source_id);

CREATE TABLE IF NOT EXISTS public.pronunciation_attempts (
    attempt_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    flashcard_qr_id TEXT NOT NULL REFERENCES public.flashcards(qr_id) ON DELETE RESTRICT,
    audio_url TEXT,
    audio_duration_seconds INTEGER,
    bucket TEXT NOT NULL DEFAULT 'pronunciations',
    storage_path TEXT,
    spoken_text TEXT NOT NULL,
    target_text TEXT,
    score INTEGER NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
    pronunciation_score INTEGER,
    fluency_score INTEGER,
    clarity_score INTEGER,
    ai_model TEXT,
    evaluation_confidence NUMERIC(4,3),
    feedback TEXT,
    word_by_word_feedback JSONB NOT NULL DEFAULT '[]'::jsonb,
    course_id TEXT REFERENCES public.courses(course_id) ON DELETE SET NULL,
    lesson_id TEXT REFERENCES public.lessons(lesson_id) ON DELETE SET NULL,
    section_id TEXT,
    session_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    xp_awarded INTEGER NOT NULL DEFAULT 0,
    device_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    client_timestamp TIMESTAMPTZ,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_pronunciation_attempts_user_recent ON public.pronunciation_attempts (user_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_pronunciation_attempts_user_flashcard ON public.pronunciation_attempts (user_id, flashcard_qr_id);

CREATE TABLE IF NOT EXISTS public.ar_objects (
    ar_tag TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    animation_type TEXT NOT NULL DEFAULT 'none',
    glb_size DOUBLE PRECISION NOT NULL DEFAULT 1,
    nft_base_url TEXT,
    model_3d_url TEXT NOT NULL,
    texture_url TEXT,
    image_2d_url TEXT NOT NULL,
    position TEXT NOT NULL DEFAULT '0 0 0',
    rotation TEXT NOT NULL DEFAULT '0 0 0',
    scale TEXT NOT NULL DEFAULT '1 1 1',
    mind_catalog_id TEXT,
    mind_target_index INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    CONSTRAINT ck_ar_objects_catalog_pair
        CHECK ((mind_catalog_id IS NULL) = (mind_target_index IS NULL)),
    CONSTRAINT ck_ar_objects_catalog_index
        CHECK (mind_target_index IS NULL OR mind_target_index >= 0)
);
CREATE INDEX IF NOT EXISTS idx_ar_objects_animation_type ON public.ar_objects (animation_type);

-- Physical tracking is deliberately separate from semantic/model ownership.
-- A flashcard remains the business/QR identity; ar_objects remains the model
-- identity. Native values are nullable until a content owner verifies a real
-- printed target and measures its width.
CREATE TABLE IF NOT EXISTS public.ar_tracking_targets (
    target_id TEXT PRIMARY KEY,
    qr_id TEXT NOT NULL REFERENCES public.flashcards(qr_id) ON DELETE RESTRICT,
    reference_image_url TEXT,
    physical_width_m NUMERIC(8,4),
    mind_catalog_id TEXT,
    mind_file_url TEXT,
    mind_target_index INTEGER,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    CONSTRAINT uq_ar_tracking_targets_qr_id UNIQUE (qr_id),
    CONSTRAINT ck_ar_tracking_targets_physical_width_positive
        CHECK (physical_width_m IS NULL OR physical_width_m > 0),
    CONSTRAINT ck_ar_tracking_targets_catalog_index
        CHECK (mind_target_index IS NULL OR mind_target_index >= 0)
);
CREATE INDEX IF NOT EXISTS idx_ar_tracking_targets_mind_catalog
    ON public.ar_tracking_targets (mind_catalog_id, mind_target_index);

CREATE TABLE IF NOT EXISTS public.ar_combinations (
    combo_id TEXT PRIMARY KEY,
    combo_name TEXT,
    description TEXT,
    combo_mind_url TEXT,
    image_2d_url TEXT,
    model_3d_url TEXT,
    texture_url TEXT,
    center_transform JSONB,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    priority INTEGER NOT NULL DEFAULT 0,
    reward_points INTEGER NOT NULL DEFAULT 0,
    bonus_xp INTEGER NOT NULL DEFAULT 0,
    semantic_result TEXT,
    phrase TEXT,
    sound TEXT,
    animation JSONB,
    flashcard_set JSONB,
    target_order JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.ar_combination_required_tags (
    combo_id TEXT NOT NULL REFERENCES public.ar_combinations(combo_id) ON DELETE RESTRICT,
    ar_tag TEXT NOT NULL,
    tag_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (combo_id, ar_tag)
);

CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    flashcard_qr_id TEXT NOT NULL REFERENCES public.flashcards(qr_id) ON DELETE RESTRICT,
    question_id TEXT NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL,
    correct_answer TEXT,
    explanation TEXT,
    time_limit INTEGER,
    passing_score INTEGER,
    UNIQUE (flashcard_qr_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.quiz_question_options (
    question_id BIGINT NOT NULL REFERENCES public.quiz_questions(id) ON DELETE RESTRICT,
    option_order INTEGER NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (question_id, option_order)
);

CREATE TABLE IF NOT EXISTS public.mini_game_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    game_type TEXT NOT NULL,
    flashcard_qr_id TEXT REFERENCES public.flashcards(qr_id) ON DELETE SET NULL,
    difficulty TEXT,
    question TEXT,
    image_url TEXT,
    correct_answer TEXT,
    stars_reward INTEGER,
    time_limit INTEGER,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Existing legacy quiz_attempts uses a serial id and is intentionally kept.
ALTER TABLE public.quiz_attempts
    ADD COLUMN IF NOT EXISTS legacy_mongo_id TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_recent ON public.quiz_attempts (user_id, attempted_at DESC);

-- Explicit, append-only migration evidence.  This stores reasons for source
-- records intentionally not imported; it is not an application redirect table.
CREATE TABLE IF NOT EXISTS public.migration_record_outcomes (
    migration_name TEXT NOT NULL,
    source_collection TEXT NOT NULL,
    source_key TEXT NOT NULL,
    outcome TEXT NOT NULL CHECK (outcome IN ('MIGRATED', 'SKIPPED_WITH_REASON', 'SKIPPED_DUPLICATE', 'FAILED')),
    reason TEXT,
    replacement_key TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (migration_name, source_collection, source_key)
);

-- Preserves structured, non-core legacy documents without inventing a new
-- product model or moving Storage/Qdrant payloads into PostgreSQL.
CREATE TABLE IF NOT EXISTS public.legacy_collection_documents (
    source_collection TEXT NOT NULL,
    legacy_mongo_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ,
    PRIMARY KEY (source_collection, legacy_mongo_id)
);
