-- Daily Challenge definitions and once-only reward claim ledger.
-- This migration is additive and leaves existing progression, XP, badge, and
-- pet ownership tables unchanged.

CREATE TABLE IF NOT EXISTS public.daily_challenges (
    challenge_id TEXT PRIMARY KEY,
    challenge_date DATE NOT NULL UNIQUE,
    title TEXT NOT NULL,
    target_lessons INTEGER NOT NULL CHECK (target_lessons > 0),
    status TEXT NOT NULL DEFAULT 'published'
        CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_challenge_lessons (
    challenge_id TEXT NOT NULL
        REFERENCES public.daily_challenges(challenge_id) ON DELETE CASCADE,
    course_id TEXT NOT NULL
        REFERENCES public.courses(course_id) ON DELETE RESTRICT,
    lesson_id TEXT NOT NULL
        REFERENCES public.lessons(lesson_id) ON DELETE RESTRICT,
    position SMALLINT NOT NULL CHECK (position > 0),
    PRIMARY KEY (challenge_id, lesson_id),
    UNIQUE (challenge_id, position)
);

CREATE INDEX IF NOT EXISTS idx_daily_challenge_lessons_lesson
    ON public.daily_challenge_lessons (lesson_id, course_id);

CREATE TABLE IF NOT EXISTS public.daily_challenge_rewards (
    reward_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    challenge_id TEXT NOT NULL
        REFERENCES public.daily_challenges(challenge_id) ON DELETE CASCADE,
    reward_type TEXT NOT NULL
        CHECK (reward_type IN ('xp', 'badge', 'pet')),
    xp_amount INTEGER CHECK (xp_amount IS NULL OR xp_amount >= 0),
    badge_id TEXT,
    pet_id TEXT REFERENCES public.pets(pet_id) ON DELETE RESTRICT,
    display_label TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_daily_challenge_reward_type UNIQUE (challenge_id, reward_type),
    CONSTRAINT ck_daily_challenge_reward_payload CHECK (
        (reward_type = 'xp' AND xp_amount IS NOT NULL AND badge_id IS NULL AND pet_id IS NULL)
        OR (reward_type = 'badge' AND xp_amount IS NULL AND badge_id IS NOT NULL AND pet_id IS NULL)
        OR (reward_type = 'pet' AND xp_amount IS NULL AND badge_id IS NULL AND pet_id IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS public.daily_challenge_claims (
    claim_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    challenge_id TEXT NOT NULL
        REFERENCES public.daily_challenges(challenge_id) ON DELETE RESTRICT,
    event_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing'
        CHECK (status IN ('processing', 'applied', 'failed')),
    progress_at_claim INTEGER NOT NULL CHECK (progress_at_claim >= 0),
    xp_awarded INTEGER NOT NULL DEFAULT 0 CHECK (xp_awarded >= 0),
    badge_id TEXT,
    pet_id TEXT REFERENCES public.pets(pet_id) ON DELETE RESTRICT,
    grant_result JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    claimed_at TIMESTAMPTZ,
    UNIQUE (user_id, challenge_id),
    UNIQUE (user_id, event_id),
    CONSTRAINT ck_daily_challenge_claim_applied_at CHECK (
        status <> 'applied' OR claimed_at IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_daily_challenge_claims_user_recent
    ON public.daily_challenge_claims (user_id, created_at DESC);
