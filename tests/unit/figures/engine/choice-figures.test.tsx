// @vitest-environment jsdom
// Task 10 fix round 1: choice descriptions that tell figures apart (WCAG 1.1.1), one scale
// for shape and solid choices, no "x" on category axes, centered padding, radio keys.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FIGURE_CHOICE_QUESTIONS } from "@/app/dev/figure-choices/fixtures";
import FigureChoices from "@/components/learn/figures/FigureChoices";
import FigureView from "@/components/learn/figures/FigureView";
import { buildChart } from "@/lib/figures/engine/charts";
import { CHOICE_BOX, choiceScenes, padScene } from "@/lib/figures/engine/choices";
import { latexToWords, MAX_LISTED } from "@/lib/figures/engine/describe-detail";
import { buildPlane } from "@/lib/figures/engine/plane";
import type { Scene } from "@/lib/figures/engine/scene";
import { FIGURE_SPEC_VERSION, type FigureSpec } from "@/lib/figures/engine/spec";

afterEach(cleanup);

const base: Pick<FigureSpec, "version" | "labels" | "marks"> = {
  version: FIGURE_SPEC_VERSION,
  labels: [],
  marks: [],
};
const BOX = { width: 640, height: 480 };

const triangle = (k: number): FigureSpec => ({
  ...base,
  type: "geometry2d",
  parts: [
    { kind: "point", id: "A", x: 0, y: 0 },
    { kind: "point", id: "B", x: 4 * k, y: 0 },
    { kind: "point", id: "C", x: 0, y: 3 * k },
    { kind: "polygon", id: "ABC", points: ["A", "B", "C"] },
  ],
});
const prism = (length: number, width: number, height: number): FigureSpec => ({
  ...base,
  type: "solid3d",
  parts: [{ kind: "solid", id: "box", shape: "prism", dims: { length, width, height } }],
});

/** [x0, x1, y0, y1] over every path coordinate of a scene. */
function extent(scene: Scene): [number, number, number, number] {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const item of scene.items) {
    if (item.t !== "path") continue;
    const nums = (item.d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
    for (let i = 0; i + 1 < nums.length; i += 2) {
      xs.push(nums[i]);
      ys.push(nums[i + 1]);
    }
  }
  return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
}

describe("I1: descriptions tell choices apart", () => {
  it("the four descriptions in every choice fixture set are pairwise distinct", () => {
    for (const q of FIGURE_CHOICE_QUESTIONS) {
      const scenes = choiceScenes(q.answer_choices.map((c) => c.choice_figure_spec));
      const texts = scenes.map((s) => s!.description);
      expect(new Set(texts).size, q.id).toBe(4);
    }
  });

  it("planes: a line by its equation and points, other points by coordinates", () => {
    const spec: FigureSpec = {
      ...base,
      type: "plane",
      parts: [
        { kind: "point", id: "P", x: 0, y: 1 },
        { kind: "point", id: "Q", x: 1, y: 3 },
        { kind: "point", id: "R", x: 2, y: -2 },
        { kind: "line", id: "PQ", from: "P", to: "Q" },
      ],
      labels: [{ text: "R", on: "R" }],
      frame: { x: [-5, 5], y: [-5, 5] },
    };
    expect(buildPlane(spec, BOX).description).toBe(
      "A coordinate plane with x from -5 to 5 and y from -5 to 5: " +
        "the line y = 2x + 1 through (0, 1) and (1, 3); the point R (2, -2)."
    );
  });

  it("planes: rays, segments and functions in words", () => {
    const spec: FigureSpec = {
      ...base,
      type: "plane",
      parts: [
        { kind: "point", id: "A", x: 0, y: 0 },
        { kind: "point", id: "B", x: 2, y: 2 },
        { kind: "ray", id: "AB", from: "A", to: "B" },
        { kind: "segment", id: "BA", from: "B", to: "A" },
        { kind: "function", id: "f", latex: "y=\\frac{1}{2}x^{2}-3" },
      ],
      frame: { x: [-5, 5], y: [-5, 5] },
    };
    expect(buildPlane(spec, BOX).description).toBe(
      "A coordinate plane with x from -5 to 5 and y from -5 to 5: " +
        "a ray from (0, 0) through (2, 2); a segment from (2, 2) to (0, 0); " +
        "the graph of y equals 1 over 2 x squared minus 3."
    );
    expect(latexToWords("y=\\sqrt{x+1}")).toBe("y equals the square root of (x plus 1)");
    expect(latexToWords("y=-x^{3}")).toBe("y equals minus x cubed");
  });

  it("bar charts: the value per category", () => {
    const spec: FigureSpec = {
      ...base,
      type: "bar",
      parts: [{ kind: "series", id: "s", values: [4, 8] }],
      frame: { x: [0, 2], y: [0, 10], categories: ["Mon", "Tue"], yLabel: "Visitors" },
    };
    expect(buildChart(spec, BOX).description).toBe(
      "Bar chart with 2 categories. Y-axis: Visitors. Mon 4, Tue 8."
    );
  });

  it("scatterplots list up to 12 points, then summarize", () => {
    const pts = (n: number) => Array.from({ length: n }, (_, i) => [i, 2 * i] as [number, number]);
    const scatter = (n: number): FigureSpec => ({
      ...base,
      type: "scatter",
      parts: [{ kind: "series", id: "s", values: pts(n) }],
      frame: { x: [0, 30], y: [0, 60] },
    });
    expect(buildChart(scatter(2), BOX).description).toMatch(/Points \(0, 0\), \(1, 2\)\.$/);
    expect(buildChart(scatter(MAX_LISTED + 1), BOX).description).toMatch(
      /13 points with x from 0 to 12 and y from 0 to 24\.$/
    );
  });

  it("shapes that read the same gain their vertex positions", () => {
    const [a, b] = choiceScenes([triangle(1), triangle(2)]);
    expect(a!.description).toBe("Triangle ABC, with A at (0, 0), B at (4, 0) and C at (0, 3).");
    expect(b!.description).toBe("Triangle ABC, with A at (0, 0), B at (8, 0) and C at (0, 6).");
  });

  it("solids that read the same gain their dims", () => {
    const [a] = choiceScenes([prism(2, 3, 4), prism(4, 2, 2)]);
    expect(a!.description).toBe("Rectangular prism, with length 2, width 3 and height 4.");
  });
});

describe("I2: shape and solid choices share one scale", () => {
  it("two triangles of different world sizes keep their size ratio on screen", () => {
    const [small, large] = choiceScenes([triangle(1), triangle(2)]);
    const [s0, s1, s2, s3] = extent(small!);
    const [l0, l1, l2, l3] = extent(large!);
    expect((l1 - l0) / (s1 - s0)).toBeCloseTo(2, 1);
    expect(Math.abs((l1 - l0) / (s1 - s0) - 2)).toBeLessThan(0.02);
    expect(Math.abs((l3 - l2) / (s3 - s2) - 2)).toBeLessThan(0.02);
    expect(small!.scale).toBe(large!.scale);
  });

  it("two prisms keep their size ratio on screen", () => {
    const [small, large] = choiceScenes([prism(1, 1, 1), prism(3, 3, 3)]);
    const [s0, s1] = extent(small!);
    const [l0, l1] = extent(large!);
    expect(Math.abs((l1 - l0) / (s1 - s0) - 3)).toBeLessThan(0.03);
  });

  it("every figure of a set still fits the box, centered", () => {
    const scenes = choiceScenes([triangle(1), triangle(3), triangle(2), triangle(0.5)]);
    for (const scene of scenes) {
      const [x0, x1, y0, y1] = extent(scene!);
      expect(x0).toBeGreaterThanOrEqual(0);
      expect(y0).toBeGreaterThanOrEqual(0);
      expect(x1).toBeLessThanOrEqual(CHOICE_BOX.width);
      expect(y1).toBeLessThanOrEqual(CHOICE_BOX.height);
      expect((x0 + x1) / 2).toBeCloseTo(CHOICE_BOX.width / 2, 0);
    }
    // The largest one fills the box's width or height (less margins): the scale is the largest that fits.
    const [x0, x1, y0, y1] = extent(scenes[1]!);
    expect(Math.max((x1 - x0) / CHOICE_BOX.width, (y1 - y0) / CHOICE_BOX.height)).toBeGreaterThan(
      0.7
    );
  });
});

describe("M3: category axes have no default x name", () => {
  const texts = (scene: Scene) => scene.items.flatMap((i) => (i.t === "text" ? [i.text] : []));
  it("a bar chart draws no 'x'; a plane still names its x-axis", () => {
    const bar: FigureSpec = {
      ...base,
      type: "bar",
      parts: [{ kind: "series", id: "s", values: [1, 2] }],
      frame: { x: [0, 2], y: [0, 4], categories: ["A", "B"] },
    };
    expect(texts(buildChart(bar, BOX))).not.toContain("x");
    const plane: FigureSpec = {
      ...base,
      type: "plane",
      parts: [],
      frame: { x: [-2, 2], y: [-2, 2] },
    };
    expect(texts(buildPlane(plane, BOX))).toContain("x");
  });
});

describe("M7: a padded scene is centered in its box", () => {
  it("offsets a smaller scene by half the difference, and FigureView shifts its viewBox", () => {
    const scene: Scene = { width: 240, height: 180, items: [], issues: [], description: "d" };
    const padded = padScene(scene, 240, 220);
    expect(padded.offset).toEqual([0, 20]);
    const { container } = render(<FigureView scene={padded} />);
    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe("0 -20 240 220");
  });

  it("choice charts of different heights are centered, not top-left", () => {
    const bar = (named: boolean): FigureSpec => ({
      ...base,
      type: "bar",
      parts: [
        { kind: "series", id: "s1", values: [1, 2] },
        { kind: "series", id: "s2", values: [2, 1] },
      ],
      labels: named
        ? [
            { text: "One", on: "s1" },
            { text: "Two", on: "s2" },
          ]
        : [],
      frame: { x: [0, 2], y: [0, 4], categories: ["A", "B"] },
    });
    const [tall, short] = choiceScenes([bar(true), bar(false)]);
    expect(tall!.offset).toBeUndefined();
    expect(short!.height).toBe(tall!.height);
    expect(short!.offset![1]).toBeGreaterThan(0);
  });
});

describe("M5: the radio keyboard model", () => {
  const choices = [1, 2, 3, 4].map((k, i) => ({
    letter: "ABCD"[i],
    choice_figure_spec: triangle(k),
    choice_text: "",
  }));

  it("one Tab stop; arrow keys move between choices, skipping crossed ones; Enter selects", () => {
    const onSelect = vi.fn();
    render(
      <FigureChoices
        radio
        choices={choices}
        selected="B"
        onSelect={onSelect}
        crossed={(l) => l === "C"}
        onToggleCrossed={() => {}}
      />
    );
    const radio = (l: string) => screen.getByRole("radio", { name: new RegExp(`^Choice ${l}`) });
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    expect(radio("B")).toHaveAttribute("aria-checked", "true");
    expect(["A", "B", "C", "D"].map((l) => radio(l).tabIndex)).toEqual([-1, 0, -1, -1]);

    radio("B").focus();
    fireEvent.keyDown(radio("B"), { key: "ArrowDown" });
    expect(document.activeElement).toBe(radio("D")); // C is crossed out
    fireEvent.keyDown(radio("D"), { key: "ArrowRight" });
    expect(document.activeElement).toBe(radio("A")); // wraps
    fireEvent.keyDown(radio("A"), { key: "ArrowUp" });
    expect(document.activeElement).toBe(radio("D"));
    expect(onSelect).not.toHaveBeenCalled(); // moving is not choosing

    fireEvent.click(radio("D")); // Enter and Space activate a button as a click
    expect(onSelect).toHaveBeenCalledWith("D");
  });

  it("without radio the choices stay toggle buttons (the quiz screen)", () => {
    render(<FigureChoices choices={choices} onSelect={() => {}} />);
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.getAllByRole("button", { pressed: false })).toHaveLength(4);
  });
});
