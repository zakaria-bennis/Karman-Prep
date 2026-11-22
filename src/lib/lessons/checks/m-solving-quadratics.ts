import type { LessonChecks } from "./types";

const { sqrt } = Math;
// The roots of ax^2 + bx + c = 0, smaller first.
const roots = (a: number, b: number, c: number): [number, number] => {
  const d = sqrt(b * b - 4 * a * c);
  return [(-b - d) / (2 * a), (-b + d) / (2 * a)];
};

const checks: LessonChecks = {
  examples: [
    // x^2 + 3x - 28 = 0, the positive root
    roots(1, 3, -28)[1],
    // discriminant 9 - 40 is negative
    { text: "No real solutions" },
    roots(1, -4, -1)[1],
  ],
  check: roots(2, -5, -3)[1],
  quiz: [
    roots(1, 2, -4)[0],
    { text: "Expand and subtract 14" },
    // (x - 3)(x - 4) = 0 gives x = 3 or x = 4, not -3 and -4
    { text: "Step 4" },
    // discriminant 36 - 36 = 0
    { text: "x^2 + 6x + 9 = 0" },
    // k^2 - 64 = 0, k positive
    sqrt(4 * 16),
  ],
};

export default checks;
