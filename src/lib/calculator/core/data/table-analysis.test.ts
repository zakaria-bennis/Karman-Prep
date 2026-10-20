import { expect, it } from "vitest";
import { analyzeRows, type RowSource } from "../analysis/index";

const SETTINGS = { angleMode: "radians" as const, complex: false };
const table = (id: string, columns: [string, string[]][]): RowSource => ({
  id,
  latex: "",
  hidden: false,
  columns: columns.map(([latex, values]) => ({ latex, values })),
});
const row = (id: string, latex: string): RowSource => ({ id, latex, hidden: false });

it("D-10 the first header must be a name; a later name header is a data column and an expression header computed", () => {
  const a = analyzeRows(
    [
      table("t", [
        ["x_{1}", ["1", "2"]],
        ["y_{1}", ["3", "4"]],
        ["x_{1}^{2}", []],
        ["", ["5"]],
      ]),
    ],
    SETTINGS
  );
  const t = a.byId.get("t")!;
  expect(t.kind).toBe("table");
  expect(t.isGraphable).toBe(true);
  expect(t.graph).toEqual({ kind: "table" });
  expect(t.table!.columns.map((c) => c.role)).toEqual(["variable", "data", "computed", "blank"]);
  expect(t.table!.columns.map((c) => c.name)).toEqual(["x_{1}", "y_{1}", null, null]);
  expect(t.table!.rows).toBe(2);
  const bad = analyzeRows(
    [
      table("t", [
        ["2", ["1"]],
        ["y_{1}", ["3"]],
      ]),
    ],
    SETTINGS
  ).byId.get("t")!;
  expect(bad.table!.columns[0]).toMatchObject({ role: "error" });
  expect(bad.table!.columns[0].error?.message).toBe("The first column needs a name, such as x₁.");
});

it("D-10 a later header naming a list another row defines is a computed column", () => {
  const a = analyzeRows(
    [
      row("a", "y_{2}=5"),
      table("t", [
        ["x_{1}", ["1"]],
        ["y_{2}", ["9"]],
      ]),
    ],
    SETTINGS
  );
  expect(a.byId.get("t")!.table!.columns[1].role).toBe("computed");
  expect(a.byId.get("a")!.error).toBeNull();
});

it("D-10 a header name another table also defines marks only the rows that use it, as in Desmos", () => {
  const a = analyzeRows(
    [
      table("t", [
        ["x_{1}", ["1"]],
        ["y_{1}", ["2"]],
      ]),
      table("u", [
        ["x_{2}", ["1"]],
        ["y_{1}", ["3"]],
      ]),
      { id: "w", latex: "y_{1}+1", hidden: false },
    ],
    SETTINGS
  );
  for (const id of ["t", "u"]) expect(a.byId.get(id)!.table!.columns[1].error).toBeNull();
  expect(a.byId.get("w")!.error?.message).toBe(
    "You've defined 'y_1' in more than one place. Try deleting some of the definitions of 'y_1'."
  );
});

it("D-11 column names are defined for every other row, so y_1 alone is a value row with no chip", () => {
  const a = analyzeRows(
    [
      table("t", [
        ["x_{1}", ["1", "2"]],
        ["y_{1}", ["3", "4"]],
      ]),
      row("r", "y_{1}"),
    ],
    SETTINGS
  );
  const r = a.byId.get("r")!;
  expect(r.kind).toBe("value");
  expect(r.chips).toEqual([]);
  expect(a.rows.map((x) => x.id)).toEqual(["t", "r"]); // synthetic definitions never appear in rows
  expect(a.valueOrder).toContain("t#1");
});

it("D-6 a cell using its own table's columns, an undefined name or a comma has a cell error with Desmos's text", () => {
  const a = analyzeRows(
    [
      row("k", "k=2"),
      table("t", [
        ["x_{1}", ["1", "k", "x_{1}", "q", "3,4", ""]],
        ["y_{1}", ["\\frac{1}{3}", "-2.5", "\\sqrt{2}", "\\frac{\\pi}{4}", "", ""]],
      ]),
    ],
    SETTINGS
  );
  const errors = a.byId.get("t")!.table!.columns[0].cellErrors.map((e) => e?.message ?? null);
  expect(errors).toEqual([
    null,
    null,
    "Too many variables. Try defining 'x_1'.", // its own column, as the reference words it
    "Too many variables. Try defining 'q'.",
    "Points are written like this: (1, 2).",
    null,
  ]);
  expect(a.byId.get("t")!.table!.columns[1].cellErrors.every((e) => e === null)).toBe(true);
});

it("TABLES-16 a first column headed y, r or θ errors as on the reference; x, t and a are fine", () => {
  for (const name of ["y", "r", "\\theta"]) {
    const a = analyzeRows(
      [
        table("t", [
          [name, ["1", "2"]],
          ["x_{1}", ["3", "4"]],
        ]),
      ],
      SETTINGS
    );
    const first = a.byId.get("t")!.table!.columns[0];
    expect(first.role).toBe("error");
    expect(first.error?.message).toBe("First column may not be 'y', 'r', or 'θ'.");
  }
  for (const name of ["x", "t", "a"]) {
    const a = analyzeRows(
      [
        table("t", [
          [name, ["1", "2"]],
          ["y_{1}", ["3", "4"]],
        ]),
      ],
      SETTINGS
    );
    expect(a.byId.get("t")!.table!.columns[0].error).toBeNull();
  }
});

it("TABLES-13 a cell holding a point, list, equation or inequality has the reference's text", () => {
  const a = analyzeRows(
    [
      table("t", [
        ["x_{1}", ["(1,2)", "[1,2]", "x=2", "y<3", "4"]],
        ["y_{1}", ["1", "2", "3", "4", "5"]],
      ]),
    ],
    SETTINGS
  );
  expect(a.byId.get("t")!.table!.columns[0].cellErrors.map((e) => e?.message ?? null)).toEqual([
    "Table entry cannot be a point.",
    "Table entries must be simple expressions. Lists are not allowed.",
    "Table entries must be simple expressions. Equations are not allowed.",
    "Table entries must be simple expressions. Inequalities are not allowed.",
    null,
  ]);
});

it("TABLES-13 a cell or header that cannot be read, or is a point, list, relation or regression, uses the reference's table wording", () => {
  const cellError = (latex: string) =>
    analyzeRows(
      [
        table("t", [
          ["x_{1}", ["1", latex]],
          ["y_{1}", ["3", "4"]],
        ]),
      ],
      SETTINGS
    ).byId.get("t")!.table!.columns[0].cellErrors[1]?.message;
  const NOT_ALLOWED =
    "Table entries must be simple expressions. This type of expression is not allowed.";
  for (const latex of ["2+", "\\sqrt{}", "\\left|\\right|", "\\sin", "x_{1^{2}}", "a=", "2^{}"])
    expect(cellError(latex), latex).toBe(NOT_ALLOWED);
  expect(cellError("1,2")).toBe("Points are written like this: (1, 2).");
  expect(cellError("1\\sim2")).toBe(
    "Table entries must be simple expressions. Regressions are not allowed."
  );
  const headerError = (latex: string) =>
    analyzeRows(
      [
        table("t", [
          ["x_{1}", ["1", "2"]],
          [latex, ["3", "4"]],
        ]),
      ],
      SETTINGS
    ).byId.get("t")!.table!.columns[1].error?.message;
  const HEAD_NOT_ALLOWED =
    "Table headers must be simple expressions. This type of expression is not allowed.";
  for (const latex of ["y_{1}+", "\\sqrt{}", "y_{1^{2}}", "2^{}", "\\frac{1}{}"])
    expect(headerError(latex), latex).toBe(HEAD_NOT_ALLOWED);
  expect(headerError("(1,2)")).toBe("Table header cannot be a point.");
  expect(headerError("[1,2]")).toBe(
    "Table headers must be simple expressions. Lists are not allowed."
  );
  expect(headerError("y_{1}=2")).toBe(
    "Table headers must be simple expressions. Equations are not allowed."
  );
  expect(headerError("y_{1}<2")).toBe(
    "Table headers must be simple expressions. Inequalities are not allowed."
  );
  expect(headerError("1,2")).toBe("Points are written like this: (1, 2).");
});

it("RC-20 a call with the wrong argument count marks its cell or header, as in Desmos (2026-10-20)", () => {
  const a = analyzeRows(
    [
      table("t", [
        ["x_{2}", ["1", "\\sin()"]],
        ["\\sin()", ["7", "5"]],
        ["y_{3}", ["\\sin(1,2)", "5"]],
      ]),
    ],
    SETTINGS
  );
  const [x, header, y] = a.byId.get("t")!.table!.columns;
  expect([
    x.cellErrors[1]?.message,
    header.role,
    header.error?.message,
    y.cellErrors[0]?.message,
  ]).toEqual([
    "Function 'sin' requires an argument. For example, try typing: sin(x).",
    "error",
    "Function 'sin' requires an argument. For example, try typing: sin(x).",
    "Function 'sin' requires only 1 argument. For example, try typing: sin(x).",
  ]);
});
