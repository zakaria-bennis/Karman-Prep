-- ============================================================
-- Pipeline v2 — Phase 3: Source Asset Lineage
--
-- Spec: docs/ingestion/pipeline-v2-redesign-plan.md (Phase 3
-- section, lines ~1492 onward, revised after ChatGPT review).
-- Impl plan: docs/ingestion/pipeline-v2-phase3-implementation-plan.md
--
-- Adds the schema needed for per-question source-evidence
-- lineage: page renders + question crops + expanded crops, with
-- match-confidence metadata and an opt-in marker that gates
-- the new publish-gate rules to rows that have actually been
-- through Phase 3 processing.
--
-- All additions are additive. No DROP/RENAME. No CHECK
-- constraints in Phase 3 — the new text columns are app-
-- enforced first; CHECK promotion happens after the first
-- production run produces a known value distribution.
-- ============================================================

-- ── source_assets — 4 new columns + 3 indexes ──────────────
-- parent_asset_id: lets a question_crop point at the page_image
--   it was cut out of. ON DELETE SET NULL so deleting a parent
--   doesn't cascade-kill its children (admin may want to keep
--   the question crop even if they redo the page render).
ALTER TABLE public.source_assets
  ADD COLUMN IF NOT EXISTS parent_asset_id UUID
    REFERENCES public.source_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS match_method TEXT,
  ADD COLUMN IF NOT EXISTS match_confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS matched_source_question_number INT;

-- Compound index — the admin lineage UI's hot-path query is
-- "every asset for question X grouped by asset_type".
CREATE INDEX IF NOT EXISTS source_assets_question_id_type_idx
  ON public.source_assets(question_id, asset_type);

CREATE INDEX IF NOT EXISTS source_assets_parent_idx
  ON public.source_assets(parent_asset_id);

-- match_method index used by audit queries ("show me all rows
-- matched via ordered_fallback so I can spot-check them").
CREATE INDEX IF NOT EXISTS source_assets_match_method_idx
  ON public.source_assets(match_method);

COMMENT ON COLUMN public.source_assets.match_method IS
  'Which step of the 7-step matching hierarchy paired this asset '
  'to its question_id. App-enforced enum (no DB CHECK in phase 3): '
  'page_question_number, page_passage_snippet, page_choice_snippets, '
  'page_stem_snippet, ordered_fallback, orphan.';

COMMENT ON COLUMN public.source_assets.match_confidence IS
  'Confidence score for the match. Higher = more reliable. '
  'Suggested scale: question_number=0.95, passage=0.90, choices=0.85, '
  'stem=0.75, ordered_fallback=0.60, orphan=0.00.';

-- ── quiz_questions — 5 new columns + 3 indexes ─────────────
-- question_bbox cache. source_assets remains source of truth;
-- these three columns let the renderer skip a JOIN on the hot path.
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS question_bbox JSONB,
  ADD COLUMN IF NOT EXISTS question_bbox_confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS question_bbox_source_asset_id UUID
    REFERENCES public.source_assets(id) ON DELETE SET NULL,
  -- Opt-in marker for the new Phase 3 publish-gate rules.
  -- NULL = row has never been through Phase 3 (e.g. all existing
  -- v1 rows). Phase 3 gates short-circuit on NULL so old rows
  -- aren't accidentally flipped to needs_human_review.
  ADD COLUMN IF NOT EXISTS source_assets_processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_assets_processed_status TEXT;

CREATE INDEX IF NOT EXISTS quiz_questions_bbox_source_asset_idx
  ON public.quiz_questions(question_bbox_source_asset_id);

-- Partial index — most rows in the bank are pre-Phase-3 so the
-- predicate keeps the index small.
CREATE INDEX IF NOT EXISTS quiz_questions_source_assets_processed_idx
  ON public.quiz_questions(source_assets_processed_at)
  WHERE source_assets_processed_at IS NOT NULL;

-- Phase 3's matcher constantly asks "every quiz_questions row for
-- this PDF page". A compound index on (source_pdf, source_page)
-- collapses that query.
CREATE INDEX IF NOT EXISTS quiz_questions_source_pdf_page_idx
  ON public.quiz_questions(source_pdf, source_page);

COMMENT ON COLUMN public.quiz_questions.question_bbox IS
  'DENORMALIZED CACHE. Source of truth lives on source_assets via '
  'question_bbox_source_asset_id. JSON shape: {y_min, x_min, y_max, '
  'x_max, page_width, page_height, confidence}, all in 0-1000 '
  'normalized space (Y BEFORE X — Gemini standard).';

COMMENT ON COLUMN public.quiz_questions.source_assets_processed_at IS
  'Opt-in marker for Phase 3 publish-gate rules. NULL means the row '
  'has never been through Phase 3; the new source-evidence gates '
  'short-circuit and return null (= pass) for such rows. Non-null '
  'means Phase 3 ran on this row (successfully or not — see '
  'source_assets_processed_status for the outcome).';

COMMENT ON COLUMN public.quiz_questions.source_assets_processed_status IS
  'App-enforced (no DB CHECK in phase 3): complete | partial | failed '
  '| skipped. Per-row diagnostic detail lives on the corresponding '
  'source_assets row''s validation_status + raw_metadata.notes.';

-- ── Phase 3 signals view ───────────────────────────────────
-- Pre-aggregates the per-question source-evidence signals so
-- publish-gate.mjs reads from one view instead of N+1 queries.
-- For each question we surface:
--   · whether Phase 3 has run (the opt-in flag)
--   · the BEST question_crop's match_method + confidence + crop_complete
--   · whether any orphan crops exist on the same page (signals a
--     count mismatch or extraction bug)
CREATE OR REPLACE VIEW public.quiz_questions_phase3_signals AS
SELECT
  q.id                              AS question_id,
  q.source_pdf,
  q.source_page,
  q.source_assets_processed_at,
  q.source_assets_processed_status,
  qc.match_method                   AS question_crop_match_method,
  qc.match_confidence               AS question_crop_match_confidence,
  qc.crop_complete                  AS question_crop_complete,
  (qc.id IS NOT NULL)               AS has_question_crop,
  EXISTS(
    SELECT 1 FROM public.source_assets oc
    WHERE oc.source_pdf = q.source_pdf
      AND oc.page_number = q.source_page
      AND oc.match_method = 'orphan'
      AND oc.asset_type = 'question_crop'
  )                                  AS has_orphan_crops_on_page
FROM public.quiz_questions q
LEFT JOIN LATERAL (
  -- Best (highest-confidence) question_crop for this row
  SELECT sa.id, sa.match_method, sa.match_confidence, sa.crop_complete
  FROM public.source_assets sa
  WHERE sa.question_id = q.id
    AND sa.asset_type = 'question_crop'
  ORDER BY sa.match_confidence DESC NULLS LAST
  LIMIT 1
) qc ON TRUE;

COMMENT ON VIEW public.quiz_questions_phase3_signals IS
  'Read-only aggregate view used by publish-gate.mjs to evaluate '
  'the 7 new Phase 3 weak-evidence rules without N+1 queries. '
  'Joins quiz_questions to its best question_crop and surfaces '
  'orphan-on-page existence. Source of truth remains the underlying '
  'source_assets + quiz_questions tables.';
