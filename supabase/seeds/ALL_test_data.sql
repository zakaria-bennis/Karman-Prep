-- ============================================================
-- ALL test data — paste this ONE file into Supabase SQL Editor.
--
-- It does everything in a single transaction:
--   1. Allow nullable registration_deadline on sat_dates
--   2. Seed the 16 College Board SAT dates (idempotent)
--   3. Wipe any prior test_% rows (cohort members, cohorts,
--      tutor assignments, diagnostic results, subscriptions, users)
--   4. Insert 2 fake tutors + 10 fake students
--   5. Insert subscriptions matching each student's tier
--   6. Create 2 cohorts (Seminar 5/200, Small Group 3/5)
--   7. Assign cohort members
--   8. Assign private-tier tutor pairings
--   9. Insert diagnostic results for every student
--
-- Re-running is safe — the wipe + insert cycle restores a
-- known clean state on every run.
--
-- To remove ALL test data later:
--   DELETE FROM public.users WHERE clerk_id LIKE 'test_%';
--   DELETE FROM public.subscriptions WHERE user_id LIKE 'test_%';
-- (the first delete cascades to everything else via FKs)
-- ============================================================

BEGIN;

-- ─── 1. Allow nullable reg_deadline (for future dates) ─────
ALTER TABLE public.sat_dates
  ALTER COLUMN registration_deadline DROP NOT NULL;

-- ─── 2. Seed the 16 College Board SAT dates ───────────────
INSERT INTO public.sat_dates (test_date, registration_deadline, late_registration_deadline, source_url, imported_at)
VALUES
  ('2025-08-23', '2025-08-08', '2025-08-12', 'https://satsuite.collegeboard.org/sat/dates-deadlines', NOW()),
  ('2025-09-13', '2025-08-29', '2025-09-02', 'https://satsuite.collegeboard.org/sat/dates-deadlines', NOW()),
  ('2025-10-04', '2025-09-19', '2025-09-23', 'https://satsuite.collegeboard.org/sat/dates-deadlines', NOW()),
  ('2025-11-08', '2025-10-24', '2025-10-28', 'https://satsuite.collegeboard.org/sat/dates-deadlines', NOW()),
  ('2025-12-06', '2025-11-21', '2025-11-25', 'https://satsuite.collegeboard.org/sat/dates-deadlines', NOW()),
  ('2026-03-14', '2026-02-27', '2026-03-03', 'https://satsuite.collegeboard.org/sat/dates-deadlines', NOW()),
  ('2026-05-02', '2026-04-17', '2026-04-21', 'https://satsuite.collegeboard.org/sat/dates-deadlines', NOW()),
  ('2026-06-06', '2026-05-22', '2026-05-26', 'https://satsuite.collegeboard.org/sat/dates-deadlines', NOW()),
  ('2026-08-22', NULL, NULL, 'https://satsuite.collegeboard.org/sat/dates-deadlines', NOW()),
  ('2026-09-12', NULL, NULL, 'https://satsuite.collegeboard.org/sat/dates-deadlines', NOW()),
  ('2026-10-03', NULL, NULL, 'https://satsuite.collegeboard.org/sat/dates-deadlines', NOW()),
  ('2026-11-07', NULL, NULL, 'https://satsuite.collegeboard.org/sat/dates-deadlines', NOW()),
  ('2026-12-05', NULL, NULL, 'https://satsuite.collegeboard.org/sat/dates-deadlines', NOW()),
  ('2027-03-06', NULL, NULL, 'https://satsuite.collegeboard.org/sat/dates-deadlines', NOW()),
  ('2027-05-01', NULL, NULL, 'https://satsuite.collegeboard.org/sat/dates-deadlines', NOW()),
  ('2027-06-05', NULL, NULL, 'https://satsuite.collegeboard.org/sat/dates-deadlines', NOW())
ON CONFLICT (test_date) DO NOTHING;


-- ─── 3. Wipe any prior test_% rows for a clean slate ───────
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


-- ─── 4. Tutors (2) ────────────────────────────────────────
INSERT INTO public.users (clerk_id, email, role, first_name, last_name) VALUES
  ('test_tutor_zakaria', 'zakaria.test@strata.local', 'tutor', 'Zakaria', 'Bennis'),
  ('test_tutor_nabil',   'nabil.test@strata.local',   'tutor', 'Nabil',   'Kafil Asrar');


-- ─── 5. Students (10) ──────────────────────────────────────
INSERT INTO public.users (clerk_id, email, role, first_name, last_name, sat_test_date) VALUES
  ('test_student_01', 'elijah.turner.test@strata.local',     'student', 'Elijah',   'Turner',    '2026-05-02'),
  ('test_student_02', 'sofia.park.test@strata.local',        'student', 'Sofia',    'Park',      '2026-05-02'),
  ('test_student_03', 'amara.johnson.test@strata.local',     'student', 'Amara',    'Johnson',   '2026-05-02'),
  ('test_student_04', 'isabella.rodriguez.test@strata.local','student', 'Isabella', 'Rodriguez', '2026-05-02'),
  ('test_student_05', 'darius.williams.test@strata.local',   'student', 'Darius',   'Williams',  '2026-05-02'),
  ('test_student_06', 'maya.hernandez.test@strata.local',    'student', 'Maya',     'Hernandez', '2026-05-02'),
  ('test_student_07', 'jordan.mbeki.test@strata.local',      'student', 'Jordan',   'Mbeki',     '2026-05-02'),
  ('test_student_08', 'noah.goldberg.test@strata.local',     'student', 'Noah',     'Goldberg',  '2026-05-02'),
  ('test_student_09', 'priya.krishnan.test@strata.local',    'student', 'Priya',    'Krishnan',  '2026-06-06'),
  ('test_student_10', 'lucas.chen.test@strata.local',        'student', 'Lucas',    'Chen',      '2026-06-06');


-- ─── 6. Subscriptions ──────────────────────────────────────
INSERT INTO public.subscriptions (user_id, stripe_customer_id, stripe_subscription_id, tier, status) VALUES
  ('test_student_01', 'fake_cus_01', 'fake_sub_01', 'group',       'active'),
  ('test_student_02', 'fake_cus_02', 'fake_sub_02', 'group',       'active'),
  ('test_student_03', 'fake_cus_03', 'fake_sub_03', 'group',       'active'),
  ('test_student_04', 'fake_cus_04', 'fake_sub_04', 'group',       'active'),
  ('test_student_05', 'fake_cus_05', 'fake_sub_05', 'group',       'active'),
  ('test_student_06', 'fake_cus_06', 'fake_sub_06', 'small_group', 'active'),
  ('test_student_07', 'fake_cus_07', 'fake_sub_07', 'small_group', 'active'),
  ('test_student_08', 'fake_cus_08', 'fake_sub_08', 'small_group', 'active'),
  ('test_student_09', 'fake_cus_09', 'fake_sub_09', 'private',     'active'),
  ('test_student_10', 'fake_cus_10', 'fake_sub_10', 'elite',       'trialing');


-- ─── 7. Cohorts (2) ────────────────────────────────────────
INSERT INTO public.cohorts (name, tier, sat_date, tutor_user_id, max_size, current_topic, status) VALUES
  ('Seminar · May 2, 2026 · Zakaria', 'group', '2026-05-02',
   (SELECT id FROM public.users WHERE clerk_id = 'test_tutor_zakaria'),
   200, 'Linear Functions — week 3', 'active'),
  ('Small Group · May 2, 2026 · Nabil', 'small_group', '2026-05-02',
   (SELECT id FROM public.users WHERE clerk_id = 'test_tutor_nabil'),
   5, 'Advanced Math — Polynomials', 'active');


-- ─── 8. Cohort members (5 seminar + 3 small-group) ────────
INSERT INTO public.cohort_members (cohort_id, user_id, joined_at) VALUES
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
  ((SELECT id FROM public.cohorts WHERE name = 'Small Group · May 2, 2026 · Nabil'),
   (SELECT id FROM public.users    WHERE clerk_id = 'test_student_06'), NOW() - INTERVAL '10 days'),
  ((SELECT id FROM public.cohorts WHERE name = 'Small Group · May 2, 2026 · Nabil'),
   (SELECT id FROM public.users    WHERE clerk_id = 'test_student_07'), NOW() - INTERVAL '9 days'),
  ((SELECT id FROM public.cohorts WHERE name = 'Small Group · May 2, 2026 · Nabil'),
   (SELECT id FROM public.users    WHERE clerk_id = 'test_student_08'), NOW() - INTERVAL '7 days');


-- ─── 9. Private-tier tutor assignments ────────────────────
INSERT INTO public.tutor_assignments (tutor_user_id, student_user_id, started_at) VALUES
  ((SELECT id FROM public.users WHERE clerk_id = 'test_tutor_zakaria'),
   (SELECT id FROM public.users WHERE clerk_id = 'test_student_09'),
   NOW() - INTERVAL '30 days'),
  ((SELECT id FROM public.users WHERE clerk_id = 'test_tutor_nabil'),
   (SELECT id FROM public.users WHERE clerk_id = 'test_student_10'),
   NOW() - INTERVAL '25 days');


-- ─── 10. Diagnostic results ───────────────────────────────
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


-- ─── Verification — expected row counts ───────────────────
SELECT 'sat_dates (total)'   AS bucket, COUNT(*) AS rows FROM public.sat_dates
UNION ALL SELECT 'users (test)',            COUNT(*) FROM public.users               WHERE clerk_id LIKE 'test_%'
UNION ALL SELECT 'tutors (role=tutor)',     COUNT(*) FROM public.users               WHERE role     = 'tutor'
UNION ALL SELECT 'subscriptions (test)',    COUNT(*) FROM public.subscriptions       WHERE user_id  LIKE 'test_%'
UNION ALL SELECT 'cohorts (test)',          COUNT(*) FROM public.cohorts             WHERE tutor_user_id IN (SELECT id FROM public.users WHERE clerk_id LIKE 'test_%')
UNION ALL SELECT 'cohort_members (test)',   COUNT(*) FROM public.cohort_members      WHERE user_id  IN (SELECT id FROM public.users WHERE clerk_id LIKE 'test_%')
UNION ALL SELECT 'tutor_assignments (test)',COUNT(*) FROM public.tutor_assignments   WHERE student_user_id IN (SELECT id FROM public.users WHERE clerk_id LIKE 'test_%')
UNION ALL SELECT 'diagnostic_results (test)',COUNT(*) FROM public.diagnostic_results WHERE user_id  IN (SELECT id FROM public.users WHERE clerk_id LIKE 'test_%');
