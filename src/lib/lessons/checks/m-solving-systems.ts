import type { LessonChecks } from "./types";

// Solved blind by a second writer.
// 3x + 2y = 17, 5x - 4y = -1: double the first and add, 11x = 33.
const ex0x = (2 * 17 + -1) / (2 * 3 + 5);
const ex0y = (17 - 3 * ex0x) / 2;
// y = 2x - 1 into 3x + 2y = 33: 7x - 2 = 33.
const ex1x = (33 + 2) / (3 + 2 * 2);
// x + 3y = 11 minus x - y = 3: 4y = 8.
const checkY = (11 - 3) / 4;
// y = 3x - 4 into 2x + y = 26: 5x = 30.
const q0x = (26 + 4) / 5;
// 2x + 5y = 24 (times 2) and 3x - 2y = 17 (times 5), add: 19x = 133.
const q4x = (2 * 24 + 5 * 17) / (2 * 2 + 5 * 3);
const q4y = (24 - 2 * q4x) / 5;

const checks: LessonChecks = {
  examples: [ex0x + ex0y, [ex1x, 2 * ex1x - 1]],
  check: checkY,
  quiz: [
    3 * q0x - 4,
    // 2(2x - 5y = 18) gives 4x - 10y = 36; subtracting it from the first cancels x.
    { text: "Multiply the second equation by 2, then subtract it from the first" },
    { text: "the 7 must be doubled too" },
    // -3y and +3y cancel when added.
    { text: "4x - 3y = 5" },
    q4x - q4y,
  ],
};

export default checks;
