-- Forward calibration for the current physical CAT + FISH demo.
-- Existing migrations remain immutable; this only updates declarative runtime data.

BEGIN;

UPDATE public.ar_objects
SET
    scale = '0.36 0.36 0.36',
    updated_at = NOW()
WHERE ar_tag = 'fish001';

UPDATE public.ar_combinations
SET
    proximity_enter_distance = 0.62,
    proximity_exit_distance = 0.70,
    proximity_stable_ms = 300,
    proximity_smoothing_alpha = 0.25,
    updated_at = NOW()
WHERE combo_id = 'clay_cat_fish';

COMMIT;
