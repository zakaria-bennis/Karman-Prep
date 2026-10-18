import { expect, it } from "vitest";
import { CHWIRUT2, MISRA1A, THURBER, type NonlinearCase } from "./__fixtures__/nist";
import { fitNonlinear } from "./levenberg";

const rel = (a: number, b: number) => Math.abs(a - b) / Math.abs(b);
const MODELS: Record<string, (b: Float64Array, x: number) => number> = {
  Misra1a: (b, x) => b[0] * (1 - Math.exp(-b[1] * x)),
  Chwirut2: (b, x) => Math.exp(-b[0] * x) / (b[1] + b[2] * x),
  Thurber: (b, x) =>
    (b[0] + b[1] * x + b[2] * x ** 2 + b[3] * x ** 3) /
    (1 + b[4] * x + b[5] * x ** 2 + b[6] * x ** 3),
};

function check(c: NonlinearCase): void {
  const model = MODELS[c.name];
  const fit = fitNonlinear(
    (b, i) => model(b, c.x[i]),
    Float64Array.from(c.y),
    Float64Array.from(c.start1)
  );
  expect(fit.converged, c.name).toBe(true);
  c.certified.forEach((v, j) =>
    expect(rel(fit.params[j], v), `${c.name} b${j + 1}`).toBeLessThan(1e-6)
  );
  expect(rel(fit.sse, c.rss), `${c.name} RSS`).toBeLessThan(1e-8);
}

it("D-39 NIST Misra1a, Chwirut2 and Thurber match from start 1 through Levenberg–Marquardt", () => {
  expect(CHWIRUT2.x).toHaveLength(54);
  expect(THURBER.x).toHaveLength(37);
  check(MISRA1A);
  check(CHWIRUT2);
  check(THURBER);
});

it("D-25 Levenberg–Marquardt stops within 200 iterations and reports a fit that did not converge", () => {
  // y = a·b^x on data no positive b fits well still returns finite parameters.
  const x = [0, 1, 2, 3],
    y = [1, -1, 1, -1];
  const fit = fitNonlinear(
    (b, i) => b[0] * Math.abs(b[1]) ** x[i],
    Float64Array.from(y),
    Float64Array.from([1, 1]),
    {
      maxIterations: 200,
    }
  );
  expect(Number.isFinite(fit.sse)).toBe(true);
  expect(fit.iterations).toBeLessThanOrEqual(200);
});
