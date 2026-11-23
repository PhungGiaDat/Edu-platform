-- Migration: 20260831_01_flashcard_vector_embedding.sql
-- De-Mongo Wave 1: add vector_embedding JSONB column to flashcards for
-- Gemini embedding storage (flashcard_repository Postgres-only cutover).
ALTER TABLE public.flashcards
    ADD COLUMN IF NOT EXISTS vector_embedding JSONB;
