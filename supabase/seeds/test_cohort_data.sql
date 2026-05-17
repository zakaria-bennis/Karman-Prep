-- ============================================================
-- TEST DATA — 10 fake students + 2 fake tutors + 2 cohorts
--
-- Populate the DB with just enough data to exercise:
--   · /admin/cohorts list (2 cohorts pre-seeded, 1 full seminar,
--     1 small-group with 3/5 seats — capacity for upgrade test)
--   · Tutor dropdown in the Create-cohort dialog (2 tutors)
--   · Student dropdown (when we add the member-add UI later)
--   · Private 1:1 tutor_assignments (2 students)
--   · Diagnostic result display on future tutor dashboards
--
-- All rows are marked with `test_` clerk_id prefixes. Re-running
-- this script is idempotent: the DELETE block at the top wipes
-- only the test rows, then fresh inserts follow.
--
-- To permanently remove all test data:
--   Just run the DELETE block (lines 25–42) and skip the rest.
--
-- Paste the whole file into the Supabase SQL Editor → Run.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 0. Wipe any previous test data (safe — only touches test_%)
-- ─────────────────────────────────────────────────────────────
DELETE FROM public.cohort_members
  WHERE user_id IN (SELECT id FROM public.users WHERE clerk_id LIKE 'test_%');

DELETE FROM public.tutor_assignments
  WHERE student_user_id IN (SELECT id FROM public.users WHERE clerk_id LIKE 'test_%')
     OR tutor_user_id  IN (SELECT id FROM public.users WHERE clerk_id LIKE 'test_%');

DELETE FROM public.diagnostic_results
  WHERE user_id IN (SELECT id FROM public.users WHERE clerk_id LIKE 'test_%');

DELETE FROM public.cohort_waitlist
  WHERE user_id IN (SELECT id FROM public.users WHERE clerk_id LIKE 'test_%');

DELETE FROM public.cohorts
  WHERE tutor_user_id IN (SELECT id FROM public.users WHERE clerk_id LIKE 'test_%');

DELETE FROM public.subscriptions
  WHERE user_id LIKE 'test_%';

DELETE FROM public.users
  WHERE clerk_id LIKE 'test_%';


-- ─────────────────────────────────────────────────────────────
-- 1. Tutors (2)
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.users (clerk_id, email, role, first_name, last_name, avatar_url) VALUES
  ('test_tutor_zakaria', 'zakaria.test@karman.local', 'tutor', 'Zakaria', 'Bennis',       NULL),
  ('test_tutor_nabil',   'nabil.test@karman.local',   'tutor', 'Nabil',   'Kafil Asrar',  NULL);


-- ─────────────────────────────────────────────────────────────
-- 2. Students (10)
--    Distribution for realistic testing:
--      · 5 enrolled in the seminar cohort (group tier)
--      · 3 enrolled in the small group cohort (+ 2 empty seats)
--      · 2 private-tier (no cohort; separate tutor_assignment)
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.users (clerk_id, email, role, first_name, last_name, sat_test_date, avatar_url) VALUES
  -- Seminar cohort (group tier) — May 2, 2026
  ('test_student_01', 'elijah.turner.test@karman.local',    'student', 'Elijah',    'Turner',    '2026-05-02', NULL),
  ('test_student_02', 'sofia.park.test@karman.local',       'student', 'Sofia',     'Park',      '2026-05-02', NULL),
  ('test_student_03', 'amara.johnson.test@karman.local',    'student', 'Amara',     'Johnson',   '2026-05-02', NULL),
  ('test_student_04', 'isabella.rodriguez.test@karman.local','student','Isabella',  'Rodriguez', '2026-05-02', NULL),
  ('test_student_05', 'darius.williams.test@karman.local',  'student', 'Darius',    'Williams',  '2026-05-02', NULL),
  -- Small group cohort — May 2, 2026
  ('test_student_06', 'maya.hernandez.test@karman.local',   'student', 'Maya',      'Hernandez', '2026-05-02', NULL),
  ('test_student_07', 'jordan.mbeki.test@karman.local',     'student', 'Jordan',    'Mbeki',     '2026-05-02', NULL),
  ('test_student_08', 'noah.goldberg.test@karman.local',    'student', 'Noah',      'Goldberg',  '2026-05-02', NULL),
  -- Private tier (no cohort) — June 6, 2026
  ('test_student_09', 'priya.krishnan.test@karman.local',   'student', 'Priya',     'Krishnan',  '2026-06-06', NULL),
  ('test_student_10', 'lucas.chen.test@karman.local',       'student', 'Lucas',     'Chen',      '2026-06-06', NULL);


-- ─────────────────────────────────────────────────────────────
-- 3. Subscriptions — tier determines which cohort a student
--    can be placed in (or no cohort, for private/elite).
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.subscriptions (user_id, stripe_customer_id, stripe_subscription_id, tier, status) VALUES
  -- Seminar enrollees (group tier)
  ('test_student_01', 'fake_cus_01', 'fake_sub_01', 'group',       'active'),
  ('test_student_02', 'fake_cus_02', 'fake_sub_02', 'group',       'active'),
  ('test_student_03', 'fake_cus_03', 'fake_sub_03', 'group',       'active'),
  ('test_student_04', 'fake_cus_04', 'fake_sub_04', 'group',       'active'),
  ('test_student_05', 'fake_cus_05', 'fake_sub_05', 'group',       'active'),
  -- Small group enrollees
  ('test_student_06', 'fake_cus_06', 'fake_sub_06', 'small_group', 'active'),
  ('test_student_07', 'fake_cus_07', 'fake_sub_07', 'small_group', 'active'),
  ('test_student_08', 'fake_cus_08', 'fake_sub_08', 'small_group', 'active'),
  -- Private-tier students
  ('test_student_09', 'fake_cus_09', 'fake_sub_09', 'private',     'active'),
  ('test_student_10', 'fake_cus_10', 'fake_sub_10', 'elite',       'trialing');


-- ─────────────────────────────────────────────────────────────
-- 4. Cohorts (2)  — SAT date 2026-05-02 must exist in sat_dates
--    (seeded via the earlier College Board seed).
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.cohorts (name, tier, sat_date, tutor_user_id, max_size, current_topic, status) VALUES
  (
    'Seminar · May 2, 2026 · Zakaria',
    'group',
    '2026-05-02',
    (SELECT id FROM public.users WHERE clerk_id = 'test_tutor_zakaria'),
    200,
    'Linear Functions — week 3',
    'active'
  ),
  (
    'Small Group · May 2, 2026 · Nabil',
    'small_group',
    '2026-05-02',
    (SELECT id FROM public.users WHERE clerk_id = 'test_tutor_nabil'),
    5,
    'Advanced Math — Polynomials',
    'active'
  );


-- ─────────────────────────────────────────────────────────────
-- 5. Cohort members  — 5 in the seminar, 3 in the small group
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.cohort_members (cohort_id, user_id, joined_at) VALUES
  -- Seminar (5 / 200)
  ((SELECT id FROM public.cohorts WHERE name = 'Seminar · May 2, 2026 · Zakaria'),
   (SELECT id FROM public.users    WHERE clerk_id = 'test_student_01'), NOW() - INTERVAL '21 days'),
  ((SELECT id FROM public.cohorts WHERE name = 'Seminar · May 2, 2026 · Zakaria'),
   (SELECT id FROM public.users    WHERE clerk_id = 'test_student_02'), NOW() - INTERVAL '20 days'),
  ((SELECT id FROM public.cohorts WHERE name = 'Seminar · May 2, 2026 · Zakaria'),
   (SELECT id FROM public.users    WHERE clerk_id = 'test_student_03'), NOW() - INTERVAL '18 days'),
  ((SELECT id FROM public.cohorts WHERE name = 'Seminar · May 2, 2026 · Zakaria'),
   (SELECT id FROM public.users    WHERE clerk_id = 'test_student_04'), NOW() - INTERVAL '15 days'),
  ((SELECT id FROM public.cohorts WHERE name = 'Seminar · May 2, 2026 · Zakaria'),
   (SELECT id FROM public.users    WHERE clerk_id = 'test_student_05'), NOW() - INTERVAL '12 days'),
  -- Small group (3 / 5) — 2 empty seats so you can test the
  -- upgrade-fills-a-seat path, OR fill it to test the waitlist path
  ((SELECT id FROM public.cohorts WHERE name = 'Small Group · May 2, 2026 · Nabil'),
   (SELECT id FROM public.users    WHERE clerk_id = 'test_student_06'), NOW() - INTERVAL '10 days'),
  ((SELECT id FROM public.cohorts WHERE name = 'Small Group · May 2, 2026 · Nabil'),
   (SELECT id FROM public.users    WHERE clerk_id = 'test_student_07'), NOW() - INTERVAL '9 days'),
  ((SELECT id FROM public.cohorts WHERE name = 'Small Group · May 2, 2026 · Nabil'),
   (SELECT id FROM public.users    WHERE clerk_id = 'test_student_08'), NOW() - INTERVAL '7 days');


-- ─────────────────────────────────────────────────────────────
-- 6. Private-tier tutor assignments (no cohort for these)
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.tutor_assignments (tutor_user_id, student_user_id, started_at) VALUES
  ((SELECT id FROM public.users WHERE clerk_id = 'test_tutor_zakaria'),
   (SELECT id FROM public.users WHERE clerk_id = 'test_student_09'),
   NOW() - INTERVAL '30 days'),
  ((SELECT id FROM public.users WHERE clerk_id = 'test_tutor_nabil'),
   (SELECT id FROM public.users WHERE clerk_id = 'test_student_10'),
   NOW() - INTERVAL '25 days');


-- ─────────────────────────────────────────────────────────────
-- 7. Diagnostic results — one per student, for future tutor
--    dashboard visuals and the student's own history page.
--    Domain scores are 0–100 accuracy percentages per domain.
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.diagnostic_results (user_id, taken_at, score_range_low, score_range_high, domain_scores) VALUES
  ((SELECT id FROM public.users WHERE clerk_id = 'test_student_01'), NOW() - INTERVAL '20 days',  980, 1080, '{"algebra":65,"advanced_math":50,"geometry":70,"data_analysis":60,"reading_writing":75}'::jsonb),
  ((SELECT id FROM public.users WHERE clerk_id = 'test_student_02'), NOW() - INTERVAL '19 days',  940, 1040, '{"algebra":55,"advanced_math":45,"geometry":60,"data_analysis":50,"reading_writing":70}'::jsonb),
  ((SELECT id FROM public.users WHERE clerk_id = 'test_student_03'), NOW() - INTERVAL '17 days', 1000, 1100, '{"algebra":70,"advanced_math":60,"geometry":75,"data_analysis":65,"reading_writing":80}'::jsonb),
  ((SELECT id FROM public.users WHERE clerk_id = 'test_student_04'), NOW() - INTERVAL '14 days',  970, 1070, '{"algebra":60,"advanced_math":55,"geometry":65,"data_analysis":55,"reading_writing":75}'::jsonb),
  ((SELECT id FROM public.users WHERE clerk_id = 'test_student_05'), NOW() - INTERVAL '11 days',  920, 1020, '{"algebra":50,"advanced_math":40,"geometry":55,"data_analysis":45,"reading_writing":65}'::jsonb),
  ((SELECT id FROM public.users WHERE clerk_id = 'test_student_06'), NOW() - INTERVAL '9 days',  1010, 1110, '{"algebra":72,"advanced_math":62,"geometry":70,"data_analysis":68,"reading_writing":75}'::jsonb),
  ((SELECT id FROM public.users WHERE clerk_id = 'test_student_07'), NOW() - INTERVAL '8 days',  1020, 1120, '{"algebra":75,"advanced_math":65,"geometry":72,"data_analysis":70,"reading_writing":78}'::jsonb),
  ((SELECT id FROM public.users WHERE clerk_id = 'test_student_08'), NOW() - INTERVAL '6 days',   990, 1090, '{"algebra":68,"advanced_math":58,"geometry":68,"data_analysis":62,"reading_writing":72}'::jsonb),
  ((SELECT id FROM public.users WHERE clerk_id = 'test_student_09'), NOW() - INTERVAL '28 days', 1060, 1160, '{"algebra":80,"advanced_math":72,"geometry":78,"data_analysis":75,"reading_writing":85}'::jsonb),
  ((SELECT id FROM public.users WHERE clerk_id = 'test_student_10'), NOW() - INTERVAL '24 days', 1040, 1140, '{"algebra":78,"advanced_math":70,"geometry":75,"data_analysis":72,"reading_writing":82}'::jsonb);

COMMIT;


-- ─────────────────────────────────────────────────────────────
-- Verification — counts you should see after a fresh run:
--   · users:              12 test rows (2 tutors + 10 students)
--   · subscriptions:      10
--   · cohorts:             2
--   · cohort_members:      8
--   · tutor_assignments:   2
--   · diagnostic_results: 10
-- ─────────────────────────────────────────────────────────────
SELECT 'users'               AS table_name, COUNT(*) AS test_rows FROM public.users               WHERE clerk_id LIKE 'test_%'
UNION ALL SELECT 'subscriptions',        COUNT(*) FROM public.subscriptions      WHERE user_id LIKE 'test_%'
UNION ALL SELECT 'cohorts',              COUNT(*) FROM public.cohorts            WHERE tutor_user_id IN (SELECT id FROM public.users WHERE clerk_id LIKE 'test_%')
UNION ALL SELECT 'cohort_members',       COUNT(*) FROM public.cohort_members     WHERE user_id IN (SELECT id FROM public.users WHERE clerk_id LIKE 'test_%')
UNION ALL SELECT 'tutor_assignments',    COUNT(*) FROM public.tutor_assignments  WHERE student_user_id IN (SELECT id FROM public.users WHERE clerk_id LIKE 'test_%')
UNION ALL SELECT 'diagnostic_results',   COUNT(*) FROM public.diagnostic_results WHERE user_id IN (SELECT id FROM public.users WHERE clerk_id LIKE 'test_%');
