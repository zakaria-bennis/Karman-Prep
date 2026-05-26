# Phase 3 Implementation Plan

Source: `docs/ingestion/pipeline-v2-redesign-plan.md` §1492 (revised after ChatGPT review + opt-in clarification).

This is the build plan ONLY. No code in this PR. Once approved, implementation lands as a follow-up PR.

---

## 1. Migrations needed

One migration file: `supabase/migrations/<YYYYMMDDHHMMSS>_pdf_ingestion_v2_phase3.sql`.

Adds **6 columns**, **2 new tables/views**, **4 indexes**, **1 view**:

### `source_assets` — 4 new columns + 2 indexes

```sql
alter table public.source_assets
add column if not exists parent_asset_id uuid
  references public.source_assets(id) on delete set null,
add column if not exists match_method text,
add column if not exists match_confidence numeric,
add column if not exists matched_source_question_number int;

create index if not exists source_assets_question_id_type_idx
  on public.source_assets(question_id, asset_type);
create index if not exists source_assets_parent_idx
  on public.source_assets(parent_asset_id);
create index if not exists source_assets_match_method_idx
  on public.source_assets(match_method);
```

### `quiz_questions` — 5 new columns + 3 indexes

```sql
alter table public.quiz_questions
add column if not exists question_bbox jsonb,
add column if not exists question_bbox_confidence numeric,
add column if not exists question_bbox_source_asset_id uuid
  references public.source_assets(id) on delete set null,
add column if not exists source_assets_processed_at timestamptz,
add column if not exists source_assets_processed_status text;

create index if not exists quiz_questions_bbox_source_asset_idx
  on public.quiz_questions(question_bbox_source_asset_id);
create index if not exists quiz_questions_source_assets_processed_idx
  on public.quiz_questions(source_assets_processed_at)
  where source_assets_processed_at is not null;

-- Phase 3 matching needs "give me every quiz_questions row for a
-- given PDF page" as a hot-path query. Pure index, no constraint.
create index if not exists quiz_questions_source_pdf_page_idx
  on public.quiz_questions(source_pdf, source_page);
```

`source_assets_processed_status` allowed values (**app-enforced; no DB CHECK in Phase 3**):

| Value | Meaning |
| --- | --- |
| `complete` | Page rendered, question detected, matched cleanly, crop is complete. |
| `partial` | Phase 3 ran but the row has some issue (low confidence, ordered fallback, incomplete crop, orphan-on-page, count mismatch). Specific issue lives on the source_assets row. |
| `failed` | Phase 3 attempted but failed entirely (render error, zero detections, DB write error). |
| `skipped` | Phase 3 chose not to process (dry-run, no source_page). |

### Phase-3 signals view

```sql
create or replace view public.quiz_questions_phase3_signals as
select q.id as question_id, q.source_pdf, q.source_page,
       q.source_assets_processed_at, q.source_assets_processed_status,
       qc.match_method  as question_crop_match_method,
       qc.match_confidence as question_crop_match_confidence,
       qc.crop_complete as question_crop_complete,
       (qc.id is not null) as has_question_crop,
       exists(
         select 1 from public.source_assets oc
         where oc.source_pdf = q.source_pdf
           and oc.page_number = q.source_page
           and oc.match_method = 'orphan'
           and oc.asset_type = 'question_crop'
       ) as has_orphan_crops_on_page
from public.quiz_questions q
left join lateral (
  select * from public.source_assets sa
  where sa.question_id = q.id and sa.asset_type = 'question_crop'
  order by sa.match_confidence desc nulls last
  limit 1
) qc on true;
```

The view collapses the N+1 aggregate query the publish-gate would otherwise need.

### No CHECK constraints in Phase 3

`source_assets.match_method` and `quiz_questions.source_assets_processed_status` are NOT yet CHECK-constrained — wait until the first run produces real values, then promote in a follow-up migration (same pattern Phase 1 used for `publish_status`).

---

## 2. New files to create

| Path | Lines | Purpose |
| --- | --- | --- |
| `scripts/lib/page-render.mjs` | ~80 | `renderPdfPage(pdfPath, page, opts)` wrapper around pdftoppm. Returns `{ pngPath, width, height }`. Used **only** by the new Phase 3 script. |
| `scripts/lib/question-matcher.mjs` | ~150 | Pure 7-step matching hierarchy. Exports `matchDetectionToRow(detected, candidates)` → `{ matched: row \| null, method, confidence }`. Unit-tested. |
| `scripts/pdf-pipeline/extract-question-crops.mjs` | ~500 | The main Phase 3 script. Per-page render → Gemini Flash bbox detection → matching → crop → R2 upload → DB writes → summary. |
| `scripts/v2-phase3/backfill-source-assets.mjs` | ~150 | One-shot operator script for backfilling v1 PDFs that are still in R2. |
| `scripts/v2-phase3/verify-source-asset-flow.mjs` | ~180 | DB-level verification: asserts the new constraints, FK behavior, view shape. Same self-cleaning pattern as Phase 1/2 verifies. |
| `src/lib/pipeline-v2/question-matcher.test.ts` | ~250 | Vitest spec for the 7-step matcher. One `describe` per step + orphan + count-mismatch cases + the 80-px padding floor. |
| `supabase/migrations/<TS>_pdf_ingestion_v2_phase3.sql` | ~80 | The migration above. |

**Total new code:** ~1,400 lines across 7 files.

---

## 3. Existing files to modify

| Path | Change | Risk |
| --- | --- | --- |
| `src/types/supabase.ts` | Hand-edit to add the 5 new `quiz_questions` columns + 4 new `source_assets` columns to Row/Insert/Update blocks + the new view's Row block. | Low — additive type widening. |
| `scripts/lib/publish-gate-logic.mjs` | Add 7 new gate functions (`gateMissingQuestionCrop`, `gateLowCropConfidence`, `gateOrderedFallbackMatch`, `gateOrphanCropsOnPage`, `gateCropCountMismatch`, `gateMissingSourcePage`, `gateIncompleteCrop`). Each starts with the `source_assets_processed_at` opt-in guard. Insert them into `ALL_GATES` after the existing Phase 1+2 gates, before `gateImportStatus`/`gateExplanation`. | Medium — must keep gate ordering correct so blocking gates still win over the new `needs_human_review` gates. Unit tests cover this. |
| `src/lib/pipeline-v2/publish-gate-logic.test.ts` | Add ~15 new unit tests covering: the opt-in (gate returns null when `source_assets_processed_at` is null), each of the 7 gates firing on the right signal, ordering vs existing gates. | Low — pure unit tests. |
| `scripts/pdf-pipeline/publish-gate.mjs` | Switch the row query from `quiz_questions` directly to the new `quiz_questions_phase3_signals` view (JOIN-style). Pass the signals fields through to the gate functions. | Low — view is read-only. |
| `scripts/pdf-pipeline/orchestrate.mjs` | Add Stage 6 between import (4) and fill (which currently runs as 6, becomes 7 after this PR). Pass `--source-pdf` + `--job-id`. Pipeline becomes 10 stages. | Low — additive. |

**No modifications to:** `extract-figures.mjs`, `extract-answer-key.mjs`, `extract-with-gemini.mjs`, `import-csv-direct.mjs`, `multi-vote-grader.mjs`, `bulk-import.ts`. The v1 figure pipeline stays exactly as it is.

---

## 4. Exact script CLI interfaces

### `extract-question-crops.mjs`

```bash
node --env-file=.env.local scripts/pdf-pipeline/extract-question-crops.mjs \
     <pdf-path> --source-pdf <filename> [--job-id <uuid>] \
     [--out /tmp/<stem>-crops.json] [--no-db] \
     [--force] [--include-admin-verified]
```

Flags:

- `<pdf-path>` (positional) — local path to the PDF to process.
- `--source-pdf <filename>` (required) — filename used to look up matching `quiz_questions` rows.
- `--job-id <uuid>` (optional) — `pdf_processing_jobs.id`. Used for the R2 prefix and for writing summary to `progress`.
- `--out <path>` (optional) — JSON sidecar destination. Default `/tmp/<stem>-crops.json`.
- `--no-db` (optional) — skip every Supabase write (dry-run mode for prompt iteration).
- `--force` (optional) — re-process rows even if `source_assets_processed_at` is already set. **Preserves admin-verified assets** (see below).
- `--include-admin-verified` (optional, requires `--force`) — also delete and recreate `source_assets` rows whose `validation_status='admin_verified'`. Without this flag, admin-verified rows are kept as-is.

Force semantics (three tiers, safest first):

```text
Default (no flags)
  · For each row in source_pdf:
      if source_assets_processed_at is NULL  → process
      if source_assets_processed_at is set   → skip
  · No deletes. No human work disturbed.

--force
  · For each row in source_pdf:
      delete source_assets rows for this row WHERE
        asset_type IN ('page_image', 'question_crop', 'expanded_question_crop')
        AND (validation_status IS NULL OR validation_status != 'admin_verified')
      reset source_assets_processed_at = NULL
      reprocess the row
  · Admin-verified rows are NOT deleted. They survive the rerun.
  · Other asset types (figure_crop, answer_key_page, etc.) untouched.

--force --include-admin-verified
  · Same as --force, but the WHERE filter drops the admin_verified
    guard. Every Phase-3 asset for the source_pdf is deleted + rebuilt.
  · Use sparingly. The flag is verbose on purpose.
```

Exit codes:

- `0` — completed (even if some rows orphaned or partial; summary tells the story).
- `1` — fatal error (PDF unreadable, all Gemini calls failed, DB connection dead).

### `backfill-source-assets.mjs`

```bash
node --env-file=.env.local scripts/v2-phase3/backfill-source-assets.mjs \
     --source-pdf <filename> [--limit N] [--force]
```

Flags:

- `--source-pdf <filename>` (required) — which PDF to backfill.
- `--limit N` (optional) — backfill at most N questions; default unlimited.
- `--force` (optional) — re-process even if already processed.

Internally: reads `pdf_processing_jobs` for the storage_path matching that filename, downloads from R2, runs the same `extract-question-crops` flow.

### `verify-source-asset-flow.mjs`

```bash
node --env-file=.env.local scripts/v2-phase3/verify-source-asset-flow.mjs
```

No flags. Inserts a fixture row, asserts every Phase 3 schema/view/gate behaves correctly, cleans up. Same pattern as `verify-live-view-safety.mjs` from Phase 1.

---

## 5. How `source_assets` rows are created

Every row written by this stage includes a standard run-metadata block in `raw_metadata`:

```js
// Built once at script start
const RUN_ID = crypto.randomUUID();
const RUN_METADATA = {
  phase: "phase3_question_crops",
  run_id: RUN_ID,
  model: "gemini-2.5-flash",
};
```

This block is spread into every `source_assets.raw_metadata` JSONB along with per-asset details (bbox, completeness flags, etc.). Auditing "which run produced this asset?" then becomes a single JSONB query: `WHERE raw_metadata->>'run_id' = '<uuid>'`. The block also lets us spot orphan runs (e.g. a partial run that crashed mid-way).

For each page processed:

```js
// 5a — page_image row, one per page
const page = await uploadToR2({...});
const pageRow = await supabase.from("source_assets").insert({
  question_id: null,                  // page-level, not per-question
  source_pdf, page_number,
  pdf_job_id,
  asset_type: "page_image",
  asset_path: pageR2Key,
  public_url: pageR2Url,
  validation_status: "rendered_at_200dpi",
  relevance: "required",
  raw_metadata: {
    ...RUN_METADATA,
    dpi: 200,
    page_width, page_height,
  },
}).select("id").single();

// 5b — for each detected question on the page:
for (const det of detected_questions) {
  const matched = matchDetectionToRow(det, rowsOnThisPage);

  // Cache bbox on the matched quiz_questions row
  if (matched.row) {
    await supabase.from("quiz_questions").update({
      question_bbox: { y_min, x_min, y_max, x_max, page_width, page_height, confidence },
      question_bbox_confidence: det.confidence,
      question_bbox_source_asset_id: <to-be-filled-after-crop-row-created>,
    }).eq("id", matched.row.id);
  }

  // 5b-i — question_crop row
  const qcropR2 = await uploadToR2({...});
  const qcropRow = await supabase.from("source_assets").insert({
    question_id: matched.row?.id ?? null,
    source_pdf, page_number,
    pdf_job_id,
    asset_type: "question_crop",
    asset_path: qcropR2Key,
    public_url: qcropR2Url,
    parent_asset_id: pageRow.id,
    bbox: det.bbox,
    crop_complete: det.contains_full_question_stem
      && det.contains_passage_if_present
      && det.contains_answer_choices_if_mcq
      && det.contains_embedded_visual_if_present,
    match_method: matched.method,
    match_confidence: matched.confidence,
    matched_source_question_number: det.source_question_number ?? null,
    validation_status: matched.row
      ? "matched"
      : "orphan_unmatched_question_crop",
    relevance: matched.row ? "required" : "uncertain",
    notes: det.notes ?? null,
    raw_metadata: {
      ...RUN_METADATA,
      detection: det,
      crop_kind: "tight",
    },
  }).select("id").single();

  // 5b-ii — expanded_question_crop row (same pattern, different bbox)
  // ...

  // Update quiz_questions.question_bbox_source_asset_id to point at qcropRow.id
}

// 5c — at end of pipeline, mark every quiz_questions row from this PDF
//      with source_assets_processed_at + _status
await supabase.from("quiz_questions").update({
  source_assets_processed_at: now,
  source_assets_processed_status: deriveStatus(matched, det),
}).eq("source_pdf", sourcePdf);
```

### Idempotency

Re-running the script on the same `source_pdf` without `--force` looks up `source_assets_processed_at`. Non-null = skip (already processed). With `--force`, the script:

1. **Deletes machine-generated Phase 3 assets only**:
   ```sql
   DELETE FROM source_assets
   WHERE source_pdf = $1
     AND asset_type IN ('page_image', 'question_crop', 'expanded_question_crop')
     AND (validation_status IS NULL OR validation_status != 'admin_verified');
   ```
   Admin-verified assets (rows where a human reviewer flipped `validation_status` to `admin_verified` in the inspector UI) survive the rerun.

2. Other asset types (`figure_crop`, `answer_key_page`, etc. — owned by other phases) are NEVER touched.

3. Resets `source_assets_processed_at = null` on every quiz_questions row for the source_pdf.

4. Runs fresh.

With `--force --include-admin-verified`, the WHERE clause drops the `admin_verified` guard so EVERY Phase-3 asset for the source_pdf is rebuilt. Use sparingly; this destroys human review work.

---

## 6. How `question_bbox` cache is updated

After matching a detected question to a row:

```sql
update quiz_questions
   set question_bbox = $1::jsonb,
       question_bbox_confidence = $2,
       question_bbox_source_asset_id = $3
 where id = $4;
```

`$1` shape:

```json
{
  "y_min": 240, "x_min": 80, "y_max": 720, "x_max": 920,
  "page_width": 1700, "page_height": 2200,
  "confidence": 0.93
}
```

`$3` is the `source_assets.id` of the `question_crop` row created in step 5b-i.

The bbox is ONLY updated when a successful match is found. Orphan crops do NOT touch `quiz_questions.question_bbox` (would corrupt the data).

The fields stay null on rows that haven't been through Phase 3 yet.

---

## 7. How weak-evidence flags feed into publish-gate

`publish-gate.mjs` switches its row query to read from the new view `quiz_questions_phase3_signals`. The view exposes:

```text
source_assets_processed_at        — opt-in gate
question_crop_match_method
question_crop_match_confidence
question_crop_complete
has_question_crop
has_orphan_crops_on_page
```

Plus everything currently on `quiz_questions` itself (publish_status, import_status, grader_votes, etc.) — accessible via the view since it `select *` style.

Each new gate:

```js
export function gateMissingQuestionCrop(q) {
  if (!q.source_assets_processed_at) return null;        // opt-in
  if (q.has_question_crop) return null;
  return {
    reason: "phase3_missing_question_crop",
    suggestedStatus: "needs_human_review",
  };
}

export function gateLowCropConfidence(q) {
  if (!q.source_assets_processed_at) return null;
  if (q.question_crop_match_confidence == null) return null;
  if (q.question_crop_match_confidence >= 0.75) return null;
  return {
    reason: `phase3_low_crop_confidence=${q.question_crop_match_confidence}`,
    suggestedStatus: "needs_human_review",
  };
}

export function gateOrderedFallbackMatch(q) {
  if (!q.source_assets_processed_at) return null;
  if (q.question_crop_match_method !== "ordered_fallback") return null;
  return {
    reason: "phase3_match_method=ordered_fallback",
    suggestedStatus: "needs_human_review",
  };
}

// ... 4 more, same shape
```

`ALL_GATES` cascade order:

```text
1. gateRequiredFields                     (corrupt_question)
2. gateKaTeX                              (blocked_katex_error)
3. gateGraderVotes                        (blocked_answer_dispute)
4. gateAnswerVerification                 (blocked_answer_dispute)
5. gateAnswerKeyStatus                    (blocked_answer_dispute / needs_review)
6. gateSlug                               (blocked_slug_uncertain)
7. gateMissingVisual                      (blocked_missing_visual)
8. gateImportStatus                       (needs_human_review)
9. gateMissingSourcePage          (NEW)   (needs_human_review)
10. gateMissingQuestionCrop       (NEW)   (needs_human_review)
11. gateLowCropConfidence         (NEW)   (needs_human_review)
12. gateOrderedFallbackMatch      (NEW)   (needs_human_review)
13. gateOrphanCropsOnPage         (NEW)   (needs_human_review)
14. gateCropCountMismatch         (NEW)   (needs_human_review)
15. gateIncompleteCrop            (NEW)   (needs_human_review)
16. gateExplanation                       (needs_human_review)
```

Phase 1+2 blocking gates run FIRST so a `correction_disputed` row stays `blocked_answer_dispute` even when Phase 3 evidence is also weak.

---

## 8. Test plan

### Unit tests (Vitest — pure logic, no DB)

`src/lib/pipeline-v2/question-matcher.test.ts` — covers the 7-step matching hierarchy:

- Step 1 (page filter) — wrong page excluded.
- Step 2 (visible question number) — exact match found, wins over later steps.
- Step 3 (passage snippet) — R&W passage substring match.
- Step 4 (choice snippets) — MC with 3+ choices matching.
- Step 5 (stem snippet) — fallback to stem when passage/choices unavailable.
- Step 6 (ordered fallback) — fires only when counts match.
- Step 7 (orphan) — both fall-throughs.
- Edge: empty page (no candidates).
- Edge: page with 5 detected but 3 in DB → all become orphan or count-mismatch.

`src/lib/pipeline-v2/publish-gate-logic.test.ts` — extends with ~15 new tests:

- Opt-in (each new gate returns null when `source_assets_processed_at = null`).
- Each gate fires on its signal when opt-in is active.
- Ordering: gateMissingQuestionCrop does NOT win over gateGraderVotes.
- Ordering: gateLowCropConfidence does NOT override gateKaTeX.

### Bbox-math test

Crop-math test with the 80-px floor edge case (tiny 50×50 crop should expand to 50+160 = 210×210).

### DB verification script (live Supabase)

`scripts/v2-phase3/verify-source-asset-flow.mjs` — asserts:

1. Migration applied (new columns + view exist).
2. `parent_asset_id` FK behavior: deleting a `page_image` SETS null on child crops.
3. `quiz_questions_phase3_signals` view returns correct shape.
4. The opt-in works: insert a row with `source_assets_processed_at = null` and zero source_assets → publish-gate evaluates as if Phase 3 doesn't exist.
5. The opt-in flips: set `source_assets_processed_at = now()` on the same row with no question_crop → gateMissingQuestionCrop fires → `needs_human_review`.

### Manual smoke (one PDF end-to-end)

After merge + db-deploy, pick one PDF that's already been through Phase 1+2 in prod and:

1. `node scripts/v2-phase3/backfill-source-assets.mjs --source-pdf <name>`
2. Open `/admin/questions/preview` and click through a few questions from that PDF.
3. Verify the new Crop + Expanded chips render images.
4. Spot-check 3-5 questions in `/admin/questions/inspect/<id>` for the Source-lineage section.

### NOT tested in Phase 3

- Cross-PDF asset dedup (out of scope).
- Pages with 20+ questions (Gemini Flash output token limit may truncate; if observed, document and defer to Phase 3.5).
- Real-device-rendered crops on iPhone Safari (the existing real-device workflow from CLAUDE.md applies; defer to QA).

---

## 9. Rollback plan

Phase 3 is **additive in every direction**. Rollback steps in order of severity:

1. **Light:** revert `orchestrate.mjs` Stage 6 only (remove the call to `extract-question-crops`). Old v1 + v2 phases 1-2 continue. The new gates short-circuit on `source_assets_processed_at = null` so nothing regresses.

2. **Medium:** revert step 1 + comment out the 7 new gates in `publish-gate-logic.mjs`'s `ALL_GATES`. Pipeline operates as if Phase 3 doesn't exist.

3. **Heavy:** revert steps 1+2 + drop the new R2 prefix `question-crops/` (or just leave it; R2 storage is cheap).

4. **Schema:** the migration is additive. **Do NOT drop the new columns** during rollback — they're nullable, harmless, and removing them would risk type-mismatch errors against the shipped `src/types/supabase.ts`. The migration can be reverted in a follow-up PR after a quiet period if truly unwanted.

5. **Data:** to undo a single PDF's Phase 3 processing, run `UPDATE quiz_questions SET source_assets_processed_at = NULL, source_assets_processed_status = NULL WHERE source_pdf = '...'` and `DELETE FROM source_assets WHERE source_pdf = '...' AND asset_type IN ('page_image', 'question_crop', 'expanded_question_crop')`. The new gates immediately stop firing on those rows.

---

## 10. Risks (honest list)

### High

- **Gemini Flash output truncation on dense pages.** A page with 8+ questions might exceed Gemini's structured-output budget when the schema demands 4 booleans + passage + choice snippets per question. Mitigation: cap `maxOutputTokens` higher (8192) and log diagnostics for any page that returns fewer detections than expected. If observed in production, add a Pro escalation for high-density pages.

- **Stem collisions on R&W modules.** Even with the new hierarchy, some R&W modules have 4+ questions starting "Which choice completes the text" AND share identical passage prefixes (paragraph 1 of the same passage). Mitigation: the matcher requires ≥40-char overlap on the passage snippet; if even that collides, the ordered fallback catches it AS LONG AS counts match. If counts don't match, the questions go orphan + count_mismatch flags both.

- **Inferred question count != actual.** If the Gemini detector misses one question on a page, the count comparison flags ALL questions on that page as needs_human_review (via `gateCropCountMismatch`). This is intentional but creates a "blast radius" on bad detections. Mitigation: the per-PDF summary makes this visible; admin can re-run the script for one page with `--force` if needed.

### Medium

- **R2 storage growth.** 63 MB/PDF × 200 PDFs = 13 GB. Cheap (~$0.20/mo) but multiplied across multiple seasons + retake PDFs, could approach $5/mo before anyone notices. Mitigation: monitor via Cloudflare R2 dashboard; alert at 100 GB.

- **`question_bbox` cache drift.** If an admin manually edits `source_assets` via the inspector (not yet shipped), the cache on `quiz_questions` becomes stale. Mitigation: document the cache, point admin tooling at source_assets when truth matters.

- **View materialization cost.** `quiz_questions_phase3_signals` runs a lateral subquery per row. Fast for hundreds of rows; could slow down at thousands. Mitigation: add a real materialized view in Phase 3.5 if observed.

### Low

- **Page-render lib's pdftoppm path.** If GitHub Actions installs a different Poppler version than my local Mac, file naming patterns differ slightly. Existing scripts work around this; the new lib does too.

- **Backfill script vs concurrent pipeline run.** If an operator runs the backfill on a PDF that's currently being processed by the live pipeline, both could write to `source_assets` simultaneously. Mitigation: backfill checks `pdf_processing_jobs.status` first and bails if `running`.

- **Match-confidence numeric drift.** I'm hardcoding 0.95, 0.90, etc. If we change these constants in a follow-up, old rows' confidence values become stale. Mitigation: also store the actual scoring signals in `raw_metadata` so the DB still has the evidence even if the named confidence changes.

---

## Estimated effort

| Block | Hours |
| --- | --- |
| Migration + types | 1 |
| `page-render.mjs` + `question-matcher.mjs` + tests | 2 |
| `extract-question-crops.mjs` (incl. prompt + crops + DB) | 3 |
| Publish-gate gates + tests | 1 |
| Orchestrator integration | 0.5 |
| Backfill script + verification script | 1 |
| Manual smoke + PR write-up | 1.5 |
| **Total** | **~10 hours** |

Slightly above the original Phase 2 effort (~5-8h) because of the matcher complexity and the new view + opt-in plumbing.

---

## Open questions for final sign-off

1. **Opt-in marker column on `quiz_questions` — do you want a single `source_assets_processed_at TIMESTAMPTZ` or both that AND a `source_assets_processed_status` text?** I've drafted both in §1.5 of the spec; happy to drop the `_status` column if you'd rather keep the surface smaller.

2. **The `source_pdf` column on `source_assets` is being used as a join key in the view.** Currently `source_pdf` is just an unindexed denormalized text column. Phase 1 added `source_assets_pdf_page_idx` on `(source_pdf, page_number)` — that's the index the view uses. Confirming this is enough.

3. **`--force` semantics on `extract-question-crops.mjs` — do you want it to delete ALL existing crops for that source_pdf (including human-verified ones), or just unprocessed/orphan ones?** Currently spec'd as "delete + redo from scratch," safer alternative is "skip rows whose asset was admin-verified."
