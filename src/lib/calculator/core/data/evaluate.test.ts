import { expect, it } from "vitest";
import { analyzeRows, type RowSource } from "../analysis/index";
import { NO_DEADLINE } from "../deadline";
import { evaluateRows } from "../eval/compile";
import { formatValue } from "../eval/format";
import type { TableResult } from "./evaluate";

const SETTINGS = { angleMode: "radians" as const, complex: false };
const table = (id: string, columns: [string, string[]][]): RowSource => ({
  id,
  latex: "",
  hidden: false,
  columns: columns.map(([latex, values]) => ({ latex, values })),
});
const row = (id: string, latex: string): RowSource => ({ id, latex, hidden: false });

function run(...rows: RowSource[]) {
  const analysis = analyzeRows(rows, SETTINGS);
  const tables = new Map<string, TableResult>();
  const values = evaluateRows(analysis, SETTINGS, () => NO_DEADLINE, {
    table: (rowId, t) => tables.set(rowId, t),
    regression: () => undefined,
  });
  return { analysis, values, tables };
}

it("D-11 a column is a list with trailing blanks dropped and interior blanks undefined", () => {
  const { values, tables } = run(
    table("t", [
      ["x_{1}", ["1", "", "3"]],
      ["y_{1}", ["4", "5", ""]],
    ]),
    row("r", "y_{1}")
  );
  expect(formatValue(values.get("r")!)).toBe("[4, 5]"); // the trailing blank is not part of y_1
  expect(tables.get("t")!.columns[0].values).toEqual([1, null, 3]);
  expect(tables.get("t")!.columns[1].values).toEqual([4, 5, null]);
});

it("D-6 cells accept 1/3, -2.5, sqrt 2, pi/4 and a variable defined in another row", () => {
  const { tables } = run(
    row("a", "a=7"),
    table("t", [
      ["x_{1}", ["\\frac{1}{3}", "-2.5", "\\sqrt{2}", "\\frac{\\pi}{4}", "a"]],
      ["y_{1}", []],
    ])
  );
  const got = tables.get("t")!.columns[0].values;
  [1 / 3, -2.5, Math.SQRT2, Math.PI / 4, 7].forEach((v, i) => expect(got[i]).toBeCloseTo(v, 12));
});

it("D-10 a computed column x_1^2 shows each row's value and follows edits to the x cells", () => {
  const first = run(
    table("t", [
      ["x_{1}", ["-2", "-1", "0", "3"]],
      ["x_{1}^{2}", []],
    ])
  );
  const computed = first.tables.get("t")!.columns[1];
  expect(computed.values).toEqual([4, 1, 0, 9]);
  expect(computed.display).toEqual(["4", "1", "0", "9"]);
  const second = run(
    table("t", [
      ["x_{1}", ["5"]],
      ["x_{1}^{2}", []],
    ])
  );
  expect(second.tables.get("t")!.columns[1].values).toEqual([25]);
});

it("D-10 a computed column can name a list another row defines, element by element", () => {
  const { tables } = run(
    row("f", "f(x)=2x"),
    table("t", [
      ["x", ["1", "2"]],
      ["f\\left(x\\right)", []],
      ["y", ["7", "8"]],
    ])
  );
  expect(tables.get("t")!.columns.map((c) => c.values)).toEqual([
    [1, 2],
    [2, 4],
    [7, 8],
  ]);
});
