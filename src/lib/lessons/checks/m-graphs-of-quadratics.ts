import type { LessonChecks } from "./types";

const f0 = (x: number) => -3 * x ** 2 + 18 * x - 20;
const f1 = (x: number) => 2 * (x + 1) * (x - 7);
const g = (x: number) => x ** 2 - 8 * x + 12;
const q0 = (x: number) => -(x - 2) * (x - 8);
// through (-3, 0) and (5, 0): y = a(x + 3)(x - 5), and y(0) = -15a = -30
const a4 = -30 / (3 * -5);
const q4 = (x: number) => a4 * (x + 3) * (x - 5);

const checks: LessonChecks = {
  examples: [f0(-18 / (2 * -3)), f1((-1 + 7) / 2)],
  check: [8 / 2, g(8 / 2)],
  quiz: [
    q0((2 + 8) / 2),
    { text: "x = -\\frac{-12}{2(2)} = 3" },
    { text: "the vertex is $(-5, -2)$" },
    // vertex form names the vertex (1, -4)
    { text: "(x - 1)^2 - 4" },
    q4((-3 + 5) / 2),
  ],
  // check-ins, worked out blind from the questions alone: [check-in, twin] per example
  checkIns: [
    // the vertex sits at x = -b / (2a), or midway between the zeros
    [
      ((x: number) => -2 * x ** 2 + 12 * x - 5)(-12 / (2 * -2)),
      ((x: number) => -(x ** 2) + 10 * x - 9)(-10 / (2 * -1)),
    ],
    [
      ((x: number) => 3 * (x + 2) * (x - 4))((-2 + 4) / 2),
      ((x: number) => 2 * (x + 5) * (x - 1))((-5 + 1) / 2),
    ],
  ],
};

export default checks;
