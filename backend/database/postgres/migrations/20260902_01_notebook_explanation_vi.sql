-- 20260902_01_notebook_explanation_vi.sql — additive: kid-friendly
-- Vietnamese explanation cached at Tra từ save time (Option B).
ALTER TABLE notebook_entries
    ADD COLUMN IF NOT EXISTS explanation_vi TEXT;

COMMENT ON COLUMN notebook_entries.explanation_vi IS
    'Kid-friendly Vietnamese explanation (1-2 câu) from Tra từ lookup, cached at save time';
