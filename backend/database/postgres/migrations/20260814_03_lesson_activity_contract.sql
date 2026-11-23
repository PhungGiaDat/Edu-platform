BEGIN;

ALTER TABLE public.lesson_sessions
    ADD COLUMN IF NOT EXISTS content_version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.lesson_session_steps
    ADD COLUMN IF NOT EXISTS activity_type TEXT,
    ADD COLUMN IF NOT EXISTS activity_order INTEGER,
    ADD COLUMN IF NOT EXISTS required BOOLEAN NOT NULL DEFAULT TRUE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'lesson_sessions_content_version_check'
          AND conrelid = 'public.lesson_sessions'::regclass
    ) THEN
        ALTER TABLE public.lesson_sessions
            ADD CONSTRAINT lesson_sessions_content_version_check
            CHECK (content_version >= 1);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'lesson_session_steps_activity_order_check'
          AND conrelid = 'public.lesson_session_steps'::regclass
    ) THEN
        ALTER TABLE public.lesson_session_steps
            ADD CONSTRAINT lesson_session_steps_activity_order_check
            CHECK (activity_order IS NULL OR activity_order >= 1);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lesson_session_steps_authored_order
    ON public.lesson_session_steps (session_id, activity_order, step_id);

COMMIT;
