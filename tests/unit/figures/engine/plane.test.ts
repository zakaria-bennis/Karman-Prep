import { describe, expect, it } from "vitest";
import { curveFor } from "@/lib/figures/engine/calc-adapter";
import { buildPlane } from "@/lib/figures/engine/plane";
import type { SceneItem } from "@/lib/figures/engine/scene";
import { FIGURE_SPEC_VERSION, type FigureSpec, type Part } from "@/lib/figures/engine/spec";

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

/** Nearest polyline vertex distance to (x, y), in world units. */
function nearest(runs: number[][], x: number, y: number): number {
  let best = Infinity;
  for (const run of runs) {
    for (let i = 0; i + 1 < run.length; i += 2) {
      best = Math.min(best, Math.hypot(run[i] - x, run[i + 1] - y));
    }
  }
  return best;
}

describe("curveFor", () => {
  it("y=2x^2-3 passes through (1,-1) and (2,5)", () => {
    const runs = curveFor("y=2x^2-3", FRAME, BOX);
    expect(runs.length).toBeGreaterThan(0);
    expect(nearest(runs, 1, -1)).toBeLessThan(0.01 * SPAN);
    expect(nearest(runs, 2, 5)).toBeLessThan(0.01 * SPAN);
  });

  it("1/(x-2) has no segment crossing x=2", () => {
    const runs = curveFor("y=\\frac{1}{x-2}", FRAME, BOX);
    expect(runs.length).toBeGreaterThanOrEqual(2);
    for (const run of runs) {
      for (let i = 0; i + 3 < run.length; i += 2) {
        const a = run[i] - 2;
        const b = run[i + 2] - 2;
        expect(a * b < 0).toBe(false);
      }
    }
  });

  it("\\sqrt{x} draws nothing left of 0", () => {
    const runs = curveFor("y=\\sqrt{x}", FRAME, BOX);
    expect(runs.length).toBeGreaterThan(0);
    for (const run of runs) {
      for (let i = 0; i < run.length; i += 2) expect(run[i]).toBeGreaterThanOrEqual(-1e-9);
    }
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
});
