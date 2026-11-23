-- Migration: 20260821_01_xr_flashcards_claymorphic.sql
-- Add 10 XR flashcards from PPTX claymorphic design + 5 combos
-- Storage paths: AR_models/images/flashcard/{ar_tag}.png
-- 3D model: AR_models/3dmodel/ragdollcat_mobile.glb (shared by all)

BEGIN;

-- ============================================================================
-- 1. Create flashcard_deck for claymorphic flashcards
-- ============================================================================
INSERT INTO public.flashcard_decks (deck_id, name, description, cover_image_url, category, tags, is_active, card_count, created_at, updated_at)
VALUES (
    'claymorphic-animals-001',
    '{"en": "Animals Adventure Claymorphic", "vi": "Động vật Claymorphic"}'::jsonb,
    '{"en": "10 claymorphic flashcards: 5 animals + 5 foods, forming 5 animal+food combos", "vi": "10 flashcard claymorphic: 5 con vật + 5 thức ăn, tạo 5 cặp combo"}'::jsonb,
    'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/cat001.png',
    'animals',
    '["animals", "food", "claymorphic", "combos"]'::jsonb,
    TRUE,
    10,
    NOW(),
    NOW()
) ON CONFLICT (deck_id) DO NOTHING;

-- ============================================================================
-- 2. INSERT 10 flashcards
-- ============================================================================

-- Animals (5)
INSERT INTO public.flashcards (qr_id, deck_id, ar_tag, word, translation, definition, category, image_url, audio_url, difficulty, image_animation_type, is_active, created_at, updated_at)
VALUES
    ('cat001', 'claymorphic-animals-001', 'cat001', 'cat', '{"en": "cat", "vi": "con mèo"}'::jsonb, 'A small domesticated feline mammal', 'animal', 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/cat001.png', NULL, 'easy', 'CAT_MEOW', TRUE, NOW(), NOW())
ON CONFLICT (qr_id) DO NOTHING;

INSERT INTO public.flashcards (qr_id, deck_id, ar_tag, word, translation, definition, category, image_url, audio_url, difficulty, image_animation_type, is_active, created_at, updated_at)
VALUES
    ('rabbit001', 'claymorphic-animals-001', 'rabbit001', 'rabbit', '{"en": "rabbit", "vi": "con thỏ"}'::jsonb, 'A small domesticated mammal with long ears', 'animal', 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/rabbit001.png', NULL, 'easy', 'BOUNCE', TRUE, NOW(), NOW())
ON CONFLICT (qr_id) DO NOTHING;

INSERT INTO public.flashcards (qr_id, deck_id, ar_tag, word, translation, definition, category, image_url, audio_url, difficulty, image_animation_type, is_active, created_at, updated_at)
VALUES
    ('elephant001', 'claymorphic-animals-001', 'elephant001', 'elephant', '{"en": "elephant", "vi": "con voi"}'::jsonb, 'A large mammal with a trunk and tusks', 'animal', 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/elephant001.png', NULL, 'medium', 'SWING', TRUE, NOW(), NOW())
ON CONFLICT (qr_id) DO NOTHING;

INSERT INTO public.flashcards (qr_id, deck_id, ar_tag, word, translation, definition, category, image_url, audio_url, difficulty, image_animation_type, is_active, created_at, updated_at)
VALUES
    ('panda001', 'claymorphic-animals-001', 'panda001', 'panda', '{"en": "panda", "vi": "gấu trúc"}'::jsonb, 'A black and white bear native to China', 'animal', 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/panda001.png', NULL, 'medium', 'CHEW', TRUE, NOW(), NOW())
ON CONFLICT (qr_id) DO NOTHING;

INSERT INTO public.flashcards (qr_id, deck_id, ar_tag, word, translation, definition, category, image_url, audio_url, difficulty, image_animation_type, is_active, created_at, updated_at)
VALUES
    ('tiger001', 'claymorphic-animals-001', 'tiger001', 'tiger', '{"en": "tiger", "vi": "con hổ"}'::jsonb, 'A large wild cat with orange and black stripes', 'animal', 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/tiger001.png', NULL, 'medium', 'ROAR', TRUE, NOW(), NOW())
ON CONFLICT (qr_id) DO NOTHING;

-- Foods (5)
INSERT INTO public.flashcards (qr_id, deck_id, ar_tag, word, translation, definition, category, image_url, audio_url, difficulty, image_animation_type, is_active, created_at, updated_at)
VALUES
    ('fish001', 'claymorphic-animals-001', 'fish001', 'fish', '{"en": "fish", "vi": "con cá"}'::jsonb, 'A cold-blooded aquatic animal with fins', 'food', 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/fish001.png', NULL, 'easy', 'WIGGLE', TRUE, NOW(), NOW())
ON CONFLICT (qr_id) DO NOTHING;

INSERT INTO public.flashcards (qr_id, deck_id, ar_tag, word, translation, definition, category, image_url, audio_url, difficulty, image_animation_type, is_active, created_at, updated_at)
VALUES
    ('carrot001', 'claymorphic-animals-001', 'carrot001', 'carrot', '{"en": "carrot", "vi": "cà rốt"}'::jsonb, 'An orange root vegetable', 'food', 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/carrot001.png', NULL, 'easy', 'GROW', TRUE, NOW(), NOW())
ON CONFLICT (qr_id) DO NOTHING;

INSERT INTO public.flashcards (qr_id, deck_id, ar_tag, word, translation, definition, category, image_url, audio_url, difficulty, image_animation_type, is_active, created_at, updated_at)
VALUES
    ('grass001', 'claymorphic-animals-001', 'grass001', 'grass', '{"en": "grass", "vi": "cỏ"}'::jsonb, 'Green plant that covers the ground', 'food', 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/grass001.png', NULL, 'easy', 'SWAY', TRUE, NOW(), NOW())
ON CONFLICT (qr_id) DO NOTHING;

INSERT INTO public.flashcards (qr_id, deck_id, ar_tag, word, translation, definition, category, image_url, audio_url, difficulty, image_animation_type, is_active, created_at, updated_at)
VALUES
    ('bamboo001', 'claymorphic-animals-001', 'bamboo001', 'bamboo', '{"en": "bamboo", "vi": "tre"}'::jsonb, 'A tall tropical plant with hollow stems', 'food', 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/bamboo001.png', NULL, 'medium', 'GROW', TRUE, NOW(), NOW())
ON CONFLICT (qr_id) DO NOTHING;

INSERT INTO public.flashcards (qr_id, deck_id, ar_tag, word, translation, definition, category, image_url, audio_url, difficulty, image_animation_type, is_active, created_at, updated_at)
VALUES
    ('meat001', 'claymorphic-animals-001', 'meat001', 'meat', '{"en": "meat", "vi": "thịt"}'::jsonb, 'Flesh of an animal used as food', 'food', 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/meat001.png', NULL, 'easy', 'NONE', TRUE, NOW(), NOW())
ON CONFLICT (qr_id) DO NOTHING;

-- ============================================================================
-- 3. INSERT 10 ar_objects
-- All claymorphic flashcards share the same ragdollcat model (placeholder)
-- mind_catalog_id: 'claymorphic-v1' (will be compiled via image-target-cli)
-- ============================================================================

INSERT INTO public.ar_objects (ar_tag, description, animation_type, glb_size, model_3d_url, texture_url, image_2d_url, position, rotation, scale, mind_catalog_id, mind_target_index, created_at, updated_at)
VALUES
    ('cat001', 'Claymorphic cat - The cat eats fish.', 'CAT_MEOW', 1.0, 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/ragdollcat_mobile.glb', NULL, 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/cat001.png', '0 0 0', '0 0 0', '1 1 1', 'claymorphic-v1', 0, NOW(), NOW())
ON CONFLICT (ar_tag) DO NOTHING;

INSERT INTO public.ar_objects (ar_tag, description, animation_type, glb_size, model_3d_url, texture_url, image_2d_url, position, rotation, scale, mind_catalog_id, mind_target_index, created_at, updated_at)
VALUES
    ('rabbit001', 'Claymorphic rabbit - The rabbit eats a carrot.', 'BOUNCE', 1.0, 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/ragdollcat_mobile.glb', NULL, 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/rabbit001.png', '0 0 0', '0 0 0', '1 1 1', 'claymorphic-v1', 1, NOW(), NOW())
ON CONFLICT (ar_tag) DO NOTHING;

INSERT INTO public.ar_objects (ar_tag, description, animation_type, glb_size, model_3d_url, texture_url, image_2d_url, position, rotation, scale, mind_catalog_id, mind_target_index, created_at, updated_at)
VALUES
    ('elephant001', 'Claymorphic elephant - The elephant eats grass.', 'SWING', 1.0, 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/ragdollcat_mobile.glb', NULL, 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/elephant001.png', '0 0 0', '0 0 0', '1 1 1', 'claymorphic-v1', 2, NOW(), NOW())
ON CONFLICT (ar_tag) DO NOTHING;

INSERT INTO public.ar_objects (ar_tag, description, animation_type, glb_size, model_3d_url, texture_url, image_2d_url, position, rotation, scale, mind_catalog_id, mind_target_index, created_at, updated_at)
VALUES
    ('panda001', 'Claymorphic panda - The panda eats bamboo.', 'CHEW', 1.0, 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/ragdollcat_mobile.glb', NULL, 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/panda001.png', '0 0 0', '0 0 0', '1 1 1', 'claymorphic-v1', 3, NOW(), NOW())
ON CONFLICT (ar_tag) DO NOTHING;

INSERT INTO public.ar_objects (ar_tag, description, animation_type, glb_size, model_3d_url, texture_url, image_2d_url, position, rotation, scale, mind_catalog_id, mind_target_index, created_at, updated_at)
VALUES
    ('tiger001', 'Claymorphic tiger - The tiger eats meat.', 'ROAR', 1.0, 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/ragdollcat_mobile.glb', NULL, 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/tiger001.png', '0 0 0', '0 0 0', '1 1 1', 'claymorphic-v1', 4, NOW(), NOW())
ON CONFLICT (ar_tag) DO NOTHING;

INSERT INTO public.ar_objects (ar_tag, description, animation_type, glb_size, model_3d_url, texture_url, image_2d_url, position, rotation, scale, mind_catalog_id, mind_target_index, created_at, updated_at)
VALUES
    ('fish001', 'Claymorphic fish - eaten by cat.', 'WIGGLE', 1.0, 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/ragdollcat_mobile.glb', NULL, 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/fish001.png', '0 0 0', '0 0 0', '1 1 1', 'claymorphic-v1', 5, NOW(), NOW())
ON CONFLICT (ar_tag) DO NOTHING;

INSERT INTO public.ar_objects (ar_tag, description, animation_type, glb_size, model_3d_url, texture_url, image_2d_url, position, rotation, scale, mind_catalog_id, mind_target_index, created_at, updated_at)
VALUES
    ('carrot001', 'Claymorphic carrot - eaten by rabbit.', 'GROW', 1.0, 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/ragdollcat_mobile.glb', NULL, 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/carrot001.png', '0 0 0', '0 0 0', '1 1 1', 'claymorphic-v1', 6, NOW(), NOW())
ON CONFLICT (ar_tag) DO NOTHING;

INSERT INTO public.ar_objects (ar_tag, description, animation_type, glb_size, model_3d_url, texture_url, image_2d_url, position, rotation, scale, mind_catalog_id, mind_target_index, created_at, updated_at)
VALUES
    ('grass001', 'Claymorphic grass - eaten by elephant.', 'SWAY', 1.0, 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/ragdollcat_mobile.glb', NULL, 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/grass001.png', '0 0 0', '0 0 0', '1 1 1', 'claymorphic-v1', 7, NOW(), NOW())
ON CONFLICT (ar_tag) DO NOTHING;

INSERT INTO public.ar_objects (ar_tag, description, animation_type, glb_size, model_3d_url, texture_url, image_2d_url, position, rotation, scale, mind_catalog_id, mind_target_index, created_at, updated_at)
VALUES
    ('bamboo001', 'Claymorphic bamboo - eaten by panda.', 'GROW', 1.0, 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/ragdollcat_mobile.glb', NULL, 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/bamboo001.png', '0 0 0', '0 0 0', '1 1 1', 'claymorphic-v1', 8, NOW(), NOW())
ON CONFLICT (ar_tag) DO NOTHING;

INSERT INTO public.ar_objects (ar_tag, description, animation_type, glb_size, model_3d_url, texture_url, image_2d_url, position, rotation, scale, mind_catalog_id, mind_target_index, created_at, updated_at)
VALUES
    ('meat001', 'Claymorphic meat - eaten by tiger.', 'NONE', 1.0, 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/ragdollcat_mobile.glb', NULL, 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/meat001.png', '0 0 0', '0 0 0', '1 1 1', 'claymorphic-v1', 9, NOW(), NOW())
ON CONFLICT (ar_tag) DO NOTHING;

-- ============================================================================
-- 4. INSERT 5 ar_combinations (animal + food = combo)
-- ============================================================================

-- Combo 1: CAT + FISH
INSERT INTO public.ar_combinations (combo_id, combo_name, description, combo_mind_url, image_2d_url, model_3d_url, texture_url, center_transform, active, priority, reward_points, bonus_xp, semantic_result, phrase, sound, animation, flashcard_set, target_order, created_at, updated_at)
VALUES (
    'clay_cat_fish',
    'Cat eats Fish',
    'The cat eats fish. A classic predator-prey scene.',
    NULL,
    'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/cat001.png',
    'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/ragdollcat_mobile.glb',
    NULL,
    '{"position": "0 0.5 0", "rotation": "0 0 0", "scale": "1.5 1.5 1.5"}'::jsonb,
    TRUE,
    10,
    100,
    100,
    'cat_eats_fish',
    'The cat eats fish! 🐱🐟',
    NULL,
    '"CAT_EAT"',
    '"claymorphic-animals-001"'::jsonb,
    '["cat001", "fish001"]'::jsonb,
    NOW(),
    NOW()
) ON CONFLICT (combo_id) DO NOTHING;

-- Combo 2: RABBIT + CARROT
INSERT INTO public.ar_combinations (combo_id, combo_name, description, combo_mind_url, image_2d_url, model_3d_url, texture_url, center_transform, active, priority, reward_points, bonus_xp, semantic_result, phrase, sound, animation, flashcard_set, target_order, created_at, updated_at)
VALUES (
    'clay_rabbit_carrot',
    'Rabbit eats Carrot',
    'The rabbit eats a carrot. A hoppy scene!',
    NULL,
    'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/rabbit001.png',
    'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/ragdollcat_mobile.glb',
    NULL,
    '{"position": "0 0.5 0", "rotation": "0 0 0", "scale": "1.5 1.5 1.5"}'::jsonb,
    TRUE,
    10,
    100,
    100,
    'rabbit_eats_carrot',
    'The rabbit eats a carrot! 🐰🥕',
    NULL,
    '"RABBIT_EAT"',
    '"claymorphic-animals-001"'::jsonb,
    '["rabbit001", "carrot001"]'::jsonb,
    NOW(),
    NOW()
) ON CONFLICT (combo_id) DO NOTHING;

-- Combo 3: ELEPHANT + GRASS
INSERT INTO public.ar_combinations (combo_id, combo_name, description, combo_mind_url, image_2d_url, model_3d_url, texture_url, center_transform, active, priority, reward_points, bonus_xp, semantic_result, phrase, sound, animation, flashcard_set, target_order, created_at, updated_at)
VALUES (
    'clay_elephant_grass',
    'Elephant eats Grass',
    'The elephant eats grass. A gentle giant!',
    NULL,
    'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/elephant001.png',
    'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/ragdollcat_mobile.glb',
    NULL,
    '{"position": "0 0.5 0", "rotation": "0 0 0", "scale": "1.5 1.5 1.5"}'::jsonb,
    TRUE,
    10,
    100,
    100,
    'elephant_eats_grass',
    'The elephant eats grass! 🐘🌿',
    NULL,
    '"ELEPHANT_EAT"',
    '"claymorphic-animals-001"'::jsonb,
    '["elephant001", "grass001"]'::jsonb,
    NOW(),
    NOW()
) ON CONFLICT (combo_id) DO NOTHING;

-- Combo 4: PANDA + BAMBOO
INSERT INTO public.ar_combinations (combo_id, combo_name, description, combo_mind_url, image_2d_url, model_3d_url, texture_url, center_transform, active, priority, reward_points, bonus_xp, semantic_result, phrase, sound, animation, flashcard_set, target_order, created_at, updated_at)
VALUES (
    'clay_panda_bamboo',
    'Panda eats Bamboo',
    'The panda eats bamboo. A cuddly scene!',
    NULL,
    'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/panda001.png',
    'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/ragdollcat_mobile.glb',
    NULL,
    '{"position": "0 0.5 0", "rotation": "0 0 0", "scale": "1.5 1.5 1.5"}'::jsonb,
    TRUE,
    10,
    100,
    100,
    'panda_eats_bamboo',
    'The panda eats bamboo! 🐼🎋',
    NULL,
    '"PANDA_EAT"',
    '"claymorphic-animals-001"'::jsonb,
    '["panda001", "bamboo001"]'::jsonb,
    NOW(),
    NOW()
) ON CONFLICT (combo_id) DO NOTHING;

-- Combo 5: TIGER + MEAT
INSERT INTO public.ar_combinations (combo_id, combo_name, description, combo_mind_url, image_2d_url, model_3d_url, texture_url, center_transform, active, priority, reward_points, bonus_xp, semantic_result, phrase, sound, animation, flashcard_set, target_order, created_at, updated_at)
VALUES (
    'clay_tiger_meat',
    'Tiger eats Meat',
    'The tiger eats meat. A powerful predator!',
    NULL,
    'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/tiger001.png',
    'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/ragdollcat_mobile.glb',
    NULL,
    '{"position": "0 0.5 0", "rotation": "0 0 0", "scale": "1.5 1.5 1.5"}'::jsonb,
    TRUE,
    10,
    100,
    100,
    'tiger_eats_meat',
    'The tiger eats meat! 🐯🥩',
    NULL,
    '"TIGER_EAT"',
    '"claymorphic-animals-001"'::jsonb,
    '["tiger001", "meat001"]'::jsonb,
    NOW(),
    NOW()
) ON CONFLICT (combo_id) DO NOTHING;

-- ============================================================================
-- 5. INSERT ar_combination_required_tags
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
-- 6. INSERT ar_tracking_targets
-- ============================================================================

INSERT INTO public.ar_tracking_targets (target_id, qr_id, reference_image_url, physical_width_m, mind_catalog_id, mind_target_index, metadata, created_at, updated_at)
VALUES
    ('clay_target_cat001', 'cat001', 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/cat001.png', 0.08, 'claymorphic-v1', 0, '{"deck": "claymorphic-animals-001"}'::jsonb, NOW(), NOW())
ON CONFLICT (target_id) DO NOTHING;

INSERT INTO public.ar_tracking_targets (target_id, qr_id, reference_image_url, physical_width_m, mind_catalog_id, mind_target_index, metadata, created_at, updated_at)
VALUES
    ('clay_target_fish001', 'fish001', 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/fish001.png', 0.08, 'claymorphic-v1', 5, '{"deck": "claymorphic-animals-001"}'::jsonb, NOW(), NOW())
ON CONFLICT (target_id) DO NOTHING;

INSERT INTO public.ar_tracking_targets (target_id, qr_id, reference_image_url, physical_width_m, mind_catalog_id, mind_target_index, metadata, created_at, updated_at)
VALUES
    ('clay_target_rabbit001', 'rabbit001', 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/rabbit001.png', 0.08, 'claymorphic-v1', 1, '{"deck": "claymorphic-animals-001"}'::jsonb, NOW(), NOW())
ON CONFLICT (target_id) DO NOTHING;

INSERT INTO public.ar_tracking_targets (target_id, qr_id, reference_image_url, physical_width_m, mind_catalog_id, mind_target_index, metadata, created_at, updated_at)
VALUES
    ('clay_target_carrot001', 'carrot001', 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/carrot001.png', 0.08, 'claymorphic-v1', 6, '{"deck": "claymorphic-animals-001"}'::jsonb, NOW(), NOW())
ON CONFLICT (target_id) DO NOTHING;

INSERT INTO public.ar_tracking_targets (target_id, qr_id, reference_image_url, physical_width_m, mind_catalog_id, mind_target_index, metadata, created_at, updated_at)
VALUES
    ('clay_target_elephant001', 'elephant001', 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/elephant001.png', 0.08, 'claymorphic-v1', 2, '{"deck": "claymorphic-animals-001"}'::jsonb, NOW(), NOW())
ON CONFLICT (target_id) DO NOTHING;

INSERT INTO public.ar_tracking_targets (target_id, qr_id, reference_image_url, physical_width_m, mind_catalog_id, mind_target_index, metadata, created_at, updated_at)
VALUES
    ('clay_target_grass001', 'grass001', 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/grass001.png', 0.08, 'claymorphic-v1', 7, '{"deck": "claymorphic-animals-001"}'::jsonb, NOW(), NOW())
ON CONFLICT (target_id) DO NOTHING;

INSERT INTO public.ar_tracking_targets (target_id, qr_id, reference_image_url, physical_width_m, mind_catalog_id, mind_target_index, metadata, created_at, updated_at)
VALUES
    ('clay_target_panda001', 'panda001', 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/panda001.png', 0.08, 'claymorphic-v1', 3, '{"deck": "claymorphic-animals-001"}'::jsonb, NOW(), NOW())
ON CONFLICT (target_id) DO NOTHING;

INSERT INTO public.ar_tracking_targets (target_id, qr_id, reference_image_url, physical_width_m, mind_catalog_id, mind_target_index, metadata, created_at, updated_at)
VALUES
    ('clay_target_bamboo001', 'bamboo001', 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/bamboo001.png', 0.08, 'claymorphic-v1', 8, '{"deck": "claymorphic-animals-001"}'::jsonb, NOW(), NOW())
ON CONFLICT (target_id) DO NOTHING;

INSERT INTO public.ar_tracking_targets (target_id, qr_id, reference_image_url, physical_width_m, mind_catalog_id, mind_target_index, metadata, created_at, updated_at)
VALUES
    ('clay_target_tiger001', 'tiger001', 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/tiger001.png', 0.08, 'claymorphic-v1', 4, '{"deck": "claymorphic-animals-001"}'::jsonb, NOW(), NOW())
ON CONFLICT (target_id) DO NOTHING;

INSERT INTO public.ar_tracking_targets (target_id, qr_id, reference_image_url, physical_width_m, mind_catalog_id, mind_target_index, metadata, created_at, updated_at)
VALUES
    ('clay_target_meat001', 'meat001', 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/meat001.png', 0.08, 'claymorphic-v1', 9, '{"deck": "claymorphic-animals-001"}'::jsonb, NOW(), NOW())
ON CONFLICT (target_id) DO NOTHING;

COMMIT;
