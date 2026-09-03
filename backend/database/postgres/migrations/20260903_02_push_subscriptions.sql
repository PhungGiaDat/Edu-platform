-- 20260903_02_push_subscriptions.sql — Web Push pipeline for kid reminders.
-- Additive & idempotent: safe to re-run.
-- NOTE: user_id is VARCHAR(64) to match public.users.id (project convention —
-- notebook_entries.user_id uses the same type). Do NOT use UUID here.

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(64) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_pushed_at TIMESTAMPTZ,
    CONSTRAINT push_subscriptions_endpoint_unique UNIQUE (endpoint)
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
    ON push_subscriptions(user_id);

CREATE TABLE IF NOT EXISTS notification_prefs (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    preferred_hour SMALLINT NOT NULL DEFAULT 17 CHECK (preferred_hour BETWEEN 6 AND 21),
    timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE push_subscriptions IS 'Web Push endpoints (iOS standalone PWA 16.4+, Chrome desktop/Android)';
COMMENT ON TABLE notification_prefs IS 'Parent-controlled reminder settings: single daily nudge, quiet hours enforced server-side';
