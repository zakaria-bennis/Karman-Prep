-- Add a CHECK constraint on quiz_questions.concept_slug so the
-- database rejects any slug outside the canonical 89-slug list.
-- Audit finding HIGH-2 (docs/question-bank-audit-2026-05-17.md).
-- Pairs with the JavaScript validation already in
-- src/lib/question-bank/bulk-import.ts so a bad slug can't sneak
-- in via a direct SQL write, a stale prompt, or a future query
-- path that forgets to call isValidSlug.
--
-- SNAPSHOT — when the curriculum changes
-- ----------------------------------------------------------------
-- This file embeds a snapshot of the 89 concept slugs derived from
-- src/data/curriculum/{math,reading-writing}.ts at the time of the
-- migration. When the curriculum changes (slug added, renamed, or
-- removed), write a follow-up migration that does:
--
--     ALTER TABLE public.quiz_questions
--       DROP CONSTRAINT IF EXISTS quiz_questions_concept_slug_check;
--     ALTER TABLE public.quiz_questions
--       ADD CONSTRAINT quiz_questions_concept_slug_check
--       CHECK ( concept_slug IS NULL OR concept_slug IN ( ...new list... ) )
--       NOT VALID;
--
-- A future enhancement to scripts/sync-taxonomy.ts could detect the
-- slug-set drift and emit this migration automatically; until then
-- the curriculum and the constraint are kept in sync manually.
--
-- NOT VALID — historical data
-- ----------------------------------------------------------------
-- Pre-launch the bank may already hold rows with legacy slugs
-- (e.g. linear-equations, quadratics, central-idea — the 72-slug
-- draft this audit retired). `NOT VALID` lets the migration apply
-- cleanly without checking existing rows; the constraint fires on
-- every future INSERT/UPDATE. Once historical data is cleaned, run
-- `ALTER TABLE ... VALIDATE CONSTRAINT quiz_questions_concept_slug_check;`
-- to enforce it retroactively too.
--
-- DROP + ADD makes the migration idempotent — safe to re-run on
-- a DB that already has the constraint.

ALTER TABLE public.quiz_questions
  DROP CONSTRAINT IF EXISTS quiz_questions_concept_slug_check;

ALTER TABLE public.quiz_questions
  ADD CONSTRAINT quiz_questions_concept_slug_check
  CHECK (
    concept_slug IS NULL OR concept_slug IN (
      -- ALGEBRA (6, domain=algebra)
      'linear-equations-one-variable',
      'linear-equations-two-variables',
      'linear-inequalities',
      'systems-of-linear-equations',
      'systems-of-linear-inequalities',
      'absolute-value-equations',
      -- ADVANCED MATH (17, domain=advanced_math)
      'properties-of-exponents',
      'simplifying-algebraic-expressions',
      'evaluating-and-interpreting-functions',
      'introduction-to-polynomials',
      'quadratic-equations-factoring',
      'quadratic-equations-quadratic-formula',
      'quadratic-functions-vertex-form',
      'polynomial-operations',
      'rational-expressions',
      'radical-expressions',
      'exponential-growth-and-decay',
      'function-transformations',
      'linear-vs-exponential-models',
      'nonlinear-systems-of-equations',
      'algebraic-manipulation-of-complex-expressions',
      'multi-step-problem-solving',
      'full-section-strategy',
      -- GEOMETRY & TRIGONOMETRY (8, domain=geometry)
      'area-perimeter-and-volume',
      'angle-relationships',
      'coordinate-plane-geometry',
      'triangle-congruence-and-similarity',
      'pythagorean-theorem-and-distance-formula',
      'trigonometric-ratios',
      'circle-equations-in-standard-form',
      'arc-length-and-sector-area',
      -- PROBLEM-SOLVING & DATA ANALYSIS (9, domain=data_analysis)
      'ratios-and-proportions',
      'percentages',
      'unit-rates-and-conversions',
      'scatterplots-and-lines-of-best-fit',
      'statistical-measures',
      'probability-basics',
      'two-way-tables',
      'statistical-inference-and-margin-of-error',
      'interpreting-complex-data',
      -- INFORMATION & IDEAS (15, domain=info_ideas)
      'main-idea-and-central-claims',
      'supporting-details-and-evidence',
      'inference-and-implicit-meaning',
      'central-idea-vs-theme',
      'citing-textual-evidence',
      'cross-text-synthesis',
      'charts-and-data-in-passages',
      'interpreting-graphs-alongside-text',
      'command-of-evidence-textual',
      'command-of-evidence-quantitative',
      'counterclaims-and-rebuttals',
      'dual-passage-analysis',
      'statistical-claim-evaluation',
      'information-and-ideas-integration',
      'cross-disciplinary-evidence-use',
      -- CRAFT & STRUCTURE (14, domain=craft_structure)
      'authors-purpose-and-intent',
      'text-organization-patterns',
      'vocabulary-in-context',
      'word-choice-and-connotation',
      'rhetorical-appeals',
      'tone-and-point-of-view',
      'evaluating-argument-strength',
      'authorial-perspective-and-bias',
      'advanced-argumentation-analysis',
      'literary-authorial-purpose',
      'nuanced-vocabulary-in-context',
      'precise-word-choice-in-context',
      'structural-analysis-of-texts',
      'logical-structure-of-arguments',
      -- EXPRESSION OF IDEAS (6, domain=expression_ideas)
      'transitional-words-and-phrases',
      'redundancy-and-conciseness',
      'sentence-variety-and-combining',
      'multi-paragraph-structure',
      'rhetorical-synthesis',
      'advanced-transitions-and-cohesion',
      -- STANDARD ENGLISH CONVENTIONS (14, domain=conventions)
      'subject-verb-agreement',
      'verb-tense',
      'pronouns-and-nouns',
      'apostrophes-plural-vs-possessive',
      'periods-and-semicolons',
      'comma-fanboys',
      'commas-and-dependent-clauses',
      'non-essential-information',
      'commas-with-names-and-titles',
      'additional-comma-uses-and-misuses',
      'colons-and-dashes',
      'parallel-structure-and-word-pairs',
      'question-marks',
      'modifier-placement'
    )
  )
  NOT VALID;
