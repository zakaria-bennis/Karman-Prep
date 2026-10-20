-- Question comparison key (step 2 of 2). Makes a live duplicate impossible:
-- no two live questions may share a comparison_key.
-- Apply ONLY after the sweep's un-publish has run and the kn-2 backfill has
-- filled the keys. If a live duplicate remains, this fails and changes nothing.
-- Rows without a key (image and graph figures) are outside the rule.
CREATE UNIQUE INDEX IF NOT EXISTS quiz_questions_live_comparison_key_uniq
  ON public.quiz_questions (comparison_key)
  WHERE comparison_key IS NOT NULL
    AND archived_at IS NULL
    AND publish_status IN ('publish_ready', 'publish_ready_with_verified_repair');
