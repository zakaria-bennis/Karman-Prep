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
};

export default checks;
