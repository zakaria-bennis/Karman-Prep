// ============================================================
// ChartFigure — the JSON shape that drives the SVG renderer for
// coordinate-plane figures (Phase 4d).
//
// Populated by scripts/figure-extraction/extract-chart-data.mjs
// from the raster image_url crop via Gemini Pro Vision, then
// stored in quiz_questions.figure_chart_data (JSONB).
//
// Consumed by src/components/learn/ChartFigure.tsx to produce
// clean, theme-aware, scalable SVG instead of the blurry PDF
// screenshot.
//
// Design notes
// ============
// · The schema is intentionally lossy: we capture what a STUDENT
//   needs to solve the question, not pixel-perfect fidelity. A
//   scatterplot may have 12 dots with axes 0-10 by 2 — that's the
//   structure. Exact pixel position doesn't matter.
// · One Figure may carry multiple SERIES (e.g. two lines on the
//   same axes for "compare the two students' scores"). Subject-
//   coded coloring is used for single-series; a sequential palette
//   takes over when series.length > 1.
// · `confidence` is set by the extractor (0.0 — 1.0). The Inspector
//   shows a "review" panel when confidence < 0.8.
// ============================================================

/** Top-level discriminator. Subject-coding lookup uses the
 *  question's subject; chart_kind is purely visual layout. */
export type ChartKind =
  | "scatterplot"
  | "line_graph"
  | "bar_chart"
  | "function_plot"
  | "boxplot"
  | "pie";

export interface ChartAxis {
  /** Human-readable label, e.g. "Time (seconds)" or "Score". Empty
   *  string when unlabeled in the source figure. */
  label: string;
  /** Numeric domain. For categorical x-axes on bar charts, leave
   *  min/max null and use `categories` instead. */
  min: number | null;
  max: number | null;
  /** Distance between major tick marks. Null = let the renderer
   *  pick a reasonable default from min/max. */
  tick_step: number | null;
  /** Categorical labels for bar-chart x-axes. Mutually exclusive
   *  with numeric min/max/tick_step. */
  categories: string[] | null;
}

export interface ScatterSeries {
  kind: "scatter";
  /** Optional name shown in a legend when there are 2+ series. */
  label: string | null;
  /** [x, y] coordinate pairs. Coordinates are in the axis's
   *  numeric space (not pixels). */
  points: Array<[number, number]>;
}

export interface LineSeries {
  kind: "line";
  label: string | null;
  /** [x, y] coordinates connected in order. */
  points: Array<[number, number]>;
}

export interface BarSeries {
  kind: "bar";
  label: string | null;
  /** Each bar's category (matching x-axis categories[]) and value. */
  bars: Array<{ category: string; value: number }>;
}

export interface FunctionSeries {
  kind: "function";
  label: string | null;
  /** Family of supported expressions — keeps the extractor + renderer
   *  honest. Each carries the parameters needed to plot it on the
   *  current axis range.
   *
   *  Why not a freeform expression string? We'd need a sandboxed
   *  evaluator + an extractor that always emits valid math. This
   *  enum covers >90% of SAT function plots (linear + quadratic) and
   *  adds a couple of common ones. Extend as new cases surface. */
  expression:
    | { kind: "linear"; m: number; b: number } // y = m·x + b
    | { kind: "quadratic"; a: number; b: number; c: number } // y = a·x² + b·x + c
    | { kind: "absolute_value"; a: number; h: number; k: number } // y = a·|x − h| + k
    | { kind: "exponential"; a: number; b: number }; // y = a · b^x
  /** Restrict the plotted domain. Null = the full x-axis range. */
  domain: [number, number] | null;
}

export interface BoxplotSeries {
  kind: "boxplot";
  label: string | null;
  /** One box per group. Five-number summary in the value-axis numeric
   *  space. Most SAT boxplots have a single box on a number line; multiple
   *  boxes compare groups (drawn as stacked horizontal rows). */
  boxes: Array<{
    /** Group label shown beside the box, or null for a lone number-line box. */
    category: string | null;
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
  }>;
}

export interface PieSeries {
  kind: "pie";
  label: string | null;
  /** Slices; the renderer derives each angle from the slice's share of the
   *  total, so `value` can be a raw count or a percentage. */
  slices: Array<{ label: string; value: number }>;
}

export type ChartSeries =
  | ScatterSeries
  | LineSeries
  | BarSeries
  | FunctionSeries
  | BoxplotSeries
  | PieSeries;

export interface ChartFigure {
  /** Discriminator for the dominant visual layout. */
  kind: ChartKind;
  /** Optional title above the figure. Many SAT figures have none. */
  title: string | null;
  x_axis: ChartAxis;
  y_axis: ChartAxis;
  /** Show the background grid? Default true. */
  show_grid: boolean;
  /** One or more series. Multi-series charts trigger the sequential
   *  color palette + a legend. */
  series: ChartSeries[];
  /** Set by the extractor. 0.0 — 1.0. Surfaced in the Inspector for
   *  manual review when below the auto-publish threshold (0.8). */
  confidence: number;
  /** Model + prompt version used so we can re-extract systematically
   *  later. e.g. "gemini-2.5-pro@2026-05-19". */
  extracted_by: string;
  /** Timestamp of the extraction run (ISO). */
  extracted_at: string;
  /** Optional free-form note from the extractor explaining tricky
   *  judgement calls (e.g. "the x-axis label was illegible — best
   *  guess: 'Time'"). Surfaces in the Inspector. */
  extractor_note: string | null;
}

/** Subject → series color mapping for single-series figures.
 *  Multi-series (length > 1) uses the SEQUENTIAL_PALETTE below.
 *
 *  Cool light-blue (sky) family from the app tokens (docs/design-tokens.md)
 *  so series sit in the same "blueprint" theme as the axes and labels.
 *  Both subjects stay light-blue, slightly varied for any mixed context. */
export const SUBJECT_CHART_COLOR: Record<string, string> = {
  math: "#38bdf8", // sky-400
  reading: "#7dd3fc", // sky-300
};

/** Sequential palette for multi-series charts — a cool blue→cyan→indigo
 *  ramp so the palette feels native to the navy quiz app. Stops after 6;
 *  a 7+-series SAT chart would be visually unreadable and the extractor
 *  should surface it for manual review. */
export const SEQUENTIAL_PALETTE = [
  "#38bdf8", // sky-400
  "#22d3ee", // cyan-400
  "#818cf8", // indigo-400
  "#5eead4", // teal-300
  "#7dd3fc", // sky-300
  "#a78bfa", // violet-400
] as const;
