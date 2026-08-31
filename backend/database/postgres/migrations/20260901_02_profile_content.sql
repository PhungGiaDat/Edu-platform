-- 20260901_02_profile_content.sql — profile customization content (Postgres-native)
CREATE TABLE IF NOT EXISTS public.profile_content (
    key         VARCHAR(50) PRIMARY KEY DEFAULT 'default',
    banner_url  TEXT,
    avatar_frames JSONB DEFAULT '[]',
    badges      JSONB DEFAULT '[]',
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.profile_content (key) VALUES ('default') ON CONFLICT DO NOTHING;
