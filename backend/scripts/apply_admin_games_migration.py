"""Apply the 2026-09-09 admin games + course is_template migration to Supabase PostgreSQL.

Usage:
    python -m scripts.apply_admin_games_migration

Requires DATABASE_URL in environment or .env file.
Run from backend/ directory.

Idempotent: CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS /
seed ON CONFLICT DO NOTHING — safe to re-run.
"""

import asyncio
import sys
from pathlib import Path

import asyncpg

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from settings import settings


MIGRATION_SQL = """
-- 20260909_02_admin_games_and_course_is_template.sql
-- Admin Course & Game activation:
--   1) courses.is_template column (admin editor checkbox was silently dropped)
--   2) game_topics / games / game_vocab_items tables for admin game management
--   3) seed the 4 learner topics (slugs MUST match gamesVocabService.ts)

ALTER TABLE public.courses
    ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT FALSE;

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

-- Repair pass: tables created by an earlier run of this migration lack the
-- created_at/updated_at columns on game_vocab_items (caught in E2E smoke).
ALTER TABLE public.game_vocab_items
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.game_vocab_items
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

INSERT INTO public.game_topics (id, slug, name, name_vi, is_published, sort_order)
VALUES
    ('topic-animals',     'animals',     'Animals',       'Động vật',       TRUE, 1),
    ('topic-home',        'home',        'Home',          'Nhà & gia đình', TRUE, 2),
    ('topic-nature',      'nature',      'Nature',        'Thiên nhiên',    TRUE, 3),
    ('topic-school-food', 'school_food', 'School & Food', 'Trường & đồ ăn', TRUE, 4)
ON CONFLICT (slug) DO NOTHING;
"""


async def main() -> None:
    database_url = settings.DATABASE_URL.get_secret_value() if settings.DATABASE_URL else None
    if not database_url:
        raise SystemExit("DATABASE_URL is not configured — cannot connect to Supabase PostgreSQL")

    print("[apply_admin_games] Connecting to Supabase PostgreSQL...")
    conn = await asyncpg.connect(
        database_url,
        statement_cache_size=0,
    )
    try:
        await conn.execute(MIGRATION_SQL)
        print("[apply_admin_games] Migration applied (idempotent).")

        topics = await conn.fetch(
            "SELECT slug, name_vi FROM public.game_topics ORDER BY sort_order"
        )
        print(f"[apply_admin_games] game_topics now: {[dict(t) for t in topics]}")
        cols = await conn.fetch(
            """SELECT column_name FROM information_schema.columns
               WHERE table_name='courses' AND column_name='is_template'"""
        )
        print(f"[apply_admin_games] courses.is_template present: {len(cols) == 1}")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
