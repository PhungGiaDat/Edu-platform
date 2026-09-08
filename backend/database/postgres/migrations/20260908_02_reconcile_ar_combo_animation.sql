-- Reconcile the runtime AR target contract with databases that missed the
-- earlier animation-columns migration.

ALTER TABLE public.ar_objects
ADD COLUMN IF NOT EXISTS combo_animation TEXT;

-- CAT already uses this clip through the viewer fallback. Persisting it here
-- restores the canonical API configuration without changing the behavior.
UPDATE public.ar_objects
SET combo_animation = 'CAT_EAT',
    updated_at = NOW()
WHERE ar_tag = 'cat001'
  AND combo_animation IS NULL;
