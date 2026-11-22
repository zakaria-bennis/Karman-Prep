import type { LessonChecks } from "./types";

// Solved blind by a second writer.
const checks: LessonChecks = {
  examples: [
    // y = 0: 5x = 20
    [20 / 5, 0],
    // y - 1 = -2(x - 3)
    (x) => -2 * (x - 3) + 1,
  ],
  // x = 0: 5y = 30
  check: [0, 30 / 5],
  quiz: [
    // y - 4 = 3(x + 2)
    (x) => 3 * (x + 2) + 4,
    { text: "Set $y = 0$ and solve for $x$." },
    // 5y = -2x + 10 gives y = -2/5 x + 2
    { text: "before getting $y$ alone" },
    // y = 0: x = 6 only for x + 2y = 6 (2x + y = 6 gives 3; y = x + 6 gives -6; y = 6x gives 0)
    { text: "x + 2y = 6" },
    // x/5 + y/(-3) = 1, times 15
    { text: "3x - 5y = 15" },
  ],
};

export default checks;
