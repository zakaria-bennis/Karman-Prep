-- Figure engine data (docs/superpowers/specs/2026-10-31-figure-engine-design.md, Section 3, Data).
-- A question's figure, and a figure answer choice's own figure, stored as a FigureSpec
-- (src/lib/figures/engine/spec.ts). The renderer prefers figure_spec when present; the older
-- figure fields stay readable until every figure is migrated.
-- Additive only: both columns are nullable, nothing existing changes.
-- Rollback: supabase/rollbacks/20261031050000_figure_spec.down.sql

alter table public.quiz_questions
  add column if not exists figure_spec jsonb;

alter table public.answer_choices
  add column if not exists choice_figure_spec jsonb;

comment on column public.quiz_questions.figure_spec is 'The question figure as a FigureSpec (version figure-spec/1). When set, it is drawn instead of image_url, figure_svg and the figure_*_data fields.';
comment on column public.answer_choices.choice_figure_spec is 'This answer choice''s own figure as a FigureSpec (version figure-spec/1), for choices that are graphs, tables, charts or shapes.';
