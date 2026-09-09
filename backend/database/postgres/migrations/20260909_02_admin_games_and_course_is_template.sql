-- 20260909_02_admin_games_and_course_is_template.sql
-- Admin Course & Game activation:
--   1) courses.is_template column (admin editor checkbox was silently dropped)
--   2) game_topics / games / game_vocab_items tables for admin game management
--   3) seed the 4 learner topics (slugs MUST match gamesVocabService.ts)

-- ============================================================
-- 1) courses.is_template
-- ============================================================
ALTER TABLE public.courses
    ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- 2) Game management tables
-- ============================================================
CREATE TABLE IF NOT EXISTS public.game_topics (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    name_vi TEXT NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_topics_published
    ON public.game_topics (is_published, sort_order);

CREATE TABLE IF NOT EXISTS public.games (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    title_vi TEXT NOT NULL DEFAULT '',
    game_type TEXT NOT NULL
        CONSTRAINT ck_games_type CHECK (game_type IN
            ('drag_match','catch_word','word_scramble','memory_match')),
    topic_id TEXT NOT NULL REFERENCES public.game_topics(id) ON DELETE CASCADE,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    teacher_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_games_topic ON public.games (topic_id);
CREATE INDEX IF NOT EXISTS idx_games_published ON public.games (is_published);

CREATE TABLE IF NOT EXISTS public.game_vocab_items (
    id TEXT PRIMARY KEY,
    topic_id TEXT NOT NULL REFERENCES public.game_topics(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    translation_vi TEXT NOT NULL,
    image_url TEXT,
    audio_url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_game_vocab_topic_word UNIQUE (topic_id, word)
);

CREATE INDEX IF NOT EXISTS idx_game_vocab_topic
    ON public.game_vocab_items (topic_id, sort_order);

-- ============================================================
-- 3) Seed the 4 learner topics — slugs match frontend
--    gamesVocabService.ts GAME_TOPICS exactly (no regression)
-- ============================================================
INSERT INTO public.game_topics (id, slug, name, name_vi, is_published, sort_order)
VALUES
    ('topic-animals',     'animals',     'Animals',       'Động vật',       TRUE, 1),
    ('topic-home',        'home',        'Home',          'Nhà & gia đình', TRUE, 2),
    ('topic-nature',      'nature',      'Nature',        'Thiên nhiên',    TRUE, 3),
    ('topic-school-food', 'school_food', 'School & Food', 'Trường & đồ ăn', TRUE, 4)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Downgrade (documented; alembic baseline is python-managed, SQL files are
-- applied by scripts/apply migrations flow — reverse statements below)
-- ============================================================
-- DROP TABLE IF EXISTS public.game_vocab_items;
-- DROP TABLE IF EXISTS public.games;
-- DROP TABLE IF EXISTS public.game_topics;
-- ALTER TABLE public.courses DROP COLUMN IF EXISTS is_template;
