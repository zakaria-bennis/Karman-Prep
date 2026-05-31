// Pure logic for Phase 9B chart extraction (the IMAGE → SVG chart path).
// Shared by the Stage 6.5 runner (extract-figure-structure.mjs) and the
// legacy Phase 4d backfill (extract-chart-data.mjs) so the prompt + the
// validator can't drift between them — the same DRY lesson as the fetch
// helper.
//
// The renderer (src/components/learn/ChartFigure.tsx) + the data contract
// (src/types/chart.ts ChartFigure) already shipped in Phase 4d; 9B only
// adds the *pipeline integration*. The vision model emits structured JSON
// (a ChartFigure), NEVER raw SVG (proposal Decision 1) — ChartFigure.tsx
// turns it into a clean, theme-aware, accessible SVG.
//
// validateChartData returns the validated ChartFigure core WITHOUT
// extracted_by / extracted_at — the caller stamps provenance (the model +
// timestamp) so this stays a pure function (no Date.now in the lib).

/** The four chart kinds ChartFigure.tsx renders. (Boxplot / pie have no
 *  renderer yet — proposal defers them.) */
export const CHART_KINDS = Object.freeze([
  "scatterplot",
  "line_graph",
  "bar_chart",
  "function_plot",
]);

/** Confidence at/above which a chart auto-publishes (figure_kind='chart').
 *  Below it, the data is saved but the screenshot keeps rendering until a
 *  human accepts it — same gate Phase 4d used. */
export const CHART_AUTO_PUBLISH_THRESHOLD = 0.8;

/** Supported function-plot expression families (must match
 *  src/types/chart.ts FunctionSeries). */
const FUNCTION_EXPRESSION_KINDS = Object.freeze([
  "linear",
  "quadratic",
  "absolute_value",
  "exponential",
]);

// Ported verbatim from extract-chart-data.mjs (Phase 4d) — the schema
// lives in src/types/chart.ts but the model only sees this prompt.
export const CHART_EXTRACT_PROMPT = `You are looking at a figure extracted from an SAT practice test PDF. Decide whether it is a COORDINATE-PLANE CHART of one of these four types:

  · "scatterplot"   — a collection of dots, no lines connecting them
  · "line_graph"    — dots connected by line segments (possibly multiple series)
  · "bar_chart"     — vertical or horizontal bars with categorical x-axis
                       (treat histograms as bar_chart with numeric categories)
  · "function_plot" — a smooth curve representing y = f(x) (e.g. parabola, line)

If it is NOT one of these (geometry diagram, 3D solid, table, photo, raw equation, etc.), return {"is_chart": false}.

If it IS a chart, extract structured data. Coordinate values are in the AXIS'S NUMERIC SPACE, NOT pixel positions — read off the axes and report the data as a student would record it. Be honest about uncertainty: if a dot looks like it sits between (3, 5.5) and (3, 6), pick the closer one.

Return strict JSON matching this exact shape:

{
  "is_chart": true,
  "kind": "scatterplot" | "line_graph" | "bar_chart" | "function_plot",
  "title": "<title above the chart, or null>",
  "x_axis": {
    "label": "<x-axis label, or empty string>",
    "min": <number or null>,
    "max": <number or null>,
    "tick_step": <number or null>,
    "categories": ["A", "B", "C"] | null   // only for bar_chart; mutually exclusive with min/max
  },
  "y_axis": { ...same shape... },
  "show_grid": true | false,
  "series": [
    // SCATTER:
    { "kind": "scatter", "label": "<name or null>",
      "points": [[x1, y1], [x2, y2], ...] },
    // LINE:
    { "kind": "line", "label": "<name or null>",
      "points": [[x1, y1], [x2, y2], ...] },
    // BAR:
    { "kind": "bar", "label": "<name or null>",
      "bars": [{"category": "A", "value": 5}, ...] },
    // FUNCTION (must match one of the supported families):
    { "kind": "function", "label": "<name or null>",
      "expression": { "kind": "linear",   "m": <num>, "b": <num> }
                   | { "kind": "quadratic", "a": <num>, "b": <num>, "c": <num> }
                   | { "kind": "absolute_value", "a": <num>, "h": <num>, "k": <num> }
                   | { "kind": "exponential", "a": <num>, "b": <num> },
      "domain": [<xLo>, <xHi>] | null }
  ],
  "confidence": <0.0 — 1.0>,
  "extractor_note": "<short note explaining any judgement calls, or null>"
}

CONFIDENCE GUIDE:
  · 1.0   — every value is read directly from clearly-labeled axes
  · 0.8+  — high confidence; ready to auto-publish to students
  · 0.5-0.8 — best guess; needs human review
  · <0.5  — significant ambiguity (illegible labels, weird crop, etc.)

CRITICAL:
  · Do NOT invent data points if the image is unclear — set lower confidence instead.
  · For function_plot, only emit if the curve clearly matches one of the 4 supported expression families. Otherwise treat as scatterplot (sample 8-12 points along the curve).
  · For bar_chart, set categories[] on x_axis AND make sure every bar's "category" matches one entry.
  · Don't transcribe the question text or answer choices into the chart data.`;

/**
 * Normalize one axis to the ChartAxis shape (src/types/chart.ts).
 * @param {any} a
 * @returns {{label: string, min: number|null, max: number|null, tick_step: number|null, categories: string[]|null}}
 */
export function normalizeAxis(a) {
  return {
    label: typeof a?.label === "string" ? a.label : "",
    min: typeof a?.min === "number" ? a.min : null,
    max: typeof a?.max === "number" ? a.max : null,
    tick_step: typeof a?.tick_step === "number" ? a.tick_step : null,
    categories: Array.isArray(a?.categories) ? a.categories : null,
  };
}

const clamp01 = (n) => Math.max(0, Math.min(1, n));

/**
 * @typedef {object} ChartFigureCore
 * @property {string} kind
 * @property {string|null} title
 * @property {{label: string, min: number|null, max: number|null, tick_step: number|null, categories: string[]|null}} x_axis
 * @property {{label: string, min: number|null, max: number|null, tick_step: number|null, categories: string[]|null}} y_axis
 * @property {boolean} show_grid
 * @property {any[]} series
 * @property {number} confidence
 * @property {string|null} extractor_note
 */

/**
 * Validate a raw chart-extraction payload against the ChartFigure contract
 * the renderer depends on, and return the normalized core (WITHOUT
 * extracted_by / extracted_at — the caller stamps those). Catches the
 * shape errors that would break ChartFigure.tsx; per-series geometry is
 * left to the model's self-reported confidence (the renderer is defensive
 * about optional fields).
 *
 * @param {any} parsed
 * @returns {{ok: boolean, errors: string[], confidence: number, data: ChartFigureCore|null}}
 */
export function validateChartData(parsed) {
  const errors = [];
  if (!parsed || parsed.is_chart !== true) {
    return { ok: false, errors: ["not_a_chart"], confidence: 0, data: null };
  }
  if (!CHART_KINDS.includes(parsed.kind))
    errors.push(`invalid_kind: ${parsed.kind ?? "(missing)"}`);
  if (!parsed.x_axis || !parsed.y_axis) errors.push("missing_axes");
  if (!Array.isArray(parsed.series) || parsed.series.length === 0) errors.push("no_series");
  if (typeof parsed.confidence !== "number") errors.push("missing_confidence");

  // Per-kind series sanity (cheap, catches the obvious wrong-shape cases).
  if (Array.isArray(parsed.series)) {
    for (const s of parsed.series) {
      if (s?.kind === "bar" && !Array.isArray(s.bars)) errors.push("bar_series_missing_bars");
      if ((s?.kind === "scatter" || s?.kind === "line") && !Array.isArray(s.points)) {
        errors.push(`${s.kind}_series_missing_points`);
      }
      if (s?.kind === "function" && !FUNCTION_EXPRESSION_KINDS.includes(s?.expression?.kind)) {
        errors.push("function_series_bad_expression");
      }
    }
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      confidence: typeof parsed.confidence === "number" ? clamp01(parsed.confidence) : 0,
      data: null,
    };
  }

  const data = {
    kind: parsed.kind,
    title: parsed.title ?? null,
    x_axis: normalizeAxis(parsed.x_axis),
    y_axis: normalizeAxis(parsed.y_axis),
    show_grid: parsed.show_grid !== false,
    series: parsed.series,
    confidence: clamp01(parsed.confidence),
    extractor_note: parsed.extractor_note ?? null,
  };
  return { ok: true, errors: [], confidence: data.confidence, data };
}

/**
 * Stamp model + timestamp provenance onto validated chart data to complete
 * the ChartFigure shape. Kept separate from validateChartData so the
 * validator stays pure (no Date.now).
 *
 * @param {ChartFigureCore} data  the core returned by validateChartData
 * @param {{extractedBy: string, extractedAt: string}} prov
 * @returns {ChartFigureCore & {extracted_by: string, extracted_at: string}}
 */
export function stampChartProvenance(data, { extractedBy, extractedAt }) {
  return { ...data, extracted_by: extractedBy, extracted_at: extractedAt };
}

/**
 * Deterministic complexity from the extracted structure (proposal
 * Decision 6 — not LLM judgment).
 * @param {{series?: any[]}} data
 * @returns {"simple" | "medium" | "dense"}
 */
export function deriveChartComplexity(data) {
  const series = Array.isArray(data?.series) ? data.series : [];
  let elements = series.length;
  for (const s of series) {
    if (Array.isArray(s?.points)) elements += s.points.length;
    else if (Array.isArray(s?.bars)) elements += s.bars.length;
    else if (s?.kind === "function") elements += 3; // a curve ≈ a few key points
  }
  if (elements < 8) return "simple";
  if (elements < 20) return "medium";
  return "dense";
}

/**
 * Screen-reader summary for figure_quality.alt_text.
 * @param {{kind?: string, title?: string|null, x_axis?: {label?: string}, y_axis?: {label?: string}, series?: any[]}} data
 * @returns {string}
 */
export function chartAltText(data) {
  const kindWord = (data?.kind ?? "chart").replace(/_/g, " ");
  const lead = typeof data?.title === "string" && data.title.trim() ? `${data.title.trim()}. ` : "";
  const xl = data?.x_axis?.label ? `, x-axis ${data.x_axis.label}` : "";
  const yl = data?.y_axis?.label ? `, y-axis ${data.y_axis.label}` : "";
  const series = Array.isArray(data?.series) ? data.series : [];
  const count = series.reduce(
    (n, s) =>
      n + (Array.isArray(s?.points) ? s.points.length : Array.isArray(s?.bars) ? s.bars.length : 0),
    0
  );
  const dataNote = count > 0 ? `, ${count} data point${count === 1 ? "" : "s"}` : "";
  return `${lead}A ${kindWord}${xl}${yl}${dataNote}.`;
}
