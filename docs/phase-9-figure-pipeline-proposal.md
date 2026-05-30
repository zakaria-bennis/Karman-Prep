# Phase 9 — Image-to-Figure Pipeline (Revised Plan)

**Status:** Approved architecture, sub-phased implementation plan locked.
**Last revised:** 2026-05-28 after ChatGPT design review.
**Authors:** Product owner + Claude + ChatGPT (collaborative iteration).

---

## Project context

Karman Prep is a pre-launch SAT prep platform. The pipeline ingests official SAT practice PDFs, extracts every question, verifies the answer key with a multi-vote AI panel, generates detailed explanations, and publishes the question to students.

Today's pipeline (14 stages) stores figures only as PNG screenshots cropped from PDF pages, rendered as plain `<img>`. Phase 9 turns those screenshots into structured embedded representations — HTML tables, custom SVG charts, etc. — with screenshots as a graceful fallback when extraction is uncertain.

---

## Architecture (approved by both reviewers)

```
PNG figure crop (from Stage 2)
  →  classify figure type (cheap)
  →  extract structured JSON (typed by figure_kind)
  →  validate (schema + visual)
  →  if validated: deterministic renderer emits HTML/SVG
  →  if not validated: screenshot fallback + question_findings entry
```

**The vision LLM emits structured JSON, NEVER raw SVG.** Deterministic JS renderers turn the JSON into HTML/SVG. This protects against malformed SVG path syntax, enforces SAT-style visual consistency, and makes accessibility/print metadata easier to enforce.

---

## Critical placement decision

**Phase 9 runs POST-IMPORT as enrichment, not pre-import as a gate.**

```
Stages 1–6  (extract → crop → import → answer-key → question-crops → visual relevance)
       ↓
🆕 Stage 6.5 — Phase 9 Figure Structure Enrichment
       ↓
Stages 7–14 (math repair → verify → eligibility → fill → qa → audit → katex → publish)
```

The question row exists with screenshot fallback BEFORE Phase 9 runs. This is structurally safer because:

1. A failed structured extraction never blocks question existence
2. `question_findings` entries from Phase 9 can attach to a real `quiz_questions.id`
3. The publish-gate at Stage 14 can read Phase 9's `figure_quality` field as one signal among many
4. Geometry/3D can store extraction attempts as admin-tool data while students see screenshots

If structured extraction fails (low confidence, schema validation fail, perceptual hash diverges), the screenshot is the safe default — the failure mode is explicit, not silent.

---

## Sub-phases (strict order)

Each sub-phase is its own PR. Don't start the next until the previous is shipped, tested on real PDFs, and the failure modes are understood.

### Pre-9A — Benchmark (this PR's pre-work)

Build a 20-40 figure test set from existing source_assets crops. Compare:

- **Gemini 2.5 Flash** (cheap classifier candidate)
- **Gemini 2.5 Pro** (potentially strong on spatial / axis / chart extraction)
- **Claude Sonnet 4.6 vision** (strong on schema-following)

Evaluate per type:

- Table row/column accuracy
- Chart data point + axis label accuracy
- Coordinate graph key-point extraction
- Geometry label/angle/length extraction
- JSON validity rate
- Cost per call
- Latency

Output: documented findings + per-type model recommendations. Locks model choice for 9A onward.

### Phase 9A — Tables

- Classify candidate figures
- Extract `{ headers, rows, caption? }` JSON via the chosen extractor
- Render as native HTML `<table>` (not SVG) for accessibility + responsive behavior
- Schema-validate: row count, column count, header presence, cell completeness
- Visual-validate: render HTML to image, perceptual hash compare to original screenshot
- Fallback to screenshot on any validation failure + write `figure_coherence` finding

### Phase 9B — Simple charts

- Bar, line, scatter, boxplot (pie chart deferred until 9B+1)
- Custom SAT-style SVG chart renderers (not Recharts — preserves booklet aesthetic)
- Schema validation: chart type matches classification, axis labels present, data point count plausible, values align with visible tick marks within tolerance

### Phase 9C — Coordinate graphs

- Function plots (`y = f(x)`) and plotted-point graphs
- Stricter validation because math-sensitive (axis scale, intercepts, asymptotes, key points)
- Custom SVG renderer with SAT-style grid + axes

### Phase 9D — Geometry (extraction stored, screenshot rendered)

- Run structured JSON extraction on triangles, quadrilaterals, circles, line segments with angle/length markings, composed shapes
- Store the structured data in `figure_geometry_data` for admin tooling
- **Student-facing figure stays as screenshot until v2** — clean-looking wrong geometry is more dangerous than a real screenshot
- Admin UI surfaces "we attempted extraction, here's what we got" for verification

### Phase 9E — 3D shapes & nets (extraction stored, screenshot rendered)

- Same pattern as 9D
- Cubes, cylinders, cones, spheres, pyramids (triangular/rectangular/square), nets of any of the above

---

## Architectural decisions (locked)

### Decision 1: Structured JSON → deterministic renderer (NOT LLM-emitted SVG)

**Why:** LLM-emitted SVG drifts in path syntax, label placement, viewBox behavior, and styling. Deterministic renderers are better for consistency, accessibility, and SAT-style visual fidelity.

### Decision 2: SVG only, NOT Desmos embed

**Why:** Desmos can solve some SAT problems directly (cheating risk). Aesthetically, Desmos doesn't match the printed booklet. Static SVG is the v1 implementation. Revisit only under a separate "study mode" feature.

### Decision 3: Hybrid known-enum + "other" fallback

**Why:** The shape enums (geometric kind, 3D kind, chart subtype) are empirical, not exhaustive. Real SAT PDFs will surface shapes we didn't anticipate.

- Every enum supports `"other"`
- When `"other"`: capture `model_called_it_a: string` and `attempted_structured_data` (best-effort)
- Use screenshot fallback for rendering immediately
- Write `question_findings` entry: `category: figure_coherence`, `code: unknown_figure_type`, `severity: NOTICE` (if screenshot fallback is clean) or `WARNING` (if fallback also looks degraded)
- Admin periodically reviews. When patterns emerge (e.g., 8 PDFs all flagged "regular hexagon"), promote to first-class kind with a renderer, then reprocess flagged questions

### Decision 4: Schema validation + visual validation (NOT just perceptual hash)

**The pitfall to avoid: "clean-looking wrong figures."**

A wrong structured chart can still look visually similar to the source. Examples:

- Table missing one row
- Bar chart with one bar height slightly wrong
- Scatter plot with a point off by one grid unit
- Chart label transcribed incorrectly

Therefore validation runs **both**:

**Visual validation:**

- Render structured output to PNG at expected display size
- Perceptual hash compare to original screenshot (Hamming distance threshold)
- Check label legibility at 3 sizes (mobile / tablet / desktop)

**Schema validation per type:**

- **Tables:** row count, column count, header presence, non-empty cells where expected, caption if visible
- **Charts:** type matches classification, axis labels present when visible, data point/bar count plausible, values align with tick marks within tolerance, legend count plausible
- **Coordinate graphs:** axes, tick scale, origin, intercepts, plotted point count, expression matches visual trend, asymptotes if present
- **Geometry:** point labels, angle/length labels, right-angle markers, tick marks, parallel markings (conservative — most uncertainty here)

**If schema fails:** screenshot fallback + finding written. Don't ship structured output just because it renders successfully.

### Decision 5: Multi-level fallback chain with full diagnostic capture

**Render priority order:**

1. Validated structured representation
2. R2 `figure_crop` (current behavior)
3. R2 `expanded_question_crop` (already produced by Stage 5)
4. Full page screenshot at the question's `source_page`

**Critical rule:** **Don't silently move down the fallback chain.** Every fallback decision is logged:

```typescript
figure_quality = {
  validation_status: 'structured_failed_schema_validation' | 'structured_validated' | 'structured_failed_visual_match' | 'no_extraction_attempted',
  used_fallback_level: 'structured' | 'figure_crop' | 'expanded_question_crop' | 'page_image',
  fallback_reason: string,  // e.g. "chart_data_point_count_mismatch"
  hash_distance: number | null,
  schema_validation_errors: string[],
  model: string,  // which extractor was tried
  last_validated_at: string,
};
```

### Decision 6: Deterministic complexity from extracted JSON (NOT LLM judgment)

```typescript
function deriveComplexity(figure): "simple" | "medium" | "dense" {
  const elementCount = countShapes(figure) + countLabels(figure);
  if (elementCount < 5) return "simple";
  if (elementCount < 12) return "medium";
  return "dense";
}
```

The LLM can provide a hint, but deterministic derivation from extracted structure is the source of truth for renderer sizing.

### Decision 7: Two-call pattern (classify + extract)

For v1: separate calls.

**Why:** Schemas are very different across tables, charts, graphs, geometry, 3D. A single giant schema with discriminated union reduces structured-output reliability.

**Future optimization:** for high-confidence classification of simple types (tables, bar charts), experiment with one-call combined extraction.

### Decision 8: Custom SAT-style SVG chart renderers (NOT Recharts)

**Why:**

- Recharts looks like web analytics, not a printed test booklet
- ~100 KB gzipped adds to mobile bundle
- Chart types in scope are simple enough to render minimally ourselves
- Custom lets us enforce SAT-style strokes, fonts, grayscale-safe colors, tick marks, print behavior

If Recharts is already in the bundle for another reason, reconsider. Otherwise skip.

### Decision 9: Tables = HTML, not SVG

**Why:** Accessibility (`<th scope>`, `<caption>`), responsive layout, screen readers, copy/paste, printing, manual edit. HTML is strictly better than SVG for table rendering.

### Decision 10: Don't ship perceptual-hash caching in v1

At our scale (hundreds of PDFs, not millions), cost is manageable. Bad cache hits (same hash, different content) are dangerous. Add as a strict-threshold optimization later if needed.

---

## Database changes

| Column                    | Type  | Purpose                                                                                      |
| ------------------------- | ----- | -------------------------------------------------------------------------------------------- |
| `figure_table_data`       | JSONB | (exists) — table rows + headers                                                              |
| `figure_chart_data`       | JSONB | (exists) — chart type + data                                                                 |
| `figure_graph_data`       | JSONB | **NEW** — coordinate graphs (separate from charts to avoid overloading)                      |
| `figure_geometry_data`    | JSONB | **NEW** — geometric figures + 3D shape structured extraction                                 |
| `figure_svg`              | TEXT  | **NEW** — validated deterministic SVG render (for graphs / geometry when published)          |
| `figure_quality`          | JSONB | **NEW** — validation diagnostics (see Decision 5)                                            |
| `figure_extraction_model` | TEXT  | **NEW** — which model produced the structured data (for benchmarking + future migrations)    |
| `figure_kind`             | enum  | (exists) — extend enum: `image \| table \| chart \| graph \| geometric \| 3d_shape \| other` |

Migration applied in **Pre-9A**.

---

## Accessibility (designed from day one, not retrofit)

**All structured figures produce:**

- `<title>` element with figure description
- `<desc>` element with longer description
- `aria-label` or `aria-labelledby` on the wrapper
- `role="img"` for SVG
- Summary text for chart/table data (screen reader)
- Description stored in `figure_quality.alt_text` (replaces `image_alt`)

**Tables:**

- `<th scope="col">` and `<th scope="row">` where appropriate
- `<caption>` with figure label
- High contrast cell borders

**SVG:**

- `<title>` and `<desc>` first children
- All text visible (no color-only meaning)
- Contrast ratio ≥ 4.5:1 against background
- Print-safe colors (grayscale-readable)

---

## Print styling (built in from day one)

```css
@media print {
  .figure-wrapper {
    page-break-inside: avoid;
    max-width: 100%;
  }
  /* fallback to image render if SVG print is unreliable on target browser */
  .figure-svg {
    /* ensure stroke + text are visible on print */
  }
  .figure-table {
    /* visible borders, no horizontal scroll */
  }
}
```

---

## Cost estimate (revised, scope-narrowed)

**Phase 9A (tables only):**

- Classify: 10 × $0.001 = $0.01
- Extract tables: 2 × $0.10 = $0.20
- Validation: ~$0.05
- **~$0.26 per PDF added**

**Phase 9A + 9B (tables + simple charts):**

- - Extract charts: 3 × $0.15 = $0.45
- **~$0.75 per PDF added**

**Full Phase 9A-9E (eventually):**

- ~$1.75 per PDF added

Existing pipeline cost: ~$5-7 per PDF.

---

## Test plan (per sub-phase)

Each sub-phase ships with:

- **Vitests for the deterministic renderer** (given JSON, emit expected HTML/SVG)
- **Vitests for schema validation** (given JSON, return expected validation errors)
- **Smoke test on 5-10 real figures** from existing source_assets
- **At least one manual test** on a known-bad extraction to confirm fallback fires correctly
- **figure_quality.validation_status** distribution check on a real PDF run

---

## Open items deferred to implementation

1. **`figure_render_status` column?** ChatGPT suggested it; need to decide if `figure_quality.used_fallback_level` covers the same ground (probably yes; resolve in 9A).
2. **Pie chart deferred until 9B+1.** Lower priority than bar/line/scatter.
3. **Animated figures (none on SAT)** — not a concern; skip entirely.

---

## What we deliberately punted

- **3D interactive rendering (Three.js)** — overkill for SAT. Screenshot or static SVG net is fine.
- **Multi-stage figure assembly** (e.g., "this question has a figure AND a table") — handle by running extraction on each region separately. Schema doesn't change.
- **Cross-PDF figure deduplication** — at our scale, not worth it. Figures rarely repeat exactly.
- **Figure A/B testing across renderer versions** — research feature, not v1.

---

## What's in this PR (Pre-9A pre-work)

This PR introduces the benchmark scaffold for Pre-9A. It does NOT implement extraction or rendering yet. Specifically:

- `scripts/v2-phase9/benchmark-figure-extraction.mjs` — runs the same figure crop through Gemini Flash + Gemini Pro + Sonnet vision, captures responses, saves report
- `scripts/v2-phase9/README.md` — how to run benchmarks + interpret results
- `docs/phase-9-figure-pipeline-proposal.md` — this revised plan

Future PRs handle actual extraction + rendering per sub-phase.

---

## Sign-off

- ✅ Product owner approved scope, sub-phasing, screenshot-first geometry/3D
- ✅ ChatGPT reviewed (2026-05-28) — all major recommendations incorporated
- ✅ Claude synthesized + locked plan

Ready to start Pre-9A benchmark execution.
