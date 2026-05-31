-- ============================================================
-- Phase 9A (task #113) — figure-structure enrichment columns.
--
-- Phase 9 turns the raster figure screenshots (cropped from the PDF
-- in Stage 2, stored in image_url) into structured, accessible
-- representations: HTML tables (9A), SVG charts (9B), coordinate
-- graphs (9C), and admin-only geometry / 3D extraction (9D/9E).
--
-- This migration is the FOUNDATION for all of 9A-9E: it adds the
-- per-kind structured-data columns + the validation-diagnostics
-- column + the extraction-provenance column, and widens the
-- figure_kind CHECK to cover the new kinds. The 9A IMPLEMENTATION
-- (task #114, extract-figure-structure.mjs) only populates
-- figure_table_data + figure_quality + figure_extraction_model;
-- the graph / geometry columns ship empty here so later sub-phases
-- don't each need their own migration.
--
-- NEW columns on quiz_questions
--   figure_graph_data        JSONB — coordinate graphs (9C). Kept
--                            separate from figure_chart_data so the
--                            chart schema isn't overloaded with
--                            axis-scale / intercept / asymptote data.
--   figure_geometry_data     JSONB — 2D geometry + 3D shape structured
--                            extraction (9D/9E). Stored for admin
--                            tooling; students keep the screenshot in
--                            v1 ("clean-looking wrong geometry is more
--                            dangerous than a real screenshot").
--   figure_svg               TEXT  — validated deterministic SVG render
--                            (graphs / geometry when published). The
--                            vision model NEVER emits SVG; a JS renderer
--                            produces it from the *_data JSON.
--   figure_quality           JSONB — validation diagnostics + the
--                            fallback decision. Shape documented below
--                            and in docs/phase-9-handoff.md §6.
--   figure_extraction_model  TEXT  — which model produced the structured
--                            data (e.g. 'gemini-2.5-flash'), for
--                            benchmarking + systematic re-extraction.
--
-- figure_quality JSONB shape (written by extract-figure-structure.mjs):
--   {
--     "validation_status": "validated" | "validated_with_warnings"
--                          | "fallback_used" | "extraction_failed",
--     "used_fallback_level": 0 | 1 | 2 | 3,  -- 0 = structured used,
--                                            -- 3 = full screenshot fallback
--     "schema_errors": string[],             -- structural validation issues
--     "visual_validation": null,             -- 9A tables validate
--                                            -- structurally, not by hash
--     "extraction_model_confidence": number, -- 0..1, model self-report
--     "alt_text": string,                    -- screen-reader description
--     "diagnostic": {
--       "classified_as": string,             -- the classifier's figure_kind
--       "model_called_it_a": string,         -- free-form classifier note
--       "renderer_version": string           -- e.g. "table@1.0.0"
--     }
--   }
--
-- BACK-COMPAT
--   All columns are nullable / additive. Existing rows are unchanged
--   and keep rendering from image_url until extract-figure-structure
--   populates figure_table_data + flips figure_kind='table'. No
--   student-visible change on apply.
--
-- IDEMPOTENT
--   ADD COLUMN IF NOT EXISTS for columns; DROP + re-ADD for the CHECK
--   (Postgres has no "IF NOT EXISTS" for constraint values, so the
--   drop-then-add pattern — same as 20260519000000 added 'chart' — is
--   the safe idempotent path; ALTER TYPE does NOT apply because
--   figure_kind is a TEXT column + CHECK, not a Postgres enum).
-- ============================================================

-- ── 1. Widen the figure_kind CHECK ────────────────────────────
ALTER TABLE public.quiz_questions
  DROP CONSTRAINT IF EXISTS quiz_questions_figure_kind_check;

ALTER TABLE public.quiz_questions
  ADD CONSTRAINT quiz_questions_figure_kind_check
    CHECK (figure_kind IS NULL OR figure_kind IN (
      'image', 'table', 'svg', 'chart',          -- existing
      'graph', 'geometric', '3d_shape', 'other'  -- new in Phase 9A
    ));

-- ── 2. Per-kind structured data + diagnostics + provenance ────
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS figure_graph_data JSONB;
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS figure_geometry_data JSONB;
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS figure_svg TEXT;
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS figure_quality JSONB;
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS figure_extraction_model TEXT;

-- ── 3. Partial index for the Stage 6.5 enrichment pass ────────
-- "Find figure-bearing rows for this PDF that haven't been
-- structure-enriched yet" — mirrors the figure_pending_table /
-- figure_pending_chart indexes from Phases 4a / 4d.
CREATE INDEX IF NOT EXISTS idx_quiz_questions_figure_pending_structure
  ON public.quiz_questions (id)
  WHERE image_url IS NOT NULL
    AND figure_quality IS NULL;

-- ── 4. Column documentation ───────────────────────────────────
COMMENT ON COLUMN public.quiz_questions.figure_graph_data IS
  $$Phase 9C — coordinate-graph structured extraction (axes, scale, plotted points, function). Renderer emits SVG when figure_kind='graph'. Separate from figure_chart_data to avoid overloading the chart schema.$$;
COMMENT ON COLUMN public.quiz_questions.figure_geometry_data IS
  $$Phase 9D/9E — 2D geometry + 3D shape structured extraction. Stored for admin tooling; students keep the screenshot in v1. Renderer is screenshot-first until extraction has a clean track record.$$;
COMMENT ON COLUMN public.quiz_questions.figure_svg IS
  $$Phase 9B/9C — validated deterministic SVG render for graphs/geometry when published. Produced by a JS renderer from the *_data JSON; the vision model never emits SVG directly.$$;
COMMENT ON COLUMN public.quiz_questions.figure_quality IS
  $$Phase 9 — figure-structure validation diagnostics + fallback decision. Shape: { validation_status, used_fallback_level, schema_errors[], visual_validation, extraction_model_confidence, alt_text, diagnostic{} }. The publish-gate + figure-coherence audit read this as a quality signal. NULL = figure-structure enrichment not yet run.$$;
COMMENT ON COLUMN public.quiz_questions.figure_extraction_model IS
  $$Phase 9 — model that produced the structured figure data (e.g. 'gemini-2.5-flash'). For benchmarking + systematic re-extraction when a renderer/extractor version improves.$$;
