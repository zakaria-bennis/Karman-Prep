import type { LessonChecks } from "./types";

const checks: LessonChecks = {
  examples: [(3 / 2) * 7, (35 * 4) / (4 + 3)],
  check: (9 * 15) / 2,
  quiz: [
    (48 * 3) / (5 + 3),
    { text: "\\frac{120}{8} = \\frac{210}{x}" },
    // water is 5 parts for every 2 parts mango juice
    (21 * 5) / 2,
    { text: "150 miles on 5 gallons" },
    // boys 3k, girls 4k; 3k + 6 = 4k gives k = 6
    4 * 6,
  ],
  // check-ins, worked out blind from the questions alone: [check-in, twin] per example
  checkIns: [
    [(5 / 2) * 6, (4 / 3) * 9],
    [48 * (5 / (5 + 3)), 56 * (3 / (3 + 4))],
  ],
};

export default checks;
