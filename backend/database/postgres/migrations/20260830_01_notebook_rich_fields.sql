-- 20260830_01_notebook_rich_fields.sql — additive rich data for Tra từ saves
ALTER TABLE notebook_entries
    ADD COLUMN IF NOT EXISTS pronunciation VARCHAR(100),
    ADD COLUMN IF NOT EXISTS part_of_speech VARCHAR(50),
    ADD COLUMN IF NOT EXISTS definition_en TEXT,
    ADD COLUMN IF NOT EXISTS wiki_summary TEXT;

ALTER TABLE notebook_entries DROP CONSTRAINT IF EXISTS notebook_entries_source_check;
ALTER TABLE notebook_entries ADD CONSTRAINT notebook_entries_source_check
    CHECK (source IN ('ai_translation', 'flashcard', 'manual', 'word_lookup'));

COMMENT ON COLUMN notebook_entries.pronunciation IS 'IPA pronunciation from Tra từ lookup';
COMMENT ON COLUMN notebook_entries.wiki_summary IS 'Kid-safe Wikipedia summary excerpt cached at save time';
