-- ============================================================
-- CLEANUP — remove every row added by phase1_test_data.sql.
--
-- Identifies test rows by the 'test_' prefix on clerk_id / user_id.
-- Run whenever you want to reset, or before going to production.
-- ============================================================

-- Order matters because some FKs are ON DELETE RESTRICT:
--   tutor_assignments.tutor_user_id  → RESTRICT
--   cohorts.tutor_user_id            → RESTRICT
--   cohort_waitlist.target_sat_date  → RESTRICT on sat_dates
--
-- So we delete dependents first, then the tutors/students.
-- Everything else (cohort_members, tutor_notes, cohort_waitlist)
-- cascades from users.

-- 1. 1:1 assignments — remove when tutor OR student is fake
DELETE FROM public.tutor_assignments
WHERE tutor_user_id IN (SELECT id FROM public.users WHERE clerk_id LIKE 'test_%')
   OR student_user_id IN (SELECT id FROM public.users WHERE clerk_id LIKE 'test_%');

-- 2. Cohorts — cascades to cohort_members
DELETE FROM public.cohorts
WHERE tutor_user_id IN (SELECT id FROM public.users WHERE clerk_id LIKE 'test_%');

-- 3. Subscriptions — user_id is plain text (not FK)
DELETE FROM public.subscriptions
WHERE user_id LIKE 'test_%';

-- 4. Finally the users — cascades to cohort_members (dup-safe),
--    cohort_waitlist, tutor_notes
DELETE FROM public.users
WHERE clerk_id LIKE 'test_%';

-- Verify it's all gone
SELECT
  (SELECT COUNT(*) FROM public.users               WHERE clerk_id LIKE 'test_%') AS users_remaining,
  (SELECT COUNT(*) FROM public.subscriptions       WHERE user_id  LIKE 'test_%') AS subs_remaining,
  (SELECT COUNT(*) FROM public.cohorts             WHERE name     LIKE '%(test)') AS cohorts_remaining;
-- All three should be 0.
