import type { LessonChecks } from "./types";

const { sqrt } = Math;
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
// The candidates that really solve the original equation.
const keep = (cands: number[], ok: (x: number) => boolean) => cands.filter(ok);

const checks: LessonChecks = {
  examples: [
    // squared: x^2 - 3x = 0, so 0 or 3
    keep([0, 3], (x) => near(sqrt(x + 1) + 1, x))[0],
    // x/(x-4) - 4/(x-4) = 1 when x != 4, so x = 1
    keep([1], (x) => x !== 4 && near(x / (x - 4), 4 / (x - 4) + x))[0],
  ],
  // squared: x^2 - 3x - 4 = 0, so -1 or 4
  check: keep([-1, 4], (x) => near(sqrt(3 * x + 4), x))[0],
  quiz: [
    // (2x - 10)/(x - 5) = 2 when x != 5
    keep([2], (x) => x !== 5 && near((2 * x) / (x - 5), 10 / (x - 5) + x))[0],
    { text: "Subtract 4 from both sides" },
    // x = 0 gives sqrt(1) = 1 but x - 1 = -1
    { text: "Only 4 is a solution" },
    // squared: x^2 - 5x + 4 = 0, and x = 1 gives 1 = -1
    { text: "\\sqrt{x} = x - 2" },
    // 6 = x + 3 gives x = 3, which makes a denominator zero
    { text: "There is no solution" },
  ],
};

export default checks;
