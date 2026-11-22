import type { LessonChecks } from "./types";

const f0 = (x: number) => x ** 2 - 3;
const g0 = (x: number) => 2 * x + 1;
const fc = (x: number) => 4 * x - 1;
const gc = (x: number) => x + 3;
const fm = (x: number) => x ** 2 + 4 * x;
const fq = (x: number) => x ** 2 - 4 * x;

const checks: LessonChecks = {
  examples: [
    f0(g0(2)),
    // vertex (1, 4) moves right 3 and down 2
    [1 + 3, 4 - 2],
  ],
  check: gc(fc(2)),
  quiz: [
    [2 + 4, 5 - 1],
    { text: "Find $f(1)$, then use the result as the input for $g$" },
    fm(-3),
    { text: "Left 5" },
    fq(5 - 2) + 3,
  ],
};

export default checks;
