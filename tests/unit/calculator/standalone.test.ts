import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, it, expect } from "vitest";
const source = ["complex", "math", "regression", "model"]
  .map((name) => readFileSync(`karman-calculator/lib/${name}.js`, "utf8"))
  .join("\n");
const api = runInNewContext(source + "\n({buildScene,normalize,subscript,compile,mathFor})");
const expression = (text: string) => ({ type: "expression", text });
const table = (data: number[][]) => ({
  type: "table",
  tableIndex: 1,
  data: data.map((pair) => pair.map(String)),
});
function scene(...rows: ReturnType<typeof expression>[]) {
  api.buildScene(rows, "degrees");
  return rows as unknown as {
    error: string;
    result: string;
    plot: { fn: (x: number, y?: number) => number };
  }[];
}
describe("original standalone mathematical engine", () => {
  it.each([
    ["sin(30)", "0.5"],
    ["2^3^2", "512"],
    ["-2^2", "-4"],
    ["(-2)^2", "4"],
    ["log(100)+ln(e)", "3"],
    ["2(3+4)", "14"],
    ["1e3", "1000"],
  ])("evaluates %s", (text, result) => expect(scene(expression(text))[0].result).toBe(result));
  it.each([
    "window.alert(1)",
    "constructor.constructor(1)",
    "x;alert(1)",
    "x.__proto__",
    "x[0]",
    "<img src=x>",
  ])("rejects code %s", (text) => expect(scene(expression(text))[0].error).not.toBe(""));
  it.each([
    ["x1+x12", "x₁+x₁₂"],
    ["a_12+b_{23}", "a₁₂+b₂₃"],
    ["x₁2", "x₁₂"],
    ["1e3", "1e3"],
  ])("renders numeric suffixes %s", (text, result) => expect(api.subscript(text)).toBe(result));
  it("normalizes subscripts, fractions and square roots", () =>
    expect(scene(expression("x₁=\\frac{6}{2}"), expression("x_1+\\sqrt{16}"))[1].result).toBe("7"));
  it("resolves functions and constants independently of row order", () =>
    expect(
      scene(
        expression("y=f(x)+b"),
        expression("b=3"),
        expression("f(x)=a*x^2"),
        expression("a=2")
      )[0].plot.fn(2)
    ).toBe(11));
  it("rejects circular and unknown variables", () => {
    expect(scene(expression("a=b"), expression("b=a"))[0].error).toContain("Circular");
    expect(scene(expression("y=unknown*x"))[0].error).toContain("Define");
  });
  it("evaluates implicit circles and single-variable equations", () => {
    const rows = scene(expression("x^2+y^2=25"), expression("x^2=4"));
    expect(rows[0].plot.fn(3, 4)).toBe(0);
    expect(rows[1].plot.fn(2, 8)).toBe(0);
  });
  it("calculates linear fit, signed r and residual statistics", () => {
    const rows = [
      table([
        [0, 7],
        [1, 5],
        [2, 3],
        [3, 1],
      ]),
      expression("y1~m*x1+b"),
    ];
    api.buildScene(rows, "degrees");
    const fit = (
      rows[1] as unknown as {
        regression: { parameters: { m: number; b: number }; r2: number; r: number; rmse: number };
      }
    ).regression;
    expect(fit.parameters.m).toBeCloseTo(-2, 7);
    expect(fit.parameters.b).toBeCloseTo(7, 7);
    expect(fit.r2).toBeCloseTo(1);
    expect(fit.r).toBeCloseTo(-1);
    expect(fit.rmse).toBeLessThan(1e-7);
  });
  it.each([
    [
      "y1~a*x1^2+b*x1+c",
      [
        [0, 1],
        [1, 4],
        [2, 9],
        [3, 16],
        [4, 25],
      ],
      { a: 1, b: 2, c: 1 },
    ],
    [
      "y1~a*b^x1",
      [
        [0, 2],
        [1, 6],
        [2, 18],
        [3, 54],
      ],
      { a: 2, b: 3 },
    ],
    [
      "y1~b",
      [
        [0, 1],
        [1, 3],
        [2, 5],
      ],
      { b: 3 },
    ],
  ])("fits %s", (text, data, expected) => {
    const rows = [table(data as number[][]), expression(text as string)];
    api.buildScene(rows, "degrees");
    const fit = (rows[1] as unknown as { regression: { parameters: Record<string, number> } })
      .regression;
    for (const [name, value] of Object.entries(expected))
      expect(fit.parameters[name]).toBeCloseTo(value, 5);
  });
  it("keeps constant-data R squared undefined", () => {
    const rows = [
      table([
        [0, 3],
        [1, 3],
        [2, 3],
      ]),
      expression("y1~b"),
    ];
    api.buildScene(rows, "degrees");
    expect((rows[1] as unknown as { regression: { r2: number } }).regression.r2).toBeNaN();
  });
  it("rejects unidentified regression parameters", () => {
    const rows = [
      table([
        [1, 1],
        [1, 2],
        [1, 3],
      ]),
      expression("y1~m*x1+b"),
    ];
    api.buildScene(rows, "degrees");
    expect((rows[1] as unknown as { error: string }).error).toContain("uniquely");
  });
  it("updates R squared after adjusting a fitted parameter", () => {
    const rows = [
      table([
        [0, 1],
        [1, 3],
        [2, 5],
      ]),
      expression("y1~m*x1+b"),
    ];
    api.buildScene(rows, "degrees");
    const row = rows[1] as unknown as {
      manual: { m: number; b: number };
      regression: { r2: number };
    };
    row.manual = { m: 0, b: 3 };
    api.buildScene(rows, "degrees");
    expect(row.regression.r2).toBeCloseTo(0);
  });
  it("interprets the same math when Function is forbidden by CSP", () => {
    const safe = runInNewContext(source + "\n({buildScene})", {
      Function: () => {
        throw new Error("CSP");
      },
    });
    const rows = [expression("sin(30)+2^3")];
    safe.buildScene(rows, "degrees");
    expect((rows[0] as unknown as { result: string }).result).toBe("8.5");
  });
});
