import { describe, expect, it } from "vitest";
import { HOUSE } from "@/lib/figures/engine/house";
import { buildPlane } from "@/lib/figures/engine/plane";
import type { SceneItem } from "@/lib/figures/engine/scene";
import { FIGURE_SPEC_VERSION, type FigureSpec, type Part } from "@/lib/figures/engine/spec";
// Tests may import authoring scripts: AR-1 exempts test files, and the runtime never does.
import { sampleSpec } from "../../../../scripts/figures/sample-functions";

const FRAME = { x: [-5, 5] as [number, number], y: [-5, 5] as [number, number], step: 1 };
const BOX = { width: 320, height: 320 };
const SPAN = 10;

function plane(parts: Part[], frame: FigureSpec["frame"] = FRAME): FigureSpec {
  return { version: FIGURE_SPEC_VERSION, type: "plane", parts, labels: [], marks: [], frame };
}

const A = { kind: "point", id: "A", x: 0, y: 0 } as const;
const B = { kind: "point", id: "B", x: 1, y: 1 } as const;

type PathItem = Extract<SceneItem, { t: "path" }>;
const paths = (items: SceneItem[]) => items.filter((i): i is PathItem => i.t === "path");
const byPart = (items: SceneItem[], id: string) => paths(items).filter((p) => p.partId === id);

/** The numbers of a path's d, as [x, y] pairs. */
function vertices(d: string): [number, number][] {
  const nums = (d.match(/-?\d+(\.\d+)?(e-?\d+)?/g) ?? []).map(Number);
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) out.push([nums[i], nums[i + 1]]);
  return out;
}

/** World coordinates of a pixel in the -5..5 frame, whose plot spans 16..304 px in BOX. */
const worldOf = ([px, py]: [number, number]): [number, number] => [
  -5 + ((px - 16) / (BOX.width - 32)) * SPAN,
  5 - ((py - 16) / (BOX.height - 32)) * SPAN,
];

describe("buildPlane function parts", () => {
  const fn = (id: string, latex: string, domain?: [number, number]): Part => ({
    kind: "function",
    id,
    latex,
    ...(domain ? { domain } : {}),
  });

  it("y=2x^2-3, sampled at authoring time, draws through (1,-1) and (2,5)", () => {
    const scene = buildPlane(sampleSpec(plane([fn("f", "y=2x^2-3")])), BOX);
    expect(scene.issues).toEqual([]);
    const pts = byPart(scene.items, "f").flatMap((p) => vertices(p.d).map((v) => worldOf(v)));
    expect(pts.length).toBeGreaterThan(0);
    const near = (x: number, y: number) =>
      Math.min(...pts.map(([a, b]) => Math.hypot(a - x, b - y)));
    expect(near(1, -1)).toBeLessThan(0.01 * SPAN);
    expect(near(2, 5)).toBeLessThan(0.01 * SPAN);
  });

  it("1/(x-2) draws at least two paths and no path crosses x=2", () => {
    const scene = buildPlane(sampleSpec(plane([fn("f", "y=\\frac{1}{x-2}")])), BOX);
    expect(scene.issues).toEqual([]);
    const runs = byPart(scene.items, "f");
    expect(runs.length).toBeGreaterThanOrEqual(2);
    for (const run of runs) {
      const xs = vertices(run.d).map((v) => worldOf(v)[0] - 2);
      for (let i = 1; i < xs.length; i++) expect(xs[i - 1] * xs[i] < -1e-6).toBe(false);
    }
  });

  it("\\sqrt{x} draws nothing left of 0, and a domain clips the graph", () => {
    const scene = buildPlane(
      sampleSpec(plane([fn("r", "y=\\sqrt{x}"), fn("g", "y=x", [-1, 2])])),
      BOX
    );
    expect(scene.issues).toEqual([]);
    const xsOf = (id: string) =>
      byPart(scene.items, id).flatMap((p) => vertices(p.d).map((v) => worldOf(v)[0]));
    expect(Math.min(...xsOf("r"))).toBeGreaterThanOrEqual(-0.02);
    expect(Math.min(...xsOf("g"))).toBeGreaterThanOrEqual(-1.02);
    expect(Math.max(...xsOf("g"))).toBeLessThanOrEqual(2.02);
  });

  it("a function part without samples reports unsampled_function and draws no path", () => {
    const scene = buildPlane(plane([fn("f", "y=x")]), BOX);
    expect(byPart(scene.items, "f")).toHaveLength(0);
    expect(scene.issues).toEqual([
      expect.objectContaining({ code: "unsampled_function", partId: "f" }),
    ]);
  });
});

describe("buildPlane", () => {
  const edgeOf = (scene: ReturnType<typeof buildPlane>, x: number, y: number) => {
    const m = 16;
    return (
      Math.abs(x - m) < 0.01 ||
      Math.abs(x - (scene.width - m)) < 0.01 ||
      Math.abs(y - m) < 0.01 ||
      Math.abs(y - (scene.height - m)) < 0.01
    );
  };

  it("ray AB clipped to frame ends in exactly one arrowhead at the frame edge", () => {
    const scene = buildPlane(plane([A, B, { kind: "ray", id: "r", from: "A", to: "B" }]), BOX);
    const [ray, ...rest] = byPart(scene.items, "r");
    expect(rest).toHaveLength(0);
    expect(ray.arrows).toBe("end");
    const vs = vertices(ray.d);
    const start = vs[0];
    const end = vs[vs.length - 1];
    // A = (0,0) is the centre of the 320 px box.
    expect(start[0]).toBeCloseTo(160, 1);
    expect(start[1]).toBeCloseTo(160, 1);
    expect(edgeOf(scene, end[0], end[1])).toBe(true);
  });

  it("line AB has arrows both", () => {
    const scene = buildPlane(plane([A, B, { kind: "line", id: "l", from: "A", to: "B" }]), BOX);
    const [line] = byPart(scene.items, "l");
    expect(line.arrows).toBe("both");
    const vs = vertices(line.d);
    expect(edgeOf(scene, ...vs[0])).toBe(true);
    expect(edgeOf(scene, ...vs[vs.length - 1])).toBe(true);
  });

  it("segment AB has no arrows", () => {
    const scene = buildPlane(plane([A, B, { kind: "segment", id: "s", from: "A", to: "B" }]), BOX);
    const [seg] = byPart(scene.items, "s");
    expect(seg.arrows).toBeUndefined();
  });

  it("ray whose direction point is outside the frame still draws from A to the edge", () => {
    const far = { kind: "point", id: "C", x: 40, y: 20 } as const;
    const scene = buildPlane(plane([A, far, { kind: "ray", id: "r", from: "A", to: "C" }]), BOX);
    const [ray] = byPart(scene.items, "r");
    expect(ray.arrows).toBe("end");
    const vs = vertices(ray.d);
    expect(vs[0][0]).toBeCloseTo(160, 1);
    expect(vs[0][1]).toBeCloseTo(160, 1);
    const end = vs[vs.length - 1];
    expect(end[0]).toBeCloseTo(BOX.width - 16, 1);
    expect(edgeOf(scene, end[0], end[1])).toBe(true);
  });

  it("grid lines use role grid and axes role ink", () => {
    const scene = buildPlane(plane([]), BOX);
    const grid = paths(scene.items).filter((p) => p.weight === "grid");
    expect(grid.length).toBeGreaterThan(0);
    for (const g of grid) expect(g.role).toBe("grid");
    const axes = byPart(scene.items, "axis");
    expect(axes).toHaveLength(2);
    for (const a of axes) {
      expect(a.role).toBe("ink");
      expect(a.weight).toBe("line");
    }
  });

  it("-5..5 frame with step 1 in a 320px box labels every integer from -5 to 5 except 0 on each axis", () => {
    const scene = buildPlane(plane([]), BOX);
    type TextItem = Extract<SceneItem, { t: "text" }>;
    const texts = scene.items.filter((i): i is TextItem => i.t === "text");
    const want = ["-5", "-4", "-3", "-2", "-1", "1", "2", "3", "4", "5"];
    const xLabels = texts.filter((t) => t.anchor === "middle").map((t) => t.text);
    const yLabels = texts.filter(
      (t) => t.anchor === "end" && /^-?\d+$/.test(t.text) && t.text !== "0"
    );
    expect([...xLabels].sort()).toEqual([...want].sort());
    expect(yLabels.map((t) => t.text).sort()).toEqual([...want].sort());
    // The origin is labeled once.
    expect(texts.filter((t) => t.text === "0" || t.text === "O")).toHaveLength(1);
  });

  it("line through two very close points has arrows both and finite ends on the edge", () => {
    const close = { kind: "point", id: "B", x: 1e-6, y: 1e-6 } as const;
    const scene = buildPlane(plane([A, close, { kind: "line", id: "l", from: "A", to: "B" }]), BOX);
    const [line] = byPart(scene.items, "l");
    expect(line.arrows).toBe("both");
    expect(line.d).not.toMatch(/Infinity|NaN/);
    const vs = vertices(line.d);
    expect(edgeOf(scene, ...vs[0])).toBe(true);
    expect(edgeOf(scene, ...vs[vs.length - 1])).toBe(true);
  });

  it("line and ray with a sub-EPS direction (8e-10, 8e-10) stay finite and reach the edge", () => {
    const tiny = { kind: "point", id: "B", x: 8e-10, y: 8e-10 } as const;
    const scene = buildPlane(
      plane([
        A,
        tiny,
        { kind: "line", id: "l", from: "A", to: "B" },
        { kind: "ray", id: "r", from: "A", to: "B" },
      ]),
      BOX
    );
    const [line] = byPart(scene.items, "l");
    const [ray] = byPart(scene.items, "r");
    expect(line.arrows).toBe("both");
    expect(ray.arrows).toBe("end");
    for (const item of [line, ray]) {
      expect(item.d).not.toMatch(/Infinity|NaN/);
      const vs = vertices(item.d);
      expect(edgeOf(scene, ...vs[vs.length - 1])).toBe(true);
    }
    const rs = vertices(ray.d);
    expect(rs[0][0]).toBeCloseTo(160, 1);
    expect(rs[0][1]).toBeCloseTo(160, 1);
    // The ray heads up and to the right: its end is at the top-right corner.
    expect(rs[rs.length - 1][0]).toBeCloseTo(BOX.width - 16, 1);
    expect(rs[rs.length - 1][1]).toBeCloseTo(16, 1);
  });

  it("first-quadrant 0..10 frame: every text item lies inside [0,width]×[0,height]", () => {
    const frame = { x: [0, 10] as [number, number], y: [0, 10] as [number, number], step: 1 };
    const scene = buildPlane(plane([], frame), BOX);
    type TextItem = Extract<SceneItem, { t: "text" }>;
    const texts = scene.items.filter((i): i is TextItem => i.t === "text");
    expect(texts.some((t) => t.text === "10")).toBe(true);
    for (const t of texts) {
      const w = 0.6 * HOUSE.font * t.text.length;
      const x0 = t.anchor === "start" ? t.x : t.anchor === "middle" ? t.x - w / 2 : t.x - w;
      const x1 = x0 + w;
      expect(x0, `${t.text} left`).toBeGreaterThanOrEqual(0);
      expect(x1, `${t.text} right`).toBeLessThanOrEqual(scene.width);
      expect(t.y - HOUSE.font, `${t.text} top`).toBeGreaterThanOrEqual(0);
      expect(t.y, `${t.text} bottom`).toBeLessThanOrEqual(scene.height);
    }
  });

  it("-10..10 frame in a 320px box labels every 2nd step", () => {
    const frame = { x: [-10, 10] as [number, number], y: [-10, 10] as [number, number], step: 1 };
    const scene = buildPlane(plane([], frame), BOX);
    type TextItem = Extract<SceneItem, { t: "text" }>;
    const xLabels = scene.items
      .filter((i): i is TextItem => i.t === "text" && i.anchor === "middle")
      .map((t) => Number(t.text))
      .sort((a, b) => a - b);
    expect(xLabels).toEqual([-10, -8, -6, -4, -2, 2, 4, 6, 8, 10]);
  });
});
