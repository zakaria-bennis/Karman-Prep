-- ============================================================
-- Admin flags for the question import team (2026-11-08)
--
-- The admin question-bank pages are read-only views. When an
-- admin spots a problem they flag the question here, and the
-- import team picks it up in their own pipeline. This table is
-- separate from the question bank on purpose: flagging never
-- writes to quiz_questions or any other bank table, and there is
-- no foreign key, so the bank's tables are not altered either.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.question_import_flags (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  -- quiz_questions.id (no foreign key, see above).
  question_id   UUID         NOT NULL,
  reason        TEXT         NOT NULL CHECK (reason IN (
                               'wrong_answer', 'typo', 'figure', 'explanation',
                               'duplicate', 'skill_tag', 'difficulty', 'other'
                             )),
  note          TEXT         CHECK (note IS NULL OR char_length(note) <= 2000),
  flagged_by    UUID         REFERENCES public.users(id) ON DELETE SET NULL,
  status        TEXT         NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT question_import_flags_resolved_stamped CHECK (
    status <> 'resolved' OR resolved_at IS NOT NULL
  )
);

-- One open flag per question and reason, so a double click can't duplicate it.
CREATE UNIQUE INDEX IF NOT EXISTS question_import_flags_one_open
  ON public.question_import_flags (question_id, reason)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS question_import_flags_status_idx
  ON public.question_import_flags (status, created_at DESC);

-- Service role only (admin pages and the import team's scripts).
ALTER TABLE public.question_import_flags ENABLE ROW LEVEL SECURITY;
