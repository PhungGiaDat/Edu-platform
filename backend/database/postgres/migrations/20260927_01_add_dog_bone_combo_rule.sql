-- Add the DOG + BONE interaction rule for the printed dog001/bone001 cards.
--
-- 20260913_01 provisioned the cards, models and XR targets but no combo rule,
-- so dog001 sessions never admitted bone001. Dog is the actor (tag_order 0)
-- and plays SHIBA_EAT_BONE. Proximity mirrors the physically verified
-- cat/fish card values; the runtime ignores rules without proximity.

BEGIN;

INSERT INTO public.ar_combinations (combo_id, combo_name, description, combo_mind_url, image_2d_url, model_3d_url, texture_url, center_transform, active, priority, reward_points, bonus_xp, semantic_result, phrase, sound, animation, flashcard_set, target_order, proximity_enter_distance, proximity_exit_distance, proximity_stable_ms, proximity_smoothing_alpha, created_at, updated_at)
VALUES (
    'clay_dog_bone',
    'Dog eats Bone',
    'The dog chews a bone.',
    NULL,
    'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/dog001.png',
    'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/shiba_mobile_v1.glb',
    NULL,
    '{"position": "0 0.5 0", "rotation": "0 0 0", "scale": "1.5 1.5 1.5"}'::jsonb,
    TRUE,
    10,
    100,
    100,
    'dog_eats_bone',
    'The dog eats a bone!',
    NULL,
    '"SHIBA_EAT_BONE"'::jsonb,
    '"claymorphic-animals-001"'::jsonb,
    '["dog001", "bone001"]'::jsonb,
    0.62,
    0.70,
    300,
    0.25,
    NOW(),
    NOW()
) ON CONFLICT (combo_id) DO NOTHING;

INSERT INTO public.ar_combination_required_tags (combo_id, ar_tag, tag_order) VALUES
    ('clay_dog_bone', 'dog001', 0),
    ('clay_dog_bone', 'bone001', 1)
ON CONFLICT (combo_id, ar_tag) DO NOTHING;

COMMIT;
