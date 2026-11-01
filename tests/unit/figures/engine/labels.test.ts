import { describe, expect, it } from "vitest";
import { HOUSE } from "@/lib/figures/engine/house";
import { placeLabels, textBox, textWidth, type PendingLabel } from "@/lib/figures/engine/labels";
import type { SceneItem } from "@/lib/figures/engine/scene";

const BOX = { width: 300, height: 300 };
type TextItem = Extract<SceneItem, { t: "text" }>;
const texts = (items: SceneItem[]) => items.filter((i): i is TextItem => i.t === "text");

const SQUARE: SceneItem = {
  t: "path",
  d: "M 100 100 L 200 100 L 200 200 L 100 200 Z",
  role: "ink",
  weight: "line",
};

function label(over: Partial<PendingLabel> = {}): PendingLabel {
  return {
    text: "A",
    anchor: { x: 100, y: 100 },
    preferred: { dx: -1, dy: -1 },
    partId: "A",
    ...over,
  };
}

describe("placeLabels", () => {
  it("vertex label sits outside the polygon on the bisector of the outside angle at HOUSE.labelOffset", () => {
    const { items, issues } = placeLabels([SQUARE], [label()], BOX);
    expect(issues).toEqual([]);
    const [t] = texts(items);
    const [l, r, top, bottom] = textBox(t);
    // The bisector enters the box labelOffset from the vertex, and the box
    // center is on it.
    const d = HOUSE.labelOffset / Math.SQRT2;
    const px = 100 - d;
    const py = 100 - d;
    expect(px).toBeGreaterThanOrEqual(l - 1e-6);
    expect(px).toBeLessThanOrEqual(r + 1e-6);
    expect(py).toBeGreaterThanOrEqual(top - 1e-6);
    expect(py).toBeLessThanOrEqual(bottom + 1e-6);
    const onEdge = Math.abs(px - r) < 1e-6 || Math.abs(py - bottom) < 1e-6;
    expect(onEdge).toBe(true);
    const cx = (l + r) / 2;
    const cy = (top + bottom) / 2;
    expect(cx - 100).toBeCloseTo(cy - 100, 5);
    expect(cx).toBeLessThan(100);
    // Outside the polygon.
    expect(r <= 100 || bottom <= 100).toBe(true);
    expect(t.partId).toBe("A");
  });

  it("two labels that would overlap end up with disjoint boxes", () => {
    const { items, issues } = placeLabels(
      [SQUARE],
      [label({ text: "P", partId: "P" }), label({ text: "Q", partId: "Q" })],
      BOX
    );
    expect(issues).toEqual([]);
    const [a, b] = texts(items).map(textBox);
    const disjoint = a[1] <= b[0] || b[1] <= a[0] || a[3] <= b[2] || b[3] <= a[2];
    expect(disjoint).toBe(true);
  });

  it("crowded figure with no free spot reports label_collision instead of overlapping", () => {
    const rules: SceneItem[] = [];
    for (let y = 0; y <= 100; y += 4) {
      rules.push({ t: "path", d: `M 0 ${y} L 100 ${y}`, role: "ink", weight: "line" });
    }
    const { items, issues } = placeLabels(
      rules,
      [label({ anchor: { x: 50, y: 50 }, partId: "X" })],
      { width: 100, height: 100 }
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("label_collision");
    expect(issues[0].partId).toBe("X");
    expect(texts(items)).toHaveLength(0);
  });

  it("no label box leaves the figure box", () => {
    const corners = [
      { x: 2, y: 2, dx: -1, dy: -1 },
      { x: 298, y: 2, dx: 1, dy: -1 },
      { x: 2, y: 298, dx: -1, dy: 1 },
      { x: 298, y: 298, dx: 1, dy: 1 },
    ];
    const { items } = placeLabels(
      [],
      corners.map((c, i) => ({
        text: "Vertex",
        anchor: { x: c.x, y: c.y },
        preferred: { dx: c.dx, dy: c.dy },
        partId: `V${i}`,
      })),
      BOX
    );
    expect(texts(items)).toHaveLength(4);
    for (const t of texts(items)) {
      const [l, r, top, bottom] = textBox(t);
      expect(l).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(BOX.width);
      expect(top).toBeGreaterThanOrEqual(0);
      expect(bottom).toBeLessThanOrEqual(BOX.height);
    }
  });

  it("estimates narrow glyphs at 0.35em", () => {
    expect(textWidth("A")).toBeCloseTo(HOUSE.charWidthEm * HOUSE.font);
    expect(textWidth("i.")).toBeCloseTo(0.35 * HOUSE.font * 2);
  });
});
