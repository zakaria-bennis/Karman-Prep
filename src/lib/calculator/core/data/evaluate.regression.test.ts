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

it("RT-15 a scalar left side is legal: it is fitted against every predictor value", () => {
  const { fits } = run(table(["1", "2"], ["3", "4"]), row("r", "3\\sim mx_{1}"));
  expect(fits.get("r")).toMatchObject({ ok: true });
});

it("D-22 a point, a list of points or an empty list on either side is the reference's 'Cannot regress' error", () => {
  const error = (...rows: RowSource[]) => {
    const fit = run(...rows).fits.get("r")!;
    return fit.ok ? null : fit.error;
  };
  const data = table(["1", "2"], ["3", "4"]);
  expect(error(data, row("r", "(1,2)\\sim mx_{1}"))).toBe(
    "Cannot regress a point against a list of numbers."
  );
  expect(error(data, row("r", "y_{1}\\sim(m,x_{1})"))).toBe(
    "Cannot regress a list of numbers against a list of points."
  );
  expect(error(row("r", "(1,2)\\sim m"))).toBe("Cannot regress a point against a number.");
  expect(error(row("r", "[(1,2),(3,4)]\\sim m"))).toBe(
    "Cannot regress a list of points against a number."
  );
  expect(error(row("r", "[]\\sim m"))).toBe("Cannot regress an empty list against a number.");
  expect(error(row("E", "E=[]"), row("L", "L=[1,2,3]"), row("r", "L\\sim mE"))).toBe(
    "Cannot regress a list of numbers against an empty list."
  );
  expect(error(table([], []), row("r", "y_{1}\\sim mx_{1}+b"))).toBe(
    "Cannot regress an empty list against an empty list."
  );
  expect(error(table(["1", "2", "3"], []), row("r", "y_{1}\\sim mx_{1}+b"))).toBe(
    "Cannot regress an empty list against a list of numbers."
  );
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
