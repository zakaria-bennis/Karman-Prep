import { describe, it, expect } from "vitest";
import { placeLengthLabel, placeAngleMark } from "./geometry-layout";
import { buildGeometrySvg, type GeometryFigureData } from "./geometry-svg";

const a = { x: 80.5, y: 22 };
const b = { x: 80.5, y: 316.5 };
const c = { x: 474, y: 316.5 };
const center = { x: 250, y: 180 };
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
    const forward = placeAngleMark(a, b, c, 20)!;
    const reversed = placeAngleMark(a, c, b, 20)!;
    expect(forward.arc).toContain(" A ");
    expect(forward.label.x).toBeCloseTo(reversed.label.x);
    expect(forward.label.y).toBeCloseTo(reversed.label.y);
    expect(forward.perpendicular).toBe(false);
    expect(placeAngleMark(b, a, c, 20)?.perpendicular).toBe(true);
  });

  it("holds zero-length and unresolved straight angles", () => {
    expect(placeLengthLabel(a, a, center, 32)).toBeNull();
    expect(placeAngleMark(a, a, c, 20)).toBeNull();
    expect(placeAngleMark({ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 1, y: 0 }, 1)).toBeNull();
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
