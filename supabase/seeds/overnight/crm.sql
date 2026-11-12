-- ============================================================
-- Local-only seed for the admin CRM (/admin/crm), 2026-11-12.
-- Clearly fake leads on the reserved example.test domain, plus a
-- few notes, tags, follow-ups and a hand-set stage on the seeded
-- personas, so the list, the pipeline and the overdue panel have
-- something to show. Never run against production.
--   psql -h 127.0.0.1 -p 54322 -U postgres -f supabase/seeds/overnight/crm.sql
-- ============================================================

INSERT INTO public.marketing_leads (id, email, source, name, details, created_at, updated_at)
VALUES
  ('c0a00000-0000-4000-8000-000000000001', 'sample-lead-1@example.test', 'cohort-march-2027', NULL,
   '{"latest":"1180","target":"1400","startDate":"Jan 4"}', now() - interval '6 days', now() - interval '6 days'),
  ('c0a00000-0000-4000-8000-000000000002', 'sample-lead-2@example.test', 'private', 'Sample Parent Two',
   '{"phone":"555-0100","slot":"2026-11-19 5:00 pm","plan":"Private 10"}', now() - interval '3 days', now() - interval '3 days'),
  ('c0a00000-0000-4000-8000-000000000003', 'sample-lead-3@example.test', 'practice-test-self-paced', 'Sample Student Three',
   '{"grade":"11th","satDate":"March 6"}', now() - interval '9 days', now() - interval '9 days'),
  ('c0a00000-0000-4000-8000-000000000004', 'sample-lead-3@example.test', 'newsletter', NULL,
   '{}', now() - interval '12 days', now() - interval '12 days'),
  ('c0a00000-0000-4000-8000-000000000005', 'sample-lead-4@example.test', 'coming-soon', NULL,
   '{}', now() - interval '20 days', now() - interval '20 days'),
  -- the same email as a seeded parent: shows a lead merging into the account
  ('c0a00000-0000-4000-8000-000000000006', 'rachel.johnson@karman.local', 'private', 'Sample (seed persona)',
   '{"plan":"Private 10"}', now() - interval '40 days', now() - interval '40 days')
ON CONFLICT (email, source) DO NOTHING;

INSERT INTO public.crm_contacts (contact_key, stage_override, stage_set_at, owner_user_id)
SELECT k, s, CASE WHEN s IS NULL THEN NULL ELSE now() - interval '1 day' END,
       (SELECT id FROM public.users WHERE clerk_id = 'dev_seed_admin')
  FROM (VALUES
    ('sample-lead-2@example.test', NULL),
    ('sample-lead-1@example.test', 'talking'),
    ('noah.kim@karman.local', NULL)
  ) AS v(k, s)
ON CONFLICT (contact_key) DO NOTHING;

INSERT INTO public.crm_notes (id, contact_key, body, author_user_id, created_at)
SELECT v.id::uuid, v.k, v.body, (SELECT id FROM public.users WHERE clerk_id = 'dev_seed_admin'), now() - v.ago
  FROM (VALUES
    ('c0a00000-0001-4000-8000-000000000001', 'sample-lead-2@example.test',
     'Sample note: asked about weekday evening sessions.', interval '2 days'),
    ('c0a00000-0001-4000-8000-000000000002', 'sample-lead-1@example.test',
     'Sample note: wants the January cohort.', interval '5 days')
  ) AS v(id, k, body, ago)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.crm_tasks (id, contact_key, title, due_on, created_by, created_at)
SELECT v.id::uuid, v.k, v.title, current_date + v.days, (SELECT id FROM public.users WHERE clerk_id = 'dev_seed_admin'), now() - interval '4 days'
  FROM (VALUES
    ('c0a00000-0002-4000-8000-000000000001', 'sample-lead-2@example.test', 'Sample: call back with times', -2),
    ('c0a00000-0002-4000-8000-000000000002', 'sample-lead-1@example.test', 'Sample: send the cohort schedule', 0),
    ('c0a00000-0002-4000-8000-000000000003', 'noah.kim@karman.local', 'Sample: check in after the free test', 5)
  ) AS v(id, k, title, days)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.crm_tags (contact_key, tag)
VALUES
  ('sample-lead-2@example.test', 'hot'),
  ('sample-lead-1@example.test', 'january'),
  ('noah.kim@karman.local', 'free-test')
ON CONFLICT DO NOTHING;
