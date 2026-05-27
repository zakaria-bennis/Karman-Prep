-- ============================================================
-- Pipeline v2 — Phase 6: Answer Verification & Arbitration
--
-- Spec: docs/ingestion/pipeline-v2-redesign-plan.md (Phase 6
-- section, replaced after user review).
--
-- Adds the columns Phase 6's verify-answers.mjs writes when it
-- reaches a verdict, plus a view aggregating the latest verifier
-- output per question for publish-gate consumption.
--
-- DESIGN NOTES
--   · suggested_verified_answer   — what the model panel thinks
--     the correct answer is when it DISAGREES with the stored
--     selected_official_answer. Phase 6 never auto-flips: this is
--     a hint for human review.
--   · dispute_category            — typed routing taxonomy. App-
--     enforced (no DB CHECK so we can add categories without a
--     migration). Values mirror grader-roles.mjs.
--   · answer_verified_at          — opt-in marker, same pattern
--     as Phase 3's source_assets_processed_at and Phase 5's
--     math_notation_checked_at. NULL → Phase 6 gates short-circuit.
--   · answer_verifier_version     — which version of the
--     verifier ran (e.g. 'phase6_answer_verification_v1'). Lets
--     us re-run on rows last touched by an older verifier.
--
-- All changes are ADDITIVE. We do NOT drop or rename any existing
-- columns; in particular answer_verification_status (Phase 2)
-- stays — Phase 6 just expands the values it can take.
-- ============================================================

-- ── quiz_questions: 4 new columns ──────────────────────────────
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS suggested_verified_answer TEXT,
  ADD COLUMN IF NOT EXISTS dispute_category TEXT,
  ADD COLUMN IF NOT EXISTS answer_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS answer_verifier_version TEXT;

CREATE INDEX IF NOT EXISTS quiz_questions_answer_verified_at_idx
  ON public.quiz_questions(answer_verified_at)
  WHERE answer_verified_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS quiz_questions_dispute_category_idx
  ON public.quiz_questions(dispute_category)
  WHERE dispute_category IS NOT NULL;

COMMENT ON COLUMN public.quiz_questions.suggested_verified_answer IS
  'When the Phase 6 verifier panel UNANIMOUSLY disagrees with the '
  'stored selected_official_answer, this column holds the panel''s '
  'proposed answer. Phase 6 never auto-flips selected_official_answer '
  '— a human reviews and decides whether to apply the suggestion. '
  'NULL means no dispute (or Phase 6 has not yet run on this row).';

COMMENT ON COLUMN public.quiz_questions.dispute_category IS
  'App-enforced (no DB CHECK in phase 6). One of: '
  'answer_key_dispute, visual_dispute, math_notation_dispute, '
  'math_equivalence_dispute, rw_reasoning_dispute, '
  'unanswerable_question, extraction_error, none. '
  'Set to ''none'' when the panel agreed with the stored answer.';

COMMENT ON COLUMN public.quiz_questions.answer_verified_at IS
  'Opt-in marker for Phase 6 publish-gate rules. NULL means Phase 6 '
  'verify-answers.mjs has never reached a verdict for this row; '
  'the new verifier gates short-circuit. Same pattern as Phase 3''s '
  'source_assets_processed_at and Phase 5''s math_notation_checked_at.';

COMMENT ON COLUMN public.quiz_questions.answer_verifier_version IS
  'Which verifier produced the latest verdict. '
  'e.g. ''phase6_answer_verification_v1''. Used to schedule re-runs '
  'after the verifier logic changes without touching rows already '
  'covered by the current version.';

-- ── grader_runs: no schema change ──────────────────────────────
--
-- The existing grader_runs columns already cover Phase 6's typed
-- role names (the grader_role column is TEXT and app-enforced).
-- Phase 6 adds new role strings — deepseek_primary_solver,
-- groq_independent_solver, gemini_flash_visual_checker,
-- gemini_pro_visual_escalation, claude_opus_reasoning_arbiter,
-- sympy_equivalence_checker — but no DB-level change is required.
-- Failed voters (where the API call errored) will be written with
-- selected_answer=NULL and the error in raw_response_json.

-- ── Phase 6 signals view ──────────────────────────────────────
-- Per-question aggregate that publish-gate.mjs can read to hydrate
-- the Phase 6 gates. Mirrors the Phase 3 + Phase 5 signal-view pattern.
--
-- Surfaces:
--   · the Phase 6 columns on the question itself
--   · counts of failed voters in the most-recent run (for the
--     publish-gate to detect "verifier crashed → human review")
--   · whether the latest run produced a model_consensus_disagrees_with_key
CREATE OR REPLACE VIEW public.quiz_questions_phase6_signals AS
SELECT
  q.id                              AS question_id,
  q.answer_verified_at,
  q.answer_verifier_version,
  q.answer_verification_status,
  q.dispute_category,
  q.suggested_verified_answer,
  q.selected_official_answer,
  -- Failed-voter count in the latest run_group. A high count
  -- (e.g. 2+ out of 3) means we couldn't get clean votes and the
  -- publish-gate should route to human review even if the
  -- surviving voter happened to agree with the stored answer.
  COALESCE(latest.failed_voter_count, 0)  AS failed_voter_count,
  COALESCE(latest.run_group_id, NULL)     AS latest_run_group_id
FROM public.quiz_questions q
LEFT JOIN LATERAL (
  -- Pick the most-recent run_group_id for this question, then count
  -- how many voters in THAT group came back with no selected_answer.
  SELECT
    gr.run_group_id,
    COUNT(*) FILTER (WHERE gr.selected_answer IS NULL) AS failed_voter_count
  FROM public.grader_runs gr
  WHERE gr.question_id = q.id
    AND gr.run_group_id = (
      SELECT run_group_id
      FROM public.grader_runs
      WHERE question_id = q.id
      ORDER BY created_at DESC
      LIMIT 1
    )
  GROUP BY gr.run_group_id
) latest ON TRUE;

COMMENT ON VIEW public.quiz_questions_phase6_signals IS
  'Read-only aggregate for publish-gate.mjs. Surfaces the per-row '
  'verifier outcome + latest-run failed-voter count without an N+1 join.';
