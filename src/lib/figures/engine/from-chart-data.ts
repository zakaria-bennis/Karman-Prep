/**
 * Converts the old `figure_chart_data` (src/types/chart.ts) into a FigureSpec,
 * mechanically and without loss of what a student needs:
 *
 * - scatterplot, line_graph, bar_chart and boxplot become scatter, line, bar
 *   and box_plot specs; function_plot becomes a plane with function parts.
 * - Series become `series` parts s1, s2, ...; boxes become parts b1, b2, ...
 *   holding [min, Q1, median, Q3, max]; functions become parts f1, f2, ...
 *   with their expression written as LaTeX and their `samples` computed here.
 *   The four expression kinds (linear, quadratic, absolute value, exponential)
 *   are evaluated directly, so live chart data never needs the calculator.
 * - A series name becomes a label on its part (the legend); a box's category
 *   becomes a label on its box (the row name).
 * - Axis ranges, steps, label steps, categories, axis names, the grid switch
 *   and the hidden origin label go into the frame. A missing numeric range is
 *   derived from the data.
 *
 * Pie charts have no figure type, so they (and malformed data) are refused
 * with a ChartDataError that says why.
 */
import { z } from "zod";
import { niceRange } from "./charts";
import {
  FIGURE_SPEC_VERSION,
  type FigureSpec,
  type Label,
  type Part,
  type PlaneFrame,
} from "./spec";
import { niceStep } from "./ticks";

export class ChartDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChartDataError";
  }
}

const num = z.number().finite();
const pair = z.tuple([num, num]);
const label = z.string().nullish();

const axisSchema = z.object({
  label: z.string().nullish(),
  min: num.nullish(),
  max: num.nullish(),
  tick_step: num.positive().nullish(),
  categories: z.array(z.coerce.string()).nullish(),
  label_step: num.positive().nullish(),
});

const expressionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("linear"), m: num, b: num }),
  z.object({ kind: z.literal("quadratic"), a: num, b: num, c: num }),
  z.object({ kind: z.literal("absolute_value"), a: num, h: num, k: num }),
  z.object({ kind: z.literal("exponential"), a: num, b: num }),
]);

const seriesSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("scatter"), label, points: z.array(pair) }),
  z.object({ kind: z.literal("line"), label, points: z.array(pair) }),
  z.object({
    kind: z.literal("bar"),
    label,
    bars: z.array(z.object({ category: z.coerce.string(), value: num })),
  }),
  z.object({
    kind: z.literal("function"),
    label,
    expression: expressionSchema,
    domain: pair.nullish(),
  }),
  z.object({
    kind: z.literal("boxplot"),
    label,
    boxes: z.array(
      z.object({ category: label, min: num, q1: num, median: num, q3: num, max: num })
    ),
  }),
]);

const chartSchema = z.object({
  kind: z.enum(["scatterplot", "line_graph", "bar_chart", "function_plot", "boxplot"]),
  title: z.string().nullish(),
  x_axis: axisSchema,
  y_axis: axisSchema,
  show_grid: z.boolean().nullish(),
  hide_origin_label: z.boolean().nullish(),
  series: z.array(seriesSchema),
});

type ChartData = z.infer<typeof chartSchema>;
type Axis = z.infer<typeof axisSchema>;
type Expression = z.infer<typeof expressionSchema>;

const TYPE: Record<ChartData["kind"], FigureSpec["type"]> = {
  scatterplot: "scatter",
  line_graph: "line",
  bar_chart: "bar",
  function_plot: "plane",
  boxplot: "box_plot",
};

/** A number as LaTeX: plain decimal, never exponent notation. */
function n(v: number): string {
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(10).replace(/\.?0+$/, "");
}
/** " + v" or " - |v|", for a term after the first. */
const signed = (v: number) => (v < 0 ? `-${n(-v)}` : `+${n(v)}`);

/** The expression's value at x (NaN or ±Infinity where it has none). */
function valueAt(e: Expression, x: number): number {
  switch (e.kind) {
    case "linear":
      return e.m * x + e.b;
    case "quadratic":
      return e.a * x * x + e.b * x + e.c;
    case "absolute_value":
      return e.a * Math.abs(x - e.h) + e.k;
    case "exponential":
      return e.a * e.b ** x;
  }
}

/** Segments per sampled function: well under a pixel each on a 600 px figure. */
const SAMPLE_SEGMENTS = 1200;

/**
 * The expression's graph over [lo, hi] as world polylines, broken wherever
 * it has no finite value. An absolute value's vertex is always a sample.
 */
export function sampleExpression(e: Expression, [lo, hi]: [number, number]): [number, number][][] {
  if (!(hi > lo)) return [];
  const xs: number[] = [];
  for (let i = 0; i <= SAMPLE_SEGMENTS; i++) xs.push(lo + ((hi - lo) * i) / SAMPLE_SEGMENTS);
  if (e.kind === "absolute_value" && e.h > lo && e.h < hi) {
    xs.push(e.h);
    xs.sort((a, b) => a - b);
  }
  const runs: [number, number][][] = [];
  let run: [number, number][] = [];
  for (const x of xs) {
    const y = valueAt(e, x);
    if (Number.isFinite(y)) {
      run.push([x, y]);
    } else {
      if (run.length > 1) runs.push(run);
      run = [];
    }
  }
  if (run.length > 1) runs.push(run);
  return runs;
}

/** The expression as an equation in LaTeX (the authoring tools and calculator read it). */
export function expressionLatex(e: Expression): string {
  switch (e.kind) {
    case "linear":
      return `y=${n(e.m)}x${signed(e.b)}`;
    case "quadratic":
      return `y=${n(e.a)}x^{2}${signed(e.b)}x${signed(e.c)}`;
    case "absolute_value":
      return `y=${n(e.a)}\\left|x${signed(-e.h)}\\right|${signed(e.k)}`;
    case "exponential":
      return `y=${n(e.a)}\\cdot${n(e.b)}^{x}`;
  }
}

function range(axis: Axis, values: number[], zero: boolean): [number, number] {
  if (axis.min != null && axis.max != null && axis.max > axis.min) return [axis.min, axis.max];
  const all = zero ? [0, ...values] : values;
  if (all.length === 0) return [0, 10];
  return niceRange(Math.min(...all), Math.max(...all));
}

/** Converts `figure_chart_data` to a FigureSpec, or throws a ChartDataError. */
export function chartDataToSpec(input: unknown): FigureSpec {
  const kind = (input as { kind?: unknown } | null)?.kind;
  if (kind === "pie") {
    throw new ChartDataError("pie charts have no figure type in figure-spec/1");
  }
  const parsed = chartSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? ` at ${issue.path.join(".")}` : "";
    throw new ChartDataError(`not valid chart data: ${issue?.message ?? "unknown"}${where}`);
  }
  const data = parsed.data;
  const parts: Part[] = [];
  let boxes = 0;
  const labels: Label[] = [];
  const expressions = new Map<string, Expression>();
  const xs: number[] = [];
  const ys: number[] = [];
  let categories = data.x_axis.categories ?? undefined;
  if (data.kind === "bar_chart" && !categories?.length) {
    categories = [
      ...new Set(
        data.series.flatMap((s) => (s.kind === "bar" ? s.bars.map((b) => b.category) : []))
      ),
    ];
  }
  const name = (text: string | null | undefined, on: string) => {
    const t = (text ?? "").trim();
    if (t) labels.push({ text: t, on });
  };

  data.series.forEach((s, i) => {
    const id = `s${i + 1}`;
    switch (s.kind) {
      case "scatter":
      case "line":
        parts.push({ kind: "series", id, seriesKind: s.kind, values: s.points });
        name(s.label, id);
        for (const [x, y] of s.points) {
          xs.push(x);
          ys.push(y);
        }
        break;
      case "bar": {
        const cats = categories ?? [];
        const at = s.bars.map((b) => [cats.indexOf(b.category), b.value] as [number, number]);
        const complete = at.length === cats.length && at.every(([c], k) => c === k);
        parts.push({
          kind: "series",
          id,
          seriesKind: "bar",
          values: complete ? at.map(([, v]) => v) : at.filter(([c]) => c >= 0),
        });
        name(s.label, id);
        ys.push(...s.bars.map((b) => b.value));
        break;
      }
      case "function":
        parts.push({
          kind: "function",
          id: `f${i + 1}`,
          latex: expressionLatex(s.expression),
          ...(s.domain ? { domain: s.domain } : {}),
        });
        expressions.set(`f${i + 1}`, s.expression);
        break;
      case "boxplot":
        for (const box of s.boxes) {
          const bid = `b${++boxes}`;
          const values = [box.min, box.q1, box.median, box.q3, box.max];
          parts.push({ kind: "series", id: bid, seriesKind: "box_plot", values });
          name(box.category, bid);
          xs.push(...values);
        }
        break;
    }
  });

  const type = TYPE[data.kind];
  const frame: PlaneFrame = {
    x: categories && type === "bar" ? [0, categories.length] : range(data.x_axis, xs, false),
    y: type === "box_plot" ? [0, Math.max(1, boxes)] : range(data.y_axis, ys, type === "bar"),
  };
  // Samples span the function's domain within the frame.
  for (const part of parts) {
    const e = part.kind === "function" ? expressions.get(part.id) : undefined;
    if (part.kind !== "function" || !e) continue;
    const [d0, d1] = part.domain ?? frame.x;
    const lo = Math.max(frame.x[0], Math.min(d0, d1));
    const hi = Math.min(frame.x[1], Math.max(d0, d1));
    part.samples = sampleExpression(e, [lo, hi]);
  }
  // Steps: y inherits x's step in a spec, so a y-axis without its own step gets
  // the automatic one written out.
  const xStep = data.x_axis.tick_step ?? undefined;
  let yStep = data.y_axis.tick_step ?? undefined;
  if (xStep !== undefined && yStep === undefined && type !== "box_plot") {
    yStep = niceStep(frame.y[0], frame.y[1], 300) || undefined;
  }
  if (xStep !== undefined) frame.step = xStep;
  if (yStep !== undefined && yStep !== xStep) frame.yStep = yStep;
  const xEvery = data.x_axis.label_step ?? undefined;
  let yEvery = data.y_axis.label_step ?? undefined;
  // labelStep also spans y while the steps are shared; keep y labelled every tick.
  if (xEvery && !yEvery && frame.yStep === undefined) yEvery = yStep;
  if (xEvery) frame.labelStep = xEvery;
  if (yEvery) frame.yLabelStep = yEvery;
  if (type === "bar" && categories) frame.categories = categories;
  if (data.hide_origin_label) frame.originLabel = false;
  if (data.show_grid === false) frame.grid = false;
  frame.xLabel = data.x_axis.label ?? "";
  frame.yLabel = data.y_axis.label ?? "";

  const spec: FigureSpec = {
    version: FIGURE_SPEC_VERSION,
    type,
    parts,
    labels,
    marks: [],
    frame,
  };
  const title = data.title?.trim();
  if (title) spec.title = title;
  return spec;
}
