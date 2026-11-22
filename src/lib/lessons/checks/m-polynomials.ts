import type { LessonChecks } from "./types";

const p0 = (x: number) => 2 * x ** 3 - 5 * x ** 2 + x + 7;
const p1 = (x: number) => x ** 3 - 7 * x - 6;
const q0 = (x: number) => x ** 3 + 2 * x ** 2 - 5 * x - 6;
// The root r (from the listed factors x - r) where p is zero.
const rootOf = (p: (x: number) => number, rs: number[]) => rs.find((r) => p(r) === 0)!;

const r1 = rootOf(p1, [2, 1, -1, -3]);
const r0 = rootOf(q0, [3, 1, -2, -3]);

const checks: LessonChecks = {
  examples: [p0(2), (x) => x - r1],
  // the repeated factor (x - 2) touches
  check: [2, 0],
  quiz: [
    (x) => x - r0,
    { text: "Find $p(-1)$" },
    { text: "The zero 3 gives the factor $(x - 3)$" },
    (x) => (x - 2) ** 2 * (x + 1),
    // p(2) = 8 + 4k + 10 - 6 = 0
    -(8 + 10 - 6) / 4,
  ],
};

export default checks;
