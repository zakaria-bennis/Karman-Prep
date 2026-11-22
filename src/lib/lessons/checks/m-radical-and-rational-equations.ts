import type { LessonChecks } from "./types";

const { sqrt } = Math;
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
// The candidates that really solve the original equation.
const keep = (cands: number[], ok: (x: number) => boolean) => cands.filter(ok);

const same = (a: number, b: number) => Math.abs(a - b) < 1e-9;

/** The whole numbers from -20 to 20 that make an equation true, written as the choices write them. */
function solutions(holds: (x: number) => boolean): string {
  const xs: number[] = [];
  for (let x = -20; x <= 20; x++) if (holds(x)) xs.push(x);
  return xs.length ? xs.map((x) => `x = ${x}`).join(" or ") : "No solution";
}

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
  // check-ins, worked out blind from the questions alone: [check-in, twin] per example
  checkIns: [
    // every whole number from -20 to 20 that makes the original equation true, named like the choices
    [
      {
        index: ["x = 7", "x = 2", "x = 2 or x = 7", "No solution"].indexOf(
          solutions((x) => same(Math.sqrt(x + 2) + 4, x))
        ),
      },
      {
        index: ["x = 1", "x = 1 or x = 6", "x = 6", "No solution"].indexOf(
          solutions((x) => same(Math.sqrt(x + 3) + 3, x))
        ),
      },
    ],
    [
      {
        index: ["x = 3", "x = 1", "x = 1 or x = 3", "No solution"].indexOf(
          solutions((x) => x !== 3 && same(x / (x - 3), 3 / (x - 3) + x))
        ),
      },
      {
        index: ["x = 5", "x = 2 or x = 5", "No solution", "x = 2"].indexOf(
          solutions((x) => x !== 5 && same((2 * x) / (x - 5), 10 / (x - 5) + x))
        ),
      },
    ],
  ],
};

export default checks;
