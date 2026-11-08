// The engine gaps the 2026-11-01 redraw pilot found (pilot-20261101/REPORT.md), one block each.
import { describe, expect, it } from "vitest";
import { buildChart } from "@/lib/figures/engine/charts";
import { checkSpec, checkSpecs } from "@/lib/figures/engine/checks";
import { buildGeometry2d } from "@/lib/figures/engine/geometry2d";
import { NOT_TO_SCALE_PLURAL } from "@/lib/figures/engine/notes";
import {
  droppedLabels,
  labelDrift,
  labelsOnLines,
  tickHint,
} from "@/lib/figures/engine/label-checks";
import { textBox, textOverlap } from "@/lib/figures/engine/labels";
import { STYLED_FROM } from "@/lib/figures/engine/line-styles";
import { buildPlane } from "@/lib/figures/engine/plane";
import { tickText } from "@/lib/figures/engine/plane-axes";
import type { Scene, SceneItem } from "@/lib/figures/engine/scene";
import {
  FIGURE_SPEC_VERSION,
  parseFigureSpec,
  parseFigureSpecs,
  type FigureSpec,
  type PlaneFrame,
} from "@/lib/figures/engine/spec";

type TextItem = Extract<SceneItem, { t: "text" }>;
type PathItem = Extract<SceneItem, { t: "path" }>;
const texts = (s: Scene) => s.items.filter((i): i is TextItem => i.t === "text");
const paths = (s: Scene) => s.items.filter((i): i is PathItem => i.t === "path");
const PLANE_BOX = { width: 640, height: 480 };
const CHART_BOX = { width: 600, height: 400 };

const plane = (frame: PlaneFrame, extra: Partial<FigureSpec> = {}): FigureSpec => ({
  version: FIGURE_SPEC_VERSION,
  type: "plane",
  parts: [],
  labels: [],
  marks: [],
  frame,
  ...extra,
});

function lineChart(n: number, extra: Partial<FigureSpec> = {}): FigureSpec {
  return {
    version: FIGURE_SPEC_VERSION,
    type: "line",
    parts: Array.from({ length: n }, (_, k) => ({
      kind: "series" as const,
      id: `s${k}`,
      values: [
        [0.5, 10 + 20 * k],
        [1.5, 20 + 20 * k],
        [2.5, 15 + 20 * k],
      ] as [number, number][],
    })),
    labels: Array.from({ length: n }, (_, k) => ({ text: `Lake ${k + 1}`, on: `s${k}` })),
    marks: [],
    frame: { x: [0, 3], y: [0, 100], yStep: 20, categories: ["A", "B", "C"] },
    ...extra,
  };
}

describe("gap 1: line charts with three or more series", () => {
  it("gives each series its own line pattern and marker, keyed in the legend", () => {
    const scene = buildChart(lineChart(4), CHART_BOX);
    const lines = paths(scene).filter((p) => /^s\d$/.test(p.partId ?? "") && !p.fill);
    expect(lines.map((p) => p.weight)).toEqual(["line", "dashed", "dotted", "dashdot"]);
    // Markers: filled triangle, open square, open circle, filled diamond (three points each).
    const markers = paths(scene).filter((p) => /^s\d$/.test(p.partId ?? "") && p.fill);
    expect(markers).toHaveLength(12);
    const fillOf = (id: string) => markers.find((m) => m.partId === id)?.fill;
    expect([fillOf("s0"), fillOf("s1"), fillOf("s2"), fillOf("s3")]).toEqual([
      "ink",
      "paper",
      "paper",
      "ink",
    ]);
    // No two series share both pattern and marker shape.
    const shapes = ["s0", "s1", "s2", "s3"].map(
      (id) => markers.find((m) => m.partId === id)!.d.split(" ").length
    );
    const keys = lines.map((l, i) => `${l.weight}/${shapes[i]}`);
    expect(new Set(keys).size).toBe(4);
    // The legend carries the same pattern and a marker for every series.
    const legend = paths(scene).filter((p) => p.partId === "legend");
    expect(legend.filter((p) => !p.fill).map((p) => p.weight)).toEqual([
      "line",
      "dashed",
      "dotted",
      "dashdot",
    ]);
    expect(legend.filter((p) => p.fill)).toHaveLength(4);
  });

  it("keeps the plain look (solid and dashed, filled dots) below three series", () => {
    expect(STYLED_FROM).toBe(3);
    const scene = buildChart(lineChart(2), CHART_BOX);
    const lines = paths(scene).filter((p) => /^s\d$/.test(p.partId ?? "") && !p.fill);
    expect(lines.map((p) => p.weight)).toEqual(["line", "dashed"]);
    const dots = paths(scene).filter((p) => /^s\d$/.test(p.partId ?? "") && p.fill);
    expect(dots.every((d) => d.fill === "ink" && d.d.includes("A"))).toBe(true);
  });
});

describe("gap 2: the origin label", () => {
  it('prints the SAT\'s italic "O" when the frame asks for it', () => {
    const scene = buildPlane(
      plane({ x: [-5, 5], y: [-5, 5], step: 1, originLabel: "O" }),
      PLANE_BOX
    );
    const o = texts(scene).filter((t) => t.text === "O");
    expect(o).toHaveLength(1);
    expect(o[0].italic).toBe(true);
    expect(scene.issues).toEqual([]);
  });

  it("parses the old boolean forms unchanged", () => {
    expect(parseFigureSpec(plane({ x: [-5, 5], y: [-5, 5], originLabel: false })).ok).toBe(true);
    expect(parseFigureSpec(plane({ x: [-5, 5], y: [-5, 5], originLabel: true })).ok).toBe(true);
    const bad = {
      ...plane({ x: [-5, 5], y: [-5, 5] }),
      frame: { x: [-5, 5], y: [-5, 5], originLabel: "o" },
    };
    expect(parseFigureSpec(bad).ok).toBe(false);
  });

  it("moves the label to a free corner when the tick labels crowd it, and never overlaps them", () => {
    // 2024-05_ASIA_V1_MATH_M2_Q02: x -10..10 by 2, y -16..16 by 2, in the default box.
    const spec = plane({ x: [-10, 10], y: [-16, 16], step: 2, originLabel: "O" });
    const scene = buildPlane(spec, PLANE_BOX);
    const o = texts(scene).find((t) => t.text === "O");
    expect(o).toBeDefined();
    for (const t of texts(scene)) {
      if (t === o) continue;
      const [w, h] = textOverlap(o!, t);
      expect(w > 1 && h > 1).toBe(false);
    }
  });

  it("reports an origin label with no free corner instead of dropping it", () => {
    // Labels every unit on a tiny box leave no corner free.
    const scene = buildPlane(plane({ x: [-2, 2], y: [-2, 2], step: 1, labelStep: 1 }), {
      width: 120,
      height: 90,
    });
    const zero = texts(scene).some((t) => t.text === "0");
    const reported = scene.issues.some(
      (i) => i.code === "label_collision" && i.detail.includes("origin")
    );
    expect(zero || reported).toBe(true);
    expect(zero && reported).toBe(false);
  });
});

describe("gap 3: thousands separators", () => {
  it("groups thousands only when the frame asks", () => {
    expect(tickText(1200, true)).toBe("1,200");
    expect(tickText(-12500, true)).toBe("\u221212,500");
    expect(tickText(1050.5, true)).toBe("1,050.5");
    expect(tickText(800, true)).toBe("800");
    expect(tickText(2016)).toBe("2016");
  });

  it("prints 1,200 on the y-axis and leaves x alone with thousands: y", () => {
    const spec = plane({
      x: [1000, 4000],
      y: [0, 1200],
      step: 1000,
      yStep: 400,
      thousands: "y",
    });
    const t = texts(buildPlane(spec, PLANE_BOX)).map((i) => i.text);
    expect(t).toContain("1,200");
    expect(t).toContain("2000");
    expect(t).not.toContain("1200");
  });

  it("explains a missing 1,200 when the frame does not group thousands", () => {
    const spec = plane({ x: [0, 4], y: [0, 1200], step: 1, yStep: 400 });
    const issues = checkSpec(spec, ["1", "2", "3", "4", "400", "800", "1,200", "0", "x", "y"]);
    const missing = issues.find((i) => i.detail.startsWith('"1,200"'));
    expect(missing?.detail).toContain("frame.thousands");
  });
});

describe("negative tick numbers use the true minus sign (U+2212)", () => {
  it("prints −2 and −1,200, never an ASCII hyphen", () => {
    expect(tickText(-2)).toBe("\u22122");
    expect(tickText(-1200, true)).toBe("\u22121,200");
    expect(tickText(-0.5)).toBe("\u22120.5");
    expect(tickText(0)).toBe("0");
  });

  it("draws every negative tick label on a plane with U+2212", () => {
    const scene = buildPlane(plane({ x: [-5, 5], y: [-5, 5], step: 1 }), PLANE_BOX);
    const numbers = texts(scene).filter((t) => /\d/.test(t.text));
    expect(numbers.some((t) => t.text.startsWith("\u2212"))).toBe(true);
    expect(numbers.some((t) => t.text.includes("-"))).toBe(false);
  });

  it("still matches a transcription written with a hyphen or a minus", () => {
    const spec = plane({ x: [-2, 2], y: [-2, 2], step: 1, originLabel: false });
    const drawn = texts(buildPlane(spec, PLANE_BOX)).map((t) => t.text);
    const hyphens = drawn.map((t) => t.replace("\u2212", "-"));
    expect(checkSpec(spec, hyphens)).toEqual([]);
    expect(checkSpec(spec, drawn)).toEqual([]);
  });
});

describe("gap 4: axis letter and axis title together", () => {
  it("draws the letters at the axis ends and the titles beside the axes", () => {
    const spec = plane({
      x: [0, 80],
      y: [0, 80],
      step: 10,
      xLabel: "x",
      yLabel: "y",
      xTitle: "Time (minutes)",
      yTitle: "Concentration of bacteria (millions of cells per mL)",
    });
    const scene = buildPlane(spec, PLANE_BOX);
    const t = texts(scene);
    expect(t.find((i) => i.text === "x")?.italic).toBe(true);
    expect(t.find((i) => i.text === "y")?.italic).toBe(true);
    const xTitle = t.find((i) => i.text === "Time (minutes)")!;
    expect(xTitle.rotate).toBeUndefined();
    // Under the x tick labels.
    const xTicks = t.filter((i) => i.text === "40");
    expect(xTitle.y).toBeGreaterThan(Math.max(...xTicks.map((i) => i.y)));
    // The y title reads upward, left of every y tick label, and stays inside the box.
    const yTitle = t.filter((i) => i.rotate === -90);
    expect(yTitle.length).toBeGreaterThan(0);
    const leftOfTicks = Math.min(...t.filter((i) => i.anchor === "end").map((i) => textBox(i)[0]));
    for (const line of yTitle) {
      expect(textBox(line)[1]).toBeLessThanOrEqual(leftOfTicks);
      expect(textBox(line)[0]).toBeGreaterThanOrEqual(-0.01);
    }
    expect(
      checkSpec(
        spec,
        t.map((i) => i.text)
      )
    ).toEqual([]);
  });

  it("draws no letter beside a title unless the spec names one", () => {
    const spec = plane({ x: [0, 10], y: [0, 10], xTitle: "Year", yTitle: "Days" });
    const t = texts(buildPlane(spec, PLANE_BOX)).map((i) => i.text);
    expect(t).not.toContain("x");
    expect(t).not.toContain("y");
    expect(t).toContain("Year");
    expect(t).toContain("Days");
  });
});

describe("gap 5: arrowheads on the axes", () => {
  it("puts arrowheads on the positive ends, past the grid, with the letters at the tips", () => {
    const spec = plane({ x: [0, 4], y: [0, 1200], step: 1, yStep: 100, arrows: true });
    const scene = buildPlane(spec, PLANE_BOX);
    const axes = paths(scene).filter((p) => p.partId === "axis");
    expect(axes).toHaveLength(2);
    expect(axes.every((a) => a.arrows === "end")).toBe(true);
    const x = texts(scene).find((t) => t.text === "x")!;
    const y = texts(scene).find((t) => t.text === "y")!;
    expect(x.anchor).toBe("start"); // right of the arrow tip
    expect(y.anchor).toBe("middle"); // above the arrow tip
    expect(
      checkSpec(
        spec,
        texts(scene).map((t) => t.text)
      )
    ).toEqual([]);
  });

  it('puts arrowheads on both ends with arrows: "both"', () => {
    const scene = buildPlane(plane({ x: [-5, 5], y: [-5, 5], arrows: "both" }), PLANE_BOX);
    expect(
      paths(scene)
        .filter((p) => p.partId === "axis")
        .every((a) => a.arrows === "both")
    ).toBe(true);
  });

  it("draws no arrowheads by default", () => {
    const scene = buildPlane(plane({ x: [-5, 5], y: [-5, 5] }), PLANE_BOX);
    expect(paths(scene).some((p) => p.partId === "axis" && p.arrows)).toBe(false);
  });
});

describe("gap 6: crowded tick labels are never dropped silently", () => {
  it("keeps a label step the spec sets whenever the labels fit (every 75 on 2023-06 Q12)", () => {
    const spec = lineChart(3, {
      frame: {
        x: [0, 4],
        y: [0, 1050],
        yStep: 75,
        yLabelStep: 75,
        thousands: "y",
        categories: ["1960", "1979", "1986", "2000"],
      },
    });
    const t = texts(buildChart(spec, CHART_BOX)).map((i) => i.text);
    for (const v of ["75", "225", "975", "1,050"]) expect(t).toContain(v);
  });

  it("thins an explicit label step that would overlap and fails the check with a clear message", () => {
    const spec = plane({ x: [0, 100], y: [0, 10], step: 1, labelStep: 1 }, { type: "plane" });
    const scene = buildPlane(spec, PLANE_BOX);
    const crowded = scene.issues.find((i) => i.code === "crowded_ticks");
    expect(crowded?.detail).toMatch(/x tick labels every 1 would overlap.*frame\.labelStep/);
    // Drawn labels never overlap each other.
    const xs = texts(scene).filter((t) => t.anchor === "middle");
    for (let i = 1; i < xs.length; i++)
      expect(textOverlap(xs[i - 1], xs[i])[0]).toBeLessThanOrEqual(1);
  });

  it("explains a tick number of the original that automatic thinning left out", () => {
    const spec = lineChart(1, {
      labels: [],
      frame: { x: [0, 3], y: [0, 1050], yStep: 75, categories: ["A", "B", "C"] },
    });
    const scene = buildChart(spec, CHART_BOX);
    expect(scene.thinned).toEqual([{ axis: "y", asked: 75, drawn: 150 }]);
    const issue = checkSpec(spec, ["A", "B", "C", "0", "75", "150"]).find((i) =>
      i.detail.startsWith('"75"')
    );
    expect(issue?.detail).toContain("frame.yLabelStep to 75");
  });

  it("tickHint says nothing for a number that is not a thinned tick", () => {
    expect(tickHint("7", [{ axis: "y", asked: 75, drawn: 150 }], [])).toBe("");
    expect(tickHint("Days", [], [])).toBe("");
  });
});

describe("gap 7: a long chart title never meets the y-axis name", () => {
  it("steps the y name above the plot down below the title", () => {
    const spec = lineChart(4, {
      title: "Total Science Research Submissions by Topic, 2016–2019",
      frame: {
        x: [0, 4],
        y: [0, 350],
        yStep: 50,
        categories: ["2016", "2017", "2018", "2019"],
        xLabel: "Year",
        yLabel: "Number of submissions",
      },
    });
    const scene = buildChart(spec, CHART_BOX);
    expect(scene.issues).toEqual([]);
    const all = texts(scene);
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++) {
        const [w, h] = textOverlap(all[i], all[j]);
        expect(w > 1 && h > 1, `${all[i].text} / ${all[j].text}`).toBe(false);
      }
  });

  it("leaves a chart without a crowded title where it was", () => {
    const short = lineChart(2, {
      title: "Days",
      frame: { x: [0, 3], y: [0, 100], categories: ["A", "B", "C"], yLabel: "Number of days" },
    });
    const none = lineChart(2, {
      frame: { x: [0, 3], y: [0, 100], categories: ["A", "B", "C"], yLabel: "Number of days" },
    });
    const yName = (s: FigureSpec) =>
      texts(buildChart(s, CHART_BOX)).find((t) => t.text === "Number of days")!;
    // With a title the plot sits lower by the title's room only.
    expect(yName(short).x).toBe(yName(none).x);
  });
});

describe("gap 8: the plural note", () => {
  const shape = (note?: true | "figures"): FigureSpec => ({
    version: FIGURE_SPEC_VERSION,
    type: "geometry2d",
    parts: [
      { kind: "point", id: "A", x: 0, y: 0 },
      { kind: "point", id: "B", x: 100, y: 0 },
      { kind: "point", id: "C", x: 0, y: 80 },
      { kind: "polygon", id: "T", points: ["A", "B", "C"] },
    ],
    labels: [],
    marks: [],
    ...(note ? { notToScale: note } : {}),
  });

  it('prints "Note: Figures not drawn to scale." with notToScale: "figures"', () => {
    const scene = buildGeometry2d(shape("figures"), { width: 400, height: 300 });
    expect(
      texts(scene)
        .map((t) => t.text)
        .join(" ")
    ).toContain(NOT_TO_SCALE_PLURAL);
    expect(parseFigureSpecs([shape(), shape("figures")]).ok).toBe(true);
  });

  it("passes one plural note under the last of several figures", () => {
    const issues = checkSpecs([shape(), shape("figures")], [NOT_TO_SCALE_PLURAL]);
    expect(issues.filter((i) => i.detail.includes("note"))).toEqual([]);
  });

  it("refuses a singular note on each of several figures", () => {
    const issues = checkSpecs([shape(true), shape(true)], []);
    expect(issues.some((i) => /set notToScale on figure 2 only/.test(i.detail))).toBe(true);
  });
});

describe("gap 9: rotated category labels", () => {
  const bars = (categories: string[], rotateCategories?: boolean): FigureSpec => ({
    version: FIGURE_SPEC_VERSION,
    type: "bar",
    parts: [{ kind: "series", id: "s", values: categories.map((_, i) => i + 1) }],
    labels: [],
    marks: [],
    frame: {
      x: [0, categories.length],
      y: [0, 10],
      categories,
      ...(rotateCategories === undefined ? {} : { rotateCategories }),
    },
  });
  const names = ["30–39", "40–49", "50–59", "60–69", "70–79", "80–89", "90–100"];

  it("turns category names 45° when one does not fit its band, without overlaps", () => {
    const long = names.map((n) => `${n}percentile`);
    const scene = buildChart(bars(long), CHART_BOX);
    const cats = texts(scene).filter((t) => long.includes(t.text));
    expect(cats).toHaveLength(long.length);
    expect(cats.every((t) => t.rotate === -45 && t.anchor === "end")).toBe(true);
    // Slanted names neither overlap each other nor run past the figure's edge.
    const layout = checkSpec(bars(long), []).filter((x) => x.code !== "missing_label");
    expect(layout).toEqual([]);
  });

  it("turns them on request, and keeps upright names that fit", () => {
    const turned = texts(buildChart(bars(names, true), CHART_BOX)).filter((t) =>
      names.includes(t.text)
    );
    expect(turned.every((t) => t.rotate === -45)).toBe(true);
    const upright = texts(buildChart(bars(names), CHART_BOX)).filter((t) => names.includes(t.text));
    expect(upright.every((t) => t.rotate === undefined)).toBe(true);
  });

  it("measures overlap of two slanted names in their own turned frame", () => {
    const a: TextItem = {
      t: "text",
      x: 100,
      y: 100,
      text: "1980–81",
      role: "ink",
      anchor: "end",
      rotate: -45,
    };
    const b: TextItem = { ...a, x: 140 };
    const [w, h] = textOverlap(a, b);
    expect(w > 1 && h > 1).toBe(false);
    // Their upright boxes around the slant do overlap; the turned frame is what counts.
    const [bw, bh] = [textBox(a), textBox(b)];
    expect(Math.min(bw[1], bh[1]) - Math.max(bw[0], bh[0])).toBeGreaterThan(1);
  });
});

describe("gap 10: labels outside their angle, on a curve, or dropped", () => {
  const angleSpec: FigureSpec = {
    version: FIGURE_SPEC_VERSION,
    type: "geometry2d",
    parts: [
      { kind: "point", id: "B", x: 0, y: 0 },
      { kind: "point", id: "A", x: 100, y: 0 },
      { kind: "point", id: "C", x: 0, y: -100 },
      { kind: "angle", id: "a", vertex: "B", from: "A", to: "C" },
    ],
    labels: [{ text: "x°", on: "a" }],
    marks: [],
  };
  const points = new Map<string, [number, number]>([
    ["B", [100, 200]],
    ["A", [200, 200]],
    ["C", [100, 100]],
  ]);
  const sceneWith = (x: number, y: number, extra: SceneItem[] = []): Scene => ({
    width: 400,
    height: 300,
    items: [...extra, { t: "text", x, y, text: "x°", role: "ink", anchor: "middle", partId: "a" }],
    issues: [],
    description: "",
  });

  it("passes a label inside its angle", () => {
    expect(labelDrift(angleSpec, sceneWith(125, 185), points)).toEqual([]);
  });

  it("flags a label that drifted outside its angle", () => {
    const issues = labelDrift(angleSpec, sceneWith(70, 230), points);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("label_drift");
    expect(issues[0].detail).toContain("outside its angle ABC");
  });

  it("flags a label drawn across a curve, measured on the arc and not its chord", () => {
    // A half circle bulging up from (100,200) to (200,200); the label sits on its top.
    const arc: SceneItem = {
      t: "path",
      d: "M100 200 A50 50 0 0 1 200 200",
      role: "ink",
      weight: "line",
      partId: "k",
    };
    const issues = labelsOnLines(angleSpec, sceneWith(150, 155, [arc]));
    expect(issues.map((i) => i.code)).toEqual(["label_collision"]);
    expect(issues[0].detail).toContain('sits on a line or curve of "k"');
    // Clear of the arc, it passes (its chord would have been far away anyway).
    expect(labelsOnLines(angleSpec, sceneWith(150, 120, [arc]))).toEqual([]);
  });

  it("flags a label drawn nowhere, unless the builder already said why", () => {
    const empty: Scene = { width: 400, height: 300, items: [], issues: [], description: "" };
    expect(droppedLabels(angleSpec, empty, []).map((i) => i.code)).toEqual(["missing_label"]);
    const said = [
      { code: "label_collision" as const, detail: 'No free spot for label "x°"; it was left out.' },
    ];
    expect(droppedLabels(angleSpec, empty, said)).toEqual([]);
  });

  it("flags a lone series' name, which a chart without a legend never draws", () => {
    const one = lineChart(1);
    const issues = checkSpec(one, ["A", "B", "C", "0", "20", "40", "60", "80", "100", "Lake 1"]);
    expect(
      issues.some((i) => i.code === "missing_label" && i.detail.includes('"Lake 1" is not drawn'))
    ).toBe(true);
  });
});
