-- Additive source identity for new, reviewed batches. Legacy rows remain
-- null and cannot be joined to a corrected answer key by position.
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS source_provider TEXT,
  ADD COLUMN IF NOT EXISTS source_identity_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS source_document_id TEXT,
  ADD COLUMN IF NOT EXISTS source_provider_version_id TEXT,
  ADD COLUMN IF NOT EXISTS source_version TEXT,
  ADD COLUMN IF NOT EXISTS source_section TEXT,
  ADD COLUMN IF NOT EXISTS source_module TEXT,
  ADD COLUMN IF NOT EXISTS source_question_number INT,
  ADD COLUMN IF NOT EXISTS source_occurrence INT,
  ADD COLUMN IF NOT EXISTS source_regions JSONB;

ALTER TABLE public.answer_key_entries
  ADD COLUMN IF NOT EXISTS source_version TEXT,
  ADD COLUMN IF NOT EXISTS source_occurrence INT;

-- Repeat/retry of the same identified question is idempotent, while a
-- corrected source version can coexist with the older version. Rows
-- with incomplete identity are excluded; import must keep them draft.
CREATE UNIQUE INDEX IF NOT EXISTS quiz_questions_source_identity_unique
  ON public.quiz_questions (
    source_version, source_section, source_module,
    source_question_number, source_occurrence
  )
  WHERE source_version IS NOT NULL AND source_section IS NOT NULL
    AND source_module IS NOT NULL AND source_question_number IS NOT NULL
    AND source_occurrence IS NOT NULL;

ALTER TABLE public.quiz_questions
  ADD CONSTRAINT quiz_questions_source_identity_complete
  CHECK (
    source_version IS NULL OR (
      source_version ~ '^[a-f0-9]{64}$'
      AND source_section IN ('reading', 'math')
      AND source_module IN ('M1', 'M2')
      AND source_question_number > 0
      AND source_occurrence > 0
    )
  ) NOT VALID;
