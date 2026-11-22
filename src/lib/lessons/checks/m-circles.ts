import type { LessonChecks } from "./types";

const { PI } = Math;

const checks: LessonChecks = {
  examples: [
    // a fifth of the area of a circle of radius 10
    (72 / 360) * PI * 10 ** 2,
    // the angle whose arc is 3pi of a circumference of 18pi
    ((3 * PI) / (2 * PI * 9)) * 360,
  ],
  check: (120 / 360) * 2 * PI * 6,
  quiz: [
    (90 / 360) * PI * 4 ** 2,
    (36 / 360) * 2 * PI * (20 / 2),
    ((9 * PI) / (PI * 6 ** 2)) * 360,
    100 / 2,
    (30 / 360) * PI * ((24 * PI) / (2 * PI)) ** 2,
  ],
};

export default checks;
