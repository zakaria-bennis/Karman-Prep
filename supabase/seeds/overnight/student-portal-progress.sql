-- ============================================================
-- Student portal, Progress tab: test data for Liam Chen
-- (dev_seed_student_pro). LOCAL DATABASE ONLY. Safe to run again:
-- every row has a fixed id and is skipped if it already exists.
-- Times are relative to now(), so "this week" stays this week.
--
-- What it gives the Progress tab:
--   - a third diagnostic (about 70 days ago), so the score line has 3 points
--   - catalog practice sets over the last five weeks, so skills have levels,
--     the weekly time rings fill, and "What moved this week" shows:
--       Transitions        Learning -> Conquered (up)
--       Linear equations   Learning -> Understanding (up)
--       Command of Evidence started this week (up)
--       Circles            Understanding -> Learning (down: a month idle)
--       Nonlinear functions Learning -> New (down: a month idle)
--   - a point award for every right answer (tokens and the mystery box)
--   - one beaten Math time trial (6:12)
-- Practice snapshots are {"seed": true}, like the other local seeds, so a
-- seeded set's review screen can't reopen its questions.
-- ============================================================

DO $$
DECLARE
  liam_clerk text := 'dev_seed_student_pro';
  liam_id uuid;
  qids uuid[];
  rec record;
  sid uuid;
  started timestamptz;
  i int;
  ch text;
  secs int;
  right_count int;
BEGIN
  SELECT id INTO liam_id FROM public.users WHERE clerk_id = liam_clerk;
  IF liam_id IS NULL THEN
    RAISE NOTICE 'student-portal-progress seed: % not found, skipped', liam_clerk;
    RETURN;
  END IF;
  SELECT array_agg(id) INTO qids FROM (SELECT id FROM public.quiz_questions ORDER BY id LIMIT 10) q;
  IF qids IS NULL OR array_length(qids, 1) < 10 THEN
    RAISE NOTICE 'student-portal-progress seed: fewer than 10 questions, skipped';
    RETURN;
  END IF;

  -- An earlier diagnostic, so the history line has three points.
  INSERT INTO public.diagnostic_results (id, user_id, taken_at, score_range_low, score_range_high, domain_scores)
  VALUES (md5('kp-progress-diag-1')::uuid, liam_id, now() - interval '70 days', 1118, 1198, '{}'::jsonb)
  ON CONFLICT (id) DO NOTHING;

  FOR rec IN
    SELECT * FROM (VALUES
      ('ma-skill-linear-equations-in-one-variable', 20.0, '0111'),
      ('ma-skill-linear-equations-in-one-variable', 3.0, '1111'),
      ('rw-skill-transitions', 12.0, '0111'),
      ('rw-skill-transitions', 2.0, '1111111110'),
      ('ma-skill-circles', 30.5, '01111111'),
      ('ma-skill-percentages', 15.0, '1110110'),
      ('rw-skill-words-in-context', 9.0, '1101111011'),
      ('rw-skill-command-of-evidence', 1.0, '10'),
      ('ma-skill-linear-functions', 26.0, '1011101111'),
      ('ma-skill-nonlinear-functions', 33.0, '0110111'),
      ('rw-skill-central-ideas-and-details', 18.0, '1111111')
    ) AS t(skill, days_ago, pattern)
  LOOP
    sid := md5('kp-progress-' || rec.skill || '-' || rec.days_ago::text)::uuid;
    started := now() - make_interval(secs => (rec.days_ago * 86400)::double precision);
    right_count := length(replace(rec.pattern, '0', ''));

    INSERT INTO public.catalog_practice_sessions (id, student_id, skill_id, snapshots, score, started_at, completed_at)
    VALUES (
      sid,
      liam_clerk,
      rec.skill,
      (SELECT jsonb_agg('{"seed": true}'::jsonb) FROM generate_series(1, length(rec.pattern))),
      round(100.0 * right_count / length(rec.pattern))::int,
      started,
      started + length(rec.pattern) * interval '75 seconds'
    )
    ON CONFLICT (id) DO NOTHING;

    FOR i IN 1..length(rec.pattern) LOOP
      ch := substr(rec.pattern, i, 1);
      secs := 40 + ((i * 37 + length(rec.skill)) % 70);
      IF i = 5 THEN
        secs := 600; -- a long pause: Progress counts it as 2 minutes
      END IF;
      INSERT INTO public.catalog_practice_responses
        (id, session_id, ordinal, question_id, student_answer, is_correct, response_time_seconds, answered_at)
      VALUES (
        md5('kp-progress-r-' || sid::text || '-' || i::text)::uuid,
        sid,
        i - 1,
        qids[i],
        CASE WHEN ch = '1' THEN 'A' ELSE 'B' END,
        ch = '1',
        secs,
        started + i * interval '75 seconds'
      )
      ON CONFLICT DO NOTHING;
      IF ch = '1' THEN
        INSERT INTO public.student_point_awards (award_key, student_id, skill_id, points, created_at)
        VALUES (
          'catalog:' || sid::text || ':' || qids[i]::text,
          liam_clerk,
          rec.skill,
          CASE WHEN i % 4 = 0 THEN 15 ELSE 10 END,
          started + i * interval '75 seconds'
        )
        ON CONFLICT (award_key) DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;

  -- One beaten Math time trial, 6:12.
  INSERT INTO public.time_trial_runs
    (id, student_id, section, target_seconds, goal_seconds, elapsed_seconds, questions, correct,
     finished, beat, reason, next_target_seconds, started_at, finished_at)
  VALUES (
    md5('kp-progress-trial-1')::uuid, liam_clerk, 'math', 400, 350, 372, 10, 9,
    true, true, 'beat', 380, now() - interval '6 days', now() - interval '6 days' + interval '372 seconds'
  )
  ON CONFLICT (id) DO NOTHING;
END $$;
