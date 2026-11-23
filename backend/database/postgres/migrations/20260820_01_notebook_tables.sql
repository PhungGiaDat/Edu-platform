-- ============================================================
-- Learn Vocabulary & Notebook Tables
-- Migration: 20260820_01_notebook_tables.sql
-- ============================================================
-- Features: Sổ tay, Tra từ, TikTok Flashcards, Thời điểm vàng

-- notebook_entries: User's personal vocabulary notebook
CREATE TABLE IF NOT EXISTS notebook_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    word VARCHAR(255) NOT NULL,
    translation_vi TEXT NOT NULL,
    translation_en TEXT,
    context TEXT,
    source VARCHAR(50) NOT NULL CHECK (source IN ('ai_translation', 'flashcard', 'manual')),
    topic VARCHAR(100),
    difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    review_count INTEGER DEFAULT 0,
    ease_factor DECIMAL(3,2) DEFAULT 2.5,
    interval_days INTEGER DEFAULT 0,
    next_review_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, word)
);

-- review_schedules: User's spaced repetition schedule preferences
CREATE TABLE IF NOT EXISTS review_schedules (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT true,
    schedule JSONB NOT NULL DEFAULT '{"windows":[]}',
    timezone VARCHAR(50) DEFAULT 'Asia/Ho_Chi_Minh',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- review_history: Track review attempts for SM-2 algorithm
CREATE TABLE IF NOT EXISTS review_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES notebook_entries(id) ON DELETE CASCADE,
    quality INTEGER NOT NULL CHECK (quality >= 0 AND quality <= 5),
    ease_factor_after DECIMAL(3,2),
    interval_after INTEGER,
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- vocabulary_topics: Predefined vocabulary categories
CREATE TABLE IF NOT EXISTS vocabulary_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_vi VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(20),
    is_ielts BOOLEAN DEFAULT false,
    ielts_band VARCHAR(10),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- Indexes for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_notebook_user ON notebook_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_notebook_next_review ON notebook_entries(user_id, next_review_at) WHERE next_review_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notebook_topic ON notebook_entries(user_id, topic) WHERE topic IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notebook_difficulty ON notebook_entries(user_id, difficulty) WHERE difficulty IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notebook_source ON notebook_entries(user_id, source);
CREATE INDEX IF NOT EXISTS idx_review_history_card ON review_history(card_id);
CREATE INDEX IF NOT EXISTS idx_review_history_user ON review_history(user_id, reviewed_at);
CREATE INDEX IF NOT EXISTS idx_review_history_due ON review_history(user_id, reviewed_at DESC);

-- ============================================================
-- Seed: Default vocabulary topics
-- ============================================================

INSERT INTO vocabulary_topics (slug, name, name_vi, description, icon, color, is_ielts, ielts_band, sort_order) VALUES
    ('animals', 'Animals', 'Động vật', 'Words about animals and pets', '🐾', '#FF9F9F', false, NULL, 1),
    ('food', 'Food & Drinks', 'Đồ ăn & Thức uống', 'Words about food and beverages', '🍕', '#FFD93D', false, NULL, 2),
    ('family', 'Family', 'Gia đình', 'Words about family members', '👨‍👩‍👧', '#B4E197', false, NULL, 3),
    ('school', 'School', 'Trường học', 'Words about school and learning', '📚', '#6EB9FF', false, NULL, 4),
    ('nature', 'Nature', 'Thiên nhiên', 'Words about nature and environment', '🌳', '#A78BFA', false, NULL, 5),
    ('travel', 'Travel', 'Du lịch', 'Words about travel and directions', '✈️', '#14B8A6', false, NULL, 6),
    ('conversation', 'Daily Conversation', 'Giao tiếp hàng ngày', 'Common phrases for daily conversation', '💬', '#F472B6', false, NULL, 7),
    ('ielts-5', 'IELTS Band 5.0-5.5', 'IELTS Band 5.0-5.5', 'Vocabulary for IELTS band 5.0-5.5', '🎯', '#FF8C42', true, '5.0-5.5', 10),
    ('ielts-6', 'IELTS Band 6.0-6.5', 'IELTS Band 6.0-6.5', 'Vocabulary for IELTS band 6.0-6.5', '🎯', '#FF8C42', true, '6.0-6.5', 11),
    ('ielts-7', 'IELTS Band 7.0+', 'IELTS Band 7.0+', 'Advanced vocabulary for IELTS 7.0+', '🎯', '#A855F7', true, '7.0+', 12)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Function: Update next_review_at based on SM-2 algorithm
-- ============================================================

CREATE OR REPLACE FUNCTION update_sm2_review(
    p_card_id UUID,
    p_quality INTEGER,
    OUT p_ease_factor DECIMAL(3,2),
    OUT p_interval_days INTEGER
) RETURNS RECORD AS $$
DECLARE
    v_card RECORD;
    v_ef DECIMAL(3,2);
    v_interval INTEGER;
BEGIN
    -- Get current card state
    SELECT * INTO v_card FROM notebook_entries WHERE id = p_card_id;

    -- Calculate new ease factor
    v_ef := v_card.ease_factor + (0.1 - (5 - p_quality) * (0.08 + (5 - p_quality) * 0.02));
    IF v_ef < 1.3 THEN v_ef := 1.3; END IF;

    -- Calculate new interval
    IF p_quality < 3 THEN
        -- Failed: reset interval
        v_interval := 1;
    ELSIF v_card.review_count = 0 THEN
        v_interval := 1;
    ELSIF v_card.review_count = 1 THEN
        v_interval := 6;
    ELSE
        v_interval := CEIL(v_card.interval_days * v_ef);
    END IF;

    -- Update card with new values
    UPDATE notebook_entries SET
        ease_factor = v_ef,
        interval_days = v_interval,
        review_count = review_count + 1,
        last_reviewed_at = NOW(),
        next_review_at = NOW() + (v_interval || ' days')::INTERVAL
    WHERE id = p_card_id;

    p_ease_factor := v_ef;
    p_interval_days := v_interval;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Comments for documentation
-- ============================================================

COMMENT ON TABLE notebook_entries IS 'User vocabulary notebook - saves words from AI translation or flashcard swipe';
COMMENT ON TABLE review_schedules IS 'User spaced repetition schedule preferences';
COMMENT ON TABLE review_history IS 'History of review attempts for SM-2 algorithm';
COMMENT ON TABLE vocabulary_topics IS 'Predefined vocabulary categories (conversation topics and IELTS bands)';
COMMENT ON COLUMN notebook_entries.source IS 'How the word was added: ai_translation, flashcard, manual';
COMMENT ON COLUMN notebook_entries.ease_factor IS 'SM-2 ease factor, default 2.5, min 1.3';
COMMENT ON COLUMN review_history.quality IS 'SM-2 quality rating: 0-2=fail, 3=hard, 4=good, 5=easy';
