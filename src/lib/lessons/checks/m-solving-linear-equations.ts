import type { LessonChecks } from "./types";

// Solved blind by a second writer.
const checks: LessonChecks = {
  examples: [
    // 5x - 15 - 2x - 2 = 4, so 3x = 21
    (4 + 15 + 2) / (5 - 2),
    // times 6: 2x + 3(x + 1) = 48, so 5x = 45
    (48 - 3) / (2 + 3),
  ],
  // 4x + 8 - 3 = 2x + 11, so 2x = 6
  check: (11 - 8 + 3) / (4 - 2),
  quiz: [
    // times 6: 3x + 2(x + 4) = 48, so 5x = 40
    (48 - 8) / (3 + 2),
    // the least common multiple of 5 and 3
    { text: "Multiply both sides by 15." },
    // -2(x - 3) is -2x + 6, not -2x - 6
    { text: "Line 1" },
    // the messy fractions are where graphing both sides pays off
    { text: "\\frac{3x - 2}{7}" },
    // 3(x - 4) = 2(x + 1): 3x - 12 = 2x + 2, x = 14, so x - 4 is
    (2 + 12) / (3 - 2) - 4,
  ],
  // check-ins, worked out blind from the questions alone: [check-in, twin] per example
  checkIns: [
    // 6x - 6 - 2x - 6 = 8 and 3x + 12 - 5x + 10 = 6
    [(8 + 6 + 6) / (6 - 2), (6 - 12 - 10) / (3 - 5)],
    // times 4: 2x + x + 3 = 24; times 6: 2x + x + 3 = 30
    [(24 - 3) / 3, (30 - 3) / 3],
  ],
};

export default checks;
