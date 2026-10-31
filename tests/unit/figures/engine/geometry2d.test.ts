import { describe, expect, it } from "vitest";
import { buildGeometry2d, snap } from "@/lib/figures/engine/geometry2d";
import { HOUSE } from "@/lib/figures/engine/house";
import { textBox } from "@/lib/figures/engine/labels";
import type { SceneItem } from "@/lib/figures/engine/scene";
import {
  FIGURE_SPEC_VERSION,
  type FigureSpec,
  type Label,
  type Mark,
  type Part,
} from "@/lib/figures/engine/spec";

const BOX = { width: 400, height: 300 };

function geo(
  parts: Part[],
  marks: Mark[] = [],
  labels: Label[] = [],
  extra: Partial<FigureSpec> = {}
): FigureSpec {
  return {
    version: FIGURE_SPEC_VERSION,
    type: "geometry2d",
    parts,
    labels,
    marks,
    ...extra,
  };
}

const pt = (id: string, x: number, y: number): Part => ({ kind: "point", id, x, y });
const seg = (id: string, from: string, to: string): Part => ({ kind: "segment", id, from, to });

type PathItem = Extract<SceneItem, { t: "path" }>;
type TextItem = Extract<SceneItem, { t: "text" }>;
type V = [number, number];
const paths = (items: SceneItem[]) => items.filter((i): i is PathItem => i.t === "path");
const texts = (items: SceneItem[]) => items.filter((i): i is TextItem => i.t === "text");
const byPart = (items: SceneItem[], id: string) => paths(items).filter((p) => p.partId === id);

/** The numbers of an M/L path's d, as [x, y] pairs. */
function vertices(d: string): V[] {
  const nums = (d.match(/-?\d+(\.\d+)?(e-?\d+)?/g) ?? []).map(Number);
  const out: V[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) out.push([nums[i], nums[i + 1]]);
  return out;
}

const dist = (a: V, b: V) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1];
const unit = (a: V): V => {
  const l = Math.hypot(a[0], a[1]);
  return [a[0] / l, a[1] / l];
};
const point = (spec: FigureSpec, id: string): V => {
  const p = spec.parts.find((q) => q.id === id);
  if (!p || p.kind !== "point") throw new Error(`no point ${id}`);
  return [p.x, p.y];
};

describe("snap", () => {
  const A = pt("A", 0, 0);
  const B = pt("B", 100, 0);

  it("a point 1.5% off line AB snaps onto it", () => {
    const out = snap(geo([A, B, pt("P", 50, 1.5), seg("AB", "A", "B")]));
    const [x, y] = point(out, "P");
    expect(x).toBeCloseTo(50, 9);
    expect(y).toBeCloseTo(0, 9);
  });

  it("one 3% off does not", () => {
    const out = snap(geo([A, B, pt("P", 50, 3), seg("AB", "A", "B")]));
    expect(point(out, "P")).toEqual([50, 3]);
  });

  it("a point 1.5% off a circle snaps onto it", () => {
    const out = snap(
      geo([pt("O", 0, 0), pt("P", 51.5, 0), { kind: "circle", id: "c", center: "O", radius: 50 }])
    );
    expect(dist(point(out, "P"), [0, 0])).toBeCloseTo(50, 9);
  });

  it("angle marked right_angle at C is exactly 90° after snapping", () => {
    const spec = geo(
      [
        pt("A", 0, 0),
        pt("B", 120, 104),
        pt("C", 0, 100),
        { kind: "polygon", id: "tri", points: ["A", "B", "C"] },
        { kind: "angle", id: "C_angle", vertex: "C", from: "A", to: "B" },
      ],
      [{ kind: "right_angle", on: ["C_angle"] }]
    );
    const out = snap(spec);
    const C = point(out, "C");
    const u = unit(sub(point(out, "A"), C));
    const v = unit(sub(point(out, "B"), C));
    const degrees = (Math.acos(dot(u, v)) * 180) / Math.PI;
    expect(degrees).toBeCloseTo(90, 9);
    // The input is not mutated.
    expect(point(spec, "B")).toEqual([120, 104]);
  });
});

describe("buildGeometry2d", () => {
  it("figure is centered: left/right and top/bottom margins differ by at most 1px", () => {
    const spec = geo([
      pt("A", 200, 50),
      pt("B", 260, 50),
      pt("C", 200, 130),
      { kind: "polygon", id: "tri", points: ["A", "B", "C"] },
    ]);
    const scene = buildGeometry2d(spec, BOX);
    const vs = byPart(scene.items, "tri").flatMap((p) => vertices(p.d));
    const xs = vs.map((v) => v[0]);
    const ys = vs.map((v) => v[1]);
    const left = Math.min(...xs);
    const right = BOX.width - Math.max(...xs);
    const top = Math.min(...ys);
    const bottom = BOX.height - Math.max(...ys);
    expect(Math.abs(left - right)).toBeLessThanOrEqual(1);
    expect(Math.abs(top - bottom)).toBeLessThanOrEqual(1);
    expect(Math.min(left, right, top, bottom)).toBeGreaterThanOrEqual(HOUSE.margin - 1e-6);
    // It fills the box minus the margin on its tighter axis.
    expect(Math.min(left, top)).toBeCloseTo(HOUSE.margin, 1);
  });

  it("right_angle mark is a square of side 10 at the vertex inside the angle", () => {
    const spec = geo(
      [
        pt("A", 0, 0),
        pt("B", 120, 100),
        pt("C", 0, 100),
        { kind: "polygon", id: "tri", points: ["A", "B", "C"] },
        { kind: "angle", id: "C_angle", vertex: "C", from: "A", to: "B" },
      ],
      [{ kind: "right_angle", on: ["C_angle"] }]
    );
    const scene = buildGeometry2d(spec, BOX);
    const [A, , C] = vertices(byPart(scene.items, "tri")[0].d);
    const marks = byPart(scene.items, "C_angle");
    expect(marks).toHaveLength(1);
    const [p0, p1, p2] = vertices(marks[0].d);
    expect(dist(p0, C)).toBeCloseTo(10, 1);
    expect(dist(p2, C)).toBeCloseTo(10, 1);
    expect(dist(p0, p1)).toBeCloseTo(10, 1);
    expect(dist(p1, p2)).toBeCloseTo(10, 1);
    expect(dist(p1, C)).toBeCloseTo(10 * Math.SQRT2, 1);
    // p0 lies along CA, and the far corner is inside the angle (toward A and B).
    expect(dot(unit(sub(p0, C)), unit(sub(A, C)))).toBeCloseTo(1, 3);
    const corner = sub(p1, C);
    expect(dot(corner, sub(A, C))).toBeGreaterThan(0);
    expect(marks[0].weight).toBe("line");
    expect(marks[0].fill).toBeUndefined();
  });

  it("equal_ticks count 2 draws two ticks perpendicular at each segment midpoint", () => {
    const spec = geo(
      [
        pt("A", 0, 0),
        pt("B", 100, 0),
        pt("C", 0, 60),
        pt("D", 80, 120),
        seg("AB", "A", "B"),
        seg("CD", "C", "D"),
      ],
      [{ kind: "equal_ticks", on: ["AB", "CD"], count: 2 }]
    );
    const scene = buildGeometry2d(spec, BOX);
    for (const id of ["AB", "CD"]) {
      const [line, ...ticks] = byPart(scene.items, id);
      const [s, e] = vertices(line.d);
      const dir = unit(sub(e, s));
      const mid: V = [(s[0] + e[0]) / 2, (s[1] + e[1]) / 2];
      expect(ticks).toHaveLength(2);
      const centers = ticks.map((t) => {
        const [a, b] = vertices(t.d);
        expect(dist(a, b)).toBeCloseTo(HOUSE.tickLength, 1);
        expect(Math.abs(dot(unit(sub(b, a)), dir))).toBeLessThan(0.01);
        const c: V = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        expect(dist(c, mid)).toBeLessThan(HOUSE.tickLength);
        return c;
      });
      expect(dist(centers[0], centers[1])).toBeGreaterThan(2);
    }
  });

  it('notToScale adds the exact text "Note: Figure not drawn to scale." below the figure', () => {
    const spec = geo(
      [
        pt("A", 0, 0),
        pt("B", 100, 0),
        pt("C", 50, 80),
        { kind: "polygon", id: "tri", points: ["A", "B", "C"] },
      ],
      [],
      [],
      { notToScale: true }
    );
    const scene = buildGeometry2d(spec, BOX);
    const notes = texts(scene.items).filter((t) => t.text === "Note: Figure not drawn to scale.");
    expect(notes).toHaveLength(1);
    const [l, r, top, bottom] = textBox(notes[0]);
    const lowest = Math.max(...paths(scene.items).flatMap((p) => vertices(p.d).map((v) => v[1])));
    expect(top).toBeGreaterThan(lowest);
    expect(l).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThanOrEqual(BOX.width);
    expect(bottom).toBeLessThanOrEqual(BOX.height);
    expect(notes[0].anchor).toBe("middle");
    expect(notes[0].x).toBeCloseTo(BOX.width / 2, 6);
  });

  describe("the not-to-scale note on narrow boxes", () => {
    const NOTE = "Note: Figure not drawn to scale.";
    const noted = geo(
      [
        pt("A", 0, 100),
        pt("B", 240, 100),
        pt("C", 160, 20),
        seg("AB", "A", "B"),
        seg("BC", "B", "C"),
        seg("CA", "C", "A"),
        { kind: "line", id: "AL", from: "A", to: "C" },
      ],
      [],
      [
        { text: "A", on: "A" },
        { text: "B", on: "B" },
        { text: "C", on: "C" },
        { text: "24", on: "AB" },
        { text: "11", on: "BC" },
        { text: "18", on: "CA" },
      ],
      { notToScale: true }
    );
    /** The note's text items: the bottom run of texts that joins to the note. */
    const noteItems = (items: SceneItem[]) =>
      texts(items).filter(
        (t) => NOTE.split(" ").some((w) => t.text.includes(w)) && t.text.length > 3
      );

    it("on a 260×300 box every note line fits within the margin and the lines join to the exact text", () => {
      const box = { width: 260, height: 300 };
      const notes = noteItems(buildGeometry2d(noted, box).items);
      expect(notes.length).toBe(2);
      expect(notes.map((t) => t.text).join(" ")).toBe(NOTE);
      for (const t of notes) {
        const [l, r, top, bottom] = textBox(t);
        expect(l).toBeGreaterThanOrEqual(HOUSE.margin);
        expect(r).toBeLessThanOrEqual(box.width - HOUSE.margin);
        expect(top).toBeGreaterThanOrEqual(0);
        expect(bottom).toBeLessThanOrEqual(box.height);
      }
      // Stacked one line height apart, in reading order.
      expect(notes[1].y - notes[0].y).toBeCloseTo(1.25 * HOUSE.font, 6);
    });

    it("on a 400×300 box the note stays on one line", () => {
      const notes = noteItems(buildGeometry2d(noted, BOX).items);
      expect(notes.map((t) => t.text)).toEqual([NOTE]);
    });

    it("nothing in the figure overlaps the note at 260 wide", () => {
      const box = { width: 260, height: 300 };
      const scene = buildGeometry2d(noted, box);
      expect(scene.issues.filter((i) => i.code === "label_collision")).toEqual([]);
      const notes = noteItems(scene.items);
      const noteBoxes = notes.map(textBox);
      const others = texts(scene.items).filter((t) => !notes.includes(t));
      expect(others).toHaveLength(6);
      for (const [l, r, t, b] of noteBoxes) {
        for (const o of others.map(textBox)) {
          expect(o[0] < r && l < o[1] && o[2] < b && t < o[3]).toBe(false);
        }
        for (const p of paths(scene.items)) {
          const vs = vertices(p.d);
          for (let i = 0; i + 1 < vs.length; i++) {
            const [s, e] = [vs[i], vs[i + 1]];
            const n = Math.ceil(dist(s, e) * 4) || 1;
            for (let k = 0; k <= n; k++) {
              const x = s[0] + ((e[0] - s[0]) * k) / n;
              const y = s[1] + ((e[1] - s[1]) * k) / n;
              expect(x > l && x < r && y > t && y < b).toBe(false);
            }
          }
        }
      }
    });
  });

  it("hidden_dashed segment uses weight dashed", () => {
    const spec = geo(
      [pt("A", 0, 0), pt("B", 100, 0), pt("C", 50, 80), seg("AB", "A", "B"), seg("BC", "B", "C")],
      [{ kind: "hidden_dashed", on: ["BC"] }]
    );
    const scene = buildGeometry2d(spec, BOX);
    expect(byPart(scene.items, "BC").map((p) => p.weight)).toEqual(["dashed"]);
    expect(byPart(scene.items, "AB").map((p) => p.weight)).toEqual(["line"]);
  });

  it("a ray ends in one arrowhead, a line in two, a segment in none, all inside the box", () => {
    const spec = geo([
      pt("A", 0, 0),
      pt("B", 100, 0),
      pt("C", 50, 80),
      seg("AB", "A", "B"),
      { kind: "ray", id: "AC", from: "A", to: "C" },
      { kind: "line", id: "BC", from: "B", to: "C" },
    ]);
    const scene = buildGeometry2d(spec, BOX);
    expect(byPart(scene.items, "AB")[0].arrows).toBeUndefined();
    expect(byPart(scene.items, "AC")[0].arrows).toBe("end");
    expect(byPart(scene.items, "BC")[0].arrows).toBe("both");
    for (const id of ["AC", "BC"]) {
      for (const [x, y] of vertices(byPart(scene.items, id)[0].d)) {
        expect(x).toBeGreaterThanOrEqual(HOUSE.margin - 1e-6);
        expect(x).toBeLessThanOrEqual(BOX.width - HOUSE.margin + 1e-6);
        expect(y).toBeGreaterThanOrEqual(HOUSE.margin - 1e-6);
        expect(y).toBeLessThanOrEqual(BOX.height - HOUSE.margin + 1e-6);
      }
    }
    // The ray starts at A; the line runs past both of its points.
    const [A] = vertices(byPart(scene.items, "AB")[0].d);
    const [rayStart] = vertices(byPart(scene.items, "AC")[0].d);
    expect(dist(rayStart, A)).toBeLessThan(0.01);
    const [B] = vertices(byPart(scene.items, "AB")[0].d).slice(1);
    const [l0, l1] = vertices(byPart(scene.items, "BC")[0].d);
    expect(Math.min(dist(l0, B), dist(l1, B))).toBeGreaterThan(1);
  });

  it("crowded triangle: 6 labels (3 vertices + 3 side lengths) with a 25° angle are all placed, none overlaps another label or any segment, no label_collision", () => {
    const rad = (25 * Math.PI) / 180;
    const C: V = [180 * Math.cos(rad), 100 - 180 * Math.sin(rad)];
    const spec = geo(
      [
        pt("A", 0, 100),
        pt("B", 240, 100),
        pt("C", C[0], C[1]),
        seg("AB", "A", "B"),
        seg("BC", "B", "C"),
        seg("CA", "C", "A"),
      ],
      [],
      [
        { text: "A", on: "A" },
        { text: "B", on: "B" },
        { text: "C", on: "C" },
        { text: "24", on: "AB" },
        { text: "11.2", on: "BC" },
        { text: "18", on: "CA" },
      ]
    );
    const scene = buildGeometry2d(spec, { width: 320, height: 240 });
    expect(scene.issues.filter((i) => i.code === "label_collision")).toEqual([]);
    const labels = texts(scene.items);
    expect(labels.map((t) => t.text).sort()).toEqual(["11.2", "18", "24", "A", "B", "C"]);
    const boxes = labels.map(textBox);
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const [a, b] = [boxes[i], boxes[j]];
        const overlap = a[0] < b[1] && b[0] < a[1] && a[2] < b[3] && b[2] < a[3];
        expect(overlap, `${labels[i].text} overlaps ${labels[j].text}`).toBe(false);
      }
    }
    const segs = ["AB", "BC", "CA"].map((id) => vertices(byPart(scene.items, id)[0].d));
    for (const [k, [l, r, t, b]] of boxes.entries()) {
      for (const [p, q] of segs) {
        const n = Math.ceil(dist(p, q) * 4);
        for (let s = 0; s <= n; s++) {
          const x = p[0] + ((q[0] - p[0]) * s) / n;
          const y = p[1] + ((q[1] - p[1]) * s) / n;
          const inside = x > l && x < r && y > t && y < b;
          expect(inside, `${labels[k].text} touches a side`).toBe(false);
        }
      }
      expect(l).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(320);
      expect(t).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(240);
    }
  });

  it("describes the figure from its named parts", () => {
    const spec = geo(
      [
        pt("A", 0, 0),
        pt("B", 120, 100),
        pt("C", 0, 100),
        { kind: "polygon", id: "tri", points: ["A", "B", "C"] },
        { kind: "angle", id: "C_angle", vertex: "C", from: "A", to: "B" },
        seg("AB", "A", "B"),
      ],
      [{ kind: "right_angle", on: ["C_angle"] }],
      [{ text: "13", on: "AB" }]
    );
    expect(buildGeometry2d(spec, BOX).description).toBe("Triangle ABC, right angle at C, AB = 13.");
  });
});
