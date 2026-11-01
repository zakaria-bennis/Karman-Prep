import { describe, expect, it } from "vitest";
import { FIGURE_SPEC_VERSION, MAX_TICKS, parseFigureSpec } from "@/lib/figures/engine/spec";

function triangle() {
  return {
    version: FIGURE_SPEC_VERSION,
    type: "geometry2d",
    parts: [
      { kind: "point", id: "A", x: 0, y: 0 },
      { kind: "point", id: "B", x: 4, y: 0 },
      { kind: "point", id: "C", x: 0, y: 3 },
      { kind: "polygon", id: "tri", points: ["A", "B", "C"] },
    ],
    labels: [{ text: "A", on: "A" }],
    marks: [{ kind: "right_angle", on: ["A"] }],
  };
}

function errorsOf(input: unknown): string[] {
  const result = parseFigureSpec(input);
  if (result.ok) throw new Error("expected failure");
  return result.errors;
}

describe("parseFigureSpec", () => {
  it("accepts a triangle spec", () => {
    const result = parseFigureSpec(triangle());
    expect(result.ok).toBe(true);
  });

  it("rejects unknown part kind and names the part id", () => {
    const spec = triangle();
    spec.parts.push({ kind: "blob", id: "weird" } as never);
    const errors = errorsOf(spec);
    expect(errors.join(" ")).toContain("weird");
  });

  it("rejects a segment referencing a missing point", () => {
    const spec = triangle();
    spec.parts.push({ kind: "segment", id: "s1", from: "A", to: "Z" } as never);
    const errors = errorsOf(spec);
    expect(errors.join(" ")).toContain("Z");
  });

  it("rejects a color or pixel field", () => {
    const spec = triangle();
    (spec.parts[0] as Record<string, unknown>).stroke = "#000";
    const errors = errorsOf(spec);
    expect(errors.join(" ")).toContain("colors and sizes come from the theme");
  });

  it("rejects a non-numeric coordinate", () => {
    const spec = triangle();
    (spec.parts[1] as Record<string, unknown>).x = "four";
    expect(errorsOf(spec).length).toBeGreaterThan(0);
  });

  it("rejects labels and marks that reference missing parts", () => {
    const spec = triangle();
    spec.labels.push({ text: "?", on: "nope" });
    expect(errorsOf(spec).join(" ")).toContain("nope");
  });
});

// Found in the final branch review: a reversed or empty range, or a step that
// gives thousands of ticks, passed validation and drew nonsense or hung.
describe("frame validation", () => {
  const plane = (frame: Record<string, unknown>) => ({
    version: FIGURE_SPEC_VERSION,
    type: "plane",
    parts: [],
    labels: [],
    marks: [],
    frame,
  });

  it("requires each range to run from low to high", () => {
    expect(parseFigureSpec(plane({ x: [-5, 5], y: [-5, 5] })).ok).toBe(true);
    expect(errorsOf(plane({ x: [5, -5], y: [-5, 5] })).join(" ")).toMatch(/x range/);
    expect(errorsOf(plane({ x: [-5, 5], y: [2, 2] })).join(" ")).toMatch(/y range/);
  });

  it("refuses a step that gives more than MAX_TICKS ticks on an axis", () => {
    expect(MAX_TICKS).toBe(200);
    // 200 ticks is the most: [0, 199] at step 1.
    expect(parseFigureSpec(plane({ x: [0, 199], y: [0, 10], step: 1 })).ok).toBe(true);
    expect(errorsOf(plane({ x: [0, 200], y: [0, 10], step: 1 })).join(" ")).toMatch(
      /more than 200 ticks on the x-axis/
    );
    expect(errorsOf(plane({ x: [0, 1], y: [0, 1000], step: 0.5, yStep: 1 })).join(" ")).toMatch(
      /more than 200 ticks on the y-axis/
    );
    // Without a step the automatic one is always readable.
    expect(parseFigureSpec(plane({ x: [0, 1e6], y: [0, 1e6] })).ok).toBe(true);
  });
});
