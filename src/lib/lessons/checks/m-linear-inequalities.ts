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
  // check-ins, worked out blind from the questions alone: [check-in, twin] per example
  checkIns: [
    // dividing by a negative flips the sign: x < (15 - 7) / -2 and x >= (19 - 4) / -5
    [{ text: `x<${(15 - 7) / -2}` }, { text: `x\\ge${(19 - 4) / -5}` }],
    // the one listed point that satisfies both inequalities
    [
      {
        index: [
          [1, 1],
          [3, 2],
          [1, 4],
          [2, 6],
        ].findIndex(([x, y]) => y < x + 3 && x + y >= 4),
      },
      {
        index: [
          [2, 4],
          [3, 1],
          [0, 7],
          [1, 3],
        ].findIndex(([x, y]) => y >= 2 * x - 1 && x + y < 6),
      },
    ],
  ],
};

export default checks;
