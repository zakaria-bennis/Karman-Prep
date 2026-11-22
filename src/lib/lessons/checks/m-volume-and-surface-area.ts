import type { LessonChecks } from "./types";

const { PI } = Math;

const checks: LessonChecks = {
  examples: [
    PI * 3 ** 2 * 10,
    // (1/3) pi r^2 * 8 = 96 pi
    Math.sqrt((3 * 96) / 8),
  ],
  check: (4 / 3) * PI * 3 ** 3,
  quiz: [
    Math.sqrt((3 * 12) / 4),
    { text: "Find the radius: half of 12 is 6." },
    // (1/3) * 6 * 6 * 10 = 120
    { text: "Theo forgot the one third" },
    { text: "wrapping paper" },
    // pi * 4^2 * 6 = (1/3) pi * 4^2 * h
    (3 * PI * 4 ** 2 * 6) / (PI * 4 ** 2),
  ],
  // check-ins, worked out blind from the questions alone: [check-in, twin] per example
  checkIns: [
    [PI * 4 ** 2 * 5, PI * 5 ** 2 * 6],
    // V = (1/3) pi r^2 h, so r = sqrt(3V / (pi h))
    [Math.sqrt((3 * 12 * PI) / (PI * 4)), Math.sqrt((3 * 36 * PI) / (PI * 3))],
  ],
};

export default checks;
