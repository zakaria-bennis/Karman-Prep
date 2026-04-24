-- ============================================================
-- Strata — Migration 004 · Question images
-- Adds image support to quiz_questions (tables, graphs, figures).
-- Run after 003 in Supabase SQL editor. Idempotent.
-- ============================================================

-- 1. Image columns on quiz_questions
ALTER TABLE quiz_questions
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS image_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS image_alt TEXT;

-- 2. Public bucket for question images
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read policy
DROP POLICY IF EXISTS "question-images public read" ON storage.objects;
CREATE POLICY "question-images public read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'question-images');

-- Service-role write policy
DROP POLICY IF EXISTS "question-images service write" ON storage.objects;
CREATE POLICY "question-images service write" ON storage.objects
  FOR ALL
  USING (bucket_id = 'question-images' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'question-images' AND auth.role() = 'service_role');
