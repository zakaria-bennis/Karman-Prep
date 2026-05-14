-- ============================================================
-- 021_pdf_processing_jobs.sql
--
-- Job table for the PDF-ingestion pipeline (BUGS.md #3 + #4).
--
-- One row per uploaded PDF. The hybrid runner (admin's local
-- machine running Claude Code, polling for queued jobs) updates
-- per-module status as it processes the answer key + four module
-- sections. After all modules complete, the folder-watch cron
-- pulls the resulting CSVs from R2 and feeds them through
-- actionBulkImport, then marks the job complete.
--
-- Storage layout (in R2 bucket karmanprep-question-images):
--   pdf-inbox/<jobId>/source.pdf
--   csv-inbox/<jobId>/key.csv     (no rows; just the answer key)
--   csv-inbox/<jobId>/m1.csv
--   csv-inbox/<jobId>/m2.csv
--   csv-inbox/<jobId>/m3.csv
--   csv-inbox/<jobId>/m4.csv
--
-- Status values:
--   queued       — uploaded, waiting for runner to pick up
--   running      — at least one module in flight
--   partial      — some modules done, some failed; admin can retry
--   complete     — all CSVs imported into the bank
--   failed       — terminal failure (PDF unreadable, etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pdf_processing_jobs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_pdf          TEXT NOT NULL,            -- original upload filename
  pdf_storage_path    TEXT NOT NULL,            -- R2 key, e.g. "pdf-inbox/<id>/source.pdf"
  pdf_size_bytes      BIGINT,
  pdf_page_count      INTEGER,                  -- filled in once the runner reads the PDF
  uploaded_by_user_id TEXT NOT NULL,            -- Clerk userId; not FK'd because Clerk owns identity
  uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status              TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','partial','complete','failed')),
  -- Per-module status. Keys are 'key' (answer-key extraction) and
  -- 'm1' through 'm4' (the four SAT modules — R&W M1, R&W M2, Math M1, Math M2).
  -- Each value is one of: pending | in_progress | complete | failed.
  module_status       JSONB NOT NULL DEFAULT
    '{"key":"pending","m1":"pending","m2":"pending","m3":"pending","m4":"pending"}'::jsonb,
  -- R2 keys for emitted CSVs, keyed by module name once written.
  csv_storage_paths   JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Number of rows imported per module after csv-inbox watcher runs.
  imported_counts     JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message       TEXT,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ
);

-- Common admin queries: list recent jobs by status.
CREATE INDEX IF NOT EXISTS pdf_processing_jobs_status_uploaded_idx
  ON public.pdf_processing_jobs(status, uploaded_at DESC);

-- Lookup by uploader (admin "my uploads" view).
CREATE INDEX IF NOT EXISTS pdf_processing_jobs_uploader_idx
  ON public.pdf_processing_jobs(uploaded_by_user_id, uploaded_at DESC);

COMMENT ON TABLE public.pdf_processing_jobs IS
  'PDF-ingestion job queue. One row per uploaded SAT PDF. The hybrid runner (admin local machine) processes per-module; the folder-watch cron imports resulting CSVs into quiz_questions.';

-- ─── RLS ─────────────────────────────────────────────────────
-- Same pattern as every other admin-only table in this project:
-- enable RLS with a service-role-only policy. The upload API
-- route, /admin/jobs page, and local CLI runner all use the
-- service-role key (createAdminClient). Anon and authenticated
-- clients cannot see or modify rows.
ALTER TABLE public.pdf_processing_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON public.pdf_processing_jobs;
CREATE POLICY "Service role full access" ON public.pdf_processing_jobs
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
