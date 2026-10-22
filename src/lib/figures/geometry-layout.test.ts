import { describe, it, expect } from "vitest";
import {
  placeLengthLabel,
  placeClearAngleMark,
  placeClearLengthLabel,
  placeVertexLabel,
  labelHalfExtent,
} from "./geometry-layout";
import { buildGeometrySvg, type GeometryFigureData } from "./geometry-svg";

const a = { x: 80.5, y: 22 };
const b = { x: 80.5, y: 316.5 };
const c = { x: 474, y: 316.5 };
const center = { x: 250, y: 180 };
const HALF = labelHalfExtent("58°", 20);
const distanceToLine = (p: typeof a, start: typeof a, end: typeof a) =>
  Math.abs((end.x - start.x) * (start.y - p.y) - (start.x - p.x) * (end.y - start.y)) /
  Math.hypot(end.x - start.x, end.y - start.y);

describe("balanced source geometry markings", () => {
  it("places vertical and sloping side labels at the same perpendicular distance", () => {
    const left = placeLengthLabel(a, b, center, 32)!;
    const sloping = placeLengthLabel(a, c, center, 32)!;
    expect(distanceToLine(left, a, b)).toBeCloseTo(32);
    expect(distanceToLine(sloping, a, c)).toBeCloseTo(32);
    expect(left.x).toBeLessThan(a.x);
    expect(sloping.y).toBeLessThan((a.y + c.y) / 2);
  });

  it("uses actual rays for the arc and centers the label on the angle bisector", () => {
    const forward = placeClearAngleMark(a, b, c, 20, 5, HALF)!;
    const reversed = placeClearAngleMark(a, c, b, 20, 5, HALF)!;
    expect(forward.arc).toContain(" A ");
    expect(forward.label.x).toBeCloseTo(reversed.label.x);
    expect(forward.label.y).toBeCloseTo(reversed.label.y);
    expect(forward.perpendicular).toBe(false);
    expect(placeClearAngleMark(b, a, c, 20, 5, HALF)?.perpendicular).toBe(true);
  });

  it("holds zero-length and unresolved straight angles", () => {
    expect(placeLengthLabel(a, a, center, 32)).toBeNull();
    expect(placeClearAngleMark(a, a, c, 20, 5, HALF)).toBeNull();
    expect(
      placeClearAngleMark({ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 1, y: 0 }, 1, 1, HALF)
    ).toBeNull();
  });

  it("keeps side-length labels the same visible gap from sides of any slope", () => {
    const half = labelHalfExtent("28", 20);
    const left = placeClearLengthLabel(a, b, center, 6, half)!;
    const sloping = placeClearLengthLabel(a, c, center, 6, half)!;
    // Vertical side: the box's half-width is what faces the side.
    expect(distanceToLine(left, a, b)).toBeCloseTo(6 + half.x);
    const n = { x: -(c.y - a.y), y: c.x - a.x };
    const len = Math.hypot(n.x, n.y);
    const facing = (Math.abs(n.x) / len) * half.x + (Math.abs(n.y) / len) * half.y;
    expect(distanceToLine(sloping, a, c)).toBeCloseTo(6 + facing);
  });

  it("puts angle labels on the bisector clear of both rays, even for sharp angles", () => {
    const mark = placeClearAngleMark(c, a, b, 20, 5, HALF)!;
    const reach = Math.hypot(HALF.x, HALF.y);
    expect(distanceToLine(mark.label, c, a)).toBeGreaterThanOrEqual(reach + 5 - 1e-6);
    expect(distanceToLine(mark.label, c, b)).toBeGreaterThanOrEqual(reach + 5 - 1e-6);
  });

  it("puts vertex letters outside the vertex on the outward bisector", () => {
    const half = labelHalfExtent("B", 20);
    const corner = placeVertexLabel(b, [a, c], center, 5, half);
    // Right angle at b (lower left): outward bisector points down and to the left.
    expect(corner.x).toBeLessThan(b.x);
    expect(corner.y).toBeGreaterThan(b.y);
    expect(corner.x - b.x).toBeCloseTo(-(corner.y - b.y));
    // A point in the middle of a straight side goes to the side away from the center.
    const mid = { x: (b.x + c.x) / 2, y: b.y };
    const onSide = placeVertexLabel(mid, [b, c], center, 5, half);
    expect(onSide.x).toBeCloseTo(mid.x);
    expect(onSide.y).toBeGreaterThan(mid.y);
  });

  const data: GeometryFigureData = {
    layout_version: "balanced-v1",
    shapes: [
      {
        kind: "triangle",
        vertices_or_points: [
          { id: "top", ...a },
          { id: "corner", ...b },
          { id: "tip", ...c },
        ],
      },
    ],
    length_markings: [
      { on_segment: ["top", "corner"], value: "11" },
      { on_segment: ["top", "tip"], value: "28" },
    ],
    angle_markings: [
      { at_vertex: "top", between_vertices: ["corner", "tip"], measure: "x°" },
      { at_vertex: "corner", between_vertices: ["top", "tip"], right_angle: true },
    ],
    notes: "Figure not drawn to scale.",
  };

  it("renders internal references without inventing visible vertex names", () => {
    const result = buildGeometrySvg(data);
    expect(result.renderable).toBe(true);
    expect(result.svg).toContain("80.5,22 80.5,316.5 474,316.5");
    expect(result.svg).toContain(">11<");
    expect(result.svg).toContain(">28<");
    expect(result.svg).toContain(">x°<");
    expect(result.svg).not.toContain(">top<");
    expect(result.svg).not.toContain(">corner<");
    const label = result.svg!.match(/data-length-mark="top-tip" x="([^"]+)" y="([^"]+)"/)!;
    expect(Number(label[2])).toBeLessThan((a.y + c.y) / 2);
  });

  it("holds an unresolved marking or falsely claimed right angle", () => {
    expect(
      buildGeometrySvg({ ...data, angle_markings: [{ at_vertex: "top", measure: "x°" }] })
        .renderable
    ).toBe(false);
    expect(
      buildGeometrySvg({
        ...data,
        angle_markings: [
          { at_vertex: "top", between_vertices: ["corner", "tip"], right_angle: true },
        ],
      }).renderable
    ).toBe(false);
  });
  it("holds unsupported circles and conflicting source references instead of inventing geometry", () => {
    expect(
      buildGeometrySvg({
        ...data,
        shapes: [{ kind: "circle", vertices_or_points: [{ ...a }, { ...b }] }],
      }).renderable
    ).toBe(false);
    expect(
      buildGeometrySvg({
        ...data,
        shapes: [...data.shapes!, { kind: "point", vertices_or_points: [{ id: "top", ...c }] }],
      }).renderable
    ).toBe(false);
  });
});

describe("placeVertexLabel — widest empty sector (founder review 2026-10-22)", () => {
  it("puts a label where four lines meet into the widest gap between them", () => {
    // Rays at 0°, 90°, 135° and 180° (y down): the empty sector is 180°–360° (above).
    const v = { x: 0, y: 0 };
    const p = placeVertexLabel(
      v,
      [
        { x: 10, y: 0 },
        { x: 0, y: 10 },
        { x: -10, y: 10 },
        { x: -10, y: 0 },
      ],
      { x: 0, y: 50 },
      4,
      { x: 3, y: 3 }
    );
    expect(p.y).toBeLessThan(0);
    expect(Math.abs(p.x)).toBeLessThan(1e-6);
  });
});
