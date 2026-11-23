-- Optional, declarative WebAR model presentation metadata.
-- Records without a profile retain the existing position/rotation/scale path.

BEGIN;

ALTER TABLE public.ar_objects
    ADD COLUMN IF NOT EXISTS presentation_profile TEXT,
    ADD COLUMN IF NOT EXISTS presentation_scale_multiplier DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS presentation_position_offset TEXT,
    ADD COLUMN IF NOT EXISTS presentation_forward_axis TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ar_objects_presentation_scale_multiplier_positive'
    ) THEN
        ALTER TABLE public.ar_objects
            ADD CONSTRAINT ar_objects_presentation_scale_multiplier_positive
            CHECK (
                presentation_scale_multiplier IS NULL
                OR presentation_scale_multiplier > 0
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ar_objects_presentation_forward_axis_valid'
    ) THEN
        ALTER TABLE public.ar_objects
            ADD CONSTRAINT ar_objects_presentation_forward_axis_valid
            CHECK (
                presentation_forward_axis IS NULL
                OR presentation_forward_axis IN ('+X', '-X', '+Y', '-Y', '+Z', '-Z')
            );
    END IF;
END
$$;

-- The first opt-in asset is guarded: it may migrate from either the original
-- printed-card transform or the previously verified temporary calibration.
-- Any other state aborts instead of silently overwriting an operator change.
DO $$
DECLARE
    updated_rows INTEGER;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.ar_objects
        WHERE ar_tag = 'dog001'
          AND presentation_profile = 'pet'
          AND presentation_scale_multiplier = 1
          AND presentation_position_offset = '0 0 0'
          AND presentation_forward_axis = '+Z'
          AND position = '0 0 0'
          AND rotation = '0 0 0'
          AND scale = '1 1 1'
    ) THEN
        RETURN;
    END IF;

    UPDATE public.ar_objects
    SET
        presentation_profile = 'pet',
        presentation_scale_multiplier = 1,
        presentation_position_offset = '0 0 0',
        presentation_forward_axis = '+Z',
        position = '0 0 0',
        rotation = '0 0 0',
        scale = '1 1 1',
        updated_at = NOW()
    WHERE ar_tag = 'dog001'
      AND model_3d_url =
          'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/shiba_mobile_v1.glb'
      AND presentation_profile IS NULL
      AND presentation_scale_multiplier IS NULL
      AND presentation_position_offset IS NULL
      AND presentation_forward_axis IS NULL
      AND (
          (position = '0 0.1 0' AND rotation = '0 180 0' AND scale = '0.5 0.5 0.5')
          OR
          (position = '0 0 0' AND rotation = '0 0 0' AND scale = '0.75 0.75 0.75')
      );

    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    IF updated_rows <> 1 THEN
        RAISE EXCEPTION
            'Expected exactly one guarded dog001 presentation migration, updated % rows',
            updated_rows;
    END IF;
END
$$;

COMMIT;
