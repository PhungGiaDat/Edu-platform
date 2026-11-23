-- 20260903_01_kid_sm2_no_fail_hybrid.sql
-- Kid-adapted spaced repetition: no-fail hybrid SM-2 + Leitner box metaphor.
--
-- Design principles (ages 5-8, see thesis_report session notes):
--   * NO punishment path: boxes only go UP. A "relearn" answer keeps the box
--     unchanged and reschedules for tomorrow — never back to zero.
--   * Box = achieved mastery, child-legible: 1 seed -> 5 bloomed flower.
--     Ladder: 1 / 3 / 7 / 14 / 30 days (box 1..5), capped at 30.
--   * Ownership enforced inside the function (closes the IDOR where any
--     authenticated user could POST reviews for another user's entry).
--   * review_history is finally written (was dead since 20260820) so future
--     algorithm fitting (FSRS/HLR) has data to work from.
--
-- Additive & idempotent: safe to re-run.

-- 1) Box column (1..5), derived intent: maps to interval ladder
ALTER TABLE notebook_entries
    ADD COLUMN IF NOT EXISTS mastery_box SMALLINT NOT NULL DEFAULT 1;
DO $$
BEGIN
    ALTER TABLE notebook_entries
        ADD CONSTRAINT notebook_entries_mastery_box_check
        CHECK (mastery_box BETWEEN 1 AND 5);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2) Backfill: clamp legacy year-long intervals into the kid ladder
UPDATE notebook_entries SET interval_days = 30 WHERE interval_days > 30;
UPDATE notebook_entries SET ease_factor = 2.2 WHERE ease_factor > 2.2;
-- Derive a starting box from existing interval so progress is not lost
UPDATE notebook_entries SET mastery_box = CASE
    WHEN interval_days >= 30 THEN 5
    WHEN interval_days >= 14 THEN 4
    WHEN interval_days >= 7  THEN 3
    WHEN interval_days >= 3  THEN 2
    ELSE 1 END;

-- 2b) Legacy FK repair: review_history.user_id was UUID referencing
-- auth.users — but this schema's users live in public.users with a VARCHAR
-- id (matches notebook_entries.user_id). Convert the column so the ledger
-- INSERT inside update_sm2_review (varchar ids) cannot fail.
ALTER TABLE review_history DROP CONSTRAINT IF EXISTS review_history_user_id_fkey;
ALTER TABLE review_history ALTER COLUMN user_id TYPE VARCHAR(64) USING user_id::text;
DO $$
BEGIN
    ALTER TABLE review_history
        ADD CONSTRAINT review_history_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2c) Legacy FK repair: notebook_entries.user_id FK must target public.users
-- (retargeted by 20260830_02; restore defensively for fresh environments).
ALTER TABLE notebook_entries DROP CONSTRAINT IF EXISTS notebook_entries_user_id_fkey;
ALTER TABLE notebook_entries
    ADD CONSTRAINT notebook_entries_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 3) Kid-adapted review function (replaces update_sm2_review)
-- NOTE: p_user_id is VARCHAR to match notebook_entries.user_id (project
-- convention — user ids are 32-hex strings, not UUIDs).
CREATE OR REPLACE FUNCTION update_sm2_review(
    p_card_id UUID,
    p_user_id VARCHAR(64),
    p_quality INTEGER,
    OUT p_ease_factor DECIMAL(3,2),
    OUT p_interval_days INTEGER,
    OUT p_box INTEGER
) RETURNS RECORD AS $$
DECLARE
    v_card RECORD;
    v_ef DECIMAL(3,2);
    v_box INTEGER;
    v_interval INTEGER;
    v_known BOOLEAN;
BEGIN
    -- OWNERSHIP: only the owner's row can be touched
    SELECT * INTO v_card
    FROM notebook_entries
    WHERE id = p_card_id AND user_id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOTEBOOK_ENTRY_NOT_FOUND';
    END IF;

    v_known := (p_quality >= 3);  -- kids' UX sends 1 (relearn) or 5 (know); 3-4 reserved for future smiley variants

    IF v_known THEN
        -- Box up, capped at 5. EF up, capped at 2.2.
        v_box := LEAST(v_card.mastery_box + 1, 5);
        v_ef  := LEAST(v_card.ease_factor + 0.05, 2.2);
        -- Interval ladder keyed to box (not review_count) so lapses never
        -- accidentally skip boxes.
        v_interval := CASE v_box
            WHEN 1 THEN 1
            WHEN 2 THEN 3
            WHEN 3 THEN 7
            WHEN 4 THEN 14
            ELSE 30
        END;
    ELSE
        -- No-fail: box UNCHANGED, EF unchanged — only an EARLIER reminder:
        -- the word comes back tomorrow ("học lại nhé 🌱"), never punished,
        -- never sent further away.
        v_box := v_card.mastery_box;
        v_ef  := v_card.ease_factor;
        v_interval := 1;
    END IF;

    UPDATE notebook_entries SET
        ease_factor   = v_ef,
        interval_days = v_interval,
        mastery_box   = v_box,
        review_count  = review_count + 1,
        last_reviewed_at = NOW(),
        next_review_at   = NOW() + (v_interval || ' days')::INTERVAL
    WHERE id = p_card_id AND user_id = p_user_id;

    -- Keep the ledger for future algorithm work
    INSERT INTO review_history (user_id, card_id, quality, ease_factor_after, interval_after, reviewed_at)
    VALUES (p_user_id, p_card_id, p_quality, v_ef, v_interval, NOW());

    p_ease_factor  := v_ef;
    p_interval_days := v_interval;
    p_box := v_box;
END;
$$ LANGUAGE plpgsql;

-- 4) Docs
COMMENT ON COLUMN notebook_entries.mastery_box IS 'Kid Leitner box 1-5 (seed->bloom); only increases, never decreases (no-fail design)';
COMMENT ON COLUMN review_history.card_id IS 'FK to notebook_entries.id, written by update_sm2_review';
