import type { LessonChecks } from "./types";

const { sqrt } = Math;

// Right triangles: a^2 + b^2 = c^2, or the 30-60-90 and 45-45-90 side patterns.
const checks: LessonChecks = {
  examples: [sqrt(13 ** 2 - 5 ** 2), (14 / 2) * sqrt(3)],
  check: sqrt(9 ** 2 + 12 ** 2),
  quiz: [
    (10 / 2) * sqrt(3),
    { text: "Subtract the squares" },
    { text: "For a leg he should subtract" },
    { text: "two $45^\\circ$ angles" },
    10 * sqrt(26 ** 2 - 10 ** 2),
  ],
};

export default checks;
