-- Runtime-only additions discovered while rehoming existing FastAPI paths.
-- This is additive and intentionally has no destructive DDL.

CREATE TABLE IF NOT EXISTS public.lesson_step_attempts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES public.lesson_sessions(session_id) ON DELETE RESTRICT,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    course_id TEXT NOT NULL REFERENCES public.courses(course_id) ON DELETE RESTRICT,
    lesson_id TEXT NOT NULL REFERENCES public.lessons(lesson_id) ON DELETE RESTRICT,
    step_id TEXT NOT NULL,
    attempt_type TEXT NOT NULL DEFAULT 'practice',
    passed BOOLEAN NOT NULL DEFAULT FALSE,
    score INTEGER NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
    response_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lesson_step_attempts_session
    ON public.lesson_step_attempts (session_id, attempted_at DESC);

CREATE TABLE IF NOT EXISTS public.daily_learning_progress (
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    progress_date DATE NOT NULL,
    time_spent_mins INTEGER NOT NULL DEFAULT 0 CHECK (time_spent_mins >= 0),
    words_learned INTEGER NOT NULL DEFAULT 0 CHECK (words_learned >= 0),
    games_played INTEGER NOT NULL DEFAULT 0 CHECK (games_played >= 0),
    pronunciation_attempts INTEGER NOT NULL DEFAULT 0 CHECK (pronunciation_attempts >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, progress_date)
);
