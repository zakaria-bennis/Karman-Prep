-- The 72 skills (founder, 2026-11-15) bound to the question bank, and the record of every check the
-- bank was put through (overnight build, 2026-11-22, Bank stream).
--
-- question_skills72: one row a question, naming its one skill from src/lib/skills/ids72.ts. Real
-- questions are tagged by two independent classifiers; when they disagree a third judge decides.
-- Generated questions are bound by the generator to the skill they were made for. A question that
-- fits none of the 72 well gets its closest skill and poor_fit = true. The old catalog tags
-- (answer_key_entries.raw_model_response.approved_tags) and sub-skill links stay as they are.
--
-- question_bank_checks: append-only evidence of each check (key checks by two solvers who never saw
-- the key and a third adjudicator, explanation and hint checks, and why a question was held).
--
-- Additive and idempotent. Service role only: written by the Bank and Generator streams' scripts,
-- read by the portal on the server through src/lib/bank/.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'skill72_id' and typnamespace = 'public'::regnamespace) then
    create domain public.skill72_id as text check (value in (
    'rw-main-idea',
    'rw-key-details',
    'rw-evidence-from-a-text',
    'rw-evidence-from-research',
    'rw-reading-tables',
    'rw-reading-graphs',
    'rw-completing-an-argument',
    'rw-inferring-from-findings',
    'rw-precise-word-choice',
    'rw-advanced-vocabulary',
    'rw-meaning-in-context',
    'rw-text-structure',
    'rw-main-purpose',
    'rw-function-of-a-sentence',
    'rw-comparing-two-texts',
    'rw-responding-across-texts',
    'rw-notes-similarities-and-differences',
    'rw-notes-presenting-a-study',
    'rw-notes-writing-for-a-goal',
    'rw-transitions-adding-on',
    'rw-transitions-contrast',
    'rw-transitions-cause-and-sequence',
    'rw-sentence-boundaries',
    'rw-linking-clauses',
    'rw-essential-and-extra-details',
    'rw-colons-and-dashes',
    'rw-lists-and-series',
    'rw-unneeded-punctuation',
    'rw-subject-verb-agreement',
    'rw-pronoun-agreement',
    'rw-verb-forms',
    'rw-verb-tense',
    'rw-modifier-placement',
    'rw-plurals-and-possessives',
    'm-solving-linear-equations',
    'm-number-of-solutions',
    'm-equations-from-words',
    'm-slope-and-rate-of-change',
    'm-graphs-of-lines',
    'm-parallel-and-perpendicular-lines',
    'm-linear-functions',
    'm-solving-systems',
    'm-systems-in-context',
    'm-linear-inequalities',
    'm-expanding-and-factoring',
    'm-rational-expressions',
    'm-exponents-and-radicals',
    'm-solving-quadratics',
    'm-graphs-of-quadratics',
    'm-exponential-functions',
    'm-radical-and-rational-equations',
    'm-nonlinear-systems',
    'm-polynomials',
    'm-functions-and-transformations',
    'm-ratios-and-proportions',
    'm-units-and-conversions',
    'm-percentages',
    'm-mean-median-and-spread',
    'm-reading-data-displays',
    'm-scatterplots',
    'm-probability',
    'm-samples-and-margin-of-error',
    'm-studies-and-experiments',
    'm-area-and-perimeter',
    'm-volume-and-surface-area',
    'm-lines-and-angles',
    'm-triangles',
    'm-right-triangles',
    'm-trigonometric-ratios',
    'm-circles',
    'm-circle-equations',
    'm-radians'
    ));
  end if;
end
$$;

create table if not exists public.question_skills72 (
  question_id uuid primary key references public.quiz_questions (id) on delete cascade,
  skill_id public.skill72_id not null,
  -- 0 to 1: how sure the classifiers (or the judge) were
  confidence real not null check (confidence >= 0 and confidence <= 1),
  decided_by text not null check (decided_by in ('agreed', 'judged', 'generator')),
  classifier_a public.skill72_id,
  classifier_b public.skill72_id,
  judge public.skill72_id,
  poor_fit boolean not null default false,
  reason text check (reason is null or char_length(reason) <= 2000),
  run text not null check (char_length(run) between 1 and 200),
  tagged_at timestamptz not null default now(),
  check (decided_by = 'generator' or (classifier_a is not null and classifier_b is not null)),
  check (decided_by <> 'judged' or judge is not null)
);

create index if not exists question_skills72_skill_idx on public.question_skills72 (skill_id);

alter table public.question_skills72 enable row level security;
revoke all on public.question_skills72 from anon, authenticated;

create table if not exists public.question_bank_checks (
  id bigint generated always as identity primary key,
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  kind text not null check (kind in ('key', 'skill', 'explanation', 'hold')),
  verdict text not null check (char_length(verdict) between 1 and 100),
  detail jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object'),
  run text not null check (char_length(run) between 1 and 200),
  checked_at timestamptz not null default now()
);

create index if not exists question_bank_checks_question_idx
  on public.question_bank_checks (question_id, kind);

alter table public.question_bank_checks enable row level security;
revoke all on public.question_bank_checks from anon, authenticated;

-- Live questions behind each of the 72, for the Library's counts.
create or replace view public.skill72_live_counts
  with (security_invoker = true) as
  select s.skill_id::text as skill_id, count(*)::integer as questions
  from public.question_skills72 s
  join public.quiz_questions q on q.id = s.question_id
  where q.is_live
  group by s.skill_id;

revoke all on public.skill72_live_counts from anon, authenticated;
