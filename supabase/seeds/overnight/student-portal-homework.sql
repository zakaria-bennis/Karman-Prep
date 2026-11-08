-- ============================================================
-- Student portal: homework test rows for the LOCAL database only.
-- Persona: dev_seed_student_pro (Liam Chen), assigned by
-- dev_seed_tutor_david. Dates are relative to today in Central
-- time, so the lists (Past due, Tonight, Tomorrow, This week,
-- Later, Done) stay filled whenever the seed runs.
-- Idempotent: fixed ids, deleted and inserted again.
-- ============================================================

DO $$
DECLARE
  liam uuid := (SELECT id FROM public.users WHERE clerk_id = 'dev_seed_student_pro');
  david uuid := (SELECT id FROM public.users WHERE clerk_id = 'dev_seed_tutor_david');
  d date := (now() AT TIME ZONE 'America/Chicago')::date;
BEGIN
  IF liam IS NULL OR david IS NULL THEN
    RAISE NOTICE 'student-portal-homework: personas missing, skipped';
    RETURN;
  END IF;

  DELETE FROM public.catalog_practice_responses
    WHERE session_id IN ('5d0e0000-0000-4000-8000-000000000001', '5d0e0000-0000-4000-8000-000000000002');
  DELETE FROM public.catalog_practice_sessions
    WHERE id IN ('5d0e0000-0000-4000-8000-000000000001', '5d0e0000-0000-4000-8000-000000000002');
  DELETE FROM public.time_trial_runs WHERE id = '5d0e0000-0000-4000-8000-0000000000a1';
  DELETE FROM public.student_assignments WHERE id IN (
    '5d0e0000-0000-4000-8000-000000000101', '5d0e0000-0000-4000-8000-000000000102',
    '5d0e0000-0000-4000-8000-000000000103');

  IF to_regclass('public.tutor_homework') IS NOT NULL THEN
    DELETE FROM public.tutor_homework WHERE id::text LIKE '5d0e0000-0000-4000-8000-0000000002%';
    INSERT INTO public.tutor_homework
      (id, student_user_id, assigned_by_user_id, kind, target_id, title, note, due_on, status, completed_at, created_at)
    VALUES
      ('5d0e0000-0000-4000-8000-000000000201', liam, david, 'skill_practice', 'rw-skill-command-of-evidence',
       'Practice: Command of Evidence', 'Read the claim first, then find the line that proves it.',
       d - 2, 'assigned', NULL, now() - interval '5 days'),
      ('5d0e0000-0000-4000-8000-000000000202', liam, david, 'skill_practice', 'rw-skill-transitions',
       'Practice: Transitions', NULL, d, 'assigned', NULL, now() - interval '2 days'),
      ('5d0e0000-0000-4000-8000-000000000203', liam, david, 'domain_quiz', 'algebra',
       'Domain quiz: Algebra', NULL, d + 1, 'assigned', NULL, now() - interval '2 days'),
      ('5d0e0000-0000-4000-8000-000000000204', liam, david, 'full_length_test', NULL,
       'Full-length practice test', NULL, d + 6, 'assigned', NULL, now() - interval '1 day'),
      ('5d0e0000-0000-4000-8000-000000000205', liam, david, 'skill_practice', 'ma-skill-nonlinear-functions',
       'Practice: Nonlinear functions', NULL, d + 10, 'assigned', NULL, now() - interval '1 day'),
      ('5d0e0000-0000-4000-8000-000000000206', liam, david, 'skill_practice', 'rw-skill-words-in-context',
       'Practice: Words in Context', NULL, d - 3, 'completed', now() - interval '3 days', now() - interval '6 days'),
      ('5d0e0000-0000-4000-8000-000000000207', liam, david, 'skill_practice', 'ma-skill-percentages',
       'Practice: Percentages', NULL, d - 4, 'completed', now() - interval '5 days', now() - interval '8 days'),
      ('5d0e0000-0000-4000-8000-000000000208', liam, david, 'full_length_test', NULL,
       'Full-length practice test', NULL, d - 6, 'completed', now() - interval '6 days', now() - interval '12 days');
  END IF;

  -- The two finished practice sets behind the done skill homework.
  INSERT INTO public.catalog_practice_sessions (id, student_id, skill_id, snapshots, score, started_at, completed_at)
  VALUES
    ('5d0e0000-0000-4000-8000-000000000001', 'dev_seed_student_pro', 'rw-skill-words-in-context',
     (SELECT jsonb_agg('{"seed": true}'::jsonb) FROM generate_series(1, 10)), 90,
     now() - interval '3 days 15 minutes', now() - interval '3 days'),
    ('5d0e0000-0000-4000-8000-000000000002', 'dev_seed_student_pro', 'ma-skill-percentages',
     (SELECT jsonb_agg('{"seed": true}'::jsonb) FROM generate_series(1, 10)), 60,
     now() - interval '5 days 18 minutes', now() - interval '5 days');

  INSERT INTO public.catalog_practice_responses
    (session_id, ordinal, question_id, student_answer, is_correct, response_time_seconds, answered_at)
  SELECT '5d0e0000-0000-4000-8000-000000000001', q.n - 1, q.id, 'A', q.n <> 4, 55 + q.n * 3,
         now() - interval '3 days 14 minutes' + (q.n * interval '70 seconds')
  FROM (SELECT id, row_number() OVER (ORDER BY id) AS n FROM public.quiz_questions LIMIT 10) q;

  INSERT INTO public.catalog_practice_responses
    (session_id, ordinal, question_id, student_answer, is_correct, response_time_seconds, answered_at)
  SELECT '5d0e0000-0000-4000-8000-000000000002', q.n - 1, q.id, 'B', q.n NOT IN (2, 5, 7, 9), 80 + q.n * 4,
         now() - interval '5 days 17 minutes' + (q.n * interval '95 seconds')
  FROM (SELECT id, row_number() OVER (ORDER BY id DESC) AS n FROM public.quiz_questions LIMIT 10) q;

  -- Oct 27 time trials: one open today, one scheduled, one finished with its run.
  INSERT INTO public.student_assignments
    (id, student_id, kind, section, title, scheduled_for, unlocked_at, unlocked_by, completed_at, created_by)
  VALUES
    ('5d0e0000-0000-4000-8000-000000000101', 'dev_seed_student_pro', 'time_trial', 'math',
     'Time trial: Math module', d, now() - interval '2 hours', 'dev_seed_tutor_david', NULL, 'dev_seed_tutor_david'),
    ('5d0e0000-0000-4000-8000-000000000102', 'dev_seed_student_pro', 'time_trial', 'reading',
     'Time trial: Reading and Writing module', d + 3, NULL, NULL, NULL, 'dev_seed_tutor_david'),
    ('5d0e0000-0000-4000-8000-000000000103', 'dev_seed_student_pro', 'time_trial', 'math',
     'Time trial: Math module', d - 4, now() - interval '4 days', 'dev_seed_tutor_david',
     now() - interval '4 days' + interval '35 minutes', 'dev_seed_tutor_david');

  INSERT INTO public.time_trial_runs
    (id, student_id, assignment_id, section, accommodation, target_seconds, goal_seconds, elapsed_seconds,
     questions, correct, finished, beat, reason, next_target_seconds, started_at, finished_at)
  VALUES
    ('5d0e0000-0000-4000-8000-0000000000a1', 'dev_seed_student_pro', '5d0e0000-0000-4000-8000-000000000103',
     'math', 'standard', 2100, 2100, 1950, 22, 20, true, true, 'beat', 2100,
     now() - interval '4 days', now() - interval '4 days' + interval '33 minutes');
END $$;
