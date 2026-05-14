-- ============================================================
-- 020_question_ingestion.sql
--
-- Extends `quiz_questions` to support the PDF-ingestion pipeline:
-- columns the routine writes (passages, taxonomy, source-PDF
-- metadata, import status flags), an idempotency index on
-- (source_pdf, content_hash), and a domain CHECK aligned with
-- the locked 8-domain SAT taxonomy.
--
-- Also relaxes `node_id` to NULL so PDF-imported questions can
-- live in the bank free-floating, tied only to `concept_slug`.
-- The admin Question Review UI assigns a node_id manually
-- before flipping a question to `import_status = 'ok'`.
--
-- Existing rows untouched: every new column is nullable or has
-- a default; the node_id NULL relaxation is additive (existing
-- NOT-NULL data is still valid).
-- ============================================================

-- ─── 1. New columns on quiz_questions ───────────────────────
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS passage_intro       TEXT,
  ADD COLUMN IF NOT EXISTS passage             TEXT,
  ADD COLUMN IF NOT EXISTS passage_a           TEXT,
  ADD COLUMN IF NOT EXISTS passage_b           TEXT,
  ADD COLUMN IF NOT EXISTS domain              TEXT,
  ADD COLUMN IF NOT EXISTS concept_slug        TEXT,
  ADD COLUMN IF NOT EXISTS answer_source       TEXT
    DEFAULT 'extracted'
    CHECK (answer_source IN ('extracted','inferred','hand_corrected')),
  ADD COLUMN IF NOT EXISTS source_pdf          TEXT,
  ADD COLUMN IF NOT EXISTS source_page         INTEGER,
  ADD COLUMN IF NOT EXISTS content_hash        TEXT,
  ADD COLUMN IF NOT EXISTS import_status       TEXT
    DEFAULT 'ok'
    CHECK (import_status IN ('ok','needs_review')),
  ADD COLUMN IF NOT EXISTS import_flag_type    TEXT
    CHECK (import_flag_type IN ('skip','partial_emit')),
  ADD COLUMN IF NOT EXISTS import_flag_reason  TEXT;

-- ─── 2. Relax node_id so PDF-imported questions can live
--       in the bank without a curriculum-node assignment.
--       Manual node assignment happens in the Review UI. ────
ALTER TABLE public.quiz_questions
  ALTER COLUMN node_id DROP NOT NULL;

-- ─── 3. Domain CHECK against the 8 SAT domains ─────────────
ALTER TABLE public.quiz_questions
  DROP CONSTRAINT IF EXISTS quiz_questions_domain_check;
ALTER TABLE public.quiz_questions
  ADD CONSTRAINT quiz_questions_domain_check
  CHECK (
    domain IS NULL OR domain IN (
      'algebra','advanced_math','geometry','data_analysis',
      'info_ideas','craft_structure','expression_ideas','conventions'
    )
  );

-- ─── 4. Idempotency: same content_hash within same source_pdf
--       cannot exist twice. Importer UPSERTs and silently
--       skips on conflict. ──────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS quiz_questions_pdf_hash_uniq
  ON public.quiz_questions (source_pdf, content_hash)
  WHERE source_pdf IS NOT NULL AND content_hash IS NOT NULL;

-- ─── 5. Indexes for the admin Review UI ────────────────────
CREATE INDEX IF NOT EXISTS quiz_questions_import_status_idx
  ON public.quiz_questions (import_status)
  WHERE import_status = 'needs_review';

CREATE INDEX IF NOT EXISTS quiz_questions_concept_slug_idx
  ON public.quiz_questions (concept_slug)
  WHERE concept_slug IS NOT NULL;

-- ─── 6. Index for the bank view (questions with no node) ──
--       Admin Review UI pulls these to assign node_id manually.
CREATE INDEX IF NOT EXISTS quiz_questions_bank_idx
  ON public.quiz_questions (concept_slug, created_at DESC)
  WHERE node_id IS NULL;
