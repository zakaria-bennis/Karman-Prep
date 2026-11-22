import type { LessonChecks } from "./types";

const { PI } = Math;

const checks: LessonChecks = {
  examples: [
    // rectangle plus half a circle of radius 8 / 2
    8 * 5 + 0.5 * PI * (8 / 2) ** 2,
    // the L's missing sides are 12 - 5 and 9 - 4
    12 + 9 + 5 + 4 + (12 - 5) + (9 - 4),
  ],
  check: 20 * 14 - PI * (6 / 2) ** 2,
  quiz: [
    15 + 11 + 6 + 5 + (15 - 6) + (11 - 5),
    { text: "List the outside edges" },
    // 10 + 10 + 4 + half of 2 * pi * 2: the covered 4 cm side is not on the outside
    { text: "Lena counted the side the half circle covers" },
    { text: "How much carpet is needed to cover a rectangular floor?" },
    // a corner square cut keeps the outline's length: 2 * (18 + 10)
    18 + 10 + (18 - 4) + 4 + 4 + (10 - 4),
  ],
};

export default checks;
