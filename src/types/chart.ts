// ============================================================
// ChartFigure — the JSON shape that drives the SVG renderer for
// coordinate-plane figures (Phase 4d).
//
// Populated by scripts/figure-extraction/extract-chart-data.mjs
// from the raster image_url crop via Gemini Pro Vision, then
// stored in quiz_questions.figure_chart_data (JSONB).
//
// Consumed by src/components/learn/ChartFigure.tsx, which converts
// it to a FigureSpec (src/lib/figures/engine/from-chart-data.ts)
// and draws it with the figure engine.
//
// Design notes
// ============
// · The schema is intentionally lossy: we capture what a STUDENT
//   needs to solve the question, not pixel-perfect fidelity. A
//   scatterplot may have 12 dots with axes 0-10 by 2 — that's the
//   structure. Exact pixel position doesn't matter.
// · One Figure may carry multiple SERIES (e.g. two lines on the
//   same axes for "compare the two students' scores"). The figure
//   engine tells them apart with theme roles, line styles and a
//   legend, never with subject colors.
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
  /** Print a tick label only every `label_step` (grid lines and tick marks
   *  still every tick_step), e.g. a grid every 1 labelled 2, 4, 6. Null or
   *  absent = label every tick. */
  label_step?: number | null;
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
  /** "square" for figures whose source plot is square; absent/"wide" = 3:2. */
  frame?: "wide" | "square" | null;
  /** Omit the 0 tick labels where the axes meet (printed SAT figures leave the
   *  origin unlabelled or mark it O). */
  hide_origin_label?: boolean | null;
  /** One or more series. Named multi-series charts get a legend. */
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
