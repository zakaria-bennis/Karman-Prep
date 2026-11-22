import type { LessonChecks } from "./types";

// Solved blind by a second writer.
// (ax + 3)(2x - b) = 2a x^2 + (6 - ab) x - 3b: 2a = 6 and 3b = 12.
const a = 6 / 2;
const b = 12 / 3;

const checks: LessonChecks = {
  examples: [
    // x^2 - 8x - 8
    (x) => (3 * x + 2) * (x - 4) - 2 * x * (x - 1),
    // 3(x - 6)(x + 4)
    (x) => 3 * (x - 6) * (x + 4),
  ],
  check: (x) => (x - 7) ** 2,
  quiz: [
    (x) => 2 * x ** 2 + 6 * x - 56,
    { text: "Pull out the common factor 5" },
    { text: "x^2 + 12x + 36" },
    { text: "4x^2 - 25" },
    a + b,
  ],
};

export default checks;
