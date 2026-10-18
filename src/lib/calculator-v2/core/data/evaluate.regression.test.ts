import { expect, it } from "vitest";
import { analyzeRows, type RowSource } from "../analysis/index";
import { NO_DEADLINE } from "../deadline";
import { evaluateRows } from "../eval/compile";
import { formatValue } from "../eval/format";
import type { RegressionOutcome } from "./evaluate-regression";

const SETTINGS = { angleMode: "radians" as const, complex: false };
const table = (x: string[], y: string[]): RowSource => ({
  id: "t",
  latex: "",
  hidden: false,
  columns: [
    { latex: "x_{1}", values: x },
    { latex: "y_{1}", values: y },
  ],
});
const row = (id: string, latex: string): RowSource => ({ id, latex, hidden: false });

function run(...rows: RowSource[]) {
  const fits = new Map<string, RegressionOutcome>();
  const values = evaluateRows(analyzeRows(rows, SETTINGS), SETTINGS, () => NO_DEADLINE, {
    table: () => undefined,
    regression: (id, r) => fits.set(id, r),
  });
  return { values, fits };
}

it("D-46 the fit follows every cell edit with no submit step", () => {
  const first = run(table(["1", "2", "3"], ["2", "4", "6"]), row("r", "y_{1}\\sim mx_{1}+b"));
  const m1 = first.fits.get("r")!.params.find((p) => p.name === "m")!.value;
  expect(m1).toBeCloseTo(2, 12);
  const second = run(table(["1", "2", "3"], ["2", "4", "9"]), row("r", "y_{1}\\sim mx_{1}+b"));
  expect(second.fits.get("r")!.params.find((p) => p.name === "m")!.value).toBeCloseTo(3.5, 12);
});

it("D-33 e_1 is a list other rows can use before any plotting", () => {
  const { values, fits } = run(
    table(["1", "2", "3"], ["2", "4", "7"]),
    row("r", "y_{1}\\sim mx_{1}+b"),
    row("u", "e_{1}"),
    row("v", "m")
  );
  expect(fits.get("r")!.residualName).toBe("e_{1}");
  const shown = formatValue(values.get("u")!);
  expect(shown.startsWith("[")).toBe(true);
  expect(formatValue(values.get("v")!)).toBe("2.5");
});

it("D-22 a scalar left side is the error Regression needs a list of data.", () => {
  const { fits } = run(table(["1", "2"], ["3", "4"]), row("r", "3\\sim mx_{1}"));
  expect(fits.get("r")).toMatchObject({ ok: false, error: "Regression needs a list of data." });
});

it("D-24 a blank cell in a used list fails the whole fit and leaves its names undefined", () => {
  const { fits, values } = run(
    table(["1", "", "3"], ["2", "4", "6"]),
    row("r", "y_{1}\\sim mx_{1}+b"),
    row("v", "m")
  );
  expect(fits.get("r")).toMatchObject({
    ok: false,
    error: "We couldn't find any region where this model is defined.",
  });
  expect(values.get("v")).toEqual({ type: "undefined" });
});
