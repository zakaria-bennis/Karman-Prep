-- The marketing site's forms ask more than an email: the program
-- application asks for the latest and target scores and the SAT date,
-- the strategy call for the latest score and the SAT date, the free
-- practice test for the grade and the SAT date. Those answers go here.
-- Written only by the site's server actions via the service role.

alter table public.marketing_leads
  add column if not exists details jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();
