-- Migration: 20260821_03_add_xr_target_columns.sql
-- Add xr_target_json_url and xr_target_image_url columns for 8th Wall engine
-- These columns hold the compiled XR target data from image-target-cli

BEGIN;

-- Add columns for 8th Wall XR target URLs
ALTER TABLE public.ar_tracking_targets
    ADD COLUMN IF NOT EXISTS xr_target_json_url TEXT,
    ADD COLUMN IF NOT EXISTS xr_target_image_url TEXT;

-- Update existing claymorphic targets with XR target URLs
UPDATE public.ar_tracking_targets
SET
    xr_target_json_url = 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/xr-targets/' || qr_id || '.json',
    xr_target_image_url = 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/xr-targets/' || qr_id || '_luminance.png',
    updated_at = NOW()
WHERE qr_id IN (
    'cat001', 'fish001', 'rabbit001', 'carrot001',
    'elephant001', 'grass001', 'panda001', 'bamboo001',
    'tiger001', 'meat001'
);

-- Add index for faster lookups by XR target
CREATE INDEX IF NOT EXISTS idx_ar_tracking_targets_xr_json_url
    ON public.ar_tracking_targets (xr_target_json_url)
    WHERE xr_target_json_url IS NOT NULL;

COMMIT;
