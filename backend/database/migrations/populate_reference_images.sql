-- Migration: populate_reference_images.sql
-- Phase 2 deliverable: populate reference_image_url for 16 confirmed cards
-- from AR_models Supabase storage bucket.
--
-- Source audit (2026-08-15):
--   16/24 cards: confirmed path exists in AR_models/images/flashcards/
--    5/24 cards: unconfirmed — excluded (needs product verification)
--    3/24 cards: no existing image — excluded (dog123, britishshorthair001, combo target)
--
-- Physical width: left NULL (nullable contract preserved — Unity uses
-- unknown-size registration path with widthMeters=0f when NULL).

-- Verify current state before update
DO $$
BEGIN
    RAISE NOTICE 'Total ar_tracking_targets rows: %',
        (SELECT COUNT(*) FROM public.ar_tracking_targets);

    RAISE NOTICE 'Rows with reference_image_url already set: %',
        (SELECT COUNT(*) FROM public.ar_tracking_targets
         WHERE reference_image_url IS NOT NULL);

    RAISE NOTICE 'Rows with physical_width_m already set: %',
        (SELECT COUNT(*) FROM public.ar_tracking_targets
         WHERE physical_width_m IS NOT NULL);
END $$;

-- Populate reference_image_url for 16 confirmed cards
-- Pattern: https://{supabase_project}.supabase.co/storage/v1/object/public/AR_models/{path}

UPDATE public.ar_tracking_targets
SET
    reference_image_url =
        'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/'
        || CASE qr_id
            -- Vehicle category
            WHEN 'car01'   THEN 'images/flashcards/car01_card.png'
            WHEN 'suv01'   THEN 'images/flashcards/suv01_card.png'
            WHEN 'truck01' THEN 'images/flashcards/truck01_card.png'
            -- Nature category
            WHEN 'tree01'     THEN 'images/flashcards/tree01_card.png'
            WHEN 'flower01'   THEN 'images/flashcards/flower01_card.png'
            WHEN 'mushroom01' THEN 'images/flashcards/mushroom01_card.png'
            WHEN 'cactus01'   THEN 'images/flashcards/cactus01_card.png'
            WHEN 'jungle01'   THEN 'images/flashcards/jungle01_card.png'
            WHEN 'palm01'     THEN 'images/flashcards/palm01_card.png'
            -- Food category
            WHEN 'apple01'  THEN 'images/flashcards/apple01_card.png'
            WHEN 'banana01' THEN 'images/flashcards/banana01_card.png'
            WHEN 'cake01'   THEN 'images/flashcards/cake01_card.png'
            -- Event category
            WHEN 'birthday01' THEN 'images/flashcards/birthday01_card.png'
            -- Animal category
            WHEN 'ele123'      THEN 'images/flashcards/ele123_card.png'
            WHEN 'hama001'     THEN 'images/flashcards/hama.jpg'
            WHEN 'huucaoco001' THEN 'images/flashcards/huucaoco.jpg'
            ELSE NULL
        END,
    updated_at = NOW()
WHERE qr_id IN (
    'car01', 'suv01', 'truck01',
    'tree01', 'flower01', 'mushroom01', 'cactus01', 'jungle01', 'palm01',
    'apple01', 'banana01', 'cake01',
    'birthday01',
    'ele123', 'hama001', 'huucaoco001'
)
AND reference_image_url IS NULL;

-- Report result
DO $$
DECLARE
    updated_count INTEGER;
    still_null   INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;

    SELECT COUNT(*) INTO still_null
    FROM public.ar_tracking_targets
    WHERE qr_id IN (
        'car01', 'suv01', 'truck01',
        'tree01', 'flower01', 'mushroom01', 'cactus01', 'jungle01', 'palm01',
        'apple01', 'banana01', 'cake01',
        'birthday01',
        'ele123', 'hama001', 'huucaoco001'
    )
    AND reference_image_url IS NULL;

    RAISE NOTICE '---';
    RAISE NOTICE 'Rows updated: %', updated_count;
    RAISE NOTICE 'Rows still NULL after update: % (expected 0)', still_null;

    RAISE NOTICE '';
    RAISE NOTICE '--- Product action items ---';
    RAISE NOTICE 'Unconfirmed (5): cat001, catcow001, fredcat001, giraffe001, hippo001';
    RAISE NOTICE 'No image (3): dog123, britishshorthair001, combo_ele_jungle';
END $$;

-- Verify final state
SELECT
    qr_id,
    reference_image_url,
    physical_width_m
FROM public.ar_tracking_targets
WHERE qr_id IN (
    'car01', 'suv01', 'truck01',
    'tree01', 'flower01', 'mushroom01', 'cactus01', 'jungle01', 'palm01',
    'apple01', 'banana01', 'cake01',
    'birthday01',
    'ele123', 'hama001', 'huucaoco001',
    -- Also show unconfirmed so product can see what is missing
    'cat001', 'catcow001', 'fredcat001', 'giraffe001', 'hippo001',
    'dog123', 'britishshorthair001', 'combo_ele_jungle'
)
ORDER BY qr_id;
