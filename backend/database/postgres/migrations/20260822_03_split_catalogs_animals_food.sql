-- Migration: 20260822_03_split_catalogs_animals_food.sql
-- Split claymorphic-v1 into three catalogs + keep animals-v2:
-- 1. animals-v2  = 2 animals (elephant, shiba) — existing .mind file
-- 2. animal-v1   = 5 animals for single-card mode (cat, rabbit, elephant, panda, tiger)
-- 3. food-v1     = 5 foods for single-card mode (fish, carrot, grass, bamboo, meat)
-- 4. animal-combo-v1 = 10 cards (animals + food) for combo mode

BEGIN;

-- ============================================================================
-- 1. animals-v2: 2 animal targets (existing)
-- ============================================================================
UPDATE public.ar_objects
SET mind_catalog_id = 'animals-v2',
    mind_target_index = CASE ar_tag
        WHEN 'elephant001' THEN 0
        WHEN 'shiba_marker_01' THEN 1
        ELSE mind_target_index
    END,
    updated_at = NOW()
WHERE ar_tag IN ('elephant001', 'shiba_marker_01');

UPDATE public.ar_tracking_targets
SET mind_catalog_id = 'animals-v2',
    mind_target_index = CASE qr_id
        WHEN 'elephant001' THEN 0
        WHEN 'shiba_marker_01' THEN 1
        ELSE mind_target_index
    END,
    updated_at = NOW()
WHERE qr_id IN ('elephant001', 'shiba_marker_01');

-- ============================================================================
-- 2. animal-v1: 5 animals for single-card mode
-- ============================================================================
UPDATE public.ar_objects
SET mind_catalog_id = 'animal-v1',
    mind_target_index = CASE ar_tag
        WHEN 'cat001' THEN 0
        WHEN 'rabbit001' THEN 1
        WHEN 'elephant001' THEN 2
        WHEN 'panda001' THEN 3
        WHEN 'tiger001' THEN 4
        ELSE mind_target_index
    END,
    updated_at = NOW()
WHERE ar_tag IN ('cat001', 'rabbit001', 'panda001', 'tiger001');

-- elephant001: already in animals-v2, keep it there
-- (no update needed for elephant001 in ar_objects)

UPDATE public.ar_tracking_targets
SET mind_catalog_id = 'animal-v1',
    mind_target_index = CASE qr_id
        WHEN 'cat001' THEN 0
        WHEN 'rabbit001' THEN 1
        WHEN 'panda001' THEN 3
        WHEN 'tiger001' THEN 4
        ELSE mind_target_index
    END,
    updated_at = NOW()
WHERE qr_id IN ('cat001', 'rabbit001', 'panda001', 'tiger001');

-- ============================================================================
-- 3. food-v1: 5 foods for single-card mode
-- ============================================================================
UPDATE public.ar_objects
SET mind_catalog_id = 'food-v1',
    mind_target_index = CASE ar_tag
        WHEN 'fish001' THEN 0
        WHEN 'carrot001' THEN 1
        WHEN 'grass001' THEN 2
        WHEN 'bamboo001' THEN 3
        WHEN 'meat001' THEN 4
        ELSE mind_target_index
    END,
    updated_at = NOW()
WHERE ar_tag IN ('fish001', 'carrot001', 'grass001', 'bamboo001', 'meat001');

UPDATE public.ar_tracking_targets
SET mind_catalog_id = 'food-v1',
    mind_target_index = CASE qr_id
        WHEN 'fish001' THEN 0
        WHEN 'carrot001' THEN 1
        WHEN 'grass001' THEN 2
        WHEN 'bamboo001' THEN 3
        WHEN 'meat001' THEN 4
        ELSE mind_target_index
    END,
    updated_at = NOW()
WHERE qr_id IN ('fish001', 'carrot001', 'grass001', 'bamboo001', 'meat001');

-- ============================================================================
-- 4. animal-combo-v1: 10 cards (animals + food) for combo mode
-- animals index 0-4, food index 5-9
-- ============================================================================
UPDATE public.ar_objects
SET mind_catalog_id = 'animal-combo-v1',
    mind_target_index = CASE ar_tag
        WHEN 'cat001' THEN 0
        WHEN 'rabbit001' THEN 1
        WHEN 'elephant001' THEN 2
        WHEN 'panda001' THEN 3
        WHEN 'tiger001' THEN 4
        WHEN 'fish001' THEN 5
        WHEN 'carrot001' THEN 6
        WHEN 'grass001' THEN 7
        WHEN 'bamboo001' THEN 8
        WHEN 'meat001' THEN 9
        ELSE mind_target_index
    END,
    updated_at = NOW()
WHERE ar_tag IN ('cat001', 'rabbit001', 'elephant001', 'panda001', 'tiger001',
                 'fish001', 'carrot001', 'grass001', 'bamboo001', 'meat001');

UPDATE public.ar_tracking_targets
SET mind_catalog_id = 'animal-combo-v1',
    mind_target_index = CASE qr_id
        WHEN 'cat001' THEN 0
        WHEN 'rabbit001' THEN 1
        WHEN 'elephant001' THEN 2
        WHEN 'panda001' THEN 3
        WHEN 'tiger001' THEN 4
        WHEN 'fish001' THEN 5
        WHEN 'carrot001' THEN 6
        WHEN 'grass001' THEN 7
        WHEN 'bamboo001' THEN 8
        WHEN 'meat001' THEN 9
        ELSE mind_target_index
    END,
    updated_at = NOW()
WHERE qr_id IN ('cat001', 'rabbit001', 'elephant001', 'panda001', 'tiger001',
                 'fish001', 'carrot001', 'grass001', 'bamboo001', 'meat001');

COMMIT;
