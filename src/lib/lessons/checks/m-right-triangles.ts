import type { LessonChecks } from "./types";

const { PI } = Math;

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
  // check-ins, worked out blind from the questions alone: [check-in, twin] per example
  checkIns: [
    [Math.sqrt(17 ** 2 - 8 ** 2), Math.sqrt(10 ** 2 - 6 ** 2)],
    // the side across from 60 degrees is the hypotenuse times sin 60
    [10 * Math.sin(PI / 3), 18 * Math.sin(PI / 3)],
  ],
};

export default checks;
