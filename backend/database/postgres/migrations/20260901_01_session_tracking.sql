-- 20260901_01_session_tracking.sql — session tracking tables (Postgres-native)
-- Previously MongoDB collections active_sessions / session_activities.
-- Serves the /session API (heartbeat, status, lock, metrics).

CREATE TABLE IF NOT EXISTS public.active_sessions (
    session_id        VARCHAR(100) PRIMARY KEY,
    user_id           VARCHAR(64)  NOT NULL,
    status            VARCHAR(20)  NOT NULL DEFAULT 'active',
    started_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_heartbeat    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_activity_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    current_step_id   VARCHAR(100),
    current_step_index INTEGER     NOT NULL DEFAULT 0,
    progress_percent  INTEGER      NOT NULL DEFAULT 0,
    is_locked         BOOLEAN      NOT NULL DEFAULT FALSE,
    locked_at         TIMESTAMPTZ,
    locked_until      TIMESTAMPTZ,
    locked_reason     TEXT,
    idle_seconds      INTEGER      NOT NULL DEFAULT 0,
    ended_at          TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_user_status
    ON public.active_sessions(user_id, status);

CREATE TABLE IF NOT EXISTS public.session_activities (
    id            BIGSERIAL PRIMARY KEY,
    session_id    VARCHAR(100) NOT NULL,
    user_id       VARCHAR(64)  NOT NULL,
    activity_type VARCHAR(50)  NOT NULL,
    activity_data JSONB        NOT NULL DEFAULT '{}'::jsonb,
    timestamp     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_activities_session_time
    ON public.session_activities(session_id, timestamp);

COMMENT ON TABLE public.active_sessions IS
    'Active learning-session heartbeat/lock state (migrated from MongoDB active_sessions)';
COMMENT ON TABLE public.session_activities IS
    'Analytics activity events logged within a session (migrated from MongoDB session_activities)';
