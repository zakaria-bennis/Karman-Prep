import type { LessonChecks } from "./types";

// Solved blind by a second writer.
const checks: LessonChecks = {
  examples: [
    (-2 - 7) / (4 - -2),
    // (22 - 34) / (6 - 2) = -3: a drop of 3 each hour
    { text: "The depth drops by 3 centimeters each hour." },
  ],
  check: (3 - 5) / (7 - 3),
  quiz: [
    (64 - 92) / (5 - 1),
    { text: "Find both changes, in the same order" },
    // y-values subtracted as -2 - 6, x-values as 1 - 5
    { text: "opposite order" },
    { text: "The extra cost, in dollars, for each mile" },
    // rate (314 - 380) / (10 - 4), then back 4 minutes from 380
    380 - ((314 - 380) / (10 - 4)) * 4,
  ],
};

export default checks;
