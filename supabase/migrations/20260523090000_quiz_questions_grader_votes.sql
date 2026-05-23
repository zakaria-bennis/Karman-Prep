-- ============================================================
-- Add grader_votes JSONB to quiz_questions.
--
-- The multi-vote grader (scripts/question-audit/multi-vote-grader.mjs)
-- runs 3 cheap voters (Gemini Flash + DeepSeek V3 + Llama 3.3) on
-- each question, then escalates disagreements to Gemini Pro and,
-- finally, Claude Opus. Until now those verdicts only landed in
-- audit-out/*.json on the GitHub Actions runner — gone after the
-- workflow ended.
--
-- This column persists them per question so /admin/questions/review
-- can show a small badge cluster ("Flash:B  DeepSeek:B  Llama:C →
-- verified-pro") next to each row without having to drill in.
--
-- Shape:
--   {
--     "graded_at": "2026-05-23T12:34:56Z",
--     "stored_answer": "B",
--     "verdict": "verified" | "verified_pro" | "verified_opus" |
--                "likely_wrong" | "pass1_split" | "pass1_disagree" |
--                "pass2_disagree" | "uncertain_parse" | "error",
--     "pass1": { "flash": "B", "deepseek": "B", "llama": "C" },
--     "pass2_pro": "B" | null,
--     "pass3_opus": "B" | null
--   }
-- ============================================================

ALTER TABLE quiz_questions
ADD COLUMN IF NOT EXISTS grader_votes JSONB;

COMMENT ON COLUMN quiz_questions.grader_votes IS
  'Latest multi-vote grader verdict + per-LLM answers. Written by '
  'scripts/question-audit/multi-vote-grader.mjs. Shape documented '
  'in migration 20260523090000.';
