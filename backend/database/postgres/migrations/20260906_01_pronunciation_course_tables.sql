-- Migration: Pronunciation Course Tables
-- Replaces MongoDB-based pronunciation_course with Supabase PostgreSQL
-- Target: pronunciation_course feature — topic-based word lists, attempt tracking, recording collection

BEGIN;

-- ============================================================
-- pronunciation_topics
-- Master list of pronunciation course topics (Animals, Food, Family, Nature, ...)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pronunciation_topics (
    topic_id         TEXT PRIMARY KEY,       -- e.g. 'animals', 'food'
    name             TEXT NOT NULL,          -- English name
    name_vi          TEXT NOT NULL,          -- Vietnamese name
    icon             TEXT NOT NULL DEFAULT '', -- emoji
    color            TEXT NOT NULL DEFAULT '', -- tailwind color key
    display_order    INTEGER NOT NULL DEFAULT 0,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pronunciation_topics_order
    ON public.pronunciation_topics (display_order ASC)
    WHERE is_active = TRUE;

-- ============================================================
-- pronunciation_words
-- Words within each topic with phonetic + difficulty data
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pronunciation_words (
    word_id          TEXT PRIMARY KEY,       -- e.g. 'cat', 'elephant'
    topic_id         TEXT NOT NULL
                      REFERENCES public.pronunciation_topics(topic_id)
                      ON DELETE CASCADE,
    word             TEXT NOT NULL,           -- e.g. 'cat'
    phonetic         TEXT,                   -- e.g. '/kæt/'
    difficulty        TEXT NOT NULL DEFAULT 'easy'
                      CHECK (difficulty IN ('easy', 'medium', 'hard')),
    audio_url        TEXT,                   -- TTS audio for this word
    display_order    INTEGER NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_pronunciation_words_topic_word
        UNIQUE (topic_id, word)
);

CREATE INDEX IF NOT EXISTS idx_pronunciation_words_topic
    ON public.pronunciation_words (topic_id, display_order);

-- ============================================================
-- pronunciation_attempts  (extends existing attempts table)
-- Per-word attempt tracking with stars + XP
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pronunciation_attempts (
    attempt_id         TEXT PRIMARY KEY,
    user_id            TEXT NOT NULL
                        REFERENCES public.users(id) ON DELETE CASCADE,
    topic_id           TEXT NOT NULL
                        REFERENCES public.pronunciation_topics(topic_id)
                        ON DELETE CASCADE,
    word_id            TEXT NOT NULL
                        REFERENCES public.pronunciation_words(word_id)
                        ON DELETE CASCADE,

    -- Evaluation
    score              INTEGER NOT NULL DEFAULT 0
                        CHECK (score BETWEEN 0 AND 100),
    stars              INTEGER NOT NULL DEFAULT 0
                        CHECK (stars BETWEEN 0 AND 3),
    transcription      TEXT,                   -- what the child said
    evaluation_method   TEXT NOT NULL DEFAULT 'browser'
                        CHECK (evaluation_method IN ('browser', 'huggingface', 'combined')),

    -- Metadata
    session_id         TEXT,
    device_info        JSONB NOT NULL DEFAULT '{}'::jsonb,
    client_timestamp   TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pronunciation_attempts_user_topic
    ON public.pronunciation_attempts (user_id, topic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pronunciation_attempts_user_word
    ON public.pronunciation_attempts (user_id, word_id, stars DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pronunciation_attempts_user_topic_word
    ON public.pronunciation_attempts (user_id, topic_id, word_id);

-- ============================================================
-- pronunciation_recordings
-- Audio recordings collected for fine-tuning (consent required)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pronunciation_recordings (
    recording_id      TEXT PRIMARY KEY,
    user_id           TEXT NOT NULL
                        REFERENCES public.users(id) ON DELETE CASCADE,
    topic_id          TEXT NOT NULL
                        REFERENCES public.pronunciation_topics(topic_id)
                        ON DELETE CASCADE,
    word_id           TEXT NOT NULL
                        REFERENCES public.pronunciation_words(word_id)
                        ON DELETE CASCADE,

    -- Audio
    audio_url         TEXT NOT NULL,
    audio_duration_ms INTEGER,

    -- Transcription
    transcription     TEXT,

    -- Consent + quality
    is_consent_granted BOOLEAN NOT NULL DEFAULT FALSE,
    quality_rating     INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
    reviewed          BOOLEAN NOT NULL DEFAULT FALSE,

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pronunciation_recordings_consent
    ON public.pronunciation_recordings (is_consent_granted, reviewed)
    WHERE is_consent_granted = TRUE AND reviewed = FALSE;

CREATE INDEX IF NOT EXISTS idx_pronunciation_recordings_user
    ON public.pronunciation_recordings (user_id, created_at DESC);

-- ============================================================
-- Seed data: 4 topics × 8 words
-- ============================================================
INSERT INTO public.pronunciation_topics (topic_id, name, name_vi, icon, color, display_order)
VALUES
    ('animals', 'Animals',  'Động vật',  '🐾', 'sky-blue',    1),
    ('food',    'Food',     'Thức ăn',   '🍎', 'coral-pink',  2),
    ('family',  'Family',   'Gia đình',  '👨‍👩‍👧', 'lavender',     3),
    ('nature',  'Nature',   'Thiên nhiên','🌳', 'mint-green',   4)
ON CONFLICT (topic_id) DO NOTHING;

INSERT INTO public.pronunciation_words (word_id, topic_id, word, phonetic, difficulty, display_order)
VALUES
    -- Animals
    ('cat',       'animals', 'cat',       '/kæt/',       'easy',   1),
    ('dog',       'animals', 'dog',       '/dɔːɡ/',      'easy',   2),
    ('elephant',  'animals', 'elephant',  '/ˈelɪfənt/',  'medium', 3),
    ('giraffe',   'animals', 'giraffe',   '/dʒɪˈrɑːf/',  'hard',   4),
    ('monkey',    'animals', 'monkey',    '/ˈmʌŋki/',    'easy',   5),
    ('rabbit',    'animals', 'rabbit',    '/ˈræbɪt/',    'medium', 6),
    ('tiger',     'animals', 'tiger',     '/ˈtaɪɡər/',   'easy',   7),
    ('lion',      'animals', 'lion',      '/ˈlaɪən/',    'easy',   8)
ON CONFLICT (word_id) DO NOTHING;

INSERT INTO public.pronunciation_words (word_id, topic_id, word, phonetic, difficulty, display_order)
VALUES
    -- Food
    ('apple',    'food', 'apple',    '/ˈæpəl/',    'easy',   1),
    ('banana',   'food', 'banana',   '/bəˈnɑːnə/', 'easy',   2),
    ('bread',    'food', 'bread',    '/bred/',      'easy',   3),
    ('cheese',   'food', 'cheese',   '/tʃiːz/',    'medium', 4),
    ('chicken',  'food', 'chicken',  '/ˈtʃɪkɪn/',  'medium', 5),
    ('egg',      'food', 'egg',      '/eɡ/',        'easy',   6),
    ('rice',     'food', 'rice',     '/raɪs/',      'easy',   7),
    ('water',    'food', 'water',    '/ˈwɔːtər/',  'easy',   8)
ON CONFLICT (word_id) DO NOTHING;

INSERT INTO public.pronunciation_words (word_id, topic_id, word, phonetic, difficulty, display_order)
VALUES
    -- Family
    ('mom',      'family', 'mom',      '/mɑːm/',    'easy',   1),
    ('dad',      'family', 'dad',      '/dæd/',     'easy',   2),
    ('brother',  'family', 'brother',  '/ˈbrʌðər/', 'medium', 3),
    ('sister',   'family', 'sister',   '/ˈsɪstər/', 'medium', 4),
    ('grandma',  'family', 'grandma',  '/ˈɡrænmɑː/', 'easy',  5),
    ('grandpa',  'family', 'grandpa',  '/ˈɡrænpɑː/', 'easy',  6),
    ('baby',      'family', 'baby',     '/ˈbeɪbi/',   'easy',   7),
    ('friend',   'family', 'friend',   '/frend/',    'medium', 8)
ON CONFLICT (word_id) DO NOTHING;

INSERT INTO public.pronunciation_words (word_id, topic_id, word, phonetic, difficulty, display_order)
VALUES
    -- Nature
    ('tree',      'nature', 'tree',      '/triː/',       'easy',   1),
    ('flower',    'nature', 'flower',    '/ˈflaʊər/',    'medium', 2),
    ('sun',       'nature', 'sun',       '/sʌn/',        'easy',   3),
    ('moon',      'nature', 'moon',      '/muːn/',        'easy',   4),
    ('star',      'nature', 'star',      '/stɑːr/',       'easy',   5),
    ('river',     'nature', 'river',     '/ˈrɪvər/',      'medium', 6),
    ('mountain',  'nature', 'mountain',  '/ˈmaʊntən/',   'hard',   7),
    ('rainbow',   'nature', 'rainbow',   '/ˈreɪnboʊ/',   'medium', 8)
ON CONFLICT (word_id) DO NOTHING;

COMMIT;
