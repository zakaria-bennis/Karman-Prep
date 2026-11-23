import type { LessonChecks } from "./types";

// Complete the square: x^2 + y^2 + Dx + Ey + F = 0 has center (-D/2, -E/2), r^2 = (D/2)^2 + (E/2)^2 - F.
const r2 = (D: number, E: number, F: number) => (D / 2) ** 2 + (E / 2) ** 2 - F;

const checks: LessonChecks = {
  examples: [Math.sqrt(r2(6, -4, -12)), [10 / 2, -2 / 2]],
  check: { text: "(x - 2)^2 + (y + 5)^2 = 16" },
  quiz: [
    [-8 / 2, 6 / 2],
    { text: "Move 20 to the right side" },
    { text: "The right side is $r^2$" },
    // x^2 - 4x + y^2 = 32 -> (x - 2)^2 + y^2 = 36
    { text: "x^2 + y^2 - 4x = 32" },
    // (x - 3)^2 + (y + 5)^2 = k + 9 + 25 = 49
    7 ** 2 - 3 ** 2 - 5 ** 2,
  ],
  // check-ins, worked out blind from the questions alone: [check-in, twin] per example
  checkIns: [
    // complete the square: r^2 = (b/2)^2 + (d/2)^2 - f, center (-b/2, -d/2)
    [Math.sqrt(2 ** 2 + 3 ** 2 + 3), Math.sqrt(1 ** 2 + 4 ** 2 + 19)],
    [
      [-8 / 2, 6 / 2],
      [6 / 2, -12 / 2],
    ],
  ],
};

export default checks;
