import { expect, it } from "vitest";
import { FIT_ERROR, fitRegression, type FitInput } from "./fit";

const X = [1990, 2000, 2010, 2020],
  Y = [30000, 36000, 42000, 48000];
/** y ~ m·x + b with params [m, b]. */
const linear = (x: number[], y: number[]): FitInput => ({
  observed: y,
  predictor: x,
  params: ["m", "b"],
  model: (p, i) => p[0] * x[i] + p[1],
  logForm: null,
  logMode: false,
});
const near = (a: number | null, b: number, digits = 9) => expect(a).toBeCloseTo(b, digits);

it("D-24 a blank or non-numeric value in a used list fails the whole fit with Desmos's message", () => {
  const r = fitRegression(linear([1, 2, NaN, 4], [2, 4, 6, 8]));
  expect(r).toMatchObject({ ok: false, error: FIT_ERROR, params: [] });
  expect(FIT_ERROR).toBe("This model isn't defined for this data.");
  // Lists pair over the shorter length, so a trailing extra value is ignored.
  expect(fitRegression(linear([1, 2, 3], [2, 4, 6, NaN])).ok).toBe(true);
});

it("RT-17, REG-STATISTICS-3 fewer points than parameters fits exactly with free parameters 0, R² = r² = 1", () => {
  const quad: FitInput = {
    observed: [3, 5],
    predictor: [1, 2],
    params: ["a", "b", "c"],
    model: (p, i) => p[0] * [1, 2][i] ** 2 + p[1] * [1, 2][i] + p[2],
    logForm: null,
    logMode: false,
  };
  const r = fitRegression(quad);
  expect(r.ok).toBe(true);
  [-0.5, 3.5, 0].forEach((v, j) => near(r.params[j].value, v));
  near(r.r2, 1);
  near(r.r, 1); // the straight line fits as well: r shows
  expect(r.rmse).toBeNull();
});

it("REG-STATISTICS-4, -5 R² can be negative, r shows exactly when the model fits as well as the best line", () => {
  const line = fitRegression(linear(X, Y));
  near(line.params[0].value, 600);
  near(line.params[1].value, -1164000, 4);
  near(line.r2, 1);
  near(line.r, 1);
  expect(line.rmse).toBeNull();
  // mx₁ on data whose best line passes through the origin shows r; off the origin it does not
  const through0 = fitRegression({
    observed: [1, 2, 3],
    predictor: [1, 2, 3],
    params: ["m"],
    model: (p, i) => p[0] * [1, 2, 3][i],
    logForm: null,
    logMode: false,
  });
  near(through0.r, 1);
  const offset = fitRegression({
    observed: [2, 3, 5],
    predictor: [1, 2, 3],
    params: ["m"],
    model: (p, i) => p[0] * [1, 2, 3][i],
    logForm: null,
    logMode: false,
  });
  expect(offset.r).toBeNull();
  const given = fitRegression({
    observed: [1, 2, 3],
    predictor: [1, 2, 3],
    params: [],
    model: (_p, i) => 10 - [1, 2, 3][i],
    logForm: null,
    logMode: false,
  });
  expect(given.ok).toBe(true);
  expect(given.r2!).toBeLessThan(0);
});

it("REG-STATISTICS-8 a left side that is not a bare name shows RMSE only", () => {
  const fit = fitRegression({ ...linear(X, Y), plainLeft: false });
  expect(fit.r2).toBeNull();
  expect(fit.r).toBeNull();
  near(fit.rmse, 0);
});

it("D-32 RMSE is shown only when R² is undefined", () => {
  const flat = fitRegression(linear([1, 2, 3], [5, 5, 5]));
  expect(flat.r2).toBeNull();
  near(flat.rmse, 0);
});

it("D-34 the constant model fits the mean with R² 0 and no r", () => {
  const r = fitRegression({
    observed: [1, 2, 6],
    predictor: [0, 0, 0],
    params: ["b"],
    model: (p) => p[0],
    logForm: null,
    logMode: false,
  });
  near(r.params[0].value, 3);
  near(r.r2, 0);
  expect(r.r).toBeNull();
});

const EXP_X = [0, 1, 2, 3, 4],
  EXP_Y = [2.1, 2.9, 4.2, 5.6, 8.3];
const exponential = (logMode: boolean): FitInput => ({
  observed: EXP_Y,
  predictor: EXP_X,
  params: ["a", "b"],
  model: (p, i) => p[0] * p[1] ** EXP_X[i],
  logForm: { kind: "exponential-base", a: 0, b: 1 },
  logMode,
});

it("D-30 log mode is offered unchecked; checking it refits on the transformed data and adds r", () => {
  const off = fitRegression(exponential(false));
  expect(off.logMode).toEqual({ available: true, on: false });
  expect(off.r).toBeNull();
  const on = fitRegression(exponential(true));
  expect(on.logMode).toEqual({ available: true, on: true });
  expect(on.r).not.toBeNull();
  expect(on.params[0].value).not.toBeCloseTo(off.params[0].value, 6);
});

it("D-29 log-mode statistics come from the transformed data and residuals stay in original units", () => {
  const on = fitRegression(exponential(true));
  const lnY = EXP_Y.map(Math.log);
  const n = EXP_X.length,
    mx = EXP_X.reduce((s, v) => s + v) / n,
    my = lnY.reduce((s, v) => s + v) / n;
  const sxy = EXP_X.reduce((s, x, i) => s + (x - mx) * (lnY[i] - my), 0),
    sxx = EXP_X.reduce((s, x) => s + (x - mx) ** 2, 0),
    syy = lnY.reduce((s, y) => s + (y - my) ** 2, 0);
  near(Math.log(on.params[1].value), sxy / sxx);
  near(on.r, sxy / Math.sqrt(sxx * syy));
  near(on.r2, (sxy * sxy) / (sxx * syy));
  const [a, b] = on.params.map((p) => p.value);
  on.residuals.forEach((e, i) => near(e, EXP_Y[i] - a * b ** EXP_X[i]));
});

it("D-28 a needed value that is not positive hides log mode and shows the original-unit fit", () => {
  const r = fitRegression({ ...exponential(true), observed: [2.1, -1, 4.2, 5.6, 8.3] });
  expect(r.logMode).toEqual({ available: false, on: false });
  expect(r.ok).toBe(true);
});

it("D-25 a nonlinear model fits from the standard starts in original units", () => {
  const r = fitRegression(exponential(false));
  const [a, b] = r.params.map((p) => p.value);
  // The gradient of SSE vanishes at the fit.
  const grad = (da: number, db: number) =>
    EXP_X.reduce((s, x, i) => s + (EXP_Y[i] - (a + da) * (b + db) ** x) ** 2, 0);
  expect(Math.abs(grad(1e-6, 0) - grad(-1e-6, 0)) / 2e-6).toBeLessThan(1e-4);
  expect(r.approximate).toBe(false);
});
