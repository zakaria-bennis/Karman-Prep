-- ============================================================
-- Figure-as-native-UI Phase 4a: add columns that let us replace
-- raster table screenshots with real HTML tables.
--
-- New columns on quiz_questions:
--   figure_kind         enum-like text — 'image' (default, raster),
--                       'table' (HTML table from figure_table_data),
--                       'svg' (reserved for Phase 4c — primitive shapes),
--                       null when no figure.
--   figure_table_data   JSONB shaped like:
--                         { caption, header_row[], rows[][], footer_note }
--                       Populated by scripts/figure-extraction/
--                       extract-table-data.mjs from existing image_url
--                       crops via Gemini vision. Once set, the renderer
--                       uses this instead of image_url for tables.
--
-- BACK-COMPAT
--   Existing rows keep figure_kind = 'image' (default). The renderer
--   falls back to image_url whenever figure_table_data is null OR
--   figure_kind != 'table'.
--
-- IDEMPOTENT
--   ADD COLUMN IF NOT EXISTS — safe to re-run.
-- ============================================================

ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS figure_kind TEXT
    CHECK (figure_kind IS NULL OR figure_kind IN ('image', 'table', 'svg'))
    DEFAULT 'image';

ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS figure_table_data JSONB;

-- Partial index for the bulk-extractor: "find all rows that have a
-- figure but haven't been classified as table yet".
CREATE INDEX IF NOT EXISTS idx_quiz_questions_figure_pending_table
  ON public.quiz_questions (id)
  WHERE image_url IS NOT NULL AND (figure_kind IS NULL OR figure_kind = 'image') AND figure_table_data IS NULL;

COMMENT ON COLUMN public.quiz_questions.figure_kind IS
  $$Where the figure comes from: 'image' (raster crop in image_url), 'table' (use figure_table_data JSONB), 'svg' (reserved, Phase 4c). NULL = no figure.$$;
COMMENT ON COLUMN public.quiz_questions.figure_table_data IS
  $$Structured table extracted from a raster crop. Shape: { caption?: string, header_row?: string[], rows: string[][], footer_note?: string }. Renderer turns this into native HTML when figure_kind='table'.$$;
