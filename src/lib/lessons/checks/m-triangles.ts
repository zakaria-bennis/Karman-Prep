import type { LessonChecks } from "./types";

// Similar triangles: matching sides share one scale factor; matching angles are equal.
const checks: LessonChecks = {
  examples: [
    12 * (6 / 8),
    // triangle ADE ~ triangle ABC, AB = AD + DB
    5 * ((4 + 8) / 4),
  ],
  check: 180 - 38 - 64,
  quiz: [
    4 * ((5 + 10) / 5),
    { text: "scale factor $\\frac{6}{9}$" },
    { text: "Similar sides multiply, not add" },
    { text: "a $60^\\circ$ angle" },
    // triangle ABC ~ triangle EDC (vertical angles at C, alternate angles from AB || DE)
    6 * (10 / 4),
  ],
  // check-ins, worked out blind from the questions alone: [check-in, twin] per example
  checkIns: [
    [9 * (10 / 6), 15 * (6 / 9)],
    // the small triangle ADE is similar to ABC with scale AB / AD
    [6 * ((5 + 10) / 5), 5 * ((2 + 6) / 2)],
  ],
};

export default checks;
