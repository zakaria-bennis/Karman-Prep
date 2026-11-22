import type { LessonChecks } from "./types";

// Solved blind by a second writer.
const checks: LessonChecks = {
  examples: [
    // 6x - 12 + x = 7x - 12 on both sides: true for every x
    { text: "Infinitely many" },
    // left side 5x + 10 - 3x = 2x + 10; no solution when the x terms match and the constants differ
    5 - 3,
  ],
  // 6x + 2 = 6x - 5: same slope, different constants
  check: { text: "Zero" },
  quiz: [
    // left side 8x - 4 + 3 = 8x - 1; constants -1 and 9 differ, so k matches the x term
    4 * 2,
    { text: "Distribute the 2 and combine" },
    { text: "every $x$ works, so there are infinitely many solutions" },
    // 4x + 4 = x + 4: different x terms, so one solution (x = 0)
    { text: "4(x + 1) = x + 4" },
    // 3a + 5 = 11 gives a = 2, then b = -2a
    -2 * ((11 - 5) / 3),
  ],
};

export default checks;
