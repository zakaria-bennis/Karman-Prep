// @vitest-environment jsdom

// The algebra pictures: each draws the lesson's own words and numbers, with math through KaTeX, and
// marks its parts for useDrawIn in a sensible order.
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  BalanceFig,
  GridFig,
  MachineFig,
  NumberLineFig,
  TapeFig,
  numberText,
  ticksFor,
} from "./AlgebraFigs";

/** The TeX of every formula KaTeX drew (its MathML keeps the source). */
const texOf = (root: Element) =>
  [...root.querySelectorAll("annotation")].map((n) => n.textContent?.trim());

/** Every element useDrawIn traces must be SVG geometry; HTML parts pop instead. */
function drawsAreSvg(root: Element) {
  for (const el of root.querySelectorAll("[data-draw]")) {
    expect(el.namespaceURI).toBe("http://www.w3.org/2000/svg");
  }
}

describe("BalanceFig", () => {
  it("puts both sides on the pans and lists three steps in order", () => {
    const { container } = render(
      <BalanceFig
        fig={{
          kind: "balance",
          left: "$2(x - 4) + 7$",
          right: "$x + 9$",
          steps: [
            { move: "Distribute the $2$", left: "$2x - 8 + 7$", right: "$x + 9$" },
            { move: "Subtract x from both sides", left: "$x - 1$", right: "$9$" },
            { move: "Add 1 to both sides", left: "$x$", right: "$10$" },
          ],
        }}
      />
    );
    const tex = texOf(container);
    for (const t of ["2(x - 4) + 7", "x + 9", "2x - 8 + 7", "x - 1", "9", "x", "10"]) {
      expect(tex).toContain(t);
    }
    expect(screen.getByText("Subtract x from both sides")).toBeInTheDocument();
    expect(screen.getByText("Add 1 to both sides")).toBeInTheDocument();
    const rows = [...container.querySelectorAll("li")];
    expect(rows).toHaveLength(3);
    const ats = rows.map((r) => Number(r.getAttribute("data-at")));
    expect(ats).toEqual([...ats].sort((x, y) => x - y));
    expect(new Set(ats).size).toBe(3);
    expect(screen.getByRole("img", { name: /A level balance: 2\(x - 4\) \+ 7 = x \+ 9/ })).toBe(
      container.firstChild
    );
    drawsAreSvg(container);
  });

  it("draws a balance with no steps", () => {
    const { container } = render(
      <BalanceFig fig={{ kind: "balance", left: "$\\frac{x}{4} + 3$", right: "$7$" }} />
    );
    expect(texOf(container)).toEqual(expect.arrayContaining(["\\frac{x}{4} + 3", "7"]));
    expect(container.querySelector("ol")).toBeNull();
  });
});

describe("NumberLineFig", () => {
  it("draws ticks, an open ray to the right and a labeled point", () => {
    const { container } = render(
      <NumberLineFig
        fig={{
          kind: "numberLine",
          from: -5,
          to: 5,
          ray: { from: 2, dir: "right", open: true },
          points: [{ at: -3, label: "a" }],
        }}
      />
    );
    for (const n of ["−5", "−1", "0", "2", "5"]) {
      expect(screen.getByText(n)).toBeInTheDocument();
    }
    expect(screen.getByText("a")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /from −5 to 5.*a ray from 2 going right, open at 2/ })
    ).toBeInTheDocument();
    // the line first, then the ray, then the points, then their labels
    const at = (sel: string) => Number(container.querySelector(sel)?.getAttribute("data-at"));
    expect(at("path[data-draw]")).toBe(0);
    expect(at("g path[data-draw]")).toBe(1);
    expect(at("circle")).toBe(2);
    expect(Number(screen.getByText("a").getAttribute("data-at"))).toBe(3);
    drawsAreSvg(container);
  });

  it("draws a span with open and closed ends on a 0 to 100 line", () => {
    render(
      <NumberLineFig
        fig={{ kind: "numberLine", from: 0, to: 100, span: { from: 20, to: 65, openFrom: true } }}
      />
    );
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /a stretch from 20 \(open\) to 65 \(closed\)/ })
    ).toBeInTheDocument();
  });

  it("chooses a nice step with about 8 to 13 ticks", () => {
    expect(ticksFor(-5, 5).step).toBe(1);
    expect(ticksFor(-10, 10).step).toBe(2);
    expect(ticksFor(0, 100).step).toBe(10);
    expect(ticksFor(0, 1).ticks).toHaveLength(11);
    for (const [from, to] of [
      [-5, 5],
      [-6, 6],
      [0, 24],
      [0, 50],
      [-3, 7],
      [0, 1],
    ]) {
      const n = ticksFor(from, to).ticks.length;
      expect(n).toBeGreaterThanOrEqual(8);
      expect(n).toBeLessThanOrEqual(13);
    }
    expect(numberText(0.1 + 0.2)).toBe("0.3");
    expect(numberText(-4)).toBe("−4");
  });
});

describe("TapeFig", () => {
  it("draws a 3:5 ratio with one unit width for both bars", () => {
    const { container } = render(
      <TapeFig
        fig={{
          kind: "tape",
          bars: [
            { label: "Boys", parts: [{ n: 1 }, { n: 1 }, { n: 1 }] },
            { label: "Girls", parts: [{ n: 1 }, { n: 1 }, { n: 1 }, { n: 1 }, { n: 1 }] },
          ],
          note: "1 part = 12",
        }}
      />
    );
    expect(screen.getByText("Boys")).toBeInTheDocument();
    expect(screen.getByText("Girls")).toBeInTheDocument();
    expect(screen.getByText("1 part = 12")).toBeInTheDocument();
    const slots = [...container.querySelectorAll<HTMLElement>("[style]")];
    expect(slots).toHaveLength(8);
    for (const el of slots) expect(el.style.width).toBe("20%");
    // parts pop one by one, the note last
    const ats = [...container.querySelectorAll("[style] > [data-pop]")].map((el) =>
      Number(el.getAttribute("data-at"))
    );
    expect(ats).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(Number(screen.getByText("1 part = 12").getAttribute("data-at"))).toBe(8);
  });

  it("shows part labels and sizes parts by n", () => {
    const { container } = render(
      <TapeFig
        fig={{
          kind: "tape",
          bars: [
            { label: "Budget", parts: [{ n: 100, label: "$240" }] },
            { label: "Spent", parts: [{ n: 30, label: "30%" }, { n: 45 }] },
          ],
        }}
      />
    );
    expect(screen.getByText("$240")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
    const widths = [...container.querySelectorAll<HTMLElement>("[style]")].map(
      (el) => el.style.width
    );
    expect(widths).toEqual(["100%", "30%", "45%"]);
  });
});

describe("GridFig", () => {
  it("draws the area model for (x + 3)(x + 2)", () => {
    const { container } = render(
      <GridFig
        fig={{
          kind: "grid",
          rows: ["$x$", "$2$"],
          cols: ["$x$", "$3$"],
          cells: [
            ["$x^2$", "$3x$"],
            ["$2x$", "$6$"],
          ],
        }}
      />
    );
    expect(texOf(container)).toEqual(["x", "3", "x", "x^2", "3x", "2", "2x", "6"]);
    expect(screen.getByRole("img", { name: /Products: x\^2, 3x; 2x, 6/ })).toBeInTheDocument();
    // cells pop one at a time after the headers
    const cellAts = [...container.querySelectorAll("[data-at]")]
      .map((el) => Number(el.getAttribute("data-at")))
      .filter((n) => n >= 2);
    expect(cellAts).toEqual([2, 3, 4, 5]);
  });

  it("draws a 2 by 3 model", () => {
    const { container } = render(
      <GridFig
        fig={{
          kind: "grid",
          rows: ["$2x$", "$-1$"],
          cols: ["$x^2$", "$3x$", "$-4$"],
          cells: [
            ["$2x^3$", "$6x^2$", "$-8x$"],
            ["$-x^2$", "$-3x$", "$4$"],
          ],
        }}
      />
    );
    expect(texOf(container)).toEqual(
      expect.arrayContaining(["2x^3", "6x^2", "-8x", "-x^2", "-3x", "4"])
    );
  });
});

describe("MachineFig", () => {
  it("draws one machine with its in and out table", () => {
    const { container } = render(
      <MachineFig
        fig={{
          kind: "machine",
          rule: "$f(x) = 2x + 1$",
          pairs: [
            ["1", "3"],
            ["2", "5"],
            ["-3", "-5"],
          ],
        }}
      />
    );
    expect(texOf(container)).toContain("f(x) = 2x + 1");
    expect(screen.getByText("in")).toBeInTheDocument();
    expect(screen.getByText("out")).toBeInTheDocument();
    for (const v of ["1", "3", "5", "−3", "−5"]) {
      expect(screen.getByText(v, { selector: "[data-pop]" })).toBeInTheDocument();
    }
    drawsAreSvg(container);
  });

  it("chains a second machine fed by the first one's outputs", () => {
    const { container } = render(
      <MachineFig
        fig={{
          kind: "machine",
          rule: "$f(x) = x + 3$",
          pairs: [
            ["-1", "2"],
            ["0", "3"],
          ],
          then: {
            rule: "$g(x) = x^2$",
            pairs: [
              ["2", "4"],
              ["3", "9"],
            ],
          },
        }}
      />
    );
    expect(texOf(container)).toEqual(["f(x) = x + 3", "g(x) = x^2"]);
    expect(screen.getAllByText("in")).toHaveLength(2);
    expect(screen.getAllByText("2", { selector: "[data-pop]" })).toHaveLength(2);
    expect(screen.getByText("9", { selector: "[data-pop]" })).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Its outputs go into a second machine with the rule g/ })
    ).toBeInTheDocument();
    // the second machine comes after the first one's table
    const ats = [...container.querySelectorAll("[data-at]")].map((el) =>
      Number(el.getAttribute("data-at"))
    );
    expect(Math.max(...ats)).toBeGreaterThan(5);
    drawsAreSvg(container);
  });
});
