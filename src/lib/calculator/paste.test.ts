// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  IMPORTED_TABLE,
  insertPayload,
  normalizeMath,
  parseText,
  parseTransfer,
  tablePayload,
} from "./paste";
import { canUseCalculator } from "./eligibility";
import type { CalculatorInstance, Expression } from "./types";

describe("calculator imports", () => {
  it("normalizes plain input without doubling LaTeX commands", () => {
    expect(normalizeMath("sin(30) + π + x₁")).toBe("\\sin (30) + \\pi  + x_{1}");
    expect(normalizeMath("$\\frac{1}{2}$")).toBe("\\frac{1}{2}");
    expect(normalizeMath("sqrt(1+sqrt(9))")).toBe("\\sqrt{1+\\sqrt{9}}");
  });
  it("keeps coordinate pairs distinct from CSV tables", () => {
    expect(parseText("(1,2), (-3,4)")).toEqual({
      kind: "points",
      pairs: [
        ["1", "2"],
        ["-3", "4"],
      ],
    });
    expect(parseText("x₁,y₁\r\n1,2\r\n3,4")).toEqual({
      kind: "table",
      rows: [
        ["1", "2"],
        ["3", "4"],
      ],
    });
  });
  it("does not discard numeric expression rows as headers", () => {
    expect(parseText("sqrt(9)\t1e3\n4\t5")).toEqual({
      kind: "table",
      rows: [
        ["\\sqrt{9}", "1\\cdot 10^{3}"],
        ["4", "5"],
      ],
    });
  });
  it("recognizes nested and LaTeX coordinate points before CSV", () => {
    expect(parseText("(sqrt(2),max(3,4)), (5,6)")).toEqual({
      kind: "points",
      pairs: [
        ["\\sqrt{2}", "\\operatorname{max}(3,4)"],
        ["5", "6"],
      ],
    });
    expect(parseText("\\left(\\frac{1}{2},\\pi\\right)")).toEqual({
      kind: "points",
      pairs: [["\\frac{1}{2}", "\\pi"]],
    });
    expect(parseText("(1+2)*(3+4)").kind).toBe("math");
  });
  it("accepts pi and Euler's constant as numeric table cells", () => {
    expect(tablePayload([["π", "e"]])).toEqual({
      kind: "table",
      rows: [["\\pi ", "e"]],
    });
  });
  it.each([
    "",
    "https://example.com/saved-graph/abc",
    "<svg><path /></svg>",
    '{"expressions":[]}',
    "data:image/png;base64,test",
  ])("rejects empty or prohibited text %s", (text) => {
    expect(() => parseText(text)).toThrow();
  });
  it.each([[["1", "2", "3"]], [["1", ""]], [["(1", "2"]], [["x", "4"]]].map((rows) => ({ rows })))(
    "validates the whole table before insertion",
    ({ rows }) => {
      expect(() => tablePayload(rows)).toThrow();
    }
  );
  const transfer = (html: string, text = "", types = ["text/html"]) => ({
    types,
    files: { length: 0 } as FileList,
    getData: (type: string) => (type === "text/html" ? html : text),
  });
  it("imports semantic HTML tables, including row headings inside a figure", () => {
    expect(
      parseTransfer(
        transfer(
          '<figure><table><thead><tr><th>x</th><th>y</th></tr></thead><tbody><tr><th scope="row">1</th><td>2</td></tr></tbody></table></figure>'
        )
      )
    ).toEqual({ kind: "table", rows: [["1", "2"]] });
  });
  it.each([
    "<svg></svg>",
    '<img src="graph.png">',
    "<canvas></canvas>",
    '<iframe src="graph"></iframe>',
  ])("rejects figures even when a text fallback exists", (html) => {
    expect(() => parseTransfer(transfer(html, "y=x"))).toThrow();
  });
  it("rejects binary image clipboard formats", () => {
    expect(() => parseTransfer(transfer("", "y=x", ["image/png", "text/plain"]))).toThrow();
  });
  it("reads KaTeX cells once instead of concatenating accessible and visual numbers", () => {
    expect(
      parseTransfer(
        transfer(
          '<table><tr><td><span class="katex"><span class="katex-mathml"><math><semantics><mn>3</mn><annotation encoding="application/x-tex">3</annotation></semantics></math></span><span class="katex-html">3</span></span></td><td>4</td></tr></table>'
        )
      )
    ).toEqual({ kind: "table", rows: [["3", "4"]] });
  });
  it("replaces only the canonical imported table and preserves other expressions", () => {
    const setExpressions = vi.fn();
    const calc = {
      getExpressions: () => [
        { id: "student", latex: "y=x" },
        { id: IMPORTED_TABLE, type: "table" },
      ],
      setExpressions,
    } as unknown as CalculatorInstance;
    insertPayload(calc, tablePayload([["3", "4"]]), false);
    expect(setExpressions).toHaveBeenCalledWith([
      {
        id: IMPORTED_TABLE,
        type: "table",
        columns: [
          { latex: "x_1", values: ["3"] },
          { latex: "y_1", values: ["4"] },
        ],
      },
    ]);
  });
  it.each([
    { id: "1", latex: "x_{1}=5" },
    { id: "1", type: "table", columns: [{ latex: "y_1" }] },
  ] as Expression[])("rejects names owned by student work", (expression) => {
    const calc = {
      getExpressions: () => [expression],
      setExpressions: vi.fn(),
    } as unknown as CalculatorInstance;
    expect(() => insertPayload(calc, tablePayload([["3", "4"]]), false)).toThrow(/already belongs/);
    expect(calc.setExpressions).not.toHaveBeenCalled();
  });
});

it.each([
  ["math", "math", true, true],
  ["reading", "math", true, false],
  ["math", "reading", true, false],
  ["rw", "reading", true, false],
  ["math", "math", false, false],
  [undefined, "math", true, false],
])("gates calculator by section, question and phase", (section, question, active, expected) => {
  expect(canUseCalculator(section as string, question as string, active as boolean)).toBe(expected);
});
