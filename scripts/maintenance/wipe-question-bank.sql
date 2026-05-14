-- ============================================================
-- One-time wipe of the question bank, run after the slug ↔ node
-- unification (89 unified slugs/nodes — see RECONCILIATION.md).
--
-- WHY:
--   The previous 72-slug taxonomy is being replaced with 89 slugs
--   that are 1:1 with curriculum nodes. Existing rows in
--   quiz_questions reference old slug values like
--   'words-in-context' and 'pronoun-agreement' that no longer
--   exist in the new vocabulary, so we start fresh.
--
-- WHAT IT WIPES:
--   · quiz_questions          (the bank itself)
--   · answer_choices          (cascade FK from quiz_questions)
--   · flagged_questions       (cascade FK from quiz_questions)
--   · quiz_responses          (FK to quiz_questions; CASCADE on
--                              this TRUNCATE clears it)
--
-- WHAT IT KEEPS:
--   · quiz_attempts           (student attempt headers — the rows
--                              are now orphans of any responses,
--                              but the records themselves stay)
--   · everything else         (users, learn_node_status, billing)
--
-- HOW TO RUN:
--   Paste this whole file into the Supabase SQL editor (Production
--   project) and click Run. Single transaction; rolls back on error.
-- ============================================================

BEGIN;

-- One TRUNCATE call cascades the dependent FKs.
TRUNCATE TABLE quiz_questions CASCADE;

-- Sanity: confirm everything is empty.
SELECT 'quiz_questions'    AS table_name, COUNT(*) AS rowcount FROM quiz_questions
UNION ALL
SELECT 'answer_choices',     COUNT(*) FROM answer_choices
UNION ALL
SELECT 'flagged_questions',  COUNT(*) FROM flagged_questions
UNION ALL
SELECT 'quiz_responses',     COUNT(*) FROM quiz_responses;

COMMIT;
