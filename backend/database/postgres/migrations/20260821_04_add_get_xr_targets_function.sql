-- Migration: Add get_xr_targets_for_deck function
-- This function returns tracking targets joined with ar_objects animations

CREATE OR REPLACE FUNCTION public.get_xr_targets_for_deck(deck_id_param TEXT)
RETURNS TABLE (
    qr_id TEXT,
    xr_target_json_url TEXT,
    xr_target_image_url TEXT,
    reference_image_url TEXT,
    animation_type TEXT,
    mind_catalog_id TEXT,
    mind_target_index INTEGER,
    deck_name TEXT,
    deck_category TEXT,
    deck_id TEXT,
    description TEXT,
    animations TEXT[],
    default_animation TEXT,
    combo_animation TEXT,
    model_3d_url TEXT,
    texture_url TEXT,
    position TEXT,
    rotation TEXT,
    scale TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        tt.qr_id,
        tt.xr_target_json_url,
        tt.xr_target_image_url,
        tt.reference_image_url,
        tt.animation_type,
        tt.mind_catalog_id,
        tt.mind_target_index,
        fd.name as deck_name,
        fd.category as deck_category,
        fd.deck_id,
        ao.description,
        ao.animations,
        ao.default_animation,
        ao.combo_animation,
        ao.model_3d_url,
        ao.texture_url,
        COALESCE(ao.position, '0 0 0') as position,
        COALESCE(ao.rotation, '0 0 0') as rotation,
        COALESCE(ao.scale, '1 1 1') as scale
    FROM public.ar_tracking_targets tt
    JOIN public.flashcards f ON tt.qr_id = f.qr_id
    JOIN public.flashcard_decks fd ON f.deck_id = fd.deck_id
    LEFT JOIN public.ar_objects ao ON ao.ar_tag = tt.qr_id
    WHERE fd.deck_id = deck_id_param
    ORDER BY f.qr_id;
END;
$$;

-- Also create a version for all XR targets
CREATE OR REPLACE FUNCTION public.get_all_xr_targets()
RETURNS TABLE (
    qr_id TEXT,
    xr_target_json_url TEXT,
    xr_target_image_url TEXT,
    reference_image_url TEXT,
    animation_type TEXT,
    mind_catalog_id TEXT,
    mind_target_index INTEGER,
    deck_name TEXT,
    deck_category TEXT,
    deck_id TEXT,
    description TEXT,
    animations TEXT[],
    default_animation TEXT,
    combo_animation TEXT,
    model_3d_url TEXT,
    texture_url TEXT,
    position TEXT,
    rotation TEXT,
    scale TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        tt.qr_id,
        tt.xr_target_json_url,
        tt.xr_target_image_url,
        tt.reference_image_url,
        tt.animation_type,
        tt.mind_catalog_id,
        tt.mind_target_index,
        fd.name as deck_name,
        fd.category as deck_category,
        fd.deck_id,
        ao.description,
        ao.animations,
        ao.default_animation,
        ao.combo_animation,
        ao.model_3d_url,
        ao.texture_url,
        COALESCE(ao.position, '0 0 0') as position,
        COALESCE(ao.rotation, '0 0 0') as rotation,
        COALESCE(ao.scale, '1 1 1') as scale
    FROM public.ar_tracking_targets tt
    JOIN public.flashcards f ON tt.qr_id = f.qr_id
    JOIN public.flashcard_decks fd ON f.deck_id = fd.deck_id
    LEFT JOIN public.ar_objects ao ON ao.ar_tag = tt.qr_id
    WHERE tt.xr_target_json_url IS NOT NULL
    ORDER BY fd.deck_id, f.qr_id;
END;
$$;

-- Add animations columns to ar_objects if not exists
ALTER TABLE public.ar_objects
ADD COLUMN IF NOT EXISTS animations TEXT[],
ADD COLUMN IF NOT EXISTS default_animation TEXT,
ADD COLUMN IF NOT EXISTS combo_animation TEXT;

-- Add animation fields to ar_tracking_targets (for quick access)
ALTER TABLE public.ar_tracking_targets
ADD COLUMN IF NOT EXISTS animations TEXT[],
ADD COLUMN IF NOT EXISTS default_animation TEXT,
ADD COLUMN IF NOT EXISTS combo_animation TEXT;
