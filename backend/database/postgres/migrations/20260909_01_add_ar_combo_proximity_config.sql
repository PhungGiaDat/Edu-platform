-- Persist pair-specific tracking-anchor proximity thresholds for WebAR combos.
-- This is additive: existing API consumers continue to receive nullable config.

BEGIN;

ALTER TABLE public.ar_combinations
    ADD COLUMN IF NOT EXISTS proximity_enter_distance NUMERIC(5,4),
    ADD COLUMN IF NOT EXISTS proximity_exit_distance NUMERIC(5,4),
    ADD COLUMN IF NOT EXISTS proximity_stable_ms INTEGER,
    ADD COLUMN IF NOT EXISTS proximity_smoothing_alpha NUMERIC(4,3);

DO $$
BEGIN
    ALTER TABLE public.ar_combinations
        ADD CONSTRAINT ck_ar_combinations_proximity_config
        CHECK (
            (
                proximity_enter_distance IS NULL
                AND proximity_exit_distance IS NULL
                AND proximity_stable_ms IS NULL
                AND proximity_smoothing_alpha IS NULL
            )
            OR (
                proximity_enter_distance > 0
                AND proximity_exit_distance > proximity_enter_distance
                AND proximity_stable_ms > 0
                AND proximity_smoothing_alpha > 0
                AND proximity_smoothing_alpha <= 1
            )
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

UPDATE public.ar_combinations
SET
    proximity_enter_distance = 0.52,
    proximity_exit_distance = 0.60,
    proximity_stable_ms = 300,
    proximity_smoothing_alpha = 0.25,
    updated_at = NOW()
WHERE combo_id = 'clay_cat_fish';

COMMIT;
