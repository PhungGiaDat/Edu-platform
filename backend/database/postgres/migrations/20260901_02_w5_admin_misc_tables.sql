-- 20260901_02_w5_admin_misc_tables.sql
-- De-Mongo Wave 5: create Postgres tables for admin, AI, feedback, parental controls
-- Plus add teacher_id to courses for admin scoping.

-- ============================================================
-- courses: add teacher_id + soft-delete for admin scoping
-- ============================================================
ALTER TABLE public.courses
    ADD COLUMN IF NOT EXISTS teacher_id TEXT,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON public.courses (teacher_id);
CREATE INDEX IF NOT EXISTS idx_courses_teacher_active ON public.courses (teacher_id, is_active);

-- ============================================================
-- student_progress: teacher-scoped student progress tracking
-- (replaces Mongo student_progress collection)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.student_progress (
    user_id TEXT NOT NULL,
    teacher_id TEXT NOT NULL,
    user_name TEXT,
    user_avatar TEXT,
    enrollments JSONB NOT NULL DEFAULT '[]'::jsonb,
    flashcards_practiced INTEGER NOT NULL DEFAULT 0,
    flashcards_mastered INTEGER NOT NULL DEFAULT 0,
    total_xp INTEGER NOT NULL DEFAULT 0,
    total_time_minutes INTEGER NOT NULL DEFAULT 0,
    streak_days INTEGER NOT NULL DEFAULT 0,
    last_active TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_student_progress_teacher ON public.student_progress (teacher_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_teacher_active ON public.student_progress (teacher_id, last_active DESC);
CREATE INDEX IF NOT EXISTS idx_student_progress_teacher_xp ON public.student_progress (teacher_id, total_xp DESC);

-- ============================================================
-- usage_sessions: learning session tracking
-- (replaces Mongo usage_sessions collection)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.usage_sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    total_active_seconds INTEGER NOT NULL DEFAULT 0,
    last_activity_at TIMESTAMPTZ,
    current_break JSONB,
    break_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    xp_earned INTEGER NOT NULL DEFAULT 0,
    lessons_completed INTEGER NOT NULL DEFAULT 0,
    quizzes_completed INTEGER NOT NULL DEFAULT 0,
    device_info JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_usage_sessions_user ON public.usage_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_usage_sessions_user_active ON public.usage_sessions (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_usage_sessions_started ON public.usage_sessions (started_at);

-- ============================================================
-- learning_goals: teacher-set learning goals for students
-- (replaces Mongo learning_goals collection)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.learning_goals (
    user_id TEXT NOT NULL,
    teacher_id TEXT NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    total_xp_earned INTEGER NOT NULL DEFAULT 0,
    total_minutes_learned INTEGER NOT NULL DEFAULT 0,
    last_goal_completed TIMESTAMPTZ,
    last_active_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_learning_goals_teacher ON public.learning_goals (teacher_id);

-- ============================================================
-- ai_configs: AI configuration settings
-- (replaces Mongo ai_configs collection)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_configs (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'default',
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_configs_active ON public.ai_configs (is_active);

-- ============================================================
-- feedback_templates: pronunciation feedback template library
-- (replaces Mongo feedback_templates collection)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.feedback_templates (
    id BIGSERIAL PRIMARY KEY,
    category TEXT NOT NULL,
    template TEXT NOT NULL,
    emoji TEXT DEFAULT '⭐',
    language TEXT NOT NULL DEFAULT 'en',
    weight INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_templates_cat_lang ON public.feedback_templates (category, language, is_active);

-- ============================================================
-- parental_controls: child usage controls
-- (replaces Mongo parental_controls collection)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.parental_controls (
    child_id TEXT PRIMARY KEY,
    time_limit_mins INTEGER NOT NULL DEFAULT 60,
    break_reminder_mins INTEGER NOT NULL DEFAULT 20,
    priority_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
    today_usage_mins INTEGER NOT NULL DEFAULT 0,
    last_session_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);