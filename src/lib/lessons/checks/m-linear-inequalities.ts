import type { LessonChecks } from "./types";

// Solved blind by a second writer.
// 5 - 3x >= 11: -3x >= 6, divide by -3 and flip: x <= -2.
const checks: LessonChecks = {
  examples: [
    { text: "x \\le -2" },
    // y > x - 2 and 2x + y <= 8: (1, 3) gives 3 > -1 and 5 <= 8.
    [1, 3],
  ],
  // 7 - 2x < 1 gives x > 3; only 4 is above 3.
  check: 4,
  quiz: [
    // y <= 3x + 1 and y > -x + 5: (2, 4) gives 4 <= 7 and 4 > 3.
    [2, 4],
    { text: "Subtract 9, then divide by $-4$ and flip the sign" },
    { text: "x \\ge -2" },
    // slope (3 - -1) / 2 = 2, intercept -1, solid line, shaded above.
    { text: "y \\ge 2x - 1" },
    Math.floor((1500 - 170) / 40),
  ],
};

export default checks;
