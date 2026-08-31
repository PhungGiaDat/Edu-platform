-- Migration: 20260831_02_lessons_schema_align.sql
-- De-Mongo Wave 1: align public.lessons with the CourseLesson domain model
-- (Beanie -> Postgres raw SQL cutover in course_lesson_repository).
ALTER TABLE public.lessons
    ADD COLUMN IF NOT EXISTS lesson_type VARCHAR(20) DEFAULT 'mixed',
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(64) DEFAULT 'system',
    ADD COLUMN IF NOT EXISTS xp_reward INTEGER DEFAULT 50,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'published',
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS vocabulary_items JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS total_attempts INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS completion_rate DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS average_score DECIMAL(5,2) DEFAULT 0,
    -- Repo methods order by created_at and touch updated_at (create/update/
    -- publish/archive paths); the original lessons table had neither.
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
