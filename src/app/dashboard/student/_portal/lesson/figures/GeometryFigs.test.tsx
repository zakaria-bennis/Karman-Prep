// @vitest-environment jsdom
//
// The geometry pictures: each kind draws an SVG picture with a plain description and the labels the
// lesson gave it, for triangles (with the trig view and a similar copy), parallel lines and their
// angles, every solid and every flat shape.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AnglesFigure, ShapeFigure, SolidFigure, TriangleFigure } from "@/lib/lessons/figures";
import { AnglesFig, ShapeFig, SolidFig, TriangleFig } from "./GeometryFigs";
import { inAngle, numberLabel, plainNumber } from "./geometryParts";

/** The picture's svg and every label written in it. */
function drawn(ui: React.ReactElement) {
  const { container } = render(ui);
  const svg = container.querySelector("svg");
  expect(svg).not.toBeNull();
  expect(svg?.getAttribute("role")).toBe("img");
  expect(svg?.getAttribute("viewBox")).toMatch(/^-?[\d.]+ -?[\d.]+ [\d.]+ [\d.]+$/);
  expect(svg?.getAttribute("viewBox")).not.toContain("NaN");
  expect(container.innerHTML).not.toContain("NaN");
  const texts = [...container.querySelectorAll("text")].map((t) => t.textContent);
  return { svg: svg!, texts, container };
}

describe("TriangleFig", () => {
  it("draws a right triangle with its trig view from a corner", () => {
    const fig: TriangleFigure = {
      kind: "triangle",
      angles: [37, 53, 90],
      sides: ["3", "4", "5"],
      angleLabels: ["θ", "", ""],
      from: 0,
    };
    const { svg, texts, container } = drawn(<TriangleFig fig={fig} />);
    expect(texts).toEqual(expect.arrayContaining(["A", "B", "C", "3", "4", "5", "θ"]));
    // from A: BC is opposite, CA (beside A) adjacent, AB (facing the right angle) the hypotenuse
    expect(texts).toEqual(expect.arrayContaining(["opposite", "adjacent", "hypotenuse"]));
    expect(svg.getAttribute("aria-label")).toContain("seen from corner A");
    expect(container.querySelectorAll("[data-draw]").length).toBeGreaterThan(0);
  });

  it("draws a similar copy with scaled numbers and primed letters", () => {
    const fig: TriangleFigure = {
      kind: "triangle",
      angles: [50, 60, 70],
      sides: ["5", "x", "2.5"],
      corners: ["P", "Q", "R"],
      similar: 1.5,
      highlight: [0],
    };
    const { svg, texts } = drawn(<TriangleFig fig={fig} />);
    expect(texts).toEqual(
      expect.arrayContaining(["P", "Q", "R", "P′", "Q′", "R′", "5", "7.5", "x", "x′", "3.75"])
    );
    expect(texts).not.toContain("opposite");
    expect(svg.getAttribute("aria-label")).toContain("similar triangle scaled by 1.5");
  });

  it("draws a plain triangle with only its corner names", () => {
    const { texts } = drawn(<TriangleFig fig={{ kind: "triangle", angles: [20, 20, 140] }} />);
    expect(texts).toEqual(["A", "B", "C"]);
  });
});

describe("AnglesFig", () => {
  it("shows the given labels and lights the chosen angles", () => {
    const fig: AnglesFigure = {
      kind: "angles",
      tilt: 65,
      labels: { 1: "x", 6: "65°" },
      highlight: [2, 6],
    };
    const { svg, texts, container } = drawn(<AnglesFig fig={fig} />);
    expect(texts.sort()).toEqual(["65°", "x"]);
    expect(svg.getAttribute("aria-label")).toContain("angle 1 is x");
    expect(svg.getAttribute("aria-label")).toContain("angles 2 and 6 are marked");
    // two lines, the transversal, two parallel marks and two wedges
    expect(container.querySelectorAll("path").length).toBe(7);
  });

  it("numbers all eight angles when no labels are given, even when shallow", () => {
    const { texts } = drawn(<AnglesFig fig={{ kind: "angles", tilt: 20 }} />);
    expect(texts).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
  });
});

describe("SolidFig", () => {
  const solids: [SolidFigure, string[], string][] = [
    [{ kind: "solid", shape: "cylinder", labels: { r: "3", h: "10" } }, ["3", "10"], "cylinder"],
    [{ kind: "solid", shape: "cylinder" }, [], "cylinder"],
    [
      { kind: "solid", shape: "cone", labels: { r: "r", h: "h", l: "13" } },
      ["r", "h", "13"],
      "cone",
    ],
    [{ kind: "solid", shape: "sphere", labels: { r: "6" } }, ["6"], "sphere"],
    [{ kind: "solid", shape: "sphere" }, [], "sphere"],
    [
      { kind: "solid", shape: "prism", labels: { l: "8", w: "3", h: "4" } },
      ["8", "3", "4"],
      "rectangular prism",
    ],
    [{ kind: "solid", shape: "pyramid", labels: { s: "6", h: "4" } }, ["6", "4"], "square pyramid"],
    [{ kind: "solid", shape: "cube", labels: { s: "s" } }, ["s"], "cube"],
  ];
  it.each(solids)("draws %o", (fig, labels, name) => {
    const { svg, texts, container } = drawn(<SolidFig fig={fig} />);
    expect([...texts].sort()).toEqual([...labels].sort());
    expect(svg.getAttribute("aria-label")).toContain(`A ${name}`);
    // every solid but the sphere has a hidden edge, drawn dashed
    if (fig.shape !== "sphere")
      expect(container.querySelector("[class*='_hiddenEdge_']")).not.toBeNull();
  });
});

describe("ShapeFig", () => {
  const shapes: ShapeFigure[] = [
    { kind: "shape", shape: "rectangle", labels: ["12", "5"] },
    { kind: "shape", shape: "square", labels: ["s"] },
    { kind: "shape", shape: "triangle", labels: ["10", "8", "6"], height: "4.8" },
    { kind: "shape", shape: "parallelogram", labels: ["9", "5"], height: "4" },
    { kind: "shape", shape: "trapezoid", labels: ["14", "", "8"], height: "h" },
    { kind: "shape", shape: "l-shape", labels: ["10", "3", "6", "5", "4", "8"] },
    { kind: "shape", shape: "rect-with-semicircle", labels: ["8", "6"] },
    { kind: "shape", shape: "rect-minus-circle", labels: ["10", "6", "", "", "2"] },
  ];
  it.each(shapes)("shades the area of $shape with its labels", (fig) => {
    const { texts, container, svg } = drawn(<ShapeFig fig={fig} />);
    const want = [...(fig.labels ?? []).filter(Boolean), ...(fig.height ? [fig.height] : [])];
    expect([...texts].sort()).toEqual(want.sort());
    expect(container.querySelector("[class*='_area_']")).not.toBeNull();
    expect(svg.getAttribute("aria-label")).toContain("area shaded");
  });

  it("cuts the hole out of the shaded area", () => {
    const fig: ShapeFigure = { kind: "shape", shape: "rect-minus-circle", labels: ["10", "6"] };
    const { container } = drawn(<ShapeFig fig={fig} />);
    expect(container.querySelector("[class*='_area_']")?.getAttribute("fill-rule")).toBe("evenodd");
  });

  it("traces the perimeter in gold and shades nothing", () => {
    const fig: ShapeFigure = {
      kind: "shape",
      shape: "l-shape",
      labels: ["a", "b"],
      perimeter: true,
    };
    const { texts, container, svg } = drawn(<ShapeFig fig={fig} />);
    expect(texts).toEqual(["a", "b"]);
    expect(container.querySelector("[class*='_area_']")).toBeNull();
    expect(container.querySelector("[class*='_trace_'][data-draw]")).not.toBeNull();
    expect(svg.getAttribute("aria-label")).toContain("perimeter traced");
  });

  it("draws a semicircle on a rectangle with its arc labeled", () => {
    const fig: ShapeFigure = {
      kind: "shape",
      shape: "rect-with-semicircle",
      labels: ["8", "5", "arc", "5"],
    };
    expect(screen.queryByText("arc")).toBeNull();
    const { texts } = drawn(<ShapeFig fig={fig} />);
    expect(texts).toContain("arc");
  });
});

describe("geometry parts", () => {
  it("reads plain numbers and writes scaled ones without float dust", () => {
    expect(plainNumber("5")).toBe(5);
    expect(plainNumber(" 2.5 ")).toBe(2.5);
    expect(plainNumber("x")).toBeNull();
    expect(plainNumber("5√2")).toBeNull();
    expect(numberLabel(0.1 * 3)).toBe("0.3");
    expect(numberLabel(5 * 2)).toBe("10");
  });

  it("puts an angle's label inside the angle", () => {
    // a right angle along +x and -y (up on screen): the label lands up and to the right
    const [x, y] = inAngle([0, 0], [1, 0], [0, -1], "x");
    expect(x).toBeGreaterThan(0);
    expect(y).toBeLessThan(0);
  });
});
