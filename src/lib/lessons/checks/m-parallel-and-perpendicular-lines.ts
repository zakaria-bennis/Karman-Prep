import type { LessonChecks } from "./types";

// Solved blind by a second writer.
const given = -3 / 4; // 3x + 4y = 8
const perp = -1 / given;
const slopeJ = (-1 - 5) / (4 - 1);

const checks: LessonChecks = {
  examples: [
    // y - 2 = (4/3)(x - 6), at x = 0
    [0, 2 + perp * (0 - 6)],
    // y - 4 = -3(x - 2)
    (x) => -3 * (x - 2) + 4,
  ],
  check: -1 / (2 / 3),
  quiz: [
    // y - 3 = 4(x + 1)
    (x) => 4 * (x + 1) + 3,
    { text: "Solve $5x - 2y = 6$ for $y$" },
    { text: "kept the sign" },
    // 2 times -1/2 is -1
    { text: "-\\frac{1}{2}x + 3" },
    // k: slope -1/slopeJ through (2, 0), at x = 0
    0 + (-1 / slopeJ) * (0 - 2),
  ],
  // check-ins, worked out blind from the questions alone: [check-in, twin] per example
  checkIns: [
    // perpendicular slope is the negative reciprocal; the y-intercept is y1 - m * x1
    [
      [0, 5 - (-1 / (-1 / 2)) * 3],
      [0, 3 - (-1 / (-2 / 5)) * 2],
    ],
    [(x: number) => 2 * (x - 3) + 1, (x: number) => -4 * (x - 1) + 6],
  ],
};

export default checks;
