-- ============================================================
-- Figure-as-native-UI Phase 4d: add columns that let us replace
-- raster coordinate-plane screenshots (scatterplots, line graphs,
-- bar charts, function plots) with real SVG figures rendered
-- from structured data.
--
-- New work:
--   figure_kind         — 'chart' value added to the CHECK constraint
--                          (was image / table / svg). 'chart' means
--                          "render from figure_chart_data".
--   figure_chart_data   — JSONB shape documented in src/types/chart.ts.
--                          Populated by scripts/figure-extraction/
--                          extract-chart-data.mjs from existing
--                          image_url crops via Gemini Pro Vision.
--                          Renderer (ChartFigure.tsx) uses this when
--                          figure_kind='chart'.
--
-- BACK-COMPAT
--   Existing rows keep figure_kind in {image, table, svg}. Until the
--   extractor runs and confidence threshold is met, every chart row
--   still renders from image_url (the original screenshot). No
--   student-visible change on rollout — flip the kind row-by-row
--   only after high-confidence extraction.
--
-- IDEMPOTENT
--   Drops + re-creates the CHECK constraint (no IF NOT EXISTS for
--   constraints in Postgres; the DROP IF EXISTS pattern is safe).
-- ============================================================

ALTER TABLE public.quiz_questions
  DROP CONSTRAINT IF EXISTS quiz_questions_figure_kind_check;

ALTER TABLE public.quiz_questions
  ADD CONSTRAINT quiz_questions_figure_kind_check
    CHECK (figure_kind IS NULL OR figure_kind IN ('image', 'table', 'svg', 'chart'));

ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS figure_chart_data JSONB;

-- Partial index for the bulk-extractor: "find all rows that have a
-- figure but haven't been classified as chart yet". Mirrors the
-- table-pending index from Phase 4a.
CREATE INDEX IF NOT EXISTS idx_quiz_questions_figure_pending_chart
  ON public.quiz_questions (id)
  WHERE image_url IS NOT NULL
    AND (figure_kind IS NULL OR figure_kind = 'image')
    AND figure_chart_data IS NULL;

COMMENT ON COLUMN public.quiz_questions.figure_chart_data IS
  $$Structured coordinate-plane figure extracted from a raster crop. Shape: see src/types/chart.ts (ChartFigure). Renderer turns this into clean SVG when figure_kind='chart'.$$;
