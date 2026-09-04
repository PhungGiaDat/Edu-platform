-- 20260904_01_ar_fish_scale_cat_combo_animation.sql
-- AR finalization: tune fish001 dynamic scale and bind cat001 combo animation.
-- Idempotent — safe to re-run.

-- fish: shrink to food-sized. Viewer treats scale as uniform scalar (parseScale
-- takes the first numeric component), so use a single-tuple value.
UPDATE public.ar_objects
SET scale = '0.35 0.35 0.35',
    updated_at = NOW()
WHERE ar_tag = 'fish001';

-- cat: bind combo_animation to CAT_EAT (cat-specific clip name in ragdollcat_mobile_v1.glb).
-- Falls back to any clip whose name contains "EAT" if CAT_EAT isn't present.
UPDATE public.ar_objects
SET combo_animation = 'CAT_EAT',
    updated_at = NOW()
WHERE ar_tag = 'cat001';
