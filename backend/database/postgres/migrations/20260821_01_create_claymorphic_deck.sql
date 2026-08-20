-- Migration: 20260821_01_create_claymorphic_deck.sql
-- Create flashcard_deck for claymorphic flashcards

BEGIN;

INSERT INTO public.flashcard_decks (deck_id, name, description, cover_image_url, category, tags, is_active, card_count, created_at, updated_at)
VALUES (
    'claymorphic-animals-001',
    '{"en": "Animals Adventure Claymorphic", "vi": "Động vật Claymorphic"}'::jsonb,
    '{"en": "10 claymorphic flashcards: 5 animals + 5 foods, forming 5 animal+food combos", "vi": "10 flashcard claymorphic: 5 con vật + 5 thức ăn, tạo 5 cặp combo"}'::jsonb,
    'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/cat001.png',
    'animals',
    '["animals", "food", "claymorphic", "combos"]'::jsonb,
    TRUE,
    10,
    NOW(),
    NOW()
) ON CONFLICT (deck_id) DO NOTHING;

COMMIT;
