-- ============================================================
-- Local seed for the parent and school portals (overnight, 2026-11-08).
-- LOCAL DATABASE ONLY. Safe to run again: it clears its own rows first.
--
-- * Lakeview High School: free until 2027-08-31, Thomas Wright
--   (dev_seed_teacher) is its admin and teaches Period 3 (join code
--   LKV3PQ, the four dev_seed_school_student_* personas) and Period 5
--   (join code LKV5RT, empty).
-- * One assignment for Period 3, due in three days.
-- * Skill practice (catalog practice sessions) for Maya Johnson and the
--   four school students, so the progress rings and skill squares show
--   real rows. Seeded sessions carry {"seed": true} in their snapshots.
-- * An open parent invite from Ava Patel (dev_seed_student_practice).
-- ============================================================

DO $$
DECLARE
  v_school  uuid := '5c400000-0000-4000-8000-000000000001';
  v_class3  uuid := '5c400000-0000-4000-8000-000000000003';
  v_class5  uuid := '5c400000-0000-4000-8000-000000000005';
  v_teacher uuid;
  v_ava     uuid;
  v_student record;
BEGIN
  SELECT id INTO v_teacher FROM public.users WHERE clerk_id = 'dev_seed_teacher';
  IF v_teacher IS NULL THEN
    RAISE NOTICE 'parent-school seed: dev_seed_teacher is missing, skipped';
    RETURN;
  END IF;

  DELETE FROM public.schools WHERE id = v_school;
  INSERT INTO public.schools (id, name, free_until, created_at)
  VALUES (v_school, 'Lakeview High School', '2027-08-31', '2026-09-01T14:00:00Z');

  INSERT INTO public.school_members (school_id, user_id, role)
  VALUES (v_school, v_teacher, 'admin');

  INSERT INTO public.school_classes (id, school_id, name, teacher_user_id, join_code, created_at)
  VALUES
    (v_class3, v_school, 'Period 3 SAT Prep', v_teacher, 'LKV3PQ', '2026-09-02T14:00:00Z'),
    (v_class5, v_school, 'Period 5 SAT Prep', v_teacher, 'LKV5RT', '2026-09-02T14:05:00Z');

  FOR v_student IN
    SELECT id FROM public.users WHERE clerk_id LIKE 'dev_seed_school_student_%' ORDER BY clerk_id
  LOOP
    INSERT INTO public.school_seats (school_id, class_id, student_user_id, joined_at)
    VALUES (v_school, v_class3, v_student.id, '2026-09-08T15:00:00Z');
  END LOOP;

  INSERT INTO public.school_assignments
    (school_id, class_id, assigned_by_user_id, kind, target_id, title, due_on)
  VALUES
    (v_school, v_class3, v_teacher, 'skill_practice', 'ma-skill-linear-equations-in-one-variable',
     'Practice: Linear equations in one variable', (current_date + 3));

  SELECT id INTO v_ava FROM public.users WHERE clerk_id = 'dev_seed_student_practice';
  IF v_ava IS NOT NULL THEN
    DELETE FROM public.parent_invites WHERE student_user_id = v_ava;
    INSERT INTO public.parent_invites (student_user_id, token)
    VALUES (v_ava, 'seed-invite-ava-patel-0000000001');
  END IF;
END $$;

-- Skill practice rows: one session per (student, skill, answers), T = right, F = wrong.
CREATE OR REPLACE FUNCTION pg_temp.seed_practice(
  p_student text, p_skill text, p_answers text, p_days_ago int
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_session uuid := gen_random_uuid();
  v_start   timestamptz := date_trunc('hour', now()) - make_interval(days => p_days_ago) - interval '3 hours';
  v_ids     uuid[];
  v_n       int := length(p_answers);
  v_right   int := length(replace(p_answers, 'F', ''));
BEGIN
  SELECT array_agg(id) INTO v_ids FROM (
    SELECT id FROM public.quiz_questions ORDER BY md5(id::text || p_skill || p_student) LIMIT v_n
  ) q;
  IF v_ids IS NULL OR array_length(v_ids, 1) < v_n THEN RETURN; END IF;
  INSERT INTO public.catalog_practice_sessions
    (id, student_id, skill_id, snapshots, score, started_at, completed_at)
  VALUES (
    v_session, p_student, p_skill,
    (SELECT jsonb_agg(jsonb_build_object('seed', true)) FROM generate_series(1, v_n)),
    round(100.0 * v_right / v_n), v_start, v_start + make_interval(mins => v_n * 2)
  );
  FOR i IN 1..v_n LOOP
    INSERT INTO public.catalog_practice_responses
      (session_id, ordinal, question_id, student_answer, is_correct, response_time_seconds, answered_at)
    VALUES (
      v_session, i - 1, v_ids[i], 'A', substr(p_answers, i, 1) = 'T', 75 + (i * 7) % 50,
      v_start + make_interval(secs => i * 110)
    );
  END LOOP;
END $$;

DELETE FROM public.catalog_practice_sessions
WHERE snapshots -> 0 ->> 'seed' = 'true'
  AND student_id IN ('dev_seed_student_private', 'dev_seed_school_student_1',
    'dev_seed_school_student_2', 'dev_seed_school_student_3', 'dev_seed_school_student_4');

-- Maya Johnson (Private 10): a spread of levels across both courses.
SELECT pg_temp.seed_practice('dev_seed_student_private', 'ma-skill-linear-equations-in-one-variable', 'TTTTTTFTTT', 1);
SELECT pg_temp.seed_practice('dev_seed_student_private', 'ma-skill-linear-functions', 'TFTTTTFTTF', 2);
SELECT pg_temp.seed_practice('dev_seed_student_private', 'ma-skill-systems-of-two-linear-equations-in-two-variables', 'FTTTFTFTTF', 3);
SELECT pg_temp.seed_practice('dev_seed_student_private', 'ma-skill-nonlinear-functions', 'TFTFFTTFTF', 4);
SELECT pg_temp.seed_practice('dev_seed_student_private', 'ma-skill-ratios-rates-proportional-relationships-and-units', 'TTTTFTTTTF', 5);
SELECT pg_temp.seed_practice('dev_seed_student_private', 'ma-skill-percentages', 'TTTTTFTTTT', 6);
SELECT pg_temp.seed_practice('dev_seed_student_private', 'rw-skill-words-in-context', 'TTTTTTTTFT', 1);
SELECT pg_temp.seed_practice('dev_seed_student_private', 'rw-skill-central-ideas-and-details', 'TTFTTTTFTT', 3);
SELECT pg_temp.seed_practice('dev_seed_student_private', 'rw-skill-transitions', 'TFTTTFTFTT', 5);
SELECT pg_temp.seed_practice('dev_seed_student_private', 'rw-skill-sentence-boundaries-and-joining-independent-clauses', 'FTFTTFTFFT', 8);
SELECT pg_temp.seed_practice('dev_seed_student_private', 'rw-skill-subject-verb-agreement', 'TTTFTTTTTT', 9);

-- Lakeview Period 3.
SELECT pg_temp.seed_practice('dev_seed_school_student_1', 'ma-skill-linear-equations-in-one-variable', 'TTTTTFTTTT', 1);
SELECT pg_temp.seed_practice('dev_seed_school_student_1', 'ma-skill-percentages', 'TTTTFTTTFT', 2);
SELECT pg_temp.seed_practice('dev_seed_school_student_1', 'rw-skill-words-in-context', 'TTTFTTTTFT', 3);
SELECT pg_temp.seed_practice('dev_seed_school_student_1', 'rw-skill-transitions', 'TTTTTTTFTT', 4);
SELECT pg_temp.seed_practice('dev_seed_school_student_2', 'ma-skill-linear-functions', 'TFTTFTTFTF', 2);
SELECT pg_temp.seed_practice('dev_seed_school_student_2', 'rw-skill-central-ideas-and-details', 'TTTFTFTTTF', 5);
SELECT pg_temp.seed_practice('dev_seed_school_student_3', 'ma-skill-linear-equations-in-one-variable', 'TTTTFTTTTT', 1);
SELECT pg_temp.seed_practice('dev_seed_school_student_3', 'ma-skill-nonlinear-functions', 'TTTFTTTTFT', 2);
SELECT pg_temp.seed_practice('dev_seed_school_student_3', 'ma-skill-ratios-rates-proportional-relationships-and-units', 'TFTTTTTFTT', 3);
SELECT pg_temp.seed_practice('dev_seed_school_student_3', 'rw-skill-sentence-boundaries-and-joining-independent-clauses', 'TTFTTTTTTF', 6);
SELECT pg_temp.seed_practice('dev_seed_school_student_3', 'rw-skill-words-in-context', 'TTTTTTFTTT', 7);
SELECT pg_temp.seed_practice('dev_seed_school_student_4', 'rw-skill-transitions', 'FTFTFFTTFT', 10);
