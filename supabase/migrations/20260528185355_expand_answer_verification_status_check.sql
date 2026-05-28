-- ============================================================
-- expand_answer_verification_status_check — sync the CHECK
-- constraint on quiz_questions.answer_verification_status with
-- the values Phase 6's typed verifier panel actually writes.
--
-- Phase 2 (migration 20260526000000) introduced the constraint
-- with values: unverified, verified, verified_pro, verified_opus,
-- disputed, unverifiable, equivalent.
--
-- Phase 6's grader-roles.mjs added more granular statuses to
-- distinguish how a row reached its verdict:
--   · verified_panel          — Pass 1 panel agreed with stored answer
--   · verified_sympy          — SymPy equivalence path for numeric_entry
--   · panel_split             — Pass 1 voters disagreed with each other
--   · model_consensus_disagrees_with_key
--                             — Voters agreed but DISAGREED with key
--   · escalation_disagrees    — Pro/Opus escalation overruled the panel
--   · sympy_inconclusive      — SymPy couldn't prove equivalence
--   · unanswerable            — Voters reported the question is broken
--   · verifier_error          — All voters errored (transport / quota)
--
-- Tonight's smoke run #1 surfaced this: 90 of 94 rows in
-- 202406asiav2.pdf had successful Phase 6 verdicts but the UPDATE
-- to quiz_questions.answer_verification_status was rejected by the
-- CHECK constraint. Verifier log table writes succeeded (so we
-- have full audit history), but the mirror to quiz_questions
-- failed — which broke downstream Phase 7 eligibility decisions
-- that read answer_verification_status.
--
-- This migration extends the allowed list to cover every value
-- that grader-roles.mjs's VERIFIER_STATUSES.* exports. New values
-- can be added by appending to this constraint via future
-- migrations; nothing in the app code reads the constraint
-- definition at runtime, so app code drifting ahead of the
-- constraint is the typical failure mode (caught tonight).
-- ============================================================

DO $$
DECLARE
  cname text;
BEGIN
  -- Drop whatever's there (might have a different name across envs).
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.quiz_questions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%answer_verification_status%';

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.quiz_questions DROP CONSTRAINT %I', cname);
  END IF;

  ALTER TABLE public.quiz_questions
    ADD CONSTRAINT quiz_questions_answer_verification_status_check
    CHECK (answer_verification_status IS NULL OR answer_verification_status IN (
      -- ── Phase 2 carry-overs (legacy rows may still have these) ──
      'unverified',
      'verified',
      'disputed',
      'unverifiable',
      'equivalent',
      -- ── Phase 6 pass values (panel reached agreement with the key) ──
      'verified_panel',
      'verified_pro',
      'verified_opus',
      'verified_sympy',
      -- ── Phase 6 dispute / review values ──
      'panel_split',
      'model_consensus_disagrees_with_key',
      'escalation_disagrees',
      'sympy_inconclusive',
      'unanswerable',
      'verifier_error'
    ));
END $$;
