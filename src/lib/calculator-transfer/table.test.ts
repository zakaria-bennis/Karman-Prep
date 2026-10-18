import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { TABLE_FIXTURES } from "./__fixtures__/tables";
import { classifyTable, explainTable, type TableInput } from "./table";

const input = (headers: string[] | null, rows: string[][], sourceId = "table"): TableInput => ({
  sourceId,
  headers,
  rows,
});

function run(rule: string) {
  const cases = TABLE_FIXTURES.filter((f) => f.rules.includes(rule));
  expect(cases.length).toBeGreaterThan(0);
  for (const f of cases) {
    const v = explainTable(input(f.headers, f.rows));
    if (!f.expect.control) {
      expect("rule" in v ? v.rule : "item", f.id).toBe(f.expect.rule);
      continue;
    }
    if (!("item" in v)) throw new Error(`${f.id}: ${v.rule} ${v.detail}`);
    expect(v.item.payload.table, f.id).toEqual({
      headers: f.expect.headers,
      columns: f.expect.columns,
    });
  }
}

it("TR-22 only the two table 5.1 shapes are eligible", () => {
  run("TR-22");
  const item = classifyTable(input(["x", "y"], [["1", "3"]]));
  expect(item).toMatchObject({
    sourceId: "table",
    kind: "table",
    ruleId: "TR-22",
    description: "table, 1 row",
    payload: {
      version: 1,
      sourceId: "table",
      description: "table, 1 row",
      format: "table",
      dependencies: [],
    },
  });
  expect(item?.payload.rows).toBeUndefined();
  // A table answer choice is described by its letter (table 8.1).
  const choice = classifyTable({ ...input(["x", "y"], [["1", "3"]], "choice:B"), letter: "B" });
  expect([choice?.sourceId, choice?.description]).toEqual(["choice:B", "choice B"]);
  expect(classifyTable(input(["", "Yes", "No"], [["Male", "1", "2"]]))).toBeNull();
});

it("TR-23 the first variable is the input and 1 to 8 variables with 1 to 200 points transfer", () => {
  run("TR-23");
  // vertical: the first column; horizontal: the first row (the header row when there is one)
  const vertical = classifyTable(input(["t", "d"], [["0", "5"]]));
  const horizontal = classifyTable(input(["t", "0", "1"], [["d", "5", "6"]]));
  expect(vertical?.payload.table?.columns[0]).toEqual(["0"]);
  expect(horizontal?.payload.table?.columns[0]).toEqual(["0", "1"]);
  expect(classifyTable(input(["n"], [["4"], ["5"], ["6"]]))?.payload.table).toEqual({
    headers: ["n"],
    columns: [["4", "5", "6"]],
  });
  expect(
    classifyTable(
      input(
        ["x", "y"],
        [
          ["1", "2"],
          ["3", "4"],
          ["5", "6"],
        ]
      )
    )?.description
  ).toBe("table, 3 rows");
});

it("TR-24 cells must be numeric constants after normalisation, separators removed", () => {
  run("TR-24");
  // fractions stay fractions and decimals stay decimals, with no rounding or conversion
  expect(classifyTable(input(["x", "y"], [["$\\frac{2}{4}$", "0.10"]]))?.payload.table).toEqual({
    headers: ["x", "y"],
    columns: [["\\frac{2}{4}"], ["0.10"]],
  });
  // thousands separators in a math cell are removed too; a comma that is not one is not
  expect(classifyTable(input(["x", "y"], [["1", "$1,250,000$"]]))?.payload.table?.columns).toEqual([
    ["1"],
    ["1250000"],
  ]);
  expect(classifyTable(input(["x", "y"], [["1", "1,25"]]))).toBeNull();
});

it("TR-74 table.ts stays framework-free and never imports the v2 calculator", () => {
  const src = readFileSync("src/lib/calculator-transfer/table.ts", "utf8");
  expect(src).not.toMatch(/calculator-v2|from "react"|mathquill/);
});
