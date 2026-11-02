import { describe, expect, it } from "vitest";
import { checkSpec } from "@/lib/figures/engine/checks";
import { textBox } from "@/lib/figures/engine/labels";
import { buildPlane } from "@/lib/figures/engine/plane";
import type { SceneItem } from "@/lib/figures/engine/scene";
import { FIGURE_SPEC_VERSION, type FigureSpec, type Label } from "@/lib/figures/engine/spec";
// Tests may import authoring scripts: AR-1 exempts test files, and the runtime never does.
import { sampleSpec } from "../../../../scripts/figures/sample-functions";

const BOX = { width: 640, height: 480 };
type TextItem = Extract<SceneItem, { t: "text" }>;
type Rect = [number, number, number, number];

function plane(labels: Label[]): FigureSpec {
  return sampleSpec({
    version: FIGURE_SPEC_VERSION,
    type: "plane",
    parts: [
      { kind: "point", id: "A", x: 1, y: 2 },
      { kind: "point", id: "B", x: -2, y: -1 },
      { kind: "line", id: "l", from: "A", to: "B" },
      { kind: "function", id: "f", latex: "y=x^2/4" },
    ],
    labels,
    marks: [],
    frame: { x: [-5, 5], y: [-5, 5], step: 1 },
  });
}

const LABELED = plane([
  { text: "A", on: "A" },
  { text: "B", on: "B" },
  { text: "ℓ", on: "l" },
]);

/** Points every 1px along each M/L segment of the non-grid paths. */
function linePoints(items: SceneItem[]): [number, number][] {
  const out: [number, number][] = [];
  for (const i of items) {
    if (i.t !== "path" || i.weight === "grid" || /A/.test(i.d)) continue; // dots are arcs
    const n = (i.d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
    for (let k = 0; k + 3 < n.length; k += 2) {
      const [x0, y0, x1, y1] = n.slice(k, k + 4);
      const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
      for (let s = 0; s <= steps; s++)
        out.push([x0 + ((x1 - x0) * s) / steps, y0 + ((y1 - y0) * s) / steps]);
    }
  }
  return out;
}

const inside = ([x, y]: [number, number], [l, r, t, b]: Rect) => x > l && x < r && y > t && y < b;
const overlap = (a: Rect, b: Rect) => a[0] < b[1] && b[0] < a[1] && a[2] < b[3] && b[2] < a[3];

describe("buildPlane part labels", () => {
  it("draws point labels A and B and the line label ℓ clear of every line, curve and label", () => {
    const scene = buildPlane(LABELED, BOX);
    const texts = scene.items.filter((i): i is TextItem => i.t === "text");
    const mine = ["A", "B", "ℓ"].map((t) => texts.find((i) => i.text === t));
    expect(mine.every(Boolean)).toBe(true);
    const pts = linePoints(scene.items);
    for (const label of mine) {
      const box = textBox(label!);
      expect(pts.some((p) => inside(p, box))).toBe(false);
      for (const other of texts)
        if (other !== label) expect(overlap(box, textBox(other))).toBe(false);
    }
    expect(scene.issues).toEqual([]);
  });

  it("puts a point's label beside its point", () => {
    const scene = buildPlane(LABELED, BOX);
    const a = scene.items.find((i): i is TextItem => i.t === "text" && i.text === "A")!;
    // A (1, 2) sits at px (380.8, 150.4): a 608 × 448 plot inside the 16 px margin.
    expect(Math.hypot(a.x - 380.8, a.y - 150.4)).toBeLessThan(30);
  });

  it("checkSpec on that plane reports no missing_label", () => {
    const drawn = buildPlane(LABELED, BOX)
      .items.filter((i): i is TextItem => i.t === "text")
      .map((t) => t.text);
    const issues = checkSpec(LABELED, drawn);
    expect(issues.filter((i) => i.code === "missing_label")).toEqual([]);
    expect(issues).toEqual([]);
  });

  it("a crowded label reports label_collision instead of overlapping", () => {
    const many = Array.from({ length: 40 }, (_, k) => ({ text: `WIDE${k}`, on: "A" }));
    const scene = buildPlane(plane(many), BOX);
    const collisions = scene.issues.filter((i) => i.code === "label_collision");
    expect(collisions.length).toBeGreaterThan(0);
    const texts = scene.items.filter((i): i is TextItem => i.t === "text");
    for (let i = 0; i < texts.length; i++)
      for (let j = i + 1; j < texts.length; j++)
        expect(overlap(textBox(texts[i]), textBox(texts[j]))).toBe(false);
  });

  it("a label on a part the plane does not draw is a missing_label", () => {
    const spec = {
      ...LABELED,
      parts: [...LABELED.parts, { kind: "region", id: "r", latex: "y>x" }],
    } as FigureSpec;
    const scene = buildPlane({ ...spec, labels: [{ text: "R", on: "r" }] }, BOX);
    expect(scene.issues.map((i) => i.code)).toContain("missing_label");
  });
});
