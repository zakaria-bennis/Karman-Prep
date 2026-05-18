-- ============================================================
-- question_findings — persistent audit/grader finding storage
--
-- Powers the /admin/questions/inspect Inspector UI. The two audit
-- tools (scripts/question-audit/audit-csv.mjs and llm-grader.mjs)
-- produce JSON reports; an ingest script (scripts/question-audit/
-- ingest-findings.mjs) reads those reports and inserts one row
-- here per finding, linking back to the quiz_questions row by id.
--
-- Why a separate table (not columns on quiz_questions):
--   · Findings are many-to-one (a row can have N findings of
--     different severities)
--   · They're produced asynchronously after the question lands
--     in the bank, possibly re-run multiple times
--   · They include free-form text (message, value) that doesn't
--     belong on the question row itself
--
-- The Inspector UI joins quiz_questions ← question_findings and
-- displays them by severity + source + category.
-- ============================================================

CREATE TABLE IF NOT EXISTS question_findings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id   UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  source        TEXT NOT NULL CHECK (source IN ('auditor', 'grader')),
  severity      TEXT NOT NULL CHECK (severity IN ('BLOCKING', 'WARNING', 'NOTICE')),
  category      TEXT NOT NULL,        -- 'schema' | 'formatting' | 'cross_field' | 'quality' | 'duplicate' | 'ocr_pattern' | 'llm_grader' | 'figure' | 'explanation' | 'well_formed' | 'ocr_mismatch'
  code          TEXT NOT NULL,        -- e.g. 'A7_bad_difficulty', 'F5_no_terminal_punct', 'likely_wrong'
  message       TEXT NOT NULL,        -- one-sentence summary
  value         TEXT,                 -- the offending value snippet, if any
  detail        JSONB,                -- structured detail (e.g. grader's flash_reasoning, pro_answer, etc.)
  resolved_at   TIMESTAMPTZ,          -- set when admin acks the finding in the Inspector
  resolved_by   TEXT,                 -- Clerk user id
  resolved_note TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One finding per (question, source, code) — re-running the audit
  -- updates the existing row rather than piling up duplicates.
  CONSTRAINT question_findings_unique UNIQUE (question_id, source, code)
);

CREATE INDEX IF NOT EXISTS idx_question_findings_question ON question_findings (question_id);
CREATE INDEX IF NOT EXISTS idx_question_findings_severity ON question_findings (severity)
  WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_question_findings_unresolved ON question_findings (created_at DESC)
  WHERE resolved_at IS NULL;

ALTER TABLE question_findings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON question_findings;
CREATE POLICY "Service role full access" ON question_findings
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE question_findings IS
  $$Per-question audit findings produced by scripts/question-audit/{audit-csv,llm-grader}.mjs. Powers /admin/questions/inspect. One row per (question, source, code). Re-running the audit upserts.$$;
