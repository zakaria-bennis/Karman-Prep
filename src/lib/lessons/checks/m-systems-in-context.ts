import type { LessonChecks } from "./types";

// Solved blind by a second writer.
// t + b = 80, 6t + 9b = 570: 3b = 570 - 6 * 80.
const ex0b = (570 - 6 * 80) / (9 - 6);
// No solution when 3/6 = k/4 (and 7/10 is not 1/2).
const ex1k = (3 / 6) * 4;
// a + s = 200, 8a + 5s = 1360: 3s = 8 * 200 - 1360.
const checkS = (8 * 200 - 1360) / (8 - 5);
// k / 2 = -15 / -5, and 9/4 is not 3.
const q0k = 2 * (-15 / -5);
// m + p = 64, 3m + 12p = 300: 9p = 300 - 3 * 64.
const q4p = (300 - 3 * 64) / (12 - 3);
const q4m = 64 - q4p;

const checks: LessonChecks = {
  examples: [80 - ex0b, ex1k],
  check: checkS,
  quiz: [
    q0k,
    { text: "b + p = 45 and 20b + 35p = 1200" },
    { text: "so the answer is y = 10" },
    // The second is the first times 3, right side included.
    { text: "3x + 6y = 18" },
    q4m - q4p,
  ],
};

export default checks;
