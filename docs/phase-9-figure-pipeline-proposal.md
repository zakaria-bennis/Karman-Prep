# Phase 9 — Image-to-Figure Pipeline (Design Proposal)

**Document purpose:** Design review by ChatGPT. The product owner and I (Claude) have iterated on this design through several rounds of refinement. This document captures the current proposed pipeline. We want ChatGPT to challenge architecture decisions, suggest alternatives, and flag risks we haven't surfaced.

**Status:** Proposal, not yet implemented. Phase 9 of the larger pipeline-v2 redesign.

---

## Project context

Karman Prep is a pre-launch SAT prep platform. The pipeline ingests official SAT practice PDFs, extracts every question, verifies the answer key with a multi-vote AI panel, generates detailed explanations, and publishes the question to students.

The existing pipeline has **14 stages**. Phase 9 inserts a new stage between the current Stage 2 (figure cropping) and Stage 3 (DB import). Currently, figures are stored only as PNG screenshots and rendered as plain `<img>` tags. The Phase 9 goal: turn those screenshots into the best possible **embedded representations** for each figure type, with screenshots as a graceful fallback.

---

## Goal

Convert cropped PNG screenshots of SAT figures into structured, embeddable representations that:

1. **Look like the SAT booklet** — static, paper-test-like aesthetic. Students taking the real test see static printed figures; our app should match that experience.
2. **Are responsive** — scale cleanly from mobile (375px) to desktop (1440px) while staying readable.
3. **Are accessible** — screen-reader compatible, print-friendly, work offline.
4. **Are robust** — every figure must render SOMETHING; if structured extraction fails, fall back to the screenshot.
5. **Improve over time** — when the system encounters figure types we haven't anticipated, surface them as findings rather than silently failing.

---

## Current state

| Layer            | What exists today                                                                                                                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pipeline Stage 2 | Renders PDF page to PNG via `pdftoppm` + Gemini Flash bbox detection + `sharp` for cropping. Uploads PNG to R2 with public URL.                                                                                                               |
| Schema           | `quiz_questions.figure_kind` enum (`image \| table \| chart \| svg`) exists but is rarely set. `figure_table_data` JSONB and `figure_chart_data` JSONB columns exist but are empty in practice. `image_url` is populated with the R2 PNG URL. |
| Admin UI         | `ChartFigureEditor.tsx` exists for manual data entry; no automated pipeline pass fills the structured columns.                                                                                                                                |
| Fallback         | Today there is no fallback chain. If the R2 crop is bad, the question shows a bad crop.                                                                                                                                                       |

**Translation: today's pipeline produces screenshots only.** Everything more sophisticated is manual via admin UI.

---

## Figure types (refined by product owner)

The product owner has explicitly stated SAT figures fall into these categories. **Generic photos do NOT appear on the SAT.** The categorization is empirical (what they've seen), not exhaustive — see "unknown handling" below.

### Tables

- Data rows + column headers
- Variable number of columns (typically 2-6)

### Charts

- **Bar chart** (vertical / horizontal)
- **Line chart**
- **Pie chart**
- **Scatter plot**
- **Boxplot** (a.k.a. box-and-whisker; explicitly called out by product owner)
- Other types may exist but are rare

### Graphs (mathematical)

- Function plot on coordinate plane (e.g., y = x² + 2x)
- Plotted points on coordinate plane (specific (x,y) markers)
- May include axis labels, grid, asymptotes, intercepts

### Geometric figures (2D)

- **Single shapes:** triangle, quadrilateral (square, rectangle, parallelogram, trapezoid, rhombus), circle
- **Composed shapes:** two triangles sharing an edge or vertex (similar triangles, transversals)
- **Annotation patterns:** line segments with angle markings (degree measures, right-angle markers) and length markings (tick marks, numerical labels)
- **Point labels:** A, B, C, etc.

### Static 3D shapes

- Cube, rectangular prism
- Cylinder, cone, sphere
- Pyramids: triangular, rectangular, square
- Nets of any of the above (unfolded 2D representation)
- Circles in 3D context (e.g., cross-sections of spheres or cylinders)

---

## Proposed pipeline architecture

### New Stage 2.5 — Figure Structure Extraction

Runs after Stage 2 (figure crop, produces R2 PNG) and before Stage 3 (DB import). One pass per figure.

#### Step 1 — Classify (cheap)

- **Input:** cropped PNG (from R2) + question text context
- **Model:** Gemini 2.5 Flash (chosen for cost; ~$0.001 per call)
- **Output:**
  ```typescript
  {
    figure_kind: 'table' | 'chart' | 'graph' | 'geometric' | '3d_shape' | 'other',
    chart_subtype?: 'bar' | 'line' | 'pie' | 'scatter' | 'boxplot' | 'other',
    classification_confidence: number,  // 0-1
    model_called_it_a: string,  // free-form description for unknown cases
  }
  ```
- If `classification_confidence < 0.7` → escalate to Sonnet vision for second opinion

#### Step 2 — Extract structured data (branch by type)

Each figure_kind has its own extractor that emits a structured JSON schema (NOT raw SVG). Detail by type:

| Type                   | Model                 | Output schema (key fields)                                                                                                           |
| ---------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| table                  | Sonnet 4.6 vision     | `{ headers: string[], rows: string[][], caption?: string }`                                                                          |
| chart                  | Sonnet 4.6 vision     | `{ type, data: [{x,y,label?}], axes: {x_label, y_label, x_unit, y_unit}, legend?: [...] }`                                           |
| graph (function)       | Sonnet 4.6 vision     | `{ type: 'function', expression: string, x_range: [num, num], y_range: [num, num], asymptotes?: [...], key_points?: [{x,y,label}] }` |
| graph (plotted points) | Sonnet 4.6 vision     | `{ type: 'plotted_points', points: [{x,y,label?}], axes: {...} }`                                                                    |
| geometric              | Sonnet 4.6 vision     | See "Geometric schema" below                                                                                                         |
| 3d_shape               | Sonnet 4.6 vision     | See "3D schema" below                                                                                                                |
| other                  | (skip — use fallback) | n/a                                                                                                                                  |

#### Geometric schema (designed to handle product owner's examples)

```typescript
type GeometricFigure = {
  shapes: Array<
    | { kind: "triangle"; vertices: [Point, Point, Point]; labels?: [string, string, string] }
    | {
        kind: "quadrilateral";
        vertices: [Point, Point, Point, Point];
        kind_hint?: "square" | "rectangle" | "parallelogram" | "trapezoid" | "rhombus";
      }
    | { kind: "circle"; center: Point; radius: number; label?: string }
    | { kind: "line_segment"; start: Point; end: Point; length_label?: string }
    | { kind: "point"; position: Point; label: string }
    | { kind: "other"; model_called_it_a: string; attempted_structured_data?: object }
  >;
  angle_markings: Array<{ at_vertex: string; measure: string | null; right_angle: boolean }>;
  length_markings: Array<{ on_segment: [string, string]; value: string }>;
  relationships?: Array<
    | { kind: "shared_edge"; between: [number, number]; edge: [string, string] }
    | { kind: "similar_triangles"; triangles: [number, number] }
    | { kind: "parallel_lines"; segments: Array<[string, string]> }
  >;
};
```

This handles "two triangles linked," "line with angle markings and length," and quadrilaterals explicitly.

#### 3D shape schema

```typescript
type ThreeDFigure = {
  kind:
    | "cube"
    | "rectangular_prism"
    | "cylinder"
    | "cone"
    | "sphere"
    | "triangular_pyramid"
    | "rectangular_pyramid"
    | "square_pyramid"
    | "net"
    | "other";
  net_of_kind?: string; // when kind is 'net', what 3D shape is it the net of
  dimensions: Record<string, number | string>; // e.g. {height: 5, radius: 2} or {side: 'x'}
  labeled_dimensions: Array<{ label: string; value: string; axis: "h" | "r" | "l" | "w" | "d" }>;
  view_angle?: "isometric" | "front" | "top" | "oblique";
  model_called_it_a?: string; // for kind: 'other'
};
```

#### Step 3 — Render to SVG via deterministic JS renderers (NOT vision LLM)

The vision LLM emits structured JSON only. A custom JS renderer turns each schema into SVG.

**Two reasons this is safer than asking the LLM to emit SVG directly:**

1. LLMs are inconsistent at well-formed SVG path syntax — geometric figures with `<path d="...">` are particularly fragile
2. Style consistency: every triangle renders with the same stroke width, font, color. No drift across the bank.

Per-type renderers:

- `renderTable(tableData) → HTML <table>` (not SVG — native HTML for accessibility + responsive)
- `renderChart(chartData) → React component using Recharts or D3` (renders to SVG via the library)
- `renderFunctionGraph(graphData) → SVG with grid + axes + function plot`
- `renderGeometric(geometricData) → SVG with strokes, arcs, labels, angle markers`
- `render3DShape(threeDData) → SVG isometric projection`

#### Step 4 — Validate (cheap, prevents hallucinated structure)

After rendering, validate:

1. **Re-render the structure to PNG** at expected display size (~600px wide)
2. **Compute perceptual hash** of the rendered PNG using `sharp` + average-hashing (existing code in `visual-relevance-logic.mjs`)
3. **Compare to original screenshot's perceptual hash**
4. **If Hamming distance > 8 (out of 64-bit hash):**
   - Flag `figure_quality.validation_failed = true`
   - Use fallback (screenshot) at render time
   - Write a `question_findings` entry for admin review

5. **Render at 3 sizes (mobile / tablet / desktop) and verify text legibility:**
   - All text labels ≥ 11px after scaling
   - Nothing clipped by viewBox
   - If any size fails → flag `figure_quality.size_issue`

#### Step 5 — Write to DB

Update `quiz_questions`:

- `figure_kind` (refined)
- `figure_table_data` / `figure_chart_data` / `figure_svg` (NEW column for geometric + 3D SVG strings)
- `figure_quality` (NEW JSONB column: `{ validation_status, hash_distance, used_fallback_level, last_validated_at }`)
- Keep `image_url` populated (R2 crop) for fallback

---

## Architectural decisions (already made by product owner)

### Decision 1: SVG only, NOT Desmos embeds for graphs

Product owner explicitly rejected Desmos iframe embeds.

**Reasoning:**

- **Cheating concern:** Desmos can solve some SAT problems directly when given the function
- **Aesthetic mismatch:** Desmos interactive graphs don't look like SAT booklet's static printed graphs; students should study with the same visual style they'll see on test day
- **Network dependency:** Iframes take ~500ms to load; SVG inline is instant
- **Print/offline:** SVG works everywhere; Desmos requires connectivity
- **Self-contained:** SVG saves with the question; Desmos URL points to external service

Static SVG is the v1 implementation. Desmos may be revisited later under a separate "study mode" feature.

### Decision 2: Hybrid model for unknown figure types

Product owner explicitly stated: "The shape lists aren't exhaustive — there's a chance I might have not listed every single possible geometric figure or 3D model. If they don't fit exactly, it's not the end of the world, but it should be a sign that maybe there's an issue."

**Implementation:**

- Every `kind` enum supports an `"other"` variant
- When `"other"` is picked:
  - `model_called_it_a: string` captures the model's free-form description
  - `attempted_structured_data` captures best-effort extraction
  - Fallback rendering immediately uses the R2 screenshot (deterministic renderer doesn't know how to draw it)
  - A `question_findings` entry is written: `category: 'figure_coherence'`, `code: 'unknown_figure_type'`, `severity: 'NOTICE'`
- Admin periodically reviews `WHERE code = 'unknown_figure_type'`
- When a pattern emerges (e.g., 8 PDFs all flagged "regular hexagon"), promote it to a first-class shape with a renderer, then reprocess just the flagged questions

This makes the system **self-improving** rather than failing-closed on new shapes.

### Decision 3: Fallback chain (multi-level)

Product owner explicitly stated: "Be cautious of just using the R2 pictures, because we need to also have a fallback of using the full page screenshots in case the R2 pictures are ever cropped."

**Render priority order:**

1. Structured data (table_data / chart_data / figure_svg) — best UX
2. R2 `figure_crop` (existing) — current behavior
3. R2 `expanded_question_crop` (already produced by Stage 5, wider crop with more context)
4. Full page screenshot at the question's `source_page` (already in `source_assets` as `asset_type: page_image`)

The pipeline writes ALL four representations. Frontend code consumes the hierarchy and shows the highest-quality available.

### Decision 4: Sizing strategy

Foundation: every SVG uses `viewBox` + CSS `width: 100%; height: auto;` for responsive scaling.

**Per-type aspect ratios + max-widths:**

| Type             | Default aspect | Max width (desktop) | Mobile behavior                          |
| ---------------- | -------------- | ------------------- | ---------------------------------------- |
| Table            | flex           | 100% container      | horizontal scroll if cols > 4            |
| Bar / line chart | 16:10          | 600px               | full width, labels rotate 45° if cramped |
| Pie chart        | 1:1 (square)   | 400px               | shrink to 80% screen width               |
| Boxplot          | 8:3 (wide)     | 600px               | stack vertically if multi-series         |
| Scatter plot     | 1:1 or 4:3     | 500px               | full width                               |
| Geometric        | 1:1 (square)   | 400px               | center, full width on mobile             |
| 3D shape         | 4:3 isometric  | 350px               | center, 75% screen width on mobile       |
| Net of 3D shape  | wider (varies) | 600px               | horizontal scroll if needed              |

**Complexity-based sizing:** During extraction, the vision LLM emits a `display_complexity` score (`simple | medium | dense`). The renderer uses this to pick min-render-size:

- simple → 200-300px wide
- medium → 400-500px wide
- dense → 600px wide

**Text legibility:** CSS `clamp(11px, 2.5vw, 16px)` on label font-sizes ensures readability on small screens even when SVG scales down.

**Smart label placement:** Each text element tagged with role (`vertex_label`, `axis_label`, etc.). Renderer can auto-rotate, abbreviate with tooltips, or stack as needed per type.

---

## Cost estimate (per PDF)

Assumes ~10 figures per PDF with mixed types:

| Step                                               | Cost per PDF |
| -------------------------------------------------- | ------------ |
| Classification (Gemini Flash, 10 calls)            | $0.01        |
| Table extraction (Sonnet vision, ~2)               | $0.20        |
| Chart extraction (Sonnet vision, ~3)               | $0.45        |
| Graph SVG extract (Sonnet vision, ~2)              | $0.30        |
| Geometric structured extract (Sonnet vision, ~3)   | $0.45        |
| 3D structured extract (Sonnet vision, ~1)          | $0.15        |
| Validation (sharp + perceptual hash, compute only) | $0.20        |
| **Total per PDF added**                            | **~$1.75**   |

Existing pipeline cost: ~$5-7 per PDF. Phase 9 brings total to ~$7-9 per PDF.

---

## Build order (priority within Phase 9)

1. **Tables** — highest ROI, common type, vision LLMs are SOTA at structured table extraction
2. **Charts including boxplots** — common, structured data unlocks responsive rendering
3. **Graphs with SVG renderer** — combines static visual + future Desmos button option
4. **Geometric figures with structured JSON → deterministic renderer** — the architectural pattern that protects against SVG hallucination
5. **3D shapes** — last, rarest in SAT content, screenshot fallback acceptable for v1

---

## Questions for ChatGPT (in priority order)

### 🔴 High value to challenge

#### 1. Vision LLM choice for structured extraction

I picked **Sonnet 4.6 vision** because it's already in the pipeline and strong at structured output. But for the SPECIFIC task of emitting clean JSON schemas from figure images, ChatGPT may have evidence that **GPT-4o vision** or **Gemini 2.5 Pro** is measurably better at:

- Table row/column structure
- Chart data point extraction
- Geometric vertex/angle extraction with labeled points

Is there published benchmark data? Real-world experience? Would you switch the model for any of the figure types specifically?

#### 2. Deterministic renderer pattern (vs LLM-emitted SVG)

My proposed architecture: **vision LLM emits structured JSON → custom JS renderer emits SVG.** This protects against malformed SVG from the LLM and ensures style consistency.

Counter-argument: for SAT figures specifically, the schema might be too narrow. If a question shows a Reuleaux triangle (not in any enum), the structured pattern degrades to `"other"` + screenshot fallback. An LLM emitting SVG directly could handle it via best-effort SVG.

**Is the deterministic renderer pattern correct here?** Or should we accept some SVG hallucination + heavy post-render validation?

#### 3. The "other" + question_findings escape hatch — alternatives

Three patterns considered:

1. **Strict failure** (reject and ask human to label) — too brittle for scale
2. **Free-form classification** (no enum, model classifies freely) — chaotic, no rendering path
3. **`"other"` + finding** (current proposal) — works gracefully, self-improving
4. **Hybrid:** known enum for renderer, free-form `model_called_it_a` string for log + finding — combines clean rendering with rich classification context

**Product owner approved Hybrid (#4).** ChatGPT: does this match production patterns you've seen for similar self-improving classifiers? Any pitfalls?

### 🟡 Medium value to challenge

#### 4. Complexity score reliability

Can Sonnet vision consistently classify `simple | medium | dense` for figures? I worry this is the kind of subjective judgment LLMs are inconsistent on.

**Alternative:** derive complexity DETERMINISTICALLY from the extracted JSON:

```typescript
function deriveComplexity(figure): "simple" | "medium" | "dense" {
  const elementCount = countShapes(figure) + countLabels(figure);
  const aspectRatio = figure.bbox.width / figure.bbox.height;
  if (elementCount < 5) return "simple";
  if (elementCount < 12) return "medium";
  return "dense";
}
```

Which approach is better? Vision LLM judgment, or deterministic derivation from extracted structure?

#### 5. Single LLM call vs separate classification + extraction

Two-call pattern (cls then extract) is what I proposed: more reliable structured output, but doubles latency + adds ~10% cost.

One-call pattern (combined cls + extract in one prompt) is cheaper + faster, but structured output quality typically degrades when the schema gets wide.

For this specific use case, which is better?

#### 6. Pipeline placement: sync vs async

I placed Phase 9 BETWEEN Stage 2 (crop) and Stage 3 (DB import). Synchronous: the pipeline waits.

**Alternative:** run Phase 9 ASYNCHRONOUSLY after Stage 3, populating structured fields lazily. PDF can be partially published with screenshot-only figures while structured extraction runs in the background.

Trade-offs:

- Sync: simpler reasoning, all-or-nothing per PDF, but slower wall-clock for each PDF
- Async: faster perceived publishing, but more complex error recovery, and admins might publish before structured data lands

For this product (SAT prep, no urgent time-to-publish requirement, quality > speed) — sync seems right. Confirm?

### 🟢 Lower priority

#### 7. Caching across PDFs

SAT practice tests sometimes reuse figures with slight modifications. Should we cache figure extractions keyed on perceptual hash? Probably **not worth it** at this scale (~hundreds of PDFs lifetime, not millions). Worth confirming.

#### 8. Admin override workflow

Existing `ChartFigureEditor.tsx` allows manual data entry. After Phase 9, should it:

- Default to AI extraction with admin review checkbox (my pick)
- Admin-first with AI as "suggest" button
- AI-only, admin can correct after publish

#### 9. Print stylesheet considerations

Are there print-specific issues with SVG that I should design for now? Page-break behavior, color → grayscale degradation, etc.?

---

## Risks I'd want ChatGPT to flag

1. **Hallucinated structure.** Vision LLM extracts a table with the wrong row count. Validation step catches some of this, but how often does validation also fail (false positive: extraction wrong AND looks similar to original)? Need real-world measurement.

2. **Cost at scale.** $1.75/PDF × 1000 PDFs = $1750. Manageable but real. Is there a cheaper way to handle the obvious-table case (large fraction of figures)?

3. **Recharts library size on bundle.** Adding Recharts to the frontend adds ~100KB gzipped. Affects mobile load time. Worth it for chart fidelity? Or roll our own minimal SVG chart renderer?

4. **Rendering parity vs SAT booklet.** Recharts looks slightly different from the SAT booklet's chart style. Acceptable, or does fidelity to the original matter for student recognition (i.e., when they see this on the real test, they should immediately recognize the same visual)?

5. **Accessibility of the deterministic renderers.** SVGs need proper ARIA labels, `<title>` elements, `<desc>` elements. Not free — needs to be designed in from the start.

6. **Admin time cost of reviewing "unknown_figure_type" findings.** If 30% of figures get classified as "other" in early runs, that's a huge review queue. Should we set a confidence threshold for promoting "other" → screenshot-only with minimal review?

---

## What I'm asking from ChatGPT

For each of the high-value questions (1-3 in particular), please:

1. **Take a position.** Don't say "it depends." Be specific.
2. **Cite evidence where possible** — benchmark studies, published model comparisons, your own production experience.
3. **Flag pitfalls** I haven't surfaced.
4. **Suggest concrete refinements** to the design above.

After ChatGPT's review, I'll incorporate feedback and turn this into an actual implementation plan for the Phase 9 pipeline.

---

## Appendix: file paths in the existing pipeline (for context)

- `scripts/pdf-pipeline/extract-figures.mjs` — Stage 2 figure cropping (current)
- `scripts/pdf-pipeline/classify-visual-relevance.mjs` — Phase 4 relevance classification
- `scripts/lib/visual-relevance-logic.mjs` — perceptual hash code (reusable for validation)
- `scripts/lib/findings.mjs` — question_findings helpers
- `src/types/supabase.ts` — schema types for quiz_questions
- `src/components/admin/ChartFigureEditor.tsx` — existing admin UI

Refactoring needed if Phase 9 is approved:

- New `scripts/pdf-pipeline/extract-figure-structure.mjs` (Stage 2.5)
- New `src/lib/figure-renderers/` directory with one renderer per type
- New columns: `figure_svg TEXT`, `figure_quality JSONB`
- Updated orchestrator to insert Stage 2.5 after Stage 2

---

**End of proposal.** Ready for ChatGPT review.
