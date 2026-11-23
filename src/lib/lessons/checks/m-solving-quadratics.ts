import type { LessonChecks } from "./types";

const { sqrt } = Math;
// The roots of ax^2 + bx + c = 0, smaller first.
const roots = (a: number, b: number, c: number): [number, number] => {
  const d = sqrt(b * b - 4 * a * c);
  return [(-b - d) / (2 * a), (-b + d) / (2 * a)];
};

/** How many real solutions ax^2 + bx + c = 0 has, in the choices' words. */
function count(a: number, b: number, c: number): string {
  const d = b * b - 4 * a * c;
  return d < 0 ? "no real" : d === 0 ? "exactly one" : "exactly two";
}

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
  // check-ins, worked out blind from the questions alone: [check-in, twin] per example
  checkIns: [
    [(-2 + Math.sqrt(2 ** 2 + 4 * 35)) / 2, (1 + Math.sqrt(1 + 4 * 30)) / 2],
    [{ text: count(3, 2, 4) }, { text: count(9, -6, 1) }],
    [(6 + Math.sqrt(36 - 8)) / 2, (-2 + Math.sqrt(4 + 8)) / 2],
  ],
};

export default checks;
