import type { LessonChecks } from "./types";

const { sqrt } = Math;
// The larger root of ax^2 + bx + c = 0.
const big = (a: number, b: number, c: number) => (-b + sqrt(b * b - 4 * a * c)) / (2 * a);
const small = (a: number, b: number, c: number) => (-b - sqrt(b * b - 4 * a * c)) / (2 * a);

// x^2 - 2x - 3 = x + 1 gives x^2 - 3x - 4 = 0
const x0 = big(1, -3, -4);
// x^2 + (x + 1)^2 = 25 gives 2x^2 + 2x - 24 = 0
const x1 = big(2, 2, -24);
// x^2 + 2x - 3 = 4x + 5 gives x^2 - 2x - 8 = 0
const line4 = (x: number) => 4 * x + 5;

const checks: LessonChecks = {
  examples: [x0 + 1, [x1, x1 + 1]],
  // x^2 - 4x - 5 = 0: sum of roots is -b/a
  check: 4 / 1,
  quiz: [
    // x^2 + (x - 2)^2 = 10 gives x^2 - 2x - 3 = 0, so x = 3 or -1; only (3, 1) is listed
    [big(1, -2, -3), big(1, -2, -3) - 2],
    { text: "Set $2x + 3 = x^2 - 4x + 8$" },
    { text: "x^2 + 2x + 1" },
    // x^2 - 8x + 16 = 0 has discriminant 0
    { text: "Exactly one" },
    line4(big(1, -2, -8)) + line4(small(1, -2, -8)),
  ],
  // check-ins, worked out blind from the questions alone: [check-in, twin] per example
  checkIns: [
    // set equal, solve the quadratic, keep the root the question asks for, then use the line
    [
      ((x: number) => x - 3)((5 + Math.sqrt(25 - 16)) / 2),
      ((x: number) => 3 * x + 1)((1 + Math.sqrt(1 + 24)) / 2),
    ],
    [
      // x^2 + (x - 1)^2 = 25 gives x^2 - x - 12 = 0; x^2 + (x + 2)^2 = 100 gives x^2 + 2x - 48 = 0
      [(1 + Math.sqrt(1 + 48)) / 2, (1 + Math.sqrt(1 + 48)) / 2 - 1],
      [(-2 + Math.sqrt(4 + 192)) / 2, (-2 + Math.sqrt(4 + 192)) / 2 + 2],
    ],
  ],
};

export default checks;
