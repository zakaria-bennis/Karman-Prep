import { describe, expect, it } from "vitest";
import { fitRegression } from "./regression";
import { makeScope } from "./math";
import { DEFAULT_SETTINGS } from "./types";
function fit(x: number[], y: number[], model = "m*x_2+b") {
  const scope = makeScope(DEFAULT_SETTINGS);
  scope.set("x_1", [...x].reverse());
  scope.set("x_2", x);
  scope.set("y_2", y);
  return fitRegression("y_2", model, scope);
}
describe("regression statistics", () => {
  it("uses the predictor in the model, preserving negative Pearson correlation", () => {
    const result = fit([1, 2, 3, 4], [9, 7, 5, 3]);
    expect(result.r).toBeCloseTo(-1, 10);
    expect(result.r2).toBeCloseTo(1, 10);
    expect(result.predict(5)).toBeCloseTo(1, 6);
  });
  it("computes R² from squared residuals for a noisy line", () => {
    const result = fit([1, 2, 3], [1, 3, 2]);
    expect(result.r2).toBeCloseTo(0.25, 8);
    expect(result.r).toBeCloseTo(0.5, 8);
    expect(result.rmse).toBeCloseTo(Math.sqrt(0.5), 8);
  });
  it("does not invent a correlation for a constant fit or zero variance", () => {
    expect(fit([1, 2, 3], [1, 3, 2], "a").r).toBeNaN();
    expect(fit([1, 2, 3], [4, 4, 4], "a").r2).toBeNaN();
  });
  it("fits exponential data in SAT log mode and keeps residuals in original units", () => {
    const result = fit([0, 1, 2], [1, 2, 8], "a*b^x_2");
    expect(result.logMode).toBe(true);
    expect(result.parameters.b).toBeCloseTo(Math.sqrt(8), 8);
    expect(result.r2).toBeCloseTo(27 / 28, 8);
    expect(result.residuals[0]).toBeCloseTo(1 - Math.pow(2, -1 / 6), 8);
  });
  it("supports the documented power and logarithmic transformations", () => {
    expect(fit([1, 2, 4], [3, 12, 48], "a*x_2^b").parameters.b).toBeCloseTo(2, 8);
    const result = fit([1, Math.E, Math.E ** 2], [1, 3, 5], "a*ln(x_2)+b");
    expect(result.parameters.a).toBeCloseTo(2, 8);
    expect(result.logMode).toBe(true);
  });
  it("rejects nonpositive inputs in log mode", () => {
    expect(() => fit([0, 1, 2], [0, 2, 8], "a*b^x_2")).toThrow(/positive/);
  });
});
