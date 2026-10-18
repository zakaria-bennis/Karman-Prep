import { expect, it } from "vitest";
import { createTestEngine } from "@/lib/calculator-v2/core/api/__fixtures__/test-engine";
import type { CalculatorEngine } from "@/lib/calculator-v2/core/api/engine";
import type { ExpressionState } from "@/lib/calculator-v2/core/api/types";
import { TRANSFER_MESSAGES, type TransferPayload } from "@/lib/calculator-transfer/payload";
import { classifyTable } from "@/lib/calculator-transfer/table";
import { applyTransfer } from "./apply";

function seeded(rows: ExpressionState[] = []): CalculatorEngine {
  const { engine } = createTestEngine();
  if (rows.length > 0) engine.setExpressions(rows);
  engine.clearHistory();
  return engine;
}
const table = (headers: string[] | null, rows: string[][]): TransferPayload => {
  const item = classifyTable({ sourceId: "table", headers, rows });
  if (item === null) throw new Error("no table item");
  return { ...item.payload, questionKey: "a1:q1" };
};
const headersOf = (e: CalculatorEngine) =>
  e
    .getExpressions()
    .filter((r) => r.type === "table")
    .map((r) => (r.columns ?? []).map((c) => c.latex));

it("TR-25 columns are named x_n and y_n with the lowest free n", () => {
  const e = seeded();
  const two = table(
    ["t", "$h(t)$"],
    [
      ["0", "10"],
      ["1", "14"],
    ]
  );
  expect(applyTransfer(e, two, "mouse")).toEqual({
    status: "added",
    message: "Added table to calculator: x₁ is t, y₁ is h(t), 2 rows.",
    focusRowId: "1",
  });
  // the empty row a blank calculator holds becomes the table (TR-32); header labels never enter it
  expect(e.getExpressions()).toEqual([
    {
      id: "1",
      type: "table",
      latex: "",
      color: "c1",
      hidden: false,
      columns: [
        { latex: "x_{1}", values: ["0", "1"], color: "c1", hidden: false },
        { latex: "y_{1}", values: ["10", "14"], color: "c1", hidden: false },
      ],
    },
  ]);
  // the next table takes n = 2; a three-column table skips every n with one name in use
  applyTransfer(e, table(["x", "y"], [["1", "2"]]), "mouse");
  const used = seeded([
    { id: "1", latex: "y_{2}=4" },
    { id: "2", latex: "y_{1}\\sim mx_{1}+b" },
  ]);
  const three = table(null, [
    ["x", "1", "2"],
    ["y", "3", "4"],
    ["z", "5", "6"],
  ]);
  expect(applyTransfer(used, three, "keyboard").message).toBe(
    "Added table to calculator: x₃ is x, y₃ is y, y₄ is z, 2 rows."
  );
  expect([...headersOf(e), ...headersOf(used)]).toEqual([
    ["x_{1}", "y_{1}"],
    ["x_{2}", "y_{2}"],
    ["x_{3}", "y_{3}", "y_{4}"],
  ]);
  // a one-variable table is a single x column; an absent header is omitted from the status
  const one = seeded();
  expect(applyTransfer(one, table(["Score"], [["85"], ["90"]]), "mouse").message).toBe(
    "Added table to calculator: x₁ is Score, 2 rows."
  );
  expect(headersOf(one)).toEqual([["x_{1}"]]);
  const years = seeded([{ id: "1", latex: "y=x" }]);
  expect(
    applyTransfer(years, table(["", "2019", "2020"], [["Sales", "5", "7"]]), "mouse")
  ).toMatchObject({
    status: "added",
    message: "Added table to calculator: x₁, y₁ is Sales, 2 rows.",
    focusRowId: "2",
  });
  expect(TRANSFER_MESSAGES.tableAdded(["x₁ is t"], 1)).toBe(
    "Added table to calculator: x₁ is t, 1 row."
  );
});

it("TR-38, TR-73 a table transfer is one undo step, and an invalid or over-limit table inserts nothing", () => {
  const e = seeded([{ id: "1", latex: "y=x" }]);
  applyTransfer(e, table(["x", "y"], [["1", "2"]]), "mouse");
  expect(e.getExpressions()).toHaveLength(2);
  e.undo();
  expect(e.getExpressions().map((r) => r.latex)).toEqual(["y=x"]);
  const before = e.getExpressions();
  for (const bad of [
    { ...table(["x", "y"], [["1", "2"]]), table: { headers: [null], columns: [["1"], ["2"]] } },
    { ...table(["x", "y"], [["1", "2"]]), table: { headers: [null, null], columns: [["1"], []] } },
    { ...table(["x", "y"], [["1", "2"]]), table: { headers: [], columns: [] } },
    {
      ...table(["x", "y"], [["1", "2"]]),
      table: { headers: [null, null], columns: [["1+"], ["2"]] },
    },
  ])
    expect(applyTransfer(e, bad, "mouse").status, JSON.stringify(bad.table)).toBe("rejected");
  expect(e.getExpressions()).toEqual(before);
});
