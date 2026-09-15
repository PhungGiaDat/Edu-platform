-- Additive provisioning for the printed Dog and Bone cards.
--
-- QR payloads: dog001 and bone001.
-- Existing legacy records are intentionally untouched.
-- No combo rule is created by this migration.

BEGIN;

INSERT INTO public.flashcards (
    qr_id, deck_id, ar_tag, word, translation, definition, category,
    image_url, audio_url, difficulty, image_animation_type, is_active,
    created_at, updated_at
)
VALUES
    (
        'dog001',
        'claymorphic-animals-001',
        'dog001',
        'dog',
        '{"en":"dog","vi":"con chó"}'::jsonb,
        'A domesticated canine animal.',
        'animal',
        'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/dog001.png',
        NULL,
        'easy',
        'SHIBA_IDLE',
        TRUE,
        NOW(),
        NOW()
    ),
    (
        'bone001',
        'claymorphic-animals-001',
        'bone001',
        'bone',
        '{"en":"bone","vi":"xương"}'::jsonb,
        'A hard part of an animal skeleton.',
        'object',
        'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/bone001.png',
        NULL,
        'easy',
        'NONE',
        TRUE,
        NOW(),
        NOW()
    )
ON CONFLICT (qr_id) DO NOTHING;

INSERT INTO public.ar_objects (
    ar_tag, description, animation_type, glb_size, model_3d_url,
    texture_url, image_2d_url, position, rotation, scale,
    mind_catalog_id, mind_target_index, animations, default_animation,
    combo_animation, created_at, updated_at
)
VALUES
    (
        'dog001',
        'Shiba dog for AR vocabulary learning.',
        'SHIBA_IDLE',
        0.5,
        'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/shiba_mobile_v1.glb',
        NULL,
        'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/dog001.png',
        '0 0.1 0',
        '0 180 0',
        '0.5 0.5 0.5',
        NULL,
        NULL,
        ARRAY['SHIBA_IDLE', 'SHIBA_EAT_BONE']::text[],
        'SHIBA_IDLE',
        'SHIBA_EAT_BONE',
        NOW(),
        NOW()
    ),
    (
        'bone001',
        'Static dog-bone partner for AR vocabulary learning.',
        'none',
        1.0,
        'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/bone_mobile_v1.glb',
        NULL,
        'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/bone001.png',
        '0 0 0',
        '0 0 0',
        '1 1 1',
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NOW(),
        NOW()
    )
ON CONFLICT (ar_tag) DO NOTHING;

INSERT INTO public.ar_tracking_targets (
    target_id, qr_id, reference_image_url, physical_width_m,
    mind_catalog_id, mind_file_url, mind_target_index, metadata,
    xr_target_json_url, xr_target_image_url, created_at, updated_at
)
VALUES
    (
        'clay_target_dog001',
        'dog001',
        'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/dog001.png',
        0.0800,
        NULL,
        NULL,
        NULL,
        '{"deck":"claymorphic-animals-001","source":"dog_bone_printed_cards","xr_target_json_url":"https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/xr-targets/dog001.json","xr_target_luminance_url":"https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/xr-targets/dog001_luminance.png"}'::jsonb,
        'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/xr-targets/dog001.json',
        'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/xr-targets/dog001_luminance.png',
        NOW(),
        NOW()
    ),
    (
        'clay_target_bone001',
        'bone001',
        'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/bone001.png',
        0.0800,
        NULL,
        NULL,
        NULL,
        '{"deck":"claymorphic-animals-001","source":"dog_bone_printed_cards","xr_target_json_url":"https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/xr-targets/bone001.json","xr_target_luminance_url":"https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/xr-targets/bone001_luminance.png"}'::jsonb,
        'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/xr-targets/bone001.json',
        'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/xr-targets/bone001_luminance.png',
        NOW(),
        NOW()
    )
ON CONFLICT (target_id) DO NOTHING;

COMMIT;
