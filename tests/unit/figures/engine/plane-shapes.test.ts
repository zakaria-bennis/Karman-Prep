import { describe, expect, it } from "vitest";
import { checkSpec } from "@/lib/figures/engine/checks";
import { textBox } from "@/lib/figures/engine/labels";
import { buildPlane } from "@/lib/figures/engine/plane";
import type { SceneItem } from "@/lib/figures/engine/scene";
import {
  FIGURE_SPEC_VERSION,
  parseFigureSpec,
  type FigureSpec,
  type Label,
  type Part,
} from "@/lib/figures/engine/spec";
// Tests may import authoring scripts: AR-1 exempts test files, and the runtime never does.
import { sampleSpec } from "../../../../scripts/figures/sample-functions";

const FRAME = { x: [-5, 5] as [number, number], y: [-5, 5] as [number, number], step: 1 };
const BOX = { width: 320, height: 320 };
const SPAN = 10;

type PathItem = Extract<SceneItem, { t: "path" }>;
type TextItem = Extract<SceneItem, { t: "text" }>;
type Pt = [number, number];
const paths = (items: SceneItem[]) => items.filter((i): i is PathItem => i.t === "path");
const byPart = (items: SceneItem[], id: string) => paths(items).filter((p) => p.partId === id);
const codes = (issues: { code: string }[]) => issues.map((i) => i.code);

function plane(parts: Part[], labels: Label[] = [], extra: Partial<FigureSpec> = {}): FigureSpec {
  return {
    version: FIGURE_SPEC_VERSION,
    type: "plane",
    parts,
    labels,
    marks: [],
    frame: FRAME,
    ...extra,
  };
}

/** The [x, y] pairs of a path made of M/L/Z commands. */
function vertices(d: string): Pt[] {
  const nums = (d.match(/-?\d+(\.\d+)?(e-?\d+)?/g) ?? []).map(Number);
  const out: Pt[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) out.push([nums[i], nums[i + 1]]);
  return out;
}

/** World coordinates of a pixel in the -5..5 frame, whose plot spans 16..304 px in BOX. */
const worldOf = ([px, py]: Pt): Pt => [
  -5 + ((px - 16) / (BOX.width - 32)) * SPAN,
  5 - ((py - 16) / (BOX.height - 32)) * SPAN,
];

/** Even-odd point-in-rings test. */
function insideRings(p: Pt, rings: Pt[][]): boolean {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
  }
  return inside;
}

const pt = (id: string, x: number, y: number, on?: string[]): Part =>
  on ? { kind: "point", id, x, y, on } : { kind: "point", id, x, y };

/** y > 2x - 1 with its boundary line through (0,-1) and (1,1). */
function regionPlane(labels: Label[] = [], boundary = true): FigureSpec {
  return sampleSpec(
    plane(
      [
        pt("P", 0, -1),
        pt("Q", 1, 1),
        { kind: "line", id: "l", from: "P", to: "Q" },
        boundary
          ? { kind: "region", id: "R", latex: "y>2x-1", boundary: ["l"] }
          : { kind: "region", id: "R", latex: "y>2x-1" },
      ],
      labels
    )
  );
}

describe("buildPlane regions", () => {
  it("region with samples draws one fill-faint evenodd path behind all ink paths", () => {
    const scene = buildPlane(regionPlane(), BOX);
    expect(scene.issues).toEqual([]);
    const fills = byPart(scene.items, "R");
    expect(fills).toHaveLength(1);
    expect(fills[0].fill).toBe("fill-faint");
    expect(fills[0].fillRule).toBe("evenodd");
    const at = scene.items.indexOf(fills[0]);
    const firstInk = scene.items.findIndex((i) => i.t === "path" && i.role === "ink");
    expect(at).toBeLessThan(firstInk);
  });

  it("region without samples reports unsampled_region and draws nothing", () => {
    const spec = plane([
      pt("P", 0, -1),
      pt("Q", 1, 1),
      { kind: "line", id: "l", from: "P", to: "Q" },
      { kind: "region", id: "R", latex: "y>2x-1", boundary: ["l"] },
    ]);
    const scene = buildPlane(spec, BOX);
    expect(codes(scene.issues)).toEqual(["unsampled_region"]);
    expect(scene.issues[0].partId).toBe("R");
    expect(byPart(scene.items, "R")).toEqual([]);
  });

  it("region with no boundary part and no label reports region_unmarked", () => {
    const scene = buildPlane(regionPlane([], false), BOX);
    expect(codes(scene.issues)).toEqual(["region_unmarked"]);
    expect(scene.issues[0].partId).toBe("R");
    // A label alone marks it too.
    const labelled = buildPlane(regionPlane([{ text: "S", on: "R" }], false), BOX);
    expect(codes(labelled.issues)).toEqual([]);
  });

  it("region label sits inside the shaded ring and overlaps no line", () => {
    const scene = buildPlane(regionPlane([{ text: "S", on: "R" }]), BOX);
    expect(scene.issues).toEqual([]);
    const label = scene.items.find((i): i is TextItem => i.t === "text" && i.text === "S");
    expect(label).toBeDefined();
    const rings = (byPart(scene.items, "R")[0].d.split("M").filter(Boolean) as string[]).map((r) =>
      vertices(`M${r}`)
    );
    const [l, r, t, b] = textBox(label!);
    for (const corner of [
      [l, t],
      [r, t],
      [l, b],
      [r, b],
    ] as Pt[]) {
      expect(insideRings(corner, rings)).toBe(true);
    }
    // No ink line passes through the label's box (sampled every px along each segment).
    for (const p of paths(scene.items)) {
      if (p.weight === "grid" || p.partId === "R" || /A/.test(p.d)) continue;
      const v = vertices(p.d);
      for (let k = 0; k + 1 < v.length; k++) {
        const [a, c] = [v[k], v[k + 1]];
        const n = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1])));
        for (let s = 0; s <= n; s++) {
          const x = a[0] + ((c[0] - a[0]) * s) / n;
          const y = a[1] + ((c[1] - a[1]) * s) / n;
          expect(x > l && x < r && y > t && y < b).toBe(false);
        }
      }
    }
  });

  it("a region's boundary must name a line or curve part", () => {
    const bad = parseFigureSpec(
      plane([pt("P", 0, 0), { kind: "region", id: "R", latex: "y>0", boundary: ["P"] }])
    );
    expect(bad.ok).toBe(false);
    const missing = parseFigureSpec(
      plane([{ kind: "region", id: "R", latex: "y>0", boundary: ["nope"] }])
    );
    expect(missing.ok).toBe(false);
  });

  it("a boundary keeps its own styling: dashed only when its part is marked hidden_dashed", () => {
    const solid = buildPlane(regionPlane(), BOX);
    expect(byPart(solid.items, "l").every((p) => p.weight === "line")).toBe(true);
    const spec = regionPlane();
    const dashed = buildPlane({ ...spec, marks: [{ kind: "hidden_dashed", on: ["l"] }] }, BOX);
    expect(byPart(dashed.items, "l").every((p) => p.weight === "dashed")).toBe(true);
  });
});

describe("buildPlane circles, arcs and polygons", () => {
  it("circle center (1,2) radius 3 on a -5..5 frame: every path sample is 3 ± 0.01 from (1,2) in world units, clipped to the frame", () => {
    const scene = buildPlane(
      plane([pt("O", 1, 2), { kind: "circle", id: "k", center: "O", radius: 3 }]),
      BOX
    );
    expect(scene.issues).toEqual([]);
    const own = byPart(scene.items, "k");
    expect(own.length).toBeGreaterThan(0);
    for (const p of own) {
      expect(p.role).toBe("ink");
      expect(p.weight).toBe("line");
      for (const v of vertices(p.d)) {
        const [x, y] = worldOf(v);
        expect(Math.abs(Math.hypot(x - 1, y - 2) - 3)).toBeLessThan(0.01);
        expect(x).toBeGreaterThanOrEqual(-5 - 1e-6);
        expect(x).toBeLessThanOrEqual(5 + 1e-6);
        expect(y).toBeGreaterThanOrEqual(-5 - 1e-6);
        expect(y).toBeLessThanOrEqual(5 + 1e-6);
      }
    }
  });

  it("a circle that runs past the frame is clipped to it", () => {
    const scene = buildPlane(
      plane([pt("O", 4, 0), { kind: "circle", id: "k", center: "O", radius: 3 }]),
      BOX
    );
    const xs = byPart(scene.items, "k").flatMap((p) => vertices(p.d).map((v) => worldOf(v)[0]));
    expect(xs.length).toBeGreaterThan(0);
    expect(Math.max(...xs)).toBeLessThanOrEqual(5 + 1e-6);
  });

  it("an arc runs from its start point to its end point on the minor arc", () => {
    const scene = buildPlane(
      plane([
        pt("O", 0, 0),
        pt("A", 3, 0),
        pt("B", 0, 3),
        { kind: "arc", id: "a", center: "O", from: "A", to: "B" },
      ]),
      BOX
    );
    expect(scene.issues).toEqual([]);
    const v = byPart(scene.items, "a").flatMap((p) => vertices(p.d).map(worldOf));
    expect(Math.hypot(v[0][0] - 3, v[0][1])).toBeLessThan(0.01);
    expect(Math.hypot(v[v.length - 1][0], v[v.length - 1][1] - 3)).toBeLessThan(0.01);
    for (const [x, y] of v) {
      expect(Math.abs(Math.hypot(x, y) - 3)).toBeLessThan(0.01);
      expect(x).toBeGreaterThanOrEqual(-0.01);
      expect(y).toBeGreaterThanOrEqual(-0.01);
    }
  });

  it("polygon ABC on a plane is a closed path through the three points", () => {
    const scene = buildPlane(
      plane([
        pt("A", -2, -1),
        pt("B", 3, -1),
        pt("C", 0, 4),
        { kind: "polygon", id: "T", points: ["A", "B", "C"] },
      ]),
      BOX
    );
    expect(scene.issues).toEqual([]);
    const own = byPart(scene.items, "T");
    expect(own).toHaveLength(1);
    expect(own[0].d.trim().endsWith("Z")).toBe(true);
    const v = vertices(own[0].d).map(worldOf);
    expect(v).toHaveLength(3);
    [
      [-2, -1],
      [3, -1],
      [0, 4],
    ].forEach(([x, y], i) => {
      expect(Math.hypot(v[i][0] - x, v[i][1] - y)).toBeLessThan(0.01);
    });
  });

  it("checkSpec on a labelled region+circle plane reports no missing_label", () => {
    const spec = sampleSpec(
      plane(
        [
          pt("P", 0, -1),
          pt("Q", 1, 1),
          { kind: "line", id: "l", from: "P", to: "Q" },
          { kind: "region", id: "R", latex: "y>2x-1", boundary: ["l"] },
          pt("O", 2, -2),
          { kind: "circle", id: "k", center: "O", radius: 1.5 },
        ],
        [
          { text: "S", on: "R" },
          { text: "k", on: "k" },
        ]
      )
    );
    const scene = buildPlane(spec, BOX);
    const texts = scene.items.filter((i): i is TextItem => i.t === "text").map((t) => t.text);
    expect(texts).toContain("S");
    expect(texts).toContain("k");
    const issues = checkSpec(spec, texts, BOX);
    expect(issues.filter((i) => i.code === "missing_label")).toEqual([]);
  });

  it("a point declared on a circle is checked against the true circle on unequal axis scales", () => {
    // x spans 10 and y spans 20 in a square box, so the circle draws as an ellipse.
    const frame = { x: [-5, 5] as [number, number], y: [-10, 10] as [number, number], step: 1 };
    const spec = (y: number) =>
      plane(
        [pt("O", 0, 0), pt("P", 0, y, ["k"]), { kind: "circle", id: "k", center: "O", radius: 2 }],
        [],
        {
          frame,
        }
      );
    const off = (s: FigureSpec) => checkSpec(s, [], BOX).filter((i) => i.code === "off_line");
    expect(off(spec(2))).toEqual([]);
    const issues = off(spec(2.5));
    expect(issues).toHaveLength(1);
    expect(issues[0].partId).toBe("P");
  });
});

describe("plane descriptions of shapes and regions", () => {
  it("names the shaded region and the circle in words", () => {
    const spec = sampleSpec(
      plane([
        pt("P", 0, -1),
        pt("Q", 1, 1),
        { kind: "line", id: "l", from: "P", to: "Q" },
        { kind: "region", id: "R", latex: "y>2x-1", boundary: ["l"] },
        pt("O", 2, -2),
        { kind: "circle", id: "k", center: "O", radius: 1.5 },
      ])
    );
    const text = buildPlane(spec, BOX).description;
    expect(text).toContain("the shaded region where y is greater than 2x minus 1");
    expect(text).toContain("a circle with center (2, -2) and radius 1.5");
  });
});

describe("region label spot", () => {
  it("a region whose centroid is outside it still gets its label inside the shading", () => {
    // An L-shaped region (two rectangles joined at a corner area): its centroid falls outside it.
    const spec: FigureSpec = plane(
      [
        pt("P", -5, 4),
        pt("Q", 5, 4),
        { kind: "line", id: "l", from: "P", to: "Q" },
        {
          kind: "region",
          id: "R",
          latex: "y>4",
          boundary: ["l"],
          samples: [
            [
              [-5, -5],
              [-3, -5],
              [-3, 3],
              [5, 3],
              [5, 5],
              [-5, 5],
            ],
          ],
        },
      ],
      [{ text: "S", on: "R" }]
    );
    const scene = buildPlane(spec, BOX);
    const label = scene.items.find((i): i is TextItem => i.t === "text" && i.text === "S");
    expect(label).toBeDefined();
    const ring: Pt[] = [
      [-5, -5],
      [-3, -5],
      [-3, 3],
      [5, 3],
      [5, 5],
      [-5, 5],
    ];
    const [l, r, t, b] = textBox(label!);
    for (const corner of [
      [l, t],
      [r, t],
      [l, b],
      [r, b],
    ] as Pt[]) {
      expect(insideRings(worldOf(corner), [ring])).toBe(true);
    }
  });
});
