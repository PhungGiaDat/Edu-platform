-- 20260908_01_fish_mobile_visual_config.sql
-- Version fish001 mobile asset without changing tracking physical dimensions.
-- Idempotent: safe to apply after the earlier 0.35 fish-scale migration.

UPDATE public.ar_objects
SET model_3d_url = 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/fish_mobile_v1.glb',
    scale = '0.30 0.30 0.30',
    updated_at = NOW()
WHERE ar_tag = 'fish001';
