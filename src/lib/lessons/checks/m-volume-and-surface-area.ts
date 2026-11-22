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
};

export default checks;
