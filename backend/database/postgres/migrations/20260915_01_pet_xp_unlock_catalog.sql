-- Canonical XP unlock tiers for the learner pet catalog.
--
-- The existing 24 cube pets were all imported as common/free. Keep starter
-- companions free and configure ten existing pets with the documented rarity
-- thresholds: rare=500 XP, epic=1500 XP, legendary=5000 XP.
-- The IS DISTINCT FROM predicate makes replay a no-op once catalog data is
-- already at the intended state.

WITH canonical_rules (pet_id, rarity, unlock_condition) AS (
    VALUES
        ('cube_deer', 'rare', jsonb_build_object('type', 'xp', 'value', 500)),
        ('cube_fox', 'rare', jsonb_build_object('type', 'xp', 'value', 500)),
        ('cube_koala', 'rare', jsonb_build_object('type', 'xp', 'value', 500)),
        ('cube_panda', 'rare', jsonb_build_object('type', 'xp', 'value', 500)),
        ('cube_elephant', 'epic', jsonb_build_object('type', 'xp', 'value', 1500)),
        ('cube_giraffe', 'epic', jsonb_build_object('type', 'xp', 'value', 1500)),
        ('cube_lion', 'epic', jsonb_build_object('type', 'xp', 'value', 1500)),
        ('cube_tiger', 'epic', jsonb_build_object('type', 'xp', 'value', 1500)),
        ('cube_parrot', 'legendary', jsonb_build_object('type', 'xp', 'value', 5000)),
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
