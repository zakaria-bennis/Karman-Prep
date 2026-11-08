// The engine gaps the 2026-11-08 redraw of held figures found (figure-redraw/held-02 to
// held-11a and keyfix-20261108), one block each: fixed-decimal and offset ticks, one-series
// legends, chosen line styles, notes and free text on planes, equal units, shading,
// dimension arrows, captions, and y labels every 1 kept by a taller chart.
import { describe, expect, it } from "vitest";
import { buildChart } from "@/lib/figures/engine/charts";
import { checkSpec, checkSpecs } from "@/lib/figures/engine/checks";
import { buildGeometry2d } from "@/lib/figures/engine/geometry2d";
import { placeLabels, textBox } from "@/lib/figures/engine/labels";
import { NOT_TO_SCALE } from "@/lib/figures/engine/notes";
import { buildPlane } from "@/lib/figures/engine/plane";
import { planeAxes, tickText } from "@/lib/figures/engine/plane-axes";
import type { Scene, SceneItem } from "@/lib/figures/engine/scene";
import { buildSolid3d } from "@/lib/figures/engine/solid3d";
import {
  FIGURE_SPEC_VERSION,
  parseFigureSpec,
  type FigureSpec,
  type Part,
  type PlaneFrame,
} from "@/lib/figures/engine/spec";
import { tickValues } from "@/lib/figures/engine/ticks";

type TextItem = Extract<SceneItem, { t: "text" }>;
type PathItem = Extract<SceneItem, { t: "path" }>;
const texts = (s: Scene) => s.items.filter((i): i is TextItem => i.t === "text");
const paths = (s: Scene) => s.items.filter((i): i is PathItem => i.t === "path");
const words = (s: Scene) => texts(s).map((t) => t.text);
const CHART_BOX = { width: 600, height: 400 };
const PLANE_BOX = { width: 640, height: 480 };
const SHAPE_BOX = { width: 400, height: 300 };

const spec = (
  type: FigureSpec["type"],
  parts: Part[],
  extra: Partial<FigureSpec> = {}
): FigureSpec => ({ version: FIGURE_SPEC_VERSION, type, parts, labels: [], marks: [], ...extra });

const bar = (values: number[], frame: Partial<PlaneFrame>, extra: Partial<FigureSpec> = {}) =>
  spec("bar", [{ kind: "series", id: "s1", values }], {
    frame: { x: [0, values.length], y: [0, 3.5], yStep: 0.5, ...frame },
    ...extra,
  });

describe("gap 1: fixed-decimal tick labels", () => {
  it("prints every number but 0 with the decimals asked for", () => {
    expect(tickText(1, false, 1)).toBe("1.0");
    expect(tickText(0.1, false, 2)).toBe("0.10");
    expect(tickText(15, false, 1)).toBe("15.0");
    expect(tickText(0, false, 1)).toBe("0");
    expect(tickText(-2.5, false, 2)).toBe("−2.50");
    expect(tickText(1200, true, 1)).toBe("1,200.0");
  });

  it("labels a bar chart's y-axis 0, 0.5, 1.0 ... 3.5 (2024-05_ASIA_V3_RW_M1_Q13)", () => {
    const scene = buildChart(bar([3.1, 2.65, 2.85], { yDecimals: 1 }), CHART_BOX);
    const shown = words(scene);
    for (const t of ["0", "0.5", "1.0", "1.5", "2.0", "2.5", "3.0", "3.5"]) {
      expect(shown).toContain(t);
    }
    expect(shown).not.toContain("1");
    expect(shown).not.toContain("0.0");
  });

  it("leaves stored frames without decimals as they were", () => {
    const shown = words(buildChart(bar([3.1, 2.65, 2.85], {}), CHART_BOX));
    expect(shown).toContain("1");
    expect(shown).not.toContain("1.0");
  });

  it("refuses decimals that are not a whole number from 0 to 6", () => {
    expect(parseFigureSpec(bar([1], { yDecimals: 1.5 })).ok).toBe(false);
    expect(parseFigureSpec(bar([1], { xDecimals: 7 })).ok).toBe(false);
  });
});

describe("gap 2: ticks counted from an origin", () => {
  it("steps from the origin, exactly", () => {
    expect(tickValues(0, 16, 4, 3)).toEqual([3, 7, 11, 15]);
    expect(tickValues(50, 65, 3, 50)).toEqual([50, 53, 56, 59, 62, 65]);
    expect(tickValues(0, 1, 0.2, 0.1)).toEqual([0.1, 0.3, 0.5, 0.7, 0.9]);
  });

  it("labels y 3, 7, 11, 15 on a plane gridded every 1 (2026-10_ASIA_V4_MATH_M1_Q12)", () => {
    const frame: PlaneFrame = {
      x: [-8, 8],
      y: [0, 16],
      step: 1,
      labelStep: 4,
      yTickOrigin: 3,
      yLabelStep: 4,
    };
    const shown = words(buildPlane(spec("plane", [], { frame }), PLANE_BOX));
    for (const t of ["3", "7", "11", "15", "−8", "−4", "4", "8"]) {
      expect(shown).toContain(t);
    }
    for (const t of ["12", "16"]) expect(shown).not.toContain(t);
  });

  it("labels histogram bin edges 51, 55, ... 71 (2026-10_ASIA_V5_MATH_M1_Q02)", () => {
    const hist = spec(
      "histogram",
      [
        {
          kind: "series",
          id: "s1",
          values: [
            [51, 4],
            [55, 6],
            [59, 5],
            [63, 8],
            [67, 2],
          ],
        },
      ],
      { frame: { x: [51, 71], y: [0, 8], step: 4, yStep: 1, xTickOrigin: 51 } }
    );
    const scene = buildChart(hist, CHART_BOX);
    const shown = words(scene);
    for (const t of ["51", "55", "59", "63", "67", "71"]) expect(shown).toContain(t);
    expect(shown).not.toContain("52");
    expect(
      checkSpec(hist, [...["51", "55", "59", "63", "67", "71"], ..."012345678", "x", "y"])
    ).toEqual([]);
  });

  it("labels a dot plot 2, 5, 8, 11, 14 (2024-06_US_V1_MATH_M1_Q22)", () => {
    const dots = spec(
      "dot_plot",
      [
        {
          kind: "series",
          id: "s1",
          values: [
            [2, 7],
            [5, 6],
            [8, 4],
            [11, 6],
            [14, 7],
          ],
        },
      ],
      { frame: { x: [0.5, 15.5], y: [0, 7], step: 3, xTickOrigin: 2 } }
    );
    const numbers = words(buildChart(dots, CHART_BOX)).filter((t) => /^\d+$/.test(t));
    expect(numbers).toEqual(["2", "5", "8", "11", "14"]);
  });

  it("keeps minor ticks off the labelled ticks counted from the origin", () => {
    const frame: PlaneFrame = { x: [0, 10], y: [0, 16], step: 4, yTickOrigin: 3, yMinorStep: 1 };
    const { items } = planeAxes(frame, PLANE_BOX);
    const minor = items.filter(
      (i): i is PathItem => i.t === "path" && /^M\S+ \S+ L\S+ \S+$/.test(i.d) && i.d.length > 0
    );
    // 16 minor values 0..16 less the 4 labelled (3, 7, 11, 15) and the x-axis at 0.
    const short = minor.filter((p) => {
      const [x1, , x2] = p.d.replace(/[ML]/g, "").split(/\s+/).map(Number);
      return Math.abs(x2 - x1 - 4) < 1e-6;
    });
    expect(short).toHaveLength(12);
  });
});

describe("gap 3: a legend for one series", () => {
  const fuel = (legend?: boolean) =>
    bar(
      [36, 23, 40, 34],
      { y: [0, 45], yStep: 5, categories: ["gasoline", "ethanol", "POP biofuel", "jet fuel"] },
      { labels: [{ text: "Fuel", on: "s1" }], ...(legend ? { legend } : {}) }
    );

  it("draws the legend when the spec asks for it (2025-05_US_V2_RW_M2_Q07)", () => {
    const scene = buildChart(fuel(true), CHART_BOX);
    expect(words(scene)).toContain("Fuel");
    expect(scene.items.some((i) => i.t === "rect" && i.partId === "legend")).toBe(true);
  });

  it("draws none for one series by default, and says how to ask for one", () => {
    expect(words(buildChart(fuel(), CHART_BOX))).not.toContain("Fuel");
    const issues = checkSpec(fuel(), ["Fuel"]);
    expect(issues.some((i) => i.detail.includes("legend: true"))).toBe(true);
  });
});

describe("gap 4: a line series' own style", () => {
  const nuts = (styles: (Part & { kind: "series" })["style"][]) =>
    spec(
      "line",
      styles.map((style, k) => ({
        kind: "series" as const,
        id: `s${k}`,
        values: [
          [0.5, 1 + k / 4],
          [1.5, 2 - k / 4],
        ] as [number, number][],
        ...(style ? { style } : {}),
      })),
      {
        frame: { x: [0, 2], y: [0, 3], yStep: 1, categories: ["a", "b"] },
        labels: styles.map((_, k) => ({ text: `series ${k}`, on: `s${k}` })),
      }
    );

  it("draws triangles and shaded squares for two series (2026-06_ASIA_V4_RW_M1_Q09)", () => {
    const scene = buildChart(
      nuts([{ marker: "triangle" }, { marker: "square", fill: "shaded" }]),
      CHART_BOX
    );
    const s1 = paths(scene).filter((p) => p.partId === "s1");
    const line = s1.find((p) => !p.fill)!;
    expect(line.weight).toBe("dashed"); // the second series keeps its dashed line
    const markers = s1.filter((p) => p.fill);
    expect(markers).toHaveLength(2);
    expect(markers.every((m) => m.fill === "ink-muted" && m.d.split("L").length === 4)).toBe(true);
    // The legend shows the same marker.
    const legend = paths(scene).filter((p) => p.partId === "legend" && p.fill === "ink-muted");
    expect(legend).toHaveLength(1);
  });

  it("draws a muted line with open stars, and no marker when asked", () => {
    const scene = buildChart(
      nuts([{ line: "solid", marker: "star", fill: "open", muted: true }, { marker: "none" }]),
      CHART_BOX
    );
    const s0 = paths(scene).filter((p) => p.partId === "s0");
    expect(s0.find((p) => !p.fill)!.role).toBe("ink-muted");
    const stars = s0.filter((p) => p.fill === "paper");
    expect(stars).toHaveLength(2);
    expect(stars[0].d.split("L")).toHaveLength(8);
    expect(paths(scene).filter((p) => p.partId === "s1")).toHaveLength(1);
  });

  it("leaves unstyled series to their order", () => {
    const scene = buildChart(nuts([undefined, undefined]), CHART_BOX);
    const dots = paths(scene).filter((p) => p.partId === "s0" && p.fill);
    expect(dots.every((d) => d.d.includes("A"))).toBe(true);
  });

  it("refuses an unknown marker", () => {
    const bad = nuts([{ marker: "triangle" }]);
    (bad.parts[0] as { style: unknown }).style = { marker: "hexagon" };
    expect(parseFigureSpec(bad).ok).toBe(false);
  });
});

describe("gap 5: planes print the note and free-standing text", () => {
  const quadrants = (extra: Partial<FigureSpec> = {}) =>
    spec(
      "plane",
      [
        { kind: "text", id: "q1", x: 3, y: 3 },
        { kind: "text", id: "q2", x: -3, y: 3 },
        { kind: "text", id: "q3", x: -3, y: -3 },
        { kind: "text", id: "q4", x: 3, y: -3 },
      ],
      {
        frame: { x: [-6, 6], y: [-6, 6], grid: false, xLabel: "x", yLabel: "y", step: 20 },
        labels: [
          { text: "I", on: "q1" },
          { text: "II", on: "q2" },
          { text: "III", on: "q3" },
          { text: "IV", on: "q4" },
        ],
        ...extra,
      }
    );

  it("centers each quadrant name on its spot (2025-12_ASIA_V3_MATH_M2_Q03)", () => {
    const scene = buildPlane(quadrants(), PLANE_BOX);
    const { map } = planeAxes(quadrants().frame!, PLANE_BOX);
    const one = texts(scene).find((t) => t.text === "I")!;
    const [l, r, t, b] = textBox(one);
    expect((l + r) / 2).toBeCloseTo(map.px(3), 6);
    expect((t + b) / 2).toBeCloseTo(map.py(3), 6);
    expect(checkSpec(quadrants(), ["I", "II", "III", "IV", "x", "y", "0"])).toEqual([]);
  });

  it("prints the not-to-scale note under the plane, clear of it", () => {
    const scene = buildPlane(quadrants({ notToScale: true }), PLANE_BOX);
    const note = texts(scene).find((t) => t.text === NOT_TO_SCALE)!;
    expect(note).toBeDefined();
    const axisBottom = Math.max(
      ...texts(scene)
        .filter((t) => t !== note)
        .map((t) => textBox(t)[3])
    );
    expect(textBox(note)[2]).toBeGreaterThan(axisBottom);
    expect(
      checkSpec(quadrants({ notToScale: true }), [
        "I",
        "II",
        "III",
        "IV",
        "x",
        "y",
        "0",
        NOT_TO_SCALE,
      ])
    ).toEqual([]);
  });

  it("places a label in the corner two crossing lines leave free (2025-05_US_V2_MATH_M2_Q19)", () => {
    // A vertical and a horizontal line cross at the anchor; only the corners are free.
    const items: SceneItem[] = [
      { t: "path", d: "M100 0 L100 300", role: "ink", weight: "line" },
      { t: "path", d: "M0 100 L300 100", role: "ink", weight: "line" },
      { t: "path", d: "M100 100 L300 0", role: "ink", weight: "line" },
      { t: "path", d: "M0 0 L100 100", role: "ink", weight: "line" },
    ];
    const label = {
      text: "(s, t)",
      anchor: { x: 100, y: 100 },
      preferred: { dx: Math.SQRT1_2, dy: -Math.SQRT1_2 },
      partId: "S",
    };
    const placed = placeLabels(items, [label], { width: 300, height: 300 });
    expect(placed.issues).toEqual([]);
    const [l, r, t, b] = textBox(placed.items[4] as TextItem);
    // Below the horizontal line, beside the vertical one, on one side.
    expect(t).toBeGreaterThan(100);
    expect(r < 100 || l > 100).toBe(true);
    expect(b).toBeLessThan(150);
  });
});

describe("gap 6: equal units", () => {
  const circle = (equalUnits?: boolean) =>
    spec(
      "plane",
      [
        { kind: "point", id: "O", x: 0, y: 0 },
        { kind: "circle", id: "c", center: "O", radius: 8 },
      ],
      {
        frame: {
          x: [-11, 13],
          y: [-12, 12],
          grid: false,
          step: 20,
          ...(equalUnits ? { equalUnits } : {}),
        },
      }
    );

  it("makes one unit as long on x as on y, so a circle stays round", () => {
    const { map } = planeAxes(circle(true).frame!, PLANE_BOX);
    expect(map.px(1) - map.px(0)).toBeCloseTo(map.py(0) - map.py(1), 9);
    const unequal = planeAxes(circle().frame!, PLANE_BOX).map;
    expect(
      Math.abs(unequal.px(1) - unequal.px(0) - (unequal.py(0) - unequal.py(1)))
    ).toBeGreaterThan(1);
  });

  it("checks points on the circle through the same map", () => {
    const s = circle(true);
    s.parts.push({ kind: "point", id: "Q", x: 8, y: 0, on: ["c"] });
    expect(checkSpec(s, ["0"]).filter((i) => i.code === "off_line")).toEqual([]);
  });
});

describe("gap 7: shading, dimension arrows and region names in geometry", () => {
  const P = (id: string, x: number, y: number): Part => ({ kind: "point", id, x, y });
  const pool = (): FigureSpec =>
    spec(
      "geometry2d",
      [
        P("O1", 0, 0),
        P("O2", 500, 0),
        P("O3", 500, 380),
        P("O4", 0, 380),
        P("I1", 70, 70),
        P("I2", 430, 70),
        P("I3", 430, 310),
        P("I4", 70, 310),
        P("d1", 380, 0),
        P("d2", 380, 70),
        P("d3", 0, 190),
        P("d4", 70, 190),
        { kind: "polygon", id: "out", points: ["O1", "O2", "O3", "O4"] },
        { kind: "polygon", id: "pool", points: ["I1", "I2", "I3", "I4"], shade: "shade" },
        { kind: "dimension", id: "top", from: "d1", to: "d2" },
        { kind: "dimension", id: "left", from: "d3", to: "d4" },
        { kind: "text", id: "path", x: 220, y: 35 },
        { kind: "text", id: "name", x: 250, y: 190 },
      ],
      {
        labels: [
          { text: "concrete path", on: "path" },
          { text: "pool", on: "name" },
          { text: "x ft", on: "top" },
          { text: "x ft", on: "left" },
        ],
        notToScale: true,
      }
    );

  it("draws the pool in its path (2025-10_ASIA_V1_MATH_M2_Q14)", () => {
    const scene = buildGeometry2d(pool(), SHAPE_BOX);
    const fill = paths(scene).find((p) => p.partId === "pool" && p.fill)!;
    expect(fill).toMatchObject({ fill: "fill-shade", stroke: false });
    // The fill sits under every line.
    expect(scene.items.indexOf(fill)).toBe(0);
    const arrows = paths(scene).filter((p) => p.arrows === "both");
    expect(arrows.map((a) => a.partId).sort()).toEqual(["left", "top"]);
    expect(words(scene)).toEqual(
      expect.arrayContaining(["concrete path", "pool", "x ft", "x ft", NOT_TO_SCALE])
    );
    // No dots on the arrows' ends.
    expect(paths(scene).some((p) => p.partId?.startsWith("d"))).toBe(false);
    const issues = checkSpec(pool(), ["concrete path", "pool", "x ft", "x ft", NOT_TO_SCALE]);
    expect(issues).toEqual([]);
  });

  it("shades a quarter sector of a circle (2026-06_ASIA_V1_MATH_M1_Q16)", () => {
    const s = spec(
      "geometry2d",
      [
        P("O", 0, 0),
        P("A", -90, 0),
        P("B", 0, -90),
        { kind: "circle", id: "c", center: "O", through: "A" },
        { kind: "segment", id: "OA", from: "O", to: "A" },
        { kind: "segment", id: "OB", from: "O", to: "B" },
        { kind: "sector", id: "q", center: "O", from: "A", to: "B" },
      ],
      { labels: ["A", "B", "O"].map((t) => ({ text: t, on: t })) }
    );
    const scene = buildGeometry2d(s, SHAPE_BOX);
    const fill = paths(scene).find((p) => p.partId === "q")!;
    expect(fill).toMatchObject({ fill: "fill-shade", stroke: false });
    // It runs from the center out along the arc: the quarter to the upper left.
    const pts = fill.d.replace(/[MLZ]/g, " ").trim().split(/\s+/).map(Number);
    const O = scene.points!.O;
    const xs = pts.filter((_, i) => i % 2 === 0);
    const ys = pts.filter((_, i) => i % 2 === 1);
    expect(Math.max(...xs)).toBeCloseTo(O[0], 1);
    expect(Math.max(...ys)).toBeCloseTo(O[1], 1);
    expect(checkSpec(s, ["A", "B", "O"])).toEqual([]);
  });

  it("refuses a sector or dimension with a missing point", () => {
    const bad = spec("geometry2d", [
      P("O", 0, 0),
      { kind: "dimension", id: "d", from: "O", to: "Z" },
    ]);
    expect(parseFigureSpec(bad)).toMatchObject({ ok: false });
    expect(
      parseFigureSpec(
        spec("geometry2d", [
          { kind: "polygon", id: "p", points: ["a", "b", "c"], shade: "dark" } as unknown as Part,
        ])
      ).ok
    ).toBe(false);
  });
});

describe("gap 8: captions, one singular note, y labels every 1", () => {
  const cylinder = (caption: string, notToScale?: true): FigureSpec =>
    spec(
      "solid3d",
      [{ kind: "solid", id: "c", shape: "cylinder", dims: { radius: 1, height: 2.2 } }],
      { caption, ...(notToScale ? { notToScale } : {}) }
    );

  it("prints a caption under each solid and one singular note (2026-06_ASIA_V1_MATH_M2_Q21)", () => {
    const a = buildSolid3d(cylinder("Cylinder A"), SHAPE_BOX);
    expect(words(a)).toEqual(["Cylinder A"]);
    const b = buildSolid3d(cylinder("Cylinder B", true), SHAPE_BOX);
    expect(words(b)).toEqual(["Cylinder B", NOT_TO_SCALE]);
    const issues = checkSpecs(
      [cylinder("Cylinder A"), cylinder("Cylinder B", true)],
      ["Cylinder A", "Cylinder B", NOT_TO_SCALE]
    );
    expect(issues).toEqual([]);
  });

  it("grows a bar chart taller to keep y labels every 1 from 0 to 14 (2026-05_US_V2_RW_M2_Q11)", () => {
    const s = bar(
      [6, 7.2, 13],
      {
        y: [0, 14],
        yStep: 1,
        yLabelStep: 1,
        categories: ["Repeller with webcam", "Continuous repeller", "Control"],
        rotateCategories: true,
        yTitle: "Damaged pears (percentage of total)",
      },
      { title: "Comparison of Bird Pecking Rates between Treatments" }
    );
    const scene = buildChart(s, CHART_BOX);
    expect(scene.height).toBeGreaterThan(CHART_BOX.height);
    const shown = words(scene);
    for (let k = 0; k <= 14; k++) expect(shown).toContain(String(k));
    expect(scene.issues.filter((i) => i.code === "crowded_ticks")).toEqual([]);
  });

  it("keeps the height of a chart whose labels already fit", () => {
    const scene = buildChart(bar([6, 7, 13], { y: [0, 14], yStep: 2, yLabelStep: 2 }), CHART_BOX);
    expect(scene.height).toBe(CHART_BOX.height);
  });
});

describe("gap 7 on a plane: shading stays inside the frame", () => {
  const square = (size: number): FigureSpec =>
    spec(
      "plane",
      [
        { kind: "point", id: "A", x: 0, y: 0 },
        { kind: "point", id: "B", x: size, y: 0 },
        { kind: "point", id: "C", x: size, y: size },
        { kind: "polygon", id: "p", points: ["A", "B", "C"], shade: "faint" },
      ],
      { frame: { x: [-5, 5], y: [-5, 5] } }
    );

  it("fills a shaded polygon under the lines", () => {
    const scene = buildPlane(square(3), PLANE_BOX);
    const fill = paths(scene).find((p) => p.partId === "p" && p.fill)!;
    expect(fill).toMatchObject({ fill: "fill-faint", stroke: false });
    const outline = paths(scene).find((p) => p.partId === "p" && !p.fill)!;
    expect(scene.items.indexOf(fill)).toBeLessThan(scene.items.indexOf(outline));
  });

  it("refuses shading that would leave the frame", () => {
    const scene = buildPlane(square(8), PLANE_BOX);
    expect(paths(scene).some((p) => p.partId === "p" && p.fill)).toBe(false);
    expect(scene.issues.some((i) => i.partId === "p" && i.code === "clipped")).toBe(true);
  });
});
