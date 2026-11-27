-- Page Studio (/studio, founder, 2026-11-24): the founder flips through every page of the site,
-- comments on any element or retypes its words, and sends the notes to Claude, who answers with
-- questions or with a pull request the founder merges. Nothing here changes the live site by itself.
--
-- page_review_notes     one comment or copy edit, pinned to an element of one page
-- page_review_messages  the back-and-forth on a note (Claude's questions, the founder's answers)
-- page_review_marks     the founder's verdict on a whole page: good, or needs work
--
-- Additive only: three new tables. Read and written by the server (service role) after an admin
-- check; nobody reaches them directly, so row level security is on with no policies.

create table if not exists public.page_review_notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  author_id uuid references public.users (id) on delete set null,
  -- which page (src/lib/page-studio/inventory.ts id) and the exact address it was on
  page_key text not null,
  page_path text not null,
  persona text not null,
  viewport text not null default 'desktop',
  kind text not null check (kind in ('copy', 'comment')),
  category text not null default 'other'
    check (category in ('copy', 'visual', 'functional', 'other')),
  -- the element: a CSS selector, a readable label, and short copies of its text and markup
  selector text not null default '',
  element_label text not null default '',
  element_text text not null default '',
  element_html text not null default '',
  -- copy edits: the words before and after
  old_text text,
  new_text text,
  body text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'question', 'working', 'in_pr', 'done', 'dismissed')),
  pr_url text,
  sent_at timestamptz
);

create index if not exists page_review_notes_page_idx on public.page_review_notes (page_key, created_at);
create index if not exists page_review_notes_status_idx on public.page_review_notes (status, created_at);

create table if not exists public.page_review_messages (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.page_review_notes (id) on delete cascade,
  created_at timestamptz not null default now(),
  author text not null check (author in ('founder', 'claude')),
  body text not null check (length(body) between 1 and 4000)
);

create index if not exists page_review_messages_note_idx on public.page_review_messages (note_id, created_at);

create table if not exists public.page_review_marks (
  page_key text primary key,
  mark text not null check (mark in ('good', 'needs_work')),
  updated_at timestamptz not null default now()
);

alter table public.page_review_notes enable row level security;
alter table public.page_review_messages enable row level security;
alter table public.page_review_marks enable row level security;

comment on table public.page_review_notes is
  'Page Studio notes: a comment or copy edit on one element of one page. Rules in src/lib/page-studio/.';
comment on table public.page_review_messages is
  'Page Studio: questions from Claude and answers from the founder on a note.';
comment on table public.page_review_marks is
  'Page Studio: the founder''s verdict on a whole page (good or needs work).';
