-- ============================================================
-- TEST DATA — Phase 1 (cohorts + tutor assignments + waitlist)
--
-- Populates: 2 tutors, 10 students, 2 cohorts (seminar + small group),
-- 7 cohort members, 1 waitlist entry, 2 1:1 tutor assignments,
-- and sample tutor_notes per student.
--
-- Every row is prefixed "test_" on clerk_id / email / stripe ids so
-- the cleanup script can wipe it in one pass.
--
-- Run ONCE in the Supabase SQL Editor. Safe to re-run (uses ON CONFLICT
-- / NOT EXISTS everywhere) but duplicate runs are no-ops.
-- Prerequisite: SAT dates seed SQL has been run (needs 2026-05-02 +
-- 2026-06-06 in public.sat_dates).
-- ============================================================


-- 1. Two fake tutors ────────────────────────────────────────

INSERT INTO public.users (clerk_id, email, role, first_name, last_name, avatar_url)
VALUES
  ('test_tutor_alex',   'test_alex@example.com',   'tutor', 'Alex',   'Rivera',
   'https://api.dicebear.com/7.x/avataaars/svg?seed=alex-rivera'),
  ('test_tutor_morgan', 'test_morgan@example.com', 'tutor', 'Morgan', 'Chen',
   'https://api.dicebear.com/7.x/avataaars/svg?seed=morgan-chen')
ON CONFLICT (clerk_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name  = EXCLUDED.last_name,
  avatar_url = EXCLUDED.avatar_url;


-- 2. Ten fake students ──────────────────────────────────────

INSERT INTO public.users (clerk_id, email, role, first_name, last_name, sat_test_date, avatar_url)
VALUES
  -- Seminar cohort (May 2 test)
  ('test_student_emma',     'test_emma@example.com',     'student', 'Emma',     'Thompson',  '2026-05-02',
   'https://api.dicebear.com/7.x/avataaars/svg?seed=emma'),
  ('test_student_jackson',  'test_jackson@example.com',  'student', 'Jackson',  'Lee',       '2026-05-02',
   'https://api.dicebear.com/7.x/avataaars/svg?seed=jackson'),
  ('test_student_ava',      'test_ava@example.com',      'student', 'Ava',      'Martinez',  '2026-05-02',
   'https://api.dicebear.com/7.x/avataaars/svg?seed=ava'),
  ('test_student_liam',     'test_liam@example.com',     'student', 'Liam',     'O''Brien',  '2026-05-02',
   'https://api.dicebear.com/7.x/avataaars/svg?seed=liam'),

  -- Small group (May 2 test) — fills to 3/5 so admins can see mid-capacity state
  ('test_student_olivia',   'test_olivia@example.com',   'student', 'Olivia',   'Patel',     '2026-05-02',
   'https://api.dicebear.com/7.x/avataaars/svg?seed=olivia'),
  ('test_student_noah',     'test_noah@example.com',     'student', 'Noah',     'Williams',  '2026-05-02',
   'https://api.dicebear.com/7.x/avataaars/svg?seed=noah'),
  ('test_student_sophia',   'test_sophia@example.com',   'student', 'Sophia',   'Kim',       '2026-05-02',
   'https://api.dicebear.com/7.x/avataaars/svg?seed=sophia'),

  -- Waitlisted (small_group subscriber with no open cohort)
  ('test_student_ethan',    'test_ethan@example.com',    'student', 'Ethan',    'Davis',     '2026-05-02',
   'https://api.dicebear.com/7.x/avataaars/svg?seed=ethan'),

  -- 1:1 students (different SAT date to exercise that axis)
  ('test_student_isabella', 'test_isabella@example.com', 'student', 'Isabella', 'Rodriguez', '2026-06-06',
   'https://api.dicebear.com/7.x/avataaars/svg?seed=isabella'),
  ('test_student_mason',    'test_mason@example.com',    'student', 'Mason',    'Brown',     '2026-06-06',
   'https://api.dicebear.com/7.x/avataaars/svg?seed=mason')
ON CONFLICT (clerk_id) DO UPDATE SET
  first_name    = EXCLUDED.first_name,
  last_name     = EXCLUDED.last_name,
  sat_test_date = EXCLUDED.sat_test_date,
  avatar_url    = EXCLUDED.avatar_url;


-- 3. Subscriptions (user_id is clerk_id per your schema) ────

INSERT INTO public.subscriptions (user_id, stripe_customer_id, stripe_subscription_id, tier, status)
VALUES
  -- Seminar
  ('test_student_emma',     'test_cus_emma',     'test_sub_emma',     'group',       'active'),
  ('test_student_jackson',  'test_cus_jackson',  'test_sub_jackson',  'group',       'active'),
  ('test_student_ava',      'test_cus_ava',      'test_sub_ava',      'group',       'active'),
  ('test_student_liam',     'test_cus_liam',     'test_sub_liam',     'group',       'active'),
  -- Small group
  ('test_student_olivia',   'test_cus_olivia',   'test_sub_olivia',   'small_group', 'active'),
  ('test_student_noah',     'test_cus_noah',     'test_sub_noah',     'small_group', 'active'),
  ('test_student_sophia',   'test_cus_sophia',   'test_sub_sophia',   'small_group', 'active'),
  -- Waitlisted (upgraded to small_group, waiting for a seat)
  ('test_student_ethan',    'test_cus_ethan',    'test_sub_ethan',    'small_group', 'active'),
  -- 1:1
  ('test_student_isabella', 'test_cus_isabella', 'test_sub_isabella', 'private',     'active'),
  ('test_student_mason',    'test_cus_mason',    'test_sub_mason',    'elite',       'active')
ON CONFLICT (stripe_subscription_id) DO NOTHING;


-- 4. Cohorts — one seminar + one small group ───────────────
-- Skip if already created (idempotent re-runs).

INSERT INTO public.cohorts (name, tier, sat_date, tutor_user_id, max_size, current_topic, status)
SELECT 'Seminar · May 2, 2026 · Alex (test)', 'group', '2026-05-02',
       (SELECT id FROM public.users WHERE clerk_id = 'test_tutor_alex'),
       200, 'Linear functions & graphing', 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.cohorts WHERE name = 'Seminar · May 2, 2026 · Alex (test)'
);

INSERT INTO public.cohorts (name, tier, sat_date, tutor_user_id, max_size, current_topic, status)
SELECT 'Small Group · May 2, 2026 · Morgan (test)', 'small_group', '2026-05-02',
       (SELECT id FROM public.users WHERE clerk_id = 'test_tutor_morgan'),
       5, 'Quadratics intensive', 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.cohorts WHERE name = 'Small Group · May 2, 2026 · Morgan (test)'
);


-- 5. Cohort members ─────────────────────────────────────────

-- Seminar: Emma, Jackson, Ava, Liam (4 / 200)
INSERT INTO public.cohort_members (cohort_id, user_id)
SELECT c.id, u.id
FROM public.cohorts c
CROSS JOIN public.users u
WHERE c.name = 'Seminar · May 2, 2026 · Alex (test)'
  AND u.clerk_id IN (
    'test_student_emma',
    'test_student_jackson',
    'test_student_ava',
    'test_student_liam'
  )
ON CONFLICT (cohort_id, user_id) DO NOTHING;

-- Small Group: Olivia, Noah, Sophia (3 / 5 — leaves room to test adding more)
INSERT INTO public.cohort_members (cohort_id, user_id)
SELECT c.id, u.id
FROM public.cohorts c
CROSS JOIN public.users u
WHERE c.name = 'Small Group · May 2, 2026 · Morgan (test)'
  AND u.clerk_id IN (
    'test_student_olivia',
    'test_student_noah',
    'test_student_sophia'
  )
ON CONFLICT (cohort_id, user_id) DO NOTHING;


-- 6. Waitlist: Ethan (upgraded but no cohort with capacity yet) ─

INSERT INTO public.cohort_waitlist (user_id, target_sat_date, target_tier)
SELECT id, '2026-05-02', 'small_group'
FROM public.users
WHERE clerk_id = 'test_student_ethan'
ON CONFLICT (user_id, target_sat_date) DO NOTHING;


-- 7. 1:1 tutor assignments ──────────────────────────────────

-- Isabella ↔ Alex (private)
INSERT INTO public.tutor_assignments (tutor_user_id, student_user_id)
SELECT t.id, s.id
FROM public.users t
CROSS JOIN public.users s
WHERE t.clerk_id = 'test_tutor_alex'
  AND s.clerk_id = 'test_student_isabella'
  AND NOT EXISTS (
    SELECT 1 FROM public.tutor_assignments
    WHERE student_user_id = s.id AND ended_at IS NULL
  );

-- Mason ↔ Morgan (elite)
INSERT INTO public.tutor_assignments (tutor_user_id, student_user_id)
SELECT t.id, s.id
FROM public.users t
CROSS JOIN public.users s
WHERE t.clerk_id = 'test_tutor_morgan'
  AND s.clerk_id = 'test_student_mason'
  AND NOT EXISTS (
    SELECT 1 FROM public.tutor_assignments
    WHERE student_user_id = s.id AND ended_at IS NULL
  );


-- 8. Tutor notes — sample note per tutor-student pair so the ─
-- notes UI (next session) has something to display.

WITH pairs AS (
  SELECT t.id AS tutor_id, s.id AS student_id, note.body
  FROM (VALUES
    ('test_tutor_alex',   'test_student_emma',     'Emma is strong on algebra; struggles with geometry proofs. Assigned extra practice on triangle similarity.'),
    ('test_tutor_alex',   'test_student_jackson',  'Jackson answers fast but rushes. Working on slowing down and double-checking on medium questions.'),
    ('test_tutor_alex',   'test_student_ava',      'Ava''s reading comprehension is excellent. Math baseline around 520 — main lift is data analysis.'),
    ('test_tutor_alex',   'test_student_liam',     'Liam joined late in the cycle. Front-loaded algebra review for weeks 1-2.'),
    ('test_tutor_alex',   'test_student_isabella', 'Isabella needs 1:1 attention — extremely test-anxious. Strategy: low-stakes timed drills before full sections.'),
    ('test_tutor_morgan', 'test_student_olivia',   'Olivia is methodical and careful. Targets: pacing on Reading and circle geometry on Math.'),
    ('test_tutor_morgan', 'test_student_noah',     'Noah excels at word problems. Opportunity: trigonometry — currently his weakest domain.'),
    ('test_tutor_morgan', 'test_student_sophia',   'Sophia has a strong work ethic and hits every checkpoint. Considering early-start cohort next cycle.'),
    ('test_tutor_morgan', 'test_student_mason',    'Mason targeting 1500+. Elite plan — two sessions/week focused on Math 800 and Reading 750.')
  ) AS note(tutor_clerk, student_clerk, body)
  JOIN public.users t ON t.clerk_id = note.tutor_clerk
  JOIN public.users s ON s.clerk_id = note.student_clerk
)
INSERT INTO public.tutor_notes (tutor_user_id, student_user_id, body)
SELECT tutor_id, student_id, body FROM pairs
ON CONFLICT DO NOTHING;


-- Done. Summary:
--   users:          2 tutors + 10 students     (12 new rows)
--   subscriptions:  10
--   cohorts:        2
--   cohort_members: 7
--   cohort_waitlist: 1
--   tutor_assignments: 2
--   tutor_notes:    9
