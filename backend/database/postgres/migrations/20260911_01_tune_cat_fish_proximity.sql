-- Calibrate only the CAT + FISH rule. Other pair rules retain their own data.
-- This is a forward migration; the original proximity-schema migration remains immutable.

BEGIN;

UPDATE public.ar_combinations
SET
    proximity_enter_distance = 0.50,
    proximity_exit_distance = 0.58,
    proximity_stable_ms = 300,
    proximity_smoothing_alpha = 0.25,
    updated_at = NOW()
WHERE combo_id = 'clay_cat_fish';

COMMIT;
