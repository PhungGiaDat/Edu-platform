-- Migration: 20260822_01_rename_claymorphic_to_animal_combo.sql
-- Rename mind_catalog_id from 'claymorphic-v1' to 'animal-combo-v1'

BEGIN;

-- Update ar_objects
UPDATE public.ar_objects
SET mind_catalog_id = 'animal-combo-v1',
    updated_at = NOW()
WHERE mind_catalog_id = 'claymorphic-v1';

-- Update ar_tracking_targets
UPDATE public.ar_tracking_targets
SET mind_catalog_id = 'animal-combo-v1',
    updated_at = NOW()
WHERE mind_catalog_id = 'claymorphic-v1';

COMMIT;
