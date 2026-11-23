import type { LessonChecks } from "./types";

// Solved blind by a second writer. Only x > 0 is tried where a root of a negative is undefined.
const checks: LessonChecks = {
  examples: [
    // x^(1/2) times x^(2/3) = x^(7/6)
    (x) => x ** (1 / 2 + 2 / 3),
    // 16x^12 / 8x^5 = 2x^7
    (x) => (2 ** 4 * x ** 12) / (8 * x ** 5),
  ],
  check: (x) => x ** (3 / 4),
  quiz: [
    // 27x^6 / 9x^4 = 3x^2
    (x) => (3 ** 3 * x ** 6) / (9 * x ** 4),
    { text: "Rewrite $\\sqrt{x}$ as" },
    { text: "He multiplied the exponents" },
    (x) => (x ** 2) ** 3,
    // x^(5/3) / x^(-1/3) = x^2
    (x) => x ** (5 / 3 + 1 / 3),
  ],
  // check-ins, worked out blind from the questions alone: [check-in, twin] per example
  checkIns: [
    [(x: number) => x ** (1 / 3 + 3 / 4), (x: number) => x ** (1 / 2 + 2 / 5)],
    [
      (x: number) => (3 * x ** 2) ** 3 / (9 * x ** 4),
      (x: number) => (2 * x ** 4) ** 3 / (4 * x ** 7),
    ],
  ],
};

export default checks;
