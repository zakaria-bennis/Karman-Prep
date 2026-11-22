import type { LessonChecks } from "./types";

const { PI } = Math;

// Degrees times pi/180 gives radians; arc length = (angle / 360) * 2 pi r = (radians) * r.
const checks: LessonChecks = {
  examples: [((5 * PI) / 6) * (180 / PI), (135 / 360) * 2 * PI * 8],
  check: { text: "\\frac{4\\pi}{3}" },
  quiz: [
    (150 / 360) * 2 * PI * 12,
    { text: "Replace $\\pi$ with 180." },
    { text: "He used the factor upside down" },
    { text: "sin(30)" },
    (4 * PI) / ((2 * PI) / 9),
  ],
  // check-ins, worked out blind from the questions alone: [check-in, twin] per example
  checkIns: [
    [((7 * PI) / 4) * (180 / PI), ((2 * PI) / 3) * (180 / PI)],
    [(120 / 360) * 2 * PI * 6, (54 / 360) * 2 * PI * 10],
  ],
};

export default checks;
