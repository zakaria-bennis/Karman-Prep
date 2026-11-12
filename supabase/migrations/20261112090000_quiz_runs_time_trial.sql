-- Time trials (overnight 2026-11-12): a time trial is one timed section on the shared quiz run
-- machinery, so quiz_runs.kind gains 'time-trial'. Widening only: every existing row still
-- passes, and no column or table changes. Idempotent.
ALTER TABLE public.quiz_runs DROP CONSTRAINT IF EXISTS quiz_runs_kind_check;
ALTER TABLE public.quiz_runs ADD CONSTRAINT quiz_runs_kind_check
  CHECK (kind IN ('daily-ten', 'practice-set', 'domain-quiz', 'full-test', 'diagnostic', 'time-trial'));
