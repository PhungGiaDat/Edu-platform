-- 20260830_02_notebook_fk_retarget.sql — align notebook user FKs with project convention
-- The application registers learners in public.users (id VARCHAR) and every other
-- Postgres domain (learning_progress, gamification_events, ...) references it with
-- a VARCHAR user_id. The notebook tables were created with UUID user_id and an FK
-- to auth.users (Supabase Auth), which the register/login flow never populates.
-- This migration aligns them so notebook saves actually pass the FK.

ALTER TABLE notebook_entries DROP CONSTRAINT IF EXISTS notebook_entries_user_id_fkey;
ALTER TABLE notebook_entries
    ALTER COLUMN user_id TYPE VARCHAR USING user_id::text;
ALTER TABLE notebook_entries ADD CONSTRAINT notebook_entries_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE review_schedules DROP CONSTRAINT IF EXISTS review_schedules_user_id_fkey;
ALTER TABLE review_schedules
    ALTER COLUMN user_id TYPE VARCHAR USING user_id::text;
ALTER TABLE review_schedules ADD CONSTRAINT review_schedules_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
