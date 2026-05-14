-- ============================================================
-- Strata Admin Content — Migration 003
--
-- Adds:
--   · hint column on quiz_questions
--   · node_content table (textbook + video overrides per node)
--   · Supabase Storage bucket 'node-videos' for admin-uploaded videos
--
-- Run this in the Supabase SQL editor after migrations 001 and 002.
-- Idempotent — safe to re-run.
-- ============================================================

-- 1. Hint column on quiz_questions ──────────────────────────

ALTER TABLE quiz_questions
  ADD COLUMN IF NOT EXISTS hint TEXT;

-- 2. node_content — per-node textbook + video overrides ─────
-- node_id is TEXT to match the curriculum.ts IDs (e.g. 'rw-00').

CREATE TABLE IF NOT EXISTS node_content (
  node_id                 TEXT PRIMARY KEY,
  textbook_content        TEXT,
  video_url               TEXT,
  video_storage_path      TEXT,                 -- object key inside the 'node-videos' bucket
  video_duration_seconds  INTEGER,
  updated_by              TEXT,                 -- Clerk user ID of the admin that last saved
  updated_at              TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE node_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON node_content;
CREATE POLICY "Service role full access" ON node_content
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 3. Storage bucket for lesson videos ───────────────────────
-- Creating a public-read bucket so the student-facing lesson player
-- can load the video by its public URL. Videos are lesson content,
-- not sensitive user data.

INSERT INTO storage.buckets (id, name, public)
VALUES ('node-videos', 'node-videos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public-read policy on bucket objects
DROP POLICY IF EXISTS "node-videos public read" ON storage.objects;
CREATE POLICY "node-videos public read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'node-videos');

-- Authenticated users can insert/update/delete (admin check happens in app)
DROP POLICY IF EXISTS "node-videos authed write" ON storage.objects;
CREATE POLICY "node-videos authed write" ON storage.objects
  FOR ALL
  USING (bucket_id = 'node-videos' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'node-videos' AND auth.role() = 'service_role');
