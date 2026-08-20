-- Migration: 20260821_02_update_xr_flashcards_claymorphic.sql
-- UPDATE existing flashcards + INSERT new rows where not exists
-- Fix: existing cat001 has ar_tag='cat_marker_01', need to update

BEGIN;

-- ============================================================================
-- 1. UPDATE existing flashcards to claymorphic values
-- Only update if ar_tag != the new value (meaning it's old data)
-- ============================================================================

UPDATE public.flashcards
SET
    deck_id = 'claymorphic-animals-001',
    ar_tag = qr_id,  -- use qr_id as ar_tag for claymorphic
    word = CASE qr_id
        WHEN 'cat001' THEN 'cat'
        WHEN 'fish001' THEN 'fish'
        WHEN 'rabbit001' THEN 'rabbit'
        WHEN 'carrot001' THEN 'carrot'
        WHEN 'elephant001' THEN 'elephant'
        WHEN 'grass001' THEN 'grass'
        WHEN 'panda001' THEN 'panda'
        WHEN 'bamboo001' THEN 'bamboo'
        WHEN 'tiger001' THEN 'tiger'
        WHEN 'meat001' THEN 'meat'
    END,
    translation = CASE qr_id
        WHEN 'cat001' THEN '{"en": "cat", "vi": "con mèo"}'::jsonb
        WHEN 'fish001' THEN '{"en": "fish", "vi": "con cá"}'::jsonb
        WHEN 'rabbit001' THEN '{"en": "rabbit", "vi": "con thỏ"}'::jsonb
        WHEN 'carrot001' THEN '{"en": "carrot", "vi": "cà rốt"}'::jsonb
        WHEN 'elephant001' THEN '{"en": "elephant", "vi": "con voi"}'::jsonb
        WHEN 'grass001' THEN '{"en": "grass", "vi": "cỏ"}'::jsonb
        WHEN 'panda001' THEN '{"en": "panda", "vi": "gấu trúc"}'::jsonb
        WHEN 'bamboo001' THEN '{"en": "bamboo", "vi": "tre"}'::jsonb
        WHEN 'tiger001' THEN '{"en": "tiger", "vi": "con hổ"}'::jsonb
        WHEN 'meat001' THEN '{"en": "meat", "vi": "thịt"}'::jsonb
    END,
    definition = CASE qr_id
        WHEN 'cat001' THEN 'A small domesticated feline mammal'
        WHEN 'fish001' THEN 'A cold-blooded aquatic animal with fins'
        WHEN 'rabbit001' THEN 'A small domesticated mammal with long ears'
        WHEN 'carrot001' THEN 'An orange root vegetable'
        WHEN 'elephant001' THEN 'A large mammal with a trunk and tusks'
        WHEN 'grass001' THEN 'Green plant that covers the ground'
        WHEN 'panda001' THEN 'A black and white bear native to China'
        WHEN 'bamboo001' THEN 'A tall tropical plant with hollow stems'
        WHEN 'tiger001' THEN 'A large wild cat with orange and black stripes'
        WHEN 'meat001' THEN 'Flesh of an animal used as food'
    END,
    category = CASE
        WHEN qr_id IN ('cat001', 'rabbit001', 'elephant001', 'panda001', 'tiger001') THEN 'animal'
        ELSE 'food'
    END,
    image_url = 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/' || qr_id || '.png',
    image_animation_type = CASE qr_id
        WHEN 'cat001' THEN 'CAT_MEOW'
        WHEN 'fish001' THEN 'WIGGLE'
        WHEN 'rabbit001' THEN 'BOUNCE'
        WHEN 'carrot001' THEN 'GROW'
        WHEN 'elephant001' THEN 'SWING'
        WHEN 'grass001' THEN 'SWAY'
        WHEN 'panda001' THEN 'CHEW'
        WHEN 'bamboo001' THEN 'GROW'
        WHEN 'tiger001' THEN 'ROAR'
        WHEN 'meat001' THEN 'NONE'
    END,
    is_active = TRUE,
    updated_at = NOW()
WHERE qr_id IN ('cat001', 'fish001', 'rabbit001', 'carrot001', 'elephant001', 'grass001', 'panda001', 'bamboo001', 'tiger001', 'meat001');

-- ============================================================================
-- 2. INSERT ar_objects (only if not exists)
-- ============================================================================

INSERT INTO public.ar_objects (ar_tag, description, animation_type, glb_size, model_3d_url, texture_url, image_2d_url, position, rotation, scale, mind_catalog_id, mind_target_index, created_at, updated_at)
SELECT
    qr_id,
    'Claymorphic ' || word || ' AR object',
    image_animation_type,
    1.0,
    'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/ragdollcat_mobile.glb',
    NULL,
    'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/' || qr_id || '.png',
    '0 0 0',
    '0 0 0',
    '1 1 1',
    'claymorphic-v1',
    ROW_NUMBER() OVER (ORDER BY
        CASE qr_id
            WHEN 'cat001' THEN 1 WHEN 'fish001' THEN 6
            WHEN 'rabbit001' THEN 2 WHEN 'carrot001' THEN 7
            WHEN 'elephant001' THEN 3 WHEN 'grass001' THEN 8
            WHEN 'panda001' THEN 4 WHEN 'bamboo001' THEN 9
            WHEN 'tiger001' THEN 5 WHEN 'meat001' THEN 10
        END
    ) - 1,
    NOW(),
    NOW()
FROM public.flashcards
WHERE qr_id IN ('cat001', 'fish001', 'rabbit001', 'carrot001', 'elephant001', 'grass001', 'panda001', 'bamboo001', 'tiger001', 'meat001')
ON CONFLICT (ar_tag) DO NOTHING;

-- ============================================================================
-- 3. INSERT ar_combinations (only if not exists)
-- ============================================================================

INSERT INTO public.ar_combinations (combo_id, combo_name, description, combo_mind_url, image_2d_url, model_3d_url, texture_url, center_transform, active, priority, reward_points, bonus_xp, semantic_result, phrase, sound, animation, flashcard_set, target_order, created_at, updated_at)
VALUES
    ('clay_cat_fish', 'Cat eats Fish', 'The cat eats fish.',
     NULL,
     'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/cat001.png',
     'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/ragdollcat_mobile.glb',
     NULL,
     '{"position": "0 0.5 0", "rotation": "0 0 0", "scale": "1.5 1.5 1.5"}'::jsonb,
     TRUE, 10, 100, 100,
     'cat_eats_fish',
     'The cat eats fish!',
     NULL,
     '"CAT_EAT"'::jsonb,
     '"claymorphic-animals-001"'::jsonb,
     '["cat001", "fish001"]'::jsonb,
     NOW(), NOW())
ON CONFLICT (combo_id) DO NOTHING;

INSERT INTO public.ar_combinations (combo_id, combo_name, description, combo_mind_url, image_2d_url, model_3d_url, texture_url, center_transform, active, priority, reward_points, bonus_xp, semantic_result, phrase, sound, animation, flashcard_set, target_order, created_at, updated_at)
VALUES
    ('clay_rabbit_carrot', 'Rabbit eats Carrot', 'The rabbit eats a carrot.',
     NULL,
     'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/rabbit001.png',
     'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/ragdollcat_mobile.glb',
     NULL,
     '{"position": "0 0.5 0", "rotation": "0 0 0", "scale": "1.5 1.5 1.5"}'::jsonb,
     TRUE, 10, 100, 100,
     'rabbit_eats_carrot',
     'The rabbit eats a carrot!',
     NULL,
     '"RABBIT_EAT"'::jsonb,
     '"claymorphic-animals-001"'::jsonb,
     '["rabbit001", "carrot001"]'::jsonb,
     NOW(), NOW())
ON CONFLICT (combo_id) DO NOTHING;

INSERT INTO public.ar_combinations (combo_id, combo_name, description, combo_mind_url, image_2d_url, model_3d_url, texture_url, center_transform, active, priority, reward_points, bonus_xp, semantic_result, phrase, sound, animation, flashcard_set, target_order, created_at, updated_at)
VALUES
    ('clay_elephant_grass', 'Elephant eats Grass', 'The elephant eats grass.',
     NULL,
     'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/elephant001.png',
     'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/ragdollcat_mobile.glb',
     NULL,
     '{"position": "0 0.5 0", "rotation": "0 0 0", "scale": "1.5 1.5 1.5"}'::jsonb,
     TRUE, 10, 100, 100,
     'elephant_eats_grass',
     'The elephant eats grass!',
     NULL,
     '"ELEPHANT_EAT"'::jsonb,
     '"claymorphic-animals-001"'::jsonb,
     '["elephant001", "grass001"]'::jsonb,
     NOW(), NOW())
ON CONFLICT (combo_id) DO NOTHING;

INSERT INTO public.ar_combinations (combo_id, combo_name, description, combo_mind_url, image_2d_url, model_3d_url, texture_url, center_transform, active, priority, reward_points, bonus_xp, semantic_result, phrase, sound, animation, flashcard_set, target_order, created_at, updated_at)
VALUES
    ('clay_panda_bamboo', 'Panda eats Bamboo', 'The panda eats bamboo.',
     NULL,
     'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/panda001.png',
     'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/ragdollcat_mobile.glb',
     NULL,
     '{"position": "0 0.5 0", "rotation": "0 0 0", "scale": "1.5 1.5 1.5"}'::jsonb,
     TRUE, 10, 100, 100,
     'panda_eats_bamboo',
     'The panda eats bamboo!',
     NULL,
     '"PANDA_EAT"'::jsonb,
     '"claymorphic-animals-001"'::jsonb,
     '["panda001", "bamboo001"]'::jsonb,
     NOW(), NOW())
ON CONFLICT (combo_id) DO NOTHING;

INSERT INTO public.ar_combinations (combo_id, combo_name, description, combo_mind_url, image_2d_url, model_3d_url, texture_url, center_transform, active, priority, reward_points, bonus_xp, semantic_result, phrase, sound, animation, flashcard_set, target_order, created_at, updated_at)
VALUES
    ('clay_tiger_meat', 'Tiger eats Meat', 'The tiger eats meat.',
     NULL,
     'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/tiger001.png',
     'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/ragdollcat_mobile.glb',
     NULL,
     '{"position": "0 0.5 0", "rotation": "0 0 0", "scale": "1.5 1.5 1.5"}'::jsonb,
     TRUE, 10, 100, 100,
     'tiger_eats_meat',
     'The tiger eats meat!',
     NULL,
     '"TIGER_EAT"'::jsonb,
     '"claymorphic-animals-001"'::jsonb,
     '["tiger001", "meat001"]'::jsonb,
     NOW(), NOW())
ON CONFLICT (combo_id) DO NOTHING;

-- ============================================================================
-- 4. INSERT ar_combination_required_tags
-- ============================================================================

INSERT INTO public.ar_combination_required_tags (combo_id, ar_tag, tag_order) VALUES
    ('clay_cat_fish', 'cat001', 0),
    ('clay_cat_fish', 'fish001', 1)
ON CONFLICT (combo_id, ar_tag) DO NOTHING;

INSERT INTO public.ar_combination_required_tags (combo_id, ar_tag, tag_order) VALUES
    ('clay_rabbit_carrot', 'rabbit001', 0),
    ('clay_rabbit_carrot', 'carrot001', 1)
ON CONFLICT (combo_id, ar_tag) DO NOTHING;

INSERT INTO public.ar_combination_required_tags (combo_id, ar_tag, tag_order) VALUES
    ('clay_elephant_grass', 'elephant001', 0),
    ('clay_elephant_grass', 'grass001', 1)
ON CONFLICT (combo_id, ar_tag) DO NOTHING;

INSERT INTO public.ar_combination_required_tags (combo_id, ar_tag, tag_order) VALUES
    ('clay_panda_bamboo', 'panda001', 0),
    ('clay_panda_bamboo', 'bamboo001', 1)
ON CONFLICT (combo_id, ar_tag) DO NOTHING;

INSERT INTO public.ar_combination_required_tags (combo_id, ar_tag, tag_order) VALUES
    ('clay_tiger_meat', 'tiger001', 0),
    ('clay_tiger_meat', 'meat001', 1)
ON CONFLICT (combo_id, ar_tag) DO NOTHING;

-- ============================================================================
-- 5. UPDATE ar_tracking_targets (only if exists)
-- ============================================================================

UPDATE public.ar_tracking_targets
SET
    reference_image_url = 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/' || flashcards.qr_id || '.png',
    physical_width_m = 0.08,
    mind_catalog_id = 'claymorphic-v1',
    metadata = jsonb_build_object('deck', 'claymorphic-animals-001'),
    updated_at = NOW()
FROM public.flashcards
WHERE ar_tracking_targets.qr_id = flashcards.qr_id
  AND flashcards.qr_id IN ('cat001', 'fish001', 'rabbit001', 'carrot001', 'elephant001', 'grass001', 'panda001', 'bamboo001', 'tiger001', 'meat001');

COMMIT;
