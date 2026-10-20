-- Migration B (question comparison key, step 2 of 2). NOT a migration yet.
--
-- This file is kept outside supabase/migrations on purpose: anything in that
-- folder is applied by `npm run db:push` and by db-deploy.yml when a branch
-- merges to main, and this must not run together with migration A.
--
-- To apply it: in a separate PR, after O5 (migration A plus the key backfill)
-- is verified, and only after the pre-O6 duplicate check in
-- scripts/import-tools/README.md returns no rows, copy this file to
-- supabase/migrations/<YYYYMMDDHHMMSS>_question_comparison_key_unique.sql.
--
-- Makes a live duplicate impossible: no two live questions may share a
-- comparison_key. If a live duplicate remains, it fails and changes nothing.
-- Rows without a key (image, graph and choice-table figures) are outside the rule.
CREATE UNIQUE INDEX IF NOT EXISTS quiz_questions_live_comparison_key_uniq
  ON public.quiz_questions (comparison_key)
  WHERE comparison_key IS NOT NULL
    AND archived_at IS NULL
    AND publish_status IN ('publish_ready', 'publish_ready_with_verified_repair');
