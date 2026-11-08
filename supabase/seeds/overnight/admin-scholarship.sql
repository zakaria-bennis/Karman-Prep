-- ============================================================
-- Local-only seed for the cohort scholarship (admin-scholarship
-- session, 2026-11-08). A finished summer cohort with four
-- students, so the scholarship can be tried end to end:
--   Ella Brooks, Omar Haddad, Zoe Martin  get sample score
--     reports from scripts/scholarship/seed-local-claims.ts
--   Ben Carter  has no claim, to try the upload page as him
--     (DEV_IMPERSONATE_CLERK_ID=dev_seed_scholar_ben)
-- Never run against production.
-- ============================================================

INSERT INTO public.users (id, clerk_id, email, first_name, last_name, role, onboarding_completed_at)
VALUES
  ('5c0a1a10-0001-4000-8000-000000000001', 'dev_seed_scholar_ella', 'ella.brooks@karman.local', 'Ella', 'Brooks', 'student', now() - interval '120 days'),
  ('5c0a1a10-0001-4000-8000-000000000002', 'dev_seed_scholar_omar', 'omar.haddad@karman.local', 'Omar', 'Haddad', 'student', now() - interval '120 days'),
  ('5c0a1a10-0001-4000-8000-000000000003', 'dev_seed_scholar_zoe', 'zoe.martin@karman.local', 'Zoe', 'Martin', 'student', now() - interval '120 days'),
  ('5c0a1a10-0001-4000-8000-000000000004', 'dev_seed_scholar_ben', 'ben.carter@karman.local', 'Ben', 'Carter', 'student', now() - interval '120 days')
ON CONFLICT (clerk_id) DO UPDATE
  SET first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      email = EXCLUDED.email,
      role = 'student';

INSERT INTO public.cohorts (id, name, tier, sat_date, tutor_user_id, max_size, status, created_at, ended_at)
SELECT '5c0a1a10-0002-4000-8000-000000000001', 'Summer Cohort 1400 to 1600', 'group', DATE '2026-10-03',
       u.id, 6, 'completed', TIMESTAMPTZ '2026-07-27 17:00:00-05', TIMESTAMPTZ '2026-09-28 18:00:00-05'
  FROM public.users u
 WHERE u.clerk_id = 'dev_seed_tutor_david'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.cohort_members (cohort_id, user_id, joined_at, left_at)
SELECT '5c0a1a10-0002-4000-8000-000000000001', u.id,
       TIMESTAMPTZ '2026-07-20 12:00:00-05', TIMESTAMPTZ '2026-09-28 18:00:00-05'
  FROM public.users u
 WHERE u.clerk_id IN ('dev_seed_scholar_ella', 'dev_seed_scholar_omar', 'dev_seed_scholar_zoe', 'dev_seed_scholar_ben')
ON CONFLICT (cohort_id, user_id) DO NOTHING;
