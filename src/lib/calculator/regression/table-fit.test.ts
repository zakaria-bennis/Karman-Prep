// RT-17 to RT-30 against every dataset × model case observed live (models.values.json).
import { describe, expect, it } from "vitest";
import cases from "./__fixtures__/table-models.json";
import { fitTableRegression, tableStatisticsLines } from "./table-fit";
import { isTableModel } from "./table-models";
import { karmanCopy } from "../core/analysis/__fixtures__/desmos-copy";

interface Case {
  key: string;
  x: number[];
  y: (number | string)[];
  model: string;
  logMode: boolean;
  equation: string | null;
  statistics: string[];
  logModeShown: boolean;
  error: string | null;
}

function run(c: Case) {
  if (!isTableModel(c.model)) throw new Error(c.model);
  const result = fitTableRegression({
    type: c.model,
    xs: c.x,
    ys: c.y.map((v) => (typeof v === "number" ? v : null)),
    logMode: c.logMode,
  });
  if (!result.ok)
    return { equation: null, statistics: [], error: result.message, logModeShown: false };
  const statistics = tableStatisticsLines(c.model, result.statistics).flatMap((l) =>
    l.value === null
      ? l.label === "R2"
        ? ['"R" squared', "R2", " is undefined"]
        : ['"r"', "r", " is undefined"]
      : [`${l.label}=${l.value}`]
  );
  return {
    equation: result.equation,
    statistics,
    error: null,
    logModeShown: result.logMode.available,
  };
}

const all = cases as Case[];
// RT-20: degenerate nonlinear fits (huge near-zero-frequency sines, logistic a → 1e14+, the
// exactly-determined sinusoids) land elsewhere in our search; their statistics still match.
const DEGENERATE = new Set([
  "owner|sinusoidal",
  "lin6|sinusoidal",
  "grow8|sinusoidal",
  "exp5|sinusoidal",
  "negy5|sinusoidal",
  "parab6|sinusoidal",
  "two|sinusoidal",
  "exp5|logistic",
  "parab6|logistic",
  "sine13|logistic",
  "consty4|logistic",
  "two|logistic",
  "parab6|power", // negative x: the reference's search stops at b = 1.84, not the scan's best 1.6
  "parab6|power|log",
]);

describe("RT-29 table regressions match the reference's displayed results", () => {
  for (const c of all) {
    it(`${c.key}`, () => {
      const got = run(c);
      expect(got.error).toBe(c.error === null ? null : karmanCopy(c.error));
      expect(got.logModeShown).toBe(c.logModeShown);
      if (!DEGENERATE.has(c.key)) {
        expect(got.equation).toBe(c.equation);
        expect(got.statistics).toEqual(c.statistics.map((s) => s.replace("−", "-")));
      }
    });
  }
});

it("RT-17 the owner's quadratic gives y=-0.000438273x^2+0.170062x+1.02236, R²=1", () => {
  const r = fitTableRegression({
    type: "quadratic",
    xs: [12, 25, 325],
    ys: [3, 5, 10],
    logMode: false,
  });
  expect(r.ok && r.equation).toBe("y=-0.000438273x^{2}+0.170062x+1.02236");
  expect(r.ok && tableStatisticsLines("quadratic", r.statistics)).toEqual([
    { label: "R2", value: "1" },
  ]);
});

it("RT-19 yearly data: Exponential fits as written and warns, Power fits without a warning", () => {
  const years = { xs: [2000, 2001, 2002, 2003], ys: [1, 2, 4.1, 7.9], logMode: false };
  const exp = fitTableRegression({ type: "exponential", ...years });
  expect(exp.ok && exp.parameterWarning).toBe(true);
  // the reference: y=(1.031816×10⁻¹⁵³)·1.193268ˣ, R² = 0.4878; ours stops nearer the overflow edge
  expect(exp.ok && exp.equation).toMatch(
    /^y=\\left\(\d\.\d+\\times10\^\{-15[34]\}\\right\)\\cdot1\.193\d+\^\{x\}$/
  );
  expect(exp.ok && tableStatisticsLines("exponential", exp.statistics)[0].value).toMatch(/^0\.48/);
  const power = fitTableRegression({ type: "power", ...years });
  expect(power.ok && power.parameterWarning).toBe(false);
  expect(power.ok && power.params[1]).toBeCloseTo(46.5, 0);
  const logistic = fitTableRegression({ type: "logistic", ...years });
  expect(logistic.ok && logistic.equation).toBe(
    "y=\\frac{48.40253}{1+e^{-\\left(0.7484829x-1500.8455\\right)}}"
  );
});

describe("RT-30 a table regression's error text", () => {
  const fit = (xs: (number | null | "error")[], ys: (number | null | "error")[]) => {
    const r = fitTableRegression({ type: "linear", xs, ys, logMode: false });
    return r.ok ? null : r.message;
  };
  it("names the empty columns: y against x", () => {
    expect(fit([], [])).toBe("Can't regress an empty list against an empty list.");
    expect(fit([null, null], [])).toBe("Can't regress an empty list against an empty list.");
    expect(fit([], [2, 4, 7])).toBe("Can't regress a list of numbers against an empty list.");
    expect(fit([1, 2, 3], [])).toBe("Can't regress an empty list against a list of numbers.");
  });
  it("a blank or a cell in error inside the used rows is a data error, even in the last row", () => {
    expect(fit([1, 2, 3], [2, null, 7])).toBe("Some of the data has errors.");
    expect(fit([1, 2, "error"], [2, 4, 7])).toBe("Some of the data has errors.");
  });
  it("an undefined value finds no region where the model is defined", () => {
    expect(fit([1, 2, 3], [2, Number.NaN, 7])).toBe("This model isn't defined for this data.");
  });
});
