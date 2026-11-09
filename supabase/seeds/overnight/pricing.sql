-- Overnight local seed (qa-sweep, 2026-11-08): the one-time purchases the pricing work
-- promised in supabase/seeds/overnight/pricing.sql but never wrote. Without them the Cohort
-- and Private test students resolve to the Free plan (no Calendar, no booking).
-- Re-runnable: purchase grants are unique on (source, source_ref, user_id).
INSERT INTO public.plan_grants (user_id, plan_id, source, source_ref, starts_at)
SELECT u.clerk_id, g.plan_id, 'purchase', g.source_ref, now() - interval '30 days'
  FROM (VALUES
    ('dev_seed_student_cohort', 'cohort', 'cs_dev_seed_cohort_sofia'),
    ('dev_seed_student_private', 'private-10', 'cs_dev_seed_private10_maya')
  ) AS g (clerk_id, plan_id, source_ref)
  JOIN public.users u ON u.clerk_id = g.clerk_id
ON CONFLICT (source, source_ref, user_id) DO NOTHING;
