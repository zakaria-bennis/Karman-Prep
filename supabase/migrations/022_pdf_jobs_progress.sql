-- ============================================================
-- 022_pdf_jobs_progress.sql
--
-- Adds a `progress` JSONB column to pdf_processing_jobs that
-- the local hybrid daemon updates at every stage transition,
-- so /admin/jobs can show live per-PDF status (not just the
-- coarse status enum + module pills).
--
-- Schema of the JSON value:
--   {
--     "stage":      "queued" | "pulled" | "processing"
--                 | "finalizing" | "ingesting" | "complete" | "failed",
--     "message":    "Claude is reading the PDF" (free text, optional),
--     "updated_at": "<ISO timestamp>"
--   }
--
-- Why JSONB instead of separate columns: the daemon updates this
-- at high frequency during a multi-stage run. JSONB lets us add
-- new fields (e.g. `pages_processed`, `eta_seconds`) without a
-- migration. The UI reads the whole blob at once.
--
-- Default is set so existing rows (the in-flight job at deploy time)
-- get a sane initial value without the daemon needing to backfill.
-- ============================================================

ALTER TABLE public.pdf_processing_jobs
  ADD COLUMN IF NOT EXISTS progress JSONB NOT NULL DEFAULT
    jsonb_build_object(
      'stage', 'queued',
      'message', null,
      'updated_at', null
    );

-- Backfill: existing rows inherit the default but with a more
-- accurate stage based on their current status — so the in-flight
-- job we have right now doesn't appear "queued" in the UI.
UPDATE public.pdf_processing_jobs
SET progress = jsonb_build_object(
  'stage', CASE status
    WHEN 'queued'   THEN 'queued'
    WHEN 'running'  THEN 'processing'
    WHEN 'partial'  THEN 'failed'
    WHEN 'complete' THEN 'complete'
    WHEN 'failed'   THEN 'failed'
    ELSE 'queued'
  END,
  'message', null,
  'updated_at', COALESCE(started_at, uploaded_at)::text
)
WHERE progress->>'updated_at' IS NULL;

COMMENT ON COLUMN public.pdf_processing_jobs.progress IS
  'Live stage tracker updated by the local hybrid daemon and the cron ingest route. See migration 022 for the JSON schema.';
