-- Complete canonical XP unlock catalog for the 24 Kenney cube pets.
--
-- This is a forward-only correction to 20260915_01_pet_xp_unlock_catalog.sql.
-- Keep exactly three starter pets free and assign every other cube pet to one
-- of the existing XP tiers. Existing ownership in users.unlocked_pets is not
-- changed by this migration.
--
-- Replay safety: rows are updated only when rarity or unlock_condition differs
-- from the canonical state.

WITH canonical_rules (pet_id, rarity, unlock_condition) AS (
    VALUES
        ('cube_bunny', 'common', jsonb_build_object('type', 'free', 'value', 0)),
        ('cube_cat', 'common', jsonb_build_object('type', 'free', 'value', 0)),
        ('cube_dog', 'common', jsonb_build_object('type', 'free', 'value', 0)),

        ('cube_bee', 'rare', jsonb_build_object('type', 'xp', 'value', 500)),
        ('cube_chick', 'rare', jsonb_build_object('type', 'xp', 'value', 500)),
        ('cube_cow', 'rare', jsonb_build_object('type', 'xp', 'value', 500)),
        ('cube_deer', 'rare', jsonb_build_object('type', 'xp', 'value', 500)),
        ('cube_fox', 'rare', jsonb_build_object('type', 'xp', 'value', 500)),
        ('cube_koala', 'rare', jsonb_build_object('type', 'xp', 'value', 500)),
        ('cube_panda', 'rare', jsonb_build_object('type', 'xp', 'value', 500)),
        ('cube_pig', 'rare', jsonb_build_object('type', 'xp', 'value', 500)),

        ('cube_beaver', 'epic', jsonb_build_object('type', 'xp', 'value', 1500)),
        ('cube_caterpillar', 'epic', jsonb_build_object('type', 'xp', 'value', 1500)),
        ('cube_elephant', 'epic', jsonb_build_object('type', 'xp', 'value', 1500)),
        ('cube_fish', 'epic', jsonb_build_object('type', 'xp', 'value', 1500)),
        ('cube_giraffe', 'epic', jsonb_build_object('type', 'xp', 'value', 1500)),
        ('cube_hog', 'epic', jsonb_build_object('type', 'xp', 'value', 1500)),
        ('cube_lion', 'epic', jsonb_build_object('type', 'xp', 'value', 1500)),
        ('cube_monkey', 'epic', jsonb_build_object('type', 'xp', 'value', 1500)),
        ('cube_tiger', 'epic', jsonb_build_object('type', 'xp', 'value', 1500)),

        ('cube_crab', 'legendary', jsonb_build_object('type', 'xp', 'value', 5000)),
        ('cube_parrot', 'legendary', jsonb_build_object('type', 'xp', 'value', 5000)),
        ('cube_penguin', 'legendary', jsonb_build_object('type', 'xp', 'value', 5000)),
        ('cube_polar', 'legendary', jsonb_build_object('type', 'xp', 'value', 5000))
)
UPDATE public.pets AS pets
SET
    rarity = canonical_rules.rarity,
    unlock_condition = canonical_rules.unlock_condition,
    updated_at = now()
FROM canonical_rules
WHERE pets.pet_id = canonical_rules.pet_id
  AND (
      pets.rarity IS DISTINCT FROM canonical_rules.rarity
      OR pets.unlock_condition IS DISTINCT FROM canonical_rules.unlock_condition
  );
