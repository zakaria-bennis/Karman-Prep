-- ============================================================
-- question_history — snapshot trail of every edit made to a
-- quiz_questions row via the Inspector (or any future editor).
--
-- Powers the "View history" + "Restore" UI in the Inspector
-- detail page. Without this, admin edits are destructive — there's
-- no undo if you accidentally rewrite an explanation_text or flip
-- the wrong correct_answer.
--
-- Storage strategy: full row snapshot in `before_state` JSONB plus
-- the same fields' new values in `after_state` JSONB. Storage is
-- cheap; readability is high (you can diff the two and see exactly
-- what changed).
--
-- Snapshots are taken IN the server action right before the update,
-- not via a Postgres trigger — keeps the change scope visible in
-- application code and avoids a hidden coupling.
-- ============================================================

CREATE TABLE IF NOT EXISTS question_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id   UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  /* Snapshot of the row + its answer_choices BEFORE the edit. Shape:
       { question_text, correct_answer, explanation_text, hint,
         passage*, image_alt, desmos_strategy, concept_slug,
         numeric_tolerance, explanation_per_choice,
         choices: [{letter, text, is_correct}], ... } */
  before_state  JSONB NOT NULL,
  /* Same shape, AFTER the edit. Lets us diff in the UI without
     re-fetching the post-edit row. */
  after_state   JSONB NOT NULL,
  /* Fields that changed (computed in app code from before/after).
     Used by the history-list UI to summarize each entry as
     "Edited: correct_answer, explanation_text". */
  changed_fields TEXT[] NOT NULL DEFAULT '{}',
  edited_by     TEXT NOT NULL,            -- Clerk user id
  edit_source   TEXT NOT NULL CHECK (edit_source IN ('inspector', 'bulk', 'api', 'apply-fix')),
  edit_note     TEXT,                     -- optional human-readable reason
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_history_question_created
  ON question_history (question_id, created_at DESC);

ALTER TABLE question_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON question_history;
CREATE POLICY "Service role full access" ON question_history
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE question_history IS
  $$Edit-trail snapshots for quiz_questions. Server actions snapshot the BEFORE state into this table before UPDATEing the row, so the Inspector can offer "Restore to previous version" without a destructive irreversibility risk.$$;
