// One table regression fit (RT-17 to -24, RT-28 to -30, REG-MODELS-6 to -20): the x and y columns
// paired up to the shorter length after trailing blanks, the data and logarithmic-x errors the
// panel shows in place of results, the fit (direct for the linear-in-parameter models, variable
// projection for the rest, always from scratch), Log Mode for exponential, logarithmic and power,
// the statistics shape, display precision, the EQUATION latex and the residuals in original units.
// Pure TypeScript: no DOM.

import { displayPrecision, equationLatex, formatStatisticValue } from "./display";
import { solveColumnOrder } from "./linear-fit";
import { regressionStatistics, type RegressionStatistics } from "./statistics";
import { TABLE_MODEL_SPECS, type LogForm, type TableModel } from "./table-models";
import { fitNonlinearTable, snapTinyParameters } from "./table-nonlinear";

export const TABLE_REGRESSION_MESSAGES = {
  data: "There's an error in the provided data.",
  logarithmicX: "Logarithmic regressions only work if the first column is all positive numbers.",
  fit: "We couldn't find any region where this model is defined.",
} as const;

export interface TableFitInput {
  type: TableModel;
  xs: readonly (number | null)[]; // the x column's values; null for blank, undefined or error
  ys: readonly (number | null)[];
  logMode: boolean; // the stored flag; ignored where Log Mode is not offered (RT-24c)
}
export interface TableFitSuccess {
  ok: true;
  params: number[];
  precision: number;
  equation: string; // the EQUATION row latex
  statistics: RegressionStatistics;
  residuals: number[];
  logMode: { available: boolean; on: boolean };
  parameterWarning: boolean;
  isLinear: boolean;
}
export interface TableFitFailure {
  ok: false;
  message: string;
}
export type TableFitResult = TableFitSuccess | TableFitFailure;

/** The column without its trailing blanks. */
function trimmed(values: readonly (number | null)[]): (number | null)[] {
  let n = values.length;
  while (n > 0 && values[n - 1] === null) n--;
  return values.slice(0, n);
}

const fail = (message: string): TableFitFailure => ({ ok: false, message });

/** Ordinary least squares v ≈ s·u + c. */
function line(u: readonly number[], v: readonly number[]): { s: number; c: number } {
  const n = u.length;
  const mu = u.reduce((a, b) => a + b, 0) / n,
    mv = v.reduce((a, b) => a + b, 0) / n;
  let suv = 0,
    suu = 0;
  for (let i = 0; i < n; i++) {
    suv += (u[i] - mu) * (v[i] - mv);
    suu += (u[i] - mu) ** 2;
  }
  const s = suu > 0 ? suv / suu : 0;
  return { s, c: mv - s * mu };
}

/** RT-24a: Log Mode is offered for this type and data. */
function logModeOffered(form: LogForm | undefined, xs: number[], ys: number[], f: number[]) {
  if (form === undefined || xs.length < 3) return false;
  if ((form === "LOGLIN" || form === "LOGLOG") && !ys.every((y) => y > 0)) return false;
  if ((form === "LOGLOG" || form === "LINLOG") && !xs.every((x) => x > 0)) return false;
  // A flat fitted curve never qualifies (the chord test).
  const lo = Math.min(...f),
    hi = Math.max(...f);
  return hi > lo;
}

export function fitTableRegression(input: TableFitInput): TableFitResult {
  const spec = TABLE_MODEL_SPECS[input.type];
  const xColumn = trimmed(input.xs),
    yColumn = trimmed(input.ys);
  const n = Math.min(xColumn.length, yColumn.length);
  const xs: number[] = [],
    ys: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = xColumn[i],
      y = yColumn[i];
    if (x === null || y === null || !Number.isFinite(x) || !Number.isFinite(y)) {
      return fail(TABLE_REGRESSION_MESSAGES.data);
    }
    xs.push(x);
    ys.push(y);
  }
  if (n === 0) return fail(TABLE_REGRESSION_MESSAGES.data);
  if (input.type === "logarithmic" && !xs.every((x) => x > 0)) {
    return fail(TABLE_REGRESSION_MESSAGES.logarithmicX);
  }
  let params: number[];
  const isLinear = spec.basis !== undefined;
  if (spec.basis !== undefined) {
    const k = spec.params.length;
    const a = new Float64Array(n * k);
    xs.forEach((x, i) => spec.basis!(x).forEach((v, j) => (a[i * k + j] = v)));
    if (!a.every(Number.isFinite)) return fail(TABLE_REGRESSION_MESSAGES.fit);
    const cleaned = snapTinyParameters([...solveColumnOrder(a, n, k, ys)], xs, ys, spec.evaluate);
    if (cleaned === null) return fail(TABLE_REGRESSION_MESSAGES.fit);
    params = cleaned.params;
  } else {
    const fit = fitNonlinearTable(
      input.type as "exponential" | "power" | "logistic" | "sinusoidal",
      xs,
      ys,
      spec.evaluate
    );
    if (fit === null) return fail(TABLE_REGRESSION_MESSAGES.fit);
    params = fit.params;
  }
  let predicted = xs.map((x) => spec.evaluate(params, x));
  if (!params.every(Number.isFinite) || !predicted.every(Number.isFinite)) {
    return fail(TABLE_REGRESSION_MESSAGES.fit);
  }
  const available = logModeOffered(spec.logForm, xs, ys, predicted);
  const on = available && input.logMode;
  const form = spec.logForm;
  let statistics: RegressionStatistics | null;
  if (on && (form === "LOGLIN" || form === "LOGLOG")) {
    const u = form === "LOGLIN" ? xs : xs.map(Math.log);
    const lnY = ys.map(Math.log);
    const { s, c } = line(u, lnY);
    params = form === "LOGLIN" ? [Math.exp(c), Math.exp(s)] : [Math.exp(c), s];
    predicted = xs.map((x) => spec.evaluate(params, x));
    statistics = regressionStatistics({
      observed: lnY,
      predicted: predicted.map(Math.log),
      predictor: u,
      plainLeft: true,
      forceR: true,
    });
  } else {
    statistics = regressionStatistics({
      observed: ys,
      predicted,
      predictor: on ? xs.map(Math.log) : xs,
      plainLeft: true,
      forceR: on,
    });
  }
  if (statistics === null) return fail(TABLE_REGRESSION_MESSAGES.fit);
  const precision = displayPrecision(params, xs, ys, spec.evaluate);
  return {
    ok: true,
    params,
    precision,
    equation: equationLatex(spec.equation, params, precision),
    statistics,
    residuals: ys.map((y, i) => y - predicted[i]),
    logMode: { available, on },
    parameterWarning: false,
    isLinear,
  };
}

/** RT-30: the table panel's STATISTICS lines; `null` value means "… is undefined". */
export interface TableStatisticsLine {
  label: "R2" | "r";
  value: string | null; // latex, or null for "is undefined"
}

export function tableStatisticsLines(
  type: TableModel,
  statistics: RegressionStatistics
): TableStatisticsLine[] {
  const linear = type === "linear";
  const lines: TableStatisticsLine[] = [];
  if (statistics.kind === "RMSE") {
    lines.push({ label: "R2", value: null });
    if (linear) lines.push({ label: "r", value: null });
  } else if (statistics.kind === "Rsquared") {
    lines.push({ label: "R2", value: formatStatisticValue(statistics.Rsquared) });
    if (linear) lines.push({ label: "r", value: null });
  } else {
    lines.push({ label: "R2", value: formatStatisticValue(statistics.rsquared) });
    if (linear) lines.push({ label: "r", value: formatStatisticValue(statistics.r) });
  }
  return lines;
}
