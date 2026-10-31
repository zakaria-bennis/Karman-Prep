import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildChart } from "@/lib/figures/engine/charts";
import {
  chartDataToSpec,
  ChartDataError,
  sampleExpression,
} from "@/lib/figures/engine/from-chart-data";
import { buildPlane } from "@/lib/figures/engine/plane";
import type { Scene, SceneItem } from "@/lib/figures/engine/scene";
import { FIGURE_SPEC_VERSION, parseFigureSpec, type FigureSpec } from "@/lib/figures/engine/spec";

const BOX = { width: 600, height: 400 };

type PathItem = Extract<SceneItem, { t: "path" }>;
type RectItem = Extract<SceneItem, { t: "rect" }>;
type TextItem = Extract<SceneItem, { t: "text" }>;
const rects = (s: Scene, id: string) =>
  s.items.filter((i): i is RectItem => i.t === "rect" && i.partId === id);
const paths = (s: Scene, id: string) =>
  s.items.filter((i): i is PathItem => i.t === "path" && i.partId === id);
const texts = (s: Scene) => s.items.filter((i): i is TextItem => i.t === "text");

/** The numbers of a path's d, as [x, y] pairs (M/L paths only). */
function vertices(d: string): [number, number][] {
  const nums = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) out.push([nums[i], nums[i + 1]]);
  return out;
}

/** Centre of a dot path (a circle drawn as two arcs from its left to its right point). */
function dotCenter(d: string): [number, number] {
  const nums = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  // M x-r y A r r 0 1 0 x+r y ...
  return [(nums[0] + nums[7]) / 2, nums[1]];
}

/** y of the horizontal x-axis line. */
function xAxisY(s: Scene): number {
  const axis = paths(s, "axis")
    .map((p) => vertices(p.d))
    .find((v) => Math.abs(v[0][1] - v[1][1]) < 1e-6);
  if (!axis) throw new Error("no x-axis");
  return axis[0][1];
}

function spec(partial: Partial<FigureSpec> & Pick<FigureSpec, "type" | "parts">): FigureSpec {
  return { version: FIGURE_SPEC_VERSION, labels: [], marks: [], ...partial };
}

describe("buildChart", () => {
  it("bar heights are proportional to values on a zero-based axis", () => {
    // The frame starts at 3, but bars always rise from 0.
    const scene = buildChart(
      spec({
        type: "bar",
        parts: [{ kind: "series", id: "s1", values: [2, 4, 8] }],
        frame: { x: [0, 3], y: [3, 10], step: 2, categories: ["A", "B", "C"] },
      }),
      BOX
    );
    const bars = rects(scene, "s1");
    expect(bars).toHaveLength(3);
    const base = xAxisY(scene);
    for (const b of bars) expect(b.y + b.height).toBeCloseTo(base, 1);
    expect(bars[1].height / bars[0].height).toBeCloseTo(2, 6);
    expect(bars[2].height / bars[0].height).toBeCloseTo(4, 6);
    // Bars stand left to right in category order, under their category names.
    for (const [i, name] of ["A", "B", "C"].entries()) {
      const label = texts(scene).find((t) => t.text === name)!;
      expect(label.x).toBeCloseTo(bars[i].x + bars[i].width / 2, 6);
      expect(label.y).toBeGreaterThan(base);
    }
    expect(scene.issues).toEqual([]);
  });

  it("dot plot stacks equal values upward from the axis", () => {
    const scene = buildChart(
      spec({
        type: "dot_plot",
        parts: [{ kind: "series", id: "s1", values: [2, 3, 2, 2] }],
        frame: { x: [0, 5], y: [0, 1], step: 1 },
      }),
      BOX
    );
    const dots = paths(scene, "s1").map((p) => dotCenter(p.d));
    expect(dots).toHaveLength(4);
    const base = xAxisY(scene);
    const atTwo = dots.filter(([x]) => Math.abs(x - dots[0][0]) < 1e-6).map(([, y]) => y);
    const atThree = dots.filter(([x]) => Math.abs(x - dots[0][0]) >= 1e-6);
    expect(atTwo).toHaveLength(3);
    expect(atThree).toHaveLength(1);
    // Every dot is above the axis, the stack climbs, and the spacing is even.
    const ys = [...atTwo].sort((a, b) => b - a);
    for (const y of ys) expect(y).toBeLessThan(base);
    expect(ys[0]).toBeCloseTo(atThree[0][1], 1);
    expect(ys[0] - ys[1]).toBeGreaterThan(0);
    expect(ys[1] - ys[2]).toBeCloseTo(ys[0] - ys[1], 1);
    // Neighbouring dots in a stack never overlap.
    const r = Number(paths(scene, "s1")[0].d.split(" ")[2].slice(1));
    expect(ys[0] - ys[1]).toBeGreaterThanOrEqual(2 * r);
  });

  it("box plot whiskers at min/max and box at Q1–Q3 with the median line", () => {
    const scene = buildChart(
      spec({
        type: "box_plot",
        parts: [{ kind: "series", id: "b1", values: [10, 30, 50, 70, 90] }],
        frame: { x: [0, 100], y: [0, 1], step: 10 },
      }),
      BOX
    );
    // Map value → px from the axis tick labels.
    const tickX = (v: number) =>
      texts(scene).find((t) => t.text === String(v) && t.anchor === "middle")!.x;
    const box = rects(scene, "b1");
    expect(box).toHaveLength(1);
    expect(box[0].x).toBeCloseTo(tickX(30), 6);
    expect(box[0].x + box[0].width).toBeCloseTo(tickX(70), 6);
    const segs = paths(scene, "b1").map((p) => vertices(p.d));
    const horizontal = segs.filter((v) => Math.abs(v[0][1] - v[1][1]) < 1e-6);
    const vertical = segs.filter((v) => Math.abs(v[0][0] - v[1][0]) < 1e-6);
    const spans = horizontal.map((v) => [v[0][0], v[1][0]].sort((a, b) => a - b));
    // Whiskers run min→Q1 and Q3→max, never through the box.
    expect(spans).toHaveLength(2);
    const [lo, hi] = spans.sort((a, b) => a[0] - b[0]);
    expect(lo[0]).toBeCloseTo(tickX(10), 1);
    expect(lo[1]).toBeCloseTo(tickX(30), 1);
    expect(hi[0]).toBeCloseTo(tickX(70), 1);
    expect(hi[1]).toBeCloseTo(tickX(90), 1);
    // End caps at min and max, and the median line inside the box spanning its height.
    const xs = vertical.map((v) => v[0][0]);
    expect(xs.some((x) => Math.abs(x - tickX(10)) < 0.01)).toBe(true);
    expect(xs.some((x) => Math.abs(x - tickX(90)) < 0.01)).toBe(true);
    const median = vertical.find((v) => Math.abs(v[0][0] - tickX(50)) < 0.01)!;
    expect(Math.min(median[0][1], median[1][1])).toBeCloseTo(box[0].y, 1);
    expect(Math.max(median[0][1], median[1][1])).toBeCloseTo(box[0].y + box[0].height, 1);
    expect(scene.issues).toEqual([]);
  });

  it("histogram bars touch, one per bin, heights in proportion", () => {
    const scene = buildChart(
      spec({
        type: "histogram",
        parts: [
          {
            kind: "series",
            id: "h",
            values: [
              [0, 2],
              [10, 5],
              [20, 1],
            ],
          },
        ],
        frame: { x: [0, 30], y: [0, 6], step: 10, yStep: 1 },
      }),
      BOX
    );
    const bars = rects(scene, "h");
    expect(bars).toHaveLength(3);
    expect(bars[0].x + bars[0].width).toBeCloseTo(bars[1].x, 6);
    expect(bars[1].x + bars[1].width).toBeCloseTo(bars[2].x, 6);
    expect(bars[1].height / bars[0].height).toBeCloseTo(2.5, 6);
  });

  it("keeps every text item inside the figure, with a wrapped title and a legend", () => {
    const scene = buildChart(
      spec({
        type: "bar",
        title: "Average Total Agricultural Export Growth Rate, Five Years Pre- and Post-FTA",
        parts: [
          { kind: "series", id: "s1", values: [2, 5] },
          { kind: "series", id: "s2", values: [3, 6] },
        ],
        labels: [
          { text: "Costa Rica (CAFTA-DR)", on: "s1" },
          { text: "Jordan (JOFTA)", on: "s2" },
        ],
        frame: {
          x: [0, 2],
          y: [0, 8],
          step: 2,
          categories: ["Pre-FTA", "Post-FTA"],
          xLabel: "Period",
          yLabel: "Growth rate (%)",
        },
      }),
      { width: 320, height: 320 }
    );
    const all = texts(scene);
    expect(all.filter((t) => t.partId === "title").length).toBeGreaterThan(1);
    expect(all.some((t) => t.text === "Jordan (JOFTA)")).toBe(true);
    for (const t of all) {
      const w = 0.6 * 15 * t.text.length;
      const x0 = t.anchor === "start" ? t.x : t.anchor === "middle" ? t.x - w / 2 : t.x - w;
      expect(x0, t.text).toBeGreaterThanOrEqual(-0.01);
      expect(x0 + w, t.text).toBeLessThanOrEqual(scene.width + 0.01);
      expect(t.y - 15, t.text).toBeGreaterThanOrEqual(-0.01);
      expect(t.y, t.text).toBeLessThanOrEqual(scene.height + 0.01);
    }
    expect(scene.issues).toEqual([]);
  });
});

describe("chartDataToSpec", () => {
  const dir = path.resolve(__dirname, "../../../fixtures/charts");
  const fixtures = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")));

  type Axis = { min: number; max: number; label: string; tick_step: number | null };
  type Data = {
    kind: string;
    x_axis: Axis;
    y_axis: Axis;
    series: { kind: string; points?: [number, number][]; label?: string | null }[];
  };

  it("round-trips every fixture in tests/fixtures/charts", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(8);
    for (const { id, figure_chart_data } of fixtures as { id: string; figure_chart_data: Data }[]) {
      const data = figure_chart_data;
      const out = chartDataToSpec(data);
      const parsed = parseFigureSpec(out);
      expect(parsed.ok, `${id}: ${parsed.ok ? "" : parsed.errors.join("; ")}`).toBe(true);
      expect(out.frame?.x, id).toEqual([data.x_axis.min, data.x_axis.max]);
      expect(out.frame?.y, id).toEqual([data.y_axis.min, data.y_axis.max]);
      expect(out.frame?.xLabel, id).toBe(data.x_axis.label);
      expect(out.frame?.yLabel, id).toBe(data.y_axis.label);
      const seriesParts = out.parts.filter((p) => p.kind === "series");
      const fnParts = out.parts.filter((p) => p.kind === "function");
      const dataPoints = data.series.filter((s) => s.points).map((s) => s.points);
      expect(
        seriesParts.map((p) => p.values),
        id
      ).toEqual(dataPoints);
      expect(fnParts.length, id).toBe(data.series.filter((s) => s.kind === "function").length);
      // Every converted fixture draws cleanly.
      const scene = out.type === "plane" ? buildPlane(out, BOX) : buildChart(out, BOX);
      expect(scene.issues, id).toEqual([]);
      for (const f of fnParts)
        expect(paths(scene, f.id).length, `${id} ${f.id}`).toBeGreaterThan(0);
      // Tick labels keep Bluebook spacing on both axes (a label step of 2 on a
      // 100-unit grid once printed a label every 2 units).
      const numeric = texts(scene).filter((t) => /^-?\d+(\.\d+)?$/.test(t.text));
      for (const [anchor, coord] of [
        ["middle", "x"],
        ["end", "y"],
      ] as const) {
        const at = numeric
          .filter((t) => t.anchor === anchor)
          .map((t) => t[coord])
          .sort((a, b) => a - b);
        for (let i = 1; i < at.length; i++) {
          expect(at[i] - at[i - 1], `${id} ${coord} labels`).toBeGreaterThanOrEqual(28 - 0.01);
        }
        // ...and every label sits on a tick.
        const step = coord === "x" ? out.frame?.step : (out.frame?.yStep ?? out.frame?.step);
        for (const t of numeric.filter((t) => t.anchor === anchor && t.text !== "0")) {
          const k = Number(t.text) / step!;
          expect(Math.abs(k - Math.round(k)), `${id} ${coord} label ${t.text}`).toBeLessThan(1e-9);
        }
      }
    }
  });

  it("maps old kinds onto figure types and keeps bar categories and box summaries", () => {
    const axis = { label: "", min: null, max: null, tick_step: null, categories: null };
    const bar = chartDataToSpec({
      kind: "bar_chart",
      title: "T",
      x_axis: { ...axis, categories: ["A", "B"] },
      y_axis: { ...axis, label: "Count", min: 0, max: 10, tick_step: 2 },
      show_grid: true,
      series: [{ kind: "bar", label: null, bars: [{ category: "B", value: 4 }] }],
    });
    expect(bar.type).toBe("bar");
    expect(bar.title).toBe("T");
    expect(bar.frame?.categories).toEqual(["A", "B"]);
    expect(bar.parts).toEqual([{ kind: "series", id: "s1", seriesKind: "bar", values: [[1, 4]] }]);
    const box = chartDataToSpec({
      kind: "boxplot",
      title: null,
      x_axis: { ...axis, label: "Score", min: 0, max: 100, tick_step: 20 },
      y_axis: axis,
      show_grid: true,
      series: [
        {
          kind: "boxplot",
          label: null,
          boxes: [{ category: "Class A", min: 1, q1: 2, median: 3, q3: 4, max: 5 }],
        },
      ],
    });
    expect(box.type).toBe("box_plot");
    expect(box.parts[0]).toMatchObject({ kind: "series", values: [1, 2, 3, 4, 5] });
    expect(box.labels).toEqual([{ text: "Class A", on: box.parts[0].id }]);
  });

  it("refuses chart data the engine cannot draw, with a clear reason", () => {
    expect(() => chartDataToSpec({ kind: "pie", series: [] })).toThrow(ChartDataError);
    expect(() => chartDataToSpec(null)).toThrow(ChartDataError);
  });
});

describe("sampleExpression", () => {
  it("samples an absolute value through its vertex, as finite pairs within the range", () => {
    const [run, ...rest] = sampleExpression(
      { kind: "absolute_value", a: 2, h: 1 / 3, k: -1 },
      [-2, 2]
    );
    expect(rest).toHaveLength(0);
    expect(run).toContainEqual([1 / 3, -1]);
    expect(run[0]).toEqual([-2, 2 * (2 + 1 / 3) - 1]);
    expect(run[run.length - 1][0]).toBe(2);
    for (const p of run) expect(p.every(Number.isFinite)).toBe(true);
  });

  it("breaks the graph where it has no finite value, and gives nothing for an empty range", () => {
    // (-2)^x is defined only at integer x, so no two neighbouring samples are both finite.
    expect(sampleExpression({ kind: "exponential", a: 1, b: -2 }, [0.5, 3.5])).toEqual([]);
    expect(sampleExpression({ kind: "linear", m: 1, b: 0 }, [2, 2])).toEqual([]);
  });

  it("gives chart-data functions their samples, so they draw without the calculator", () => {
    const out = chartDataToSpec({
      kind: "function_plot",
      x_axis: { label: "x", min: -5, max: 5, tick_step: 1 },
      y_axis: { label: "y", min: -5, max: 5, tick_step: 1 },
      series: [{ kind: "function", expression: { kind: "linear", m: 1, b: 0 }, domain: [0, 2] }],
    });
    const [f] = out.parts;
    expect(f.kind === "function" && f.samples?.flat()[0]).toEqual([0, 0]);
  });
});
