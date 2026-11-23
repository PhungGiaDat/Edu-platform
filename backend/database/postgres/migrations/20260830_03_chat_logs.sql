-- 20260830_03_chat_logs.sql — chat logging for the Lexi RAG bot (Postgres-native)
-- The RAG bot previously logged chat to MongoDB; the platform is Postgres-only.

CREATE TABLE IF NOT EXISTS public.chat_logs (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(64),
    message TEXT NOT NULL,
    sender VARCHAR(20) NOT NULL,
    context_flashcard_ids JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_logs_session_time
    ON public.chat_logs(session_id, timestamp);

COMMENT ON TABLE public.chat_logs IS 'Lexi RAG chat transcript (session-scoped, for dedup/history)';
