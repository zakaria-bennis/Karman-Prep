-- Marketing leads: emails captured by public forms on the marketing
-- site (free practice test registration, program interest, scholarship
-- enquiries, newsletter). Written only by POST /api/email/subscribe via
-- the service role; no public read or write access.

create table if not exists public.marketing_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null,
  name text,
  role text check (role in ('student', 'parent')),
  created_at timestamptz not null default now(),
  unique (email, source)
);

alter table public.marketing_leads enable row level security;
-- No policies on purpose: only the service role (which bypasses RLS)
-- reads or writes this table.

create index if not exists marketing_leads_source_created_idx
  on public.marketing_leads (source, created_at desc);
